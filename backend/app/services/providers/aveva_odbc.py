from __future__ import annotations

import logging
from collections import OrderedDict
from contextlib import closing
from datetime import datetime
from time import perf_counter
from typing import Any, Iterable

from app.core.config import Settings
from app.core.exceptions import (
    ConfigurationError,
    HistorianConnectionError,
    HistorianQueryError,
)
from app.domain.historian import RetrievalMode, TagName
from app.schemas.historian import (
    ExportRequest,
    HistorianQuery,
    PreviewRequest,
    PreviewRow,
    TagMetadata,
)
from app.services.interfaces import HistorianService

try:
    import pyodbc
except ImportError:  # pragma: no cover - exercised only when dependency is missing
    pyodbc = None

PyodbcError = pyodbc.Error if pyodbc is not None else RuntimeError

logger = logging.getLogger(__name__)


class AvevaHistorianOdbcProvider(HistorianService):
    def __init__(self, settings: Settings):
        self._dsn = settings.historian_odbc_dsn or ""
        self._connection_string = self._build_connection_string(settings)
        self._query_timeout_seconds = settings.historian_query_timeout_seconds
        self._preview_max_rows = settings.historian_preview_max_rows
        logger.info(
            "Initialized AVEVA ODBC provider for DSN '%s' with %s second timeout "
            "and preview cap of %s raw rows",
            self._dsn,
            self._query_timeout_seconds,
            self._preview_max_rows,
        )

    def list_tags(self) -> list[TagMetadata]:
        logger.info(
            "Fetching historian tags through AVEVA ODBC from DSN '%s'",
            self._dsn,
        )
        rows = self._execute_query(
            """
            SELECT TOP 500
                TagName AS tag_name,
                Description AS description,
                NULL AS io_address,
                NULL AS units
            FROM Runtime.dbo.Tag
            WHERE TagName NOT LIKE '$%'
            ORDER BY TagName
            """,
            parameters=(),
            failure_message=(
                "Unable to query historian tag metadata through ODBC. Verify the DSN"
                " and Runtime.dbo.Tag schema."
            ),
        )

        return [
            TagMetadata(
                tag_name=str(row.get("tag_name") or ""),
                description=str(row.get("description") or ""),
                io_address=self._coerce_optional_text(row.get("io_address")),
                units=self._coerce_optional_text(row.get("units")),
            )
            for row in rows
            if row.get("tag_name")
        ]

    def preview_data(self, request: PreviewRequest) -> list[PreviewRow]:
        return self._query_historical_rows(
            request,
            operation_name="preview",
            preview_row_cap=self._preview_max_rows,
        )

    def export_data(self, request: ExportRequest) -> list[PreviewRow]:
        return self._query_historical_rows(request, operation_name="export")

    def query_data(self, query: HistorianQuery) -> list[PreviewRow]:
        return self._query_historical_rows(query, operation_name="query")

    def _query_historical_rows(
        self,
        query: HistorianQuery,
        *,
        operation_name: str,
        preview_row_cap: int | None = None,
    ) -> list[PreviewRow]:
        total_start = perf_counter()
        logger.info(
            "Executing AVEVA ODBC %s for %s tag(s) on DSN '%s' from %s to %s "
            "using %s retrieval",
            operation_name,
            len(query.tags),
            self._dsn,
            query.start_datetime.isoformat(),
            query.end_datetime.isoformat(),
            str(query.retrieval_mode),
        )
        if query.retrieval_mode == RetrievalMode.raw:
            raise NotImplementedError(
                "Raw retrieval is not implemented yet for the AVEVA Historian ODBC provider."
            )

        if query.retrieval_mode == RetrievalMode.cyclic:
            sql = self._build_cyclic_query(query)
            parameters: list[Any] = []
            failure_message = (
                "Unable to query cyclic historian data through ODBC. Verify the "
                "AVEVA WideHistory linked-server path, permissions, and retrieval "
                "settings."
            )
        else:
            sql = self._build_delta_query(tag_count=len(query.tags))
            parameters = [*query.tags, query.start_datetime, query.end_datetime]
            failure_message = (
                "Unable to query delta historian data through ODBC. Verify the AVEVA"
                " Historian schema, permissions, and retrieval settings."
            )

        query_start = perf_counter()
        raw_rows = self._execute_query(
            sql,
            parameters=parameters,
            failure_message=failure_message,
        )
        query_duration = perf_counter() - query_start
        raw_row_count = len(raw_rows)

        rows_for_reshape = raw_rows
        preview_truncated = False

        if preview_row_cap is not None and raw_row_count > preview_row_cap:
            rows_for_reshape = raw_rows[:preview_row_cap]
            preview_truncated = True
            logger.info(
                "Truncated AVEVA ODBC preview result on DSN '%s' from %s raw rows "
                "to %s raw rows before reshaping for %s tag(s) from %s to %s",
                self._dsn,
                raw_row_count,
                preview_row_cap,
                len(query.tags),
                query.start_datetime.isoformat(),
                query.end_datetime.isoformat(),
            )

        reshape_start = perf_counter()
        if query.retrieval_mode == RetrievalMode.cyclic:
            preview_rows = self._build_cyclic_preview_rows(rows_for_reshape, query.tags)
        else:
            preview_rows = self._build_preview_rows(rows_for_reshape)
        reshape_duration = perf_counter() - reshape_start
        total_duration = perf_counter() - total_start

        logger.info(
            "Completed AVEVA ODBC %s for %s tag(s) on DSN '%s' from %s to %s "
            "with query duration %.3fs, raw row count %s, reshape duration %.3fs, "
            "result row count %s, total duration %.3fs, preview truncated=%s",
            operation_name,
            len(query.tags),
            self._dsn,
            query.start_datetime.isoformat(),
            query.end_datetime.isoformat(),
            query_duration,
            raw_row_count,
            reshape_duration,
            len(preview_rows),
            total_duration,
            preview_truncated,
        )
        return preview_rows

    def _build_delta_query(self, tag_count: int) -> str:
        tag_placeholders = ", ".join("?" for _ in range(tag_count))
        return f"""
            SELECT
                DateTime AS timestamp,
                TagName AS tag_name,
                Value AS value
            FROM Runtime.dbo.History
            WHERE TagName IN ({tag_placeholders})
              AND DateTime >= ?
              AND DateTime <= ?
              AND wwRetrievalMode = 'Delta'
            ORDER BY DateTime, TagName
        """

    def _build_cyclic_query(self, query: HistorianQuery) -> str:
        if query.resolution_milliseconds is None:
            raise ConfigurationError(
                "resolution_milliseconds is required when HISTORIAN_PROVIDER=aveva_odbc "
                "uses cyclic retrieval."
            )

        wide_columns = ", ".join(
            self._quote_sql_server_identifier(tag_name) for tag_name in query.tags
        )
        start_datetime = self._format_openquery_datetime(query.start_datetime)
        end_datetime = self._format_openquery_datetime(query.end_datetime)
        inner_query = (
            f"SELECT DateTime, {wide_columns}, wwResolution "
            "FROM WideHistory "
            "WHERE wwRetrievalMode = 'Cyclic' "
            f"AND wwResolution = {query.resolution_milliseconds} "
            "AND wwQualityRule = 'Extended' "
            "AND wwVersion = 'Latest' "
            f"AND DateTime >= '{start_datetime}' "
            f"AND DateTime <= '{end_datetime}'"
        )
        escaped_inner_query = inner_query.replace("'", "''")

        return (
            "SELECT * "
            f"FROM OPENQUERY(INSQL, '{escaped_inner_query}') "
            "ORDER BY DateTime DESC"
        )

    def _execute_query(
        self,
        query: str,
        *,
        parameters: Iterable[Any],
        failure_message: str,
    ) -> list[dict[str, Any]]:
        logger.debug(
            "Running AVEVA ODBC query on DSN '%s': %s",
            self._dsn,
            " ".join(query.split())[:160],
        )
        connection = self._connect()

        with closing(connection):
            cursor = connection.cursor()

            try:
                cursor.execute(query, list(parameters))
                columns = [
                    str(description[0]).strip().lower()
                    for description in (cursor.description or [])
                ]
                fetched_rows = cursor.fetchall()
            except PyodbcError as exc:
                raise self._build_query_error(
                    exc,
                    failure_message=failure_message,
                ) from exc
            finally:
                cursor.close()

        return [dict(zip(columns, row)) for row in fetched_rows]

    def _connect(self):
        if pyodbc is None:
            raise ConfigurationError(
                "pyodbc must be installed to use HISTORIAN_PROVIDER=aveva_odbc."
            )

        try:
            connection = pyodbc.connect(  # type: ignore[union-attr]
                self._connection_string,
                timeout=self._query_timeout_seconds,
            )
        except PyodbcError as exc:
            raise self._build_connection_error(exc) from exc

        connection.timeout = self._query_timeout_seconds
        return connection

    @staticmethod
    def _build_connection_string(settings: Settings) -> str:
        if not settings.historian_odbc_dsn:
            raise ConfigurationError(
                "HISTORIAN_ODBC_DSN is required when HISTORIAN_PROVIDER=aveva_odbc."
            )
        if bool(settings.historian_odbc_uid) != bool(settings.historian_odbc_pwd):
            raise ConfigurationError(
                "HISTORIAN_ODBC_UID and HISTORIAN_ODBC_PWD must be provided together."
            )

        parts = [f"DSN={settings.historian_odbc_dsn}"]

        if settings.historian_odbc_uid and settings.historian_odbc_pwd:
            parts.append(f"UID={settings.historian_odbc_uid}")
            parts.append(f"PWD={settings.historian_odbc_pwd}")

        return ";".join(parts)

    @staticmethod
    def _build_preview_rows(rows: list[dict[str, Any]]) -> list[PreviewRow]:
        rows_by_timestamp: OrderedDict[datetime, dict[TagName, Any]] = OrderedDict()

        for row in rows:
            timestamp = AvevaHistorianOdbcProvider._coerce_timestamp(row.get("timestamp"))
            tag_name = AvevaHistorianOdbcProvider._coerce_tag_name(row.get("tag_name"))

            if timestamp is None or tag_name is None:
                continue

            values = rows_by_timestamp.setdefault(timestamp, {})
            values[tag_name] = row.get("value")

        return [
            PreviewRow(timestamp=timestamp, values=values)
            for timestamp, values in rows_by_timestamp.items()
        ]

    @staticmethod
    def _build_cyclic_preview_rows(
        rows: list[dict[str, Any]],
        ordered_tags: list[TagName],
    ) -> list[PreviewRow]:
        preview_rows: list[PreviewRow] = []

        for row in rows:
            timestamp = AvevaHistorianOdbcProvider._coerce_timestamp(row.get("datetime"))
            if timestamp is None:
                continue

            values = {
                tag_name: row.get(tag_name.lower())
                for tag_name in ordered_tags
            }
            preview_rows.append(PreviewRow(timestamp=timestamp, values=values))

        return preview_rows

    @staticmethod
    def _quote_sql_server_identifier(identifier: str) -> str:
        return f"[{identifier.replace(']', ']]')}]"

    @staticmethod
    def _format_openquery_datetime(value: datetime) -> str:
        return value.astimezone().strftime("%Y%m%d %H:%M:%S.%f")[:-3]

    @staticmethod
    def _coerce_timestamp(value: Any) -> datetime | None:
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            normalized_value = value.replace("Z", "+00:00")
            try:
                return datetime.fromisoformat(normalized_value)
            except ValueError:
                return None
        return None

    @staticmethod
    def _coerce_tag_name(value: Any) -> TagName | None:
        if value is None:
            return None
        normalized_value = str(value).strip()
        return normalized_value or None

    @staticmethod
    def _coerce_optional_text(value: Any) -> str | None:
        if value is None:
            return None
        normalized_value = str(value).strip()
        return normalized_value or None

    def _build_connection_error(self, exc: PyodbcError) -> HistorianConnectionError:
        error_context = self._describe_odbc_error(exc)
        logger.warning("AVEVA ODBC connection failed for DSN '%s': %s", self._dsn, error_context)
        return HistorianConnectionError(
            f"Failed to connect to the AVEVA Historian ODBC provider for DSN "
            f"'{self._dsn}'. {error_context}"
        )

    def _build_query_error(
        self,
        exc: PyodbcError,
        *,
        failure_message: str,
    ) -> HistorianQueryError:
        error_context = self._describe_odbc_error(exc)
        logger.warning("AVEVA ODBC query failed for DSN '%s': %s", self._dsn, error_context)
        return HistorianQueryError(f"{failure_message} {error_context}")

    def _describe_odbc_error(self, exc: PyodbcError) -> str:
        sql_state = self._extract_sql_state(exc)
        normalized_message = self._normalize_error_message(exc)
        lower_message = normalized_message.lower()

        if sql_state == "IM002":
            return (
                f"ODBC DSN '{self._dsn}' was not found. Verify HISTORIAN_ODBC_DSN and "
                "confirm the DSN exists on this machine."
            )

        if sql_state == "28000" or "login failed" in lower_message:
            return (
                "ODBC login failed. Verify HISTORIAN_ODBC_UID and HISTORIAN_ODBC_PWD, "
                "or confirm the DSN is configured for integrated security."
            )

        if sql_state in {"HYT00", "HYT01"} or "timeout" in lower_message:
            return (
                "The ODBC operation timed out. Increase HISTORIAN_QUERY_TIMEOUT_SECONDS "
                "or reduce the query scope."
            )

        if sql_state in {"42S02", "S0002"} or "invalid object name" in lower_message:
            return (
                "A required historian table or view was not found. Verify objects such "
                "as Runtime.dbo.Tag and Runtime.dbo.History are available in the "
                "configured DSN catalog."
            )

        if normalized_message:
            return f"ODBC error: {normalized_message}"

        return "An unspecified ODBC error occurred."

    @staticmethod
    def _extract_sql_state(exc: PyodbcError) -> str | None:
        for arg in getattr(exc, "args", ()):
            if isinstance(arg, str):
                candidate = arg.strip().split("]", 1)[0].lstrip("[")
                if len(candidate) == 5 and candidate.isalnum():
                    return candidate.upper()
        return None

    @staticmethod
    def _normalize_error_message(exc: PyodbcError) -> str:
        parts: list[str] = []

        for arg in getattr(exc, "args", ()):
            normalized_part = str(arg).strip()
            if normalized_part:
                parts.append(normalized_part)

        return " | ".join(parts)
