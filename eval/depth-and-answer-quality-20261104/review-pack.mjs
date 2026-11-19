import fs from 'node:fs';
const base='eval/depth-and-answer-quality-20261104';
const lines=f=>{if(!fs.existsSync(f))return[];const s=fs.readFileSync(f,'utf8');return s.slice(0,s.lastIndexOf('\n')+1).split('\n').filter(Boolean).map(JSON.parse);};
const requests=lines(base+'/requests.jsonl'),answers=lines(base+'/answers.jsonl');
const ready=lines('eval/dev-set-preparation-20261103/ready.jsonl');
const ids=[...new Set(requests.map(r=>r.caseId))].sort();
const start=Number(process.argv[2]??1),end=Number(process.argv[3]??40);
for(let i=start-1;i<Math.min(end,ids.length);i++){
 const id=ids[i],r=requests.find(r=>r.caseId===id);
 const a=answers.filter(a=>a.caseId===id);
 console.log(JSON.stringify({number:i+1,caseId:id,question:r.question,
  expectedAlternatives:r.originalReferences.map(ref=>ref.items.map(i=>i.text)),
  allOriginalAlternatives:ready.find(c=>c.caseId===id).references.map(ref=>({index:ref.referenceIndex,
    spans:ref.original.extractive_spans,freeForm:ref.original.free_form_answer,unanswerable:ref.original.unanswerable})),
  arms:[5,15].map(k=>{const request=requests.find(r=>r.caseId===id&&r.k===k),answer=a.find(a=>a.k===k);return{k,fullReferenceInPrompt:request.referenceCoverage,answer:answer?.answer??null};})}));
}
