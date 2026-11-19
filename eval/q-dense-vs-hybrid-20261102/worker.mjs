import fs from 'node:fs';
import path from 'node:path';
import { BASE, OLD, DIAG, RUN, read, lines, sha, normalize, inside, devOnly, match, save, addBoundary, itemRank, denseStage } from './common.mjs';

const format = process.argv[2]; if (!['pdf', 'docx'].includes(format)) throw Error('Expected format');
const preflight = read(path.join(BASE, 'preflight.json')), frozen = read(path.join(OLD, 'production-manifest.json'));
const splitBytes = fs.readFileSync('eval/split.json'), split = JSON.parse(splitBytes);
if (sha(splitBytes) !== preflight.splitSha256) throw Error('Split changed');
for (const x of frozen.sourceHashes) if (sha(fs.readFileSync(x.file)) !== x.sha256) throw Error('Production source changed');
const cases = lines(path.join(BASE, 'case-plan.jsonl')).filter(x => x.format === format); cases.forEach(c => devOnly(c.paperId, split));
const sources = lines(path.join(BASE, 'dev-sources.jsonl')).filter(x => x.format === format); sources.forEach(s => devOnly(s.paperId, split));
const byDoc = new Map(sources.map(s => [s.documentId, s])), allowedDocs = [...byDoc.keys()];
const collection = frozen.collections[format], qdrant = `http://127.0.0.1:${frozen.services.ports.qdrant}`, ollama = 'http://127.0.0.1:11434';
const statsPath = path.join(RUN, format, 'sparse-stats.json'), sparseStatsSha256 = sha(fs.readFileSync(statsPath));
Object.assign(process.env, { QDRANT_URL: qdrant, OLLAMA_URL: ollama, QDRANT_COLLECTION: collection, OLLAMA_EMBED_MODEL: frozen.settings.embeddingModel, OLLAMA_EMBED_DIM: String(frozen.settings.embeddingDim), OLLAMA_EMBED_PREFIXES: '1', RETRIEVE_MODE: 'dense', RETRIEVE_SCORE_THRESHOLD: '0.63', RETRIEVE_FUSION: 'rrf', SPARSE_STATS_PATH: statsPath });
if (sparseStatsSha256 !== preflight.baselineSparseStats[format]) throw Error('Sparse statistics differ from A/P baseline');
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
  const body = await request.clone().json();
  const stage = denseStage(body, currentTrace);
  currentTrace.denseSearchCalls++;
  if (stage === 'expansion') currentTrace.sameDocumentExpansionCalls++;
  addBoundary(body, allowedDocs, active.scope.documentIds);
  const response = await nativeFetch(new Request(request, { body: JSON.stringify(body) }));
  const payload = await response.clone().json();
  if (!response.ok) throw Error('Qdrant query failed');
  if (payload.result?.points?.some(p => !byDoc.has(p.payload?.documentId))) throw Error('Held-out result crossed dataset boundary');
  if (stage === 'initial') {
    currentTrace.returnedAboveThreshold = payload.result?.points?.length ?? 0;
    currentTrace.denseGatePassed = currentTrace.returnedAboveThreshold > 0;
    currentTrace.denseGateScore = payload.result?.points?.[0]?.score ?? null;
  }
  return response;
};
const [{ retrieve }, { resolveDocumentScope }] = await Promise.all([import('../../src/retrieval/retriever.ts'), import('../../src/retrieval/documentScope.ts')]);
function documentSnapshot(id) {
  if (cache.has(id)) { const value = cache.get(id); cache.delete(id); cache.set(id, value); return value; }
  const s = byDoc.get(id); if (!s) throw Error('Non-dev source denied');
  const chunks = lines(inside(DIAG, s.allChunksPath));
  if (chunks.some(x => x.documentId !== id || x.paperId !== s.paperId)) throw Error('Source snapshot identity mismatch');
  const value = new Map(chunks.map(x => [x.chunkIndex, x])); cache.set(id, value);
  if (cache.size > 8) cache.delete(cache.keys().next().value);
  return value;
}
const resultFile = path.join(BASE, `${format}.results.jsonl`), traceFile = path.join(BASE, `${format}.traces.jsonl`);
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
    for (const variant of ['Q']) {
      active = c.variants[variant];
      if (active.scope.documentIds?.some(id => !byDoc.has(id))) throw Error('Non-dev scope denied');
      if (variant === 'P') {
        const decision = await resolveDocumentScope(active.question, collection);
        if (JSON.stringify(decision) !== JSON.stringify(active.scope)) throw Error('Production P scope differs from preflight');
      }
      currentTrace = { caseId: c.caseId, variant, retrievalMode: 'dense', scope: active.scope, datasetBoundaryDocuments: allowedDocs.length, expectedEmbeddingInput: active.embeddingInput, embeddingCalls: 0, denseSearchCalls: 0, sameDocumentExpansionCalls: 0, returnedAboveThreshold: null, denseGatePassed: null, denseGateScore: null, keywordSearchCalls: 0 };
      const started = performance.now();
      // Q uses the same immutable captured scope as A with P's original question.
      // No title catalog reads, gold identity injection, or scope relaxation.
      const retrieved = await retrieve(active.question, { topK: 50, mode: 'dense', scoreThreshold: 0.63, collection, ...{ documentScope: active.scope } });
      for (const chunk of retrieved) {
        const old = documentSnapshot(chunk.documentId).get(chunk.chunkIndex);
        if (!old || sha(old.payload.text) !== sha(chunk.text)) throw Error('Live dev payload differs from frozen indexed snapshot');
      }
      const items = c.items.map(item => ({ itemId: item.itemId, quote: item.text, kind: item.kind, lengthGroup: item.lengthGroup, wordCount: item.wordCount, ...itemRank(item, retrieved, source, c.source.documentId, match) }));
      const result = { caseId: c.caseId, paperId: c.paperId, format, group: c.group, variant, retrievalMode: 'dense', scope: active.scope, targetDocumentId: c.source.documentId, items, retrieved, targetPaperTop1: retrieved.length ? retrieved[0].documentId === c.source.documentId : null, targetPaperInTop50: retrieved.some(x => x.documentId === c.source.documentId), elapsedMs: performance.now() - started };
      fs.writeSync(resultFd, JSON.stringify(result) + '\n'); fs.writeSync(traceFd, JSON.stringify(currentTrace) + '\n');
    }
    pairs++;
    if (pairs % 20 === 0) console.log(`${format}: ${pairs}/${cases.length} Q dense cases complete`);
  }
} catch (e) { status = 'blocked'; error = `${e.name}: ${e.message}`; }
finally { fs.closeSync(resultFd); fs.closeSync(traceFd); globalThis.fetch = nativeFetch; cache.clear(); active = null; }
save(`${format}.summary.json`, { status, error, cases: cases.length, completedPairs: pairs, expectedVariantRuns: cases.length, sparseStatsSha256, splitUnchanged: sha(fs.readFileSync('eval/split.json')) === preflight.splitSha256, productionSourceMismatches: frozen.sourceHashes.filter(x => sha(fs.readFileSync(x.file)) !== x.sha256), answerGenerationCalls: 0 });
console.log(JSON.stringify({ format, status, error, pairs }));
if (status !== 'complete') process.exitCode = 2;
