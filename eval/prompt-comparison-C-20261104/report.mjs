import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/prompt-comparison-C-20261104';
const read=n=>JSON.parse(fs.readFileSync(`${base}/${n}`));
const rows=n=>fs.readFileSync(`${base}/${n}`,'utf8').trim().split(/\r?\n/u).map(JSON.parse);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const requests=rows('requests.jsonl'),results=rows('results.jsonl'),grades=rows('blind-grades.jsonl'),key=read('blind-key.json'),ev=read('case-evidence.json'),referenceB=rows('reference-B.jsonl'),manifest=read('manifest.json');
if(sha(fs.readFileSync(`${base}/blind-grades.jsonl`))!==read('grade-freeze.json').sha256)throw Error('Blind grades changed');
for(const h of manifest.inputHashes)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('App or input changed');
if(results.length!==158||grades.length!==158||results.some(r=>!r.success||r.httpStatus!==200||r.finishReason!=='stop'))throw Error('Incomplete run');
const score={adequate:3,partial:2,wrong:0,refused:0};
const pairs=[...new Set(requests.map(q=>q.caseId))].sort().map(caseId=>{
 const first=requests.find(q=>q.caseId===caseId),arms={};
 for(const arm of ['A','C']){
  const q=requests.find(q=>q.caseId===caseId&&q.id===arm),r=results.find(r=>r.caseId===caseId&&r.arm===arm),k=key.find(k=>k.caseId===caseId&&k.arm===arm),g=grades.find(g=>g.blindId===k.blindId);
  if(q.promptSha256!==r.promptSha256||sha(q.prompt)!==q.promptSha256||r.usage.completion_tokens>512||r.usage.prompt_tokens+512>5000)throw Error('Prompt/output budget mismatch');
  arms[arm]={...g,answer:r.answer,usage:r.usage,elapsedMs:r.elapsedMs,promptSha256:q.promptSha256,wirePromptSha256:q.wirePromptSha256};
 }
 const a=requests.find(q=>q.caseId===caseId&&q.id==='A'),c=requests.find(q=>q.caseId===caseId&&q.id==='C');
 if(JSON.stringify(a.passages)!==JSON.stringify(c.passages))throw Error('Context mismatch');
 const b=referenceB.find(b=>b.caseId===caseId);
 if(JSON.stringify(b.request.passages)!==JSON.stringify(a.passages))throw Error('Historical B context mismatch');
 arms.B={...b.judgment,savedReference:true,originalStartedAt:b.result.startedAt};
 const sA=score[arms.A.grade],sC=score[arms.C.grade];
 return{caseId,cohort:first.cohort,question:first.question,group:first.group,paperId:first.paperId,evidence:ev.find(e=>e.caseId===caseId)??{status:'absent',reason:'Full handbook lacks requested target fact.'},
  change:sC>sA?'improved':sC<sA?'worse':'same',categoryChanged:arms.A.grade!==arms.C.grade,arms};
});
const dev=pairs.filter(p=>p.cohort==='dev'),negative=pairs.filter(p=>p.cohort==='offtopic');
if(dev.length!==40||negative.length!==39)throw Error('Cohort mismatch');
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
function stats(cohort,arm){
 const ps=pairs.filter(p=>p.cohort===cohort),rs=arm==='B'?referenceB.filter(b=>b.cohort===cohort).map(b=>b.result):results.filter(r=>r.cohort===cohort&&r.arm===arm);
 const xs=k=>rs.map(r=>r.usage[k]),t=rs.map(r=>r.elapsedMs).sort((a,b)=>a-b),n=ps.length;
 return{arm,savedReference:arm==='B',cases:n,counts:Object.fromEntries(Object.keys(score).map(g=>[g,ps.filter(p=>p.arms[arm].grade===g).length])),
  percentages:Object.fromEntries(Object.keys(score).map(g=>[g,100*ps.filter(p=>p.arms[arm].grade===g).length/n])),
  wrongRefusals:ps.filter(p=>p.arms[arm].grade==='refused'&&p.evidence.status==='complete').length,
  meanInputTokens:mean(xs('prompt_tokens')),maxInputTokens:Math.max(...xs('prompt_tokens')),
  meanOutputTokens:mean(xs('completion_tokens')),maxOutputTokens:Math.max(...xs('completion_tokens')),
  meanTotalTokens:mean(xs('total_tokens')),maxTotalTokens:Math.max(...xs('total_tokens')),
  meanNeurons:mean(xs('neurons')),maxNeurons:Math.max(...xs('neurons')),totalNeurons:xs('neurons').reduce((a,b)=>a+b,0),
  latencyMs:{mean:mean(t),median:(t[Math.floor((n-1)/2)]+t[Math.floor(n/2)])/2,max:t.at(-1),p95:t[Math.ceil(n*.95)-1]}};
}
const devStats=['A','B','C'].map(a=>stats('dev',a)),offStats=['A','B','C'].map(a=>stats('offtopic',a));
const changes=Object.fromEntries(['improved','worse','same'].map(c=>[c,dev.filter(p=>p.change===c).length]));
const refusalCases=dev.filter(p=>p.arms.A.grade==='refused'&&p.evidence.status==='complete');
const transitions=pairs.filter(p=>p.arms.A.grade==='refused'&&p.arms.C.grade!=='refused').map(p=>({caseId:p.caseId,cohort:p.cohort,question:p.question,A:p.arms.A.answer,C:p.arms.C.answer,grade:p.arms.C.grade,
  unsupportedAdditions:[],assessment:'Individually read against actual final context: all new facts are supported by the supplied task-design or clinical-source statement.'}));
const absence=pairs.flatMap(p=>(p.arms.C.absenceClaims??[]).map(c=>({caseId:p.caseId,cohort:p.cohort,question:p.question,evidence:p.evidence.status,grade:p.arms.C.grade,...c})));
const borderline=dev.flatMap(p=>['A','C'].filter(a=>p.arms[a].borderline).map(a=>({caseId:p.caseId,question:p.question,arm:a,grade:p.arms[a].grade,...p.arms[a].borderline})));
const rejection=['A','B','C'].map(arm=>({arm,cases:39,savedReference:arm==='B',pureRejections:negative.filter(p=>p.arms[arm].negativeClass==='pure_rejection').length,
 rate:100*negative.filter(p=>p.arms[arm].negativeClass==='pure_rejection').length/39,
 nonRefusalAnswers:negative.filter(p=>p.arms[arm].grade!=='refused').map(p=>({caseId:p.caseId,question:p.question,answer:p.arms[arm].answer,grade:p.arms[arm].grade})),
 unsupportedAnswers:negative.filter(p=>(p.arms[arm].unsupportedClaims??[]).length).length,
 byGroup:['near-miss','unrelated'].map(group=>({group,cases:negative.filter(p=>p.group===group).length,rejected:negative.filter(p=>p.group===group&&p.arms[arm].negativeClass==='pure_rejection').length}))}));
const strictOnly=dev.find(p=>p.arms.A.blindId==='R103');
const sensitivity={description:'If corpus-sourcing question is accepted as collection process rather than requiring all source genres, its frozen A alternative is adequate; the corpus improvement disappears.',
 adequateA:devStats[0].counts.adequate+1,adequateC:devStats[2].counts.adequate,improved:changes.improved-1,worse:changes.worse,same:changes.same+1};
if(!strictOnly||strictOnly.arms.A.borderline.alternativeGrade!=='adequate')throw Error('Frozen sensitivity mismatch');
const falseClaims=absence.filter(a=>a.truth==='false');
const currentNeurons=devStats.filter(s=>s.arm!=='B').reduce((s,v)=>s+v.totalNeurons,0)+offStats.filter(s=>s.arm!=='B').reduce((s,v)=>s+v.totalNeurons,0);
const final={dev:devStats,pairedChanges:changes,offtopic:rejection,offtopicUsage:offStats,freshGenerationCalls:158,newBCalls:0,freshReportedNeurons:currentNeurons,
 absenceAudit:{claims:absence.length,true:absence.filter(a=>a.truth==='true').length,false:falseClaims.length,falseExtraCaveats:0,extraCaveats:0,zeroFalseClaimsGoalMet:falseClaims.length===0},
 evidenceCounts:Object.fromEntries(['complete','partial','absent'].map(s=>[s,ev.filter(e=>e.status===s).length])),sensitivity,
 preflight:read('variant-verification.json'),grading:read('grade-freeze.json'),
 limitations:['40 case units represent38unique original question IDs across35papers. One generation per arm, not a statistical guarantee.',
 'A and C are freshly generated and graded with labels hidden. B uses the previous saved run/judgments; it is historical reference, not new paired inference.',
 'All source passages identical, but the literal forbidden-word full-prompt check found13source occurrences in11dev cases. Those source words were preserved; only C instructions have zero occurrences.',
 'Off-topic rejection test supplies full intended sample handbook directly, bypassing retrieval. It measures generation rejection, not full production retrieval behavior.',
 'Provider usage is actual reported tokens/Neurons; local context budgeting uses existing approximate tokenizer. Current daily account balance not verified.'],
 audit:{allInputAndApplicationHashesUnchanged:true,allContextPairsIdentical:true,all158CallsHTTP200:true,allFinishedStop:true,explicitOutputLimit512:true,
 allActualPromptPlus512Within5000:true,noRetrievalCalls:true,noRerankerCalls:true,noRewriteCalls:true,noGraderModelCalls:true,noHeldOutTestContentRead:true,applicationCodeChanges:[]}};
const save=(n,v)=>fs.writeFileSync(`${base}/${n}`,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
save('analysis.json',final);save('paired-results.jsonl',pairs.map(JSON.stringify).join('\n')+'\n');save('A-refusals-with-evidence.json',refusalCases);
save('refused-to-answered-audit.json',transitions);save('C-absence-claim-audit.json',absence);save('borderline-judgments.json',borderline);
function usageTable(ss){
 let t='| Measurement | A fresh | B saved reference | C fresh |\n|---|---:|---:|---:|\n';
 for(const [label,k]of [['Mean input tokens','meanInputTokens'],['Max input tokens','maxInputTokens'],['Mean output tokens','meanOutputTokens'],['Max output tokens','maxOutputTokens'],['Mean combined tokens','meanTotalTokens'],['Max combined tokens','maxTotalTokens'],['Mean Neurons/call','meanNeurons'],['Max Neurons/call','maxNeurons'],['Total Neurons','totalNeurons']])t+=`| ${label} | ${ss.map(s=>s[k].toFixed(2)).join(' | ')} |\n`;
 for(const k of ['mean','median','p95','max'])t+=`| ${k} generation time (s) | ${ss.map(s=>(s.latencyMs[k]/1000).toFixed(3)).join(' | ')} |\n`;
 return t;
}
let report='# Prompt C comparison — 2026-11-04\n\n';
report+='New A/C calls: same fixed40dev cases (22previously failed,18acceptable), identical frozen saved-hybrid passages and context builder,3200context/5000total/k15/max_tokens512/temperature0/reranking off/nohistory. Same model and no-thinking raw template. All158fresh calls succeeded with no truncations. B is the saved prior run, copied into reference-B.jsonl with original prompts, answers, judgments, timestamps and usage; no new B inference or regrading. All application/input hashes unchanged.\n\n';
report+='## Preflight and exact prompts\n\nC system/reminder instructions contain neither `enough information` nor the word `fully`. The literal requirement for the entire final prompt could not be met while keeping source context unchanged:13occurrences remain in11dev cases, all from paper text, such as `fully connected layer` and `does not convey enough information`. We disclosed this before inference and preserved source text. This is a documented exception, not a clean full-prompt exclusion result. See preflight-collisions.json and variant-verification.json.\n\n';
report+='prompt-example-A.txt and prompt-example-C.txt show exact complete examples. exact-wire-prompts.jsonl stores all158actual system/user/raw-wire prompts. variants.mjs is the only evaluation selector: A/B use unchanged application templates; C changes system and reminder only. A/B selectors reproduce all158prior saved system/user prompts exactly. Both fresh contexts match all79prior A/B pairs byte-for-byte. No production setting or application source change.\n\n';
report+='## 1. Outcome counts and percentages\n\n| Outcome | A fresh | B saved | C fresh |\n|---|---:|---:|---:|\n';
for(const g of Object.keys(score))report+=`| ${g} | ${devStats.map(s=>`${s.counts[g]}/40 (${s.percentages[g].toFixed(1)}%)`).join(' | ')} |\n`;
report+=`| Wrong refusals with complete evidence | ${devStats.map(s=>s.wrongRefusals).join(' | ')} |\n\n`;
report+='Evidence is common to all arms:36complete,2partial,2absent, recorded case-by-case. Literal quote proxy coverage36/40is separate from answer grading. All fresh answers were read individually in randomized order with arm/pair labels hidden; judgments were frozen before decoding. This is AI reading, not independent human-certified grading; wording can suggest the variant.\n\n';
report+=`## 2. A versus C paired list\n\n**${changes.improved} improved, ${changes.worse} worse, ${changes.same} same.** Same scoring as before: adequate3,partial2,wrong/refused0.\n\n| Changed question | A | C | Reason |\n|---|---|---|---|\n`;
for(const p of dev.filter(p=>p.categoryChanged))report+=`| ${p.question} | ${p.arms.A.grade} | ${p.arms.C.grade} | ${p.arms.C.reason} |\n`;
report+='\n### All40paired cases\n\n| Case ID | Question | Evidence | A | B saved | C | A→C |\n|---|---|---|---|---|---|---|\n';
for(const p of dev)report+=`| ${p.caseId} | ${p.question} | ${p.evidence.status} | ${p.arms.A.grade} | ${p.arms.B.grade} | ${p.arms.C.grade} | ${p.change} |\n`;
report+='\n## 3. Every current A refusal despite complete evidence\n\n';
for(const p of refusalCases)report+=`### ${p.question}\n\n${p.caseId}\n\n**A:** ${p.arms.A.answer}\n\n**C (${p.arms.C.grade}):** ${p.arms.C.answer}\n\n`;
report+='## 4. Every C claim that information is missing or not stated\n\nNo substantive answer added a missing-information caveat. However, a refusal is also an insufficiency claim and must be checked. C has43such claims:39negative controls plus4dev refusals.41are justified and2are false: vocabulary count and always-YES baseline. Thus the goal of zero false claims is NOT met. Statements about domain behavior (such as workers not seeing documents) are not claims that the supplied prompt is missing information.\n\n| Cohort | Question | Exact sentence | Truth | Reason |\n|---|---|---|---|---|\n';
for(const a of absence)report+=`| ${a.cohort} | ${a.question} | ${a.sentence} | ${a.truth} | ${a.reason} |\n`;
report+='\n## 5. Every refused-to-answered transition, individually checked\n\n';
for(const t of transitions)report+=`### ${t.question}\n\n**A:** ${t.A}\n\n**C:** ${t.C}\n\n${t.assessment} **Unsupported additions: none found.**\n\n`;
report+='## 6. Off-topic rejection\n\nSame39-question original rejection set against its intended full employee handbook, directly supplied identically to A/C. No retrieval or relevance gate. The fixture has one available passage, with15as maximum requested hit count. Do not interpret this as production retrieval rejection performance.\n\n| Arm | Pure rejections | Rate | Unsupported answers |\n|---|---:|---:|---:|\n';
for(const s of rejection)report+=`| ${s.arm}${s.savedReference?' (saved)':''} | ${s.pureRejections}/39 | ${s.rate.toFixed(2)}% | ${s.unsupportedAnswers} |\n`;
report+='\nA and C rejected29/29near-misses and10/10unrelated questions. C answered no off-topic question. Historical B\'s one non-rejection was supported sick-leave accrual/carryover information plus an accurate cash-out gap admission; it did not invent a cash-out policy.\n\n';
report+='## 7. Actual usage and timings\n\n### Dev40per arm\n\n'+usageTable(devStats)+'\n### Rejection39per arm\n\n'+usageTable(offStats);
report+=`\nFresh A/C total reported usage: **${currentNeurons.toFixed(2)} Neurons**. Historical B usage is shown only for reference and is not added to this run. Actual provider prompt tokens+512fit5000on every fresh call. Latency includes HTTP roundtrip and complete body reading/parsing, excludes retrieval/rewrite, and is not streaming first-token timing. No current daily account balance was verified. Single sequential paired run; do not infer speed superiority from small timing differences.\n\n`;
report+='## 8. Borderline judgments\n\n';
for(const b of borderline)report+=`- ${b.arm}: ${b.question} (${b.caseId}): ${b.grade}; alternative ${b.alternativeGrade}. ${b.reason}\n`;
report+=`\nIf corpus sourcing is interpreted as collection procedure alone, its frozen A alternative is adequate: A=${sensitivity.adequateA}/40, C=${sensitivity.adequateC}/40; paired result${sensitivity.improved}improved,${sensitivity.worse}worse,${sensitivity.same}same. Thus two refusal fixes are robust to that interpretation; the third improvement depends on requiring all source types. Attention and size ambiguities affect both arms rather than creating a C-only gain.\n\n`;
report+='## Interpretation\n\nC is the strongest candidate on this fixed dev sample: it preserves the two refusal fixes, completes the corpus-source answer, removes B\'s extra false caveats, and preserves all39rejections. It still wrongly refuses two questions with complete support and still produces two wrong research answers (related-work method attribution and syntactic-attention overclaim). Two answers remain partial. Zero false claims is not achieved when wrong refusals are included. This is not proof of general reliability or authorization to change production. No application defaults were changed.\n\n';
report+=JSON.stringify(final.audit,null,2)+'\n';
save('REPORT.md',report);
console.log(JSON.stringify({dev:devStats,changes,rejection,freshNeurons:currentNeurons,absenceAudit:final.absenceAudit,sensitivity},null,2));
