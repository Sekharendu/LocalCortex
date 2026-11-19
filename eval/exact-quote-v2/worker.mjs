import fs from 'node:fs';
import path from 'node:path';
import { BASE, OLD, DIAG, RUN, read, lines, save, sha, normalize, inside, devOnly, match } from './common.mjs';

const [group, format, kText] = process.argv.slice(2), k = Number(kText);
if (!['chunk_omission', 'acceptable'].includes(group) || !['pdf', 'docx'].includes(format) || ![5, 50].includes(k)) throw Error('Invalid retrieval phase');
if (group === 'acceptable' && k !== 5) throw Error('Acceptable cases are k5 only');
const label = `${group}-${format}-k${k}`, output = path.join(BASE, `${label}.rows.jsonl`);
const fd = fs.openSync(output, 'wx');
const preflight = read(path.join(BASE, 'preflight.json')), frozen = read(path.join(OLD, 'production-manifest.json'));
const splitBytes = fs.readFileSync('eval/split.json'), split = JSON.parse(splitBytes);
if (sha(splitBytes) !== preflight.splitSha256) throw Error('Split changed');
for (const x of frozen.sourceHashes) if (sha(fs.readFileSync(x.file)) !== x.sha256) throw Error('Production source changed: ' + x.file);
const all = lines(path.join(BASE, 'gold-mapping.jsonl')); all.forEach(x => devOnly(x.paperId, split));
const selected = all.filter(x => x.group === group && x.format === format);
const allowedDocs = new Set(all.filter(x => x.format === format).map(x => x.source.documentId));
const collection = frozen.collections[format], qdrant = `http://127.0.0.1:${frozen.services.ports.qdrant}`, ollama = 'http://127.0.0.1:11434';
const statsPath = path.join(RUN, format, 'sparse-stats.json'), sparseStatsSha256 = sha(fs.readFileSync(statsPath));
Object.assign(process.env, { QDRANT_URL: qdrant, OLLAMA_URL: ollama, QDRANT_COLLECTION: collection, OLLAMA_EMBED_MODEL: frozen.settings.embeddingModel, OLLAMA_EMBED_DIM: String(frozen.settings.embeddingDim), OLLAMA_EMBED_PREFIXES: '1', RETRIEVE_MODE: 'hybrid', RETRIEVE_SCORE_THRESHOLD: String(frozen.settings.threshold), RETRIEVE_FUSION: 'rrf', SPARSE_STATS_PATH: statsPath });
const nativeFetch = globalThis.fetch;
let activeDocs = [], requestCount = 0;
function checkFilter(body) {
  const condition = body.filter?.must?.find(x => x.key === 'documentId');
  const ids = condition?.match?.any ?? (condition?.match?.value ? [condition.match.value] : []);
  if (!ids.length || ids.some(id => !activeDocs.includes(id) || !allowedDocs.has(id))) throw Error('Unscoped/held-out Qdrant request blocked');
  for (const item of body.prefetch ?? []) checkFilter(item);
}
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init), url = new URL(request.url);
  if (url.origin === ollama && url.pathname === '/api/embed' && request.method === 'POST') return nativeFetch(request);
  if (url.origin !== qdrant || url.pathname !== `/collections/${collection}/points/query` || request.method !== 'POST') throw Error('Unapproved network endpoint blocked');
  checkFilter(await request.clone().json()); requestCount++;
  return nativeFetch(request);
};
const { retrieve } = await import('../../src/retrieval/retriever.ts');
let status = 'complete', error = null, processed = 0, hitCount = 0, cachedDoc, source, chunksByIndex;
try {
  for (const url of [`${qdrant}/readyz`, `${ollama}/api/tags`]) {
    const response = await nativeFetch(url, { signal: AbortSignal.timeout(5000) });
    const body = await response.text();
    if (!response.ok) throw Error('Dependency unavailable');
    if (url.endsWith('/api/tags') && !JSON.parse(body).models?.some(m => m.name === frozen.settings.embeddingModel || m.name === frozen.settings.embeddingModel + ':latest')) throw Error('Frozen embedding model missing');
  }
  for (const row of selected) {
    devOnly(row.paperId, split);
    const bytes = fs.readFileSync(inside(DIAG, row.evidenceBundle));
    if (sha(bytes) !== row.bundleSha256) throw Error('Dev case hash changed');
    const c = JSON.parse(bytes);
    if (c.caseId !== row.caseId || c.paperId !== row.paperId || c.format !== format) throw Error('Case identity mismatch');
    if (!c.scope || c.scope.status !== 'resolved' || c.scope.documentIds.length !== 1 || c.scope.documentIds[0] !== row.source.documentId || !allowedDocs.has(c.scope.documentIds[0])) throw Error('Saved dev scope cannot be replayed');
    activeDocs = c.scope.documentIds;
    if (cachedDoc !== row.source.documentId) {
      const fullBytes = fs.readFileSync(inside(DIAG, row.source.fullTextPath));
      if (sha(fullBytes) !== row.source.extractedTextSha256) throw Error('Source changed');
      source = normalize(fullBytes.toString('utf8'));
      const chunks = lines(inside(DIAG, row.source.allChunksPath));
      if (chunks.some(x => x.paperId !== row.paperId || x.documentId !== row.source.documentId)) throw Error('Non-dev chunk input denied');
      chunksByIndex = new Map(chunks.map(x => [x.chunkIndex, x])); cachedDoc = row.source.documentId;
    }
    const retrieved = await retrieve(c.actualQuestion, { topK: k, mode: 'hybrid', scoreThreshold: frozen.settings.threshold, collection, documentScope: c.scope });
    for (const chunk of retrieved) {
      if (chunk.documentId !== row.source.documentId || !chunksByIndex.has(chunk.chunkIndex) || sha(chunksByIndex.get(chunk.chunkIndex).payload.text) !== sha(chunk.text)) throw Error('Live result differs from dev indexed snapshot');
    }
    const matches = retrieved.map(chunk => match(chunk, row.gold, source));
    const first = matches.findIndex(Boolean), eligible = row.mapping === 'mapped';
    const result = { caseId: row.caseId, paperId: row.paperId, format, group, k, mapping: row.mapping, eligible, firstMatchRank: first < 0 ? null : first + 1, found: first >= 0, gold: row.gold, matches, retrieved, productionK5: c.topRetrievedChunks, question: c.originalQuestion };
    fs.writeSync(fd, JSON.stringify(result) + '\n'); processed++; if (eligible && first >= 0) hitCount++;
    if (processed % 20 === 0) console.log(`${label}: ${processed}/${selected.length}; mapped-case hits ${hitCount}`);
  }
} catch (e) { status = 'blocked'; error = `${e.name}: ${e.message}`; }
finally { fs.closeSync(fd); globalThis.fetch = nativeFetch; }
save(`${label}.summary.json`, { status, error, group, format, k, selected: selected.length, processed, hitCount, requestCount, sparseStatsSha256, productionFilesUnchanged: frozen.sourceHashes.every(x => sha(fs.readFileSync(x.file)) === x.sha256), splitUnchanged: sha(fs.readFileSync('eval/split.json')) === preflight.splitSha256, scope: 'Replay saved production decision; no collection-wide title/catalog reads', generationCalls: 0 });
console.log(JSON.stringify({ label, status, error, processed, hitCount }));
if (status !== 'complete') process.exitCode = 2;
