// FINAL TEST (approved one-off run, Nov 17): today's search top 20 for each held-out TEST question.
// App's own retrieve(), hybrid (rrf), topK 20, gate OFF (scoreThreshold -1), documentScope = the question's own document.
// Plus a dense topK-1 call for the gate shortcut (best dense score >= 0.63), as score.mts does.
// Ordinary PDFs: labels computed here with score.mts's labels() rules, unchanged.
// QASPER: labels from qasper-labels.py (label.py rules); test points are read from the existing 871-case collections.
// Resumable: one line per question in candidates-SET.jsonl.
// Run (repo root): npx tsx eval/final-test-20261117/candidates.mts ragbench | qasper pdf | qasper docx
import fs from "node:fs";
const HERE = "eval/final-test-20261117";
const QDRANT = "http://127.0.0.1:36333";
const [SET, FORMAT] = process.argv.slice(2);
const STATE = "X:/LocalCortex-ragbench/state/final-test-20261117";
if (SET !== "ragbench" && !(SET === "qasper" && ["pdf", "docx"].includes(FORMAT))) throw new Error("usage: ragbench | qasper pdf|docx");
const collection = SET === "ragbench" ? "eval-ragbench-test-20261117" : `eval-qasper-full2-20261028-primary-r3-${FORMAT}`;
const stats = SET === "ragbench" ? `${STATE}/sparse-stats.json`
  : `C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-scoped-hybrid-r4/${FORMAT}/sparse-stats.json`;
Object.assign(process.env, {
  QDRANT_URL: QDRANT, OLLAMA_URL: "http://127.0.0.1:11434", QDRANT_COLLECTION: collection,
  DOC_STORE_PATH: `${STATE}/documents.json`, SPARSE_STATS_PATH: stats,
  OLLAMA_EMBED_MODEL: "nomic-embed-text", OLLAMA_EMBED_DIM: "768", OLLAMA_EMBED_PREFIXES: "1",
  RETRIEVE_FUSION: "rrf", RERANK_ENABLED: "0", CLOUDFLARE_API_TOKEN: "", CLOUDFLARE_ACCOUNT_ID: "",
});
for (const k of ["RETRIEVE_MODE", "RETRIEVE_SCORE_THRESHOLD", "RETRIEVE_TOP_K"]) delete process.env[k];
const { retrieve } = await import("../../src/retrieval/retriever.ts");
const { expandAcronyms } = await import("../../src/retrieval/acronyms.ts");
const jl = (p: string) => fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

async function retry<T>(f: () => Promise<T>, tries = 8): Promise<T> {
  for (let a = 1; ; a++) {
    try { return await f(); } catch (e) {
      if (a >= tries) throw e;
      console.log("retry", a, String(e).slice(0, 120));
      await new Promise((r) => setTimeout(r, 5000 * a));
    }
  }
}

// ---- score.mts labels(), unchanged ----
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
    const r: any = await retry(async () => {
      const x = await fetch(`${QDRANT}/collections/${collection}/points/scroll`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!x.ok) throw new Error("scroll " + x.status);
      return x.json();
    });
    for (const p of r.result.points) out.set(p.payload.chunkIndex, p.payload.text);
    offset = r.result.next_page_offset ?? null;
  } while (offset !== null);
  return out;
}

// ---- jobs ----
type Job = { id: string; group: string; source: string; format: string; documentId: string; question: string; relevant: number[] | null; q?: any };
const jobs: Job[] = [];
if (SET === "ragbench") {
  const docId = new Map<string, string>(jl(`${STATE}/ingest-test.jsonl`).filter((r) => r.ok).map((r) => [r.path, r.documentId]));
  for (const q of jl("eval/ragbench-20261115/test.jsonl")) {
    if (!q.path.includes("/docs/test/")) throw new Error("non-test " + q.path);
    jobs.push({ id: q.id, group: "", source: q.source, format: "pdf", documentId: docId.get(q.path) ?? "", question: q.question, relevant: null, q });
  }
  const missing = jobs.filter((j) => !j.documentId).length;
  if (missing) console.log(JSON.stringify({ warning: "questions whose PDF is not ingested", missing }));
} else {
  for (const l of jl(`${HERE}/qasper-labels.jsonl`)) if (l.format === FORMAT)
    jobs.push({ id: l.caseId, group: l.group, source: "qasper", format: l.format, documentId: l.documentId, question: l.question, relevant: l.relevantChunks });
}
const OUT = SET === "ragbench" ? `${HERE}/candidates-ragbench.jsonl` : `${HERE}/candidates-qasper-${FORMAT}.jsonl`;
const done = new Set(fs.existsSync(OUT) ? jl(OUT).map((r) => r.id) : []);
let cacheId = "", cache = new Map<number, string>(), n = 0;
const t0 = Date.now();
for (const j of jobs) {
  if (done.has(j.id) || !j.documentId) continue;
  let relevant = j.relevant, chunks: number | undefined;
  if (SET === "ragbench") {
    if (cacheId !== j.documentId) { cache = await docChunks(j.documentId); cacheId = j.documentId; }
    const idx = [...cache.keys()].sort((a, b) => a - b);
    relevant = labels(j.q, idx.map((i) => cache.get(i)!)).map((k) => idx[k]);
    chunks = idx.length;
    j.group = relevant.length ? "answerable" : "unlocated";
  }
  const scope = { status: "resolved" as const, references: [], documentIds: [j.documentId] };
  const hy: any[] = await retry(() => retrieve(j.question, { mode: "hybrid", topK: 20, scoreThreshold: -1, collection, documentScope: scope } as any));
  const de: any[] = await retry(() => retrieve(j.question, { mode: "dense", topK: 1, scoreThreshold: -1, collection, documentScope: scope } as any));
  if (hy.some((h) => h.documentId !== j.documentId)) throw new Error("search escaped the document " + j.id);
  const rec = { id: j.id, set: SET, source: j.source, format: j.format, group: j.group, documentId: j.documentId, chunks,
    question: j.question, query: expandAcronyms(j.question), relevant, topDense: de[0]?.score ?? null,
    hybrid: hy.map((h) => h.chunkIndex), texts: Object.fromEntries(hy.map((h) => [h.chunkIndex, h.text])) };
  fs.appendFileSync(OUT, JSON.stringify(rec) + "\n");
  if (++n % 25 === 0) console.log(JSON.stringify({ set: SET, format: FORMAT, done: done.size + n, of: jobs.length, sec: Math.round((Date.now() - t0) / 1000) }));
}
console.log(JSON.stringify({ finished: true, set: SET, format: FORMAT, wroteThisRun: n, total: done.size + n, of: jobs.length }));
