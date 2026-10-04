import { useCallback, useEffect, useState } from "react";
import { useHashTab, useTheme } from "./hooks.js";
import { defaultInputs, validateModel } from "./lib/model.js";
import ModelView from "./views/ModelView.jsx";
import PredictView from "./views/PredictView.jsx";
import SegmentsView from "./views/SegmentsView.jsx";
import SetupView from "./views/SetupView.jsx";

const TABS = ["predict", "segments", "model"];
const TAB_LABEL = { predict: "Predict", segments: "Segments", model: "Model" };
const STORAGE_KEY = "n3-model";

/** public/model.json, if it has been placed there. (A dev server answers a missing file with index.html.) */
async function fetchBundledModel() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}model.json`, { cache: "no-store" });
    if (!response.ok) return null;
    return JSON.parse(await response.text());
  } catch {
    return null;
  }
}

function readStoredModel() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [tab, setTab] = useHashTab(TABS, "predict");
  const [state, setState] = useState({ status: "loading", model: null, source: "", problems: [], fileName: "" });
  const [inputs, setInputs] = useState(null);

  const accept = useCallback((candidate, source, fileName = "") => {
    const problems = candidate ? validateModel(candidate) : ["The file is not valid JSON."];
    if (problems.length) {
      setState((prev) => (prev.model ? { ...prev, problems, fileName } : { status: "empty", model: null, source: "", problems, fileName }));
      return false;
    }
    setInputs(defaultInputs(candidate));
    setState({ status: "ready", model: candidate, source, problems: [], fileName: "" });
    return true;
  }, []);

  // public/model.json wins; otherwise fall back to a model loaded earlier in this browser
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bundled = await fetchBundledModel();
      if (cancelled) return;
      if (bundled && accept(bundled, "public/model.json")) return;
      const stored = readStoredModel();
      if (stored && accept(stored, "loaded in this browser")) return;
      setState((prev) => (prev.model ? prev : { ...prev, status: "empty" }));
    })();
    return () => {
      cancelled = true;
    };
  }, [accept]);

  const loadFromFile = useCallback(
    (candidate, fileName) => {
      if (accept(candidate, `${fileName} (loaded in this browser)`, fileName)) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(candidate));
        } catch {
          /* storage full or unavailable - the model is used for this visit only */
        }
      }
    },
    [accept]
  );

  const { status, model, source, problems, fileName } = state;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--brand-tile)" />
            <circle cx="11" cy="12" r="4.5" fill="var(--series-1)" />
            <rect x="17.5" y="8" width="8" height="8" rx="1.5" fill="var(--series-2)" />
            <path d="M16 18.5 21.5 26h-11z" fill="var(--series-3)" />
          </svg>
          <div>
            <h1>Student Segmentation</h1>
            <p>
              {model
                ? `${model.cohort.course} course · ${model.cohort.n_students} students · ${model.segments.length} segments`
                : "Personalised learning · K-Means segmentation"}
            </p>
          </div>
        </div>

        {model && (
          <nav className="tabs" role="tablist" aria-label="Dashboard views">
            {TABS.map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "is-on" : undefined}
                onClick={() => setTab(t)}>
                {TAB_LABEL[t]}
              </button>
            ))}
          </nav>
        )}

        <button type="button" className="icon-button" onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title="Switch theme">
          {theme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4.2" />
              <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
            </svg>
          )}
        </button>
      </header>

      <main>
        {status === "loading" && <p className="muted loading">Loading model…</p>}
        {status === "empty" && <SetupView problems={problems} fileName={fileName} onLoad={loadFromFile} />}
        {status === "ready" && problems.length > 0 && (
          <div className="error" role="alert">
            <strong>"{fileName}" could not be used; the current model is still loaded.</strong>
            <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
        {status === "ready" && tab === "predict" && <PredictView model={model} inputs={inputs} setInputs={setInputs} />}
        {status === "ready" && tab === "segments" && <SegmentsView model={model} />}
        {status === "ready" && tab === "model" && <ModelView model={model} source={source} onLoad={loadFromFile} />}
      </main>

      <footer className="page-foot">
        Segments describe groups, not individuals. Use them to start a conversation and offer support — never to restrict a student.
      </footer>
    </div>
  );
}
