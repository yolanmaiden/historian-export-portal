import type { OutputFormat } from "../types/historian";
import type { RetrievalSelection } from "../lib/historian";

export const RETRIEVAL_OPTIONS: ReadonlyArray<{
  label: string;
  value: RetrievalSelection;
}> = [
  { label: "Cyclic", value: "cyclic" },
];

export const OUTPUT_FORMAT_OPTIONS: ReadonlyArray<{
  label: string;
  value: OutputFormat;
}> = [
  { label: "CSV", value: "csv" },
  { label: "XLSX", value: "xlsx" },
];
