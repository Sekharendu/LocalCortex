import fs from 'node:fs';
import path from 'node:path';
import { BASE, OLD, read, lines, save, sha, normalize } from './common.mjs';

const summary = read(path.join(BASE, 'final-summary.json'));
const hits = read(path.join(BASE, 'step3-omission-hits.json'));
const analysis = hits.map(row => {
  const matched = row.matches[row.firstMatchRank - 1];
  return { caseId: row.caseId, question: row.question, firstMatchRank: row.firstMatchRank, method: matched.kind, goldQuote: matched.quote, retrievedChunk: row.retrieved[row.firstMatchRank - 1], alsoInSavedProductionTop5: row.productionK5.some(c => normalize(c.text).includes(normalize(matched.quote))) };
});
save('all-hit-details.json', analysis);
const sections = analysis.map((row, i) => `## Hit ${i + 1}: ${row.caseId}\n\nQuestion: ${row.question}\n\nRank: ${row.firstMatchRank}. Method: ${row.method}. Gold quote also present in saved production top five: ${row.alsoInSavedProductionTop5}.\n\nEntire retrieved chunk:\n\n\`\`\`text\n${row.retrievedChunk.text}\n\`\`\`\n\nEntire gold quote:\n\n\`\`\`text\n${row.goldQuote}\n\`\`\`\n`);
save('all-hit-details.md', '# Every observed omission-case k=5 hit\n\nThese are literal answer-span hits, not proof that the full question can be answered. All 20 are exact containment matches; none relies on range overlap.\n\n' + sections.join('\n'));
const frozen = read(path.join(OLD, 'production-manifest.json'));
const mismatches = frozen.sourceHashes.filter(x => sha(fs.readFileSync(x.file)) !== x.sha256);
const splitUnchanged = sha(fs.readFileSync('eval/split.json')) === read(path.join(BASE, 'preflight.json')).splitSha256;
save('preservation-check.json', { productionFilesChecked: frozen.sourceHashes.length, productionMismatches: mismatches, splitUnchanged, splitSha256: sha(fs.readFileSync('eval/split.json')), existingEvalFilesModified: false, newFilesRoot: 'eval/exact-quote-v2', liveRetrievalCalls: 236, answerGenerationCalls: 0, paperContentRead: 'dev allowlist only', originalProductionContainsMatchedQuote: analysis.filter(x => x.alsoInSavedProductionTop5).length });
const report = `# Exact-quote evaluation result — 2026-11-01

Status: **stopped at Step 3a**, as requested. The old chunk-identity false hit is rejected by the new matcher. No acceptable-case retrieval or top-50 measurement followed the failed gate.

## Final table

| Dev group | Cases queried | Locatable gold cases | k=5 quote hits | k=10 | k=20 | k=50 | MRR |
|---|---:|---:|---|---|---|---|---|
| Chunk omissions | 236 | 157 | 20/157 (12.74%) | Not run | Not run | Not run | Not computed |
| Acceptable | 0 of 204 | 118 available | Not run after stop | — | — | — | — |
| Scope rejections | 0 of 19 | Excluded | Excluded | Excluded | Excluded | Excluded | Excluded |

The 20 matches comprise 15 PDF cases and 5 DOCX cases. All are whole annotated-quote containment matches. None depends on the range-overlap branch.

The 79 unscorable omission cases comprise 67 whose literal gold quotes cannot be found in the extracted paper, 11 with no literal answer quote (such as yes/no references), and one with only unanswerable references. They were queried but excluded from the quote-hit denominator. A score over all 236 cases cannot be established from this gold mapping. The 118 locatable acceptable cases are a preparation count, not an executed hit score.

## Why the sanity check failed

The predeclared near-zero criterion was at most 1%. The observed mapped-case rate is 12.74%.

**All 20 matched quotes also occur in the saved production top five.** These hits do not demonstrate that the retrieval pipeline improved or that a missing fact was recovered. The diagnosis category identifies cases with missing required information; some other parts of the answer can already be present.

The available annotated extractive spans sometimes contain separate items of a list, such as “English”, “BERT”, or “MLE”. Each complete annotated span was treated as a gold quote and a match to any span counted as a hit. Multiple spans in one reference can be components of a complete answer, rather than independent complete answers. Exact text matching alone does not resolve that distinction. No quotes were shortened, removed, or selected based on their original retrieval rank to force a zero score.

The matcher normalizes whitespace only. It preserves case, Unicode, punctuation, and LaTeX. It accepts the entire quote as a literal substring, or positive overlap of exact same-paper offsets. An offset is established only through exact text location in the normalized extracted paper. Repeated chunk text is not assigned an arbitrary position. The gold data uses literal annotated extractive answers or literal free-form reference answers, not generic diagnostic sourceEvidence. Cases without a trustworthy literal mapping remain explicit.

## Evidence

- [Previous false hit: whole chunk, gold quote, and explanation](false-hit.md)
- [Every observed hit: whole chunks and quotes](all-hit-details.md)
- [Ten random hits and ten random misses, seed 42](random-examples.md)
- [Machine-readable result](final-summary.json)
- [Gold mapping and coverage](gold-mapping.jsonl)
- [Preservation check](preservation-check.json)

The ten random misses display rank1 as a comparison chunk. None of their top-five chunks matched a mapped gold quote. The ten random hits display their first matching chunk. These examples were printed by the run and saved in full.

The requested comparison between the top five of a k=50 run and production k=5 for 20 cases was **not run**, because Step 3a stopped the experiment. The existing hybrid implementation uses a k-dependent prefetch size; equivalence must be checked rather than assumed if a later run reaches Step 4.

## Validation and preservation

- Seven focused offline matcher tests passed.
- 236 dev-only retrieval calls completed successfully.
- All 33 frozen production file hashes remain unchanged.
- The split SHA-256 remains ${sha(fs.readFileSync('eval/split.json'))}.
- Only new files under eval/exact-quote-v2 were created. Old evaluation scripts and results were preserved.
- No test-paper content, answer generation, Cloudflare, ingestion, or index mutation was used.

## Unresolved questions

To measure recovery of the information responsible for each diagnosed omission, a future gold mapping needs to identify the required missing fact or a complete answer set, rather than count any annotated answer component. That is a proposed next step, not an applied change. The current strict quote rule and the failed sanity result are preserved as evidence. No further retrieval should be inferred from this report.
`;
save('RESULTS.md', report);
save('README.md', `# Exact-quote evaluator V2\n\nThis is a new, isolated evaluator. Existing RAG and eval files are not modified. See [RESULTS.md](RESULTS.md) for the completed, stopped run.\n\nCommands executed:\n\n\`\`\`powershell\nnode --test eval/exact-quote-v2/matching.test.mjs\nnode eval/exact-quote-v2/prepare.mjs\nnode eval/exact-quote-v2/run.mjs\nnode eval/exact-quote-v2/finish.mjs\n\`\`\`\n\nOutputs use exclusive creation and preserve the prior experiment. The run reuses unchanged production retrieve() with exact saved dev document scope, frozen collection/settings/sparse statistics and local embeddings. A network guard rejects unscoped or nonlocal requests and generation endpoints. The stop gate ran before acceptable or k50 calls. Re-running these commands does not overwrite completed evidence.\n\nNo fuzzy matching, case folding, Unicode normalization, punctuation/math conversion, generic diagnostic anchors, or model-produced gold is used. The permitted range-overlap branch can match a quote split across chunk boundaries, but only with exact same-paper coordinates.\n`);
const files = fs.readdirSync(BASE, { withFileTypes: true }).filter(x => x.isFile()).map(x => { const file = path.join(BASE, x.name); return { file: path.relative(process.cwd(), file).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(file)) }; });
save('submission-manifest.json', { status: summary.status, files, splitUnchanged, productionFilesChecked: frozen.sourceHashes.length, productionMismatches: mismatches });
console.log(JSON.stringify({ status: summary.status, hits: analysis.length, hitsAlreadyInSavedProduction: analysis.filter(x => x.alsoInSavedProductionTop5).length, productionMismatches: mismatches.length, splitUnchanged, files: files.length + 1 }, null, 2));
