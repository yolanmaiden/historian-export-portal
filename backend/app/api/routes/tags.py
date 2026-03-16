from fastapi import APIRouter

from app.api.dependencies import HistorianServiceDep
from app.schemas.historian import TagInfo

router = APIRouter(tags=["tags"])


@router.get("/tags", response_model=list[TagInfo], status_code=200)
def list_tags(
    historian_service: HistorianServiceDep,
) -> list[TagInfo]:
    return historian_service.list_tags()
