import type { ComponentType } from "react";
import { ViteReactSSG } from "vite-react-ssg";
import { Link } from "react-router-dom";
import type { RouteRecord } from "vite-react-ssg";
import type { MDXComponents } from "mdx/types";
import DocsLayout from "./layouts/DocsLayout";
import CodeBlock from "./components/CodeBlock";
import NotFound from "./pages/NotFound";
import { flatPages } from "./nav";
import "./styles/global.css";

// Every MDX page under src/pages, keyed by file path. Eager import: pages are
// small MDX files, and vite-react-ssg needs each route's headings export
// available at build time to render the page (and its TOC) up front.
const pageModules = import.meta.glob("./pages/**/*.mdx", { eager: true }) as Record<
  string,
  { default: ComponentType<{ components?: MDXComponents }>; headings?: { depth: 2 | 3; text: string; id: string }[] }
>;

// "./pages/index.mdx" -> "/", "./pages/how-it-works/architecture.mdx" -> "/how-it-works/architecture"
const mdxComponents: MDXComponents = {
  pre: CodeBlock,
  // Internal markdown links go through the router so they pick up the base
  // path (/LocalCortex/ on GitHub Pages); a plain <a href="/x"> would skip it.
  a: ({ href, ...props }) =>
    href?.startsWith("/") ? <Link to={href} {...props} /> : <a href={href} {...props} />,
  // Markdown tables get a frame that scrolls sideways on phones.
  table: (props) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
};

function routePathFromFile(file: string): string {
  const trimmed = file.replace("./pages", "").replace(/\.mdx$/, "").replace(/\/index$/, "");
  return trimmed === "" ? "/" : trimmed;
}

const routes: RouteRecord[] = Object.entries(pageModules).map(([file, mod]) => {
  const path = routePathFromFile(file);
  const page = flatPages.find((p) => p.path === path);
  const Component = mod.default;
  const headings = mod.headings ?? [];
  return {
    path,
    element: (
      <DocsLayout page={page} headings={headings}>
        <Component components={mdxComponents} />
      </DocsLayout>
    ),
  };
});

routes.push({ path: "*", element: <NotFound /> });

export const createRoot = ViteReactSSG({ routes, basename: import.meta.env.BASE_URL });
