import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BASE, read, lines, save, randomSample, sha } from './common.mjs';

const policy = read(path.join(BASE, 'preflight.json'));
function execute(group, k) {
  const all = [];
  for (const format of ['pdf', 'docx']) {
    const label = `${group}-${format}-k${k}`, summaryFile = path.join(BASE, label + '.summary.json');
    if (!fs.existsSync(summaryFile)) {
      const child = spawnSync(process.execPath, ['--import', 'tsx', 'eval/exact-quote-v2/worker.mjs', group, format, String(k)], { stdio: 'inherit', timeout: 60 * 60 * 1000 });
      if (child.error) throw child.error;
    }
    const summary = read(summaryFile);
    if (summary.status !== 'complete') throw Error(`${label}: ${summary.error}`);
    all.push(...lines(path.join(BASE, label + '.rows.jsonl')));
  }
  return all;
}
function score(rows) {
  const eligible = rows.filter(x => x.eligible), hits = eligible.filter(x => x.found);
  return { run: rows.length, eligible: eligible.length, hits: hits.length, rate: eligible.length ? hits.length / eligible.length : null, unmappedOrNoAnswerQuote: rows.length - eligible.length, mappingCounts: Object.fromEntries([...new Set(rows.map(x => x.mapping))].map(m => [m, rows.filter(x => x.mapping === m).length])) };
}
function examples(rows) {
  const hitRows = randomSample(rows.filter(x => x.eligible && x.found), 10);
  const missRows = randomSample(rows.filter(x => x.eligible && !x.found), 10);
  const simplify = (row, hit) => {
    const rank = hit ? row.firstMatchRank : row.retrieved.length ? 1 : null;
    const chosen = hit ? row.matches[rank - 1] : null;
    const gold = chosen ? row.gold[chosen.goldIndex] : row.gold.find(g => g.ranges.length);
    return { caseId: row.caseId, group: row.group, question: row.question, hit, rank, chunk: rank ? row.retrieved[rank - 1] : null, goldQuote: gold?.text ?? null, match: chosen, note: hit ? 'Entire quoted text or same-paper interval overlap, per requested rule.' : 'No top-five chunk matched any mapped gold quote; displayed chunk is rank1, not a retrieved answer.' };
  };
  const result = { seed: 42, requestedPerClass: 10, availableHits: rows.filter(x => x.eligible && x.found).length, availableMisses: rows.filter(x => x.eligible && !x.found).length, hits: hitRows.map(x => simplify(x, true)), misses: missRows.map(x => simplify(x, false)) };
  save('random-examples.json', result);
  const sections = [];
  for (const [kind, values] of [['HIT', result.hits], ['MISS', result.misses]]) for (const [index, value] of values.entries()) {
    sections.push(`## ${kind} ${index + 1}: ${value.caseId}\n\nQuestion: ${value.question}\n\n${value.note}\n\nChunk (rank ${value.rank ?? 'none'}):\n\n\`\`\`text\n${value.chunk?.text ?? '[No chunk returned]'}\n\`\`\`\n\nEntire gold quote:\n\n\`\`\`text\n${value.goldQuote}\n\`\`\`\n\nMatch details: ${JSON.stringify(value.match)}\n`);
  }
  const text = '# Random k=5 hits and misses\n\nSeed 42. Quotes are whole annotated answer quotes. Misses show the first retrieved chunk for comparison.\n\n' + sections.join('\n');
  save('random-examples.md', text);
  console.log(text);
}
let result;
try {
  const omission = execute('chunk_omission', 5), omissionScore = score(omission);
  save('step3-omission-hits.json', omission.filter(x => x.found));
  console.log('STEP3A', JSON.stringify(omissionScore));
  // Always print all observed hits, including the exact quote and complete matching chunk.
  for (const row of omission.filter(x => x.found)) console.log('OMISSION_HIT', JSON.stringify({ caseId: row.caseId, rank: row.firstMatchRank, match: row.matches[row.firstMatchRank - 1], chunk: row.retrieved[row.firstMatchRank - 1], goldQuote: row.matches[row.firstMatchRank - 1].quote }));
  if (omissionScore.rate === null || omissionScore.rate > policy.nearZeroMaxRate) {
    examples(omission);
    result = { status: 'stopped_step3a', reason: 'Mapped-gold omission hit rate is not near zero under the requested exact-quote OR range-overlap rule. No acceptable or top50 retrieval performed.', omissionK5: omissionScore, acceptableK5: null, recall: null, mrr: null, scopeRejections: { devCases: 19, excludedFromRecall: true, run: false }, top50ProductionComparison: { run: false } };
  } else {
    const acceptable = execute('acceptable', 5), acceptableScore = score(acceptable);
    console.log('STEP3B', JSON.stringify(acceptableScore)); examples([...omission, ...acceptable]);
    if (acceptableScore.rate === null || acceptableScore.rate < policy.acceptableHighMinRate) {
      result = { status: 'stopped_step3b', reason: 'Acceptable mapped-gold hit rate is below predeclared 70% clearly-high sanity criterion. No top50 run.', omissionK5: omissionScore, acceptableK5: acceptableScore, recall: null, mrr: null, scopeRejections: { devCases: 19, excludedFromRecall: true, run: false }, top50ProductionComparison: { run: false } };
    } else {
      const top50 = execute('chunk_omission', 50), scored = top50.filter(x => x.eligible);
      const metrics = Object.fromEntries([5, 10, 20, 50].map(k => [`recallAt${k}`, { hits: scored.filter(x => x.firstMatchRank !== null && x.firstMatchRank <= k).length, cases: scored.length, rate: scored.length ? scored.filter(x => x.firstMatchRank !== null && x.firstMatchRank <= k).length / scored.length : null }]));
      const mrr = scored.reduce((n, x) => n + (x.firstMatchRank === null ? 0 : 1 / x.firstMatchRank), 0) / scored.length;
      const identity = chunks => chunks.map(x => `${x.documentId}/${x.chunkIndex}/${sha(x.text)}`);
      const comparison = randomSample(top50, 20).map(x => ({ caseId: x.caseId, production: identity(x.productionK5), top50First5: identity(x.retrieved.slice(0, 5)), equal: JSON.stringify(identity(x.productionK5)) === JSON.stringify(identity(x.retrieved.slice(0, 5))) }));
      save('production-top5-comparison.json', comparison);
      save('first-match-ranks.jsonl', top50.map(x => JSON.stringify({ caseId: x.caseId, paperId: x.paperId, mapping: x.mapping, firstMatchRank: x.firstMatchRank ?? 'not found', eligible: x.eligible })).join('\n') + '\n');
      result = { status: 'complete', omissionK5: omissionScore, acceptableK5: acceptableScore, top50CasesRun: top50.length, metrics, mrr, scopeRejections: { devCases: 19, excludedFromRecall: true, run: false }, top50ProductionComparison: { run: true, sample: comparison.length, different: comparison.filter(x => !x.equal).length, caveat: 'Production hybrid prefetch depends on k (20 candidates at k5,200 at k50). Recall from one k50 ranking is not automatically equivalent to separate production runs at each k.' } };
    }
  }
} catch (e) { result = { status: 'blocked', reason: `${e.name}: ${e.message}` }; }
result.policy = { nearZeroMaxRate: policy.nearZeroMaxRate, acceptableHighMinRate: policy.acceptableHighMinRate, gold: policy.goldPolicy, normalization: policy.normalization };
result.splitUnchanged = sha(fs.readFileSync('eval/split.json')) === policy.splitSha256;
save('final-summary.json', result);
console.log('FINAL_SUMMARY', JSON.stringify(result, null, 2));
