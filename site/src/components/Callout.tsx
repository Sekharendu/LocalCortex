import type { ReactNode } from "react";
import { InfoIcon, WarningIcon } from "./Icons";

export function Callout({ type = "note", children }: { type?: "note" | "warning"; children: ReactNode }) {
  return (
    <div className={`callout callout-${type}`}>
      {type === "warning" ? <WarningIcon /> : <InfoIcon />}
      <div className="callout-body">{children}</div>
    </div>
  );
}
