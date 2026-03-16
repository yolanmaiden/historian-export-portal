from abc import ABC, abstractmethod

from app.schemas.historian import HistorianQuery, PreviewRow, TagInfo


class HistorianService(ABC):
    @abstractmethod
    def list_tags(self) -> list[TagInfo]:
        raise NotImplementedError

    @abstractmethod
    def query_data(self, request: HistorianQuery) -> list[PreviewRow]:
        raise NotImplementedError
