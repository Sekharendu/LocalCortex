import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/stage2-end-to-end-20261105';
const json=f=>JSON.parse(fs.readFileSync(`${base}/${f}`,'utf8'));
const rows=f=>fs.readFileSync(`${base}/${f}`,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const write=(f,x)=>fs.writeFileSync(`${base}/${f}`,JSON.stringify(x,null,2)+'\n');
const jsonl=(f,x)=>fs.writeFileSync(`${base}/${f}`,x.map(x=>JSON.stringify(x)).join('\n')+'\n');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const review=rows('blind-review.jsonl'),grades=rows('blind-judgments.jsonl');
if(grades.length!==558||new Set(grades.map(r=>r.blindId)).size!==558||review.some(r=>!grades.some(g=>g.blindId===r.blindId)))throw Error('Incomplete grades');
const frozenPath=`${base}/grading-freeze.json`;
if(!fs.existsSync(frozenPath))write('grading-freeze.json',{at:new Date().toISOString(),count:grades.length,method:'Shuffled arm-label-hidden AI semantic reading of answers/references and focused actual passage excerpts; no inference grading calls; not independent human adjudication.',files:['blind-review.jsonl','blind-contexts.jsonl','blind-judgments.jsonl','review-rubric.md'].map(f=>({file:f,sha256:sha(`${base}/${f}`)}))});
for(const h of json('grading-freeze.json').files)if(sha(`${base}/${h.file}`)!==h.sha256)throw Error(`Frozen review changed: ${h.file}`);
// The decode key is opened only after all 558 judgments are frozen above.
const key=new Map(rows('blind-key.jsonl').map(r=>[r.blindId,r]));
const attempts=rows('results.jsonl'),successful=[...new Map(attempts.filter(r=>r.success).map(r=>[r.callId,r])).values()];
const byCall=new Map(successful.map(r=>[r.callId,r])),prep=rows('preparations.jsonl'),sample=json('sample.json'),samples=new Map(sample.map(r=>[r.caseId,r]));
const norm=s=>s.replace(/(\p{L})-\s*\n\s*(\p{L})/gu,'$1$2').replace(/\s+/gu,' ').trim();
const stop=new Set('the and that with this from are was were for have has its their they what which how does not information context provided question answer'.split(' '));
const words=s=>new Set(norm(s).toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter(w=>w.length>2&&!stop.has(w))??[]);
const detailed=grades.map(g=>{
 const k=key.get(g.blindId),r=byCall.get(k.callId),p=prep.findLast(p=>p.callId===r.callId&&p.promptSha256===r.promptSha256),b=review.find(b=>b.blindId===g.blindId),s=samples.get(k.caseId);
 const text=norm(p.passages.map(c=>c.text).join('\n\n')),target=words(b.question+' '+b.answer+' '+b.references.map(a=>a.free_form_answer||a.extractive_spans?.join(' ')||'').join(' '));
 const excerpts=text.split(/(?<=[.!?])\s+/u).filter(t=>t.length>25).map(t=>({text:t,score:[...words(t)].filter(w=>target.has(w)).length/Math.sqrt(words(t).size||1)})).sort((a,b)=>b.score-a.score).slice(0,4).map(x=>x.text);
 const a=b.references.filter(a=>!a.unanswerable),u=b.references.filter(a=>a.unanswerable);
 const answerability=b.references.length===0?'offtopic':a.length===0?'unanswerable':u.length?'mixed':'answerable';
 const claims=b.answer.match(/[^.!?\n]+(?:[.!?]|$)/gu)?.map(s=>s.trim()).filter(s=>/insufficient|could not find|(?:context|passages?|text|paper).{0,90}(?:does not|do not|not explicitly|not directly|not provide|not specify|not mention|not clear)|(?:not explicitly|not directly|not clear|not always clear)|missing|not stated|leave out|cannot determine/iu.test(s))??[];
 return {...g,...k,question:b.question,answer:b.answer,answerability,gateRejected:p.gateRejected,referenceAnswers:b.references,sourceExcerpts:excerpts,absenceClaims:claims,format:r.format,paperId:s?.paperId??null,originalQuestionId:s?.questionId??s?.originalQuestionId??null,promptSha256:p.promptSha256};
});
jsonl('judgments.jsonl',detailed);
const count=(rs,f)=>Object.fromEntries([...new Set(rs.map(f))].map(v=>[v,rs.filter(r=>f(r)===v).length]));
const outcomes=rs=>Object.fromEntries(['adequate','partial','wrong','refused'].map(g=>[g,{count:rs.filter(r=>r.grade===g).length,percent:100*rs.filter(r=>r.grade===g).length/rs.length}]));
const summary={cohorts:{},paired:{},failures:{},evidence:{},cost:{},audit:{},offtopic:{}};
const score={adequate:3,partial:2,wrong:0,refused:0},pairs=[];
for(const cohort of ['dev200','earlier40','offtopic']){
 summary.cohorts[cohort]={}; summary.failures[cohort]={};summary.evidence[cohort]={};
 for(const arm of ['old','new']){
  const rs=detailed.filter(r=>r.cohort===cohort&&r.arm===arm);
  summary.cohorts[cohort][arm]={n:rs.length,outcomes:outcomes(rs),gateRejected:rs.filter(r=>r.gateRejected).length,answerability:count(rs,r=>r.answerability)};
  summary.evidence[cohort][arm]=count(rs,r=>r.evidence);
  const f={};
  for(const r of rs){let category;
   if(r.grade==='adequate')category='adequate';
   else if(r.grade==='refused'&&(r.answerability==='unanswerable'||r.answerability==='offtopic')&&r.evidence==='not-applicable')category='expected_refusal';
   else if(r.evidence==='complete')category=`complete_evidence_${r.grade}`;
   else if(['absent','partial'].includes(r.evidence))category=`evidence_${r.evidence}_${r.grade}`;
   else category=`other_${r.evidence}_${r.grade}`;
   f[category]=(f[category]??0)+1;
  } summary.failures[cohort][arm]=f;
 }
 const ids=[...new Set(detailed.filter(r=>r.cohort===cohort).map(r=>r.caseId))];
 const ps=ids.map(caseId=>{
  const old=detailed.find(r=>r.caseId===caseId&&r.arm==='old'),fresh=detailed.find(r=>r.caseId===caseId&&r.arm==='new');
  const delta=score[fresh.grade]-score[old.grade],result=delta>0?'improved':delta<0?'worse':'same';
  return {caseId,cohort,question:old.question,oldBlindId:old.blindId,newBlindId:fresh.blindId,old:old.grade,new:fresh.grade,oldEvidence:old.evidence,newEvidence:fresh.evidence,result,categoryChanged:old.grade!==fresh.grade,safetyChange:old.grade==='wrong'&&fresh.grade==='refused'?'safer_refusal':old.grade==='refused'&&fresh.grade==='wrong'?'unsafe_answer':null,reason:`Old: ${old.reason} New: ${fresh.reason}`};
 }); pairs.push(...ps);summary.paired[cohort]={...count(ps,r=>r.result),categoryChanges:ps.filter(p=>p.categoryChanged).length,safetyChanges:count(ps.filter(p=>p.safetyChange),p=>p.safetyChange)};
}
jsonl('paired.jsonl',pairs);jsonl('changed-cases.jsonl',pairs.filter(p=>p.categoryChanged));
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const stats=xs=>({mean:mean(xs),max:Math.max(...xs)});
for(const cohort of ['all','dev200','earlier40','offtopic']){
 summary.cost[cohort]={};
 for(const arm of ['old','new']){const rs=successful.filter(r=>r.arm===arm&&(cohort==='all'||r.cohort===cohort));summary.cost[cohort][arm]={n:rs.length,inputTokens:stats(rs.map(r=>r.usage.prompt_tokens)),outputTokens:stats(rs.map(r=>r.usage.completion_tokens)),neurons:stats(rs.map(r=>r.usage.neurons)),generationSeconds:stats(rs.map(r=>r.generationMs/1000)),retrievalSeconds:stats(rs.map(r=>r.retrievalMs/1000)),endToEndSeconds:stats(rs.map(r=>r.elapsedMs/1000)),totalNeurons:rs.reduce((n,r)=>n+r.usage.neurons,0)};}
}
const hashes=[];for(const name of ['pdf','docx','offtopic'])for(const h of json(`${name}.frozen.json`).hashes)hashes.push({file:h.file,unchanged:sha(h.file)===h.sha256});
summary.audit={successfulCalls:successful.length,attempts:attempts.length,failedAttempts:attempts.filter(r=>!r.success).map(r=>({callId:r.callId,error:r.error,startedAt:r.startedAt,usage:r.usage??null})),reportedTotalNeurons:successful.reduce((n,r)=>n+r.usage.neurons,0),unknownUsageFailures:attempts.filter(r=>!r.success&&!r.usage).length,finishReasons:count(successful,r=>r.finishReason),maxOutputObserved:Math.max(...successful.map(r=>r.usage.completion_tokens)),nearBudget:successful.filter(r=>r.usage.prompt_tokens+512>=r.totalBudget*.95).map(r=>({callId:r.callId,input:r.usage.prompt_tokens,total:r.totalBudget,withReserve:r.usage.prompt_tokens+512})),overBudget:successful.filter(r=>r.usage.prompt_tokens+512>r.totalBudget).map(r=>r.callId),frozenHashesUnchanged:hashes.every(h=>h.unchanged),hashChecks:hashes};
jsonl('gate-rejections.jsonl',detailed.filter(r=>r.gateRejected));
jsonl('refusal-with-complete-evidence.jsonl',detailed.filter(r=>r.grade==='refused'&&r.evidence==='complete'));
jsonl('absence-claims-to-audit.jsonl',detailed.filter(r=>r.arm==='new'&&r.absenceClaims.length).map(r=>({blindId:r.blindId,caseId:r.caseId,cohort:r.cohort,question:r.question,answer:r.answer,claims:r.absenceClaims,evidence:r.evidence,grade:r.grade,reason:r.reason,sourceExcerpts:r.sourceExcerpts})));
jsonl('borderline.jsonl',detailed.filter(r=>/borderline|conflict|mixed annotation|contradict.*annotat|annotation.*contradict|references conflict|reference.*disagree/iu.test(r.reason)||r.answerability==='mixed'||r.answerability==='unanswerable'&&r.grade!=='refused'));
for(const arm of ['old','new']){const rs=detailed.filter(r=>r.cohort==='offtopic'&&r.arm===arm);summary.offtopic[arm]={n:rs.length,refused:rs.filter(r=>r.grade==='refused').length,rejectionPercent:100*rs.filter(r=>r.grade==='refused').length/rs.length,gateRejections:rs.filter(r=>r.gateRejected).length,answered:rs.filter(r=>r.grade!=='refused')};}
write('summary.json',summary);
console.log(JSON.stringify({cohorts:summary.cohorts,paired:summary.paired,evidence:summary.evidence,failures:summary.failures,cost:summary.cost.all,audit:{...summary.audit,hashChecks:undefined},offtopic:summary.offtopic},null,2));
