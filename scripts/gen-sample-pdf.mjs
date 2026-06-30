// One-off generator: builds a valid 2-page PDF with extractable text into data/sample.pdf.
// Run with: node scripts/gen-sample-pdf.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "..", "data");

// Define objects in a fixed order; object N is objDefs[N-1].
// Refs are written as literal "<n> 0 R" matching the index below.
// Layout:
//  1: Catalog  (ref Pages = 2)
//  2: Pages    (Kids = [3, 5])
//  3: Page 1   (Contents = 4, Font F1 = 6)
//  4: Content stream 1
//  5: Page 2   (Contents = 7, Font F1 = 6)
//  6: Font
//  7: Content stream 2
const page1 = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 6 0 R >> >> >>";
const page2 = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 7 0 R /Resources << /Font << /F1 6 0 R >> >> >>";
const font = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

function contentStream(text) {
  const ops = `BT /F1 24 Tf 72 700 Td (${text}) Tj ET`;
  return `<< /Length ${Buffer.byteLength(ops, "utf8")} >>\nstream\n${ops}\nendstream`;
}

const objDefs = [
  "<< /Type /Catalog /Pages 2 0 R >>",                              // 1
  "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>",                // 2
  page1,                                                             // 3
  contentStream("Page one: the quick brown fox"),                    // 4
  page2,                                                             // 5
  font,                                                              // 6
  contentStream("Page two: jumps over the lazy dog"),                // 7
];

const byteLen = (s) => Buffer.byteLength(s, "utf8");

let pdf = "%PDF-1.4\n";
const offsets = [];
for (let i = 0; i < objDefs.length; i++) {
  offsets.push(byteLen(pdf));
  pdf += `${i + 1} 0 obj\n${objDefs[i]}\nendobj\n`;
}

const xrefStart = byteLen(pdf);
let xref = `xref\n0 ${objDefs.length + 1}\n0000000000 65535 f \n`;
for (const off of offsets) {
  xref += String(off).padStart(10, "0") + " 00000 n \n";
}
pdf += xref;
pdf += `trailer\n<< /Size ${objDefs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "sample.pdf"), Buffer.from(pdf, "utf8"));
console.log("wrote data/sample.pdf (" + byteLen(pdf) + " bytes)");