import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/stage2-evidence-gaps-20261105',stage='eval/stage2-end-to-end-20261105';
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const json=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
fs.mkdirSync(base,{recursive:true});
const save=(f,x)=>fs.writeFileSync(`${base}/${f}`,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const jsonl=(f,x)=>fs.writeFileSync(`${base}/${f}`,x.map(r=>JSON.stringify(r)).join('\n')+'\n',{flag:'wx'});
const selected=rows(`${stage}/judgments.jsonl`).filter(r=>r.cohort==='dev200'&&r.arm==='new'&&r.grade!=='adequate'&&['absent','partial'].includes(r.evidence));
if(selected.length!==57)throw Error('Expected57');
const sample=new Map(json(`${stage}/sample.json`).map(r=>[r.caseId,r]));
const dev=new Set(json('eval/split.json').dev); // No held-out IDs/content are used.
const allPreps=rows(`${stage}/preparations.jsonl`),allResults=rows(`${stage}/results.jsonl`);
const assets=rows('eval/dev-set-preparation-20261103/source-chunks.jsonl');
const sources=new Map(assets.map(a=>[a.documentId,a]));
const olderQ=json('eval/question-only-same-paper-20261102/preflight.json');
const stageManifest=json(`${stage}/pdf.frozen.json`);
const sourceSha=sha(fs.readFileSync('src/retrieval/retriever.ts','utf8').replace(/  \/\*\* Hosted reranker priority; never replaces the retrieval relevance score\. \*\/\r?\n  rerankScore\?: number;\r?\n/u,''));
if(sourceSha!==olderQ.frozenSourceHashes.find(h=>h.file==='src/retrieval/retriever.ts').sha256)throw Error('Older Q functional retrieval equivalence not verified');
const rankingFiles=['eval/dev-retrieval-20261103/pdf.results.jsonl','eval/dev-retrieval-20261103/docx.results.jsonl','eval/question-only-same-paper-20261102/pdf.results.jsonl','eval/question-only-same-paper-20261102/docx.results.jsonl'];
const prior=[];
for(const file of rankingFiles){
 const traces=file.includes('question-only')?new Map(rows(file.replace('.results.','.traces.')).map(r=>[r.caseId,r])):null;
 for(const r of rows(file)){
  if(!selected.some(c=>c.caseId===r.caseId))continue;
  if(r.mode&&!(r.mode==='hybrid'&&r.requestedK===50))continue;
  if(r.variant&&r.variant!=='Q')continue;
  prior.push({file,row:r,trace:traces?.get(r.caseId)??r.trace});
 }
}
const out=[];
for(const j of selected){
 const s=sample.get(j.caseId);if(!dev.has(s.paperId))throw Error('Nondev case denied');
 const result=allResults.findLast(r=>r.callId===j.callId&&r.success),p=allPreps.findLast(p=>p.callId===j.callId&&p.promptSha256===result.promptSha256),asset=sources.get(s.documentId);
 if(!asset||asset.asset!==s.format+'/'+s.paperId)throw Error('Asset identity mismatch');
 const usable=prior.filter(({row:r,trace:t})=>{
  if(r.caseId!==j.caseId)return false;
  const chunks=r.chunks??r.retrieved;
  const scope=r.scope?.documentIds??[s.documentId],input=t.embeddingInput??t.actualEmbeddingInput;
  if(scope.length!==1||scope[0]!==s.documentId||input!==p.trace.embeddingInputs[0])return false;
  if(r.question&&r.question!==s.question)return false;
  for(const c of chunks){const a=asset.chunks.find(x=>x.chunkIndex===c.chunkIndex);if(c.documentId!==s.documentId||!a||a.text!==c.text)throw Error(`Prior payload drift ${s.caseId} file=${r.variant??r.mode} chunk=${c.chunkIndex} doc=${c.documentId} expected=${s.documentId} sourceFound=${!!a} textEqual=${a?.text===c.text}`);}
  return true;
 });
 const chosen=usable[0]??null;
 const otherQueryPools=usable.slice(1).map(x=>({file:x.file,indices:(x.row.chunks??x.row.retrieved).map(c=>c.chunkIndex)}));
 const pool=chosen?{source:'saved',file:chosen.file,requestedK:50,chunks:chosen.row.chunks??chosen.row.retrieved,trace:chosen.trace,otherUsable:otherQueryPools}:j.gateRejected?{source:'saved',file:`${stage}/preparations.jsonl`,requestedK:50,chunks:[],gateShortCircuitProof:'Stage2 dense gate rejected. retrieve() returns [] before hybridSearch; gate probe is independent of requested k.',trace:p.trace}:null;
 out.push({caseId:j.caseId,blindId:j.blindId,paperId:s.paperId,format:s.format,question:s.question,documentId:s.documentId,judgment:j,sample:s,preparation:p,sourceAsset:asset,ranking50:pool});
}
jsonl('inputs.jsonl',out);
const reuse={cases:57,actualStage2Top15AndContexts:57,savedK50:out.filter(r=>r.ranking50&&!r.ranking50.gateShortCircuitProof).length,gateResultReusedWithoutSearch:out.filter(r=>r.ranking50?.gateShortCircuitProof).length,noUsableSavedPool:out.filter(r=>!r.ranking50).length,querySetup:'original question, selected dev paper, nomic prefixes on, hybrid RRF dense:sparse2:1, threshold0.63, reranking off',olderQHashDifference:'Only optional TypeScript rerankScore property/comment; removing the exact two added lines reproduces older retriever hash.',rankVsStage2Caveat:'k50 uses prefetch200, whereas Stage2 k15 used prefetch60. Rank50 is a diagnostic wider-pool ranking; it is not assumed to preserve the actual Stage2 top15.',rejectedReuse:[{files:'eval/ap-query-form-20261102/*',reason:'A uses title wrapper; P removes selected-paper restriction. Different query/scope; not reused.'},{files:'eval/q-dense-vs-hybrid-20261102/*',reason:'Dense arm is not hybrid; not reused.'},{files:'eval/dev-rerank-20261103/*',reason:'Reranked outputs not Stage2 reranking-off; not reused.'},{files:'eval/context-budget-*/ and eval/depth-and-answer-quality-20261104/*',reason:'Context replays slice k50 rankings and use older prompt/overall budgets; not substituted for actual Stage2 context. Their raw same-setup k50 inputs can be reused.'},{files:'eval/rank-buckets-review-20261104/*',reason:'Saved raw quote-coverage review covers119 cases; semantic targets and cohort differ. Reuse relevant explanatory notes only, not bucket totals or literal grades.'}],plannedMaximumNetworkSearchRequests:2*out.filter(r=>!r.ranking50).length,plannedEmbeddingRequests:out.filter(r=>!r.ranking50).length};
if(reuse.plannedMaximumNetworkSearchRequests>500)throw Error(`STOP: ${reuse.plannedMaximumNetworkSearchRequests}searches required`);
save('reuse-audit.json',reuse);
const protectedFiles=[`${stage}/judgments.jsonl`,`${stage}/preparations.jsonl`,`${stage}/results.jsonl`,`${stage}/blind-judgments.jsonl`,'eval/split.json',...stageManifest.hashes.map(h=>h.file),...rankingFiles,'eval/dev-set-preparation-20261103/source-chunks.jsonl'];
save('input-manifest.json',{at:new Date().toISOString(),files:[...new Set(protectedFiles)].map(file=>({file,sha256:sha(fs.readFileSync(file))})),devOnly:true,generationCalls:0});
console.log(JSON.stringify(reuse,null,2));
