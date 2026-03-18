from abc import ABC, abstractmethod

from app.schemas.historian import (
    ExportRequest,
    HistorianQuery,
    PreviewRequest,
    PreviewRow,
    TagMetadata,
)


class HistorianService(ABC):
    @abstractmethod
    def list_tags(self) -> list[TagMetadata]:
        raise NotImplementedError

    def preview_data(self, request: PreviewRequest) -> list[PreviewRow]:
        return self.query_data(request)

    def export_data(self, request: ExportRequest) -> list[PreviewRow]:
        return self.query_data(request)

    @abstractmethod
    def query_data(self, query: HistorianQuery) -> list[PreviewRow]:
        """Run a historian query, including retrieval-mode-specific options."""
        raise NotImplementedError
