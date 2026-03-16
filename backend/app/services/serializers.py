import csv
from io import StringIO

from app.schemas.historian import HistorianQuery, PreviewResponse, PreviewRow


def build_preview_response(
    request: HistorianQuery,
    rows: list[PreviewRow],
) -> PreviewResponse:
    return PreviewResponse(
        columns=["timestamp", *[tag.value for tag in request.tags]],
        rows=rows,
    )


def build_csv_export(request: HistorianQuery, rows: list[PreviewRow]) -> str:
    output = StringIO()
    writer = csv.writer(output)
    ordered_tags = list(request.tags)
    writer.writerow(["timestamp", *[tag.value for tag in ordered_tags]])

    for row in rows:
        writer.writerow(
            [
                row.timestamp.isoformat(),
                *[row.values.get(tag) for tag in ordered_tags],
            ]
        )

    return output.getvalue()
