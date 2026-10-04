import { BarList, SegmentMap, SignatureHeatmap } from "../components/Charts.jsx";
import { Glyph, segColor } from "../components/Glyph.jsx";
import { ActionList, Card, RiskBadge, StatTile } from "../components/Ui.jsx";
import { num, pct } from "../lib/format.js";

export default function SegmentsView({ model }) {
  const { segments, cohort } = model;
  const riskiest = segments.reduce((a, b) => (b.fail_rate > a.fail_rate ? b : a));

  const failRows = segments.map((s, i) => ({
    key: s.id, label: s.id, title: `${s.id} · ${s.name}`, value: s.fail_rate, color: segColor(i), glyph: i,
  }));
  const shareRows = segments.map((s, i) => ({
    key: s.id, label: s.id, title: `${s.id} · ${s.name}`, value: s.share_of_failures, color: segColor(i), glyph: i,
  }));

  return (
    <div className="stack">
      <div className="stat-row">
        <StatTile label="Students in the training cohort" value={cohort.n_students} note={`${cohort.course} course`} />
        <StatTile label="Segments" value={segments.length} note="K-Means on six standardised features" />
        <StatTile label="Cohort pass rate" value={pct(cohort.pass_rate)} note={`final grade of ${cohort.pass_mark} or more out of 20`} />
        <StatTile label="Highest-risk segment" value={riskiest.id}
          note={`${pct(riskiest.fail_rate)} finished below the pass mark`} />
      </div>

      <div className="segment-cards">
        {segments.map((s, i) => (
          <section className="card segment-card" key={s.id} style={{ "--seg": segColor(i) }}>
            <header>
              <span className="hero-id"><Glyph index={i} size={14} /> {s.id}</span>
              <RiskBadge segment={s} />
            </header>
            <h3>{s.name}</h3>
            <p className="card-sub">{s.n} students · {pct(s.share)} of the cohort</p>
            <p className="segment-sig">{s.signature}</p>
            <dl className="mini-stats">
              <div><dt>Average grade so far</dt><dd>{num(s.means?.grade_avg, 1)}<span> / 20</span></dd></div>
              <div><dt>Absences</dt><dd>{num(s.means?.absences, 1)}</dd></div>
              <div><dt>Study-time level</dt><dd>{num(s.means?.studytime, 2)}<span> of 4</span></dd></div>
              <div><dt>Passed the final</dt><dd>{pct(s.pass_rate)}</dd></div>
            </dl>
            <h4 className="group-title">Suggested support</h4>
            <ActionList actions={s.recommended_actions} />
          </section>
        ))}
      </div>

      <Card title="Segment signatures" subtitle="How far each segment's centre sits from the average student on every model feature">
        <SignatureHeatmap model={model} />
      </Card>

      <div className="two-col">
        <Card title="Failure rate by segment" subtitle="Share of each segment that finished below the pass mark (final grade was not used to form the segments)">
          <BarList rows={failRows} format={(v) => pct(v)} labelWidth="72px"
            reference={{ value: cohort.fail_rate, label: "Cohort average" }} />
        </Card>
        <Card title="Where the failing students are" subtitle="Share of all students below the pass mark who belong to each segment">
          <BarList rows={shareRows} format={(v) => pct(v)} labelWidth="72px" max={1} />
        </Card>
      </div>

      <Card title="Segment map" subtitle="Engagement against performance for every student in the cohort; boxes mark segment centres">
        <SegmentMap model={model} height={440} />
      </Card>
    </div>
  );
}
