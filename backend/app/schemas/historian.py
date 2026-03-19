from datetime import datetime

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.domain.historian import (
    OutputFormat,
    RetrievalMode,
    ScalarValue,
    TagSystem,
    TagName,
    classify_tag_system,
    derive_source_system,
    is_historian_system_tag,
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
    resolution_milliseconds: int | None = Field(
        default=None,
        ge=1,
        description="Cycle interval in milliseconds for cyclic retrieval.",
    )
    cycle_seconds: int | None = Field(
        default=None,
        ge=1,
        description="Legacy cycle interval in seconds for cyclic retrieval.",
    )

    @field_validator("start_datetime", "end_datetime")
    @classmethod
    def validate_timezone_aware_datetime(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Datetime values must include a timezone offset.")
        return value

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value: list[TagName]) -> list[TagName]:
        normalized_tags: list[TagName] = []
        seen_tags: set[TagName] = set()

        for tag in value:
            normalized_tag = tag.strip()
            if not normalized_tag:
                raise ValueError("Tag names must not be empty.")
            if normalized_tag in seen_tags:
                raise ValueError("Tags must be unique.")
            seen_tags.add(normalized_tag)
            normalized_tags.append(normalized_tag)

        return normalized_tags

    @model_validator(mode="after")
    def validate_window(self) -> "HistorianQuery":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("End time must be after start time.")
        if (
            self.retrieval_mode == RetrievalMode.cyclic
            and self.resolution_milliseconds is None
            and self.cycle_seconds is not None
        ):
            self.resolution_milliseconds = self.cycle_seconds * 1000
        if (
            self.retrieval_mode == RetrievalMode.cyclic
            and self.resolution_milliseconds is None
        ):
            raise ValueError(
                "resolution_milliseconds is required when retrieval_mode is cyclic."
            )
        if (
            self.retrieval_mode != RetrievalMode.cyclic
            and (
                self.resolution_milliseconds is not None
                or self.cycle_seconds is not None
            )
        ):
            raise ValueError(
                "Cyclic resolution is only supported when retrieval_mode is cyclic."
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


class TagMetadata(StrictModel):
    tag_name: TagName = Field(
        ...,
        min_length=1,
        validation_alias=AliasChoices("tag_name", "name"),
    )
    description: str | None = None
    io_address: str | None = None
    units: str | None = Field(
        default=None,
        validation_alias=AliasChoices("units", "engineering_unit"),
    )
    source_system: str | None = None
    system: TagSystem | None = None
    is_system_tag: bool | None = None

    @field_validator("tag_name")
    @classmethod
    def validate_tag_name(cls, value: str) -> str:
        normalized_value = value.strip()
        if not normalized_value:
            raise ValueError("tag_name must not be empty.")
        return normalized_value

    @field_validator("description", "io_address", "units", "source_system")
    @classmethod
    def normalize_optional_metadata(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized_value = value.strip()
        if normalized_value.lower() in {"none", "null"}:
            return None
        return normalized_value or None

    @model_validator(mode="after")
    def populate_derived_metadata(self) -> "TagMetadata":
        if self.source_system is None:
            self.source_system = derive_source_system(self.io_address)
        if self.is_system_tag is None:
            self.is_system_tag = is_historian_system_tag(
                self.tag_name,
                source_system=self.source_system,
            )
        if self.is_system_tag:
            self.source_system = TagSystem.historian_internal.value
            self.system = TagSystem.historian_internal
            return self
        if self.system is None:
            self.system = classify_tag_system(
                self.tag_name,
                description=self.description,
                source_system=self.source_system,
            )
        return self
