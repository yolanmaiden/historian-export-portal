import { FormEvent, useEffect, useState } from "react";

import { exportData, fetchTags, previewData } from "./api/historian";
import ekonaMarkWhite from "./assets/logos/Ekona E White.png";
import ekonaLogoWhite from "./assets/logos/Ekona_Logo_White.png";
import { OUTPUT_FORMAT_OPTIONS } from "./constants/historian";
import { buildDefaultWindow, buildRelativeWindow } from "./lib/datetime";
import {
  buildExportRequest,
  buildPreviewRequest,
  DEFAULT_SELECTED_TAGS,
  downloadBlob,
  getExportFilename,
  getPreviewValueColumns,
  getTagIdentifier,
  isSystemTag,
  matchesTagSearch,
  normalizeTagMetadataList,
  toggleTagSelection,
  type HistorianQueryFormState,
} from "./lib/historian";
import type {
  OutputFormat,
  PreviewResponse,
  TagMetadata,
  TagName,
} from "./types/historian";

const QUICK_PRESET_OPTIONS: ReadonlyArray<{ label: string; minutes: number }> = [
  { label: "5m", minutes: 5 },
  { label: "10m", minutes: 10 },
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
];
const DEFAULT_PRESET_MINUTES = 15;

export default function App() {
  const defaultWindow = buildDefaultWindow();
  const [availableTags, setAvailableTags] = useState<TagMetadata[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagName[]>(DEFAULT_SELECTED_TAGS);
  const [tagSearchText, setTagSearchText] = useState("");
  const [showSystemTags, setShowSystemTags] = useState(false);
  const [startDatetime, setStartDatetime] = useState(defaultWindow.start);
  const [endDatetime, setEndDatetime] = useState(defaultWindow.end);
  const [activePresetMinutes, setActivePresetMinutes] =
    useState<number | null>(DEFAULT_PRESET_MINUTES);
  const [resolutionMilliseconds, setResolutionMilliseconds] = useState("1000");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("csv");
  const [previewResponse, setPreviewResponse] = useState<PreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadTags() {
      try {
        const result = await fetchTags();
        const normalizedTags = normalizeTagMetadataList(result);

        setAvailableTags(normalizedTags);
        setSelectedTags((current) =>
          current.filter((tagName) =>
            normalizedTags.some((tag) => getTagIdentifier(tag) === tagName),
          ),
        );
      } catch (loadError) {
        setErrorMessage(
          loadError instanceof Error ? loadError.message : "Failed to load tags.",
        );
      }
    }

    void loadTags();
  }, []);

  const tagsByIdentifier = new Map(
    availableTags.map((tag) => [getTagIdentifier(tag), tag] satisfies [TagName, TagMetadata]),
  );
  const filteredTags = availableTags.filter((tag) => {
    if (!showSystemTags && isSystemTag(tag)) {
      return false;
    }

    return matchesTagSearch(tag, tagSearchText);
  });
  const selectedTagIds = new Set(selectedTags);
  const hasSelectedTags = selectedTags.length > 0;

  function buildFormState(): HistorianQueryFormState {
    return {
      startDatetime,
      endDatetime,
      selectedTags,
      retrievalSelection: "cyclic",
      resolutionMilliseconds,
    };
  }

  function toggleTag(tagName: TagName) {
    setSelectedTags((current) => toggleTagSelection(current, tagName));
  }

  function removeTag(tagName: TagName) {
    setSelectedTags((current) => current.filter((tag) => tag !== tagName));
  }

  function applyQuickPreset(minutes: number) {
    const nextWindow = buildRelativeWindow(minutes);
    setStartDatetime(nextWindow.start);
    setEndDatetime(nextWindow.end);
    setActivePresetMinutes(minutes);
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
        <div className="hero-brand">
          <img
            className="hero-logo hero-logo-full"
            src={ekonaLogoWhite}
            alt="Ekona"
          />
          <img
            className="hero-logo hero-logo-mark"
            src={ekonaMarkWhite}
            alt="Ekona"
          />
          <span className="hero-badge">Internal Engineering Utility</span>
        </div>
        <div>
          <p className="eyebrow">Ekona Utility Dashboard</p>
          <h1>Historian Export Portal</h1>
          <p className="hero-copy">
            Cyclic historian query and export workspace for internal engineering use.
          </p>
        </div>
      </header>

      <main className="dashboard">
        <section className="panel controls-panel">
          <form className="controls-form" onSubmit={handlePreview}>
            <div className="field-grid">
              <label className="field field-datetime">
                <span>Start datetime</span>
                <input
                  type="datetime-local"
                  value={startDatetime}
                  onChange={(event) => {
                    setStartDatetime(event.target.value);
                    setActivePresetMinutes(null);
                  }}
                />
              </label>

              <label className="field field-datetime">
                <span>End datetime</span>
                <input
                  type="datetime-local"
                  value={endDatetime}
                  onChange={(event) => {
                    setEndDatetime(event.target.value);
                    setActivePresetMinutes(null);
                  }}
                />
              </label>

              <label className="field">
                <span>Retrieval mode</span>
                <div className="field-static-value">Cyclic</div>
              </label>

              <label className="field">
                <span>Resolution (ms)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={resolutionMilliseconds}
                  onChange={(event) => setResolutionMilliseconds(event.target.value)}
                />
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

            <div className="preset-panel">
              <div className="field-header">
                <span>Quick range presets</span>
                <small>Set end time to now and shift the start time by the selected window.</small>
              </div>
              <div className="preset-row">
                {QUICK_PRESET_OPTIONS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className={`preset-button${activePresetMinutes === preset.minutes ? " is-active" : ""}`}
                    onClick={() => applyQuickPreset(preset.minutes)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="actions-panel">
              <div className="field-header">
                <span>Query actions</span>
                <small>
                  {hasSelectedTags
                    ? `${selectedTags.length} selected`
                    : "Select at least one tag to preview or export."}
                </small>
              </div>
              <div className="actions">
                <button type="submit" disabled={isLoading || !hasSelectedTags}>
                  {isLoading ? "Loading..." : "Preview Data"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={isLoading || !hasSelectedTags}
                  onClick={handleExport}
                >
                  Export Data
                </button>
              </div>
            </div>

            <div className="tag-panel">
              <div className="field-header">
                <span>Tag selector</span>
                <small>Search and choose one or more historian tags.</small>
              </div>

              <div className="tag-toolbar">
                <input
                  className="tag-search"
                  type="search"
                  placeholder="Search tag name, description, or source system"
                  value={tagSearchText}
                  onChange={(event) => setTagSearchText(event.target.value)}
                />
                <div className="tag-toolbar-row">
                  <label className="system-toggle">
                    <input
                      type="checkbox"
                      checked={showSystemTags}
                      onChange={(event) => setShowSystemTags(event.target.checked)}
                    />
                    <span>Show system tags</span>
                  </label>
                  <small>{filteredTags.length} tags shown</small>
                </div>
              </div>

              <div className="selected-tags-panel">
                <div className="selected-tags-header">
                  <span>{selectedTags.length} selected</span>
                  {hasSelectedTags ? (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setSelectedTags([])}
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>

                {hasSelectedTags ? (
                  <div className="selected-tags-list">
                    {selectedTags.map((tagName) => (
                      <button
                        key={tagName}
                        type="button"
                        className="selected-tag-chip"
                        title={tagsByIdentifier.get(tagName)?.description || tagName}
                        onClick={() => removeTag(tagName)}
                      >
                        <span>{tagName}</span>
                        <span aria-hidden="true">x</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="selected-tags-empty">No tags selected.</p>
                )}
              </div>

              <div className="tag-results">
                {filteredTags.length ? (
                  <div className="tag-grid">
                    {filteredTags.map((tag) => {
                      const tagName = getTagIdentifier(tag);
                      const isSelected = selectedTagIds.has(tagName);

                      return (
                        <label
                          key={tagName}
                          className={`tag-card${isSelected ? " is-selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTag(tagName)}
                          />
                          <div className="tag-copy">
                            <strong>{tagName}</strong>
                            <span>{tag.description || "No description available."}</span>
                          </div>
                          <div className="tag-meta">
                            {tag.source_system ? (
                              <span className="tag-source">{tag.source_system}</span>
                            ) : null}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="tag-empty-state">
                    <p>No tags match the current filters.</p>
                  </div>
                )}
              </div>
            </div>

            {errorMessage ? <p className="message error">{errorMessage}</p> : null}
            {statusMessage ? <p className="message success">{statusMessage}</p> : null}
          </form>
        </section>

        <section className="panel preview-panel">
          <div className="panel-header">
            <div>
              <h2>Preview</h2>
              <p>
                Timestamp-first tabular preview of the selected historian tags with
                sticky headers for long result sets.
              </p>
            </div>
          </div>

          {previewResponse ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {previewResponse.columns.map((column, index) => (
                      <th
                        key={column}
                        className={index === 0 ? "timestamp-cell" : "value-cell"}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewResponse.rows.map((row) => (
                    <tr key={row.timestamp}>
                      <td className="timestamp-cell">{new Date(row.timestamp).toLocaleString()}</td>
                      {getPreviewValueColumns(previewResponse.columns).map((tagName) => (
                        <td key={`${row.timestamp}-${tagName}`} className="value-cell">
                          {String(row.values[tagName] ?? "")}
                        </td>
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
