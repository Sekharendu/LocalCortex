// Static hosts (GitHub Pages, and Vercel for unmatched paths in some configs)
// serve `404.html` when a request doesn't match a real file. Copying the
// pre-rendered index.html there boots the same SPA at that URL; react-router's
// catch-all `*` route then renders NotFound client-side. Without this, a deep
// link to a page that doesn't exist shows the host's bare 404 instead of ours.
import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
await copyFile(join(distDir, "index.html"), join(distDir, "404.html"));
console.log("[copy-404] wrote dist/404.html");
