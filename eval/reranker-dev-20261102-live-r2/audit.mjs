import fs from 'node:fs';
import { DIAG, lines, sha, inside, normalize, match, devOnly } from '../exact-quote-v2/common.mjs';
import { itemRank } from '../ap-query-form-20261102/common.mjs';
const base = 'eval/reranker-dev-20261102-live-r2';
const split = JSON.parse(fs.readFileSync('eval/split.json'));
const plans = lines('eval/ap-query-form-20261102/case-plan.jsonl');
const requests = lines('eval/reranker-dev-20261102-r1/requests.jsonl');
const results = lines(`${base}/reranked-results.jsonl`);
let items = 0;
for (const mode of ['dense', 'hybrid']) {
  const directory = mode === 'dense' ? 'q-dense-vs-hybrid-20261102' : 'question-only-same-paper-20261102';
  const old = ['pdf', 'docx'].flatMap(format => lines(`eval/${directory}/${format}.results.jsonl`));
  for (const request of requests.filter(r => r.mode === mode)) {
    devOnly(request.paperId, split);
    const plan = plans.find(c => c.caseId === request.caseId), prior = old.find(c => c.caseId === request.caseId);
    if (!plan || plan.paperId !== request.paperId || prior.paperId !== request.paperId || JSON.stringify(prior.retrieved) !== JSON.stringify(request.candidates)) throw Error('Frozen candidate identity mismatch');
    const sourceBytes = fs.readFileSync(inside(DIAG, plan.source.fullTextPath));
    if (sha(sourceBytes) !== plan.source.extractedTextSha256) throw Error('Dev source changed');
    const source = normalize(sourceBytes.toString('utf8'));
    const result = results.find(r => r.mode === mode && r.caseId === request.caseId);
    if (!result || result.indices.length !== request.candidates.length || new Set(result.indices).size !== result.indices.length || result.indices.some(i => !Number.isInteger(i) || i < 0 || i >= request.candidates.length)) throw Error('Not exact candidate permutation');
    for (const item of plan.items) {
      const expected = prior.items.find(i => i.itemId === item.itemId);
      const baseline = itemRank(item, request.candidates, source, plan.source.documentId, match);
      const reranked = itemRank(item, result.indices.map(i => request.candidates[i]), source, plan.source.documentId, match);
      if (!expected || expected.rank !== baseline.rank || expected.mapping !== baseline.mapping || expected.method !== baseline.method) throw Error('Original saved baseline scoring differs');
      if (baseline.mapping !== reranked.mapping || (baseline.rank !== null) !== (reranked.rank !== null)) throw Error('Recall@50 changed');
      items++;
    }
  }
}
const manifest = JSON.parse(fs.readFileSync('eval/reranker-dev-20261102-r1/submission/manifest.json'));
const changed = manifest.files.filter(f => sha(fs.readFileSync(f.file)) !== f.sha256);
if (changed.length) throw Error('Reviewed r1 changed');
const audit = { pools: requests.length, itemRecordsChecked: items, exactSavedCandidatePools: true, exactPermutations: true, originalSavedBaselineRanksMappingsMethodsIdentical: true, recallAt50Invariant: true, reviewedR1FilesUnchanged: manifest.files.length, splitSha256: sha(fs.readFileSync('eval/split.json')) };
fs.writeFileSync(`${base}/audit.json`, JSON.stringify(audit, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(audit));
