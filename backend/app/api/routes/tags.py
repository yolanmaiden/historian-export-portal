from fastapi import APIRouter

from app.api.dependencies import HistorianServiceDep
from app.schemas.historian import TagMetadata
from app.services.serializers import build_tag_metadata_response

router = APIRouter(tags=["tags"])


@router.get("/tags", response_model=list[TagMetadata], status_code=200)
def list_tags(
    historian_service: HistorianServiceDep,
) -> list[TagMetadata]:
    return build_tag_metadata_response(historian_service.list_tags())
