import fs from 'node:fs';
const base='eval/stage2-end-to-end-20261105';
const rows=f=>fs.readFileSync(`${base}/${f}`,'utf8').trim().split(/\r?\n/u).map(JSON.parse);
const pack=rows('blind-review.jsonl'),contexts=new Map(rows('blind-contexts.jsonl').map(c=>[c.blindId,c]));
const norm=s=>s.replace(/(\p{L})-\s*\n\s*(\p{L})/gu,'$1$2').replace(/\s+/gu,' ').trim();
const start=Number(process.argv[2]??1),count=Number(process.argv[3]??30),full=process.argv.includes('--full');
for(const r of pack.slice(start-1,start-1+count)){
 const c=contexts.get(r.blindId),text=norm(c.passages.join('\n\n'));
 const refs=r.references.map(a=>({unanswerable:a.unanswerable,gold:a.free_form_answer||a.extractive_spans?.join('; ')||(a.yes_no!==null?String(a.yes_no):'')}));
 const found=[];
 for(const a of r.references){
  if(a.unanswerable)continue;
  const pieces=a.extractive_spans?.length?a.extractive_spans:a.free_form_answer?[a.free_form_answer]:[];
  if(pieces.length&&pieces.every(p=>text.toLowerCase().includes(norm(p).toLowerCase())))found.push(pieces);
 }
 const evidence=[...new Set(r.references.flatMap(a=>a.evidence??[]))];
 const matches=[];
 for(const e of evidence){
  const words=norm(e).split(/\s+/u).filter(w=>w.length>3);
  const sentences=e.split(/(?<=[.!?])\s+/u);
  for(const s of sentences){
   if(norm(s).length>25&&text.includes(norm(s)))matches.push(norm(s));
  }
 }
 const output={id:r.blindId,cohort:r.cohort,q:r.question,gold:[...new Set(refs.map(a=>a.unanswerable?'[UNANSWERABLE]':a.gold))],answer:r.answer,
  gate:c.gateRejected,exactReferenceAlternativesFound:found.length,annotatedEvidenceSentencesPresent:matches.slice(0,2).map(s=>s.slice(0,220))};
 if(full)output.context=c.passages;
 console.log(JSON.stringify(output));
}
