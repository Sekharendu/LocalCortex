// Hybrid as the app default, gate ON (threshold 0.63 from config), topK 15, inside each question's own dev paper.
// "default" = retrieve() called with no mode (config default, now hybrid); "dense" = explicit mode for comparison.
// Retrieval only, dev papers only. Run from repo root: npx tsx eval/scenario1-hybrid-default-20261113/run.mjs pdf|docx
import fs from 'node:fs';
const base = 'eval/scenario1-hybrid-default-20261113';
const format = process.argv[2]; const K = Number(process.argv[3] ?? 15);
if (!['pdf', 'docx'].includes(format)) throw Error('usage: run.mjs pdf|docx');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const rows = f => fs.readFileSync(f, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const split = read('eval/split.json');
const inventory = rows('eval/dev-set-preparation-20261103/inventory.jsonl');
for (const q of inventory) if (!split.dev.includes(q.paperId) || split.test.includes(q.paperId)) throw Error('Non-dev case denied');
const jobs = inventory.filter(q => q.format === format);
const snapshot = new Map(rows('eval/dev-set-preparation-20261103/source-chunks.jsonl')
  .filter(a => a.asset.startsWith(format + '/')).map(a => [a.documentId, new Map(a.chunks.map(c => [c.chunkIndex, c.text]))]));
const qdrant = 'http://127.0.0.1:36333', ollama = 'http://127.0.0.1:11434';
const collection = read('eval/runs/seed42/production-manifest.json').collections[format];
const stats = `C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-scoped-hybrid-r4/${format}/sparse-stats.json`;
for (const k of ['RETRIEVE_MODE', 'RETRIEVE_SCORE_THRESHOLD', 'RETRIEVE_TOP_K']) delete process.env[k];
Object.assign(process.env, { QDRANT_URL: qdrant, OLLAMA_URL: ollama, QDRANT_COLLECTION: collection, SPARSE_STATS_PATH: stats,
  OLLAMA_EMBED_MODEL: 'nomic-embed-text', OLLAMA_EMBED_DIM: '768', OLLAMA_EMBED_PREFIXES: '1',
  RETRIEVE_FUSION: 'rrf', RERANK_ENABLED: '0', CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_ACCOUNT_ID: '' });
const originalFetch = globalThis.fetch;
let active = null;
const checkFilter = part => {
  const m = part.filter?.must?.filter(c => c.key === 'documentId') ?? [];
  if (!m.length || m.some(c => JSON.stringify(c.match?.any ?? [c.match?.value]) !== JSON.stringify([active.documentId]))) throw Error('Search escaped the selected dev paper');
  for (const p of part.prefetch ?? []) checkFilter(p);
};
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init), u = new URL(request.url);
  if (!active) throw Error('Network outside an active case denied');
  if (u.origin === ollama && u.pathname === '/api/embed') return originalFetch(request);
  if (u.origin !== qdrant || u.pathname !== `/collections/${collection}/points/query`) throw Error('Non-retrieval request denied: ' + u.pathname);
  checkFilter(await request.clone().json());
  const r = await originalFetch(request);
  for (const p of (await r.clone().json()).result?.points ?? []) {
    if (p.payload?.documentId !== active.documentId) throw Error('Wrong paper returned');
    if (snapshot.get(active.documentId).get(p.payload.chunkIndex) !== p.payload.text) throw Error('Live chunk differs from frozen dev snapshot');
  }
  return r;
};
const { retrieve } = await import('../../src/retrieval/retriever.ts');
const { retrievalConfig } = await import('../../src/config.ts');
if (retrievalConfig.mode !== 'hybrid' || retrievalConfig.scoreThreshold !== 0.63 || retrievalConfig.topK !== 15) throw Error('defaults not hybrid/0.63/15');
const out = K === 15 ? `${base}/${format}.results.jsonl` : `${base}/${format}.top${K}.results.jsonl`;
fs.writeFileSync(out, '');
let n = 0;
for (const q of jobs) {
  active = q;
  for (const label of ['default', 'dense']) {
    const t = performance.now();
    const chunks = await retrieve(q.question, { ...(label === "dense" ? { mode: "dense" } : {}), topK: K, collection,
      documentScope: { status: 'resolved', references: [], documentIds: [q.documentId] } });
    fs.appendFileSync(out, JSON.stringify({ caseId: q.caseId, format, label, gateRejected: chunks.length === 0,
      top: chunks.map(c => ({ chunkIndex: c.chunkIndex, score: c.score })), elapsedMs: Math.round(performance.now() - t) }) + '\n');
  }
  if (++n % 100 === 0) console.log(JSON.stringify({ format, done: n, of: jobs.length }));
}
active = null; globalThis.fetch = originalFetch;
console.log(JSON.stringify({ format, finished: n }));
