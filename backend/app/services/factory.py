from functools import lru_cache
from typing import Callable

from app.core.config import get_settings
from app.core.exceptions import ConfigurationError
from app.services.interfaces import HistorianService
from app.services.providers.mock import MockHistorianService

SERVICE_BUILDERS: dict[str, Callable[[], HistorianService]] = {
    "mock": MockHistorianService,
}


@lru_cache
def _get_cached_historian_service() -> HistorianService:
    settings = get_settings()

    try:
        service_builder = SERVICE_BUILDERS[settings.historian_provider]
    except KeyError as exc:
        raise ConfigurationError(
            f"Unsupported historian provider: {settings.historian_provider}"
        ) from exc

    return service_builder()


def get_historian_service() -> HistorianService:
    return _get_cached_historian_service()
