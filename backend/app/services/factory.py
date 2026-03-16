from functools import lru_cache

from app.core.config import get_settings
from app.core.exceptions import ConfigurationError
from app.services.interfaces import HistorianService
from app.services.providers.mock import MockHistorianService


@lru_cache
def _build_historian_service() -> HistorianService:
    settings = get_settings()
    if settings.historian_provider == "mock":
        return MockHistorianService()
    raise ConfigurationError(
        f"Unsupported historian provider: {settings.historian_provider}"
    )


def get_historian_service() -> HistorianService:
    return _build_historian_service()
