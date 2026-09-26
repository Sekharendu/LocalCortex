import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Toc from "../components/Toc";
import PrevNext from "../components/PrevNext";
import CopyPageButton from "../components/CopyPageButton";
import type { PageHeading } from "../lib/remark-headings";
import type { NavPage } from "../nav";
import { GITHUB_URL, findGroup } from "../nav";

interface Props {
  page?: NavPage;
  headings: PageHeading[];
  children: ReactNode;
}

// The three-column shell every page renders inside: left nav, centered
// content column, right "On this page" TOC. Home ("/") skips the page-header
// block (label/H1/subtitle/copy button/prev-next/edit-link) because it's a
// hand-built landing page, not a docs article — see src/pages/index.mdx.
export default function DocsLayout({ page, headings, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // A client-side navigation keeps the old scroll position, so a new page would
  // open partway down. Jump to the linked heading, or to the top.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    document.title = page && !isHome ? `${page.title} — LocalCortex` : "LocalCortex";
  }, [page, isHome]);

  const editUrl = page ? `${GITHUB_URL}/edit/main/site/src/pages${page.path === "/" ? "/index" : page.path}.mdx` : GITHUB_URL;

  return (
    <div className="docs-shell">
      <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
      <div className="docs-body">
        {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}
        <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        <div className="docs-content-column">
          <main className="docs-content">
            {!isHome && page && (
              <div className="page-header">
                <p className="page-eyebrow">{navGroupLabel(page.path)}</p>
                <div className="page-header-row">
                  <h1>{page.title}</h1>
                  <CopyPageButton path={page.path} />
                </div>
                <p className="page-subtitle">{page.description}</p>
              </div>
            )}
            {!isHome && headings.length > 0 && (
              <div className="docs-toc-mobile">
                <Toc headings={headings} />
              </div>
            )}
            <article className="docs-article">{children}</article>
            {!isHome && page && (
              <>
                <PrevNext path={page.path} />
                <a className="edit-on-github" href={editUrl} target="_blank" rel="noreferrer">
                  Edit this page on GitHub
                </a>
              </>
            )}
          </main>
        </div>
        {!isHome && (
          <aside className="docs-toc-column">
            <Toc headings={headings} />
          </aside>
        )}
      </div>
    </div>
  );
}

function navGroupLabel(path: string): string {
  return findGroup(path)?.label ?? "Get started";
}
