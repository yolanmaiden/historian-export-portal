class AppError(Exception):
    status_code: int = 500

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class ConfigurationError(AppError):
    status_code = 500


class HistorianConnectionError(AppError):
    status_code = 502


class HistorianQueryError(AppError):
    status_code = 502


class UnsupportedExportFormatError(AppError):
    status_code = 501
