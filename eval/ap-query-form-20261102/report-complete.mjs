import fs from 'node:fs';
import path from 'node:path';
import { BASE, OLD, DIAG, read, lines, sha, inside, save } from './common.mjs';
import { scoreItems, caseChanges } from './metrics.mjs';

const status = read(path.join(BASE, 'execution-status.json'));
if (status.status !== 'complete') throw Error('Cannot report a partial run as complete: ' + status.error);
const records = ['pdf.results.jsonl', 'docx.results.jsonl', 'docx-resume.results.jsonl'].flatMap(file => lines(path.join(BASE, file)));
const traces = ['pdf.traces.jsonl', 'docx.traces.jsonl', 'docx-resume.traces.jsonl'].flatMap(file => lines(path.join(BASE, file)));
const plan = lines(path.join(BASE, 'case-plan.jsonl')), preflight = read(path.join(BASE, 'preflight.json'));
if (records.length !== 918 || traces.length !== 918 || new Set(records.map(r => r.caseId + '/' + r.variant)).size !== 918) throw Error('Missing or duplicate A/P executions');
const recall = [];
for (const group of ['chunk_omission', 'acceptable']) for (const length of ['4+ words', 'under 4 words']) for (const variant of ['A', 'P']) {
  const rows = records.filter(r => r.group === group && r.variant === variant);
  recall.push({ group, quoteLength: length, variant, ...scoreItems(rows, length) });
}
const differences = [], differencesByLength = [], allItemsDifferences = [];
for (const group of ['chunk_omission', 'acceptable']) for (const k of [5, 10, 20, 50]) {
  differences.push(caseChanges(records, k, group));
  allItemsDifferences.push(caseChanges(records, k, group, undefined, true));
  for (const length of ['4+ words', 'under 4 words']) differencesByLength.push(caseChanges(records, k, group, length));
}
const traceRows = [];
for (const group of ['chunk_omission', 'acceptable', 'scope_rejection']) for (const variant of ['A', 'P']) {
  const rows = records.filter(r => r.group === group && r.variant === variant), ids = new Set(rows.map(r => r.caseId));
  const tr = traces.filter(t => t.variant === variant && ids.has(t.caseId));
  traceRows.push({ group, variant, cases: rows.length, scopeRejected: rows.filter(r => r.scope.documentIds?.length === 0).length, unrestricted: rows.filter(r => r.scope.status === 'unrestricted').length, denseGateAttempted: tr.filter(t => t.denseGateCalls > 0).length, denseGateRejected: tr.filter(t => t.denseGatePassed === false).length, hybridExecuted: tr.filter(t => t.hybridCalls > 0).length, nonemptyResults: rows.filter(r => r.retrieved.length).length, targetPaperTop1: rows.filter(r => r.targetPaperTop1).length, targetPaperInTop50: rows.filter(r => r.targetPaperInTop50).length });
}
// Recheck document resolution on the frozen DEV header snapshot, without reading
// a held-out header or calling the collection-wide catalog endpoint.
const sources = lines(path.join(BASE, 'dev-sources.jsonl'));
const catalogs = { pdf: [], docx: [] };
for (const s of sources) {
  const header = lines(inside(DIAG, s.allChunksPath)).find(x => x.chunkIndex === 0);
  if (!header || header.documentId !== s.documentId || header.paperId !== s.paperId) throw Error('Dev header mismatch');
  catalogs[s.format].push(header.payload);
}
const { resolveFromHeaders } = await import('../../src/retrieval/documentScope.ts');
const scopeCases = plan.filter(c => c.group === 'scope_rejection').map(c => {
  const a = records.find(r => r.caseId === c.caseId && r.variant === 'A'), p = records.find(r => r.caseId === c.caseId && r.variant === 'P');
  const snapshotA = resolveFromHeaders(c.variants.A.question, catalogs[c.format]);
  const snapshotP = resolveFromHeaders(c.variants.P.question, catalogs[c.format]);
  return { caseId: c.caseId, paperId: c.paperId, Aquestion: c.variants.A.question, Pquestion: c.variants.P.question, capturedScopeA: a.scope, devSnapshotScopeA: snapshotA, executedScopeP: p.scope, devSnapshotScopeP: snapshotP, Pnonempty: p.retrieved.length > 0, PtargetPaperTop1: p.targetPaperTop1, PtargetPaperInTop50: p.targetPaperInTop50, PmappedItems: p.items.filter(i => i.mapping === 'mapped').length, PhitItemsAt50: p.items.filter(i => i.mapping === 'mapped' && i.rank !== null).length };
});
save('scope-comparison.json', scopeCases);
save('item-recall.json', recall);
save('case-changes.json', { anyItem: differences, anyItemByLength: differencesByLength, allMappedItems: allItemsDifferences });
save('retrieval-behavior.json', traceRows);
save('item-first-ranks.jsonl', records.flatMap(r => r.items.map(item => JSON.stringify({ caseId: r.caseId, group: r.group, variant: r.variant, targetDocumentId: r.targetDocumentId, ...item }))).join('\n') + '\n');
const frozen = read(path.join(OLD, 'production-manifest.json'));
const sourceMismatches = frozen.sourceHashes.filter(x => sha(fs.readFileSync(x.file)) !== x.sha256);
const splitUnchanged = sha(fs.readFileSync('eval/split.json')) === preflight.splitSha256;
if (!splitUnchanged || sourceMismatches.length) throw Error('Preservation check failed');
const scopeSummary = { cases: scopeCases.length, ARejected: scopeCases.filter(c => c.capturedScopeA.documentIds?.length === 0).length, ARejectedOnDevHeaderSnapshot: scopeCases.filter(c => c.devSnapshotScopeA.documentIds?.length === 0).length, PRejected: scopeCases.filter(c => c.executedScopeP.documentIds?.length === 0).length, PUnrestricted: scopeCases.filter(c => c.executedScopeP.status === 'unrestricted').length, PNonempty: scopeCases.filter(c => c.Pnonempty).length, PTargetPaperTop1: scopeCases.filter(c => c.PtargetPaperTop1).length, PTargetPaperInTop50: scopeCases.filter(c => c.PtargetPaperInTop50).length, PMappedCases: scopeCases.filter(c => c.PmappedItems > 0).length, PAnyGoldItemAt50: scopeCases.filter(c => c.PhitItemsAt50 > 0).length, note: 'Removing wrapper removes explicit document selection. Scope rejection disappears because P is unrestricted, not because the paper title was successfully resolved.' };
const complete = { status: 'complete', cases: plan.length, pairedVariantExecutions: records.length, retrievalMode: 'hybrid held constant', topK: 50, recall, caseDifferences: differences, scopeSummary, retrievalBehavior: traceRows, splitUnchanged, productionFilesChecked: frozen.sourceHashes.length, productionSourceMismatches: sourceMismatches, answerGenerationCalls: 0, benchmarkBoundary: preflight.corpusBoundary, goldPolicy: preflight.itemPolicy, scoringRule: preflight.normalization, casePassMeaning: 'At least one mapped item retrieved at cutoff; not final-answer correctness. All-mapped-item and per-length differences are available separately.' };
save('final-summary.json', complete);
const pct = n => n === null ? 'N/A' : (100 * n).toFixed(2) + '%';
const recallTable = ['| Group | Quote length | Variant | Mapped items | Unmapped items | R@5 | R@10 | R@20 | R@50 | MRR@50 |','|---|---|---|---:|---:|---:|---:|---:|---:|---:|', ...recall.map(r => `| ${r.group} | ${r.quoteLength} | ${r.variant} | ${r.mappedItems} | ${r.unmappedItems} | ${pct(r.r5)} | ${pct(r.r10)} | ${pct(r.r20)} | ${pct(r.r50)} | ${r.mrr === null ? 'N/A' : r.mrr.toFixed(4)} |`)].join('\n');
const differenceTable = ['| Group | Cutoff | Scorable cases | Both pass | A only | P only | Neither | Different |','|---|---:|---:|---:|---:|---:|---:|---:|', ...differences.map(r => `| ${r.group} | ${r.k} | ${r.scorableCases} | ${r.both} | ${r.Aonly} | ${r.Ponly} | ${r.neither} | ${r.different} |`)].join('\n');
const behaviorTable = ['| Group | Variant | Cases | Scope rejected | Dense gate rejected | Returned chunks | Target paper in top50 |','|---|---|---:|---:|---:|---:|---:|', ...traceRows.map(r => `| ${r.group} | ${r.variant} | ${r.cases} | ${r.scopeRejected} | ${r.denseGateRejected} | ${r.nonemptyResults} | ${r.targetPaperInTop50} |`)].join('\n');
const report = `# A/P production-query-form comparison — 2026-11-02

Completed 918 variant executions across 459 paired dev cases: 236 chunk omissions, 204 acceptable cases, and 19 separate scope rejections. Each variant requests top 50 once per case; all cutoffs are slices of that one ranking. No answers were generated. The interrupted run preserved 379 completed PDF pairs and 2 completed DOCX pairs; the remaining 78 DOCX pairs were resumed without repeating saved retrievals. An unrecorded in-flight request at interruption cannot be audited.

## Request path

See [REQUEST-PATH.md](REQUEST-PATH.md) and [request-path.json](request-path.json). The exact embedding/keyword input per case is saved in case-plan.jsonl and checked against outgoing requests in pdf/docx.traces.jsonl.

The standalone endpoint uses the question as received. Embedding receives search_query: plus acronym-expanded question. Keyword encoding receives the same expanded question without the prefix, and executes only when hybrid mode's dense gate passes. No original dev question explicitly references a document, so P is unrestricted within the selected collection. A uses the prepared title wrapper and its recorded per-document scope. Source default retrieval mode is dense; both experiment arms explicitly retain the prior hybrid settings. This compares production query formation and scope under hybrid, not an unspecified live-server configuration.

Both variants have the same dev-document dataset boundary. No gold-paper filter is added to P. This protects held-out content but differs from unrestricted search over the full original collection. Original full-collection IDF and frozen sparse statistics are retained. A/P changes both wording and scope; it does not isolate title wording alone.

## Item-level recall

Each unique whole literal reference answer quote is an item. Items are deduplicated per case by whitespace-normalized quote. Quotes are separated by whitespace-delimited word count. Only exact source-locatable items enter the denominator; unmappable quotes and cases with no literal gold remain explicit. Direct containment or verified same-paper range overlap is accepted, as in the preceding approved rule. An identical quote retrieved from a different paper is never credited. Alternative reference variants remain separate items unless their normalized text is identical, so this is evidence-item coverage, not complete semantic answer accuracy.

${recallTable}

MRR@50 averages reciprocal first-hit rank across mapped items; not found contributes 0. The production hybrid candidate prefetch depends on k; these cutoffs describe the k=50 ranking, not independent production k=5, k=10, or k=20 runs.

## Paired case changes

Here “pass” means at least one mapped gold item appears at the cutoff. It does not mean the final answer is correct or complete. There are 79 unscorable omission cases and 86 unscorable acceptable cases under the literal mapping. More detailed differences by quote length and all-mapped-item coverage are in case-changes.json.

${differenceTable}

## Scope and relevance gates

${behaviorTable}

${scopeSummary.ARejected} of 19 A scope decisions reject the wrapper's document reference; ${scopeSummary.ARejectedOnDevHeaderSnapshot} also reject on the frozen dev-only header snapshot. P has ${scopeSummary.PRejected} scope rejections and ${scopeSummary.PUnrestricted} unrestricted decisions. Of these 19 P queries, ${scopeSummary.PNonempty} return chunks, ${scopeSummary.PTargetPaperInTop50} include the intended paper in the top 50, and ${scopeSummary.PAnyGoldItemAt50} find at least one mapped gold item. Removing the wrapper removes the document constraint; it does not repair the title resolver or guarantee the correct paper. These 19 cases are excluded from the main recall and paired-case tables.

## Preservation and validation

Six focused offline tests passed before the live run. All 33 frozen production source hashes and split.json remain unchanged. Only new files under eval/ap-query-form-20261102 were created. All outbound requests were restricted to local Ollama embeddings or Qdrant queries with the dev boundary applied to every prefetch. Returned payloads were checked against dev-only indexed snapshots. No test-paper content, generation, Cloudflare, ingestion, or index mutations were used. Raw vectors are not included in result tables.

Files: item-recall.json, case-changes.json, scope-comparison.json, retrieval-behavior.json, item-first-ranks.jsonl, pdf/docx.results.jsonl and pdf/docx.traces.jsonl.
`;
save('RESULTS.md', report);
save('preservation-check.json', { splitUnchanged, splitSha256: preflight.splitSha256, productionFilesChecked: frozen.sourceHashes.length, productionSourceMismatches: sourceMismatches, newFilesRoot: 'eval/ap-query-form-20261102', answerGenerationCalls: 0, heldOutPaperContentRead: false });
const files = fs.readdirSync(BASE, { withFileTypes: true }).filter(x => x.isFile()).map(x => { const file = path.join(BASE, x.name); return { file: path.relative(process.cwd(), file).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(file)) }; });
save('submission-manifest.json', { status: 'complete', files, splitSha256: preflight.splitSha256, productionSourceMismatches: sourceMismatches });
console.log(recallTable + '\n\n' + differenceTable + '\n\n' + behaviorTable + '\n\nSCOPE_SUMMARY ' + JSON.stringify(scopeSummary));
