import { requestBlob, requestJson } from "./client";
import type {
  ExportRequest,
  PreviewRequest,
  PreviewResponse,
  TagMetadata,
} from "../types/historian";


export function fetchTags(): Promise<TagMetadata[]> {
  return requestJson<TagMetadata[]>("/tags");
}

export function previewData(request: PreviewRequest): Promise<PreviewResponse> {
  return requestJson<PreviewResponse>("/preview", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function exportData(request: ExportRequest): Promise<Blob> {
  return requestBlob("/export", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
