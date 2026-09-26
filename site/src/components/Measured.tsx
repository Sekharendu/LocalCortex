import type { ReactNode } from "react";

export interface Stat {
  /** What was counted, e.g. "Resume questions answered correctly". */
  label: string;
  /** The result. With `before`, it's shown as before → value. */
  value: string;
  before?: string;
}

// Marks real test data: a plain box like a Note, headed "Test result" and the
// script that produced the numbers, then the numbers as a simple list.
export function Measured({
  source,
  stats,
  children,
}: {
  source?: string;
  stats?: Stat[];
  children?: ReactNode;
}) {
  return (
    <aside className="measured" aria-label="Test result">
      <p className="measured-label">
        <strong>Test result</strong>
        {source && <span className="measured-source"> · {source}</span>}
      </p>
      {stats && stats.length > 0 && (
        <ul className="measured-stats">
          {stats.map((s) => (
            <li key={s.label}>
              {s.label}:{" "}
              {s.before && <>{s.before} → </>}
              <strong>{s.value}</strong>
            </li>
          ))}
        </ul>
      )}
      {children}
    </aside>
  );
}
