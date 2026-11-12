// Scenario 1: per-question top-5 retrieval inside the question's own dev paper, dense and hybrid.
// Retrieval only: no generation, no reranking, no Cloudflare. Dev papers only. Writes only into this folder.
// Run from the repository root:  node eval/scenario1-top5-mrr-20261112/run.mjs pdf   then   ... docx
import fs from 'node:fs';
import crypto from 'node:crypto';
const base = 'eval/scenario1-top5-mrr-20261112';
const format = process.argv[2];
if (!['pdf', 'docx'].includes(format)) throw Error('Usage: node eval/scenario1-top5-mrr-20261112/run.mjs pdf|docx');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const rows = f => fs.readFileSync(f, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const split = read('eval/split.json');
const frozen = read('eval/runs/seed42/production-manifest.json');
const inventory = rows('eval/dev-set-preparation-20261103/inventory.jsonl');
for (const q of inventory) if (!split.dev.includes(q.paperId) || split.test.includes(q.paperId)) throw Error('Non-dev case denied');
const jobs = inventory.filter(q => q.format === format);
const snapshot = new Map(rows('eval/dev-set-preparation-20261103/source-chunks.jsonl')
  .filter(a => a.asset.startsWith(format + '/')).map(a => [a.documentId, new Map(a.chunks.map(c => [c.chunkIndex, c.text]))]));
if (jobs.some(q => !snapshot.has(q.documentId))) throw Error('Missing dev chunk snapshot');
const qdrant = process.env.EVAL_QDRANT_URL ?? 'http://127.0.0.1:36333', ollama = process.env.EVAL_OLLAMA_URL ?? 'http://127.0.0.1:11434';
const collection = frozen.collections[format];
const stats = `C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-scoped-hybrid-r4/${format}/sparse-stats.json`;
Object.assign(process.env, { QDRANT_URL: qdrant, OLLAMA_URL: ollama, QDRANT_COLLECTION: collection, SPARSE_STATS_PATH: stats,
  OLLAMA_EMBED_MODEL: 'nomic-embed-text', OLLAMA_EMBED_DIM: '768', OLLAMA_EMBED_PREFIXES: '1', RETRIEVE_SCORE_THRESHOLD: '0.63',
  RETRIEVE_FUSION: 'rrf', RERANK_ENABLED: '0', CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_ACCOUNT_ID: '' });
const inputs = ['eval/split.json', 'eval/dev-set-preparation-20261103/inventory.jsonl', 'eval/dev-set-preparation-20261103/source-chunks.jsonl',
  'src/config.ts', 'src/retrieval/retriever.ts', 'src/retrieval/vectorStore.ts', 'src/retrieval/embedder.ts', 'src/retrieval/sparse.ts',
  'src/retrieval/sparseStats.ts', 'src/retrieval/acronyms.ts', stats];
const hashes = inputs.map(file => ({ file, sha256: sha(fs.readFileSync(file)) }));
const manifest = { format, collection, cases: jobs.length, modes: ['dense', 'hybrid'], topK: 5, threshold: 0.63, fusion: 'rrf',
  prefixes: true, reranking: false, generationCalls: 0, hashes,
  query: 'Original question (normal acronym expansion), no title wrapper, no rewrite. documentScope = only this case\'s own dev document.' };
const mf = `${base}/${format}.manifest.json`;
if (fs.existsSync(mf)) { if (JSON.stringify(read(mf)) !== JSON.stringify(manifest)) throw Error('Inputs changed since an earlier partial run; inspect before resuming'); }
else fs.writeFileSync(mf, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
const output = `${base}/${format}.results.jsonl`;
const done = new Set(fs.existsSync(output) ? rows(output).map(r => `${r.caseId}:${r.mode}`) : []);
const originalFetch = globalThis.fetch;
let active = null, cache = new Map();
const counts = { embeddingCalls: 0, reusedEmbeddings: 0, qdrantQueries: 0, generationCalls: 0 };
function checkFilter(part) {
  const m = part.filter?.must?.filter(c => c.key === 'documentId') ?? [];
  if (!m.length || m.some(c => JSON.stringify(c.match?.any ?? [c.match?.value]) !== JSON.stringify([active.documentId]))) throw Error('Search escaped the selected dev paper');
  for (const p of part.prefetch ?? []) checkFilter(p);
}
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init), u = new URL(request.url);
  if (!active) throw Error('Network outside an active case denied');
  if (u.origin === ollama && u.pathname === '/api/embed' && request.method === 'POST') {
    const body = await request.clone().json();
    if (body.model !== 'nomic-embed-text' || body.input !== 'search_query: ' + expandAcronyms(active.question)) throw Error('Embedding text changed');
    const key = JSON.stringify(body);
    if (cache.has(key)) { counts.reusedEmbeddings++; return new Response(cache.get(key), { headers: { 'content-type': 'application/json' } }); }
    counts.embeddingCalls++;
    const r = await originalFetch(request, { signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw Error('Embedding HTTP ' + r.status);
    const text = await r.text(); cache.set(key, text);
    return new Response(text, { headers: { 'content-type': 'application/json' } });
  }
  if (u.origin !== qdrant || request.method !== 'POST' || u.pathname !== `/collections/${collection}/points/query`) throw Error('Non-retrieval request denied: ' + u.pathname);
  checkFilter(await request.clone().json()); counts.qdrantQueries++;
  const r = await originalFetch(request, { signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw Error('Qdrant HTTP ' + r.status);
  for (const p of (await r.clone().json()).result?.points ?? []) {
    if (p.payload?.documentId !== active.documentId) throw Error('Wrong paper returned');
    if (snapshot.get(active.documentId).get(p.payload.chunkIndex) !== p.payload.text) throw Error('Live chunk differs from frozen dev snapshot');
  }
  return r;
};
const { expandAcronyms } = await import('../../src/retrieval/acronyms.ts');
const { retrieve } = await import('../../src/retrieval/retriever.ts');
let error = null;
try {
  for (const url of [`${qdrant}/readyz`, `${ollama}/api/tags`]) {
    const r = await originalFetch(url, { signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (!r?.ok) throw Error(`Service not reachable: ${url} (start the evaluation Qdrant on port 36333 and Ollama first)`);
  }
  let n = 0;
  for (const q of jobs) {
    active = q; cache = new Map();
    for (const mode of ['dense', 'hybrid']) {
      if (done.has(`${q.caseId}:${mode}`)) continue;
      const t = performance.now();
      const chunks = await retrieve(q.question, { mode, topK: 5, collection, scoreThreshold: 0.63,
        documentScope: { status: 'resolved', references: [], documentIds: [q.documentId] } });
      fs.appendFileSync(output, JSON.stringify({ caseId: q.caseId, paperId: q.paperId, format, mode, question: q.question,
        gateRejected: chunks.length === 0, top5: chunks.map(c => ({ chunkIndex: c.chunkIndex, score: c.score, page: c.page })),
        elapsedMs: Math.round(performance.now() - t) }) + '\n');
      done.add(`${q.caseId}:${mode}`);
    }
    if (++n % 25 === 0) console.log(JSON.stringify({ format, cases: n, of: jobs.length, ...counts }));
  }
} catch (e) { error = `${e.name}: ${e.message}`; console.error(error); }
finally {
  globalThis.fetch = originalFetch; active = null; cache.clear();
  const changed = hashes.filter(h => sha(fs.readFileSync(h.file)) !== h.sha256).map(h => h.file);
  const status = { format, completedSearches: done.size, expectedSearches: jobs.length * 2, error, counts, changedInputs: changed, heldOutRead: false };
  fs.writeFileSync(`${base}/${format}.status.json`, JSON.stringify(status, null, 2) + '\n');
  console.log(JSON.stringify(status));
  if (error || changed.length) process.exitCode = 2;
}
