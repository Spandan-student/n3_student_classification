import { useId } from "react";

/** Slider with an editable number readout. */
export function RangeField({ label, hint, value, min, max, step = 1, unit, onChange }) {
  const id = useId();
  const set = (raw) => {
    const n = Number(raw);
    if (Number.isFinite(n)) onChange(Math.min(Math.max(Math.round(n / step) * step, min), max));
  };
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        <span className="field-readout">
          <input
            type="number" inputMode="numeric" min={min} max={max} step={step} value={value}
            onChange={(e) => set(e.target.value)} aria-label={`${label} (number)`}
          />
          {unit && <span className="field-unit">{unit}</span>}
        </span>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(e.target.value)}
        style={{ "--fill": `${((value - min) / (max - min)) * 100}%` }}
      />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

/** A short ordered scale shown as a row of buttons (one selected). */
export function ChoiceField({ label, hint, value, options, onChange }) {
  const id = useId();
  return (
    <div className="field">
      <div className="field-head">
        <span id={id} className="field-label">{label}</span>
      </div>
      <div className="choice" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button
            key={o.value} type="button" role="radio" aria-checked={value === o.value}
            className={value === o.value ? "is-on" : undefined}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

/** Button that opens a file picker and hands back the parsed JSON (or an error message). */
export function ModelFileButton({ onLoad, children, className = "button" }) {
  const id = useId();
  const read = async (file) => {
    if (!file) return;
    try {
      onLoad(JSON.parse(await file.text()), file.name);
    } catch {
      onLoad(null, file.name);
    }
  };
  return (
    <>
      <label htmlFor={id} className={className} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") document.getElementById(id)?.click(); }}>
        {children}
      </label>
      <input
        id={id} type="file" accept=".json,application/json" hidden
        onChange={(e) => { read(e.target.files?.[0]); e.target.value = ""; }}
      />
    </>
  );
}
