from fastapi import APIRouter

from app.schemas.historian import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, status_code=200)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
