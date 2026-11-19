import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const base = 'eval/dev-retrieval-20261103';
const prepared = 'eval/dev-set-preparation-20261103';
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file));
const lines = file => fs.readFileSync(file, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const format = process.argv[2];
if (!['pdf', 'docx'].includes(format)) throw Error('Expected pdf or docx');
const frozen = read('eval/runs/seed42/production-manifest.json');
const split = read('eval/split.json');
if (hash(fs.readFileSync('eval/split.json')) !== read(`${prepared}/summary.json`).splitSha256) throw Error('Split changed');
const cases = lines(`${prepared}/ready.jsonl`).filter(r => r.format === format);
for (const r of cases) if (!split.dev.includes(r.paperId) || split.test.includes(r.paperId)) throw Error('Held-out case denied');
const assets = new Map(lines(`${prepared}/source-chunks.jsonl`).filter(a => a.asset.startsWith(format + '/')).map(a => [a.documentId, a]));
const qdrant = `http://127.0.0.1:${frozen.services.ports.qdrant}`, ollama = 'http://127.0.0.1:11434';
const collection = frozen.collections[format];
const stats = `C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-scoped-hybrid-r4/${format}/sparse-stats.json`;
if (hash(fs.readFileSync(stats)) !== read('eval/q-dense-vs-hybrid-20261102/preflight.json').baselineSparseStats[format]) throw Error('Sparse stats changed');
Object.assign(process.env, { QDRANT_URL: qdrant, OLLAMA_URL: ollama, QDRANT_COLLECTION: collection,
  OLLAMA_EMBED_MODEL: frozen.settings.embeddingModel, OLLAMA_EMBED_DIM: String(frozen.settings.embeddingDim),
  OLLAMA_EMBED_PREFIXES: '1', RETRIEVE_SCORE_THRESHOLD: '0.63', RETRIEVE_FUSION: 'rrf',
  SPARSE_STATS_PATH: stats, RERANK_ENABLED: '0', CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_ACCOUNT_ID: '' });
const inputFiles = [`${prepared}/ready.jsonl`, `${prepared}/source-chunks.jsonl`, 'eval/split.json', stats,
  'src/retrieval/retriever.ts', 'src/retrieval/vectorStore.ts', 'src/retrieval/embedder.ts',
  'src/retrieval/sparse.ts', 'src/retrieval/sparseStats.ts', 'src/retrieval/acronyms.ts', 'src/config.ts'];
const hashes = inputFiles.map(file => ({ file, sha256: hash(fs.readFileSync(file)) }));
const save = (name, value) => fs.writeFileSync(`${base}/${name}`, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const originalFetch = globalThis.fetch;
let active = null, trace = null;
let embedCache = new Map();
const counts = { actualEmbeddingRequests: 0, reusedEmbeddingResponses: 0, qdrantRequests: 0, hostedCalls: 0 };
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init), url = new URL(request.url);
  if (url.origin === qdrant && request.method === 'GET' && url.pathname === '/') return originalFetch(request);
  if (!active) throw Error('Network outside active case denied');
  if (url.origin === ollama && url.pathname === '/api/embed' && request.method === 'POST') {
    const payload = await request.clone().json();
    const expected = 'search_query: ' + expandAcronyms(active.question);
    if (payload.model !== frozen.settings.embeddingModel || payload.input !== expected) throw Error('Embedding query drift');
    trace.embeddingInput = payload.input;
    const key = JSON.stringify(payload);
    if (embedCache.has(key)) { counts.reusedEmbeddingResponses++; return new Response(embedCache.get(key), { status: 200, headers: { 'content-type': 'application/json' } }); }
    counts.actualEmbeddingRequests++;
    const response = await originalFetch(request);
    if (!response.ok) throw Error('Local embedding request failed: ' + response.status);
    const text = await response.text(); embedCache.set(key, text);
    return new Response(text, { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.origin !== qdrant || url.pathname !== `/collections/${collection}/points/query` || request.method !== 'POST') throw Error('Nonlocal/non-retrieval endpoint denied');
  const body = await request.clone().json();
  function verifyFilter(part) {
    const matches = part.filter?.must?.filter(c => c.key === 'documentId');
    if (!matches?.length || matches.some(c => JSON.stringify(c.match?.any) !== JSON.stringify([active.documentId]))) throw Error('Document filter escaped selected dev paper');
    for (const child of part.prefetch ?? []) verifyFilter(child);
  }
  verifyFilter(body); counts.qdrantRequests++; trace.qdrantRequests++;
  const response = await originalFetch(request, { signal: AbortSignal.timeout(30_000) });
  const payload = await response.clone().json();
  if (!response.ok) throw Error('Qdrant request failed: ' + response.status);
  for (const p of payload.result?.points ?? []) {
    if (p.payload?.documentId !== active.documentId) throw Error('Wrong paper returned');
    const c = assets.get(active.documentId)?.chunks.find(c => c.chunkIndex === p.payload.chunkIndex);
    if (!c || c.text !== p.payload.text) throw Error('Live payload differs from frozen chunk snapshot');
  }
  return response;
};
const { expandAcronyms } = await import('../../src/retrieval/acronyms.ts');
const { retrieve } = await import('../../src/retrieval/retriever.ts');
const outputFile = `${base}/${format}.results.jsonl`;
const done = fs.existsSync(outputFile) ? lines(outputFile) : [];
const expected = new Set(cases.flatMap(c => ['dense', 'hybrid'].flatMap(mode => [5, 50].map(k => `${c.caseId}:${mode}:${k}`))));
const doneKeys = new Set(done.map(r => `${r.caseId}:${r.mode}:${r.requestedK}`));
if (doneKeys.size !== done.length || [...doneKeys].some(k => !expected.has(k))) throw Error('Invalid resume rows');
const manifestFile = `${base}/${format}.manifest.json`;
const settings = { format, collection, embeddingModel: frozen.settings.embeddingModel, threshold: 0.63, fusion: 'rrf',
  prefixes: true, requestedK: [5, 50], cases: cases.length, hashes,
  scope: 'Original question with explicitly selected dev paper; no title wrapper or rewrite. This tests selected-paper retrieval, not automatic scope resolution.',
  cache: 'Each question embedded once per case, reused across modes/depths without changing query/vector. Fresh Qdrant searches for each combination.' };
if (fs.existsSync(manifestFile)) { if (JSON.stringify(read(manifestFile)) !== JSON.stringify(settings)) throw Error('Resume manifest drift'); }
else save(`${format}.manifest.json`, settings);
const fd = fs.openSync(outputFile, 'a');
let status = 'complete', error = null, completedCases = 0;
try {
  for (const url of [`${qdrant}/readyz`, `${ollama}/api/tags`]) {
    const r = await originalFetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw Error('Local service unavailable');
    const t = await r.text();
    if (url.endsWith('/api/tags') && !JSON.parse(t).models.some(m => m.name === frozen.settings.embeddingModel || m.name === frozen.settings.embeddingModel + ':latest')) throw Error('Embedding model unavailable');
  }
  for (const c of cases) {
    active = c; embedCache = new Map();
    for (const mode of ['dense', 'hybrid']) for (const k of [5, 50]) {
      const key = `${c.caseId}:${mode}:${k}`;
      if (doneKeys.has(key)) continue;
      trace = { qdrantRequests: 0 };
      const start = performance.now();
      const chunks = await retrieve(c.question, { mode, topK: k, collection, scoreThreshold: 0.63,
        documentScope: { status: 'resolved', references: [], documentIds: [c.documentId] } });
      const references = c.references.filter(r => c.scoringReferenceIndices.includes(r.referenceIndex)).map(r => ({
        referenceIndex: r.referenceIndex, items: r.items.map(i => {
          const rank = chunks.findIndex(c => c.text.replace(/\s+/gu, ' ').trim().includes(i.normalized));
          return { quote: i.text, rank: rank < 0 ? null : rank + 1 };
        }) }));
      const result = { caseId: c.caseId, paperId: c.paperId, format, question: c.question, status: c.status,
        verdict: c.verdict, primaryCause: c.primaryCause, mode, requestedK: k, references, chunks, trace,
        elapsedMs: performance.now() - start };
      fs.writeSync(fd, JSON.stringify(result) + '\n'); doneKeys.add(key);
    }
    completedCases++;
    if (completedCases % 10 === 0 || completedCases === cases.length) console.log(JSON.stringify({ format, completedCases, cases: cases.length, completedSearches: doneKeys.size, ...counts }));
  }
} catch (e) { status = 'stopped'; error = `${e.name}: ${e.message}`; console.error(error); }
finally {
  fs.closeSync(fd); globalThis.fetch = originalFetch; embedCache.clear(); active = null;
  const changed = hashes.filter(x => hash(fs.readFileSync(x.file)) !== x.sha256);
  fs.writeFileSync(`${base}/${format}.execution.json`, JSON.stringify({ status, error, cases: cases.length,
    completedSearches: doneKeys.size, expectedSearches: expected.size, counts, changedInputs: changed,
    heldOutContentRead: false, generationCalls: 0, rerankCalls: 0 }, null, 2) + '\n');
  if (changed.length) throw Error('Input changed');
}
if (status !== 'complete') process.exitCode = 2;
