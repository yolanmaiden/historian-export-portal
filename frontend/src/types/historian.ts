export type TagName = string;
export type RetrievalMode = "raw" | "delta" | "cyclic";
export type OutputFormat = "csv" | "xlsx";
export type ScalarValue = string | number | boolean | null;
export type PreviewColumn = string;
export type TagSystem =
  | "Gen 2"
  | "DeltaV BMS/FARC"
  | "SFR"
  | "Historian Internal"
  | "Unknown";

export interface TagMetadata {
  tag_name?: TagName | null;
  name?: TagName | null;
  description?: string | null;
  io_address?: string | null;
  units?: string | null;
  engineering_unit?: string | null;
  source_system?: string | null;
  system?: TagSystem | null;
  is_system_tag?: boolean | null;
}

export interface HistorianQuery {
  start_datetime: string;
  end_datetime: string;
  tags: TagName[];
  retrieval_mode: RetrievalMode;
  resolution_milliseconds?: number | null;
}

export type PreviewRequest = HistorianQuery;

export interface ExportRequest extends HistorianQuery {
  output_format: OutputFormat;
}

export interface PreviewRow {
  timestamp: string;
  values: Record<TagName, ScalarValue>;
}

export interface PreviewResponse {
  columns: PreviewColumn[];
  rows: PreviewRow[];
}
