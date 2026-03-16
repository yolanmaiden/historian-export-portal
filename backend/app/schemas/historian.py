from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.historian import OutputFormat, SampleInterval, ScalarValue, TagName


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HealthResponse(StrictModel):
    status: str


class HistorianQuery(StrictModel):
    start_datetime: datetime = Field(..., description="Inclusive start timestamp")
    end_datetime: datetime = Field(..., description="Inclusive end timestamp")
    tags: list[TagName] = Field(..., min_length=1)
    sample_interval: SampleInterval

    @model_validator(mode="after")
    def validate_window(self) -> "HistorianQuery":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("End time must be after start time.")
        return self


class PreviewRequest(HistorianQuery):
    pass


class ExportRequest(HistorianQuery):
    output_format: OutputFormat = OutputFormat.csv


class PreviewRow(StrictModel):
    timestamp: datetime
    values: dict[TagName, ScalarValue]


class PreviewResponse(StrictModel):
    columns: list[str]
    rows: list[PreviewRow]


class TagInfo(StrictModel):
    name: TagName
    description: str
    engineering_unit: str
