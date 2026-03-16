import type {
  ExportRequest,
  OutputFormat,
  PreviewColumn,
  PreviewRequest,
  RetrievalMode,
  TagName,
} from "../types/historian";

export const DEFAULT_SELECTED_TAGS: TagName[] = ["PT_1001", "TT_1002"];
export type RetrievalSelection = "delta" | "cyclic-1s";

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

export function getPreviewValueColumns(columns: PreviewColumn[]): TagName[] {
  return columns.filter((column): column is TagName => column !== "timestamp");
}

export function toggleTagSelection(selectedTags: TagName[], tagName: TagName): TagName[] {
  return selectedTags.includes(tagName)
    ? selectedTags.filter((tag) => tag !== tagName)
    : [...selectedTags, tagName];
}

export function getRetrievalParameters(
  retrievalSelection: RetrievalSelection,
): RetrievalParameters {
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
