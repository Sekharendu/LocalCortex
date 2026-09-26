import { useEffect, useRef, useState } from "react";
import type { PageHeading } from "../lib/remark-headings";

// Sticky "On this page" list, with scroll-spy: the heading whose section is
// currently in view gets highlighted. Ids come from the page's own `headings`
// export (see src/lib/remark-headings.ts) so no DOM scraping is needed here —
// this just watches the elements those ids already point to.
export default function Toc({ headings }: { headings: PageHeading[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    observerRef.current?.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="site-toc" aria-label="On this page">
      <div className="site-toc-label">On this page</div>
      <ul>
        {headings.map((h) => (
          <li key={h.id} className={h.depth === 3 ? "toc-sub" : undefined}>
            <a href={`#${h.id}`} className={activeId === h.id ? "active" : undefined}>
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
