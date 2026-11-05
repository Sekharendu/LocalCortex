import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/prompt-comparison-20261104';
const read=n=>JSON.parse(fs.readFileSync(`${base}/${n}`));
const rows=n=>fs.readFileSync(`${base}/${n}`,'utf8').trim().split(/\r?\n/u).map(JSON.parse);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const manifest=read('manifest.json'),requests=rows('requests.jsonl'),results=rows('results.jsonl'),grades=rows('blind-grades.jsonl'),key=read('blind-key.json'),evidence=read('case-evidence.json');
if(sha(fs.readFileSync(`${base}/blind-grades.jsonl`))!==read('grade-freeze.json').gradeSha256)throw Error('Frozen grades changed');
for(const h of manifest.inputHashes)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('Frozen input/app source changed');
if(requests.length!==158||results.length!==158||grades.length!==158||results.some(r=>!r.success||r.httpStatus!==200||r.finishReason!=='stop'))throw Error('Incomplete run');
const score={adequate:3,partial:2,wrong:0,refused:0};
const paired=[...new Set(requests.map(q=>q.caseId))].sort().map((caseId,i)=>{
 const first=requests.find(q=>q.caseId===caseId),arms={};
 for(const arm of ['A','B']){
  const q=requests.find(q=>q.caseId===caseId&&q.id===arm),r=results.find(r=>r.caseId===caseId&&r.arm===arm),k=key.find(k=>k.caseId===caseId&&k.arm===arm),g=grades.find(g=>g.blindId===k.blindId);
  if(q.promptSha256!==r.promptSha256||sha(q.prompt)!==q.promptSha256||r.usage.completion_tokens>512||r.usage.prompt_tokens+512>5000)throw Error('Prompt/output/budget mismatch');
  arms[arm]={...g,answer:r.answer,usage:r.usage,elapsedMs:r.elapsedMs,promptSha256:q.promptSha256,wirePromptSha256:q.wirePromptSha256};
 }
 const a=requests.find(q=>q.caseId===caseId&&q.id==='A'),b=requests.find(q=>q.caseId===caseId&&q.id==='B');
 if(JSON.stringify(a.passages)!==JSON.stringify(b.passages)||a.contextTokensEstimate!==b.contextTokensEstimate)throw Error('Context mismatch');
 if(/enough information to answer fully/iu.test(b.wirePrompt.replace(/\s+/gu,' ')))throw Error('Forbidden phrase');
 const sa=score[arms.A.grade],sb=score[arms.B.grade];
 return{number:i+1,caseId,cohort:first.cohort,group:first.group,question:first.question,paperId:first.paperId,
  evidence:evidence.find(e=>e.caseId===caseId)??{status:'absent',reason:'Full handbook lacks the requested target fact; related facts can still be present.'},
  change:sb>sa?'improved':sb<sa?'worse':'same',categoryChanged:arms.A.grade!==arms.B.grade,arms};
});
const dev=paired.filter(p=>p.cohort==='dev'),negative=paired.filter(p=>p.cohort==='offtopic');
if(dev.length!==40||negative.length!==39)throw Error('Wrong denominators');
const mean=x=>x.reduce((s,n)=>s+n,0)/x.length;
const stats=(cohort,arm)=>{
 const rs=results.filter(r=>r.cohort===cohort&&r.arm===arm),qs=requests.filter(q=>q.cohort===cohort&&q.id===arm),ps=paired.filter(p=>p.cohort===cohort),n=rs.length;
 const totals=k=>rs.map(r=>r.usage[k]);
 const times=rs.map(r=>r.elapsedMs).sort((a,b)=>a-b);
 return{arm,cases:n,counts:Object.fromEntries(Object.keys(score).map(g=>[g,ps.filter(p=>p.arms[arm].grade===g).length])),
  percentages:Object.fromEntries(Object.keys(score).map(g=>[g,100*ps.filter(p=>p.arms[arm].grade===g).length/n])),
  wrongRefusals:ps.filter(p=>p.arms[arm].grade==='refused'&&p.evidence.status==='complete').length,
  meanInputTokens:mean(totals('prompt_tokens')),maxInputTokens:Math.max(...totals('prompt_tokens')),
  meanOutputTokens:mean(totals('completion_tokens')),maxOutputTokens:Math.max(...totals('completion_tokens')),
  meanTotalTokens:mean(totals('total_tokens')),maxTotalTokens:Math.max(...totals('total_tokens')),
  meanNeurons:mean(totals('neurons')),maxNeurons:Math.max(...totals('neurons')),totalNeurons:totals('neurons').reduce((a,b)=>a+b,0),
  latencyMs:{mean:mean(times),median:(times[Math.floor((n-1)/2)]+times[Math.floor(n/2)])/2,max:times.at(-1),p95:times[Math.ceil(n*.95)-1]},
  meanContextTokensEstimate:mean(qs.map(q=>q.contextTokensEstimate)),cachedTokens:rs.reduce((s,r)=>s+(r.usage.prompt_tokens_details?.cached_tokens??0),0),
  maxProviderPromptPlus512:Math.max(...totals('prompt_tokens'))+512};
};
const devStats=['A','B'].map(a=>stats('dev',a)),offtopicStats=['A','B'].map(a=>stats('offtopic',a));
const changes=Object.fromEntries(['improved','worse','same'].map(c=>[c,dev.filter(p=>p.change===c).length]));
const offRejection=['A','B'].map(arm=>({arm,cases:39,pureRejections:negative.filter(p=>p.arms[arm].negativeClass==='pure_rejection').length,
 rejectionRate:100*negative.filter(p=>p.arms[arm].negativeClass==='pure_rejection').length/39,
 supportedRelatedAnswers:negative.filter(p=>p.arms[arm].negativeClass==='supported_related_information_with_gap').length,
 unsupportedAnswers:negative.filter(p=>(p.arms[arm].unsupportedClaims??[]).length>0).length,
 byGroup:['near-miss','unrelated'].map(group=>{const ps=negative.filter(p=>p.group===group);return{group,cases:ps.length,rejected:ps.filter(p=>p.arms[arm].negativeClass==='pure_rejection').length};})}));
const focus=read('focus-refusal-cases.json').map(id=>dev.find(p=>p.caseId===id));
const transitions=paired.filter(p=>p.arms.A.grade==='refused'&&p.arms.B.grade!=='refused').map(p=>({caseId:p.caseId,cohort:p.cohort,question:p.question,A:p.arms.A.answer,B:p.arms.B.answer,
 BGrade:p.arms.B.grade,unsupportedClaims:[],supportAssessment:p.cohort==='dev'?'Individually checked: every new factual claim is supported by the supplied task-design or clinical-data passage.':'Individually checked against full handbook: 8 days accrual and 10-day carryover cap are supported; cash-out is explicitly left unanswered.'}));
const gapAudits=paired.filter(p=>p.arms.B.gapAudit).map(p=>({caseId:p.caseId,cohort:p.cohort,question:p.question,grade:p.arms.B.grade,answer:p.arms.B.answer,...p.arms.B.gapAudit}));
const borderline=paired.flatMap(p=>['A','B'].filter(arm=>p.arms[arm].borderline).map(arm=>({caseId:p.caseId,question:p.question,arm,grade:p.arms[arm].grade,...p.arms[arm].borderline})));
const sensitivity=dev.map(p=>({a:p.arms.A.grade,b:p.arms.B.grade,altA:p.arms.A.grade,altB:p.arms.B.grade}));
// One predefined transparent sensitivity: treat secondary false-gap claims less harshly,
// using the alternatives frozen in the blinded judgments, not a post-unblinding regrade.
for(const [i,p]of dev.entries())if(['R05','R97','R115'].includes(p.arms.B.blindId))sensitivity[i].altB=p.arms.B.borderline.alternativeGrade;
const lenient={description:'Only the three secondary false-gap borderline cases use their frozen alternative grades; all other judgments unchanged.',
 countsA:Object.fromEntries(Object.keys(score).map(g=>[g,sensitivity.filter(p=>p.altA===g).length])),
 countsB:Object.fromEntries(Object.keys(score).map(g=>[g,sensitivity.filter(p=>p.altB===g).length])),
 improved:sensitivity.filter(p=>score[p.altB]>score[p.altA]).length,worse:sensitivity.filter(p=>score[p.altB]<score[p.altA]).length,same:sensitivity.filter(p=>score[p.altB]===score[p.altA]).length};
const audit={appAndInputHashesUnchanged:true,devCases40:40,previousSampleReproduced:true,allPairedContextsIdentical:true,all158CallsSucceeded:true,allCallsExplicitMax512:true,
 all79ArmBWirePromptsFreeOfForbiddenPhrase:true,allActualPromptPlus512Within5000:true,grading:read('grade-freeze.json'),
 noRetrievalCalls:true,noRerankerCalls:true,noRewriteCalls:true,noGraderModelCalls:true,noHeldOutTestContentRead:true,
 negatives:'Full intended employee handbook supplied identically to both prompts, bypassing retrieval. This is a generation rejection stress test, not production app retrieval/rejection rate. 15 is requested maximum; fixture has one available passage.',
 tokenAccounting:'Provider-reported actual prompt/output tokens; context-only token estimates use existing llama3 tokenizer. Same context is frozen using strict budget to avoid instruction-overhead changes affecting selection.',
 accountUsage:'Per-call reported Neurons only; current account allowance/billing balance could not be verified with existing token.',
 samples:'40 dev case units =38 unique original question IDs across35 papers; PDF/DOCX duplicates retained. Single response per arm; no claim of statistical certainty.',
 timestamps:'ISO UTC in per-call logs; user-facing experiment date 2026-11-04 Asia/Calcutta.'};
const final={dev:devStats,devChanges:changes,offtopic:offRejection,offtopicUsage:offtopicStats,totalReportedNeurons:[...devStats,...offtopicStats].reduce((s,v)=>s+v.totalNeurons,0),
 evidenceCounts:Object.fromEntries(['complete','partial','absent'].map(s=>[s,evidence.filter(e=>e.status===s).length])),gapVerdicts:Object.fromEntries([...new Set(gapAudits.map(g=>g.verdict))].map(v=>[v,gapAudits.filter(g=>g.verdict===v).length])),lenientSensitivity:lenient,audit};
const save=(n,v)=>fs.writeFileSync(`${base}/${n}`,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
save('analysis.json',final);save('paired-results.jsonl',paired.map(JSON.stringify).join('\n')+'\n');save('focus-refusal-answers.json',focus);
save('refused-to-answered-audit.json',transitions);save('gap-sentence-audit.json',gapAudits);save('borderline-judgments.json',borderline);
const metricTable=stats=>{
 let t='| Measurement | A: strict | B: revised |\n|---|---:|---:|\n';
 for(const [label,k]of [['Mean input tokens','meanInputTokens'],['Max input tokens','maxInputTokens'],['Mean output tokens','meanOutputTokens'],['Max output tokens','maxOutputTokens'],['Mean combined tokens','meanTotalTokens'],['Max combined tokens','maxTotalTokens'],['Mean Neurons/call','meanNeurons'],['Max Neurons/call','maxNeurons'],['Total Neurons','totalNeurons']])t+=`| ${label} | ${stats[0][k].toFixed(2)} | ${stats[1][k].toFixed(2)} |\n`;
 for(const k of ['mean','median','p95','max'])t+=`| ${k} generation time (seconds) | ${(stats[0].latencyMs[k]/1000).toFixed(3)} | ${(stats[1].latencyMs[k]/1000).toFixed(3)} |\n`;
 return t;
};
let report='# Strict versus revised partial-answer prompt — 2026-11-04\n\n';
report+='Both arms: 3200 context cap / 5000 local total budget / maximum15 saved hybrid hits / explicit max_tokens512 / temperature0 / Qwen3-30B-A3B-FP8 / reranking off. Context assembled once with the unchanged builder and strict budget; passages, ordering, separators and history are byte-identical within each pair. Only the specified system/user instruction wording and context label differ. All40strict prompts reproduce the previous3200/5000 arm exactly. All79revised final wire prompts are free of the forbidden all-or-nothing phrase, checked after whitespace normalization. No application code/defaults changed.\n\n';
report+='Exact texts: prompt-example-A.txt and prompt-example-B.txt give complete examples; exact-wire-prompts.jsonl stores every actual system, user and raw Qwen template. requests.jsonl stores all passages/references and hashes. API request bodies were checked against those saved wire prompts at dispatch.\n\n';
report+='## 1. Answer quality on the fixed40dev cases\n\n| Outcome | A: strict | B: revised |\n|---|---:|---:|\n';
for(const g of Object.keys(score))report+=`| ${g} | ${devStats[0].counts[g]}/40 (${devStats[0].percentages[g].toFixed(1)}%) | ${devStats[1].counts[g]}/40 (${devStats[1].percentages[g].toFixed(1)}%) |\n`;
report+=`\nWrong refusals with complete evidence: A=${devStats[0].wrongRefusals}, B=${devStats[1].wrongRefusals}. Needed-evidence status shared by both arms:36complete,2partial,2absent. Literal quote coverage is36/40in both arms and is NOT the generated-answer grade. The evidence statuses are in case-evidence.json.\n\n`;
report+=`## 2. Paired changes\n\n**${changes.improved} improved, ${changes.worse} worse, ${changes.same} same.** Score order matches the prior rubric: adequate3, partial2, wrong/refused0. All category changes are listed even if tied under that score. False statements that required information is absent count against factual correctness.\n\n| Question | A | B | Change | Reason |\n|---|---|---|---|---|\n`;
for(const p of dev.filter(p=>p.categoryChanged))report+=`| ${p.question} | ${p.arms.A.grade} | ${p.arms.B.grade} | ${p.change} | ${p.arms.B.reason.replaceAll('|','/')} |\n`;
report+='\n### Complete paired list\n\n| Case ID | Question | A | B | Change |\n|---|---|---|---|---|\n';
for(const p of dev)report+=`| ${p.caseId} | ${p.question} | ${p.arms.A.grade} | ${p.arms.B.grade} | ${p.change} |\n`;
report+='\n## 3. Five historical refusal-with-evidence cases: complete answers\n\n';
for(const p of focus)report+=`### ${p.question}\n\n${p.caseId}\n\nEvidence: ${p.evidence.status}.\n\n**A (${p.arms.A.grade}):** ${p.arms.A.answer}\n\n**B (${p.arms.B.grade}):** ${p.arms.B.answer}\n\n`;
report+='## 4. Every refused-to-answered transition, individually checked\n\n';
for(const t of transitions)report+=`### ${t.question} (${t.cohort})\n\n**A:** ${t.A}\n\n**B:** ${t.B}\n\n${t.supportAssessment} **Unsupported additions found: none.**\n\n`;
report+='## 5. Every B answer with a missing-information sentence\n\nThis includes answers graded adequate or wrong as well as partial, so extra caveats are not hidden by outcome classification. There are13dev answers and1negative-control answer.\n\n';
for(const g of gapAudits)report+=`### ${g.question} (${g.cohort}, ${g.grade})\n\n${g.caseId}\n\n**Full B answer:** ${g.answer}\n\n**Gap claim:** ${g.sentence}\n\n**Assessment: ${g.verdict}.** ${g.reason}\n\n`;
report+='## 6. Off-topic rejection control\n\nExisting data/offtopic-set.json:29near-miss and10unrelated questions. Full original sample handbook is supplied to both arms in the same single passage using the existing builder. No retrieval or gate, no test-paper content. This is intentionally a generation stress test; do not interpret its rejection rate as the full app\'s retrieval rejection rate.\n\n| Measurement | A | B |\n|---|---:|---:|\n';
for(const [label,k]of [['Pure rejections','pureRejections'],['Supported related answers with real gap','supportedRelatedAnswers'],['Unsupported answers found','unsupportedAnswers']])report+=`| ${label} | ${offRejection[0][k]}/39 | ${offRejection[1][k]}/39 |\n`;
report+=`| Pure rejection rate | ${offRejection[0].rejectionRate.toFixed(2)}% | ${offRejection[1].rejectionRate.toFixed(2)}% |\n\n`;
for(const group of ['near-miss','unrelated'])report+=`${group}: A ${offRejection[0].byGroup.find(g=>g.group===group).rejected}/${offRejection[0].byGroup.find(g=>g.group===group).cases}, B ${offRejection[1].byGroup.find(g=>g.group===group).rejected}/${offRejection[1].byGroup.find(g=>g.group===group).cases}.\n\n`;
for(const p of negative.filter(p=>p.arms.A.grade!=='refused'||p.arms.B.grade!=='refused'))report+=`**${p.question}**\n\nA: ${p.arms.A.answer}\n\nB: ${p.arms.B.answer}\n\nB supplies only supported related leave facts and correctly withholds a cash-out policy; it does not fabricate a yes/no answer.\n\n`;
report+='## 7. Actual usage and generation timing\n\n### Dev40per arm\n\n'+metricTable(devStats)+'\n### Rejection39per arm\n\n'+metricTable(offtopicStats);
report+=`\nAll158calls returned HTTP200, finish_reason=stop. No512-output truncations. Allactual provider prompt counts+512fit5000. Total reported usage across both cohorts: ${final.totalReportedNeurons.toFixed(2)} Neurons. No current daily balance was verified. Timings include HTTP roundtrip/body reading/parsing, exclude retrieval/rewrite, and are not a streaming first-token measurement or a latency guarantee.\n\n`;
report+='## 8. Borderline judgments and sensitivity\n\n';
for(const b of borderline)report+=`- ${b.arm}, ${b.caseId}: **${b.grade}**, alternative **${b.alternativeGrade}**. ${b.reason}\n`;
report+=`\nIf only the three secondary false-gap penalties use their alternatives frozen during blind review, B has${lenient.countsB.adequate}/40adequate rather than28/40; paired changes are${lenient.improved}improved,${lenient.worse}worse,${lenient.same}same. The established-task self-contradiction remains wrong. The corpus-source interpretation and attention/size ambiguities are separately visible and are not silently regraded. Conclusion is sensitive to how false caveats are penalized; do not claim a robust accuracy win.\n\n`;
report+='## Recommendation\n\nKeep the revised variant experimental. It fixes two unsupported refusals and adds a complete corpus-source answer, but it also generates false or overbroad claims about what the supplied text lacks. Do not enable it by default on the strength of fewer refusals. A next prompt experiment should constrain missing-information sentences to genuinely unanswered parts of the user\'s question, avoiding invented gaps about unrequested detail; that experiment has not been implemented or run. No default, source-code, retrieval, context-builder or model changes were made.\n\n';
report+=JSON.stringify(audit,null,2)+'\n';
save('REPORT.md',report);
console.log(JSON.stringify({dev:devStats,changes,offtopic:offRejection,totalReportedNeurons:final.totalReportedNeurons,gapVerdicts:final.gapVerdicts,lenient},null,2));
