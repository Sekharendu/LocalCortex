// Read-only check: which heading clues does pdf.js give us in the dev PDFs?
//   bookmarks (outline), tags (H1..H6 in the structure tree), font size above body text, bold font names.
// Sample: the 18 header-test documents + 10 more per source (fixed hash). First 15 pages per PDF.
// Run (repo root): npx tsx eval/ragbench-20261115/pdf-signals.mts
import fs from "node:fs";
import { getDocument, GlobalWorkerOptions, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";

const HERE = "eval/ragbench-20261115";
const PAGES = 15;
const rows = fs.readFileSync(`${HERE}/dev.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const hdr = fs.readFileSync(`${HERE}/header-test-results.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const want = new Set(hdr.map((r) => r.doc));
const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
const bySrc = new Map<string, Map<string, string>>();
for (const r of rows) { if (!r.path.includes("/docs/dev/")) throw new Error("non-dev " + r.path); if (!bySrc.has(r.source)) bySrc.set(r.source, new Map()); bySrc.get(r.source)!.set(r.doc, r.path); }
const pick: { source: string; doc: string; path: string; inHeaderTest: boolean }[] = [];
for (const [source, m] of bySrc) {
  const docs = [...m.keys()];
  for (const d of docs.filter((d) => want.has(d))) pick.push({ source, doc: d, path: m.get(d)!, inHeaderTest: true });
  for (const d of docs.filter((d) => !want.has(d)).sort((a, b) => h(a) - h(b)).slice(0, 10)) pick.push({ source, doc: d, path: m.get(d)!, inHeaderTest: false });
}

async function countOutline(items: any[] | null): Promise<number> {
  if (!items) return 0; let n = 0;
  for (const it of items) n += 1 + (await countOutline(it.items));
  return n;
}
function tagsIn(node: any, acc: Record<string, number>) {
  if (!node) return;
  if (node.role) acc[node.role] = (acc[node.role] ?? 0) + 1;
  for (const c of node.children ?? []) tagsIn(c, acc);
}

const out: any[] = [];
for (const p of pick) {
  const t = Date.now();
  const task = getDocument({ data: new Uint8Array(fs.readFileSync(p.path)), useSystemFonts: true });
  const doc = await task.promise;
  const outline = await countOutline(await doc.getOutline());
  const tags: Record<string, number> = {};
  const lines: { text: string; size: number; bold: boolean }[] = [];
  for (let i = 1; i <= Math.min(PAGES, doc.numPages); i++) {
    const page = await doc.getPage(i);
    try { tagsIn(await page.getStructTree(), tags); } catch { /* untagged */ }
    await page.getOperatorList(); // loads fonts so their real names are known
    const content = await page.getTextContent();
    let cur = { text: "", size: 0, bold: false, chars: 0, boldChars: 0 };
    const flush = () => { const s = cur.text.trim(); if (s) lines.push({ text: s, size: +cur.size.toFixed(1), bold: cur.boldChars > cur.chars / 2 }); cur = { text: "", size: 0, bold: false, chars: 0, boldChars: 0 }; };
    for (const it of content.items as any[]) {
      if (!("str" in it)) continue;
      const size = Math.hypot(it.transform[2], it.transform[3]) || it.height;
      let name = ""; try { name = page.commonObjs.get(it.fontName)?.name ?? ""; } catch { /* not loaded */ }
      const n = it.str.trim().length;
      if (n) { cur.size = Math.max(cur.size, size); cur.chars += n; if (/bold|black|heavy|semibold|demi/i.test(name)) cur.boldChars += n; }
      cur.text += it.str;
      if (it.hasEOL) flush();
    }
    flush();
    page.cleanup();
  }
  const numPages = doc.numPages;
  await task.destroy();
  // body size = size carrying the most characters
  const w = new Map<number, number>(); for (const l of lines) w.set(l.size, (w.get(l.size) ?? 0) + l.text.length);
  const body = [...w.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  const short = (l: any) => l.text.length >= 3 && l.text.length <= 100 && !/[.,;:]$/.test(l.text);
  const bigger = lines.filter((l) => l.size >= body * 1.15 && short(l));
  const boldOnly = lines.filter((l) => l.size < body * 1.15 && l.bold && short(l));
  const headingTags = Object.entries(tags).filter(([k]) => /^H\d?$/.test(k)).reduce((a, [, v]) => a + v, 0);
  const rec = { source: p.source, doc: p.doc, inHeaderTest: p.inHeaderTest, pages: numPages, outline, headingTags, lines: lines.length, body,
    biggerLines: bigger.length, boldLines: boldOnly.length, boldFontSeen: lines.some((l) => l.bold),
    exBigger: bigger.slice(0, 6).map((l) => `${l.size}: ${l.text.slice(0, 60)}`), exBold: boldOnly.slice(0, 6).map((l) => l.text.slice(0, 60)), ms: Date.now() - t };
  out.push(rec);
  console.log(JSON.stringify({ doc: p.doc, pages: rec.pages, outline, headingTags, body, biggerLines: rec.biggerLines, boldLines: rec.boldLines, ms: rec.ms }));
}
fs.writeFileSync(`${HERE}/pdf-signals.json`, JSON.stringify(out, null, 1));
for (const s of [...bySrc.keys(), "all"]) {
  const rs = out.filter((r) => s === "all" || r.source === s);
  console.log(`${s.padEnd(13)} docs ${rs.length} | bookmarks ${rs.filter((r) => r.outline >= 3).length} | heading tags ${rs.filter((r) => r.headingTags > 0).length} | bigger-font headings ${rs.filter((r) => r.biggerLines >= 3).length} | bold headings ${rs.filter((r) => r.boldLines >= 3).length} | neither ${rs.filter((r) => r.biggerLines < 3 && r.boldLines < 3).length}`);
}
