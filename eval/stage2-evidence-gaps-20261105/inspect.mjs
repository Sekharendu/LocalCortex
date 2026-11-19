import fs from 'node:fs';
const rows=fs.readFileSync('eval/stage2-evidence-gaps-20261105/inputs.jsonl','utf8').trim().split(/\r?\n/u).map(JSON.parse);
const norm=s=>s.replace(/(\p{L})-\s*\n\s*(\p{L})/gu,'$1$2').replace(/\s+/gu,' ').trim();
for(const arg of process.argv.slice(2)){
 const k=arg.indexOf('='),id=arg.slice(0,k),pattern=arg.slice(k+1),r=rows.find(r=>r.blindId===id);
 const hits=r.sourceAsset.chunks.filter(c=>new RegExp(pattern,'iu').test(norm(c.text))).map(c=>({i:c.chunkIndex,text:norm(c.text),actualRank15:(r.preparation.chunks.findIndex(x=>x.chunkIndex===c.chunkIndex)+1)||null,rank50:(r.ranking50?.chunks.findIndex(x=>x.chunkIndex===c.chunkIndex)+1)||null,inFinal: r.preparation.passages.some(p=>norm(p.text).includes(norm(c.text)))}));
 console.log(JSON.stringify({id,q:r.question,goldEvidence:[...new Set(r.judgment.referenceAnswers.filter(a=>!a.unanswerable).flatMap(a=>a.evidence))].slice(0,2).map(x=>norm(x).slice(0,400)),hitCount:hits.length,hits:hits.slice(0,8)}));
}
