import fs from 'node:fs';
import path from 'node:path';
import { BASE, OLD, read, lines, sha, save } from './common.mjs';
import { scoreItems, caseChanges } from '../ap-query-form-20261102/metrics.mjs';

if (read(path.join(BASE, 'execution-status.json')).status !== 'complete') throw Error('Q execution incomplete');
const prior = path.resolve('eval/ap-query-form-20261102');
const inputs = read(path.join(BASE, 'baseline-input-manifest.json'));
for (const f of inputs.preservedFiles) if (sha(fs.readFileSync(f.file)) !== f.sha256) throw Error('Preserved A/P artifact changed');
const baseline = ['pdf.results.jsonl', 'docx.results.jsonl', 'docx-resume.results.jsonl'].flatMap(f => lines(path.join(prior, f)));
const q = ['pdf', 'docx'].flatMap(f => lines(path.join(BASE, `${f}.results.jsonl`)));
const qTraces = ['pdf', 'docx'].flatMap(f => lines(path.join(BASE, `${f}.traces.jsonl`)));
if (q.length !== 459 || qTraces.length !== 459 || new Set(q.map(x => x.caseId)).size !== 459 || q.some(r => r.variant !== 'Q')) throw Error('Missing/duplicate Q results');
const records = [...baseline, ...q];
for (const r of q) {
  const a = baseline.find(x => x.caseId === r.caseId && x.variant === 'A');
  if (JSON.stringify(a.scope) !== JSON.stringify(r.scope)) throw Error('Q changed A scope');
  if (JSON.stringify(a.items.map(i => [i.itemId, i.quote, i.mapping])) !== JSON.stringify(r.items.map(i => [i.itemId, i.quote, i.mapping]))) throw Error('Q changed gold items or denominator');
}
const recall = [];
for (const group of ['chunk_omission', 'acceptable']) for (const length of ['4+ words', 'under 4 words']) for (const variant of ['A', 'P', 'Q']) {
  recall.push({ group, quoteLength: length, variant, ...scoreItems(records.filter(r => r.group === group && r.variant === variant), length) });
}
const changes = [], byLength = [], allMappedItems = [];
for (const from of ['A', 'P']) for (const group of ['chunk_omission', 'acceptable']) for (const k of [5, 10, 20, 50]) {
  const pair = records.filter(r => r.variant === from || r.variant === 'Q').map(r => ({ ...r, variant: r.variant === from ? 'A' : 'P' }));
  const rename = d => { const { Aonly, Ponly, ...other } = d; return { ...other, from, to: 'Q', fromOnly: Aonly, Qonly: Ponly }; };
  changes.push(rename(caseChanges(pair, k, group)));
  allMappedItems.push(rename(caseChanges(pair, k, group, undefined, true)));
  for (const length of ['4+ words', 'under 4 words']) byLength.push(rename(caseChanges(pair, k, group, length)));
}
const behavior = [];
const priorTraces = ['pdf.traces.jsonl', 'docx.traces.jsonl', 'docx-resume.traces.jsonl'].flatMap(f => lines(path.join(prior, f)));
for (const group of ['chunk_omission', 'acceptable', 'scope_rejection']) for (const variant of ['A', 'P', 'Q']) {
  const rows = records.filter(r => r.group === group && r.variant === variant), ids = new Set(rows.map(r => r.caseId));
  const traces = [...priorTraces, ...qTraces].filter(t => t.variant === variant && ids.has(t.caseId));
  behavior.push({ group, variant, cases: rows.length, scopeRejected: rows.filter(r => r.scope.documentIds?.length === 0).length, denseGateRejected: traces.filter(t => t.denseGatePassed === false).length, nonemptyResults: rows.filter(r => r.retrieved.length).length, targetPaperInTop50: rows.filter(r => r.targetPaperInTop50).length });
}
const splitUnchanged = sha(fs.readFileSync('eval/split.json')) === inputs.splitSha256;
const sourceMismatches = inputs.productionSourceHashes.filter(x => sha(fs.readFileSync(x.file)) !== x.sha256);
if (!splitUnchanged || sourceMismatches.length) throw Error('Preservation check failed');
const result = { status: 'complete', definitions: { A: 'paper-title wrapper, saved paper filter', P: 'original question, production unrestricted scope', Q: 'original question, same saved paper filter as A' }, newVariantCases: q.length, reusedBaselineRankings: baseline.length, retrievalMode: 'hybrid', topK: 50, recall, changes, allMappedItems, behavior, splitUnchanged, productionFilesChecked: inputs.productionSourceHashes.length, productionSourceMismatches: sourceMismatches, baselineInputsUnchanged: true, answerGenerationCalls: 0, caveats: ['Source-locatable quote items only, not final answer accuracy.', 'Old exact full quote containment OR verified same-paper character-range overlap rule preserved.', 'Cutoffs are slices of one k50 ranking, not independent production k5/k10/k20 runs.', 'A/P baselines reused from prior run; same frozen app, indexed payloads, sparse stats, model name/prefix/settings; no contemporary rerun of baselines.', 'The dev-only corpus boundary remains identical for A/P/Q; original full-collection IDF and sparse statistics remain in use.'] };
save('final-summary.json', result);
save('item-recall.json', recall);
save('case-changes.json', { anyItem: changes, anyItemByLength: byLength, allMappedItems });
save('retrieval-behavior.json', behavior);
save('item-first-ranks.jsonl', q.flatMap(r => r.items.map(i => JSON.stringify({ caseId: r.caseId, paperId: r.paperId, group: r.group, variant: 'Q', ...i }))).join('\n') + '\n');
const pct = value => value === null ? 'N/A' : (100 * value).toFixed(2) + '%';
function table(length) {
  return ['| Cases | Variant | Mapped items | R@5 | R@10 | R@20 | R@50 | MRR@50 |', '|---|---|---:|---:|---:|---:|---:|---:|', ...recall.filter(r => r.quoteLength === length).map(r => `| ${r.group} | ${r.variant} | ${r.mappedItems} | ${pct(r.r5)} | ${pct(r.r10)} | ${pct(r.r20)} | ${pct(r.r50)} | ${r.mrr.toFixed(4)} |`)].join('\n');
}
const changeTable = ['| Previous variant | Cases | Cutoff | Both find an item | Lost with Q | Gained with Q | Neither finds an item | Different |', '|---|---|---:|---:|---:|---:|---:|---:|', ...changes.map(r => `| ${r.from} | ${r.group} | ${r.k} | ${r.both} | ${r.fromOnly} | ${r.Qonly} | ${r.neither} | ${r.different} |`)].join('\n');
const behaviorTable = ['| Cases | Variant | Cases tested | Scope rejected | Relevance gate rejected | Returned chunks | Intended paper in top50 |', '|---|---|---:|---:|---:|---:|---:|', ...behavior.map(r => `| ${r.group} | ${r.variant} | ${r.cases} | ${r.scopeRejected} | ${r.denseGateRejected} | ${r.nonemptyResults} | ${r.targetPaperInTop50} |`)].join('\n');
const report = `# Question-only search within the same paper — 2026-11-02

The proposed change was implemented only in a new evaluation harness. The running app is unchanged. Q searches with the actual question while retaining A's exact saved document scope. This isolates the query-text change between A and Q. Missing document identities remain rejected; no gold paper was forced into scope.

- A: title-prefixed question, search the resolved paper.
- P: original question, search across dev papers under production unrestricted scope.
- Q: original question, search within the same paper as A.

All 459 dev cases were tested for Q: 236 prior chunk omissions, 204 acceptable cases, and 19 separate scope rejections. The 918 saved A/P rankings were integrity-checked and reused rather than rerun. Hybrid mode, model name, task prefixes, threshold 0.63, RRF fusion, original sparse statistics and dev corpus boundary were held constant. The source defaults dense unless configured otherwise; these are hybrid experiments.

Each result is a single request for up to 50 chunks. R@5/10/20/50 are cutoffs from that ranking. Metrics score individual source-locatable reference quote items, using the same whitespace-only exact containment or verified same-paper range overlap rule as the previous experiment. They do not measure final generated answer accuracy. Gold and all denominators are unchanged.

## Quotes of four or more words

${table('4+ words')}

## Quotes under four words

${table('under 4 words')}

Unmapped quote items excluded identically in all variants: omissions 214 long / 45 short; acceptable 158 long / 22 short. Cases with no mapped items remain unscorable: 79 omissions and 86 acceptable cases. Main case-change comparisons therefore cover 157 omission cases and 118 acceptable cases.

## Case changes

Finding at least one mapped item is a case-level hit for this table, not a complete or correct generated answer. Detailed per-length and all-mapped-item changes are in case-changes.json.

${changeTable}

## Scope and relevance gates

${behaviorTable}

Scope rejections are excluded from the main recall and case-change tables. Q preserves A's document selection including all 19 rejections. Its plain query can change the existing dense relevance-gate result; the threshold was not relaxed.

## Validation and preservation

Five focused tests passed before live execution. All 33 production source hashes, all 33 manifested A/P baseline artifacts, and split.json remain unchanged. Sparse-statistic hashes match the A/P baseline. Network guards checked actual embedding inputs, sparse encodings and document filters, blocked generation/nonlocal requests and held-out documents, and validated retrieved payloads against dev-only indexed snapshots. Only new files under eval/question-only-same-paper-20261102 were created.

Raw Q rankings and traces are in pdf/docx.results.jsonl and pdf/docx.traces.jsonl. All item ranks are in item-first-ranks.jsonl. Full comparisons are in final-summary.json and case-changes.json. A/P baselines are from the earlier run, so this is not a simultaneous baseline rerun. No answers, follow-up rewrites, ingestion, index mutations, deployment or GitHub push occurred.
`;
save('RESULTS.md', report);
save('preservation-check.json', { productionSourceMismatches: sourceMismatches, productionFilesChecked: inputs.productionSourceHashes.length, splitUnchanged, baselineFilesChecked: inputs.preservedFiles.length, baselineInputsUnchanged: true, newFilesRoot: 'eval/question-only-same-paper-20261102' });
const files = fs.readdirSync(BASE, { withFileTypes: true }).filter(f => f.isFile()).map(f => { const file = path.join(BASE, f.name); return { file: path.relative(process.cwd(), file).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(file)) }; });
save('submission-manifest.json', { status: 'complete', files, splitSha256: inputs.splitSha256, productionSourceMismatches: sourceMismatches });
console.log('LONG QUOTES\n' + table('4+ words') + '\n\nSHORT QUOTES\n' + table('under 4 words') + '\n\n' + changeTable + '\n\n' + behaviorTable);
