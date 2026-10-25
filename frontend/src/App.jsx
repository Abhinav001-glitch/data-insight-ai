
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Plus,
  Send,
  Sparkles,
  Table2,
  Upload,
  Zap,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import "./App.css";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const PROMPTS = [
  "Summarize this dataset",
  "Show me the outliers",
  "Find the strongest correlations",
  "Show the highest values",
];

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function getErrorMessage(data, fallback) {
  return typeof data?.detail === "string"
    ? data.detail
    : fallback;
}

export default function App() {
  const [dataset, setDataset] = useState(null);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState("Analyze");
  const [history, setHistory] = useState([]);
  const [overviewOpen, setOverviewOpen] = useState(true);

  const profile = dataset?.profile;
  const resultRows = result?.preview || [];
  const resultColumns = result?.result_columns || [];

  const chartData =
    result?.chart?.type === "bar" &&
    result?.chart?.x &&
    result?.chart?.y
      ? resultRows
          .map((row) => ({
            label: String(row[result.chart.x] ?? ""),
            value: Number(row[result.chart.y]),
          }))
          .filter((item) => Number.isFinite(item.value))
      : [];

  async function uploadFile(file) {
    if (!file) return;

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch(`${API}/upload`, {
        method: "POST",
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to upload your file.")
        );
      }

      data.preview = JSON.parse(data.preview);

      setDataset(data);
      setPage("Analyze");
      setQuestion("");
      setOverviewOpen(true);
    } catch (err) {
      setError(err.message || "Unable to upload your file.");
    } finally {
      setBusy(false);
    }
  }

  async function analyze(prompt = question) {
    if (!dataset || !prompt.trim() || busy) return;

    setBusy(true);
    setError("");
    setQuestion(prompt);

    try {
      const response = await fetch(
        `${API}/analyze/${dataset.dataset_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: prompt }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Analysis failed.")
        );
      }

      setResult(data);

      setHistory((previous) => [
        {
          question: prompt,
          rows: data.rows_returned,
          operation: data.plan?.operation || "analysis",
        },
        ...previous,
      ]);

      setPage("Analyze");
    } catch (err) {
      setError(err.message || "Unable to analyze the dataset.");
    } finally {
      setBusy(false);
    }
  }

  function renderTable(columns, rows) {
    if (!columns?.length) {
      return (
        <p className="empty-table">
          No columns available to display.
        </p>
      );
    }

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((value, cellIndex) => (
                  <td key={cellIndex}>
                    {value == null ? "—" : String(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="empty-table">
            No matching rows found.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <a
          href="#home"
          className="brand"
          onClick={() => setPage("Analyze")}
        >
          <span className="brand-icon">
            <Activity size={21} />
          </span>

          <span>
            insight<span className="brand-accent">.</span>
          </span>
        </a>

        <div className="nav-label">WORKSPACE</div>

        <button
          className={`nav-item ${
            page === "Analyze" ? "active" : ""
          }`}
          onClick={() => setPage("Analyze")}
        >
          <Sparkles size={17} />
          Analyze
        </button>

        <button
          className={`nav-item ${
            page === "Datasets" ? "active" : ""
          }`}
          onClick={() => setPage("Datasets")}
        >
          <Database size={17} />
          Datasets
        </button>

        <button
          className={`nav-item ${
            page === "History" ? "active" : ""
          }`}
          onClick={() => setPage("History")}
        >
          <Clock3 size={17} />
          History
        </button>

        <button
          className={`nav-item ${
            page === "Examples" ? "active" : ""
          }`}
          onClick={() => setPage("Examples")}
        >
          <BookOpen size={17} />
          Examples
        </button>

        <div className="sidebar-divider" />

        <div className="nav-label">CURRENT DATASET</div>

        {dataset ? (
          <div className="file-row">
            <FileSpreadsheet size={18} />

            <div>
              <strong>{dataset.filename}</strong>
              <span>{formatNumber(dataset.rows)} rows</span>
            </div>

            <CheckCircle2
              size={15}
              className="success-icon"
            />
          </div>
        ) : (
          <p className="section-description">
            Your workspace is ready for a dataset.
          </p>
        )}

        <label className="secondary-button upload-button">
          <Plus size={15} />
          {dataset ? "Replace dataset" : "Add dataset"}

          <input
            type="file"
            accept=".csv,.xlsx,.json"
            disabled={busy}
            onChange={(event) => {
              uploadFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>

        <div className="sidebar-bottom">
          <div className="local-status">
            <span className="status-dot" />

            <div>
              <strong>Local AI</strong>
              <small>Powered by Ollama</small>
            </div>
          </div>

          <p>
            Your data, your questions, your workspace.
          </p>
        </div>
      </aside>

      {/* Main workspace */}
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace
            <span>/</span>
            <strong>{page}</strong>
          </div>

          <div className="topbar-right">
            {dataset && (
              <span className="dataset-status">
                <span className="status-dot" />
                Dataset connected
              </span>
            )}

            <div
              className="avatar"
              title="Personal workspace"
            >
              A
            </div>
          </div>
        </header>

        <div className="content">
          {error && (
            <div className="error" role="alert">
              <span>{error}</span>

              <button onClick={() => setError("")}>
                Dismiss
              </button>
            </div>
          )}

          {/* Analyze page */}
          {page === "Analyze" && (
            <>
              <section className="heading">
                <div className="eyebrow">
                  PERSONAL DATA ANALYST
                </div>

                <h1>Make sense of your data.</h1>

                <p>
                  Bring your data. Ask your questions.
                  Discover what matters.
                </p>
              </section>

              {/* Natural language query */}
              <section className="query-panel">
                <div className="query-label">
                  <Sparkles size={17} />
                  <span>
                    What would you like to understand?
                  </span>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    analyze();
                  }}
                >
                  <textarea
                    value={question}
                    onChange={(event) =>
                      setQuestion(event.target.value)
                    }
                    placeholder={
                      dataset
                        ? "Ask something about your data..."
                        : "Upload a dataset first, then ask away."
                    }
                    disabled={!dataset || busy}
                    rows={3}
                    maxLength={1000}
                  />

                  <div className="query-footer">
                    <span>
                      {busy
                        ? "Working through your question..."
                        : "Plain English · Powered by your local model"}
                    </span>

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={
                        !dataset ||
                        busy ||
                        !question.trim()
                      }
                    >
                      {busy ? (
                        <LoaderCircle
                          size={16}
                          className="spin"
                        />
                      ) : (
                        <Send size={15} />
                      )}

                      {busy ? "Thinking" : "Explore"}
                    </button>
                  </div>
                </form>

                <div className="suggestions">
                  {PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => analyze(prompt)}
                      disabled={!dataset || busy}
                    >
                      {prompt}
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </div>
              </section>

              {/* Upload prompt */}
              {!dataset ? (
                <section className="upload-panel">
                  <div className="upload-icon">
                    <Upload size={22} />
                  </div>

                  <h2>Start with a dataset</h2>

                  <p>
                    CSV, Excel, or JSON. We'll take care
                    of understanding the structure.
                  </p>

                  <label className="primary-button upload-button">
                    <Plus size={16} />
                    Choose a file

                    <input
                      type="file"
                      accept=".csv,.xlsx,.json"
                      disabled={busy}
                      onChange={(event) => {
                        uploadFile(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </section>
              ) : (
                /* Collapsible dataset overview */
                <section className="section collapsible-section">
                  <button
                    type="button"
                    className="section-toggle"
                    onClick={() =>
                      setOverviewOpen((open) => !open)
                    }
                    aria-expanded={overviewOpen}
                    aria-controls="dataset-overview-content"
                  >
                    <div className="section-header-content">
                      <div>
                        <h2>A little about your data</h2>

                        <p>
                          Here's what we found in your dataset.
                        </p>
                      </div>

                      <span className="dataset-status">
                        <CheckCircle2 size={15} />
                        Ready to explore
                      </span>
                    </div>

                    <ChevronDown
                      size={18}
                      className={`collapse-chevron ${
                        overviewOpen ? "expanded" : ""
                      }`}
                    />
                  </button>

                  {overviewOpen && (
                    <div
                      id="dataset-overview-content"
                      className="collapsible-content"
                    >
                      <div className="stats">
                        <Stat
                          label="Rows"
                          value={dataset.rows}
                        />

                        <Stat
                          label="Columns"
                          value={dataset.columns}
                        />

                        <Stat
                          label="Numeric fields"
                          value={
                            profile?.numeric_columns?.length || 0
                          }
                        />

                        <Stat
                          label="Categorical fields"
                          value={
                            profile?.categorical_columns?.length || 0
                          }
                        />
                      </div>

                      <div className="file-row">
                        <FileSpreadsheet size={19} />

                        <div>
                          <strong>{dataset.filename}</strong>
                          <span>
                            {formatNumber(dataset.rows)} rows ·{" "}
                            {dataset.columns} columns
                          </span>
                        </div>

                        <CheckCircle2
                          size={16}
                          className="success-icon"
                        />
                      </div>

                      {renderTable(
                        [
                          "Column",
                          "Type",
                          "Missing",
                          "Unique",
                          "Sample values",
                        ],
                        (profile?.columns || []).map((column) => [
                          column.name,
                          column.dtype,
                          formatNumber(column.missing),
                          formatNumber(column.unique),
                          (column.sample_values || []).join(", "),
                        ])
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Analysis results */}
              {result && (
                <section className="section result-section">
                  <div className="section-header">
                    <div>
                      <div className="eyebrow">
                        YOUR RESULTS
                      </div>

                      <h2>
                        {result.plan?.explanation ||
                          "Here's what we found."}
                      </h2>

                      <p>{result.question}</p>
                    </div>

                    <a
                      className="secondary-button"
                      href={`${API}/export/${result.result_id}`}
                      download="analysis.csv"
                    >
                      <Download size={15} />
                      Export CSV
                    </a>
                  </div>

                  <div className="result-meta">
                    <span>
                      {formatNumber(result.rows_returned)} rows
                    </span>

                    {result.plan?.operation && (
                      <span>{result.plan.operation}</span>
                    )}

                    {result.truncated && (
                      <span>Showing first 200 rows</span>
                    )}
                  </div>

                  {chartData.length > 0 && (
                    <div className="chart">
                      <ResponsiveContainer
                        width="100%"
                        height={260}
                      >
                        <BarChart data={chartData}>
                          <CartesianGrid
                            stroke="#2b2c26"
                            vertical={false}
                          />

                          <XAxis
                            dataKey="label"
                            tick={{
                              fill: "#92938a",
                              fontSize: 11,
                            }}
                            axisLine={{
                              stroke: "#3a3b34",
                            }}
                            tickLine={false}
                          />

                          <YAxis
                            tick={{
                              fill: "#92938a",
                              fontSize: 11,
                            }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip
                            contentStyle={{
                              background: "#20211c",
                              border: "1px solid #3a3b34",
                              borderRadius: 8,
                              color: "#e9e7e1",
                              fontSize: 12,
                            }}
                            cursor={{
                              fill: "#292a23",
                            }}
                          />

                          <Bar
                            dataKey="value"
                            fill="#c2d2ae"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <details open className="result-details">
                    <summary>
                      <Table2 size={15} />
                      Results table
                    </summary>

                    {renderTable(
                      resultColumns,
                      resultRows.map((row) =>
                        resultColumns.map(
                          (column) => row[column] ?? "—"
                        )
                      )
                    )}
                  </details>

                  <details className="result-details">
                    <summary>
                      <Database size={15} />
                      Analysis plan
                    </summary>

                    <p className="section-description">
                      The structured plan selected by the
                      language model. This is not executable
                      Python code.
                    </p>

                    <pre>
                      {JSON.stringify(result.plan, null, 2)}
                    </pre>
                  </details>
                </section>
              )}
            </>
          )}

          {/* Datasets page */}
          {page === "Datasets" && (
            <section className="section">
              <div className="eyebrow">YOUR WORKSPACE</div>
              <h2>Your datasets</h2>

              <p className="section-description">
                Files loaded during this session.
              </p>

              {dataset ? (
                <div className="file-row">
                  <FileSpreadsheet size={20} />

                  <div>
                    <strong>{dataset.filename}</strong>
                    <span>
                      {formatNumber(dataset.rows)} rows ·{" "}
                      {dataset.columns} columns
                    </span>
                  </div>

                  <CheckCircle2
                    size={16}
                    className="success-icon"
                  />
                </div>
              ) : (
                <p className="section-description">
                  No dataset yet. Add a file to get started.
                </p>
              )}

              <label className="primary-button upload-button">
                <Plus size={15} />
                Add dataset

                <input
                  type="file"
                  accept=".csv,.xlsx,.json"
                  disabled={busy}
                  onChange={(event) => {
                    uploadFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </section>
          )}

          {/* History page */}
          {page === "History" && (
            <section className="section">
              <div className="eyebrow">YOUR WORKSPACE</div>
              <h2>Recent explorations</h2>

              <p className="section-description">
                Questions you've explored in this session.
              </p>

              {history.length > 0 ? (
                history.map((item, index) => (
                  <button
                    key={`${item.question}-${index}`}
                    className="history-item"
                    onClick={() => {
                      setQuestion(item.question);
                      setPage("Analyze");
                    }}
                  >
                    <Sparkles size={17} />

                    <span>
                      <strong>{item.question}</strong>
                      <small>
                        {formatNumber(item.rows)} rows ·{" "}
                        {item.operation}
                      </small>
                    </span>

                    <ArrowUpRight size={15} />
                  </button>
                ))
              ) : (
                <p className="section-description">
                  Your first exploration is waiting to happen.
                </p>
              )}
            </section>
          )}

          {/* Examples page */}
          {page === "Examples" && (
            <section className="section">
              <div className="eyebrow">GETTING STARTED</div>
              <h2>Questions worth asking</h2>

              <p className="section-description">
                Start simple, then follow the patterns you find.
              </p>

              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="history-item"
                  disabled={!dataset || busy}
                  onClick={() => {
                    setPage("Analyze");
                    analyze(prompt);
                  }}
                >
                  <Zap size={17} />

                  <span>
                    <strong>{prompt}</strong>
                    <small>
                      {dataset
                        ? "Explore this question"
                        : "Upload a dataset to try this"}
                    </small>
                  </span>

                  <ArrowUpRight size={15} />
                </button>
              ))}
            </section>
          )}

          <footer>
            INSIGHT · A LITTLE MORE CLARITY, EVERY DAY
          </footer>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}
