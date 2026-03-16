import { FormEvent, useEffect, useState } from "react";

import { exportData, fetchTags, previewData } from "./api/historian";
import {
  OUTPUT_FORMAT_OPTIONS,
  RETRIEVAL_OPTIONS,
} from "./constants/historian";
import { buildDefaultWindow } from "./lib/datetime";
import {
  buildExportRequest,
  buildPreviewRequest,
  DEFAULT_SELECTED_TAGS,
  downloadBlob,
  getExportFilename,
  getPreviewValueColumns,
  toggleTagSelection,
  type HistorianQueryFormState,
  type RetrievalSelection,
} from "./lib/historian";
import type {
  OutputFormat,
  PreviewResponse,
  TagInfo,
  TagName,
} from "./types/historian";

export default function App() {
  const defaultWindow = buildDefaultWindow();
  const [availableTags, setAvailableTags] = useState<TagInfo[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagName[]>(DEFAULT_SELECTED_TAGS);
  const [startDatetime, setStartDatetime] = useState(defaultWindow.start);
  const [endDatetime, setEndDatetime] = useState(defaultWindow.end);
  const [retrievalSelection, setRetrievalSelection] =
    useState<RetrievalSelection>("delta");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("csv");
  const [previewResponse, setPreviewResponse] = useState<PreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadTags() {
      try {
        const result = await fetchTags();
        setAvailableTags(result);
      } catch (loadError) {
        setErrorMessage(
          loadError instanceof Error ? loadError.message : "Failed to load tags.",
        );
      }
    }

    void loadTags();
  }, []);

  function buildFormState(): HistorianQueryFormState {
    return {
      startDatetime,
      endDatetime,
      selectedTags,
      retrievalSelection,
    };
  }

  function toggleTag(tagName: TagName) {
    setSelectedTags((current) => toggleTagSelection(current, tagName));
  }

  function preparePreviewRequest() {
    setErrorMessage(null);
    setStatusMessage(null);

    const result = buildPreviewRequest(buildFormState());

    if (result.errorMessage) {
      setErrorMessage(result.errorMessage);
    }

    return result.request;
  }

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = preparePreviewRequest();
    if (!request) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await previewData(request);
      setPreviewResponse(result);
      setStatusMessage(`Loaded ${result.rows.length} rows.`);
    } catch (previewError) {
      setErrorMessage(
        previewError instanceof Error ? previewError.message : "Preview failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExport() {
    const previewRequest = preparePreviewRequest();
    if (!previewRequest) {
      return;
    }

    const exportRequest = buildExportRequest(previewRequest, outputFormat);
    setIsLoading(true);

    try {
      const file = await exportData(exportRequest);
      downloadBlob(file, getExportFilename(exportRequest.output_format));
      setStatusMessage(
        `Export generated as ${exportRequest.output_format.toUpperCase()}.`,
      );
    } catch (exportError) {
      setErrorMessage(
        exportError instanceof Error ? exportError.message : "Export failed.",
      );
    } finally {
      setIsLoading(false);
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
                <span>Retrieval mode</span>
                <select
                  value={retrievalSelection}
                  onChange={(event) =>
                    setRetrievalSelection(event.target.value as RetrievalSelection)
                  }
                >
                  {RETRIEVAL_OPTIONS.map((option) => (
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
                {availableTags.map((tag) => (
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

            {errorMessage ? <p className="message error">{errorMessage}</p> : null}
            {statusMessage ? <p className="message success">{statusMessage}</p> : null}

            <div className="actions">
              <button type="submit" disabled={isLoading}>
                {isLoading ? "Loading..." : "Preview Data"}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={isLoading}
                onClick={handleExport}
              >
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

          {previewResponse ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {previewResponse.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewResponse.rows.map((row) => (
                    <tr key={row.timestamp}>
                      <td>{new Date(row.timestamp).toLocaleString()}</td>
                      {getPreviewValueColumns(previewResponse.columns).map((tag) => (
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
