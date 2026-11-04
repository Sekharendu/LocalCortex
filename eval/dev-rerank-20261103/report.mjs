import fs from 'node:fs';
import crypto from 'node:crypto';
const out = 'eval/dev-rerank-20261103';
const local = 'eval/dev-retrieval-20261103';
const prepared = 'eval/dev-set-preparation-20261103';
const read = f => JSON.parse(fs.readFileSync(f));
const lines = f => fs.readFileSync(f, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const norm = s => s.replace(/\s+/gu, ' ').trim();
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const ready = lines(`${prepared}/ready.jsonl`);
const stages = [out, `${out}/continuation`, `${out}/continuation-2`].filter(dir => fs.existsSync(`${dir}/execution.json`));
const stageExecutions = stages.map(dir => read(`${dir}/execution.json`));
const execution = { ...stageExecutions.at(-1),
  completedPools: stageExecutions.reduce((n, e) => n + e.completedPools, 0),
  skippedPools: stageExecutions.reduce((n, e) => n + e.skippedPools, 0),
  reportedRunNeurons: stageExecutions.reduce((n, e) => n + e.reportedRunNeurons, 0),
  usageRecords: stageExecutions.reduce((n, e) => n + e.usageRecords, 0),
  initialFailure: stageExecutions[0].failure, stages: stageExecutions };
const localRows = ['pdf', 'docx'].flatMap(f => lines(`${local}/${f}.results.jsonl`));
const before = new Map(localRows.map(r => [`${r.caseId}:${r.mode}:${r.requestedK}`, r]));
const stageRows = name => stages.flatMap(dir => fs.existsSync(`${dir}/${name}`) ? lines(`${dir}/${name}`) : []);
const rankRows = stageRows('results.jsonl');
const ranks = new Map(rankRows.map(r => [`${r.caseId}:${r.mode}`, r]));
if (ranks.size !== rankRows.length) throw Error('Duplicate reranked pool');
const skipped = new Set(stageRows('skips.jsonl').map(r => `${r.caseId}:${r.mode}`));
const allAttempts = stageRows('attempts.jsonl');
const failures = allAttempts.filter(e => ['failed-stop', 'failed-timeout-no-retry', 'failed-network-no-retry'].includes(e.event));
// Raw stage2's historical `timeouts` counter includes transient fetch failures.
// Use the actual failure messages for the consolidated classification.
delete execution.timeouts;
execution.timeoutAttempts = failures.filter(f => /cancelled or timed out/u.test(f.error)).length;
execution.otherFailedAttempts = failures.length - execution.timeoutAttempts;
const failedAttempts = new Set(failures.map(e => e.attempt));
const failedPools = new Set(allAttempts.filter(e => e.event === 'reserved' && failedAttempts.has(e.attempt)).map(e => `${e.caseId}:${e.mode}`));
const split = read('eval/split.json');
function score(c, chunks) {
  const references = c.references.filter(ref => c.scoringReferenceIndices.includes(ref.referenceIndex)).map(ref => ({
    referenceIndex: ref.referenceIndex,
    items: ref.items.map(i => { const index = chunks.findIndex(c => norm(c.text).includes(i.normalized)); return { quote: i.text, rank: index < 0 ? null : index + 1 }; }) }));
  const pass = k => references.some(r => r.items.length > 0 && r.items.every(i => i.rank !== null && i.rank <= k));
  return { references, allQuotes5: pass(5), allQuotes10: pass(10), allQuotes20: pass(20), allQuotes50: pass(50) };
}
const scored = [];
for (const c of ready) {
  if (!split.dev.includes(c.paperId) || split.test.includes(c.paperId)) throw Error('Held-out case');
  for (const mode of ['dense', 'hybrid']) {
    const k5 = before.get(`${c.caseId}:${mode}:5`), k50 = before.get(`${c.caseId}:${mode}:50`);
    if (!k5 || !k50) throw Error('Missing local search');
    const key = `${c.caseId}:${mode}`, r = ranks.get(key);
    let afterChunks = null;
    if (r) {
      if (r.indices.length !== k50.chunks.length || new Set(r.indices).size !== r.indices.length || r.indices.some(i => !Number.isInteger(i) || i < 0 || i >= k50.chunks.length)) throw Error('Bad permutation');
      if (r.scores.some((s, i) => !Number.isFinite(s) || i > 0 && s > r.scores[i - 1])) throw Error('Bad score order');
      afterChunks = r.indices.map(i => k50.chunks[i]);
    } else if (skipped.has(key)) {
      if (k50.chunks.length) throw Error('Skipped nonempty pool');
      afterChunks = [];
    }
    const off = score(c, k5.chunks), pool = score(c, k50.chunks), on = afterChunks === null ? null : score(c, afterChunks);
    if (on && pool.allQuotes50 !== on.allQuotes50) throw Error('Coverage@50 changed under permutation');
    const identity = chunks => chunks.map(x => `${x.documentId}:${x.chunkIndex}`);
    scored.push({ caseId: c.caseId, mode, question: c.question, group: c.status, verdict: c.verdict,
      primaryCause: c.primaryCause, off, saved50BeforeRerank: pool, on,
      gateRejected: k50.chunks.length === 0, rerankRequestFailed: failedPools.has(key),
      independentK5EqualsFirst5OfK50: JSON.stringify(identity(k5.chunks)) === JSON.stringify(identity(k50.chunks.slice(0, 5))),
      offChunkIndices: identity(k5.chunks), onChunkIndices: afterChunks?.slice(0, 5).map(x => `${x.documentId}:${x.chunkIndex}`) ?? null });
  }
}
const cohorts = [];
for (const group of ['ready-long-quote-proxy', 'ready-short-quote-proxy']) for (const mode of ['dense', 'hybrid']) {
  const all = scored.filter(r => r.group === group && r.mode === mode);
  const paired = all.filter(r => r.on !== null);
  const count = (name, k) => paired.filter(r => r[name][`allQuotes${k}`]).length;
  cohorts.push({ group, mode, expectedCases: all.length, pairedCases: paired.length,
    unpairedCases: all.length - paired.length, untestedCases: all.filter(r => r.on === null && !r.rerankRequestFailed).length,
    off5: count('off', 5), on5: count('on', 5), pool5: count('saved50BeforeRerank', 5),
    allCasesOff5: all.filter(r => r.off.allQuotes5).length,
    allCasesOn5Successful: all.filter(r => r.on?.allQuotes5).length,
    rerankRequestFailures: all.filter(r => r.rerankRequestFailed).length,
    unattemptedCases: all.filter(r => r.on === null && !r.rerankRequestFailed).length,
    pool10: count('saved50BeforeRerank', 10), on10: count('on', 10),
    pool20: count('saved50BeforeRerank', 20), on20: count('on', 20),
    pool50: count('saved50BeforeRerank', 50), on50: count('on', 50),
    fixed: paired.filter(r => !r.off.allQuotes5 && r.on.allQuotes5).length,
    regressed: paired.filter(r => r.off.allQuotes5 && !r.on.allQuotes5).length,
    both: paired.filter(r => r.off.allQuotes5 && r.on.allQuotes5).length,
    neither: paired.filter(r => !r.off.allQuotes5 && !r.on.allQuotes5).length,
    gateRejected: all.filter(r => r.gateRejected).length,
    k5DifferentFromK50Slice: all.filter(r => !r.independentK5EqualsFirst5OfK50).length,
    verdicts: ['failed', 'acceptable'].map(verdict => {
      const rows = paired.filter(r => r.verdict === verdict);
      return { verdict, cases: rows.length, off5: rows.filter(r => r.off.allQuotes5).length, on5: rows.filter(r => r.on.allQuotes5).length };
    }) });
}
for (const h of read(`${out}/manifest.json`).inputHashes) if (hash(fs.readFileSync(h.file)) !== h.sha256) throw Error('Input changed');
const attempts = allAttempts, http = stageRows('http.jsonl');
const reservations = attempts.filter(r => r.event === 'reserved'), completed = attempts.filter(r => r.event === 'completed');
if (reservations.length !== execution.attempts || reservations.length > 468 || completed.length !== ranks.size || http.length > reservations.length) throw Error('Ledger/response disagreement');
if (reservations.some((r, i) => r.attempt !== i + 1) || new Set(reservations.map(r => `${r.caseId}:${r.mode}`)).size !== reservations.length) throw Error('Budget reset or duplicate attempt');
if (execution.status === 'complete' && scored.some(r => !r.on && !r.rerankRequestFailed)) throw Error('Unattempted successful run');
const comparison = { status: execution.status === 'complete' && failures.length ? 'complete-with-request-failures' : execution.status,
  execution, cases: ready.length, cohorts, failedPools: [...failedPools],
  timeoutCount: failures.filter(f => /cancelled or timed out/u.test(f.error)).length,
  otherRequestFailures: failures.filter(f => !/cancelled or timed out/u.test(f.error)).length,
  failedUniqueCases: new Set(allAttempts.filter(e => e.event === 'reserved' && failedAttempts.has(e.attempt)).map(e => e.caseId)).size,
  allPoolsAccountedFor: scored.every(r => r.on !== null || r.rerankRequestFailed),
  gateRejectedUniqueCases: new Set(scored.filter(r => r.gateRejected).map(r => r.caseId)).size,
  notes: 'Complete selected reference-quote coverage, whitespace normalization only. This is not semantic completeness, final-answer accuracy, or context assembly. Off uses independent production retrieve(k5); on reorders retrieve(k50) and takes5. Actual retrieval code used unchanged.' };
const requestFailures = failures.map(f => {
  const reservation = reservations.find(r => r.attempt === f.attempt);
  const c = ready.find(c => c.caseId === reservation.caseId);
  return { ...reservation, question: c.question, group: c.status, failure: f };
});
const pct = (n, total) => total ? `${(100 * n / total).toFixed(1)}%` : 'not tested';
const table = group => {
  let s = '| Reranking off | Reranking on |\n|---|---|\n';
  for (const c of cohorts.filter(c => c.group === group)) s += `| **${c.mode}: ${c.allCasesOff5}/${c.expectedCases} (${pct(c.allCasesOff5, c.expectedCases)})** | **${c.mode}: ${c.allCasesOn5Successful}/${c.expectedCases} (${pct(c.allCasesOn5Successful, c.expectedCases)})**; ${c.rerankRequestFailures} request failure(s), ${c.unattemptedCases} unattempted |\n`;
  return s;
};
let report = `# Fresh dev retrieval and reranking comparison\n\nStatus: ${execution.status}. Same existing seed42 dev split; no held-out paper content. ${ready.length} prepared questions, 170 PDF and64 DOCX cases. Both modes called the unchanged retrieve() function at k5 and k50:936 live retrieval invocations,234 actual local embedding requests with same-case embedding responses reused,1602 Qdrant query requests. No application edits or generation.\n\n## Main group:119 questions with longer reference quotes\n\nA pass means the first five chunks collectively contain every literal quote from at least one fully eligible selected reference answer. Every question counts once; reference alternatives stay separate. At least one quote in each eligible main-group reference has4+words.\n\n${table('ready-long-quote-proxy')}\n## Separate short-term group:115 questions\n\nShort names or terms can appear without the full answer; these figures are weaker evidence and are not merged into the main group.\n\n${table('ready-short-quote-proxy')}\n## What changed\n\n`;
for (const c of cohorts) report += `- ${c.mode}, ${c.group === 'ready-long-quote-proxy' ? 'longer quotes' : 'short terms'}: ${c.fixed} newly passed, ${c.regressed} regressed, ${c.both} passed both, ${c.neither} failed both; ${c.untestedCases} untested. The independent k5 order differed from the first5 of the k50 pool for ${c.k5DifferentFromK50Slice}/${c.expectedCases} questions.\n`;
report += `\n${comparison.gateRejectedUniqueCases} unique questions were rejected by the existing relevance gate; they remain misses, not removed from denominators. Empty pools consume no reranker call. The19 earlier scope rejections remain separate in the prepared control file and were not sent to retrieval/reranking here.\n\n## Run evidence and limits\n\n- Authorized maximum468 hosted attempts; actual ${execution.attempts}, completed ${execution.completedPools}, empty pools skipped ${execution.skippedPools}. Serial, no retries. Initial failure: ${execution.initialFailure ?? 'none'}. Continuation failure: ${execution.failure ?? 'none'}.\n- Initial request19 exceeded the unchanged15-second application limit. It was retained as a failure and never retried. A separately recorded continuation inherited all19 reservations and the same global468-attempt cap, skipped every previously attempted pool and continued only untouched pools. Further timeouts are retained; other failures stop the run.\n- The two-column tables use full cohort denominators and count failed reranker requests as unsuccessful delivery, with failures disclosed separately. Paired ranking-change counts exclude failed requests. No unattempted request is treated as a quality miss.\n- Provider response usage reports ${execution.reportedRunNeurons} Neurons across this run; this is not verified account-wide daily usage or remaining allowance.\n- Model: @cf/baai/bge-reranker-base. Queries and raw candidate text preserved. Exact BGE token/truncation policy was not measured.\n- Off uses a real retrieve(k5) call. On uses the full retrieve(k50) candidate pool, then reranks and takes5, matching the intended enabled pipeline. Therefore the main difference includes candidate-pool widening; comparison.json separately includes k50's original first5 to isolate ordering.\n- Same-paper selection is an explicit test condition. This does not test automatic paper selection, conversational rewriting, context assembly, or answers.\n- Every ready case is still a quote-coverage proxy with humanSemanticCompletenessReviewed=false. A collection of literal terms can be insufficient for a complete answer; none of these percentages is answer accuracy.\n- Full50 coverage is invariant under reranking; all result permutations and selected-reference coverage were checked. Empty gated pools remain paired misses.\n- Split, prepared data, current reviewed application, frozen chunks, and run input hashes verified unchanged. All new artifacts stay under eval/.\n\nFiles: comparison.json for aggregate counts, scored-cases.jsonl for every question/reference rank and gain/loss, results.jsonl for exact reranker indices/scores, attempts.jsonl/http.jsonl/usage.jsonl for audit. Continuation records are under continuation/. Fresh retrieval payloads and traces are in ../dev-retrieval-20261103/.\n`;
const save = (f, value) => fs.writeFileSync(`${out}/${f}`, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
save('comparison.json', comparison); save('request-failures.json', requestFailures);
save('scored-cases.jsonl', scored.map(r => JSON.stringify(r)).join('\n') + '\n'); save('REPORT.md', report);
console.log(JSON.stringify(comparison, null, 2));
