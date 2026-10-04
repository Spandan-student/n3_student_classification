import { useMemo } from "react";
import { BarList, FeatureCompare, SegmentMap } from "../components/Charts.jsx";
import { ChoiceField, RangeField } from "../components/Controls.jsx";
import { Glyph, segColor } from "../components/Glyph.jsx";
import { ActionList, Card, RiskBadge, StatTile } from "../components/Ui.jsx";
import { num, pct, times } from "../lib/format.js";
import { defaultInputs, predict } from "../lib/model.js";

const scale = (from, to, labels = {}) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: from + i, label: labels[from + i] ?? String(from + i) }));

const STUDY_OPTIONS = [
  { value: 1, label: "< 2 h" },
  { value: 2, label: "2–5 h" },
  { value: 3, label: "5–10 h" },
  { value: 4, label: "> 10 h" },
];

export default function PredictView({ model, inputs, setInputs }) {
  const prediction = useMemo(() => predict(model, inputs), [model, inputs]);
  const seg = model.segments[prediction.segment];
  const second = model.segments[prediction.runnerUp];
  const set = (key) => (value) => setInputs((prev) => ({ ...prev, [key]: value }));
  const sameAs = (preset) => Object.keys(preset).every((k) => preset[k] === inputs[k]);
  const average = useMemo(() => defaultInputs(model), [model]);

  const distanceRows = model.segments.map((s, i) => ({
    key: s.id,
    label: s.id,
    title: `${s.id} · ${s.name}`,
    value: prediction.distances[i],
    color: segColor(i),
    glyph: i,
    tag: i === prediction.segment ? "nearest" : undefined,
  }));

  return (
    <div className="predict-grid">
      <aside className="card inputs">
        <header className="card-head">
          <div>
            <h3>Student profile</h3>
            <p className="card-sub">What is known about the student after the second grading period.</p>
          </div>
        </header>

        <div className="presets" role="group" aria-label="Example profiles">
          <button type="button" className={`chip${sameAs(average) ? " is-on" : ""}`} onClick={() => setInputs(average)}>
            Average student
          </button>
          {model.segments.map((s, i) =>
            s.typical_inputs ? (
              <button type="button" key={s.id} className={`chip${sameAs(s.typical_inputs) ? " is-on" : ""}`}
                onClick={() => setInputs({ ...s.typical_inputs })} title={`A real student close to the centre of ${s.id}`}>
                <Glyph index={i} /> Typical {s.id}
              </button>
            ) : null
          )}
        </div>

        <h4 className="group-title">Performance</h4>
        <RangeField label="First-period grade (G1)" value={inputs.G1} min={0} max={20} unit="/ 20" onChange={set("G1")} />
        <RangeField label="Second-period grade (G2)" value={inputs.G2} min={0} max={20} unit="/ 20" onChange={set("G2")} />
        <ChoiceField label="Past class failures" value={inputs.failures} options={scale(0, 3, { 3: "3+" })} onChange={set("failures")} />

        <h4 className="group-title">Engagement</h4>
        <ChoiceField label="Weekly study time" value={inputs.studytime} options={STUDY_OPTIONS} onChange={set("studytime")} />
        <RangeField label="School absences" value={inputs.absences} min={0} max={60} onChange={set("absences")} />
        <ChoiceField label="Going out with friends" hint="1 = very low · 5 = very high" value={inputs.goout}
          options={scale(1, 5)} onChange={set("goout")} />

        <h4 className="group-title">Lifestyle</h4>
        <ChoiceField label="Workday alcohol use" value={inputs.Dalc} options={scale(1, 5)} onChange={set("Dalc")} />
        <ChoiceField label="Weekend alcohol use" hint="1 = very low · 5 = very high" value={inputs.Walc}
          options={scale(1, 5)} onChange={set("Walc")} />
      </aside>

      <div className="results">
        <section className="card hero" style={{ "--seg": segColor(prediction.segment) }} aria-live="polite">
          <div className="hero-main">
            <p className="overline">Predicted segment</p>
            <h2>
              <span className="hero-id"><Glyph index={prediction.segment} size={16} /> {seg.id}</span>
              {seg.name}
            </h2>
            <p className="hero-sig">Members of this segment stand out for: {seg.signature}.</p>
            <div className="hero-badges">
              <RiskBadge segment={seg} />
              {prediction.borderline && (
                <span className="badge badge-neutral">Borderline · almost as close to {second.id}</span>
              )}
            </div>
          </div>
          <div className="hero-figure">
            <div className="hero-number">{pct(seg.pass_rate)}</div>
            <div className="hero-caption">
              of {seg.id} students passed the final grade
              <span>cohort average {pct(model.cohort.pass_rate)}</span>
            </div>
          </div>
        </section>

        <div className="stat-row">
          <StatTile label="Mean final grade in segment" value={`${num(seg.mean_final_grade, 1)} / 20`}
            note={`cohort ${num(model.cohort.mean_final_grade, 1)}`} />
          <StatTile label="Failure risk vs cohort" value={times(seg.risk_vs_average)}
            note={`${pct(seg.fail_rate)} of the segment finished below the pass mark`} />
          <StatTile label="Segment size" value={seg.n} note={`${pct(seg.share)} of the cohort`} />
          <StatTile label="Distance to segment centre" value={`${num(prediction.distances[prediction.segment], 2)} SD`}
            note={`next closest: ${second.id} at ${num(prediction.distances[prediction.runnerUp], 2)} SD`} />
        </div>

        <div className="two-col">
          <Card title="Suggested support" subtitle={`Based on how ${seg.id} differs from the average student`}>
            <ActionList actions={seg.recommended_actions} />
          </Card>
          <Card title="Distance to each segment centre" subtitle="Shorter = closer. The student joins the nearest segment.">
            <BarList rows={distanceRows} format={(v) => `${num(v, 2)} SD`} labelWidth="96px" />
          </Card>
        </div>

        <Card title="How this student compares" subtitle="Each row is one model feature, measured in standard deviations from the cohort average">
          <FeatureCompare model={model} prediction={prediction} inputs={inputs} />
        </Card>

        <Card title="Where this student sits" subtitle={`Every dot is one of the ${model.cohort.n_students} students the model was trained on`}>
          <SegmentMap model={model} student={prediction} />
        </Card>

        <p className="footnote">
          The segment is the nearest of {model.segments.length} K-Means centres. Pass rates and grades describe what happened to
          students with a similar profile in the training cohort; they are not a forecast for an individual.
        </p>
      </div>
    </div>
  );
}
