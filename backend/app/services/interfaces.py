from abc import ABC, abstractmethod

from app.schemas.historian import HistorianQuery, PreviewRow, TagInfo


class HistorianService(ABC):
    @abstractmethod
    def list_tags(self) -> list[TagInfo]:
        raise NotImplementedError

    @abstractmethod
    def query_data(self, query: HistorianQuery) -> list[PreviewRow]:
        """Run a historian query, including retrieval-mode-specific options."""
        raise NotImplementedError
