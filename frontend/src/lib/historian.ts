import type {
  ExportRequest,
  OutputFormat,
  PreviewColumn,
  PreviewRequest,
  RetrievalMode,
  TagMetadata,
  TagName,
  TagSystem,
} from "../types/historian";

export const DEFAULT_SELECTED_TAGS: TagName[] = [];
export type RetrievalSelection = "cyclic";

export interface HistorianQueryFormState {
  startDatetime: string;
  endDatetime: string;
  selectedTags: TagName[];
  retrievalSelection: RetrievalSelection;
  resolutionMilliseconds: string;
}

interface RequestBuildResult {
  errorMessage: string | null;
  request: PreviewRequest | null;
}

interface RetrievalParameters {
  retrievalMode: RetrievalMode;
  resolutionMilliseconds: number | null;
}

const TAG_SYSTEM_VALUES = new Set<TagSystem>([
  "Gen 2",
  "DeltaV BMS/FARC",
  "SFR",
  "Historian Internal",
  "Unknown",
]);

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function tokenizeSearchValue(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function matchesShortSearchValue(value: string, searchText: string): boolean {
  const normalizedValue = value.toLowerCase();
  if (!normalizedValue) {
    return false;
  }

  if (normalizedValue.startsWith(searchText)) {
    return true;
  }

  return tokenizeSearchValue(value).some((token) => token.startsWith(searchText));
}

export function getTagIdentifier(
  tag: Pick<TagMetadata, "tag_name" | "name">,
): TagName {
  return normalizeText(tag.tag_name) || normalizeText(tag.name);
}

export function isSystemTag(
  tag: Pick<TagMetadata, "tag_name" | "name" | "is_system_tag">,
): boolean {
  if (typeof tag.is_system_tag === "boolean") {
    return tag.is_system_tag;
  }

  const normalizedTagName = getTagIdentifier(tag).toLowerCase();
  return (
    normalizedTagName.startsWith("$")
    || normalizedTagName.startsWith("sys")
    || normalizedTagName.startsWith("ww")
    || normalizedTagName.startsWith("system")
  );
}

function normalizeTagSystem(value: TagSystem | string | null | undefined): TagSystem | null {
  const normalizedValue = normalizeText(value);
  return TAG_SYSTEM_VALUES.has(normalizedValue as TagSystem)
    ? (normalizedValue as TagSystem)
    : null;
}

export function normalizeTagMetadata(tag: TagMetadata): TagMetadata | null {
  const tagName = getTagIdentifier(tag);

  if (!tagName) {
    return null;
  }

  return {
    tag_name: tagName,
    description: normalizeText(tag.description),
    io_address: normalizeText(tag.io_address) || null,
    units: normalizeText(tag.units) || normalizeText(tag.engineering_unit) || null,
    source_system: normalizeText(tag.source_system) || null,
    system: normalizeTagSystem(tag.system) || "Unknown",
    is_system_tag: typeof tag.is_system_tag === "boolean" ? tag.is_system_tag : isSystemTag(tag),
  };
}

export function normalizeTagMetadataList(tags: TagMetadata[]): TagMetadata[] {
  const tagsByIdentifier = new Map<TagName, TagMetadata>();

  for (const tag of tags) {
    const normalizedTag = normalizeTagMetadata(tag);
    if (!normalizedTag) {
      continue;
    }

    tagsByIdentifier.set(getTagIdentifier(normalizedTag), normalizedTag);
  }

  return [...tagsByIdentifier.values()];
}

export function getPreviewValueColumns(columns: PreviewColumn[]): TagName[] {
  return columns.filter((column) => column !== "timestamp");
}

export function toggleTagSelection(selectedTags: TagName[], tagName: TagName): TagName[] {
  return selectedTags.includes(tagName)
    ? selectedTags.filter((tag) => tag !== tagName)
    : [...selectedTags, tagName];
}

export function matchesTagSearch(tag: TagMetadata, searchText: string): boolean {
  const normalizedSearchText = searchText.trim().toLowerCase();
  if (!normalizedSearchText) {
    return true;
  }

  const searchableValues = [
    normalizeText(tag.tag_name),
    normalizeText(tag.description),
    normalizeText(tag.system),
    normalizeText(tag.units),
  ];

  if (normalizedSearchText.length <= 2) {
    return searchableValues.some((value) =>
      matchesShortSearchValue(value, normalizedSearchText),
    );
  }

  return searchableValues.some((value) => value.toLowerCase().includes(normalizedSearchText));
}

export function getRetrievalParameters(
  resolutionMillisecondsInput: string,
): RetrievalParameters {
  return {
    retrievalMode: "cyclic",
    resolutionMilliseconds: Number.parseInt(resolutionMillisecondsInput, 10),
  };
}

export function buildPreviewRequest(
  formState: HistorianQueryFormState,
): RequestBuildResult {
  if (!formState.selectedTags.length) {
    return {
      errorMessage: "Select at least one tag.",
      request: null,
    };
  }

  const start = new Date(formState.startDatetime);
  const end = new Date(formState.endDatetime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      errorMessage: "Enter a valid start and end datetime.",
      request: null,
    };
  }

  if (end <= start) {
    return {
      errorMessage: "End time must be after start time.",
      request: null,
    };
  }

  const { retrievalMode, resolutionMilliseconds } = getRetrievalParameters(
    formState.resolutionMilliseconds,
  );

  if (
    !Number.isInteger(resolutionMilliseconds) ||
    resolutionMilliseconds === null ||
    resolutionMilliseconds < 1
  ) {
    return {
      errorMessage: "Enter a valid cyclic resolution in milliseconds.",
      request: null,
    };
  }

  return {
    errorMessage: null,
    request: {
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      tags: formState.selectedTags,
      retrieval_mode: retrievalMode,
      resolution_milliseconds: resolutionMilliseconds,
    },
  };
}

export function buildExportRequest(
  previewRequest: PreviewRequest,
  outputFormat: OutputFormat,
): ExportRequest {
  return {
    ...previewRequest,
    output_format: outputFormat,
  };
}

export function getExportFilename(outputFormat: OutputFormat): string {
  return outputFormat === "csv" ? "historian-export.csv" : "historian-export.xlsx";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const fileUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = fileUrl;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(fileUrl);
}
