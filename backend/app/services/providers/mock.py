from __future__ import annotations

from collections.abc import Callable
from datetime import datetime

from app.core.exceptions import UnsupportedRetrievalModeError
from app.domain.historian import (
    DEFAULT_DELTA_SAMPLE_INTERVAL,
    MAX_PREVIEW_ROWS,
    RetrievalMode,
    SAMPLE_INTERVAL_TO_TIMEDELTA,
    ScalarValue,
    TagName,
)
from app.schemas.historian import HistorianQuery, PreviewRow, TagInfo
from app.services.interfaces import HistorianService

TagValueBuilder = Callable[[datetime, int], ScalarValue]


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


MOCK_TAG_CATALOG: tuple[TagInfo, ...] = (
    TagInfo(
        name=TagName.pt_1001,
        description="Reactor pressure",
        engineering_unit="bar",
    ),
    TagInfo(
        name=TagName.tt_1002,
        description="Reactor temperature",
        engineering_unit="degC",
    ),
    TagInfo(
        name=TagName.ft_1104,
        description="Feed flow",
        engineering_unit="m3/h",
    ),
    TagInfo(
        name=TagName.zso_2101,
        description="Valve open status",
        engineering_unit="state",
    ),
    TagInfo(
        name=TagName.zsc_2101,
        description="Valve closed status",
        engineering_unit="state",
    ),
)

MOCK_VALUE_BUILDERS: dict[TagName, TagValueBuilder] = {
    TagName.pt_1001: _build_pressure_value,
    TagName.tt_1002: _build_temperature_value,
    TagName.ft_1104: _build_flow_value,
    TagName.zso_2101: _build_open_status_value,
    TagName.zsc_2101: _build_closed_status_value,
}


class MockHistorianService(HistorianService):
    _tag_catalog: tuple[TagInfo, ...] = MOCK_TAG_CATALOG

    def list_tags(self) -> list[TagInfo]:
        return list(self._tag_catalog)

    def query_data(self, request: HistorianQuery) -> list[PreviewRow]:
        if request.retrieval_mode == RetrievalMode.cyclic:
            raise UnsupportedRetrievalModeError(
                "Cyclic retrieval is not implemented yet for the mock historian provider."
            )

        timestamps = self._build_timestamp_series(request)
        return [
            PreviewRow(
                timestamp=timestamp,
                values={
                    tag: self._mock_value(tag=tag, timestamp=timestamp, row_index=index)
                    for tag in request.tags
                },
            )
            for index, timestamp in enumerate(timestamps)
        ]

    def _build_timestamp_series(self, request: HistorianQuery) -> list[datetime]:
        step = SAMPLE_INTERVAL_TO_TIMEDELTA[
            request.sample_interval or DEFAULT_DELTA_SAMPLE_INTERVAL
        ]
        timestamps: list[datetime] = []
        current = request.start_datetime

        while current <= request.end_datetime and len(timestamps) < MAX_PREVIEW_ROWS:
            timestamps.append(current)
            current += step

        return timestamps

    @staticmethod
    def _mock_value(tag: TagName, timestamp: datetime, row_index: int) -> ScalarValue:
        return MOCK_VALUE_BUILDERS[tag](timestamp, row_index)
