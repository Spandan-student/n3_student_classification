const ok = (v) => typeof v === "number" && Number.isFinite(v);

export const pct = (v, digits = 0) => (ok(v) ? `${(100 * v).toFixed(digits)}%` : "–");
export const num = (v, digits = 1) => (ok(v) ? v.toFixed(digits) : "–");
export const signed = (v, digits = 2) => (ok(v) ? `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}` : "–");
export const times = (v, digits = 1) => (ok(v) ? `${v.toFixed(digits)}×` : "–");

/** Round tick values covering [min, max]. */
export function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const rough = span / count;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}
