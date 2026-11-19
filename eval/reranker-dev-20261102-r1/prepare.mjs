import fs from 'node:fs';
import path from 'node:path';
import { devOnly, lines, sha } from '../exact-quote-v2/common.mjs';
import { scoreItems } from '../ap-query-form-20261102/metrics.mjs';

const base = 'eval/reranker-dev-20261102-r1';
const splitBytes = fs.readFileSync('eval/split.json'), split = JSON.parse(splitBytes);
const files = ['eval/split.json', 'eval/ap-query-form-20261102/case-plan.jsonl'];
const plans = lines('eval/question-only-same-paper-20261102/case-plan.jsonl');
plans.forEach(c => devOnly(c.paperId, split));
files.push('eval/question-only-same-paper-20261102/case-plan.jsonl');
const pools = {};
for (const [mode, dir] of [['hybrid', 'question-only-same-paper-20261102'], ['dense', 'q-dense-vs-hybrid-20261102']]) {
  pools[mode] = ['pdf', 'docx'].flatMap(format => {
    const file = `eval/${dir}/${format}.results.jsonl`; files.push(file);
    const rows = lines(file); rows.forEach(r => devOnly(r.paperId, split)); return rows;
  });
  if (pools[mode].length !== 459 || new Set(pools[mode].map(c => c.caseId)).size !== 459) throw Error('Frozen pool count/uniqueness changed');
}
const sample = ['chunk_omission', 'acceptable'].flatMap(group => plans.filter(c => c.group === group)
  .sort((a, b) => sha(`RERANK-1:${a.caseId}`).localeCompare(sha(`RERANK-1:${b.caseId}`))).slice(0, 10));
if (sample.length !== 20) throw Error('Sample count mismatch');
const requests = sample.flatMap(c => ['dense', 'hybrid'].map(mode => {
  const row = pools[mode].find(r => r.caseId === c.caseId);
  if (!row || row.paperId !== c.paperId || row.retrieved.some(chunk => chunk.documentId !== row.targetDocumentId)) throw Error('Frozen scope identity mismatch');
  const query = c.variants.Q.keywordInput;
  return { caseId: c.caseId, paperId: c.paperId, group: c.group, mode, query, candidates: row.retrieved,
    queryBytes: Buffer.byteLength(query), candidateBytes: row.retrieved.map(chunk => Buffer.byteLength(chunk.text)), candidateCount: row.retrieved.length,
    requestBytes: Buffer.byteLength(JSON.stringify({ query, contexts: row.retrieved.map(chunk => ({ text: chunk.text })), top_k: row.retrieved.length })) };
}));
const metrics = [];
for (const mode of ['dense', 'hybrid']) for (const group of ['chunk_omission', 'acceptable']) for (const length of ['4+ words', 'under 4 words']) {
  metrics.push({ mode, group, length, ...scoreItems(pools[mode].filter(r => r.group === group), length) });
}
const summary = { status: 'offline-complete-live-pending', model: '@cf/baai/bge-reranker-base',
  hostedInferenceCalls: 0, answerGenerationCalls: 0, rewriteCalls: 0,
  liveBlocker: 'Token active (HTTP 200 verification); subscriptions and billable-usage read checks both HTTP 403/code 10000. Free-only billing protection and remaining allowance unverified. No inference permitted.',
  samplePolicy: 'First ten per group by SHA256(RERANK-1:caseId); selected before any reranker outcomes, including unscorable or rejected cases.',
  sampleIds: sample.map(c => ({ caseId: c.caseId, group: c.group })),
  maximumAuthorizedCalls: { synthetic: 4, dev: 40, total: 44, serial: true, retries: 0 },
  baselines: metrics, rerankedMetrics: null, itemGainsAndRegressions: null, caseGainsAndRegressions: null,
  sizeInspection: { pools: requests.length, empty: requests.filter(r => !r.candidateCount).length,
    largestQueryBytes: Math.max(...requests.map(r => r.queryBytes)), largestCandidateBytes: Math.max(...requests.flatMap(r => r.candidateBytes)),
    inputBoundRejections: requests.filter(r => r.queryBytes > 2048 || r.candidateBytes.some(n => n > 8192) || r.candidateCount > 50).map(r => ({ caseId: r.caseId, mode: r.mode })) },
  caveats: ['No hosted rerank quality, latency or truncation behavior measured.', 'Byte bounds are resource limits, not BGE 512-token accounting. Text is preserved.', 'Item recall and any-item case hits do not establish complete-answer coverage or answer accuracy.', 'Q hybrid first five is a slice of one k50 ranking, not a production k5 query.'],
  inputs: files.map(file => ({ file, sha256: sha(fs.readFileSync(file)) })),
  originalGold: 'eval/ap-query-form-20261102/case-plan.jsonl',
  relatedBaselines: ['eval/ap-query-form-20261102/RESULTS.md', 'eval/question-only-same-paper-20261102/RESULTS.md', 'eval/q-dense-vs-hybrid-20261102/RESULTS.md'] };
const write = (file, value) => fs.writeFileSync(path.join(base, file), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
write('sample-manifest.json', summary);
write('requests.jsonl', requests.map(r => JSON.stringify(r)).join('\n') + '\n');
write('attempts.jsonl', '');
console.log(JSON.stringify({ status: summary.status, sampleCases: sample.length, savedPools: requests.length, liveCalls: 0, sizeInspection: summary.sizeInspection }));
