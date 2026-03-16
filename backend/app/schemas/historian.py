from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.historian import (
    DEFAULT_DELTA_SAMPLE_INTERVAL,
    OutputFormat,
    RetrievalMode,
    SampleInterval,
    ScalarValue,
    TagName,
)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HealthResponse(StrictModel):
    status: str


class HistorianQuery(StrictModel):
    start_datetime: datetime = Field(..., description="Inclusive start timestamp")
    end_datetime: datetime = Field(..., description="Inclusive end timestamp")
    tags: list[TagName] = Field(..., min_length=1)
    retrieval_mode: RetrievalMode = RetrievalMode.delta
    cycle_seconds: int | None = Field(
        default=None,
        ge=1,
        description="Cycle interval in seconds for cyclic retrieval.",
    )
    sample_interval: SampleInterval = DEFAULT_DELTA_SAMPLE_INTERVAL

    @field_validator("start_datetime", "end_datetime")
    @classmethod
    def validate_timezone_aware_datetime(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Datetime values must include a timezone offset.")
        return value

    @field_validator("tags")
    @classmethod
    def validate_unique_tags(cls, value: list[TagName]) -> list[TagName]:
        if len(set(value)) != len(value):
            raise ValueError("Tags must be unique.")
        return value

    @model_validator(mode="after")
    def validate_window(self) -> "HistorianQuery":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("End time must be after start time.")
        if self.retrieval_mode == RetrievalMode.cyclic and self.cycle_seconds is None:
            raise ValueError(
                "cycle_seconds is required when retrieval_mode is cyclic."
            )
        if self.retrieval_mode == RetrievalMode.delta and self.cycle_seconds is not None:
            raise ValueError(
                "cycle_seconds is only supported when retrieval_mode is cyclic."
            )
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
