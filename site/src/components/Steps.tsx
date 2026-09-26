import type { ReactNode } from "react";

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="steps">{children}</ol>;
}

export function Step({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <li className="step">
      <div className="step-title">{title}</div>
      <div className="step-body">{children}</div>
    </li>
  );
}
