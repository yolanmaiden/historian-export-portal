from enum import StrEnum

TIMESTAMP_COLUMN = "timestamp"
DEFAULT_EXPORT_BASENAME = "historian-export"
MAX_PREVIEW_ROWS = 200


class RetrievalMode(StrEnum):
    raw = "raw"
    delta = "delta"
    cyclic = "cyclic"


class OutputFormat(StrEnum):
    csv = "csv"
    xlsx = "xlsx"


TagName = str
ScalarValue = float | int | str | bool | None

EXPORT_FILENAMES: dict[OutputFormat, str] = {
    OutputFormat.csv: f"{DEFAULT_EXPORT_BASENAME}.csv",
    OutputFormat.xlsx: f"{DEFAULT_EXPORT_BASENAME}.xlsx",
}


def derive_source_system(io_address: str | None) -> str | None:
    if not io_address:
        return None

    normalized_address = io_address.strip()
    if not normalized_address:
        return None

    for delimiter in ("::", ".", ":", "/"):
        if delimiter in normalized_address:
            source_system = normalized_address.split(delimiter, 1)[0].strip()
            return source_system or None

    return normalized_address
