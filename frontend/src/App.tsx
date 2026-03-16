import { FormEvent, useEffect, useState } from "react";

import { exportData, fetchTags, previewData } from "./api/historian";
import {
  OUTPUT_FORMAT_OPTIONS,
  SAMPLE_INTERVAL_OPTIONS,
} from "./constants/historian";
import { buildDefaultWindow } from "./lib/datetime";
import type {
  ExportRequest,
  OutputFormat,
  PreviewColumn,
  PreviewResponse,
  PreviewRequest,
  SampleInterval,
  TagInfo,
  TagName,
} from "./types/historian";

export default function App() {
  const defaults = buildDefaultWindow();
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagName[]>(["PT_1001", "TT_1002"]);
  const [startDatetime, setStartDatetime] = useState(defaults.start);
  const [endDatetime, setEndDatetime] = useState(defaults.end);
  const [sampleInterval, setSampleInterval] = useState<SampleInterval>("1m");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("csv");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadTags() {
      try {
        const result = await fetchTags();
        setTags(result);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load tags.",
        );
      }
    }

    void loadTags();
  }, []);

  function getPreviewTagColumns(columns: PreviewColumn[]): TagName[] {
    return columns.filter((column): column is TagName => column !== "timestamp");
  }

  function toggleTag(tagName: TagName) {
    setSelectedTags((current) =>
      current.includes(tagName)
        ? current.filter((tag) => tag !== tagName)
        : [...current, tagName],
    );
  }

  function buildPreviewRequest(): PreviewRequest | null {
    setError(null);
    setStatusMessage(null);

    if (!selectedTags.length) {
      setError("Select at least one tag.");
      return null;
    }

    const start = new Date(startDatetime);
    const end = new Date(endDatetime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Enter a valid start and end datetime.");
      return null;
    }

    if (end <= start) {
      setError("End time must be after start time.");
      return null;
    }

    return {
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      tags: selectedTags,
      sample_interval: sampleInterval,
    };
  }

  function buildExportRequest(query: PreviewRequest): ExportRequest {
    return {
      ...query,
      output_format: outputFormat,
    };
  }

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = buildPreviewRequest();
    if (!request) {
      return;
    }

    setLoading(true);

    try {
      const result = await previewData(request);
      setPreview(result);
      setStatusMessage(`Loaded ${result.rows.length} rows.`);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Preview failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    const query = buildPreviewRequest();
    if (!query) {
      return;
    }
    const request = buildExportRequest(query);

    setLoading(true);

    try {
      const file = await exportData(request);
      const fileUrl = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = fileUrl;
      anchor.download = request.output_format === "csv" ? "historian-export.csv" : "historian-export.xlsx";
      anchor.click();
      URL.revokeObjectURL(fileUrl);
      setStatusMessage(`Export generated as ${request.output_format.toUpperCase()}.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Internal Engineering Prototype</p>
          <h1>Historian Export Portal</h1>
          <p className="hero-copy">
            Query mock historian signals, preview the returned time series, and export
            the result for downstream analysis.
          </p>
        </div>
      </header>

      <main className="dashboard">
        <section className="panel controls-panel">
          <form onSubmit={handlePreview}>
            <div className="field-grid">
              <label className="field">
                <span>Start datetime</span>
                <input
                  type="datetime-local"
                  value={startDatetime}
                  onChange={(event) => setStartDatetime(event.target.value)}
                />
              </label>

              <label className="field">
                <span>End datetime</span>
                <input
                  type="datetime-local"
                  value={endDatetime}
                  onChange={(event) => setEndDatetime(event.target.value)}
                />
              </label>

              <label className="field">
                <span>Sample interval</span>
                <select
                  value={sampleInterval}
                  onChange={(event) => setSampleInterval(event.target.value as SampleInterval)}
                >
                  {SAMPLE_INTERVAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Output format</span>
                <select
                  value={outputFormat}
                  onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}
                >
                  {OUTPUT_FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="tag-panel">
              <div className="field-header">
                <span>Tag selector</span>
                <small>Choose one or more historian tags.</small>
              </div>
              <div className="tag-grid">
                {tags.map((tag) => (
                  <label key={tag.name} className="tag-card">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.name)}
                      onChange={() => toggleTag(tag.name)}
                    />
                    <div>
                      <strong>{tag.name}</strong>
                      <span>{tag.description}</span>
                    </div>
                    <em>{tag.engineering_unit}</em>
                  </label>
                ))}
              </div>
            </div>

            {error ? <p className="message error">{error}</p> : null}
            {statusMessage ? <p className="message success">{statusMessage}</p> : null}

            <div className="actions">
              <button type="submit" disabled={loading}>
                {loading ? "Loading..." : "Preview Data"}
              </button>
              <button type="button" className="secondary" disabled={loading} onClick={handleExport}>
                Export Data
              </button>
            </div>
          </form>
        </section>

        <section className="panel preview-panel">
          <div className="panel-header">
            <div>
              <h2>Preview</h2>
              <p>Timestamp-first tabular preview of the selected historian signals.</p>
            </div>
          </div>

          {preview ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {preview.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.timestamp}>
                      <td>{new Date(row.timestamp).toLocaleString()}</td>
                      {getPreviewTagColumns(preview.columns).map((tag) => (
                        <td key={`${row.timestamp}-${tag}`}>{String(row.values[tag] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>No preview loaded yet. Configure the query and click Preview Data.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
