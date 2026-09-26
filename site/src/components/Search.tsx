import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { flatPages } from "../nav";
import { SearchIcon, CloseIcon } from "./Icons";

// A lightweight client-side filter over page titles/descriptions, opened with
// the search button or Ctrl/Cmd K. It's not full-text search over page bodies
// (that's Pagefind, a later pass over the built site) — this covers "find the
// page I want" today with zero extra build step.
export default function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flatPages;
    return flatPages.filter(
      (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <>
      <button type="button" className="search-trigger" onClick={() => setOpen(true)} aria-label="Search">
        <SearchIcon />
        <span>Search…</span>
        <kbd>Ctrl K</kbd>
      </button>

      {open && (
        <div className="search-overlay" onClick={() => setOpen(false)}>
          <div className="search-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="search-modal-input">
              <SearchIcon />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages…"
                aria-label="Search pages"
              />
              <button type="button" className="icon-button" aria-label="Close search" onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <ul className="search-results">
              {results.length === 0 && <li className="search-empty">No pages match "{query}"</li>}
              {results.map((p) => (
                <li key={p.path}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(p.path);
                    }}
                  >
                    <span className="search-result-title">{p.title}</span>
                    <span className="search-result-desc">{p.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
