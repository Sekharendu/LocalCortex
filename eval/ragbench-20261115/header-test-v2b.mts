// Header test v2 on a FRESH sample (documents not seen while tuning). Otherwise identical to header-test-v2.mts: the header is
// found from the PDF's formatting (pdf.js font size, bold, bookmarks) instead of guessed from plain text.
//   Title      = SEC cover "<company> FORM 10-K" when present, else the biggest text on page 1 (junk lines skipped).
//   Subheading = nearest heading at or above the chunk start. A line is a heading when:
//     - it matches a bookmark title on its page, or
//     - its font is >= 1.15x the document's body size, or
//     - it is entirely bold, the next line is not bold (stacked bold rows = table headers), not on page 1;
//     and in every case: 4-100 chars, no trailing .,;: , no bullet / "(" start, no numbers (except Item/Note/Part N),
//     not repeated 5+ times in the document.
// Baseline = eval-hdr-old-20261115 (today's vectors, copied by header-test.mts). New = eval-hdr-v2-20261116.
// Run (repo root): npx tsx eval/ragbench-20261115/header-test-v2.mts [--dry]   (--dry: headers only, no embedding)
import fs from "node:fs";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";

const DRY = process.argv.includes("--dry");
const STATE = "X:/LocalCortex-ragbench/state";
const SRC = "eval-ragbench-dev-20261115";
const OLD = "eval-hdr-old2-20261116", NEW = "eval-hdr-v2b-20261116";
const QDRANT = "http://127.0.0.1:36333";
const HERE = "eval/ragbench-20261115";
Object.assign(process.env, {
  QDRANT_URL: QDRANT, OLLAMA_URL: "http://127.0.0.1:11434", QDRANT_COLLECTION: SRC,
  DOC_STORE_PATH: `${STATE}/documents.json`, SPARSE_STATS_PATH: `${STATE}/sparse-stats.json`,
  OLLAMA_EMBED_MODEL: "nomic-embed-text", OLLAMA_EMBED_DIM: "768", OLLAMA_EMBED_PREFIXES: "1",
  RETRIEVE_FUSION: "rrf", RERANK_ENABLED: "0", CLOUDFLARE_API_TOKEN: "", CLOUDFLARE_ACCOUNT_ID: "",
});
for (const k of ["RETRIEVE_MODE", "RETRIEVE_SCORE_THRESHOLD", "RETRIEVE_TOP_K"]) delete process.env[k];
const { retrieve } = await import("../../src/retrieval/retriever.ts");
const { ensureCollection, upsertChunks } = await import("../../src/retrieval/vectorStore.ts");
const { embedBatch } = await import("../../src/retrieval/embedder.ts");
const { sparseVectorFor } = await import("../../src/retrieval/sparse.ts");
const { getAvgDocLength } = await import("../../src/retrieval/sparseStats.ts");
const { contextHeader } = await import("../../src/ingest/chunker.ts");
const { pageTextFromItems } = await import("../../src/ingest/loader.ts");
const GATE = 0.63;

// ---- FRESH selection: dev documents NOT in the first sample, same area weights (tables 25 / topic 13 / Wikipedia 8) ----
const rows = fs.readFileSync(`${HERE}/dev.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const Q = new Map(rows.map((r) => [r.id, r]));
const seen = new Set(fs.readFileSync(`${HERE}/header-test-results.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).doc));
const all = fs.readFileSync(`${HERE}/dev-retrieval.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.relevant.length && !seen.has(r.doc));
const areaOf = (r: any) => r.source === "financebench" ? (Q.get(r.id).meta.type === "novel-generated" ? "2-topic" : "1-tables") : r.source === "tat" ? "1-tables" : "3-wikipedia";
const hh = (s: string) => [...s].reduce((a, c) => (a * 37 + c.charCodeAt(0)) >>> 0, 13);
const docsOf = (pred: (r: any) => boolean) => [...new Set(all.filter(pred).map((r) => r.doc))].sort((a, b) => hh(a) - hh(b));
const chosen: any[] = [];
let budget = 0;
// Fixed pick (unseen dev docs): the 4 smallest FinanceBench docs with topic questions + 2 TAT reports; all their questions.
const PICK2 = ["FOOTLOCKER_2022_8K_dated_2022-08-19", "AMCOR_2023Q2_10Q", "Pfizer_2023Q2_10Q", "AMD_2022_10K", "cal-maine-foods-inc_2019", "iselect-ltd_2019"];
for (const d of PICK2) { const qs = all.filter((r) => r.doc === d); if (!qs.length) throw new Error("missing " + d); budget += qs[0].chunks; for (const r of qs) chosen.push({ ...r, area: areaOf(r) }); }
for (const src of ["nq", "feta"]) for (const d of docsOf((r) => r.source === src && r.chunks > 15 && r.chunks <= 80).slice(0, 4)) {
  const r = all.find((x) => x.doc === d && x.source === src)!; chosen.push({ ...r, area: "3-wikipedia" }); budget += r.chunks;
}
const docId = new Map<string, string>(fs.readFileSync(`${STATE}/ingest-dev.jsonl`, "utf8").split("\n").filter(Boolean)
  .map((l) => JSON.parse(l)).filter((r) => r.ok).map((r) => [r.path, r.documentId]));
const docPaths = new Map<string, string>();
for (const r of chosen) { const p = Q.get(r.id).path; if (!p.includes("/docs/dev/")) throw new Error("non-dev"); docPaths.set(docId.get(p)!, p); }
const areas: Record<string, number> = {}; for (const r of chosen) areas[r.area] = (areas[r.area] ?? 0) + 1;
console.log(JSON.stringify({ selection: { questions: chosen.length, areas, documents: docPaths.size, chunks: budget, docs: [...new Set(chosen.map((r) => r.source + ":" + r.doc))] } }));
if (process.argv.includes("--select")) process.exit(0);

// ---- read the PDF's formatting ----
type Line = { text: string; size: number; boldFrac: number; page: number };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
async function readPdf(path: string) {
  const task = getDocument({ data: new Uint8Array(fs.readFileSync(path)), useSystemFonts: true });
  const doc = await task.promise;
  const lines: Line[] = [];
  const pageTexts: string[] = [];
  const bookmarks: { title: string; page: number }[] = [];
  const walk = async (items: any[] | null) => {
    for (const it of items ?? []) {
      try {
        const dest = typeof it.dest === "string" ? await doc.getDestination(it.dest) : it.dest;
        if (dest) bookmarks.push({ title: it.title, page: (await doc.getPageIndex(dest[0])) + 1 });
      } catch { /* external link */ }
      await walk(it.items);
    }
  };
  await walk(await doc.getOutline());
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    await page.getOperatorList(); // loads fonts so their real (bold) names are known
    const content = await page.getTextContent();
    const items = (content.items as any[]).filter((it) => "str" in it);
    pageTexts.push(pageTextFromItems(items));
    let cur = { text: "", size: 0, chars: 0, bold: 0 };
    const flush = () => { const t = cur.text.replace(/\s+/g, " ").trim(); if (t) lines.push({ text: t, size: +cur.size.toFixed(1), boldFrac: cur.chars ? cur.bold / cur.chars : 0, page: i }); cur = { text: "", size: 0, chars: 0, bold: 0 }; };
    for (const it of items) {
      const n = it.str.replace(/\s/g, "").length;
      if (n) {
        cur.size = Math.max(cur.size, Math.hypot(it.transform[2], it.transform[3]) || it.height);
        let name = ""; try { name = page.commonObjs.get(it.fontName)?.name ?? ""; } catch { /* */ }
        cur.chars += n; if (/bold|black|heavy|semibold|demi/i.test(name)) cur.bold += n;
      }
      cur.text += it.str;
      if (it.hasEOL) flush();
    }
    flush();
    page.cleanup();
  }
  await task.destroy();
  return { lines, pageTexts, bookmarks };
}

const JUNK_TITLE = /^(united states|securities and exchange commission|washington,? d\.?c\.?( \d+)?|table of contents|contents|page \d+( of \d+)?|annual report|exhibit [\d.]+)$/i;
function findTitle(lines: Line[]): string {
  const firstPage = lines[0]?.page ?? 1;
  const p1 = lines.filter((l) => l.page === firstPage);
  const reg = p1.findIndex((l) => /exact name of registrant/i.test(l.text));
  const form = p1.find((l) => /\bform\s+(10-k|10-q|8-k|20-f|40-f)\b/i.test(l.text))?.text.match(/form\s+\S+/i)?.[0].toUpperCase();
  if (reg > 0 && form) return `${p1[reg - 1].text} ${form}`.slice(0, 120);
  const early = lines.filter((l) => l.page < firstPage + 3);
  const ok = early.filter((l) => !JUNK_TITLE.test(l.text) && /[a-z]{3}/i.test(l.text) && !/\d[.,]\d|[$%€£]/.test(l.text) && (l.text.match(/\d/g)?.length ?? 0) <= 8 && (l.text.match(/\d/g)?.length ?? 0) <= 0.3 * l.text.replace(/\s/g, "").length && l.text.length <= 120);
  if (!ok.length) return "";
  const okPage = ok.filter((l) => l.page === ok[0].page); // first page that has a usable line
  const top = Math.max(...okPage.map((l) => l.size));
  const first = early.indexOf(okPage.find((l) => l.size === top)!);
  let t = early[first].text;
  const nx = early[first + 1];
  if (nx && nx.page === early[first].page && nx.size === top && !JUNK_TITLE.test(nx.text)) t += " " + nx.text; // two-line titles
  return t.slice(0, 120);
}

// Table column rows: a word repeated ("Number Number", "Votes For Votes Against"), a % sign, or mostly column words.
const COLUMN_WORDS = new Set(["year", "years", "title", "role", "notes", "name", "position", "description", "date", "total", "amount", "number", "value", "details", "term", "party", "election", "category", "location", "venue", "production", "peak", "album", "element", "level", "change", "director", "nominee", "votes", "shares", "price", "rate", "balance", "period", "type", "status", "result", "results", "award", "work", "chart", "positions"]);
function isColumnRow(t: string): boolean {
  if (/^(item|note|part)\s+[\dIVXA-Z]/i.test(t)) return false;
  if (/%/.test(t)) return true;
  const words = t.toLowerCase().match(/[a-z][a-z'’-]+/g) ?? [];
  const linking = words.some((w) => ["of", "and", "for", "to", "the", "in", "on", "from", "with", "by"].includes(w));
  const big = words.filter((w) => w.length >= 3);
  if (!linking && new Set(big).size < big.length) return true; // "Number Number", "Rating Agency Rating Outlook"
  return words.length >= 3 && words.filter((w) => COLUMN_WORDS.has(w)).length / words.length >= 0.5; // "Year Title Role Notes"
}

function findHeadings(lines: Line[], bookmarks: { title: string; page: number }[]): boolean[] {
  const w = new Map<number, number>(); for (const l of lines) w.set(l.size, (w.get(l.size) ?? 0) + l.text.length);
  const body = [...w.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  const freq = new Map<string, number>(); for (const l of lines) { const k = norm(l.text).replace(/\d+/g, "#"); freq.set(k, (freq.get(k) ?? 0) + 1); }
  const marks = new Set<string>(bookmarks.map((b) => `${b.page}|${norm(b.title).slice(0, 25)}`));
  return lines.map((l, i) => {
    const t = l.text;
    if (t.length < 4 || t.length > 100) return false;
    if (/[.,;:"”’)]$/.test(t) || /^[•·▪\-–(*]/.test(t)) return false;
    if (!/^[A-Z0-9]/.test(t)) return false;                     // headings start with a capital ("point", "term value…" are paragraph lines)
    if (JUNK_TITLE.test(t) || /[()]/.test(t)) return false;      // cover-page furniture, "(IRS Employer Identification No.)"
    if (/^(current report|quarterly report|annual report|signatures?)$/i.test(t)) return false;
    if ((freq.get(norm(t).replace(/\d+/g, "#")) ?? 0) >= 5) return false;
    const itemLike = /^(item|note|part)\s+[\dIVX]+[a-z]?\b/i.test(t);
    if (!itemLike && /\d/.test(t)) return false;
    if (!/[a-z]{3}/i.test(t)) return false;
    if (isColumnRow(t)) return false;
    if (marks.has(`${l.page}|${norm(t).slice(0, 25)}`)) return true;
    const next = lines[i + 1];
    const sameNext = next && next.page === l.page;
    if (body && l.size >= body * 1.15) return !(sameNext && Math.abs(next.size - l.size) < 0.2 && next.text.length > 60); // big-font paragraph, not a heading
    const words = t.split(/\s+/).length;
    // table column row: next line is a data row (2+ numbers) and this line has no linking words ("Year Title Role Notes")
    if (sameNext && (next.text.match(/\d[\d,.]*/g)?.length ?? 0) >= 2 && !/(of|and|for|to|the|in|on|from|with|by)/i.test(t)) return false;
    return l.page > 1 && l.boldFrac >= 0.9 && (words >= 2 || itemLike) && !(next && next.page === l.page && next.boldFrac >= 0.5);
  });
}

async function scroll(id: string) {
  const out: any[] = []; let offset: unknown = null;
  do {
    const body: any = { limit: 512, with_payload: true, with_vector: !DRY, filter: { must: [{ key: "documentId", match: { value: id } }] } };
    if (offset !== null) body.offset = offset;
    const r = await (await fetch(`${QDRANT}/collections/${SRC}/points/scroll`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
    out.push(...r.result.points); offset = r.result.next_page_offset ?? null;
  } while (offset !== null);
  return out.sort((a, b) => a.payload.chunkIndex - b.payload.chunkIndex);
}

// ---- build headers ----
if (!DRY) for (const c of [OLD, NEW]) { await fetch(`${QDRANT}/collections/${c}`, { method: "DELETE" }); await ensureCollection(c); }
const avg = await getAvgDocLength();
const t0 = Date.now();
let total = 0, located = 0;
const report: any[] = [];
for (const [id, path] of docPaths) {
  const { lines, pageTexts, bookmarks } = await readPdf(path);
  const title = findTitle(lines);
  const isH = findHeadings(lines, bookmarks);
  // position of each heading inside its page text (same text the app chunked)
  const heads: { page: number; off: number; text: string }[] = [];
  const cursor = new Map<number, number>();
  lines.forEach((l, i) => {
    const pt = pageTexts[l.page - 1];
    const from = cursor.get(l.page) ?? 0;
    const probe = l.text.slice(0, 40);
    let off = pt.indexOf(probe, from);
    if (off < 0) off = pt.replace(/\s+/g, " ").indexOf(probe) >= 0 ? from : -1;
    if (off >= 0) cursor.set(l.page, off + 1);
    if (isH[i]) heads.push({ page: l.page, off: Math.max(off, from), text: l.text });
  });
  const pts = await scroll(id);
  let carry = "";
  const headers = pts.map((p) => {
    const page = p.payload.page as number;
    const pt = pageTexts[page - 1] ?? "";
    const off = pt.indexOf(p.payload.text.slice(0, 60));
    let sub = "";
    if (off >= 0) {
      located++;
      for (const h of heads) { if (h.page < page || (h.page === page && h.off <= off)) sub = h.text; else break; }
      carry = sub;
    } else sub = carry;
    return contextHeader(title, sub ? [sub] : []);
  });
  total += pts.length;
  const nHeads = isH.filter(Boolean).length;
  report.push({ doc: pts[0].payload.source, title, bookmarks: bookmarks.length, headings: nHeads,
    allHeadings: heads.map((h) => `p${h.page}: ${h.text}`),
    headingExamples: heads.filter((_, i) => i % Math.max(1, Math.floor(heads.length / 12)) === 0).slice(0, 12).map((h) => `p${h.page}: ${h.text}`),
    headerExamples: [0, 1, 2, 3].map((k) => Math.floor((k * pts.length) / 4)).map((i) => `#${i}: ${headers[i]}`) });
  if (!DRY) {
    await upsertChunks(OLD, pts.map((p) => ({ id: p.id, denseVector: p.vector.dense, sparseVector: p.vector.sparse, payload: p.payload })));
    const texts = pts.map((p, i) => `${headers[i]}\n\n${p.payload.text}`);
    const vecs = await embedBatch(texts, 8);
    await upsertChunks(NEW, pts.map((p, i) => ({ id: p.id, denseVector: vecs[i], sparseVector: sparseVectorFor(texts[i], avg), payload: { ...p.payload, section: headers[i] } })));
  }
  console.log(JSON.stringify({ doc: pts[0].payload.source, chunks: pts.length, headings: nHeads, bookmarks: bookmarks.length, title, totalChunks: total, minutes: +((Date.now() - t0) / 60000).toFixed(1) }));
}
fs.writeFileSync(`${HERE}/header-test-v2b-headers.json`, JSON.stringify({ chunksLocated: `${located}/${total}`, docs: report }, null, 1));
console.log(JSON.stringify({ chunksLocated: `${located}/${total}` }));
if (DRY) process.exit(0);

// ---- score ----
const rankOf = (list: number[], rel: number[]) => { const i = list.findIndex((c) => rel.includes(c)); return i < 0 ? null : i + 1; };
const out: any[] = [];
for (const r of chosen) {
  const id = docId.get(Q.get(r.id).path)!;
  const scope = { status: "resolved" as const, references: [], documentIds: [id] };
  const rec: any = { id: r.id, area: r.area, source: r.source, doc: r.doc, question: Q.get(r.id).question };
  for (const [name, col] of [["old", OLD], ["new", NEW]] as const) for (const mode of ["hybrid", "dense"] as const) {
    const hits = await retrieve(rec.question, { mode, topK: 15, scoreThreshold: -1, collection: col, documentScope: scope });
    rec[`${name}_${mode}`] = rankOf(hits.map((c) => c.chunkIndex), r.relevant);
    if (mode === "dense") rec[`${name}_gate`] = (hits[0]?.score ?? 0) >= GATE;
  }
  out.push(rec);
}
fs.writeFileSync(`${HERE}/header-test-v2b-results.jsonl`, out.map((r) => JSON.stringify(r)).join("\n") + "\n");
const summary: any = { chunks: total, minutes: +((Date.now() - t0) / 60000).toFixed(1), byArea: {} };
for (const a of ["1-tables", "2-topic", "3-wikipedia", "all"]) {
  const rs = out.filter((r) => a === "all" || r.area === a);
  const row: any = { questions: rs.length };
  for (const mode of ["hybrid", "dense"]) for (const k of [5, 15]) {
    const ok = (r: any, v: string) => r[`${v}_${mode}`] != null && r[`${v}_${mode}`] <= k;
    row[`${mode}_top${k}`] = `today ${rs.filter((r) => ok(r, "old")).length} | v2 ${rs.filter((r) => ok(r, "new")).length} (v2 vs today: fixed ${rs.filter((r) => ok(r, "new") && !ok(r, "old")).length}, broke ${rs.filter((r) => ok(r, "old") && !ok(r, "new")).length})`;
  }
  row.gateRefused = `${rs.filter((r) => !r.old_gate).length} -> ${rs.filter((r) => !r.new_gate).length}`;
  summary.byArea[a] = row;
}
fs.writeFileSync(`${HERE}/header-test-v2b-summary.json`, JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
