import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeShiki from "@shikijs/rehype";
import { remarkHeadings } from "./src/lib/remark-headings";

// GitHub Pages serves the site from /LocalCortex/; every other host (Vercel,
// local dev) serves it from /. SITE_BASE lets the one build target either.
const base = process.env.SITE_BASE ?? "/";

export default defineConfig({
  base,
  define: {
    __SITE_BASE__: JSON.stringify(base),
  },
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkGfm, remarkHeadings],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeShiki,
            {
              // defaultColor: false leaves tokens uncolored, so code renders in the
              // single --code-fg color from global.css (monochrome by design).
              themes: { light: "github-light", dark: "github-dark" },
              defaultColor: false,
              // Expose the fence language so CodeBlock can show it in its header.
              transformers: [
                {
                  name: "data-language",
                  pre(this: { options: { lang: string } }, node: { properties: Record<string, unknown> }) {
                    node.properties["data-language"] = this.options.lang;
                  },
                },
              ],
            },
          ],
        ],
      }),
    },
    react(),
  ],
  // Read by the `vite-react-ssg` CLI at build time.
  ssgOptions: {
    script: "async",
    formatting: "prettify",
  },
});
