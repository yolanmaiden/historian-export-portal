from enum import StrEnum

MAX_PREVIEW_ROWS = 200


class SampleInterval(StrEnum):
    raw = "raw"
    one_second = "1s"
    five_seconds = "5s"
    one_minute = "1m"


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
