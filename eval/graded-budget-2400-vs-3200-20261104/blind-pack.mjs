import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/graded-budget-2400-vs-3200-20261104';
const rows=n=>fs.readFileSync(`${base}/${n}`,'utf8').trim().split(/\r?\n/u).map(JSON.parse);
const requests=rows('requests.jsonl'),results=rows('results.jsonl');
if(results.length!==80||results.some(r=>!r.success))throw Error('Require all 80 completed responses');
const shuffled=results.map(r=>({r,key:crypto.randomBytes(32).toString('hex')})).sort((a,b)=>a.key.localeCompare(b.key));
const key=[],packs=[],contexts=[];
for(const [i,{r}]of shuffled.entries()){
 const q=requests.find(q=>q.caseId===r.caseId&&q.id===r.arm),blindId=`R${String(i+1).padStart(2,'0')}`;
 key.push({blindId,caseId:r.caseId,arm:r.arm,pair:r.pair,attempt:r.attempt});
 packs.push({blindId,question:q.question,references:q.originalReferences.map(ref=>({
  gold:ref.free_form_answer||ref.extractive_spans?.join('; ')||(ref.yes_no===null?'':String(ref.yes_no)),
  unanswerable:ref.unanswerable,evidence:ref.evidence,highlightedEvidence:ref.highlighted_evidence})),answer:r.answer});
 contexts.push({blindId,question:q.question,answer:r.answer,passages:q.passages.map(p=>p.text)});
}
for(const [name,value]of [['blind-key.json',JSON.stringify(key,null,2)],['blind-review.jsonl',packs.map(JSON.stringify).join('\n')],['blind-contexts.jsonl',contexts.map(JSON.stringify).join('\n')]])fs.writeFileSync(`${base}/${name}`,value+'\n',{flag:'wx'});
console.log('80 answers shuffled and arm labels hidden; no grading calls made.');
