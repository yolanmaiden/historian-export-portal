import type { OutputFormat, SampleInterval } from "../types/historian";

export const SAMPLE_INTERVAL_OPTIONS: ReadonlyArray<{
  label: string;
  value: SampleInterval;
}> = [
  { label: "Raw", value: "raw" },
  { label: "1 second", value: "1s" },
  { label: "5 seconds", value: "5s" },
  { label: "1 minute", value: "1m" },
];

export const OUTPUT_FORMAT_OPTIONS: ReadonlyArray<{
  label: string;
  value: OutputFormat;
}> = [
  { label: "CSV", value: "csv" },
  { label: "XLSX", value: "xlsx" },
];
