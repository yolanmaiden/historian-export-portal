from datetime import timedelta
from enum import StrEnum

TIMESTAMP_COLUMN = "timestamp"
DEFAULT_EXPORT_BASENAME = "historian-export"
MAX_PREVIEW_ROWS = 200


class SampleInterval(StrEnum):
    raw = "raw"
    one_second = "1s"
    five_seconds = "5s"
    one_minute = "1m"


class RetrievalMode(StrEnum):
    delta = "delta"
    cyclic = "cyclic"


class OutputFormat(StrEnum):
    csv = "csv"
    xlsx = "xlsx"


class TagName(StrEnum):
    pt_1001 = "PT_1001"
    tt_1002 = "TT_1002"
    ft_1104 = "FT_1104"
    zso_2101 = "ZSO_2101"
    zsc_2101 = "ZSC_2101"


ScalarValue = float | int | str | bool | None
DEFAULT_DELTA_SAMPLE_INTERVAL = SampleInterval.raw

SAMPLE_INTERVAL_TO_TIMEDELTA: dict[SampleInterval, timedelta] = {
    SampleInterval.raw: timedelta(seconds=1),
    SampleInterval.one_second: timedelta(seconds=1),
    SampleInterval.five_seconds: timedelta(seconds=5),
    SampleInterval.one_minute: timedelta(minutes=1),
}

EXPORT_FILENAMES: dict[OutputFormat, str] = {
    OutputFormat.csv: f"{DEFAULT_EXPORT_BASENAME}.csv",
    OutputFormat.xlsx: f"{DEFAULT_EXPORT_BASENAME}.xlsx",
}
