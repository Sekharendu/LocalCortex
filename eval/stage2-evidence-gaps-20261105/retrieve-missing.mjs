import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/stage2-evidence-gaps-20261105';
const json=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
for(const h of json(`${base}/input-manifest.json`).files)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('Frozen input changed '+h.file);
const all=rows(`${base}/inputs.jsonl`),wanted=new Set(['R297','R464','R532','R546']),jobs=all.filter(r=>wanted.has(r.blindId));
if(jobs.length!==4||jobs.some(r=>r.ranking50||r.judgment.gateRejected))throw Error('Compute-only-missing selection drift');
const maxSearches=jobs.length*2;if(maxSearches>500)throw Error(`STOP: ${maxSearches} searches required`);
const dev=new Set(json('eval/split.json').dev);for(const j of jobs)if(!dev.has(j.paperId))throw Error('Nondev denied');
const frozen=json('eval/stage2-end-to-end-20261105/pdf.frozen.json');
Object.assign(process.env,{QDRANT_URL:'http://127.0.0.1:36333',OLLAMA_URL:'http://127.0.0.1:11434',SPARSE_STATS_PATH:frozen.statsPath,OLLAMA_EMBED_MODEL:'nomic-embed-text',OLLAMA_EMBED_DIM:'768',OLLAMA_EMBED_PREFIXES:'1',RETRIEVE_FUSION:'rrf',RERANK_ENABLED:'0',CLOUDFLARE_ACCOUNT_ID:'',CLOUDFLARE_API_TOKEN:''});
const nativeFetch=globalThis.fetch;let active=null,trace=null,searches=0,embeddings=0;
const deny=[];
globalThis.fetch=async(input,init)=>{
 const request=new Request(input,init),url=new URL(request.url);
 if(!active)throw Error('Network outside selected dev case denied');
 const body=await request.clone().json();
 if(url.origin==='http://127.0.0.1:11434'&&url.pathname==='/api/embed'&&request.method==='POST'){
  if(body.model!=='nomic-embed-text'||body.input!==active.preparation.trace.embeddingInputs[0])throw Error('Embedding text/model drift');
  embeddings++;trace.embeddingInputs.push(body.input);return nativeFetch(request);
 }
 if(url.origin!=='http://127.0.0.1:36333'||url.pathname!==`/collections/${frozen.collection}/points/query`||request.method!=='POST'){deny.push(request.url);throw Error('Only dev-filtered vector search/local embeddings allowed; generation blocked');}
 const check=p=>{const matches=p.filter?.must?.filter(x=>x.key==='documentId')??[];if(!matches.length||matches.some(x=>JSON.stringify(x.match?.any??[x.match?.value])!==JSON.stringify([active.documentId])))throw Error('Unscoped/nonselected paper request denied');for(const c of p.prefetch??[])check(c);};check(body);
 if(++searches>maxSearches)throw Error('Search budget exceeded');
 trace.queries.push({limit:body.limit,prefetch:body.prefetch?.map(p=>({limit:p.limit,using:p.using,filter:p.filter})),filter:body.filter,scoreThreshold:body.score_threshold,query:body.prefetch?body.query:'dense-vector-omitted'});
 const response=await nativeFetch(request),payload=await response.clone().json();
 for(const p of payload.result?.points??[]){const old=active.sourceAsset.chunks.find(c=>c.chunkIndex===p.payload?.chunkIndex);if(p.payload?.documentId!==active.documentId||!old||old.text!==p.payload.text)throw Error('Returned payload escaped frozen dev document');}
 return response;
};
const fd=fs.openSync(`${base}/computed-rankings.jsonl`,'wx');
const {retrieve}=await import('../../src/retrieval/retriever.ts');
let error=null;
try{
 for(const r of jobs){active=r;trace={embeddingInputs:[],queries:[]};const start=performance.now();
  const chunks=await retrieve(r.question,{topK:50,scoreThreshold:.63,mode:'hybrid',collection:frozen.collection,documentScope:{status:'resolved',references:[],documentIds:[r.documentId]}});
  fs.writeSync(fd,JSON.stringify({caseId:r.caseId,blindId:r.blindId,paperId:r.paperId,documentId:r.documentId,question:r.question,source:'computed now',requestedK:50,chunks,trace,elapsedMs:performance.now()-start,at:new Date().toISOString()})+'\n');fs.fsyncSync(fd);
  console.log(JSON.stringify({caseId:r.caseId,blindId:r.blindId,hits:chunks.length,searches,embeddings}));active=null;
 }
}catch(e){error=e.message;throw e;}finally{
 fs.closeSync(fd);globalThis.fetch=nativeFetch;
 fs.writeFileSync(`${base}/network-audit.json`,JSON.stringify({at:new Date().toISOString(),plannedCases:4,plannedMaximumSearches:maxSearches,searchRequests:searches,embeddingRequests:embeddings,generationCalls:0,unscopedSearches:0,deniedEndpoints:deny,error},null,2)+'\n',{flag:'wx'});
}
