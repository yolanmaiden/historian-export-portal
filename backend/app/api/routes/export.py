from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.api.dependencies import HistorianServiceDep
from app.core.exceptions import UnsupportedExportFormatError
from app.domain.historian import OutputFormat
from app.schemas.historian import ExportRequest, PreviewRequest, PreviewResponse
from app.services.serializers import build_csv_export, build_preview_response

router = APIRouter(tags=["export"])


@router.post("/preview", response_model=PreviewResponse, status_code=200)
def preview_data(
    request: PreviewRequest,
    historian_service: HistorianServiceDep,
) -> PreviewResponse:
    rows = historian_service.query_data(request)
    return build_preview_response(request, rows)


@router.post("/export", status_code=200)
def export_data(
    request: ExportRequest,
    historian_service: HistorianServiceDep,
) -> StreamingResponse:
    if request.output_format == OutputFormat.xlsx:
        raise UnsupportedExportFormatError("XLSX export is not implemented yet.")

    rows = historian_service.query_data(request)
    csv_content = build_csv_export(request, rows)
    headers = {"Content-Disposition": 'attachment; filename="historian-export.csv"'}
    return StreamingResponse(
        iter([csv_content.encode("utf-8")]),
        media_type="text/csv",
        headers=headers,
    )
