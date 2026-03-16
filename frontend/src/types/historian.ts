export type TagName =
  | "PT_1001"
  | "TT_1002"
  | "FT_1104"
  | "ZSO_2101"
  | "ZSC_2101";

export type SampleInterval = "raw" | "1s" | "5s" | "1m";
export type OutputFormat = "csv" | "xlsx";
export type ScalarValue = string | number | boolean | null;
export type PreviewColumn = "timestamp" | TagName;

export interface TagInfo {
  name: TagName;
  description: string;
  engineering_unit: string;
}

export interface HistorianQuery {
  start_datetime: string;
  end_datetime: string;
  tags: TagName[];
  sample_interval: SampleInterval;
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
