import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DIAG, RUN, OUT, sha, read, lines, write, norm, assertDev, safeInput, anchorsFromDiagnosis, evidenceHit } from './shared.mjs';

const [format, phase] = process.argv.slice(2);
if (!['pdf', 'docx'].includes(format) || !['sanity', 'remaining'].includes(phase)) throw Error('Expected format and phase');
const split = read(path.join(ROOT, 'split.json')), frozen = read(path.join(OUT, 'production-manifest.json'));
for (const item of frozen.sourceHashes) if (sha(fs.readFileSync(item.file)) !== item.sha256) throw Error('Production source drift: ' + item.file);
const metadata = lines(path.join(OUT, 'dev-metadata.jsonl')).filter(m => m.format === format);
metadata.forEach(m => assertDev(m.paperId, split));
const meta = new Map(metadata.map(m => [m.caseId, m]));
const diagnoses = lines(path.join(OUT, 'dev-diagnoses.jsonl')).filter(d => meta.has(d.caseId));
const sources = lines(path.join(OUT, 'dev-sources.jsonl')).filter(s => s.format === format);
sources.forEach(s => assertDev(s.paperId, split));
const allowedDocs = new Set(sources.map(s => s.documentId));
const collection = frozen.collections[format], qdrant = `http://127.0.0.1:${frozen.services.ports.qdrant}`, ollama = 'http://127.0.0.1:11434';
const statsPath = path.join(RUN, format, 'sparse-stats.json');
if (!fs.existsSync(statsPath)) throw Error('Frozen sparse stats unavailable');
Object.assign(process.env, { QDRANT_URL: qdrant, OLLAMA_URL: ollama, QDRANT_COLLECTION: collection, OLLAMA_EMBED_MODEL: frozen.settings.embeddingModel, OLLAMA_EMBED_DIM: String(frozen.settings.embeddingDim), OLLAMA_EMBED_PREFIXES: '1', RETRIEVE_MODE: 'hybrid', RETRIEVE_SCORE_THRESHOLD: String(frozen.settings.threshold), RETRIEVE_FUSION: 'rrf', SPARSE_STATS_PATH: statsPath });
const nativeFetch = globalThis.fetch;
let activeDocs = [], activeIds = [];
function checkFilter(body) {
  const condition = body.filter?.must?.find(x => x.key === 'documentId');
  const ids = condition?.match?.any ?? (condition?.match?.value ? [condition.match.value] : []);
  if (!ids.length || ids.some(id => !activeDocs.includes(id) || !allowedDocs.has(id))) throw Error('Unscoped or held-out Qdrant request denied');
  for (const p of body.prefetch ?? []) checkFilter(p);
}
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init), url = new URL(request.url), method = request.method;
  if (url.origin === ollama && url.pathname === '/api/embed' && method === 'POST') return nativeFetch(request);
  if (url.origin !== qdrant) throw Error('Non-evaluation network request denied');
  const base = `/collections/${collection}`;
  if (method === 'POST' && url.pathname === `${base}/points/query`) checkFilter(await request.clone().json());
  else if (method === 'POST' && url.pathname === `${base}/points`) {
    const body = await request.clone().json();
    if (body.ids?.some(id => !activeIds.includes(id)) || body.with_vector !== false) throw Error('Unapproved indexed point read denied');
  } else throw Error('Unapproved Qdrant endpoint denied');
  return nativeFetch(request);
};
const { retrieve } = await import('../src/retrieval/retriever.ts');
const rows = [], coverage = [], cache = new Map();
let status = 'complete', stoppedReason = null;
try {
  for (const url of [`${qdrant}/readyz`, `${ollama}/api/tags`]) {
    const response = await nativeFetch(url, { signal: AbortSignal.timeout(5000) });
    const text = await response.text();
    if (!response.ok) throw Error('Local retrieval prerequisite unavailable');
    if (url.endsWith('/api/tags') && !JSON.parse(text).models?.some(m => m.name === frozen.settings.embeddingModel || m.name === frozen.settings.embeddingModel + ':latest')) throw Error('Frozen embedding model unavailable');
  }
  const selected = diagnoses.filter(d => phase === 'sanity' ? d.primaryCause === 'retrieval_answer_bearing_chunk_omitted' : d.primaryCause === 'retrieval_answer_bearing_chunk_omitted' || d.primaryCause === 'retrieval_document_scope_rejection' || d.verdict === 'acceptable');
  for (const d of selected) {
    const m = meta.get(d.caseId); assertDev(m.paperId, split);
    const bundleFile = safeInput(DIAG, m.evidenceBundle), bytes = fs.readFileSync(bundleFile);
    if (sha(bytes) !== m.bundleSha256) throw Error('Dev bundle drift');
    const c = JSON.parse(bytes);
    if (c.paperId !== m.paperId || c.caseId !== d.caseId || c.format !== format) throw Error('Dev case identity mismatch');
    const scope = c.scope;
    if (!scope || !Array.isArray(scope.documentIds) || scope.documentIds.some(id => !allowedDocs.has(id))) throw Error('Saved scope cannot be replayed within dev boundary');
    if (scope.documentIds.length && (scope.status !== 'resolved' || scope.documentIds.length !== 1 || scope.documentIds[0] !== c.sourcePointers.documentId)) throw Error('Saved production scope identity mismatch');
    activeDocs = scope.documentIds;
    const source = sources.find(s => s.documentId === c.sourcePointers.documentId);
    if (!source || source.paperId !== m.paperId) throw Error('Dev source unavailable');
    let chunks = cache.get(source.documentId);
    if (!chunks) {
      chunks = lines(safeInput(DIAG, source.allChunksPath));
      if (chunks.some(x => x.paperId !== m.paperId || x.documentId !== source.documentId)) throw Error('Held-out source contents denied');
      cache.clear(); cache.set(source.documentId, chunks);
    }
    let anchors = anchorsFromDiagnosis(d, chunks);
    if (!anchors.length && d.verdict === 'acceptable') {
      const texts = c.allReferenceAnswers.filter(a => !a.unanswerable).flatMap(a => [...(a.extractive_spans ?? []), ...(a.evidence ?? [])]).map(norm).filter(t => t.length >= 20 && !/FLOAT SELECTED/.test(t));
      anchors = chunks.filter(x => texts.some(t => norm(x.payload.text).includes(t))).map(x => ({ pointId: x.pointId, documentId: x.documentId, chunkIndex: x.chunkIndex, textSha256: sha(x.payload.text), kind: 'exact-reference-text' }));
    }
    const group = d.primaryCause === 'retrieval_answer_bearing_chunk_omitted' ? 'chunk_omission' : d.primaryCause === 'retrieval_document_scope_rejection' ? 'scope_rejection' : 'acceptable';
    if (group === 'chunk_omission' && !anchors.length) throw Error('Omission case has no validated diagnostic answer anchor');
    if (anchors.length && scope.documentIds.length) {
      activeIds = anchors.map(a => a.pointId);
      const response = await fetch(`${qdrant}/collections/${collection}/points`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: activeIds, with_payload: true, with_vector: false }), signal: AbortSignal.timeout(10000) });
      const live = await response.json();
      if (!response.ok || live.result?.length !== anchors.length || live.result.some(x => x.payload.documentId !== source.documentId || !anchors.some(a => a.pointId === x.id && a.textSha256 === sha(x.payload.text)))) throw Error('Live indexed evidence differs from diagnosis snapshot');
    }
    coverage.push({ caseId: c.caseId, paperId: c.paperId, group, answerability: m.answerability, anchors, capturedTop5AnchorHits: evidenceHit(c.topRetrievedChunks, anchors).length });
    for (const k of phase === 'sanity' ? [5] : group === 'chunk_omission' ? [10, 20, 50] : [5, 10, 20, 50]) {
      const result = await retrieve(c.actualQuestion, { topK: k, mode: 'hybrid', scoreThreshold: frozen.settings.threshold, collection, documentScope: scope });
      if (result.some(x => !scope.documentIds.includes(x.documentId))) throw Error('Held-out retrieval result denied');
      const matched = evidenceHit(result, anchors);
      rows.push({ caseId: c.caseId, paperId: c.paperId, format, group, k, eligible: anchors.length > 0 && group !== 'scope_rejection', anchorCount: anchors.length, matchedAnchors: matched.map(a => a.pointId), found: matched.length > 0, result: result.map(x => ({ documentId: x.documentId, chunkIndex: x.chunkIndex, text: x.text, score: x.score, source: x.source, page: x.page })) });
      if (phase === 'sanity' && matched.length > 0) { status = 'pipeline_mismatch'; stoppedReason = 'Chunk-omission evidence recall@5 is nonzero; stop requested by user. Script does not establish a production-equivalent baseline.'; break; }
    }
    if (status !== 'complete') break;
    if (coverage.length % 20 === 0) console.log(`${phase}/${format}: ${coverage.length}/${selected.length} dev cases processed`);
  }
} catch (e) { status = 'blocked'; stoppedReason = `${e.name}: ${e.message}`; }
finally { globalThis.fetch = nativeFetch; cache.clear(); }
write(path.join(OUT, `${phase}-${format}.json`), { status, stoppedReason, format, phase, scopeHandling: 'Replay exact saved production decision to avoid reading held-out catalog titles', sparseStatsSha256: sha(fs.readFileSync(statsPath)), frozenRunSha256: frozen.runSha256, rows, coverage });
console.log(JSON.stringify({ status, stoppedReason, format, phase, cases: coverage.length, retrievalCalls: rows.length }));
if (status !== 'complete') process.exitCode = 2;
