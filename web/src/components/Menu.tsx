import { useEffect, useRef, useState, type ReactNode } from "react";

interface MenuProps {
  /** The button that opens the menu. */
  label: string;
  icon: ReactNode;
  children(close: () => void): ReactNode;
  align?: "left" | "right";
}

/** An icon button with a dropdown. Outside clicks and Escape close it. */
export function Menu({ label, icon, children, align = "right" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={open ? "menu-root open" : "menu-root"} ref={rootRef}>
      <button
        type="button"
        className="icon-btn icon-btn-sm"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {icon}
      </button>
      {open && (
        <div className={`menu menu-${align}`} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuHeading({ children }: { children: ReactNode }) {
  return <div className="menu-heading">{children}</div>;
}
