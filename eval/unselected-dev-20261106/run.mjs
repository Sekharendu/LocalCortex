import fs from 'node:fs';
import crypto from 'node:crypto';

const base = 'eval/unselected-dev-20261106';
const format = process.argv[2];
if (!['pdf', 'docx'].includes(format)) throw Error('Expected pdf or docx');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const rows = f => fs.readFileSync(f, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const norm = x => x.replace(/\s+/gu, ' ').trim();
const split = read('eval/split.json');
const frozen = read('eval/runs/seed42/production-manifest.json');
const inventory = rows('eval/dev-set-preparation-20261103/inventory.jsonl');
const sources = rows('eval/runs/seed42/dev-sources.jsonl');
const ready = new Map(rows('eval/dev-set-preparation-20261103/ready.jsonl').map(q => [q.caseId, q]));
for (const q of [...inventory, ...sources]) {
  if (!split.dev.includes(q.paperId) || split.test.includes(q.paperId)) throw Error('Non-dev input denied');
}
const jobs = inventory.filter(q => q.format === format);
const allowed = sources.filter(s => s.format === format).map(s => s.documentId).sort();
const allowedSet = new Set(allowed);
if (new Set(allowed).size !== allowed.length || jobs.some(q => !allowedSet.has(q.documentId))) throw Error('Invalid dev allowlist');
const qdrant = 'http://127.0.0.1:36333', ollama = 'http://127.0.0.1:11434';
const collection = frozen.collections[format];
const stats = `C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-scoped-hybrid-r4/${format}/sparse-stats.json`;
Object.assign(process.env, {QDRANT_URL:qdrant, OLLAMA_URL:ollama, QDRANT_COLLECTION:collection,
  SPARSE_STATS_PATH:stats, RAG_PROFILE:'new', RERANK_ENABLED:'0', RETRIEVE_EXPAND_CONTEXT:'1',
  WHOLE_DOC_MAX_TOKENS:'1000', CONTEXT_TITLE_CHUNK:'1', ANSWER_RESERVE_TOKENS:'512',
  OLLAMA_EMBED_MODEL:'nomic-embed-text', OLLAMA_EMBED_DIM:'768', OLLAMA_EMBED_PREFIXES:'1',
  RETRIEVE_FUSION:'rrf', CLOUDFLARE_API_TOKEN:'', CLOUDFLARE_ACCOUNT_ID:''});
const sourcePaths = ['src/config.ts','src/rag.ts','src/generation/llm.ts','src/generation/promptBuilder.ts',
  'src/generation/promptVariants.ts','src/retrieval/retriever.ts','src/retrieval/context.ts',
  'src/retrieval/vectorStore.ts','src/retrieval/embedder.ts','src/retrieval/sparse.ts','src/retrieval/sparseStats.ts',
  'src/retrieval/acronyms.ts','eval/split.json','eval/dev-set-preparation-20261103/inventory.jsonl',
  'eval/dev-set-preparation-20261103/ready.jsonl','eval/runs/seed42/dev-sources.jsonl',stats];
const hashes = sourcePaths.map(file => ({file,sha256:sha(fs.readFileSync(file))}));
const manifest = {format,collection,cases:jobs.length,allowedDocumentIds:allowed,hashes,
  query:'Original question, no title wrapper, no selected source-paper identity. All dev documents in this format collection compete.',
  settings:{mode:'hybrid',fusion:'rrf',threshold:.63,topK:15,context:3200,total:5000,reranking:false},
  extraK5:'Independent k=5 search for the 234 previously quote-scorable cases; not a slice of k=15.',
  generationCalls:0,selection:'All 610 existing dev case units; PDF/DOCX remain separate existing collections.',
  caveat:'QASPER source paper is a scoring target only. Other-source answers can be valid; vague questions lack their original paper context.'};
const mf = `${base}/${format}.manifest.json`;
if(fs.existsSync(mf)){if(JSON.stringify(read(mf))!==JSON.stringify(manifest))throw Error('Resume inputs changed');}
else fs.writeFileSync(mf,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
const output = `${base}/${format}.results.jsonl`;
const done = new Set(fs.existsSync(output)?rows(output).map(x=>x.caseId):[]);
const originalFetch=globalThis.fetch;
let active=null,trace=null,cache=new Map();
const counts={embeddingCalls:0,reusedEmbeddings:0,queryCalls:0,scrollCalls:0,generationCalls:0};
function check(part){
  const conditions=part.filter?.must?.filter(c=>c.key==='documentId')??[];
  if(!conditions.length)throw Error('Missing dev filter');
  for(const c of conditions){const ids=c.match?.any??[c.match?.value];if(!ids.length||ids.some(id=>!allowedSet.has(id)))throw Error('Non-dev filter denied');}
  for(const p of part.prefetch??[])check(p);
}
globalThis.fetch=async(input,init)=>{
  const request=new Request(input,init),u=new URL(request.url);
  if(!active)throw Error('Network outside active case denied');
  if(u.origin===ollama&&u.pathname==='/api/embed'&&request.method==='POST'){
    const body=await request.clone().json();
    if(body.model!=='nomic-embed-text'||body.input!=='search_query: '+expandAcronyms(active.question))throw Error('Embedding text changed');
    trace.embeddingInput=body.input;
    const key=JSON.stringify(body);
    if(cache.has(key)){counts.reusedEmbeddings++;return new Response(cache.get(key),{headers:{'content-type':'application/json'}});}
    counts.embeddingCalls++;
    const response=await originalFetch(request,{signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw Error('Embedding HTTP '+response.status);
    const text=await response.text();cache.set(key,text);
    return new Response(text,{headers:{'content-type':'application/json'}});
  }
  if(u.origin!==qdrant||request.method!=='POST'||!['query','scroll'].some(p=>u.pathname===`/collections/${collection}/points/${p}`))throw Error('Nonlocal/non-retrieval operation denied');
  const body=await request.clone().json();check(body);
  const isQuery=u.pathname.endsWith('/query');counts[isQuery?'queryCalls':'scrollCalls']++;
  trace.requests.push({path:u.pathname,limit:body.limit,filter:body.filter,prefetch:body.prefetch?.map(p=>({limit:p.limit,filter:p.filter}))});
  const response=await originalFetch(request,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error('Qdrant HTTP '+response.status);
  const payload=await response.clone().json();
  for(const p of payload.result?.points??[])if(!allowedSet.has(p.payload?.documentId))throw Error('Non-dev payload denied');
  return response;
};
const {expandAcronyms}=await import('../../src/retrieval/acronyms.ts');
const {retrieveForQuestion}=await import('../../src/rag.ts');
const {retrieve}=await import('../../src/retrieval/retriever.ts');
function score(q,chunks){
  const target=chunks.filter(c=>c.documentId===q.documentId);
  const refs=ready.get(q.caseId);
  if(!refs)return null;
  const references=refs.references.filter(r=>refs.scoringReferenceIndices.includes(r.referenceIndex)).map(r=>({referenceIndex:r.referenceIndex,
    items:r.items.map(i=>({quote:i.text,rank:chunks.findIndex(c=>c.documentId===q.documentId&&norm(c.text).includes(i.normalized))+1||null}))}));
  return {group:refs.status,references,complete:references.some(r=>r.items.length&&r.items.every(i=>i.rank!==null)),targetChunks:target.length};
}
let error=null,completed=0;
try{
  for(const q of jobs){
    if(done.has(q.caseId))continue;
    active=q;trace={requests:[]};cache=new Map();const started=performance.now();
    const opts={mode:'hybrid',scoreThreshold:.63,collection,documentScope:{status:'resolved',references:[],documentIds:allowed}};
    const prep=await retrieveForQuestion(q.question,{...opts,answerProfile:'new',topK:15});
    const k5=ready.has(q.caseId)?await retrieve(q.question,{...opts,topK:5}):null;
    const row={caseId:q.caseId,paperId:q.paperId,format,question:q.question,verdict:q.verdict,status:q.status,
      targetDocumentId:q.documentId,gateRejected:prep.chunks.length===0,correctPaperAt1:prep.chunks[0]?.documentId===q.documentId,
      correctPaperWithin15:prep.chunks.some(c=>c.documentId===q.documentId),correctPaperInContext:prep.passages.some(c=>c.documentId===q.documentId),
      independentK5:k5===null?null:{chunks:k5,score:score(q,k5)},score15:score(q,prep.chunks),scoreContext:score(q,prep.passages),
      chunks:prep.chunks,passages:prep.passages,system:prep.systemPrompt,prompt:prep.prompt,trace,elapsedMs:performance.now()-started};
    fs.appendFileSync(output,JSON.stringify(row)+'\n');done.add(q.caseId);completed++;
    if(completed%20===0)console.log(JSON.stringify({format,completed,total:jobs.length,...counts}));
  }
}catch(e){error=`${e.name}: ${e.message}`;console.error(error);}
finally{
  globalThis.fetch=originalFetch;cache.clear();
  const changed=hashes.filter(h=>sha(fs.readFileSync(h.file))!==h.sha256);
  fs.writeFileSync(`${base}/${format}.status.json`,JSON.stringify({completedTotal:done.size,expected:jobs.length,error,counts,changedInputs:changed,generationCalls:0,heldOutPayloadsRead:false},null,2)+'\n');
  console.log(JSON.stringify({format,done:done.size,total:jobs.length,error,counts,changedInputs:changed}));
  if(error||changed.length)process.exitCode=2;
}
