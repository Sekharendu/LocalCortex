import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/stage2-end-to-end-20261105';
const rows=n=>fs.readFileSync(`${base}/${n}`,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const all=rows('results.jsonl'),results=[...new Map(all.filter(r=>r.success).map(r=>[r.callId,r])).values()];
if(results.length!==558)throw Error(`Not complete: ${results.length}/558; never shrink the frozen sample`);
const prep=rows('preparations.jsonl'),sample=JSON.parse(fs.readFileSync(`${base}/sample.json`));
const refs=new Map(sample.map(c=>[c.caseId,c.references.map(r=>r.original)]));
const shuffle=results.map(r=>({r,key:crypto.randomBytes(32).toString('hex')})).sort((a,b)=>a.key.localeCompare(b.key));
const pack=[],key=[],contexts=[];
for(const [i,{r}]of shuffle.entries()){
 const p=prep.findLast(p=>p.callId===r.callId&&p.promptSha256===r.promptSha256);
 if(!p)throw Error('Matching actual preparation missing');
 const blindId=`R${String(i+1).padStart(3,'0')}`;
 key.push({blindId,callId:r.callId,caseId:r.caseId,arm:r.arm,cohort:r.cohort});
 pack.push({blindId,cohort:r.cohort,question:r.question,answer:r.answer,references:refs.get(r.caseId)??[]});
 contexts.push({blindId,question:r.question,answer:r.answer,passages:p.passages.map(c=>c.text),gateRejected:p.gateRejected});
}
for(const [file,value]of [['blind-review.jsonl',pack],['blind-contexts.jsonl',contexts],['blind-key.jsonl',key]]){
 fs.writeFileSync(`${base}/${file}`,value.map(JSON.stringify).join('\n')+'\n',{flag:'wx'});
}
console.log('558 shuffled answers ready for arm-label-hidden semantic/evidence review. Do not decode until judgments frozen.');
