import { Children, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";

// Code tabs: <Tabs><Tab label="bash">```bash …```</Tab><Tab label="JSON">…</Tab></Tabs>.
// Picking a tab switches every Tabs block on the page that has a tab with the
// same label, and is remembered for the next visit (per viewer, best effort).
const STORAGE_KEY = "docs-code-tab";
const EVENT = "docs-code-tab";

export function Tab({ children }: { label: string; children: ReactNode }) {
  return <>{children}</>;
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function Tabs({ children }: { children: ReactNode }) {
  const tabs = Children.toArray(children).filter(
    (c): c is ReactElement<{ label: string; children: ReactNode }> => isValidElement(c),
  );
  const labels = tabs.map((t) => t.props.label);
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pick = (label: string | null) => {
      const i = label ? labels.indexOf(label) : -1;
      if (i !== -1) setActive(i);
    };
    pick(readStored());
    const onChange = (e: Event) => pick((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
    // labels are fixed for the lifetime of a block
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(i: number) {
    setActive(i);
    try {
      localStorage.setItem(STORAGE_KEY, labels[i]);
    } catch {
      // storage blocked; the choice still applies to this page
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: labels[i] }));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(panelRef.current?.querySelector("pre")?.textContent ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked; nothing to do.
    }
  }

  return (
    <div className="code-tabs">
      <div className="code-tabs-bar" role="tablist">
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={i === active ? "active" : undefined}
            onClick={() => choose(i)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="code-tabs-copy" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="code-tabs-panel" role="tabpanel" ref={panelRef}>
        {tabs[active]}
      </div>
    </div>
  );
}
