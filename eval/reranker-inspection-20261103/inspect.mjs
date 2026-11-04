import fs from 'node:fs';
import { DIAG, lines, sha, inside, normalize, match, devOnly } from '../exact-quote-v2/common.mjs';
import { itemRank } from '../ap-query-form-20261102/common.mjs';
const base = 'eval/reranker-inspection-20261103';
const r1 = 'eval/reranker-dev-20261102-r1', r2 = 'eval/reranker-dev-20261102-live-r2';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const r1manifest = read(`${r1}/submission/manifest.json`), r2manifest = read(`${r2}/manifest.json`);
const preserved = [...r1manifest.files, ...r2manifest.files,
  ...[`${r1}/submission/manifest.json`, `${r1}/submission/complete.diff`, `${r2}/manifest.json`, `${r2}/complete.diff`].map(file => ({ file, sha256: sha(fs.readFileSync(file)) }))];
for (const f of preserved) if (sha(fs.readFileSync(f.file)) !== f.sha256) throw Error('Frozen file changed');
const requests = lines(`${r1}/requests.jsonl`), results = lines(`${r2}/reranked-results.jsonl`), comparison = read(`${r2}/comparison.json`);
const split = read('eval/split.json'), originalPlans = lines('eval/ap-query-form-20261102/case-plan.jsonl'), qPlans = lines('eval/question-only-same-paper-20261102/case-plan.jsonl');
const selected = [...new Set(requests.map(r => r.caseId))];
const planById = new Map(selected.map(id => {
  const c = originalPlans.find(c => c.caseId === id); if (!c) throw Error('No original gold'); devOnly(c.paperId, split); return [id, c];
}));
const changes = comparison.itemChanges.filter(c => c.k === 5).flatMap(c => ['gains', 'regressions'].flatMap(direction => c[direction].map(change => ({ ...change, mode: c.mode, group: c.group, length: c.length, direction }))));
const changedIds = [...new Set(changes.map(c => c.caseId))];
const sourceByCase = new Map();
function sourceFor(c) {
  if (sourceByCase.has(c.caseId)) return sourceByCase.get(c.caseId);
  devOnly(c.paperId, split);
  const bytes = fs.readFileSync(inside(DIAG, c.source.fullTextPath));
  if (sha(bytes) !== c.source.extractedTextSha256) throw Error('Dev source hash changed');
  const source = normalize(bytes.toString('utf8')); sourceByCase.set(c.caseId, source); return source;
}
function poolFor(caseId, mode) {
  const req = requests.find(r => r.caseId === caseId && r.mode === mode), result = results.find(r => r.caseId === caseId && r.mode === mode);
  if (!req || !result || req.paperId !== planById.get(caseId).paperId) throw Error('Case identity mismatch');
  if (result.indices.length !== req.candidates.length || new Set(result.indices).size !== req.candidates.length || result.indices.some(i => !Number.isInteger(i) || i < 0 || i >= req.candidates.length)) throw Error('Invalid permutation');
  const after = new Map(result.indices.map((i, rank) => [i, { afterRank: rank + 1, rerankScore: result.scores[rank] }]));
  return { req, result, candidates: req.candidates.map((chunk, i) => ({ ...chunk, inputIndex: i, beforeRank: i + 1, ...after.get(i) })) };
}
function itemEvidence(c, item, pool) {
  const source = sourceFor(c), { req, result, candidates } = pool;
  const matchingCandidates = candidates.flatMap(chunk => {
    if (chunk.documentId !== c.source.documentId) return [];
    const matched = match(chunk, [item], source); if (!matched || !item.ranges.length) return [];
    return [{ ...chunk, method: matched.kind, containsExactQuote: normalize(chunk.text).includes(item.normalized),
      ...(matched.kind === 'source-range-overlap' ? { chunkRange: matched.chunkRange, goldRange: matched.goldRange, overlapCharacters: matched.overlapCharacters } : {}) }];
  });
  const baseline = itemRank(item, req.candidates, source, c.source.documentId, match);
  const after = itemRank(item, result.indices.map(i => req.candidates[i]), source, c.source.documentId, match);
  return { itemId: item.itemId, quote: item.text, normalizedQuote: item.normalized, wordCount: item.wordCount, lengthGroup: item.lengthGroup,
    originalGoldRanges: item.ranges, before: baseline, after,
    originalBestChunk: matchingCandidates.find(m => m.beforeRank === baseline.rank) ?? null,
    rerankedBestChunk: matchingCandidates.find(m => m.afterRank === after.rank) ?? null,
    matchingCandidates: matchingCandidates.sort((a, b) => a.afterRank - b.afterRank) };
}
const cases = changedIds.map(caseId => {
  const c = planById.get(caseId), q = qPlans.find(p => p.caseId === caseId); devOnly(q.paperId, split);
  const affectedItems = [...new Set(changes.filter(x => x.caseId === caseId).map(x => x.itemId))];
  return { caseId, paperId: c.paperId, group: c.group, actualQuestion: q.variants.Q.question, changes: changes.filter(x => x.caseId === caseId),
    modes: ['dense', 'hybrid'].map(mode => {
      const pool = poolFor(caseId, mode);
      return { mode, sentQuery: pool.req.query, candidateCount: pool.candidates.length, items: affectedItems.map(id => itemEvidence(c, c.items.find(i => i.itemId === id), pool)),
        top5Before: pool.candidates.slice(0, 5), top5After: [...pool.candidates].sort((a, b) => a.afterRank - b.afterRank).slice(0, 5) };
    }) };
});
const longOmission = [...planById.values()].filter(c => c.group === 'chunk_omission').flatMap(c => c.items.filter(i => i.lengthGroup === '4+ words' && i.ranges.length).map(item => ({
  caseId: c.caseId, paperId: c.paperId, actualQuestion: qPlans.find(p => p.caseId === c.caseId).variants.Q.question,
  modes: ['dense', 'hybrid'].map(mode => ({ mode, ...itemEvidence(c, item, poolFor(c.caseId, mode)) }))
})));
const cohort = ['chunk_omission', 'acceptable'].flatMap(group => ['4+ words', 'under 4 words', 'all'].map(length => {
  const plans = [...planById.values()].filter(c => c.group === group), items = plans.flatMap(c => c.items.filter(i => length === 'all' || i.lengthGroup === length));
  return { group, quoteLength: length, selectedCases: plans.length, casesWithGoldItems: plans.filter(c => c.items.some(i => length === 'all' || i.lengthGroup === length)).length,
    scorableCases: plans.filter(c => c.items.some(i => (length === 'all' || i.lengthGroup === length) && i.ranges.length)).length,
    goldItems: items.length, mappedItems: items.filter(i => i.ranges.length).length, unmappedItems: items.filter(i => !i.ranges.length).length,
    noGoldCases: plans.filter(c => !c.items.length).map(c => ({ caseId: c.caseId, originalMappingStatus: c.mapping })),
    noMappedGoldCases: plans.filter(c => !c.items.some(i => i.ranges.length)).map(c => ({ caseId: c.caseId, originalMappingStatus: c.mapping, goldItems: c.items.length })) };
}));
const ledger = lines(`${r2}/attempts.jsonl`).filter(x => x.event === 'reserved' && x.kind === 'dev');
const transport = requests.map(req => {
  const pool = poolFor(req.caseId, req.mode), attempt = ledger.find(x => x.caseId === req.caseId && x.mode === req.mode);
  const sorted = pool.result.scores.every((score, i, scores) => Number.isFinite(score) && (i === 0 || scores[i - 1] >= score));
  const tiesStable = pool.result.scores.every((score, i, scores) => i === 0 || scores[i - 1] !== score || pool.result.indices[i - 1] < pool.result.indices[i]);
  if (!attempt || attempt.payloadSha256 !== sha(JSON.stringify({ query: req.query, candidates: req.candidates })) || !sorted || !tiesStable) throw Error('Transport/sort audit failed');
  return { caseId: req.caseId, mode: req.mode, payloadHashMatchesFrozenQueryAndCandidates: true, exactPermutation: true, descendingScores: sorted, stableTies: tiesStable,
    queryBytes: Buffer.byteLength(req.query), candidateCount: req.candidates.length, maxCandidateBytes: Math.max(0, ...req.candidates.map(c => Buffer.byteLength(c.text))) };
});
const signature = c => JSON.stringify([c.documentId, c.chunkIndex, c.source, c.page, c.text]);
const acrossModes = selected.map(caseId => {
  const dense = poolFor(caseId, 'dense'), hybrid = poolFor(caseId, 'hybrid'), byChunk = new Map(hybrid.candidates.map(c => [signature(c), c]));
  const common = dense.candidates.flatMap(c => byChunk.has(signature(c)) ? [{ documentId: c.documentId, chunkIndex: c.chunkIndex, denseScore: c.rerankScore, hybridScore: byChunk.get(signature(c)).rerankScore,
    exactlyEqual: c.rerankScore === byChunk.get(signature(c)).rerankScore }] : []);
  return { caseId, identicalQueries: dense.req.query === hybrid.req.query, commonCandidates: common.length, identicalScoreCandidates: common.filter(c => c.exactlyEqual).length,
    differentScoreCandidates: common.filter(c => !c.exactlyEqual), allCommonScoresIdentical: common.length > 0 && common.every(c => c.exactlyEqual), chunkScores: common };
});
const firstHitMethods = { before: {}, after: {} };
for (const c of planById.values()) for (const mode of ['dense', 'hybrid']) {
  const pool = poolFor(c.caseId, mode);
  for (const item of c.items.filter(i => i.ranges.length)) {
    const e = itemEvidence(c, item, pool);
    for (const which of ['before', 'after']) if (e[which].rank !== null) firstHitMethods[which][e[which].method] = (firstHitMethods[which][e[which].method] ?? 0) + 1;
  }
}
for (const f of preserved) if (sha(fs.readFileSync(f.file)) !== f.sha256) throw Error('Frozen file changed during diagnostic');
const uniqueChange = direction => [...new Map(changes.filter(c => c.direction === direction).map(c => [c.caseId + ':' + c.itemId, { caseId: c.caseId, itemId: c.itemId }])).values()];
const evidence = { changes: { uniqueAffectedCases: cases.length, uniqueGainedCases: new Set(changes.filter(c => c.direction === 'gains').map(c => c.caseId)).size,
  uniqueRegressedCases: new Set(changes.filter(c => c.direction === 'regressions').map(c => c.caseId)).size, uniqueItemGains: uniqueChange('gains'), uniqueItemRegressions: uniqueChange('regressions') },
  cases, longOmissionItems: longOmission, cohort, transport, acrossModes, firstHitMethods,
  byteSizes: { maxQueryBytes: Math.max(...transport.map(t => t.queryBytes)), maxCandidateBytes: Math.max(...transport.map(t => t.maxCandidateBytes)), poolSizes: [...new Set(transport.map(t => t.candidateCount))] },
  preservedFiles: preserved, noNetworkOrInference: true, noApplicationEdits: true, sourceReadCaseIds: [...sourceByCase.keys()] };
fs.writeFileSync(`${base}/evidence.json`, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ changes: evidence.changes, cohort: cohort.map(({noGoldCases,noMappedGoldCases,...r}) => r), firstHitMethods,
  crossMode: { cases: acrossModes.length, allCommonIdentical: acrossModes.filter(c => c.allCommonScoresIdentical).length, commonCandidates: acrossModes.reduce((s,c)=>s+c.commonCandidates,0), identicalScores: acrossModes.reduce((s,c)=>s+c.identicalScoreCandidates,0) } }));
