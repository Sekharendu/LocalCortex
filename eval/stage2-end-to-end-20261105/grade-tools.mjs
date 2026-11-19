import fs from 'node:fs';
const base='eval/stage2-end-to-end-20261105';
const rows=f=>fs.readFileSync(`${base}/${f}`,'utf8').trim().split(/\r?\n/u).map(JSON.parse);
const review=rows('blind-review.jsonl'),contexts=new Map(rows('blind-contexts.jsonl').map(c=>[c.blindId,c]));
const norm=s=>s.replace(/(\p{L})-\s*\n\s*(\p{L})/gu,'$1$2').replace(/\s+/gu,' ').trim();
const stop=new Set('the and that with this from are was were for have has its their they what which how does not information context provided question answer'.split(' '));
const words=s=>new Set(norm(s).toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter(w=>w.length>2&&!stop.has(w))??[]);
const mode=process.argv[2];
if(mode==='view'){
 const start=+process.argv[3],n=+process.argv[4];
 for(const r of review.slice(start-1,start-1+n)){
  const c=contexts.get(r.blindId),text=norm(c.passages.join('\n\n'));
  const gold=[...new Set(r.references.map(a=>a.unanswerable?'[UNANSWERABLE]':a.free_form_answer||a.extractive_spans?.join('; ')||(a.yes_no!==null?String(a.yes_no):'')))];
  const target=words(r.question+' '+gold.join(' ')+' '+r.answer);
  const sentences=text.split(/(?<=[.!?])\s+/u).filter(s=>s.length>25);
  const ranked=sentences.map(s=>({s,score:[...words(s)].filter(w=>target.has(w)).length/Math.sqrt(words(s).size||1)})).sort((a,b)=>b.score-a.score);
  console.log(JSON.stringify({id:r.blindId,c:r.cohort,q:r.question,gold,a:r.answer,gate:c.gateRejected,source:ranked.slice(0,2).map(x=>x.s)}));
 }
}else if(mode==='context'){
 for(const id of process.argv.slice(3)){const c=contexts.get(id);console.log(JSON.stringify({id,...c}));}
}else if(mode==='save'){
 const input=fs.readFileSync(process.argv[3],'utf8').trim().split(/\r?\n/u);
 const file=`${base}/blind-judgments.jsonl`,existing=fs.existsSync(file)?rows('blind-judgments.jsonl'):[];
 const byId=new Map(existing.map(x=>[x.blindId,x]));
 for(const line of input){if(!line.trim())continue;const [num,grade,evidence,...reason]=line.split('|');const blindId='R'+num.padStart(3,'0');
  if(!review.some(r=>r.blindId===blindId))throw Error(blindId);
  const grades={a:'adequate',p:'partial',w:'wrong',r:'refused'},es={c:'complete',p:'partial',a:'absent',n:'not-applicable',u:'uncertain'};
  if(!grades[grade]||!es[evidence])throw Error(line);
  byId.set(blindId,{blindId,grade:grades[grade],evidence:es[evidence],reason:reason.join('|'),reviewedAt:new Date().toISOString()});
 }
 fs.writeFileSync(file,[...byId.values()].sort((a,b)=>a.blindId.localeCompare(b.blindId)).map(x=>JSON.stringify(x)).join('\n')+'\n');
 console.log(JSON.stringify({graded:byId.size,remaining:review.length-byId.size}));
}
