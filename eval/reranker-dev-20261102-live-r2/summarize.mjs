import fs from 'node:fs';
const base = 'eval/reranker-dev-20261102-live-r2';
const read = file => JSON.parse(fs.readFileSync(`${base}/${file}`, 'utf8'));
const lines = file => fs.existsSync(`${base}/${file}`) ? fs.readFileSync(`${base}/${file}`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const execution = read('execution.json'), comparison = fs.existsSync(`${base}/comparison.json`) ? read('comparison.json') : null;
const ledger = lines('attempts.jsonl'), reservations = ledger.filter(r => r.event === 'reserved'), completions = ledger.filter(r => r.event === 'completed'), failures = ledger.filter(r => r.event === 'failed-stop');
const results = lines('reranked-results.jsonl'), smokes = lines('smoke-results.jsonl'), http = lines('http-observations.jsonl'), usage = lines('usage-observations.jsonl');
if (reservations.length !== execution.attempts || reservations.length > 44 || new Set(reservations.map(r => r.attempt)).size !== reservations.length) throw Error('Ledger inconsistent');
const latencies = completions.map(r => r.elapsedMs).sort((a, b) => a - b);
const reportedNeurons = usage.filter(r => typeof r.usage?.neurons === 'number');
const summary = { execution, syntheticAttempts: reservations.filter(r => r.kind === 'synthetic').length, devAttempts: reservations.filter(r => r.kind === 'dev').length,
  completedDevPools: results.length, completedCaseIds: new Set(results.map(r => r.caseId)).size, failedAttempts: failures,
  unattemptedDevPools: 40 - reservations.filter(r => r.kind === 'dev').length,
  smokeCoarseOrderingPasses: smokes.filter(r => r.coarseOrderingPass).length, smokeCases: smokes.length,
  httpStatusCounts: Object.fromEntries([...new Set(http.map(r => r.status))].map(s => [s, http.filter(r => r.status === s).length])),
  latencyMs: { min: latencies[0] ?? null, median: latencies[Math.floor(latencies.length / 2)] ?? null, max: latencies.at(-1) ?? null },
  providerUsageObjectsObserved: usage.filter(r => r.usage !== null).length,
  providerReportedRunNeurons: reportedNeurons.length === completions.length ? reportedNeurons.reduce((sum, r) => sum + r.usage.neurons, 0) : null,
  neuronEvidence: 'Sum of numeric neurons fields reported in these provider response usage objects only. Start 0 is user-reported; current shared daily account usage and remaining allowance were not API verified.',
  queryPolicy: 'Frozen Q keywordInput and unchanged saved candidate text/order. No rewrite, answer generation, title stripping or new retrieval.',
  limits: 'Input bytes checked by reviewed client; BGE 512-token window/truncation behavior not inferred from byte sizes or coarse ordering.',
  interpretation: 'Small frozen dev sample only; item recall and any-item case hits do not establish full answer coverage or final answer accuracy.' };
if (summary.syntheticAttempts > 4 || summary.devAttempts > 40) throw Error('Per-kind budget exceeded');
fs.writeFileSync(`${base}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
const pct = v => v === null ? 'N/A' : (v * 100).toFixed(2) + '%';
const metricTable = length => ['| Group | Mode | Ranking | Mapped items | R@5 | R@10 | R@20 | R@50 | MRR |','|---|---|---|---:|---:|---:|---:|---:|---:|',
  ...(comparison?.metrics ?? []).filter(r => r.length === length).map(r => `| ${r.group} | ${r.mode} | ${r.variant === 'A' ? 'saved baseline' : 'reranked'} | ${r.mappedItems} | ${pct(r.r5)} | ${pct(r.r10)} | ${pct(r.r20)} | ${pct(r.r50)} | ${r.mrr === null ? 'N/A' : r.mrr.toFixed(4)} |`)].join('\n');
const cases = ['| Mode | Group | Quote length | k | Baseline only (loss) | Rerank only (gain) | Both | Neither | Unscorable |','|---|---|---|---:|---:|---:|---:|---:|---:|',
  ...(comparison?.caseChanges ?? []).map(r => `| ${r.mode} | ${r.group} | ${r.lengthGroup} | ${r.k} | ${r.Aonly} | ${r.Ponly} | ${r.both} | ${r.neither} | ${r.unscorableCases} |`)].join('\n');
const itemCounts = ['| Mode | Group | Quote length | k | Item gains | Item regressions |','|---|---|---|---:|---:|---:|',
  ...(comparison?.itemChanges ?? []).map(r => `| ${r.mode} | ${r.group} | ${r.length} | ${r.k} | ${r.gains.length} | ${r.regressions.length} |`)].join('\n');
const text = `# RERANK-1 bounded hosted dev validation\n\nStatus: ${execution.status}. ${reservations.length}/44 attempts reserved before dispatch: ${summary.syntheticAttempts} synthetic, ${summary.devAttempts} dev. ${results.length}/40 dev pools completed across ${summary.completedCaseIds}/20 frozen cases. Failed attempts: ${failures.length}; unattempted dev pools: ${summary.unattemptedDevPools}. No retries, answer generation, query rewriting or new retrieval occurred. All reviewed r1 files remained byte-identical: ${execution.changedR1.length === 0}.\n\nThe user reported Free plan and zero neurons used on 2026-11-02. This is dashboard evidence supplied by the user, not API verification. Billing/subscription reads remained forbidden (403). Provider response usage objects report ${summary.providerReportedRunNeurons} neurons summed over these ${completions.length} calls; this is not a current account-wide usage or remaining-allowance reading. Raw numeric usage observations are saved separately. ${summary.smokeCoarseOrderingPasses}/${summary.smokeCases} coarse smoke orderings matched expectations. Tiny smoke tests establish contract/coarse behavior only.\n\nThe immutable r1 sample consists of ten omission and ten acceptable cases with both saved dense/hybrid pools. No resampling or gold changes. Ranking all candidates permits cutoffs from the same k50 pool. Q hybrid first five remains a slice of one k50 ranking, not independent production k5.\n\n## Quotes of four or more words\n\n${metricTable('4+ words')}\n\n## Quotes under four words\n\n${metricTable('under 4 words')}\n\n## Any-item case changes\n\n${cases}\n\n## Individual item changes\n\n${itemCounts}\n\nExact item IDs and before/after ranks are in comparison.json. Only source-locatable original gold items count, using whitespace-only whole-quote containment OR verified same-paper normalized range overlap. Unmapped cases remain unscorable. Failed/unattempted pools are excluded from paired quality metrics and are disclosed above; they are never treated as successful retrieval.\n\nThese results measure candidate ordering on a small dev sample, not complete-answer coverage or final answer accuracy. Input text was preserved. Byte sizes and coarse long-input ordering do not establish BGE token counts or the provider's exact 512-token truncation policy. Native model is fixed @cf/baai/bge-reranker-base. No default was enabled and no application or r1 snapshot file was changed.\n`;
fs.writeFileSync(`${base}/RESULTS.md`, text);
console.log(JSON.stringify(summary));
