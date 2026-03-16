from typing import Annotated

from fastapi import Depends

from app.services.factory import get_historian_service
from app.services.interfaces import HistorianService

HistorianServiceDep = Annotated[HistorianService, Depends(get_historian_service)]
