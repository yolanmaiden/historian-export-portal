import logging
from functools import lru_cache
from typing import Callable

from app.core.config import Settings, get_settings
from app.core.exceptions import ConfigurationError
from app.services.interfaces import HistorianService
from app.services.providers.aveva_odbc import AvevaHistorianOdbcProvider
from app.services.providers.mock import MockHistorianService

logger = logging.getLogger(__name__)


def _build_mock_service(_: Settings) -> HistorianService:
    return MockHistorianService()


def _build_aveva_odbc_service(settings: Settings) -> HistorianService:
    return AvevaHistorianOdbcProvider(settings)


SERVICE_BUILDERS: dict[str, Callable[[Settings], HistorianService]] = {
    "mock": _build_mock_service,
    "aveva_odbc": _build_aveva_odbc_service,
}


@lru_cache
def _get_cached_historian_service() -> HistorianService:
    settings = get_settings()
    logger.info("Selecting historian provider '%s'", settings.historian_provider)

    try:
        service_builder = SERVICE_BUILDERS[settings.historian_provider]
    except KeyError as exc:
        raise ConfigurationError(
            f"Unsupported historian provider: {settings.historian_provider}"
        ) from exc

    return service_builder(settings)


def get_historian_service() -> HistorianService:
    return _get_cached_historian_service()
