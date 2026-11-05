import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/graded-budget-2400-vs-3200-20261104';
const rows=n=>fs.readFileSync(`${base}/${n}`,'utf8').trim().split(/\r?\n/u).map(JSON.parse);
const read=n=>JSON.parse(fs.readFileSync(`${base}/${n}`));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const requests=rows('requests.jsonl'),results=rows('results.jsonl'),grades=rows('blind-grades.jsonl'),key=read('blind-key.json'),summary=read('summary.json'),manifest=read('manifest.json');
if(sha(fs.readFileSync(`${base}/blind-grades.jsonl`))!==read('grade-freeze.json').gradeSha256)throw Error('Blind grades changed');
if(results.length!==80||grades.length!==80||key.length!==80||results.some(r=>!r.success||r.finishReason!=='stop'))throw Error('Incomplete run');
for(const h of manifest.inputHashes)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('Input/app changed');
const originalIds=new Set(rows('../depth-and-answer-quality-20261104/requests.jsonl').map(r=>r.caseId));
const ids=[...new Set(requests.map(r=>r.caseId))].sort();
if(ids.length!==40||ids.some(id=>!originalIds.has(id)))throw Error('Sample changed');
const score={adequate:3,partial:2,wrong:0,refused:0};
const paired=ids.map((caseId,i)=>{
 const first=requests.find(r=>r.caseId===caseId),arms={};
 for(const arm of ['A','B']){
  const q=requests.find(r=>r.caseId===caseId&&r.id===arm),r=results.find(r=>r.caseId===caseId&&r.arm===arm),decode=key.find(k=>k.caseId===caseId&&k.arm===arm),g=grades.find(g=>g.blindId===decode.blindId);
  if(r.promptSha256!==q.promptSha256||sha(q.prompt)!==q.promptSha256)throw Error('Prompt changed');
  arms[arm]={...g,answer:r.answer,exactQuoteCoverage:q.covered,elapsedMs:r.elapsedMs,usage:r.usage,providerMetrics:r.providerMetrics,
   promptSha256:q.promptSha256,totalPromptEstimate:q.totalPromptEstimate,totalWithReserve:q.totalWithReserve,contextTokensEstimate:q.contextTokensEstimate};
 }
 const a=score[arms.A.grade],b=score[arms.B.grade];
 return{number:i+1,caseId,paperId:first.paperId,question:first.question,previousVerdict:first.previousVerdict,format:first.format,
  change:b>a?'improved':b<a?'worse':'same',adequateTransition:arms.A.grade==='adequate'?(arms.B.grade==='adequate'?'both-adequate':'lost-adequate'):(arms.B.grade==='adequate'?'gained-adequate':'neither-adequate'),arms};
});
const stats=summary.variants.map(v=>{
 const rs=results.filter(r=>r.arm===v.id),qs=requests.filter(q=>q.id===v.id),gs=paired.map(p=>p.arms[v.id]);
 const nums=k=>rs.map(r=>r.usage[k]);const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
 return{...v,grades:Object.fromEntries(Object.keys(score).map(g=>[g,gs.filter(x=>x.grade===g).length])),
  wrongRefusals:gs.filter(g=>g.grade==='refused'&&g.evidencePresent).length,
  meanInputTokens:mean(nums('prompt_tokens')),maxInputTokens:Math.max(...nums('prompt_tokens')),
  meanOutputTokens:mean(nums('completion_tokens')),maxOutputTokens:Math.max(...nums('completion_tokens')),
  meanTotalTokens:mean(nums('total_tokens')),maxTotalTokens:Math.max(...nums('total_tokens')),
  meanNeurons:mean(nums('neurons')),maxNeurons:Math.max(...nums('neurons')),
  maxContextTokensEstimate:Math.max(...qs.map(q=>q.contextTokensEstimate)),
  cachedTokens:rs.reduce((s,r)=>s+(r.usage.prompt_tokens_details?.cached_tokens??0),0),
  providerActualPromptPlus512WithinTotal:rs.every(r=>r.usage.prompt_tokens+512<=v.totalCap),
  localEstimatedPromptPlus512WithinTotal:qs.every(q=>q.totalWithReserve<=v.totalCap),
  providerPromptPlus512Maximum:Math.max(...rs.map(r=>r.usage.prompt_tokens+512)),
  lengthLimitedAnswers:rs.filter(r=>r.finishReason==='length').length};
});
const refusals=paired.flatMap(p=>['A','B'].filter(a=>p.arms[a].grade==='refused').map(arm=>({caseNumber:p.number,caseId:p.caseId,question:p.question,arm,
 evidencePresent:p.arms[arm].evidencePresent,reason:p.arms[arm].reason,supportingExcerpts:p.arms[arm].supportingExcerpts,answer:p.arms[arm].answer})));
const changes=Object.fromEntries(['improved','worse','same'].map(c=>[c,paired.filter(p=>p.change===c).length]));
const adequateTransitions=Object.fromEntries(['both-adequate','gained-adequate','lost-adequate','neither-adequate'].map(c=>[c,paired.filter(p=>p.adequateTransition===c).length]));
const audit={sampleMatchesOriginal40:true,previouslyFailed:paired.filter(p=>p.previousVerdict==='failed').length,previouslyAcceptable:paired.filter(p=>p.previousVerdict==='acceptable').length,
 uniqueOriginalQuestionIDs:new Set(ids.map(id=>id.split('/').slice(1).join('/'))).size,uniquePapers:new Set(paired.map(p=>p.paperId)).size,
 all80ActualCallsSucceeded:true,explicitMaxTokens512:true,all80FinishedNormally:true,
 gradedBeforeArmDecode:true,blindGradeSha256:read('grade-freeze.json').gradeSha256,
 applicationAndInputsUnchanged:true,heldOutTestContentRead:false,retrievalCalls:0,rerankerCalls:0,rewriteCalls:0,graderModelCalls:0,
 grading:'AI semantic reading, shuffled and arm-hidden; not independent human-certified evaluation. Supplied context inspected for support/refusals. Gold annotations are alternatives.',
 accountQuota:'No current balance verified; available token previously lacked billing/usage read permissions. All calls accepted. Reported Neurons are this experiment only, not account daily total.',
 frozenConditions:'Same saved hybrid top50 sliced to15, selected paper, existing selectPassages, title chunk on, whole-doc cap1000, no history, temperature0, 180s timeout. Both budgets are process-local overrides.',
 latency:'Nonstreaming generation HTTP roundtrip + body read/parse; excludes retrieval and rewrite. No TTFT benchmark. p95 nearest rank, median midpoint of central two.',
 tokenCounting:'Actual tokens from provider usage; context-only counts from legacy llama3 tokenizer. No fabricated split between provider system/context tokens.',
 caveats:'40 case units contain 38 unique original question IDs. Single output per arm. No uncertainty guarantee, production rollout or app setting changes.',
 borderlineSensitivity:'R07/R44 syntax overclaim and R52/R74 omission of blog source types are flagged. Accepting either pair raises both arms equally, without changing improved/worse/same or the +2 adequate advantage.'};
const final={stats,changes,adequateTransitions,costIncreasePercent:100*(stats[1].totalNeurons/stats[0].totalNeurons-1),
 totalReportedNeurons:stats.reduce((s,v)=>s+v.totalNeurons,0),audit};
const save=(n,x)=>fs.writeFileSync(`${base}/${n}`,typeof x==='string'?x:JSON.stringify(x,null,2)+'\n',{flag:'wx'});
save('analysis.json',final);save('paired-results.jsonl',paired.map(JSON.stringify).join('\n')+'\n');save('refusals.json',refusals);
let report='# Graded comparison: 2400/4096 versus 3200/5000\n\n';
report+='Arm A: 2400-token per-long-document context cap, 4096-token total budget. Arm B: 3200 context cap, 5000 total budget. Both: same 15 saved hybrid hits, existing context builder, explicit max_tokens=512, temperature=0, no history. Exact fixed 40-case sample from the earlier 5-vs-15 experiment: 22 previously failed and 18 acceptable, representing 38 unique original question IDs. Saved relevance-gate misses retained. All 80 calls really executed; no reused answers.\n\n';
report+='## Graded answer quality\n\n| Measurement | A: 2400 / 4096 | B: 3200 / 5000 |\n|---|---:|---:|\n';
for(const grade of Object.keys(score))report+=`| ${grade} | ${stats[0].grades[grade]}/40 | ${stats[1].grades[grade]}/40 |\n`;
report+=`| Refused despite sufficient evidence in prompt | ${stats[0].wrongRefusals} | ${stats[1].wrongRefusals} |\n| Exact-quote coverage in final passages (not answer accuracy) | ${stats[0].exactQuoteCovered}/40 | ${stats[1].exactQuoteCovered}/40 |\n\n`;
report+=`Paired result: **${changes.improved} improved, ${changes.worse} worse, ${changes.same} same**. Both improvements reach adequate. Answers were individually reviewed in randomized order without arm labels or paired answers; grades were frozen before decoding. This is an AI reading, not human certification. See review-rubric.md and blind-grades.jsonl for every rationale.\n\n`;
report+='## Measured usage and latency\n\n| Measurement | A: 2400 / 4096 | B: 3200 / 5000 |\n|---|---:|---:|\n';
const line=(label,a,b)=>report+=`| ${label} | ${a} | ${b} |\n`;
for(const [label,k]of [['Mean actual input tokens','meanInputTokens'],['Max actual input tokens','maxInputTokens'],['Mean actual output tokens','meanOutputTokens'],['Max actual output tokens','maxOutputTokens'],['Mean actual total tokens','meanTotalTokens'],['Max actual total tokens','maxTotalTokens'],['Mean Neurons/call','meanNeurons'],['Max Neurons/call','maxNeurons'],['Total Neurons for 40 calls','totalNeurons'],['Mean context tokens (local estimate)','meanContextTokensEstimate'],['Max context tokens (local estimate)','maxContextTokensEstimate']])line(label,stats[0][k].toFixed(2),stats[1][k].toFixed(2));
for(const k of ['mean','median','p95','max'])line(`${k} generation latency (seconds)`,(stats[0].latencyMs[k]/1000).toFixed(3),(stats[1].latencyMs[k]/1000).toFixed(3));
line('Successful HTTP 200 calls',40,40);line('Output length truncations',0,0);
line('Largest actual prompt + 512 output allowance',stats[0].providerPromptPlus512Maximum,stats[1].providerPromptPlus512Maximum);
report+=`\nB used **${final.costIncreasePercent.toFixed(1)}% more Neurons**, not twice as much. Total run usage: **${final.totalReportedNeurons.toFixed(2)} Neurons**. The observed small timing differences are not evidence that a larger context is intrinsically faster. Mean/maximum input, output, combined tokens, context estimates, latency and Neurons are shown separately. No streaming first-token latency was measured.\n\n`;
report+='## Complete paired list\n\n| Case | Question | A | B | Change |\n|---|---|---|---|---|\n';
for(const p of paired)report+=`| ${p.number} | ${p.question.replaceAll('|','/')} | ${p.arms.A.grade} | ${p.arms.B.grade} | ${p.change} |\n`;
report+='\nFull case IDs, grades, reasons, actual answers, usage and prompt hashes are in paired-results.jsonl.\n\n';
report+='## Every refusal despite available evidence\n\n';
for(const r of refusals.filter(r=>r.evidencePresent)){
 report+=`### Case ${r.caseNumber}, arm ${r.arm}: ${r.question}\n\nCase ID: ${r.caseId}\n\n${r.reason}\n\nAnswer: ${r.answer}\n\n`;
 for(const e of r.supportingExcerpts)report+=`Passage ${e.passageIndex}:\n\n> ${e.text.replaceAll('\n','\n> ')}\n\n`;
}
report+='## Refusals without sufficient supplied evidence\n\n';
for(const r of refusals.filter(r=>!r.evidencePresent))report+=`- Case ${r.caseNumber}, arm ${r.arm}: ${r.question} — ${r.reason}\n`;
report+='\n## Recommendation and limits\n\nThis dev sample supports choosing 3200 context / 5000 total / 15 hits / explicit 512 output: two additional adequate answers, no graded regression and an 18.6% usage increase. This is a configuration recommendation, not an application change or proof of general reliability. Wrong refusals persist. The vocabulary-count evidence newly enters B but is still refused; the gradient-method question improves although A already contained support. More context alone does not fix generation. The next targeted experiment is span merging with the same frozen sample and output cap; no span-merging implementation was done here.\n\n';
report+='Borderline judgments are visible: both attention answers overgeneralize syntactic findings from non-attentional related work; both corpus-sourcing answers omit blog types while correctly describing collection. Permissively accepting either pair raises A and B equally and leaves the two improvements and zero regressions unchanged. The preprocessing answers all identify the three levels; an additional summarization stage is supported even when informally called fourth. Dataset-size references contain inconsistent totals; partial labels reflect omitted eval splits.\n\n';
report+=JSON.stringify(audit,null,2)+'\n';
save('REPORT.md',report);
console.log(JSON.stringify(final,null,2));
