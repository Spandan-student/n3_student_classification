import { riskLevel } from "../lib/model.js";

export function Card({ title, subtitle, children, className = "", actions }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label, value, note }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

const ICONS = {
  critical: <path d="M8 1.5 15 14H1L8 1.5Zm-.75 4.75v4h1.5v-4h-1.5Zm0 5v1.5h1.5v-1.5h-1.5Z" />,
  warning: <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm-.75 3.5v5h1.5v-5h-1.5Zm0 6v1.5h1.5v-1.5h-1.5Z" />,
  good: <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm3.2 4.4-4 4.2-2.1-2-1 1.1 3.2 3 5-5.3-1.1-1Z" />,
};

/** Status badge: icon + label, so the reading never depends on colour alone. */
export function RiskBadge({ segment }) {
  const { level, label } = riskLevel(segment);
  return (
    <span className={`badge badge-${level}`}>
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" fillRule="evenodd">
        {ICONS[level]}
      </svg>
      {label}
    </span>
  );
}

export function ActionList({ actions }) {
  return (
    <ul className="actions">
      {(actions || []).map((a) => (
        <li key={a}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{a.charAt(0).toUpperCase() + a.slice(1)}</span>
        </li>
      ))}
    </ul>
  );
}
