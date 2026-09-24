// One-off generator: builds minimal valid .docx fixtures for the loader/chunker tests.
// Uses jszip (a transitive dependency of mammoth, resolved through it rather than added
// as a new direct dependency) to hand-write the zip parts a .docx needs: no styles.xml,
// since mammoth's default style map recognizes Word's built-in "Heading1"/"Heading2"
// style IDs (p.Heading1 => h1, see node_modules/mammoth/lib/options-reader.js) without
// one -- a paragraph's <w:pStyle w:val="Heading1"/> is enough.
// Run with: node scripts/gen-sample-docx.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "..", "data");
const mammothEntry = createRequire(import.meta.url).resolve("mammoth");
const JSZip = createRequire(mammothEntry)("jszip");

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** heading level 0 = body paragraph, 1-6 = HeadingN. */
function paragraph(text, level = 0) {
  const pPr = level > 0 ? `<w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr>` : "";
  return `<w:p>${pPr}<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function documentXml(bodyXml) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyXml}</w:body>
</w:document>`;
}

async function writeDocx(outPath, paragraphs) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", RELS);
  zip.file("word/document.xml", documentXml(paragraphs.join("")));
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(outPath, buf);
  console.log(`wrote ${outPath} (${buf.length} bytes)`);
}

// Fixture 1: the handbook, with real Heading1/Heading2 Word styles -- mirrors
// data/eval-corpus.txt's "# Title" / "## Section" structure so compare-chunking.ts can
// run the same eval set against the .docx form.
const handbookTxt = fs.readFileSync(path.join(outDir, "eval-corpus.txt"), "utf8");
const handbookParas = [];
for (const rawLine of handbookTxt.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (line.length === 0) continue;
  const m = line.match(/^(#{1,6})\s+(.*)$/);
  handbookParas.push(m ? paragraph(m[2], m[1].length) : paragraph(line));
}
await writeDocx(path.join(outDir, "eval-corpus.docx"), handbookParas);

// Fixture 2: a short document with no heading styles at all -- every paragraph is
// plain body text, so hasHeadingStructure() sees 0 headings after extraction.
const plainParas = [
  "Priya Sharma",
  "Data Engineer based in Pune, India.",
  "Five years of experience building batch and streaming pipelines on AWS and GCP.",
  "Comfortable owning a pipeline from ingestion to the dashboard.",
].map((t) => paragraph(t));
await writeDocx(path.join(outDir, "sample-plain.docx"), plainParas);
