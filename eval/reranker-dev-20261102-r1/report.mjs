import fs from 'node:fs';
import path from 'node:path';
import { DIAG, lines, sha, inside, normalize, match, devOnly } from '../exact-quote-v2/common.mjs';
import { itemRank } from '../ap-query-form-20261102/common.mjs';
import { scoreItems, caseChanges } from '../ap-query-form-20261102/metrics.mjs';
const base = 'eval/reranker-dev-20261102-r1';
const manifest = JSON.parse(fs.readFileSync(`${base}/sample-manifest.json`));
for (const f of manifest.inputs) if (sha(fs.readFileSync(f.file)) !== f.sha256) throw Error('Frozen input changed');
const resultsFile = `${base}/reranked-results.jsonl`;
if (!fs.existsSync(resultsFile)) {
  console.log('LIVE PENDING: no reranked results; no gains/regressions or answer-quality claim is available.');
  process.exit(0);
}
const split = JSON.parse(fs.readFileSync('eval/split.json'));
const plans = lines('eval/ap-query-form-20261102/case-plan.jsonl');
const requests = lines(`${base}/requests.jsonl`), results = lines(resultsFile), pairs = [];
if (new Set(results.map(r => `${r.mode}:${r.caseId}`)).size !== results.length) throw Error('Duplicate result');
for (const r of results) {
  const request = requests.find(q => q.mode === r.mode && q.caseId === r.caseId);
  if (!request) throw Error('Result outside frozen sample');
  devOnly(request.paperId, split);
  const plan = plans.find(c => c.caseId === r.caseId);
  if (!plan || plan.paperId !== request.paperId) throw Error('Gold identity mismatch');
  devOnly(plan.paperId, split);
  const bytes = fs.readFileSync(inside(DIAG, plan.source.fullTextPath));
  if (sha(bytes) !== plan.source.extractedTextSha256) throw Error('Dev source changed');
  const source = normalize(bytes.toString('utf8'));
  if (!Array.isArray(r.indices) || r.indices.length !== request.candidates.length || new Set(r.indices).size !== r.indices.length || r.indices.some(i => !Number.isInteger(i) || i < 0 || i >= request.candidates.length)) throw Error('Invalid full rerank permutation');
  const ordered = r.indices.map(i => request.candidates[i]);
  for (const [variant, chunks] of [['A', request.candidates], ['P', ordered]]) {
    pairs.push({ caseId: r.caseId, group: request.group, mode: r.mode, variant,
      items: plan.items.map(item => ({ itemId: item.itemId, lengthGroup: item.lengthGroup, ...itemRank(item, chunks, source, plan.source.documentId, match) })) });
  }
}
const metrics = [], changes = [], itemChanges = [];
for (const mode of ['dense', 'hybrid']) for (const group of ['chunk_omission', 'acceptable']) for (const length of ['4+ words', 'under 4 words']) {
  const rows = pairs.filter(r => r.mode === mode && r.group === group);
  for (const variant of ['A', 'P']) metrics.push({ mode, group, length, variant, ...scoreItems(rows.filter(r => r.variant === variant), length) });
  for (const k of [5, 10, 20, 50]) {
    changes.push({ mode, ...caseChanges(rows, k, group, length) });
    const gains = [], regressions = [];
    for (const a of rows.filter(r => r.variant === 'A')) {
      const p = rows.find(r => r.caseId === a.caseId && r.variant === 'P');
      for (const item of a.items.filter(i => i.mapping === 'mapped' && i.lengthGroup === length)) {
        const after = p.items.find(i => i.itemId === item.itemId);
        const beforeHit = item.rank !== null && item.rank <= k, afterHit = after.rank !== null && after.rank <= k;
        if (beforeHit !== afterHit) (afterHit ? gains : regressions).push({ caseId: a.caseId, itemId: item.itemId, before: item.rank, after: after.rank });
      }
    }
    itemChanges.push({ mode, group, length, k, gains, regressions });
  }
}
fs.writeFileSync(`${base}/comparison.json`, JSON.stringify({ metrics, caseChanges: changes, itemChanges,
  caveat: 'Frozen sampled dev pools only. Item hits and any-item case changes are not complete-answer coverage or answer accuracy.' }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ completedPools: results.length, expectedMaximum: 40, comparison: `${base}/comparison.json` }));
