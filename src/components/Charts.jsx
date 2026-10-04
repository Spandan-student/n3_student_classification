import { useMemo, useState } from "react";
import { useSize } from "../hooks.js";
import { niceTicks, num, signed } from "../lib/format.js";
import { RAW_VIEW } from "../lib/model.js";
import { Glyph, SegmentLegend, segColor, shapePath, shapeRotate } from "./Glyph.jsx";

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function Tooltip({ x, y, width, children }) {
  const flip = x > width - 210;
  return (
    <div
      className="tooltip"
      style={{ left: x, top: y, transform: `translate(${flip ? "calc(-100% - 14px)" : "14px"}, -50%)` }}
      role="status"
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ Segment map */

/**
 * Every student of the training cohort placed by engagement (x) and performance (y),
 * coloured and shaped by segment. Optionally marks the student currently being scored.
 */
export function SegmentMap({ model, student, height = 400 }) {
  const [ref, { width }] = useSize();
  const [hover, setHover] = useState(null);
  const pts = model.students || [];
  const m = { top: 14, right: 18, bottom: 46, left: 54 };

  const dom = useMemo(() => {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of pts) {
      x0 = Math.min(x0, p[0]);
      x1 = Math.max(x1, p[0]);
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    const px = (x1 - x0) * 0.05 || 1;
    const py = (y1 - y0) * 0.06 || 1;
    return { x0: x0 - px, x1: x1 + px, y0: y0 - py, y1: y1 + py };
  }, [pts]);

  const iw = Math.max(width - m.left - m.right, 10);
  const ih = height - m.top - m.bottom;
  const sx = (v) => m.left + ((v - dom.x0) / (dom.x1 - dom.x0)) * iw;
  const sy = (v) => m.top + (1 - (v - dom.y0) / (dom.y1 - dom.y0)) * ih;

  const points = useMemo(
    () =>
      pts.map((p, i) => (
        <path
          key={i}
          d={shapePath(p[2], 3.6)}
          transform={`translate(${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)})${shapeRotate(p[2])}`}
          fill={segColor(p[2])}
          stroke="var(--surface)"
          strokeWidth="1"
          opacity="0.82"
        />
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pts, width, height, dom]
  );

  if (!pts.length) return <p className="muted">The model file contains no cohort points to plot.</p>;

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    let best = null;
    let bestDist = 24 * 24; // the pointer only has to be closest, within 24px
    for (let i = 0; i < pts.length; i += 1) {
      const dx = sx(pts[i][0]) - mx;
      const dy = sy(pts[i][1]) - my;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setHover(best);
  };

  const xTicks = niceTicks(dom.x0, dom.x1, 6);
  const yTicks = niceTicks(dom.y0, dom.y1, 5);
  const hp = hover != null ? pts[hover] : null;
  const st = student
    ? { x: sx(clamp(student.engagement, dom.x0, dom.x1)), y: sy(clamp(student.performance, dom.y0, dom.y1)) }
    : null;

  // Put the "This student" label on whichever side is furthest from the segment-centre boxes
  let label = null;
  if (st) {
    const options = [
      { dx: 18, dy: 4, anchor: "start", cx: 62, cy: 0 },
      { dx: -18, dy: 4, anchor: "end", cx: -62, cy: 0 },
      { dx: 0, dy: -19, anchor: "middle", cx: 0, cy: -24 },
      { dx: 0, dy: 29, anchor: "middle", cx: 0, cy: 26 },
    ];
    let bestScore = -Infinity;
    for (const o of options) {
      const lx = st.x + o.cx;
      const ly = st.y + o.cy;
      const inside = lx > m.left + 44 && lx < width - m.right - 44 && ly > m.top + 8 && ly < m.top + ih - 8;
      const nearest = Math.min(
        ...model.segments.map((s) => Math.hypot(sx(s.engagement_index) - lx, sy(s.performance_index) - ly))
      );
      const score = inside ? nearest : nearest - 1000;
      if (score > bestScore) {
        bestScore = score;
        label = o;
      }
    }
  }

  return (
    <figure className="chart">
      <div className="chart-plot" ref={ref} style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img"
            aria-label="Scatter plot of students by engagement index and performance index, coloured by segment">
            {xTicks.map((t) => (
              <g key={`x${t}`}>
                <line x1={sx(t)} x2={sx(t)} y1={m.top} y2={m.top + ih} className={t === 0 ? "axis-line" : "grid-line"} />
                <text x={sx(t)} y={m.top + ih + 16} className="tick" textAnchor="middle">{t}</text>
              </g>
            ))}
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line x1={m.left} x2={m.left + iw} y1={sy(t)} y2={sy(t)} className={t === 0 ? "axis-line" : "grid-line"} />
                <text x={m.left - 8} y={sy(t) + 4} className="tick" textAnchor="end">{t}</text>
              </g>
            ))}
            <text x={m.left + iw / 2} y={height - 6} className="axis-title" textAnchor="middle">
              Engagement index → more study, fewer absences, less alcohol and going out
            </text>
            <text transform={`translate(14 ${m.top + ih / 2}) rotate(-90)`} className="axis-title" textAnchor="middle">
              Performance index →
            </text>

            {points}

            {model.segments.map((s, i) => (
              <g key={s.id} transform={`translate(${sx(s.engagement_index)},${sy(s.performance_index)})`}>
                <rect x="-15" y="-11" width="30" height="22" rx="6" className="centre-pill" />
                <text y="4" textAnchor="middle" className="centre-text">{s.id}</text>
                <path d={shapePath(i, 2.6)} transform={`translate(0 -15)${shapeRotate(i)}`} fill={segColor(i)} />
              </g>
            ))}

            {hp && (
              <circle cx={sx(hp[0])} cy={sy(hp[1])} r="7" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
            )}

            {st && (
              <g transform={`translate(${st.x},${st.y})`}>
                <circle r="12" fill="var(--surface)" opacity="0.75" />
                <circle r="11" fill="none" stroke="var(--ink)" strokeWidth="2" />
                <circle r="4.5" fill="var(--ink)" stroke="var(--surface)" strokeWidth="2" />
                <text x={label.dx} y={label.dy} textAnchor={label.anchor} className="student-label">
                  This student
                </text>
              </g>
            )}
          </svg>
        )}
        {hp && (
          <Tooltip x={sx(hp[0])} y={sy(hp[1])} width={width}>
            <div className="tooltip-title">
              <Glyph index={hp[2]} /> {model.segments[hp[2]]?.id} · {hp[3] ? "passed the final" : "did not pass"}
            </div>
            <div className="tooltip-row"><strong>{signed(hp[0])}</strong><span>engagement index</span></div>
            <div className="tooltip-row"><strong>{signed(hp[1])}</strong><span>performance index</span></div>
          </Tooltip>
        )}
      </div>
      <SegmentLegend
        segments={model.segments}
        extra={student && (
          <li>
            <svg className="glyph" width="14" height="14" viewBox="-8 -8 16 16" aria-hidden="true">
              <circle r="6.5" fill="none" stroke="var(--ink)" strokeWidth="1.6" />
              <circle r="2.6" fill="var(--ink)" />
            </svg>
            <span>This student</span>
          </li>
        )}
      />
    </figure>
  );
}

/* ------------------------------------------------------------------ Student vs cohort */

/**
 * One row per model feature: where the student sits relative to the average student (0)
 * and to the centre of the predicted segment, in standard deviations.
 */
export function FeatureCompare({ model, prediction, inputs }) {
  const LIMIT = 3;
  const seg = model.segments[prediction.segment];
  const at = (z) => ((clamp(z, -LIMIT, LIMIT) + LIMIT) / (2 * LIMIT)) * 100;

  return (
    <figure className="chart">
      <div className="fc">
        {model.features.map((f, i) => {
          const z = prediction.z[i];
          const c = seg.center[i];
          const view = RAW_VIEW[f.key];
          const lo = Math.min(at(z), at(c));
          const hi = Math.max(at(z), at(c));
          return (
            <div className="fc-row" key={f.key}
              title={`${f.label}: student ${signed(z)} SD, ${seg.id} centre ${signed(c)} SD from the cohort average`}>
              <div className="fc-label">{f.label}</div>
              <div className="fc-track">
                {[-2, -1, 1, 2].map((t) => <span key={t} className="fc-tick" style={{ left: `${at(t)}%` }} />)}
                <span className="fc-zero" />
                <span className="fc-link" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
                <span className="fc-centre" style={{ left: `${at(c)}%`, background: segColor(prediction.segment) }} />
                <span className="fc-student" style={{ left: `${at(z)}%` }} />
              </div>
              <div className="fc-value">
                <strong>{num(view.value(inputs), view.digits)}</strong>
                <span>avg {num(model.cohort.means[view.cohort], view.cohortDigits)}</span>
              </div>
            </div>
          );
        })}
        <div className="fc-row fc-axis" aria-hidden="true">
          <div />
          <div className="fc-scale">
            <span style={{ left: "0%" }}>−3 SD</span>
            <span style={{ left: "50%" }}>cohort average</span>
            <span style={{ left: "100%" }}>+3 SD</span>
          </div>
          <div />
        </div>
      </div>
      <ul className="legend">
        <li><span className="key-student" /> <span>This student</span></li>
        <li><span className="key-centre" style={{ background: segColor(prediction.segment) }} /> <span>Centre of {seg.id}</span></li>
        <li className="legend-note">Right-hand column: the student's value and the cohort average, in original units</li>
      </ul>
    </figure>
  );
}

/* ------------------------------------------------------------------ Bar list */

/**
 * Horizontal bars with the value at the tip. rows: [{ key, label, value, color, glyph, tag, dim }].
 * `reference` draws a hairline at a fixed value across all rows (e.g. the cohort average).
 */
export function BarList({ rows, max, format = (v) => num(v, 2), reference, labelWidth = "34%" }) {
  const top = max ?? Math.max(...rows.map((r) => r.value), reference?.value ?? 0, 1e-9) * 1.04;
  const w = (v) => `${clamp((v / top) * 100, 0, 100)}%`;
  return (
    <figure className="chart">
      <div className="barlist" style={{ "--label-w": labelWidth }}>
        {rows.map((r) => (
          <div className={`barlist-row${r.dim ? " is-dim" : ""}`} key={r.key} title={`${r.title ?? r.label}: ${format(r.value)}`}>
            <div className="barlist-label">
              {r.glyph != null && <Glyph index={r.glyph} />}
              <span>{r.label}</span>
              {r.tag && <span className="tag">{r.tag}</span>}
            </div>
            <div className="barlist-track">
              <div className="barlist-bar" style={{ width: w(r.value), background: r.color ?? "var(--series-1)" }} />
              {reference && <span className="barlist-ref" style={{ left: w(reference.value) }} />}
            </div>
            <div className="barlist-value">{format(r.value)}</div>
          </div>
        ))}
      </div>
      {reference && (
        <ul className="legend">
          <li><span className="key-ref" /> <span>{reference.label}: {format(reference.value)}</span></li>
        </ul>
      )}
    </figure>
  );
}

/* ------------------------------------------------------------------ Line chart */

/**
 * Multi-series line chart over a small set of x positions, with a crosshair that snaps to
 * the nearest x and one tooltip listing every series. series: [{ name, values, color, quiet }].
 */
export function LineChart({ x, series, xLabel, markX, markLabel, height = 280, digits = 3 }) {
  const [ref, { width }] = useSize();
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const m = { top: 22, right: 18, bottom: 42, left: 46 };

  const all = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  const yMin = Math.min(0, ...all);
  const yMax = Math.max(...all) * 1.12 || 1;
  const iw = Math.max(width - m.left - m.right, 10);
  const ih = height - m.top - m.bottom;
  const sx = (i) => m.left + (x.length === 1 ? iw / 2 : (i / (x.length - 1)) * iw);
  const sy = (v) => m.top + (1 - (v - yMin) / (yMax - yMin)) * ih;
  const yTicks = niceTicks(yMin, yMax, 4);
  const markIndex = x.indexOf(markX);

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    let best = 0;
    for (let i = 1; i < x.length; i += 1) if (Math.abs(sx(i) - mx) < Math.abs(sx(best) - mx)) best = i;
    setHover(best);
  };

  return (
    <figure className="chart">
      <div className="chart-head">
        {/* a single series needs no legend: the card title already names it */}
        {series.length > 1 ? (
          <ul className="legend">
            {series.map((s) => (
              <li key={s.name}><span className="key-line" style={{ background: s.color }} /> <span>{s.name}</span></li>
            ))}
          </ul>
        ) : <span />}
        <button type="button" className="link-button" onClick={() => setAsTable((v) => !v)}>
          {asTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {asTable ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>{xLabel}</th>{series.map((s) => <th key={s.name}>{s.name}</th>)}</tr>
            </thead>
            <tbody>
              {x.map((xv, i) => (
                <tr key={xv} className={xv === markX ? "is-marked" : undefined}>
                  <th>{xv}{xv === markX ? ` (${markLabel})` : ""}</th>
                  {series.map((s) => <td key={s.name}>{num(s.values[i], digits)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-plot" ref={ref} style={{ height }}>
          {width > 0 && (
            <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img"
              aria-label={`Line chart of ${series.map((s) => s.name).join(", ")} by ${xLabel}`}>
              {markIndex >= 0 && (
                <g>
                  <rect x={sx(markIndex) - 16} y={m.top - 4} width="32" height={ih + 4} rx="6" className="mark-band" />
                  <text x={sx(markIndex)} y={m.top - 9} textAnchor="middle" className="tick">{markLabel}</text>
                </g>
              )}
              {yTicks.map((t) => (
                <g key={t}>
                  <line x1={m.left} x2={m.left + iw} y1={sy(t)} y2={sy(t)} className={t === 0 ? "axis-line" : "grid-line"} />
                  <text x={m.left - 8} y={sy(t) + 4} className="tick" textAnchor="end">{t}</text>
                </g>
              ))}
              {x.map((xv, i) => (
                <text key={xv} x={sx(i)} y={m.top + ih + 18} className="tick" textAnchor="middle">{xv}</text>
              ))}
              <text x={m.left + iw / 2} y={height - 4} className="axis-title" textAnchor="middle">{xLabel}</text>

              {hover != null && <line x1={sx(hover)} x2={sx(hover)} y1={m.top} y2={m.top + ih} className="crosshair" />}

              {series.map((s) => (
                <g key={s.name}>
                  <polyline
                    points={s.values.map((v, i) => `${sx(i)},${sy(v)}`).join(" ")}
                    fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                  />
                  {!s.quiet && s.values.map((v, i) => (
                    <circle key={i} cx={sx(i)} cy={sy(v)} r={hover === i ? 5 : 4} fill={s.color} stroke="var(--surface)" strokeWidth="2" />
                  ))}
                </g>
              ))}
            </svg>
          )}
          {hover != null && (
            <Tooltip x={sx(hover)} y={m.top + ih / 2} width={width}>
              <div className="tooltip-title">{xLabel} = {x[hover]}</div>
              {series.map((s) => (
                <div className="tooltip-row" key={s.name}>
                  <span className="key-line" style={{ background: s.color }} />
                  <strong>{num(s.values[hover], digits)}</strong>
                  <span>{s.name}</span>
                </div>
              ))}
            </Tooltip>
          )}
        </div>
      )}
    </figure>
  );
}

/* ------------------------------------------------------------------ Signature heatmap */

/** Segment centres in standard deviations from the cohort average. Diverging scale, grey = average. */
export function SignatureHeatmap({ model }) {
  const limit = Math.max(1, ...model.segments.flatMap((s) => s.center.map(Math.abs)));
  const cell = (z) => {
    const strength = clamp(Math.abs(z) / limit, 0, 1);
    const pole = z >= 0 ? "var(--div-pos)" : "var(--div-neg)";
    return {
      background: `color-mix(in oklab, ${pole} ${Math.round(strength * 100)}%, var(--div-mid))`,
      color: strength > 0.72 ? "#ffffff" : "var(--ink)",
    };
  };
  return (
    <figure className="chart">
      <div className="table-wrap">
        <table className="heatmap">
          <thead>
            <tr>
              <th scope="col">Segment</th>
              {model.features.map((f) => <th scope="col" key={f.key}>{f.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {model.segments.map((s, i) => (
              <tr key={s.id}>
                <th scope="row">
                  <Glyph index={i} /> <strong>{s.id}</strong> <span className="heatmap-name">{s.name}</span>
                </th>
                {s.center.map((z, j) => (
                  <td key={model.features[j].key} style={cell(z)}
                    title={`${s.id} · ${model.features[j].label}: ${signed(z)} SD from the cohort average`}>
                    {signed(z)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="scale-legend">
        <span>below average</span>
        <span className="scale-bar" />
        <span>above average</span>
        <span className="legend-note">values are standard deviations from the average student</span>
      </div>
    </figure>
  );
}
