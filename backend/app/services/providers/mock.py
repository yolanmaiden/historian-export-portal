from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta

from app.domain.historian import MAX_PREVIEW_ROWS, RetrievalMode, ScalarValue, TagName
from app.schemas.historian import HistorianQuery, PreviewRow, TagMetadata
from app.services.interfaces import HistorianService

TagValueBuilder = Callable[[datetime, int], ScalarValue]

MOCK_RAW_STEP = timedelta(seconds=1)


def _build_pressure_value(timestamp: datetime, row_index: int) -> float:
    minute_seed = timestamp.minute + timestamp.hour * 60
    return round(8.5 + ((minute_seed % 9) * 0.14) + row_index * 0.02, 2)


def _build_temperature_value(timestamp: datetime, row_index: int) -> float:
    minute_seed = timestamp.minute + timestamp.hour * 60
    return round(145 + ((minute_seed % 11) * 0.8) + row_index * 0.05, 2)


def _build_flow_value(timestamp: datetime, row_index: int) -> float:
    minute_seed = timestamp.minute + timestamp.hour * 60
    return round(32 + ((minute_seed % 7) * 0.6) + row_index * 0.03, 2)


def _build_open_status_value(_: datetime, row_index: int) -> int:
    return 1 if row_index % 6 < 4 else 0


def _build_closed_status_value(_: datetime, row_index: int) -> int:
    return 0 if row_index % 6 < 4 else 1


MOCK_TAG_CATALOG: tuple[TagMetadata, ...] = (
    TagMetadata(
        tag_name="PT_1001",
        description="Reactor pressure",
        io_address="PLC1.AI.PT_1001",
        units="bar",
    ),
    TagMetadata(
        tag_name="TT_1002",
        description="Reactor temperature",
        io_address="PLC1.AI.TT_1002",
        units="degC",
    ),
    TagMetadata(
        tag_name="FT_1104",
        description="Feed flow",
        io_address="PLC2.AI.FT_1104",
        units="m3/h",
    ),
    TagMetadata(
        tag_name="ZSO_2101",
        description="Valve open status",
        io_address="PLC2.DI.ZSO_2101",
        units="state",
    ),
    TagMetadata(
        tag_name="ZSC_2101",
        description="Valve closed status",
        io_address="PLC2.DI.ZSC_2101",
        units="state",
    ),
)

MOCK_VALUE_BUILDERS: dict[TagName, TagValueBuilder] = {
    "PT_1001": _build_pressure_value,
    "TT_1002": _build_temperature_value,
    "FT_1104": _build_flow_value,
    "ZSO_2101": _build_open_status_value,
    "ZSC_2101": _build_closed_status_value,
}


class MockHistorianService(HistorianService):
    _tag_catalog: tuple[TagMetadata, ...] = MOCK_TAG_CATALOG

    def list_tags(self) -> list[TagMetadata]:
        return list(self._tag_catalog)

    def query_data(self, request: HistorianQuery) -> list[PreviewRow]:
        if request.retrieval_mode == RetrievalMode.cyclic:
            raise NotImplementedError(
                "Cyclic retrieval is not implemented yet for the mock historian provider."
            )

        raw_rows = self._build_raw_rows(request)
        if request.retrieval_mode == RetrievalMode.raw:
            return raw_rows
        return self._build_delta_rows(raw_rows)

    def _build_raw_rows(self, request: HistorianQuery) -> list[PreviewRow]:
        timestamps = self._build_timestamp_series(request)
        return [
            PreviewRow(
                timestamp=timestamp,
                values={
                    tag_name: self._mock_value(
                        tag_name=tag_name,
                        timestamp=timestamp,
                        row_index=index,
                    )
                    for tag_name in request.tags
                },
            )
            for index, timestamp in enumerate(timestamps)
        ]

    def _build_timestamp_series(self, request: HistorianQuery) -> list[datetime]:
        timestamps: list[datetime] = []
        current = request.start_datetime

        while current <= request.end_datetime and len(timestamps) < MAX_PREVIEW_ROWS:
            timestamps.append(current)
            current += MOCK_RAW_STEP

        return timestamps

    @staticmethod
    def _build_delta_rows(rows: list[PreviewRow]) -> list[PreviewRow]:
        delta_rows: list[PreviewRow] = []
        previous_values: dict[TagName, ScalarValue] | None = None

        for row in rows:
            if previous_values is None or row.values != previous_values:
                delta_rows.append(row)
                previous_values = dict(row.values)

        return delta_rows

    @staticmethod
    def _mock_value(
        tag_name: TagName,
        timestamp: datetime,
        row_index: int,
    ) -> ScalarValue:
        return MOCK_VALUE_BUILDERS[tag_name](timestamp, row_index)
