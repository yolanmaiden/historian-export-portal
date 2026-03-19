import re
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


class TagSystem(StrEnum):
    gen_2 = "Gen 2"
    delta_v_bms_farc = "DeltaV BMS/FARC"
    sfr = "SFR"
    historian_internal = "Historian Internal"
    unknown = "Unknown"


TagName = str
ScalarValue = float | int | str | bool | None

EXPORT_FILENAMES: dict[OutputFormat, str] = {
    OutputFormat.csv: f"{DEFAULT_EXPORT_BASENAME}.csv",
    OutputFormat.xlsx: f"{DEFAULT_EXPORT_BASENAME}.xlsx",
}

SYSTEM_TAG_PREFIXES = ("$", "sys", "ww", "system")


def derive_source_system(io_address: str | None) -> str | None:
    if not io_address:
        return None

    normalized_address = io_address.strip()
    if not normalized_address:
        return None

    if normalized_address.startswith("//") and "|" in normalized_address:
        historian_path = normalized_address.split("|", 1)[1]
        topic_name = historian_path.split("!", 1)[0].strip()
        return topic_name or None

    for delimiter in ("::", ".", ":", "/"):
        if delimiter in normalized_address:
            source_system = normalized_address.split(delimiter, 1)[0].strip()
            return source_system or None

    return normalized_address


def is_historian_system_tag(
    tag_name: str,
    *,
    source_system: str | None = None,
) -> bool:
    normalized_tag_name = tag_name.strip().lower()
    if not normalized_tag_name:
        return False

    normalized_source_system = (source_system or "").strip().lower()
    if normalized_source_system == "system":
        return True

    return normalized_tag_name.startswith(SYSTEM_TAG_PREFIXES)


def classify_tag_system(
    tag_name: str,
    *,
    description: str | None = None,
    source_system: str | None = None,
) -> TagSystem:
    normalized_tag_name = tag_name.strip().upper()
    searchable_text = " ".join(
        value.strip().upper()
        for value in (tag_name, description, source_system)
        if value and value.strip()
    )

    if any(token in searchable_text for token in ("BMS", "FARC")):
        return TagSystem.delta_v_bms_farc

    if any(token in searchable_text for token in ("SFR", "SFR_PCS")) or normalized_tag_name.startswith("30-"):
        return TagSystem.sfr

    if (
        re.search(r"\bGEN[\s_-]?2\b", searchable_text)
        or "GEN2_PCS" in searchable_text
        or normalized_tag_name.startswith("20-")
    ):
        return TagSystem.gen_2

    return TagSystem.unknown
