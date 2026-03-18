import csv
from io import StringIO
from typing import Any, Iterable

from app.domain.historian import TIMESTAMP_COLUMN, TagName
from app.schemas.historian import HistorianQuery, PreviewResponse, PreviewRow, TagMetadata


def build_preview_columns(request: HistorianQuery) -> list[str]:
    return [TIMESTAMP_COLUMN, *request.tags]


def build_export_row(row: PreviewRow, ordered_tags: list[TagName]) -> list[object]:
    return [
        row.timestamp.isoformat(),
        *[row.values.get(tag) for tag in ordered_tags],
    ]


def build_preview_response(
    request: HistorianQuery,
    rows: list[PreviewRow],
) -> PreviewResponse:
    return PreviewResponse(
        columns=build_preview_columns(request),
        rows=rows,
    )


def build_tag_metadata_response(tags: Iterable[TagMetadata | dict[str, Any]]) -> list[TagMetadata]:
    return [TagMetadata.model_validate(tag) for tag in tags]


def build_csv_export(request: HistorianQuery, rows: list[PreviewRow]) -> str:
    output = StringIO()
    writer = csv.writer(output)
    ordered_tags = list(request.tags)
    writer.writerow(build_preview_columns(request))

    for row in rows:
        writer.writerow(build_export_row(row, ordered_tags))

    return output.getvalue()
