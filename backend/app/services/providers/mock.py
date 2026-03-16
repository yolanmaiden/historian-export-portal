from __future__ import annotations

from datetime import datetime, timedelta

from app.domain.historian import MAX_PREVIEW_ROWS, SampleInterval, TagName
from app.schemas.historian import HistorianQuery, PreviewRow, TagInfo
from app.services.interfaces import HistorianService


class MockHistorianService(HistorianService):
    _tag_catalog: tuple[TagInfo, ...] = (
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

    def list_tags(self) -> list[TagInfo]:
        return list(self._tag_catalog)

    def query_data(self, request: HistorianQuery) -> list[PreviewRow]:
        timestamps = self._build_timestamps(request)
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

    def _build_timestamps(self, request: HistorianQuery) -> list[datetime]:
        step = self._resolve_timedelta(request.sample_interval)
        timestamps: list[datetime] = []
        current = request.start_datetime

        while current <= request.end_datetime and len(timestamps) < MAX_PREVIEW_ROWS:
            timestamps.append(current)
            current += step

        return timestamps

    @staticmethod
    def _resolve_timedelta(interval: SampleInterval) -> timedelta:
        if interval in {SampleInterval.raw, SampleInterval.one_second}:
            return timedelta(seconds=1)
        if interval == SampleInterval.five_seconds:
            return timedelta(seconds=5)
        return timedelta(minutes=1)

    @staticmethod
    def _mock_value(tag: TagName, timestamp: datetime, row_index: int) -> float | int:
        minute_seed = timestamp.minute + timestamp.hour * 60

        if tag == TagName.pt_1001:
            return round(8.5 + ((minute_seed % 9) * 0.14) + row_index * 0.02, 2)
        if tag == TagName.tt_1002:
            return round(145 + ((minute_seed % 11) * 0.8) + row_index * 0.05, 2)
        if tag == TagName.ft_1104:
            return round(32 + ((minute_seed % 7) * 0.6) + row_index * 0.03, 2)
        if tag == TagName.zso_2101:
            return 1 if row_index % 6 < 4 else 0
        return 0 if row_index % 6 < 4 else 1
