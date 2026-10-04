import { useMemo } from "react";
import { BarList, LineChart } from "../components/Charts.jsx";
import { ModelFileButton } from "../components/Controls.jsx";
import { Card, StatTile } from "../components/Ui.jsx";
import { num, pct } from "../lib/format.js";
import { selfCheck } from "../lib/model.js";

const stabilityReading = (ari) => (ari >= 0.8 ? "stable" : ari >= 0.5 ? "moderately stable" : "unstable");

export default function ModelView({ model, source, onLoad }) {
  const q = model.quality || {};
  const sweep = model.k_selection || [];
  const check = useMemo(() => selfCheck(model), [model]);
  const ks = sweep.map((r) => r.k);

  const robustRows = (model.robustness || []).map((r) => ({
    key: `${r.family}-${r.variant}`, label: `${r.family} · ${r.variant}`, value: r.ari,
  }));
  const driverRows = [...model.features]
    .sort((a, b) => (b.eta_squared ?? 0) - (a.eta_squared ?? 0))
    .map((f) => ({ key: f.key, label: f.label, value: f.eta_squared ?? 0 }));

  return (
    <div className="stack">
      <div className="stat-row">
        <StatTile label={`Silhouette at k = ${q.k ?? model.segments.length}`} value={num(q.silhouette, 2)}
          note={`shuffled-feature reference ${num(q.null_silhouette, 2)}`} />
        <StatTile label="Bootstrap stability (ARI)" value={num(q.bootstrap_stability, 2)}
          note={`${stabilityReading(q.bootstrap_stability)} under resampling`} />
        <StatTile label="K-Means vs hierarchical (ARI)" value={num(q.ari_kmeans_vs_ward, 2)}
          note={`${pct(q.reassigned_kmeans_vs_ward)} of students placed differently`} />
        <StatTile label="Dashboard self-check" value={`${check.passed} / ${check.total}`}
          note={check.total === 0 ? "no test cases in the model file"
            : check.passed === check.total ? "notebook assignments reproduced exactly"
            : "mismatch - re-export the model from the notebook"} />
      </div>

      {q.silhouette_reading && (
        <p className="callout">
          <strong>Reading of the silhouette:</strong> {q.silhouette_reading}.
        </p>
      )}

      {sweep.length > 0 && (
        <div className="two-col">
          <Card title="Choosing the number of segments" subtitle="Average silhouette for each k; higher means tighter, better-separated segments">
            <LineChart
              x={ks} xLabel="Number of segments k" markX={q.k} markLabel="chosen"
              series={[
                { name: "K-Means", values: sweep.map((r) => r.silhouette_kmeans), color: "var(--series-1)" },
                { name: "Hierarchical (Ward)", values: sweep.map((r) => r.silhouette_ward), color: "var(--series-2)" },
                { name: "Shuffled-feature reference", values: sweep.map((r) => r.null_silhouette), color: "var(--muted)", quiet: true },
              ]}
            />
          </Card>
          <Card title="Stability under resampling" subtitle="Mean adjusted Rand index over 30 bootstrap refits; 1 = identical segments every time">
            <LineChart
              x={ks} xLabel="Number of segments k" markX={q.k} markLabel="chosen" digits={2}
              series={[{ name: "Bootstrap stability (K-Means)", values: sweep.map((r) => r.stability), color: "var(--series-1)" }]}
            />
          </Card>
        </div>
      )}

      <div className="two-col">
        {robustRows.length > 0 && (
          <Card title="Does the segmentation survive different modelling choices?"
            subtitle="Adjusted Rand index against the final model when one choice is changed; 1 = same groups">
            <BarList rows={robustRows} max={1} format={(v) => num(v, 2)} labelWidth="52%"
              reference={{ value: 0.8, label: "Stable at or above" }} />
          </Card>
        )}
        <div className="stack">
          <Card title="What separates the segments" subtitle="Share of each feature's variance explained by segment membership (η²)">
            <BarList rows={driverRows} max={1} format={(v) => num(v, 2)} labelWidth="46%" />
          </Card>
          <Card title="How a prediction is made">
            <ol className="steps">
              <li><strong>Build six features</strong> from the form: the average of G1 and G2, past failures, study time, log(1 + absences), the mean of the two alcohol items, and going out.</li>
              <li><strong>Standardise</strong> each feature with the training cohort's mean and standard deviation (table below).</li>
              <li><strong>Assign the nearest centre</strong> by Euclidean distance — the same rule K-Means applies to a new observation.</li>
            </ol>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Feature</th><th>Cohort mean</th><th>Standard deviation</th></tr></thead>
                <tbody>
                  {model.features.map((f) => (
                    <tr key={f.key}><th>{f.label}{f.key === "absences_log" ? " (log scale)" : ""}</th><td>{num(f.mean, 3)}</td><td>{num(f.scale, 3)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Model file" actions={<ModelFileButton onLoad={onLoad} className="button button-quiet">Load another model file</ModelFileButton>}>
        <dl className="meta">
          <div><dt>Source</dt><dd>{source}</dd></div>
          <div><dt>Trained on</dt><dd>{model.cohort.course} course · {model.cohort.n_students} students</dd></div>
          <div><dt>Algorithm</dt><dd>{model.meta?.algorithm ?? "K-Means"}</dd></div>
          <div><dt>Exported</dt><dd>{model.meta?.created_utc ? new Date(model.meta.created_utc).toLocaleString() : "–"}</dd></div>
          <div><dt>scikit-learn</dt><dd>{model.meta?.scikit_learn ?? "–"}</dd></div>
          {q.replication_course && (
            <div><dt>Replication</dt><dd>matched profiles correlate at {num(q.replication_profile_correlation, 2)} in the {q.replication_course} course</dd></div>
          )}
        </dl>
      </Card>
    </div>
  );
}
