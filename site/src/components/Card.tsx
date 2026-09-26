import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRightIcon } from "./Icons";

export function CardGroup({ cols = 2, children }: { cols?: 1 | 2 | 3; children: ReactNode }) {
  return (
    <div className="card-group" style={{ "--cols": cols } as CSSProperties}>
      {children}
    </div>
  );
}

// Without href the card is a plain info tile (no chevron, not clickable).
export function Card({ title, href, children }: { title: string; href?: string; children?: ReactNode }) {
  const inner = (
    <>
      <div className="card-title">
        {title}
        {href && <ChevronRightIcon />}
      </div>
      {children && <p className="card-body">{children}</p>}
    </>
  );
  if (!href) return <div className="card">{inner}</div>;
  const external = /^https?:\/\//.test(href);
  return external ? (
    <a className="card" href={href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    <Link className="card" to={href}>
      {inner}
    </Link>
  );
}
