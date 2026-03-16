import type {
  ExportRequest,
  OutputFormat,
  PreviewColumn,
  PreviewRequest,
  SampleInterval,
  TagName,
} from "../types/historian";

export const DEFAULT_SELECTED_TAGS: TagName[] = ["PT_1001", "TT_1002"];

export interface HistorianQueryFormState {
  startDatetime: string;
  endDatetime: string;
  selectedTags: TagName[];
  sampleInterval: SampleInterval;
}

interface RequestBuildResult {
  errorMessage: string | null;
  request: PreviewRequest | null;
}

export function getPreviewValueColumns(columns: PreviewColumn[]): TagName[] {
  return columns.filter((column): column is TagName => column !== "timestamp");
}

export function toggleTagSelection(selectedTags: TagName[], tagName: TagName): TagName[] {
  return selectedTags.includes(tagName)
    ? selectedTags.filter((tag) => tag !== tagName)
    : [...selectedTags, tagName];
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

  return {
    errorMessage: null,
    request: {
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      tags: formState.selectedTags,
      sample_interval: formState.sampleInterval,
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
