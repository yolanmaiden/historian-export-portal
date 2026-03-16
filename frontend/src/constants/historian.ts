import type { OutputFormat } from "../types/historian";
import type { RetrievalSelection } from "../lib/historian";

export const RETRIEVAL_OPTIONS: ReadonlyArray<{
  label: string;
  value: RetrievalSelection;
}> = [
  { label: "Raw/Delta", value: "delta" },
  { label: "1 second cyclic", value: "cyclic-1s" },
];

export const OUTPUT_FORMAT_OPTIONS: ReadonlyArray<{
  label: string;
  value: OutputFormat;
}> = [
  { label: "CSV", value: "csv" },
  { label: "XLSX", value: "xlsx" },
];
