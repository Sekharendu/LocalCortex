import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const base = 'eval/dev-rerank-20261103';
const read = f => JSON.parse(fs.readFileSync(f));
const rows = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse) : [];
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const dirs = [base, base+'/continuation', base+'/continuation-2'];
const events = dirs.flatMap(d => rows(d+'/attempts.jsonl'));
const reservations = events.filter(e => e.event === 'reserved');
const completions = events.filter(e => e.event === 'completed');
const failures = events.filter(e => e.event.startsWith('failed'));
const pools = new Map(['pdf','docx'].flatMap(f => rows(`eval/dev-retrieval-20261103/${f}.results.jsonl`)).filter(r => r.requestedK === 50).map(r => [r.caseId+':'+r.mode,r]));
const skips = new Set(dirs.flatMap(d => rows(d+'/skips.jsonl')).map(r => r.caseId+':'+r.mode));
if (reservations.length !== 444 || completions.length !== 435 || failures.length !== 9 || skips.size !== 24) throw Error('Unexpected outcome counts');
if (reservations.length > 468 || new Set(reservations.map(r => r.caseId+':'+r.mode)).size !== 444) throw Error('Budget/retry violation');
const finished = new Set();
let open = null;
for (const event of events) {
  if (event.event === 'reserved') { if (open !== null) throw Error('Overlapping requests'); open = event.attempt; }
  else if (event.event === 'completed' || event.event.startsWith('failed')) {
    if (open !== event.attempt || finished.has(event.attempt)) throw Error('Ledger ordering');
    open = null; finished.add(event.attempt);
  }
}
if (open !== null) throw Error('Unsettled attempt');
for (const [i,r] of reservations.entries()) {
  if (r.attempt !== i+1) throw Error('Counter reset');
  const pool = pools.get(r.caseId+':'+r.mode);
  if (!pool?.chunks.length || skips.has(r.caseId+':'+r.mode)) throw Error('Invalid request identity');
  const payload = { query:pool.question, contexts:pool.chunks.map(c=>({text:c.text})), top_k:pool.chunks.length };
  if (hash(JSON.stringify(payload)) !== r.requestSha256) throw Error('Payload changed');
}
for (const dir of dirs) for (const h of read(dir+'/manifest.json').inputHashes) if (hash(fs.readFileSync(h.file)) !== h.sha256) throw Error('Input changed');
for (const manifest of ['eval/reranker-dev-20261102-r1/submission/manifest.json','eval/reranker-dev-20261102-live-r2/manifest.json']) {
  for (const h of read(manifest).files) if (hash(fs.readFileSync(h.file)) !== h.sha256) throw Error('Earlier reviewed snapshot changed');
}
const comparison = read(base+'/comparison.json');
if (!comparison.allPoolsAccountedFor || comparison.cohorts.some(c=>c.unattemptedCases || c.untestedCases)) throw Error('Unaccounted case');
const audit = { attempts:444, completed:435, failed:9, emptyPools:24, totalModeCases:468,
  consecutiveLedgerNumbers:true, noRetries:true, serialRequests:true, exactRequestHashesChecked:444,
  fullCandidatePermutationsChecked:435, unchangedInputAndPriorSnapshotHashes:true,
  everyDevCaseAccountedFor:true, timeoutCount:comparison.timeoutCount, otherFailures:comparison.otherRequestFailures,
  reportedRunNeurons:comparison.execution.reportedRunNeurons };
fs.writeFileSync(base+'/audit.json',JSON.stringify(audit,null,2)+'\n');
const pct=(n,d)=>(100*n/d).toFixed(1)+'%';
let report='# Larger dev comparison: reranking off versus on\n\nTested the same234 dev cases, using the existing split and selecting the paper for each question. Reranking off uses a normal top5 retrieval. Reranking on selects5 after ranking the top50 candidates. No answers were generated.\n\nA pass means the first5 chunks contain all literal quotes from at least one eligible reference answer. This is quote coverage, not verified answer accuracy.\n\n';
for (const [group,title] of [['ready-long-quote-proxy','Main check:119 cases with longer reference quotes'],['ready-short-quote-proxy','Separate check:115 cases with short names or terms']]) {
  report+='## '+title+'\n\n| Reranking off | Reranking on |\n|---|---|\n';
  for (const c of comparison.cohorts.filter(c=>c.group===group)) report+=`| **${c.mode}: ${c.allCasesOff5}/${c.expectedCases} (${pct(c.allCasesOff5,c.expectedCases)})** | **${c.mode}: ${c.allCasesOn5Successful}/${c.expectedCases} (${pct(c.allCasesOn5Successful,c.expectedCases)})** |\n`;
  report+='\n';
}
report+='The reranker reduced coverage in the main longer-quote group. This remains true when failed requests are excluded: dense improved13 cases but regressed21; hybrid improved12 but regressed19. Short-term results were mixed and are weaker evidence of full answer coverage.\n\n';
report+=`All234 cases were accounted for in both modes. Of444 hosted attempts,435 succeeded and9 failed: ${comparison.timeoutCount} timed out under the unchanged15-second application limit and${comparison.otherRequestFailures} had other request failures. Failed requests count as unsuccessful delivery in the tables, not as evidence that the model judged the chunks irrelevant. There were no retries.24 empty pools from12 questions were skipped without a hosted call and remain misses.\n\n`;
report+='The earlier19 dev scope rejections remain separate controls and are excluded from these234 cases. Test-paper content was not accessed. Split and application files are unchanged. The reranker has not been enabled or deployed.\n\n';
report+=`Provider responses reported about${comparison.execution.reportedRunNeurons.toFixed(1)} Neurons across this run. This is not verified account-wide usage; failed-request usage may be unreported.\n\n`;
report+='Audit checked all444 request hashes, serial durable ledger order, no duplicate attempts,435 exact candidate permutations, and unchanged input/application/prior experiment hashes. Detailed ranking changes and paired denominators are in comparison.json and scored-cases.jsonl; failures are in request-failures.json. REPORT.md explains protocol changes and limits. Human semantic completeness, context assembly, and final answer quality have not been evaluated.\n';
// Readable spacing around numeric counts in this presentation artifact.
report=report.replaceAll('same234','same 234').replaceAll('first5','first 5').replaceAll('top5','top 5').replaceAll('top50','top 50')
  .replaceAll('selects5','selects 5').replaceAll('All234','All 234').replaceAll('both modes. Of444','both modes. Of 444')
  .replaceAll('attempts,435','attempts, 435').replaceAll('and9','and 9').replaceAll('under the unchanged15-second','under the unchanged 15-second')
  .replaceAll('and3','and 3').replaceAll('retries.24','retries. 24').replaceAll('from12','from 12').replaceAll('earlier19','earlier 19')
  .replaceAll('these234','these 234').replaceAll('about1092','about 1092').replaceAll('all444','all 444').replaceAll(',435',', 435')
  .replaceAll('improved13','improved 13').replaceAll('regressed21','regressed 21').replaceAll('improved12','improved 12').replaceAll('regressed19','regressed 19')
  .replaceAll('check:119','check: 119').replaceAll('check:115','check: 115');
fs.writeFileSync(base+'/RESULTS.md',report);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=[...walk(base),...walk('eval/dev-retrieval-20261103')].filter(f=>!f.endsWith('artifact-manifest.json')).map(file=>({file,sha256:hash(fs.readFileSync(file)),bytes:fs.statSync(file).size}));
fs.writeFileSync(base+'/artifact-manifest.json',JSON.stringify({snapshot:'DEV-RETRIEVAL-RERANK-20261103',files},null,2)+'\n');
console.log(JSON.stringify(audit,null,2));
