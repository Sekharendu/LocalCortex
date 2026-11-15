// Ingest the DEV PDFs of the ordinary-documents benchmark with the app's own ingestDocument()
// (recursive 500, auto context headers, nomic + prefixes, dense+sparse) into a NEW collection in the
// evaluation Qdrant (127.0.0.1:36333). Test PDFs are refused. Resumable: done files are listed in
// X:/LocalCortex-ragbench/state/ingest-dev.jsonl. Document store + sparse stats live on X:, so
// data/documents.json and data/sparse-stats.json are never touched.
// Run (repo root): npx tsx eval/ragbench-20261115/ingest-dev.mts [--limit N]
import fs from "node:fs";
import path from "node:path";

const STATE = "X:/LocalCortex-ragbench/state";
export const COLLECTION = "eval-ragbench-dev-20261115";
fs.mkdirSync(STATE, { recursive: true });
Object.assign(process.env, {
  QDRANT_URL: "http://127.0.0.1:36333", OLLAMA_URL: "http://127.0.0.1:11434", QDRANT_COLLECTION: COLLECTION,
  DOC_STORE_PATH: `${STATE}/documents.json`, SPARSE_STATS_PATH: `${STATE}/sparse-stats.json`,
  OLLAMA_EMBED_MODEL: "nomic-embed-text", OLLAMA_EMBED_DIM: "768", OLLAMA_EMBED_PREFIXES: "1",
});
for (const k of ["INGEST_CONTEXT_HEADERS"]) delete process.env[k];
const { ingestDocument } = await import("../../src/ingest/pipeline.ts");

const rows = fs.readFileSync("eval/ragbench-20261115/dev.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const testRows = fs.readFileSync("eval/ragbench-20261115/split.json", "utf8"); // only for the guard below
const files = [...new Set(rows.map((r) => r.path as string))];
for (const f of files) if (!f.includes("/docs/dev/")) throw new Error("non-dev file refused: " + f);
void testRows;

const LOG = `${STATE}/ingest-dev.jsonl`;
const done = new Map<string, any>(fs.existsSync(LOG)
  ? fs.readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ok).map((r) => [r.path, r])
  : []);
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;

// Small files first so progress is visible early; FinanceBench filings are the big ones.
const todo = files.filter((f) => !done.has(f)).sort((a, b) => fs.statSync(a).size - fs.statSync(b).size).slice(0, limit);
console.log(JSON.stringify({ files: files.length, alreadyDone: done.size, now: todo.length, collection: COLLECTION }));
const t0 = Date.now();
let chunks = 0, n = 0;
const origLog = console.log;
for (const f of todo) {
  const t = Date.now();
  console.log = () => {}; // silence per-stage [ingest] lines
  let res;
  try { res = await ingestDocument(f, { collection: COLLECTION, originalName: path.basename(f) }); }
  finally { console.log = origLog; }
  const rec = res.success
    ? { path: f, ok: true, documentId: res.documentId, chunkCount: res.chunkCount, ms: Date.now() - t }
    : { path: f, ok: false, stage: res.stage, error: res.error, ms: Date.now() - t };
  fs.appendFileSync(LOG, JSON.stringify(rec) + "\n");
  n++; if (res.success) chunks += res.chunkCount;
  if (!res.success || n % 10 === 0 || n === todo.length)
    console.log(JSON.stringify({ done: done.size + n, of: files.length, lastOk: res.success, ...(res.success ? {} : { stage: rec.stage, error: String(rec.error).slice(0, 200), file: path.basename(f) }),
      chunksThisRun: chunks, chunksPerSec: +(chunks / ((Date.now() - t0) / 1000)).toFixed(1), minutes: +((Date.now() - t0) / 60000).toFixed(1) }));
}
console.log(JSON.stringify({ finished: true }));
