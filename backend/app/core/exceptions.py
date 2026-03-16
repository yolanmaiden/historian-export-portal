class AppError(Exception):
    status_code = 500

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class ConfigurationError(AppError):
    status_code = 500


class UnsupportedExportFormatError(AppError):
    status_code = 501
