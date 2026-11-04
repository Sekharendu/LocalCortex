import fs from 'node:fs';
import path from 'node:path';
import { BASE, OLD, DIAG, RUN, read, lines, sha, normalize, inside, devOnly, match, save, addBoundary, itemRank } from './common.mjs';

const format = process.argv[2]; if (!['pdf', 'docx'].includes(format)) throw Error('Expected format');
const preflight = read(path.join(BASE, 'preflight.json')), frozen = read(path.join(OLD, 'production-manifest.json'));
const splitBytes = fs.readFileSync('eval/split.json'), split = JSON.parse(splitBytes);
if (sha(splitBytes) !== preflight.splitSha256) throw Error('Split changed');
for (const x of frozen.sourceHashes) if (sha(fs.readFileSync(x.file)) !== x.sha256) throw Error('Production source changed');
const completedPriorCases = new Set(["docx/1609.00425/b6ae8e10c6a0d34c834f18f66ab730b670fb528c","docx/1609.00425/a87a009c242d57c51fc94fe312af5e02070f898b"]);
const cases = lines(path.join(BASE, 'case-plan.jsonl')).filter(x => x.format === format && !completedPriorCases.has(x.caseId)); cases.forEach(c => devOnly(c.paperId, split));
const sources = lines(path.join(BASE, 'dev-sources.jsonl')).filter(x => x.format === format); sources.forEach(s => devOnly(s.paperId, split));
const byDoc = new Map(sources.map(s => [s.documentId, s])), allowedDocs = [...byDoc.keys()];
const collection = frozen.collections[format], qdrant = `http://127.0.0.1:${frozen.services.ports.qdrant}`, ollama = 'http://127.0.0.1:11434';
const statsPath = path.join(RUN, format, 'sparse-stats.json'), sparseStatsSha256 = sha(fs.readFileSync(statsPath));
Object.assign(process.env, { QDRANT_URL: qdrant, OLLAMA_URL: ollama, QDRANT_COLLECTION: collection, OLLAMA_EMBED_MODEL: frozen.settings.embeddingModel, OLLAMA_EMBED_DIM: String(frozen.settings.embeddingDim), OLLAMA_EMBED_PREFIXES: '1', RETRIEVE_MODE: 'hybrid', RETRIEVE_SCORE_THRESHOLD: '0.63', RETRIEVE_FUSION: 'rrf', SPARSE_STATS_PATH: statsPath });
const nativeFetch = globalThis.fetch, cache = new Map();
let active = null, currentTrace = null;
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init), url = new URL(request.url);
  if (!active) throw Error('Request outside active dev case');
  if (url.origin === ollama && url.pathname === '/api/embed' && request.method === 'POST') {
    const body = await request.clone().json();
    if (body.model !== frozen.settings.embeddingModel || body.input !== active.embeddingInput) throw Error('Embedding input does not match production query form');
    currentTrace.embeddingCalls++; currentTrace.actualEmbeddingInput = body.input;
    return nativeFetch(request);
  }
  if (url.origin !== qdrant || url.pathname !== `/collections/${collection}/points/query` || request.method !== 'POST') throw Error('Nonlocal/unapproved/generation endpoint blocked');
  const body = await request.clone().json(), isHybrid = Array.isArray(body.prefetch);
  if (isHybrid) {
    if (body.limit !== 50 || body.prefetch.some(x => x.limit !== 200)) throw Error('Unexpected top50/prefetch configuration');
    const sparse = body.prefetch.find(x => x.using === 'sparse');
    if (sparse && sha(JSON.stringify([sparse.query.indices, sparse.query.values])) !== currentTrace.expectedSparseHash) throw Error('Sparse query differs from exact production keyword text');
    currentTrace.hybridCalls++;
  } else {
    if (body.limit !== 1 || body.score_threshold !== 0.63) throw Error('Dense gate configuration changed');
    currentTrace.denseGateCalls++;
  }
  addBoundary(body, allowedDocs, active.scope.documentIds);
  const response = await nativeFetch(new Request(request, { body: JSON.stringify(body) }));
  const payload = await response.clone().json();
  if (!response.ok) throw Error('Qdrant query failed');
  if (payload.result?.points?.some(p => !byDoc.has(p.payload?.documentId))) throw Error('Held-out result crossed dataset boundary');
  if (!isHybrid) {
    currentTrace.denseGatePassed = !!payload.result?.points?.length;
    currentTrace.denseGateScore = payload.result?.points?.[0]?.score ?? null;
  }
  return response;
};
const [{ retrieve }, { resolveDocumentScope }, { sparseVectorFor, tokenize }, { getAvgDocLength }] = await Promise.all([import('../../src/retrieval/retriever.ts'), import('../../src/retrieval/documentScope.ts'), import('../../src/retrieval/sparse.ts'), import('../../src/retrieval/sparseStats.ts')]);
function documentSnapshot(id) {
  if (cache.has(id)) { const value = cache.get(id); cache.delete(id); cache.set(id, value); return value; }
  const s = byDoc.get(id); if (!s) throw Error('Non-dev source denied');
  const chunks = lines(inside(DIAG, s.allChunksPath));
  if (chunks.some(x => x.documentId !== id || x.paperId !== s.paperId)) throw Error('Source snapshot identity mismatch');
  const value = new Map(chunks.map(x => [x.chunkIndex, x])); cache.set(id, value);
  if (cache.size > 8) cache.delete(cache.keys().next().value);
  return value;
}
const resultFile = path.join(BASE, `${format}-resume.results.jsonl`), traceFile = path.join(BASE, `${format}-resume.traces.jsonl`);
const resultFd = fs.openSync(resultFile, 'wx'), traceFd = fs.openSync(traceFile, 'wx');
let status = 'complete', error = null, pairs = 0;
try {
  for (const url of [`${qdrant}/readyz`, `${ollama}/api/tags`]) {
    const response = await nativeFetch(url, { signal: AbortSignal.timeout(5000) }), body = await response.text();
    if (!response.ok) throw Error('Retrieval prerequisite unavailable');
    if (url.endsWith('/api/tags') && !JSON.parse(body).models?.some(m => m.name === frozen.settings.embeddingModel || m.name === frozen.settings.embeddingModel + ':latest')) throw Error('Embedding model unavailable');
  }
  for (const c of cases) {
    const sourceBytes = fs.readFileSync(inside(DIAG, c.source.fullTextPath));
    if (sha(sourceBytes) !== c.source.extractedTextSha256) throw Error('Source hash changed');
    const source = normalize(sourceBytes.toString('utf8'));
    const bundle = fs.readFileSync(inside(DIAG, c.evidenceBundle)); if (sha(bundle) !== c.bundleSha256) throw Error('Case changed');
    for (const variant of ['A', 'P']) {
      active = c.variants[variant];
      if (active.scope.documentIds?.some(id => !byDoc.has(id))) throw Error('Non-dev scope denied');
      if (variant === 'P') {
        const decision = await resolveDocumentScope(active.question, collection);
        if (JSON.stringify(decision) !== JSON.stringify(active.scope)) throw Error('Production P scope differs from preflight');
      }
      const sparse = sparseVectorFor(active.keywordInput, await getAvgDocLength());
      currentTrace = { caseId: c.caseId, variant, keywordInput: active.keywordInput, keywordTokens: tokenize(active.keywordInput), scope: active.scope, datasetBoundaryDocuments: allowedDocs.length, expectedEmbeddingInput: active.embeddingInput, expectedSparseHash: sha(JSON.stringify([sparse.indices, sparse.values])), embeddingCalls: 0, denseGateCalls: 0, hybridCalls: 0, denseGatePassed: null, denseGateScore: null };
      const started = performance.now();
      // P executes the real resolver inside retrieve(); A replays its captured scope
      // to avoid collection-wide held-out catalog reads. No gold filter is added.
      const retrieved = await retrieve(active.question, { topK: 50, mode: 'hybrid', scoreThreshold: 0.63, collection, ...(variant === 'A' ? { documentScope: active.scope } : {}) });
      for (const chunk of retrieved) {
        const old = documentSnapshot(chunk.documentId).get(chunk.chunkIndex);
        if (!old || sha(old.payload.text) !== sha(chunk.text)) throw Error('Live dev payload differs from frozen indexed snapshot');
      }
      const items = c.items.map(item => ({ itemId: item.itemId, quote: item.text, kind: item.kind, lengthGroup: item.lengthGroup, wordCount: item.wordCount, ...itemRank(item, retrieved, source, c.source.documentId, match) }));
      const result = { caseId: c.caseId, paperId: c.paperId, format, group: c.group, variant, scope: active.scope, targetDocumentId: c.source.documentId, items, retrieved, targetPaperTop1: retrieved.length ? retrieved[0].documentId === c.source.documentId : null, targetPaperInTop50: retrieved.some(x => x.documentId === c.source.documentId), elapsedMs: performance.now() - started };
      fs.writeSync(resultFd, JSON.stringify(result) + '\n'); fs.writeSync(traceFd, JSON.stringify(currentTrace) + '\n');
    }
    pairs++;
    if (pairs % 20 === 0) console.log(`${format}: ${pairs}/${cases.length} A/P case pairs complete`);
  }
} catch (e) { status = 'blocked'; error = `${e.name}: ${e.message}`; }
finally { fs.closeSync(resultFd); fs.closeSync(traceFd); globalThis.fetch = nativeFetch; cache.clear(); active = null; }
save(`${format}-resume.summary.json`, { status, error, cases: cases.length, completedPairs: pairs, expectedVariantRuns: cases.length * 2, sparseStatsSha256, splitUnchanged: sha(fs.readFileSync('eval/split.json')) === preflight.splitSha256, productionSourceMismatches: frozen.sourceHashes.filter(x => sha(fs.readFileSync(x.file)) !== x.sha256), answerGenerationCalls: 0 });
console.log(JSON.stringify({ format, status, error, pairs }));
if (status !== 'complete') process.exitCode = 2;
