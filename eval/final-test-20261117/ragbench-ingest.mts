// FINAL TEST (approved one-off run, Nov 17): ingest the ordinary-PDF TEST documents exactly like ingest-dev.mts
// (app's ingestDocument: recursive 500, auto context headers, nomic + prefixes, dense+sparse) into a NEW collection.
// State lives in its own folder on X:, so dev state, data/documents.json and data/sparse-stats.json are never touched.
// Resumable. Run (repo root): npx tsx eval/final-test-20261117/ragbench-ingest.mts
import fs from "node:fs";
import path from "node:path";

const STATE = "X:/LocalCortex-ragbench/state/final-test-20261117";
export const COLLECTION = "eval-ragbench-test-20261117";
fs.mkdirSync(STATE, { recursive: true });
Object.assign(process.env, {
  QDRANT_URL: "http://127.0.0.1:36333", OLLAMA_URL: "http://127.0.0.1:11434", QDRANT_COLLECTION: COLLECTION,
  DOC_STORE_PATH: `${STATE}/documents.json`, SPARSE_STATS_PATH: `${STATE}/sparse-stats.json`,
  OLLAMA_EMBED_MODEL: "nomic-embed-text", OLLAMA_EMBED_DIM: "768", OLLAMA_EMBED_PREFIXES: "1",
});
for (const k of ["INGEST_CONTEXT_HEADERS"]) delete process.env[k];
const { ingestDocument } = await import("../../src/ingest/pipeline.ts");

const rows = fs.readFileSync("eval/ragbench-20261115/test.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const files = [...new Set(rows.map((r) => r.path as string))];
for (const f of files) if (!f.includes("/docs/test/")) throw new Error("non-test file refused: " + f);

const LOG = `${STATE}/ingest-test.jsonl`;
const done = new Map<string, any>(fs.existsSync(LOG)
  ? fs.readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ok).map((r) => [r.path, r])
  : []);
const todo = files.filter((f) => !done.has(f)).sort((a, b) => fs.statSync(a).size - fs.statSync(b).size);
console.log(JSON.stringify({ files: files.length, alreadyDone: done.size, now: todo.length, collection: COLLECTION, at: new Date().toISOString() }));
const t0 = Date.now();
let chunks = 0, n = 0;
const origLog = console.log;
for (const f of todo) {
  const t = Date.now();
  console.log = () => {};
  let res: any;
  try {
    for (let a = 1; ; a++) {
      res = await ingestDocument(f, { collection: COLLECTION, originalName: path.basename(f) });
      if (res.success || a >= 3) break;
      await new Promise((r) => setTimeout(r, 5000 * a)); // ingestDocument cleans up a failed attempt itself
    }
  } finally { console.log = origLog; }
  const rec = res.success
    ? { path: f, ok: true, documentId: res.documentId, chunkCount: res.chunkCount, ms: Date.now() - t }
    : { path: f, ok: false, stage: res.stage, error: res.error, ms: Date.now() - t };
  fs.appendFileSync(LOG, JSON.stringify(rec) + "\n");
  n++; if (res.success) chunks += res.chunkCount;
  if (!res.success || n % 10 === 0 || n === todo.length)
    console.log(JSON.stringify({ done: done.size + n, of: files.length, lastOk: res.success, ...(res.success ? {} : { stage: rec.stage, error: String(rec.error).slice(0, 200), file: path.basename(f) }),
      chunksThisRun: chunks, chunksPerSec: +(chunks / ((Date.now() - t0) / 1000)).toFixed(1), minutes: +((Date.now() - t0) / 60000).toFixed(1) }));
}
console.log(JSON.stringify({ finished: true, at: new Date().toISOString() }));
