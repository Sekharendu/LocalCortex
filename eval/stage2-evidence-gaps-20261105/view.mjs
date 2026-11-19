import fs from 'node:fs';
const b='eval/stage2-evidence-gaps-20261105';
const rows=fs.readFileSync(`${b}/inputs.jsonl`,'utf8').trim().split(/\r?\n/u).map(JSON.parse);
const norm=s=>s.replace(/(\p{L})-\s*\n\s*(\p{L})/gu,'$1$2').replace(/\s+/gu,' ').trim();
const words=s=>new Set(norm(s).toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter(w=>w.length>3)??[]);
const start=+process.argv[2],count=+process.argv[3];
for(const r of rows.slice(start-1,start-1+count)){
 const refs=r.judgment.referenceAnswers;
 const gold=refs.map(a=>a.unanswerable?'[UNANSWERABLE]':a.free_form_answer||a.extractive_spans.join('; ')||(a.yes_no===null?'':String(a.yes_no)));
 const evidence=[...new Set(refs.filter(a=>!a.unanswerable).flatMap(a=>a.evidence))];
 const gw=words(gold.join(' ')),ew=words(evidence.join(' ')),qw=words(r.question);
 const chunks=r.sourceAsset.chunks.map(c=>{const w=words(c.text);return {i:c.chunkIndex,t:norm(c.text),score:[...w].reduce((n,w)=>n+(gw.has(w)?5:ew.has(w)?1:qw.has(w)?.3:0),0)/Math.sqrt(w.size||1)}}).sort((a,b)=>b.score-a.score);
 console.log(JSON.stringify({n:rows.indexOf(r)+1,id:r.blindId,q:r.question,gold,evidence:evidence.slice(0,2).map(x=>norm(x).slice(0,420)),gate:r.judgment.gateRejected,pool:r.ranking50?.file??'missing',stageHits:r.preparation.chunks.map(c=>c.chunkIndex),mapped:r.sample.references.flatMap(ref=>ref.items.map(i=>({q:i.text,indices:i.chunkIndices}))).filter(i=>i.indices?.length),bestChunks:chunks.slice(0,3)}));
}
