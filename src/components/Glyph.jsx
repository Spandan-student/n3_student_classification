// Segment identity = colour + shape, in the same fixed order as the notebook's charts
// (S1 blue circle, S2 orange square, S3 aqua triangle, ...). Shape backs up colour, so a
// segment is never identified by hue alone.

export const segColor = (index) => `var(--series-${(index % 8) + 1})`;

function plusPath(r) {
  const a = r * 0.42;
  return `M ${-a},${-r} H ${a} V ${-a} H ${r} V ${a} H ${a} V ${r} H ${-a} V ${a} H ${-r} V ${-a} H ${-a} Z`;
}

function starPath(r) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r * 1.25 : r * 0.55;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(radius * Math.cos(angle)).toFixed(2)},${(radius * Math.sin(angle)).toFixed(2)}`);
  }
  return `M ${points.join(" L ")} Z`;
}

/** SVG path for segment `index`, centred on 0,0 with nominal radius r. */
export function shapePath(index, r) {
  switch (index % 8) {
    case 0:
      return `M ${-r},0 a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 ${-2 * r},0 Z`;
    case 1: {
      const s = r * 0.9;
      return `M ${-s},${-s} H ${s} V ${s} H ${-s} Z`;
    }
    case 2:
      return `M 0,${-r * 1.15} L ${r * 1.1},${r * 0.85} L ${-r * 1.1},${r * 0.85} Z`;
    case 3:
      return `M 0,${-r * 1.25} L ${r * 1.05},0 L 0,${r * 1.25} L ${-r * 1.05},0 Z`;
    case 4:
    case 5:
      return plusPath(r * 1.1);
    case 6:
      return `M 0,${r * 1.15} L ${r * 1.1},${-r * 0.85} L ${-r * 1.1},${-r * 0.85} Z`;
    default:
      return starPath(r);
  }
}

/** The sixth shape is the plus rotated into an X. */
export const shapeRotate = (index) => (index % 8 === 5 ? " rotate(45)" : "");

export function Glyph({ index, size = 12 }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="-7 -7 14 14" aria-hidden="true">
      <path d={shapePath(index, 4.6)} transform={shapeRotate(index).trim() || undefined} fill={segColor(index)} />
    </svg>
  );
}

/** Legend row listing every segment with its colour-and-shape key. */
export function SegmentLegend({ segments, extra }) {
  return (
    <ul className="legend">
      {segments.map((s, i) => (
        <li key={s.id}>
          <Glyph index={i} />
          <span>
            <strong>{s.id}</strong> {s.name}
          </span>
        </li>
      ))}
      {extra}
    </ul>
  );
}
