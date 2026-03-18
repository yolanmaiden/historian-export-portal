import type {
  ExportRequest,
  OutputFormat,
  PreviewColumn,
  PreviewRequest,
  RetrievalMode,
  TagMetadata,
  TagName,
} from "../types/historian";

export const DEFAULT_SELECTED_TAGS: TagName[] = ["PT_1001", "TT_1002"];
export type RetrievalSelection = "raw" | "delta" | "cyclic-1s";

export interface HistorianQueryFormState {
  startDatetime: string;
  endDatetime: string;
  selectedTags: TagName[];
  retrievalSelection: RetrievalSelection;
}

interface RequestBuildResult {
  errorMessage: string | null;
  request: PreviewRequest | null;
}

interface RetrievalParameters {
  retrievalMode: RetrievalMode;
  cycleSeconds: number | null;
}

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getTagIdentifier(
  tag: Pick<TagMetadata, "tag_name" | "name">,
): TagName {
  return normalizeText(tag.tag_name) || normalizeText(tag.name);
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
    normalizeText(tag.source_system),
    normalizeText(tag.io_address),
    normalizeText(tag.units),
  ];

  return searchableValues.some((value) => value.toLowerCase().includes(normalizedSearchText));
}

export function getRetrievalParameters(
  retrievalSelection: RetrievalSelection,
): RetrievalParameters {
  if (retrievalSelection === "raw") {
    return {
      retrievalMode: "raw",
      cycleSeconds: null,
    };
  }

  if (retrievalSelection === "cyclic-1s") {
    return {
      retrievalMode: "cyclic",
      cycleSeconds: 1,
    };
  }

  return {
    retrievalMode: "delta",
    cycleSeconds: null,
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

  const { retrievalMode, cycleSeconds } = getRetrievalParameters(
    formState.retrievalSelection,
  );

  return {
    errorMessage: null,
    request: {
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      tags: formState.selectedTags,
      retrieval_mode: retrievalMode,
      cycle_seconds: cycleSeconds,
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
