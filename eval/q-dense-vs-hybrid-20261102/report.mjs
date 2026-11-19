import fs from 'node:fs';
import path from 'node:path';
import { BASE, OLD, read, lines, sha, save } from './common.mjs';
import { scoreItems, caseChanges } from '../ap-query-form-20261102/metrics.mjs';

if (read(path.join(BASE, 'execution-status.json')).status !== 'complete') throw Error('Dense run incomplete');
const preflight = read(path.join(BASE, 'preflight.json'));
for (const f of preflight.hybridBaseline.preservedFiles) if (sha(fs.readFileSync(f.file)) !== f.sha256) throw Error('Saved hybrid baseline changed');
const prior = preflight.hybridBaseline.directory;
const dense = ['pdf', 'docx'].flatMap(f => lines(path.join(BASE, `${f}.results.jsonl`)));
const hybrid = ['pdf', 'docx'].flatMap(f => lines(path.join(prior, `${f}.results.jsonl`)));
const denseTraces = ['pdf', 'docx'].flatMap(f => lines(path.join(BASE, `${f}.traces.jsonl`)));
const hybridTraces = ['pdf', 'docx'].flatMap(f => lines(path.join(prior, `${f}.traces.jsonl`)));
if (dense.length !== 459 || hybrid.length !== 459 || denseTraces.length !== 459 || new Set(dense.map(r => r.caseId)).size !== 459) throw Error('Incomplete/duplicate dense rankings');
for (const d of dense) {
  const h = hybrid.find(r => r.caseId === d.caseId);
  if (JSON.stringify(d.scope) !== JSON.stringify(h.scope) || JSON.stringify(d.items.map(i => [i.itemId, i.quote, i.mapping])) !== JSON.stringify(h.items.map(i => [i.itemId, i.quote, i.mapping]))) throw Error('Dense/hybrid scope or gold differs');
}
const recall = [], changes = [], byLength = [];
for (const group of ['chunk_omission', 'acceptable']) for (const length of ['4+ words', 'under 4 words']) for (const mode of ['hybrid', 'dense']) {
  recall.push({ group, quoteLength: length, mode, ...scoreItems((mode === 'dense' ? dense : hybrid).filter(r => r.group === group), length) });
}
const pairs = [...hybrid.map(r => ({ ...r, variant: 'A' })), ...dense.map(r => ({ ...r, variant: 'P' }))];
const rename = row => { const { Aonly, Ponly, ...other } = row; return { ...other, hybridOnly: Aonly, denseOnly: Ponly }; };
for (const group of ['chunk_omission', 'acceptable']) for (const k of [5, 10, 20, 50]) {
  changes.push(rename(caseChanges(pairs, k, group)));
  for (const length of ['4+ words', 'under 4 words']) byLength.push(rename(caseChanges(pairs, k, group, length)));
}
const behavior = [];
for (const group of ['chunk_omission', 'acceptable', 'scope_rejection']) for (const mode of ['hybrid', 'dense']) {
  const rows = (mode === 'dense' ? dense : hybrid).filter(r => r.group === group), ids = new Set(rows.map(r => r.caseId));
  const traces = (mode === 'dense' ? denseTraces : hybridTraces).filter(t => ids.has(t.caseId));
  behavior.push({ group, mode, cases: rows.length, scopeRejected: rows.filter(r => r.scope.documentIds?.length === 0).length, relevanceRejected: traces.filter(t => t.denseGatePassed === false).length, returnedChunks: rows.filter(r => r.retrieved.length).length, sameDocumentExpansionCalls: mode === 'dense' ? traces.reduce((sum, t) => sum + t.sameDocumentExpansionCalls, 0) : null });
}
const gateDifferences = denseTraces.filter(d => d.denseGatePassed !== hybridTraces.find(h => h.caseId === d.caseId).denseGatePassed).map(d => ({ caseId: d.caseId, dense: d.denseGatePassed, hybrid: hybridTraces.find(h => h.caseId === d.caseId).denseGatePassed }));
const frozen = read(path.join(OLD, 'production-manifest.json'));
const sourceMismatches = frozen.sourceHashes.filter(f => sha(fs.readFileSync(f.file)) !== f.sha256);
const splitUnchanged = sha(fs.readFileSync('eval/split.json')) === preflight.splitSha256;
if (!splitUnchanged || sourceMismatches.length) throw Error('Preservation failed');
const summary = { status: 'complete', queryForm: 'Q: original question, same immutable document scope as A', denseCases: dense.length, reusedHybridCases: hybrid.length, recall, caseChanges: changes, behavior, relevanceGateDifferences: gateDifferences, splitUnchanged, productionFilesChecked: frozen.sourceHashes.length, productionSourceMismatches: sourceMismatches, hybridBaselineUnchanged: true, answerGenerationCalls: 0, caveats: ['Quote-item retrieval, not generated answer correctness.', 'Only exact source-locatable gold items scored; whitespace-only exact containment or verified same-paper character-range overlap rule retained.', 'Cutoffs are from one top50 ranking. Default dense same-document expansion retained. Hybrid k50 uses200candidates per prefetch.', 'Hybrid rankings are a verified saved baseline, not contemporaneously rerun.', 'Dev-only document boundary, existing collection-wide IDF and frozen sparse statistics retained.'] };
save('final-summary.json', summary);
save('case-changes.json', { allQuotes: changes, byQuoteLength: byLength });
save('item-recall.json', recall);
save('retrieval-behavior.json', { behavior, relevanceGateDifferences: gateDifferences });
save('item-first-ranks.jsonl', dense.flatMap(r => r.items.map(i => JSON.stringify({ caseId: r.caseId, paperId: r.paperId, group: r.group, mode: 'dense', ...i }))).join('\n') + '\n');
const pct = n => n === null ? 'N/A' : (100 * n).toFixed(2) + '%';
function table(length) {
  return ['| Cases | Mode | Mapped items | Recall@5 | @10 | @20 | @50 | MRR@50 |', '|---|---|---:|---:|---:|---:|---:|---:|', ...recall.filter(r => r.quoteLength === length).map(r => `| ${r.group} | ${r.mode} | ${r.mappedItems} | ${pct(r.r5)} | ${pct(r.r10)} | ${pct(r.r20)} | ${pct(r.r50)} | ${r.mrr.toFixed(4)} |`)].join('\n');
}
const changeTable = ['| Cases | Cutoff | Both find an item | Hybrid only | Dense only | Neither | Different |', '|---|---:|---:|---:|---:|---:|---:|', ...changes.map(r => `| ${r.group} | ${r.k} | ${r.both} | ${r.hybridOnly} | ${r.denseOnly} | ${r.neither} | ${r.different} |`)].join('\n');
const behaviorTable = ['| Cases | Mode | Cases tested | Scope rejected | Relevance rejected | Returned chunks |', '|---|---|---:|---:|---:|---:|', ...behavior.map(r => `| ${r.group} | ${r.mode} | ${r.cases} | ${r.scopeRejected} | ${r.relevanceRejected} | ${r.returnedChunks} |`)].join('\n');
const text = `# Q: default dense retrieval versus hybrid — 2026-11-02

Q asks the actual question within the same selected paper as A. The query text, document scope, model/prefixes, relevance threshold 0.63, gold items and dev-only boundary were kept identical. Only retrieval mode changed. Dense uses the actual existing default retrieve() branch, including its initial thresholded search and its same-document fill at threshold 0 after the initial search passes. No production code was modified.

459 dev cases were run for dense (236 omissions, 204 acceptable, 19 separate scope rejections). The 459 verified saved Q hybrid rankings were reused. Each mode provides one top-50 ranking per case; cutoffs are slices of that ranking, not separate production-k runs.

## Quotes of four or more words

${table('4+ words')}

## Quotes under four words

${table('under 4 words')}

Recall is micro item recall. MRR averages reciprocal first-hit rank over mapped quote items, with zero for not found. Matching remains exact whitespace-normalized quote containment OR verified same-paper normalized character-range overlap, as previously approved. Gold items must come from their own paper. This does not grade generated answers or guarantee full-answer coverage.

Unmapped items were excluded identically: omissions 214 long / 45 short; acceptable 158 long / 22 short. There are 157 scorable omission cases and 118 scorable acceptable cases; 79 omissions and 86 acceptable cases lack mapped gold and remain unscorable. They were still queried.

## Case-level differences

Here a case hit means at least one mapped gold item appears within the cutoff. It does not mean a correct or complete answer. More detailed length-specific case differences are saved in case-changes.json.

${changeTable}

## Scope and relevance behavior

${behaviorTable}

Scope rejections remain separate from recall. Dense and hybrid have ${gateDifferences.length} differences in whether the existing relevance gate passes. Dense request traces distinguish the thresholded search from the existing same-document expansion; keyword/fusion requests were blocked by the dense harness.

## Validation and preservation

Five focused checks passed before live execution. All 33 frozen production source hashes, split.json, and the manifested Q hybrid baseline files remain unchanged. Retrieved payloads were verified against dev-only indexed snapshots. No held-out paper content, answer generation, follow-up rewrite, Cloudflare call, ingestion, index mutation, deployment or GitHub push occurred. Only new files under eval/q-dense-vs-hybrid-20261102 were created.

Raw rankings/traces are in pdf/docx.results.jsonl and pdf/docx.traces.jsonl. Full machine-readable summaries are in final-summary.json, item-recall.json, case-changes.json and retrieval-behavior.json. Item ranks are in item-first-ranks.jsonl. Hybrid is a saved baseline from the preceding Q run; no runtime-performance conclusion is drawn from this comparison.
`;
save('RESULTS.md', text);
save('preservation-check.json', { splitUnchanged, productionFilesChecked: frozen.sourceHashes.length, productionSourceMismatches: sourceMismatches, hybridBaselineFilesUnchanged: preflight.hybridBaseline.preservedFiles.length, newFilesRoot: 'eval/q-dense-vs-hybrid-20261102' });
const files = fs.readdirSync(BASE, { withFileTypes: true }).filter(x => x.isFile()).map(x => { const file = path.join(BASE, x.name); return { file: path.relative(process.cwd(), file).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(file)) }; });
save('submission-manifest.json', { status: 'complete', files, splitSha256: preflight.splitSha256, productionSourceMismatches: sourceMismatches });
console.log('LONG QUOTES\n' + table('4+ words') + '\n\nSHORT QUOTES\n' + table('under 4 words') + '\n\n' + changeTable + '\n\n' + behaviorTable + '\n\nGATE DIFFERENCES ' + gateDifferences.length);
