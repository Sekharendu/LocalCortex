// Builds data/eval-profile.pdf from data/eval-profile.txt: one PDF text line per source
// line (no heading markup, like a resume exported to PDF), split across pages as needed.
// Run with: node scripts/gen-profile-pdf.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const lines = fs.readFileSync(path.join(dataDir, "eval-profile.txt"), "utf8").trimEnd().split(/\r?\n/);

const FONT_SIZE = 10;
const LEADING = 14;
const LINES_PER_PAGE = 40;
const WRAP = 95;

// Long lines wrap like they would on a real page.
const wrapped = lines.flatMap((line) => {
  const out = [];
  let rest = line;
  while (rest.length > WRAP) {
    const cut = rest.lastIndexOf(" ", WRAP);
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut + 1);
  }
  out.push(rest);
  return out;
});

const escape = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const pages = [];
for (let i = 0; i < wrapped.length; i += LINES_PER_PAGE) pages.push(wrapped.slice(i, i + LINES_PER_PAGE));

// Objects: 1 catalog, 2 pages, 3 font, then (page, content) pairs.
const objs = ["<< /Type /Catalog /Pages 2 0 R >>", null, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"];
const kids = [];
for (const pageLines of pages) {
  const pageNum = objs.length + 1;
  kids.push(`${pageNum} 0 R`);
  const ops = `BT /F1 ${FONT_SIZE} Tf ${LEADING} TL 56 740 Td ${pageLines.map((l) => `(${escape(l)}) Tj T*`).join(" ")} ET`;
  objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${pageNum + 1} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`);
  objs.push(`<< /Length ${Buffer.byteLength(ops, "latin1")} >>\nstream\n${ops}\nendstream`);
}
objs[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;

let pdf = "%PDF-1.4\n";
const offsets = [];
objs.forEach((o, i) => {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
});
const xrefStart = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

fs.writeFileSync(path.join(dataDir, "eval-profile.pdf"), Buffer.from(pdf, "latin1"));
console.log(`wrote data/eval-profile.pdf (${pages.length} pages, ${wrapped.length} lines)`);
