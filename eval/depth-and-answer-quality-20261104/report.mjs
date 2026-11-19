import fs from 'node:fs';
import crypto from 'node:crypto';
const b='eval/depth-and-answer-quality-20261104';
const read=f=>JSON.parse(fs.readFileSync(f));
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const manifest=read(b+'/manifest.json'),coverage=read(b+'/coverage.json'),review=read(b+'/answer-review-summary.json');
const req=rows(b+'/requests.jsonl'),answers=rows(b+'/answers.jsonl'),events=rows(b+'/answer-attempts.jsonl'),usage=rows(b+'/answer-usage.jsonl');
const execution=read(b+'/answer-execution.json'),judgments=rows(b+'/reviewed-cases.jsonl');
if(req.length!==80||answers.length!==80||judgments.length!==40)throw Error('Incomplete pair inventory');
if(new Set(answers.map(a=>a.caseId+':'+a.k)).size!==80)throw Error('Duplicate answer');
const reserved=events.filter(e=>e.event==='reserved'),completed=events.filter(e=>e.event==='completed');
if(reserved.length!==79||completed.length!==79||execution.failed!==0||reserved.length>80)throw Error('Unexpected generation outcomes');
if(reserved.some((r,i)=>r.attempt!==i+1)||new Set(reserved.map(r=>r.caseId+':'+r.k)).size!==79)throw Error('Budget/retry issue');
for(let i=0;i<events.length;i+=2)if(events[i].event!=='reserved'||events[i+1]?.event!=='completed'||events[i].attempt!==events[i+1].attempt)throw Error('Ledger not serial');
for(const a of answers){
 const r=req.find(r=>r.caseId===a.caseId&&r.k===a.k);
 if(!r||r.promptSha256!==a.promptSha256||hash(r.prompt)!==a.promptSha256)throw Error('Prompt mapping changed');
 const j=judgments.find(j=>j.caseId===a.caseId);
 if(j.answerHashes.find(h=>h.k===a.k)?.sha256!==hash(a.answer))throw Error('Reviewed answer changed');
 if(a.reusedFromAttempt){const original=answers.find(p=>p.attempt===a.reusedFromAttempt);if(!original||original.promptSha256!==a.promptSha256||original.answer!==a.answer)throw Error('Bad reuse');}
}
for(const h of manifest.inputHashes)if(hash(fs.readFileSync(h.file))!==h.sha256)throw Error('Input changed');
for(const f of ['eval/reranker-dev-20261102-r1/submission/manifest.json','eval/reranker-dev-20261102-live-r2/manifest.json'])for(const h of read(f).files)if(hash(fs.readFileSync(h.file))!==h.sha256)throw Error('Prior snapshot changed');
const genStats=[5,15].map(k=>{
 const a=answers.filter(a=>a.k===k&&a.attempt),times=a.map(a=>a.elapsedMs).sort((a,b)=>a-b);
 const u=a.map(a=>usage.find(u=>u.attempt===a.attempt));
 return{k,actualCalls:a.length,medianMs:times[Math.floor(times.length/2)],
  meanPromptTokens:u.reduce((s,u)=>s+(u?.usage?.prompt_tokens??0),0)/a.length,
  meanCompletionTokens:u.reduce((s,u)=>s+(u?.usage?.completion_tokens??0),0)/a.length,
  meanReportedNeurons:u.reduce((s,u)=>s+(u?.usage?.neurons??0),0)/a.length};
});
const summary={coverage,review,execution,generationStats:genStats,
 sampleQuoteCoverage:[5,15].map(k=>({k,cases:40,covered:req.filter(r=>r.k===k&&r.referenceCoverage).length})),
 audit:{all80AnswersPaired:true,all40CasesReviewed:true,explicitCloudflareExportAuthorization:true,
  exactPromptAndReviewedAnswerHashes:true,serialLedger:true,noRetries:true,generationAttempts:79,identicalPromptReuses:1,
  unchangedInputsAndPriorApplicationSnapshots:true,newSearching:0,heldOutPaperContentReads:0},
 limitations:['Saved top50 cutoffs, not new independent k8/k10/k15/k20 retrieval calls.',
 'Same selected paper; does not establish collection-wide answer quality.',
 'Coverage is complete eligible reference-answer quote coverage, not full QASPER evidence paragraph recall.',
 'Answer test uses direct top5 versus direct top15 prompts with unchanged model/system/buildPrompt and temperature0, not production neighbour expansion.',
 'Offline production-style replay uses k50 cutoffs with1200 per-document cap; actual independent retrieval at15 could rank differently.',
 '40 cases include38 unique original question IDs because two questions are tested as bothPDF/DOCX.',
 'AI-assisted qualitative review, not independent human-certified scoring; three15-chunk partial labels are borderline.',
 'One answer per distinct prompt; no repeated-seed or held-out validation.']};
fs.writeFileSync(b+'/summary.json',JSON.stringify(summary,null,2)+'\n');
const pct=(n,d)=>(100*n/d).toFixed(1)+'%';
let text='# More chunks: saved-ranking coverage and paired answer-quality test\n\n';
text+='Completed on2026-11-04. Existing dev/test split unchanged. No new searching, embeddings, reranking, ingestion or application changes. Coverage reused the saved dense/hybrid top50 rankings; generation was separately authorized by the user for a maximum80 Cloudflare calls.\n\n';
text+='## 1. Coverage of the119 longer-quote cases\n\nA covered case has every literal quote from at least one eligible reference answer in the selected chunks. Quotes preserve case/punctuation; whitespace is normalized. These are not supporting-paragraph or final-answer accuracy scores.\n\n| First chunks retained | Dense | Hybrid |\n|---|---:|---:|\n';
for(const k of[5,8,10,15,20,50]){const d=coverage.find(r=>r.group==='ready-long-quote-proxy'&&r.mode==='dense'&&r.k===k),h=coverage.find(r=>r.group==='ready-long-quote-proxy'&&r.mode==='hybrid'&&r.k===k);text+=`| ${k} | ${d.rawCovered}/119 (${pct(d.rawCovered,119)}) | ${h.rawCovered}/119 (${pct(h.rawCovered,119)}) |\n`;}
text+='\nFifteen is the smallest tested depth that exceeds75% in both modes. Compared with5, it adds28 covered cases in dense and30 in hybrid. Twenty adds another5dense/6hybrid covered cases beyond15. No cases are removed when the relevance gate returns an empty list.\n\n';
text+='## 2. Existing context-builder limitation\n\nReplaying the current selector on the same hybrid saved ranking cuts, including its1200-token long-document limit, whole-document threshold1000, title chunk and neighbouring chunks, gives:\n\n| Retrieved hits provided to selector | All reference quotes retained in selected context |\n|---|---:|\n| 5 | 76/119 (63.9%) |\n| 15 | 87/119 (73.1%) |\n\nThe5-hit replay can gain evidence from neighbours, so it exceeds raw5 coverage. At15, the cap can discard some raw retrieved evidence. The paired replay improves15cases and regresses4; it is not automatically monotonic. This is offline context selection on saved k50cutoffs, not a live end-to-end production test or a provider-token-window certification. Simply changing retrieval k does not guarantee sending all15 chunks.\n\n';
text+='## 3. Final-answer experiment\n\nFixed40 dev cases:22previously failed and18previously acceptable, chosen before generation by a deterministic hash ordering using seed label42. They contain38unique original question IDs; two are represented as bothPDF/DOCX. Hybrid search only for this generation sample. Selected paper and reranker-off conditions are held fixed.\n\nFor each case, send the first5or first15raw chunks directly through the existing buildPrompt()/generate() and unchanged system/model, with temperature0in both arms. No neighbour expansion or source annotations are sent to the answering model. All sampled prompts fit the legacy4096-token estimate including512reserve. This isolates direct chunk-count changes; it is not the current production context-assembly baseline.\n\nThe sample input quote coverage was23/40at5and31/40at15. We then read the actual answers semantically, accepting supported paraphrases and using all original reference alternatives. The review labels do not come from exact word matching.\n\n| Reviewed outcome | 5 chunks | 15 chunks |\n|---|---:|---:|\n';
for(const [key,label]of[['correct','Adequately complete and supported'],['partial','Partially answered'],['incorrect','Materially wrong or wrong attribution'],['refused','Refused to answer']])text+=`| ${label} | ${review.counts[0][key]}/40 | ${review.counts[1][key]}/40 |\n`;
text+='\nUnder this stricter AI-assisted review, adequately complete supported answers rose20/40(50.0%)to27/40(67.5%). Ten cases became correct, three became non-correct,17were correct in both. Refusals fell10to6. This is a small dev sample, not an independently human-certified overall accuracy score. Three15-chunk partial labels(numbers6,10,18)are borderline under a more permissive interpretation; accepting all three would give30/40(75.0%). Their exact reasons and answers remain visible.\n\n';
text+='## 4. Examples checked against actual passages\n\n- SemEval training dataset:5chunks refused;15correctly named SemEval2010Task8.\n- Online-harassment types:5imported information-threat from related work;15correctly gave indirect/sexual/physical target categories.\n- Crowd-worker instructions:5gave a supported description;15refused despite the relevant passage still being present. This is a clear extra-context regression.\n- Dataset sizes:both omitted WikiLarge development/test counts even though available. More chunks did not fix answer completeness.\n- One experiment-method question remained wrong at both depths because the model attributed background methods to the target paper.\n\nSee reviewed-cases.jsonl and answers.jsonl for every judgment and answer. requests.jsonl stores full sent prompts/chunks plus expected references separately for audit.\n\n';
text+='## 5. Requests, time and resource observations\n\n79Cloudflare calls completed;0failed. The80th comparison outcome reused an identical-prompt answer (one empty-context pair); no request was retried. No answers hit the recorded output-length limit. The original run command was blocked by automatic approval review before execution; the user then explicitly authorized the export in authorization.json.\n\n';
for(const s of genStats)text+=`- ${s.k} chunks: mean provider prompt tokens ${s.meanPromptTokens.toFixed(0)}, mean completion tokens ${s.meanCompletionTokens.toFixed(0)}, median request duration ${(s.medianMs/1000).toFixed(2)}s, mean reported Neurons ${s.meanReportedNeurons.toFixed(2)} per actual call.\n`;
text+=`\nTotal provider-reported usage: ${execution.reportedRunNeurons.toFixed(1)} Neurons. This is not account-wide usage or remaining allowance. Prompt cost roughly doubled, although median latency was similar in this small sequential run; no load/throughput conclusion follows.\n\n`;
text+='## 6. Interpretation and next action\n\nSending15raw chunks is a promising tested direction: full-reference quote coverage is about76–77% instead of52%, and reviewed complete supported answers improve in the fixed sample. It also causes noise-related regressions and raises prompt usage. Current context selection trims evidence, so a production change would need to explicitly budget for the intended additional hits and verify the final prompt—not merely change RETRIEVE_TOP_K. No application setting or code was changed, enabled, deployed or pushed.\n\nBefore claiming reliable research answering, perform human review of the borderline labels, test the actual proposed production context policy, and validate supporting-evidence coverage and multi-source behavior. This experiment retains the selected-paper and answer-quote limitations of its saved rankings.\n';
// Presentation-only spacing; preserve file paths and code identifiers.
text=text.split(/(\b(?:[A-Za-z0-9_-]+\.jsonl|[A-Za-z0-9_-]+\.json|RETRIEVE_TOP_K)\b)/g).map((s,i)=>i%2?s:s.replace(/([A-Za-z])([0-9])/g,'$1 $2').replace(/([0-9%])([A-Za-z])/g,'$1 $2')).join('');
fs.writeFileSync(b+'/REPORT.md',text);
const artifacts=fs.readdirSync(b).filter(f=>f!=='artifact-manifest.json').map(file=>({file:b+'/'+file,sha256:hash(fs.readFileSync(b+'/'+file)),bytes:fs.statSync(b+'/'+file).size}));
fs.writeFileSync(b+'/artifact-manifest.json',JSON.stringify({snapshot:'DEPTH-AND-ANSWER-QUALITY-20261104',files:artifacts},null,2)+'\n');
console.log(JSON.stringify({audit:summary.audit,review:summary.review,execution:summary.execution,generationStats:genStats},null,2));
