// Quick header test (~20 min): does "Title › Subheading" on long documents find the answer chunk more often?
// Title = first line of the PDF (today's rule, documentTitle()); Subheading = nearest heading-like line ABOVE the chunk.
// Same chunks as the dev collection (re-used, not re-read from the PDFs). Two throwaway collections:
//   old = today's points copied with their vectors;  new = same chunks re-embedded with the new header.
// Both hold the same documents, so keyword (IDF) weights are comparable. Dev set only.
// Run (repo root): npx tsx eval/ragbench-20261115/header-test.mts
import fs from "node:fs";

const STATE = "X:/LocalCortex-ragbench/state";
const SRC = "eval-ragbench-dev-20261115";
const OLD = "eval-hdr-old-20261115", NEW = "eval-hdr-new-20261115";
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
const { documentTitle, contextHeader } = await import("../../src/ingest/chunker.ts");
const GATE = 0.63;

// ---- selection: area 1 = statement-table questions, area 2 = topic questions, area 3 = Wikipedia check ----
const PICK: Record<string, string[]> = {
  financebench: ["FOOTLOCKER_2022_8K_dated-2022-05-20", "AMCOR_2022_8K_dated-2022-07-01", "AMCOR_2023Q4_EARNINGS",
    "MGMRESORTS_2022Q4_EARNINGS", "JOHNSON_JOHNSON_2023_8K_dated-2023-08-30", "BESTBUY_2024Q2_10Q", "BESTBUY_2023_10K"],
  tat: ["clearfield-inc_2019", "altium-limited_2019", "agilysys-inc_2019"],
};
const rows = fs.readFileSync(`${HERE}/dev.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const Q = new Map(rows.map((r) => [r.id, r]));
const base = fs.readFileSync(`${HERE}/dev-retrieval.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
  .filter((r) => r.relevant.length);
const area = (r: any) => r.source === "financebench" ? (Q.get(r.id).meta.type === "novel-generated" ? "2-topic" : "1-tables")
  : r.source === "tat" ? "1-tables" : "3-wikipedia";
// FinanceBench doc names may be truncated in PICK; match by prefix.
const picked = (r: any) => (PICK[r.source] ?? []).some((d) => r.doc.startsWith(d.slice(0, 30)));
let chosen = base.filter(picked);
// Wikipedia: 4 nq + 4 feta documents with 16-80 chunks, chosen by a fixed hash of the name, 1 question each.
const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
for (const src of ["nq", "feta"]) {
  const docs = [...new Set(base.filter((r) => r.source === src && r.chunks > 15 && r.chunks <= 80).map((r) => r.doc))].sort((a, b) => h(a) - h(b)).slice(0, 4);
  for (const d of docs) chosen.push(base.find((r) => r.source === src && r.doc === d));
}
const docId = new Map<string, string>(fs.readFileSync(`${STATE}/ingest-dev.jsonl`, "utf8").split("\n").filter(Boolean)
  .map((l) => JSON.parse(l)).filter((r) => r.ok).map((r) => [r.path, r.documentId]));
const docs = [...new Set(chosen.map((r) => docId.get(Q.get(r.id).path)!))];

// ---- heading-like line rule ----
function headingLines(lines: string[], freq: Map<string, number>): boolean[] {
  return lines.map((raw) => {
    const l = raw.trim();
    if (l.length < 4 || l.length > 80) return false;
    if ((freq.get(l) ?? 0) >= 5) return false;                 // repeats on many pages: page furniture ("Table of Contents")
    const itemLike = /^(item|note|part)\s+\d+[a-z]?\b/i.test(l); // "Item 7.", "Note 4 — Acquisitions"
    if (!itemLike && /\d/.test(l)) return false;                 // table rows and dates carry numbers
    if (!itemLike && /[.,;:]$/.test(l)) return false;            // sentences / run-on lines
    if (/^total\b/i.test(l)) return false;
    const words = l.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
    if (!words.length) return false;
    const allCaps = l === l.toUpperCase() && /[A-Z]{4,}/.test(l);
    if (words.length < 2 && !allCaps && !itemLike) return false;
    const big = words.filter((w) => w.replace(/[^A-Za-z]/g, "").length >= 4);
    const titled = big.length > 0 && big.filter((w) => /^[A-Z]/.test(w.replace(/^[^A-Za-z]+/, ""))).length / big.length >= 0.7;
    return itemLike || allCaps || titled;
  });
}

// ---- copy old points, build new headers ----
async function scroll(id: string) {
  const out: any[] = []; let offset: unknown = null;
  do {
    const body: any = { limit: 512, with_payload: true, with_vector: true, filter: { must: [{ key: "documentId", match: { value: id } }] } };
    if (offset !== null) body.offset = offset;
    const r = await (await fetch(`${QDRANT}/collections/${SRC}/points/scroll`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
    out.push(...r.result.points); offset = r.result.next_page_offset ?? null;
  } while (offset !== null);
  return out.sort((a, b) => a.payload.chunkIndex - b.payload.chunkIndex);
}
for (const c of [OLD, NEW]) await fetch(`${QDRANT}/collections/${c}`, { method: "DELETE" });
await ensureCollection(OLD); await ensureCollection(NEW);
const avg = await getAvgDocLength();
const t0 = Date.now();
let total = 0;
const samples: any[] = [];
for (const id of docs) {
  const pts = await scroll(id);
  await upsertChunks(OLD, pts.map((p) => ({ id: p.id, denseVector: p.vector.dense, sparseVector: p.vector.sparse, payload: p.payload })));
  const title = documentTitle(pts[0].payload.text, pts[0].payload.source.replace(/\.pdf$/i, ""));
  const allLines = pts.flatMap((p) => p.payload.text.split("\n").map((l: string) => l.trim()));
  const freq = new Map<string, number>(); for (const l of allLines) freq.set(l, (freq.get(l) ?? 0) + 1);
  let current = "";
  const headers = pts.map((p) => {
    const sub = current; // nearest heading-like line above this chunk
    const lines = p.payload.text.split("\n");
    headingLines(lines, freq).forEach((isH, i) => { if (isH) current = lines[i].trim(); });
    return contextHeader(title, sub ? [sub] : []);
  });
  const texts = pts.map((p, i) => `${headers[i]}\n\n${p.payload.text}`);
  const vecs = await embedBatch(texts, 8);
  await upsertChunks(NEW, pts.map((p, i) => ({ id: p.id, denseVector: vecs[i], sparseVector: sparseVectorFor(texts[i], avg),
    payload: { ...p.payload, section: headers[i] } })));
  total += pts.length;
  const step = Math.max(1, Math.floor(pts.length / 4));
  samples.push({ doc: pts[0].payload.source, title, headers: [0, step, 2 * step, 3 * step].map((i) => `#${i}: ${headers[i]}`) });
  console.log(JSON.stringify({ doc: pts[0].payload.source, chunks: pts.length, totalChunks: total, minutes: +((Date.now() - t0) / 60000).toFixed(1) }));
}

// ---- score both ----
const rankOf = (list: number[], rel: number[]) => { const i = list.findIndex((c) => rel.includes(c)); return i < 0 ? null : i + 1; };
const out: any[] = [];
for (const r of chosen) {
  const id = docId.get(Q.get(r.id).path)!;
  const scope = { status: "resolved" as const, references: [], documentIds: [id] };
  const rec: any = { id: r.id, area: area(r), source: r.source, doc: r.doc, question: Q.get(r.id).question };
  for (const [name, col] of [["old", OLD], ["new", NEW]]) {
    for (const mode of ["hybrid", "dense"] as const) {
      const hits = await retrieve(rec.question, { mode, topK: 15, scoreThreshold: -1, collection: col, documentScope: scope });
      rec[`${name}_${mode}`] = rankOf(hits.map((c) => c.chunkIndex), r.relevant);
      if (mode === "dense") rec[`${name}_gate`] = (hits[0]?.score ?? 0) >= GATE;
    }
  }
  out.push(rec);
}
fs.writeFileSync(`${HERE}/header-test-results.jsonl`, out.map((r) => JSON.stringify(r)).join("\n") + "\n");
const summary: any = { chunks: total, minutes: +((Date.now() - t0) / 60000).toFixed(1), samples, byArea: {} };
for (const a of ["1-tables", "2-topic", "3-wikipedia", "all"]) {
  const rs = out.filter((r) => a === "all" || r.area === a);
  const row: any = { questions: rs.length };
  for (const mode of ["hybrid", "dense"]) for (const k of [5, 15]) {
    const ok = (r: any, v: string) => r[`${v}_${mode}`] !== null && r[`${v}_${mode}`] <= k;
    row[`${mode}_top${k}`] = `${rs.filter((r) => ok(r, "old")).length} -> ${rs.filter((r) => ok(r, "new")).length} (fixed ${rs.filter((r) => ok(r, "new") && !ok(r, "old")).length}, broke ${rs.filter((r) => ok(r, "old") && !ok(r, "new")).length})`;
  }
  row.gateRefused = `${rs.filter((r) => !r.old_gate).length} -> ${rs.filter((r) => !r.new_gate).length}`;
  summary.byArea[a] = row;
}
fs.writeFileSync(`${HERE}/header-test-summary.json`, JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
