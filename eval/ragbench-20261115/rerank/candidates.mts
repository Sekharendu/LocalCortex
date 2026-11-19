// Step 1 of the rerank test on the ordinary-PDF dev set (541 labelled questions).
// Saves today's search top 20 (hybrid and dense, gate off, own document only) with chunk text, from the
// collection the app ingested (eval-ragbench-dev-20261115). No embedding of documents, no Cloudflare.
// Run (repo root): npx tsx eval/ragbench-20261115/rerank/candidates.mts
import fs from "node:fs";
const STATE = "X:/LocalCortex-ragbench/state";
const SRC = "eval-ragbench-dev-20261115";
const HERE = "eval/ragbench-20261115";
Object.assign(process.env, {
  QDRANT_URL: "http://127.0.0.1:36333", OLLAMA_URL: "http://127.0.0.1:11434", QDRANT_COLLECTION: SRC,
  DOC_STORE_PATH: `${STATE}/documents.json`, SPARSE_STATS_PATH: `${STATE}/sparse-stats.json`,
  OLLAMA_EMBED_MODEL: "nomic-embed-text", OLLAMA_EMBED_DIM: "768", OLLAMA_EMBED_PREFIXES: "1",
  RETRIEVE_FUSION: "rrf", RERANK_ENABLED: "0", CLOUDFLARE_API_TOKEN: "", CLOUDFLARE_ACCOUNT_ID: "",
});
for (const k of ["RETRIEVE_MODE", "RETRIEVE_SCORE_THRESHOLD", "RETRIEVE_TOP_K"]) delete process.env[k];
const { retrieve } = await import("../../../src/retrieval/retriever.ts");
const { expandAcronyms } = await import("../../../src/retrieval/acronyms.ts");

const jl = (p: string) => fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const Q = new Map<string, any>(jl(`${HERE}/dev.jsonl`).map((r) => [r.id, r]));
const areaOf = (r: any) => r.source === "financebench" ? (Q.get(r.id).meta?.type === "novel-generated" ? "2-topic" : "1-tables") : r.source === "tat" ? "1-tables" : "3-wikipedia";
const chosen = jl(`${HERE}/dev-retrieval.jsonl`).filter((r) => r.relevant.length);
const docId = new Map<string, string>(jl(`${STATE}/ingest-dev.jsonl`).filter((r) => r.ok).map((r) => [r.path, r.documentId]));
const out = fs.createWriteStream(`${HERE}/rerank/candidates.jsonl`);
let n = 0;
for (const r of chosen) {
  const q = Q.get(r.id);
  if (!q.path.includes("/docs/dev/")) throw new Error("non-dev " + q.path);
  const scope = { status: "resolved" as const, references: [], documentIds: [docId.get(q.path)!] };
  const rec: any = { id: r.id, source: r.source, area: areaOf(r), question: q.question, query: expandAcronyms(q.question), relevant: r.relevant, texts: {} };
  for (const mode of ["hybrid", "dense"] as const) {
    const hits = await retrieve(q.question, { mode, topK: 20, scoreThreshold: -1, documentScope: scope } as any);
    rec[mode] = hits.map((h: any) => h.chunkIndex);
    if (mode === "dense") rec.topDense = hits[0]?.score ?? null;
    for (const h of hits as any[]) rec.texts[h.chunkIndex] = h.text;
  }
  out.write(JSON.stringify(rec) + "\n");
  if (++n % 100 === 0) console.log(n);
}
out.end();
console.log(JSON.stringify({ written: n }));
