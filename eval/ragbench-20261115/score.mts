// Score search on the ordinary-documents DEV set: is a chunk holding the answer in the top 1 / 5 / 15?
// Search is the app's own retrieve() (hybrid and dense, topK 15) scoped to the question's own document,
// run with the gate OFF (scoreThreshold -1). "Gate on" = gate-off hit AND the best dense score >= 0.63,
// which is what the gate does for a single-document scope (checked against real gate-on calls on a sample).
// Labels (which chunks hold the answer):
//   financebench, nq: evidence passage, label.py 5-gram rule (same as the QASPER tests)
//   feta, tat:        chunk contains >= 60% of the answer's table cells / facts (at least 1)
// Questions with no labelled chunk are "unlocated" and left out of the percentages.
// Run (repo root): npx tsx eval/ragbench-20261115/score.mts   (works on whatever is ingested so far)
import fs from "node:fs";

const STATE = "X:/LocalCortex-ragbench/state";
const COLLECTION = "eval-ragbench-dev-20261115";
const QDRANT = "http://127.0.0.1:36333";
const HERE = "eval/ragbench-20261115";
Object.assign(process.env, {
  QDRANT_URL: QDRANT, OLLAMA_URL: "http://127.0.0.1:11434", QDRANT_COLLECTION: COLLECTION,
  DOC_STORE_PATH: `${STATE}/documents.json`, SPARSE_STATS_PATH: `${STATE}/sparse-stats.json`,
  OLLAMA_EMBED_MODEL: "nomic-embed-text", OLLAMA_EMBED_DIM: "768", OLLAMA_EMBED_PREFIXES: "1",
  RETRIEVE_FUSION: "rrf", RERANK_ENABLED: "0", CLOUDFLARE_API_TOKEN: "", CLOUDFLARE_ACCOUNT_ID: "",
});
for (const k of ["RETRIEVE_MODE", "RETRIEVE_SCORE_THRESHOLD", "RETRIEVE_TOP_K"]) delete process.env[k];
const { retrieve } = await import("../../src/retrieval/retriever.ts");
const { retrievalConfig } = await import("../../src/config.ts");
const GATE = retrievalConfig.scoreThreshold;
if (GATE !== 0.63) throw new Error("unexpected gate " + GATE);

const rows = fs.readFileSync(`${HERE}/dev.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const docId = new Map<string, string>(fs.readFileSync(`${STATE}/ingest-dev.jsonl`, "utf8").split("\n").filter(Boolean)
  .map((l) => JSON.parse(l)).filter((r) => r.ok).map((r) => [r.path, r.documentId]));
const jobs = rows.filter((r) => docId.has(r.path));

// ---- labels ----
const PH = /\b(?:BIBREF|TABREF|FIGREF|SECREF|EQREF|INLINEFORM|DISPLAYFORM)\d*\b/g;
const toks = (s: string) => (s.normalize("NFKC").replaceAll("\u00ad", "").replace(/-\s*\n\s*/g, "").toLowerCase().match(/[a-z0-9]+/g) ?? []);
function segments(text: string): string[][] {
  const out: string[][] = [];
  for (const part of text.trim().split(PH)) for (const sent of part.split(/(?<=[.!?;:])\s+|\s\|\s|\n\s*\n/)) { const t = toks(sent); if (t.length) out.push(t); }
  return out;
}
const N = 5;
const grams = (t: string[]) => { const s = new Set<string>(); for (let i = 0; i + N <= t.length; i++) s.add(t.slice(i, i + N).join(" ")); return s; };
function match(seg: string[], cg: Set<string>): boolean {
  if (seg.length < N) return false;
  const g = grams(seg); let hit = 0; for (const x of g) if (cg.has(x)) hit++;
  return (hit >= Math.max(1, Math.min(g.size, 4)) && hit / g.size >= 0.5) || hit >= 5;
}
function labels(q: any, texts: string[]): number[] {
  const ct = texts.map(toks);
  const rel = new Set<number>();
  if (q.source === "financebench" || q.source === "nq") {
    const cg = ct.map(grams);
    for (const e of q.evidence) for (const seg of segments(e)) cg.forEach((g, i) => { if (match(seg, g)) rel.add(i); });
  } else {
    const cells = [...new Set((q.evidence as string[]).map((c) => toks(c).join(" ")).filter(Boolean))];
    if (!cells.length) return [];
    const need = Math.max(1, Math.ceil(0.6 * cells.length));
    ct.forEach((t, i) => {
      const j = " " + t.join(" ") + " ";
      if (cells.filter((c) => j.includes(" " + c + " ")).length >= need) rel.add(i);
    });
  }
  return [...rel].sort((a, b) => a - b);
}

async function docChunks(documentId: string): Promise<Map<number, string>> {
  const out = new Map<number, string>(); let offset: unknown = null;
  do {
    const body: any = { limit: 1000, with_payload: ["chunkIndex", "text"], with_vector: false, filter: { must: [{ key: "documentId", match: { value: documentId } }] } };
    if (offset !== null) body.offset = offset;
    const r = await (await fetch(`${QDRANT}/collections/${COLLECTION}/points/scroll`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
    for (const p of r.result.points) out.set(p.payload.chunkIndex, p.payload.text);
    offset = r.result.next_page_offset ?? null;
  } while (offset !== null);
  return out;
}

const OUT = `${HERE}/dev-retrieval.jsonl`;
const prev = new Map<string, any>(fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).map((r) => [r.id, r]) : []);
const cache = new Map<string, Map<number, string>>();
let n = 0, gateChecks = 0, gateAgree = 0;
for (const q of jobs) {
  if (prev.has(q.id)) continue;
  const id = docId.get(q.path)!;
  if (!cache.has(id)) { cache.clear(); cache.set(id, await docChunks(id)); }
  const chunkMap = cache.get(id)!;
  const idx = [...chunkMap.keys()].sort((a, b) => a - b);
  const rel = labels(q, idx.map((i) => chunkMap.get(i)!)).map((k) => idx[k]);
  const scope = { status: "resolved" as const, references: [], documentIds: [id] };
  const hy = await retrieve(q.question, { mode: "hybrid", topK: 15, scoreThreshold: -1, collection: COLLECTION, documentScope: scope });
  const de = await retrieve(q.question, { mode: "dense", topK: 15, scoreThreshold: -1, collection: COLLECTION, documentScope: scope });
  const top1 = de[0]?.score ?? 0;
  if (n < 30) { // confirm the gate shortcut against real gate-on calls
    const g = await retrieve(q.question, { mode: "hybrid", topK: 15, collection: COLLECTION, documentScope: scope });
    gateChecks++; if ((g.length > 0) === (top1 >= GATE)) gateAgree++;
  }
  const rec = { id: q.id, source: q.source, doc: q.doc, chunks: idx.length, relevant: rel, top1Dense: +top1.toFixed(4),
    hybrid: hy.map((c) => c.chunkIndex), dense: de.map((c) => c.chunkIndex) };
  fs.appendFileSync(OUT, JSON.stringify(rec) + "\n");
  prev.set(q.id, rec);
  if (++n % 50 === 0) console.log(JSON.stringify({ scored: prev.size, of: rows.length }));
}

// ---- summary ----
const all = [...prev.values()];
const SOURCES = ["financebench", "nq", "feta", "tat", "all", "big:financebench", "big:nq", "big:feta", "big:tat", "big:all"]; // big: = documents with > 15 chunks
const rankOf = (list: number[], rel: number[]) => { const i = list.findIndex((c) => rel.includes(c)); return i < 0 ? null : i + 1; };
const summary: any = { gate: GATE, gateShortcutCheck: `${gateAgree}/${gateChecks}`, ingestedQuestions: jobs.length, devQuestions: rows.length, bySource: {} };
for (const s of SOURCES) {
  const big = s.startsWith("big:"), src = s.replace("big:", "");
  const rs = all.filter((r) => (src === "all" || r.source === src) && (!big || r.chunks > 15));
  const loc = rs.filter((r) => r.relevant.length);
  const row: any = { questions: rs.length, unlocated: rs.length - loc.length, scored: loc.length,
    gateRefused: loc.filter((r) => r.top1Dense < GATE).length };
  for (const mode of ["hybrid", "dense"]) for (const k of [1, 5, 15]) {
    const hits = loc.filter((r) => { const x = rankOf(r[mode], r.relevant); return x !== null && x <= k; });
    row[`${mode}_top${k}`] = hits.length;
    row[`${mode}_top${k}_gateOn`] = hits.filter((r) => r.top1Dense >= GATE).length;
  }
  summary.bySource[s] = row;
}
fs.writeFileSync(`${HERE}/dev-retrieval-summary.json`, JSON.stringify(summary, null, 1));
const pct = (a: number, b: number) => (b ? (100 * a / b).toFixed(1) + "%" : "-");
console.log(`gate shortcut check: ${summary.gateShortcutCheck}; scored ${all.length} of ${rows.length} dev questions (${jobs.length} have their PDF ingested)`);
console.log("source        q   unloc  gateRef | hybrid top1/5/15 (gate off) | hybrid top5/15 gate on | dense top1/5/15 (gate off) | dense top5/15 gate on");
for (const s of SOURCES) {
  const r = summary.bySource[s], d = r.scored;
  console.log(`${s.padEnd(12)} ${String(r.questions).padStart(4)} ${String(r.unlocated).padStart(5)} ${pct(r.gateRefused, d).padStart(7)} | ${pct(r.hybrid_top1, d)} / ${pct(r.hybrid_top5, d)} / ${pct(r.hybrid_top15, d)} | ${pct(r.hybrid_top5_gateOn, d)} / ${pct(r.hybrid_top15_gateOn, d)} | ${pct(r.dense_top1, d)} / ${pct(r.dense_top5, d)} / ${pct(r.dense_top15, d)} | ${pct(r.dense_top5_gateOn, d)} / ${pct(r.dense_top15_gateOn, d)}`);
}
