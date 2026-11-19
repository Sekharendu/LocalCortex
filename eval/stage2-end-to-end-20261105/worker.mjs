import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/stage2-end-to-end-20261105',format=process.argv[2];
if(!['pdf','docx','offtopic'].includes(format))throw Error('Expected pdf/docx/offtopic');
const read=f=>JSON.parse(fs.readFileSync(f)),rows=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse):[];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const frozen=read('eval/runs/seed42/production-manifest.json'),split=read('eval/split.json'),sample=read(`${base}/sample.json`),handbook=read(`${base}/handbook.json`);
const qdrant='http://127.0.0.1:36333',ollama='http://127.0.0.1:11434';
const collection=format==='offtopic'?handbook.collection:frozen.collections[format];
const statsPath=format==='offtopic'?`${base}/handbook-sparse-stats.json`:`C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-scoped-hybrid-r4/${format}/sparse-stats.json`;
Object.assign(process.env,{QDRANT_URL:qdrant,OLLAMA_URL:ollama,SPARSE_STATS_PATH:statsPath,
 RAG_PROFILE:'new',RERANK_ENABLED:'0',RETRIEVE_EXPAND_CONTEXT:'1',WHOLE_DOC_MAX_TOKENS:'1000',CONTEXT_TITLE_CHUNK:'1',
 ANSWER_RESERVE_TOKENS:'512',OLLAMA_EMBED_MODEL:'nomic-embed-text',OLLAMA_EMBED_DIM:'768',OLLAMA_EMBED_PREFIXES:'1',RETRIEVE_FUSION:'rrf'});
const jobs=format==='offtopic'?read('data/offtopic-set.json').map((q,i)=>({...q,caseId:`offtopic/${String(i+1).padStart(2,'0')}`,cohort:'offtopic',format:'offtopic',documentId:handbook.documentId})):sample.filter(q=>q.format===format);
for(const q of jobs)if(format!=='offtopic'&&(!split.dev.includes(q.paperId)||split.test.includes(q.paperId)))throw Error('Held-out paper denied');
const sourceFiles=['src/config.ts','src/rag.ts','src/generation/llm.ts','src/generation/promptBuilder.ts','src/generation/promptVariants.ts','src/retrieval/retriever.ts','src/retrieval/vectorStore.ts','src/retrieval/context.ts','src/retrieval/embedder.ts','src/retrieval/sparse.ts','src/retrieval/sparseStats.ts','eval/split.json',`${base}/sample.json`,statsPath];
const frozenFile=`${base}/${format}.frozen.json`,hashes=sourceFiles.map(file=>({file,sha256:sha(fs.readFileSync(file))}));
if(fs.existsSync(frozenFile)){for(const h of read(frozenFile).hashes)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('Frozen code/input changed');}
else fs.writeFileSync(frozenFile,JSON.stringify({collection,statsPath,hashes},null,2)+'\n',{flag:'wx'});
for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/u)){
 const m=/^(CLOUDFLARE_ACCOUNT_ID|CLOUDFLARE_API_TOKEN)\s*=\s*(.*)$/u.exec(line.trim());
 if(m)process.env[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/u,'$2');
}
const lock=`${base}/execution.lock`,lockFd=fs.openSync(lock,'wx');fs.writeSync(lockFd,JSON.stringify({pid:process.pid,format}));
const ledgerFd=fs.openSync(`${base}/attempts.jsonl`,'a');
const ledger=x=>{fs.writeSync(ledgerFd,JSON.stringify(x)+'\n');fs.fsyncSync(ledgerFd);};
const append=(n,x)=>fs.appendFileSync(`${base}/${n}`,JSON.stringify(x)+'\n');
const originalFetch=globalThis.fetch;
let active=null,trace=null,provider=null,callId=null,stopReason=null,completed=0;
function checkFilter(part){
 const matches=part.filter?.must?.filter(c=>c.key==='documentId')??[];
 if(!matches.length||matches.some(c=>JSON.stringify(c.match?.any??[c.match?.value])!==JSON.stringify([active.documentId])))throw Error('Unfiltered/non-selected paper read denied');
 for(const child of part.prefetch??[])checkFilter(child);
}
globalThis.fetch=async(input,init)=>{
 const request=new Request(input,init),url=new URL(request.url);
 if(!active)throw Error('Network outside active case denied');
 if(url.origin===ollama&&url.pathname==='/api/embed'){
  const body=await request.clone().json(),expected='search_query: '+expandAcronyms(active.question);
  if(body.model!=='nomic-embed-text'||body.input!==expected)throw Error('Embedding question drift');
  trace.embeddingInputs.push(body.input);trace.embeddingCalls++;
  return originalFetch(request);
 }
 if(url.origin===qdrant&&url.pathname.startsWith(`/collections/${collection}/points/`)){
  if(!['/query','/scroll'].some(p=>url.pathname.endsWith(p)))throw Error('Non-retrieval Qdrant operation denied');
  const body=await request.clone().json();checkFilter(body);
  trace.qdrantRequests.push({path:url.pathname,limit:body.limit,filter:body.filter,prefetch:body.prefetch?.map(p=>({limit:p.limit,filter:p.filter}))});
  const response=await originalFetch(request);const j=await response.clone().json();
  for(const p of j.result?.points??[])if(p.payload?.documentId!==active.documentId)throw Error('Wrong/test document returned');
  return response;
 }
 const expected=`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID.trim()}/ai/run/${GENERATION_MODEL}`;
 if(request.url!==expected||!callId)throw Error('Unauthorized endpoint denied');
 const body=await request.clone().json();
 if(body.max_tokens!==512||body.temperature!==0||body.raw!==true||body.stream!==false)throw Error('Generation settings drift');
 let response;const start=performance.now();try{response=await originalFetch(request);}catch(e){provider={transportError:{name:e.name,code:e.cause?.code??e.code??null}};throw e;}const headersMs=performance.now()-start;provider={httpStatus:response.status,headersMs};
 const raw=await response.clone().text();let j;try{j=JSON.parse(raw);}catch{}
 const result=j?.result??j;
 provider={httpStatus:response.status,headersMs,requestBytes:Buffer.byteLength(JSON.stringify(body)),responseBytes:Buffer.byteLength(raw),
  requestId:response.headers.get('cf-ray'),usage:result?.usage??null,finishReason:result?.choices?.[0]?.finish_reason??null,
  responseId:result?.id??null,model:result?.model??null,providerMetrics:result?.metrics??null,wirePrompt:body.prompt};
 return response;
};
const [{retrieveForQuestion},{generate,GENERATION_MODEL},{expandAcronyms},{countTokens}]=await Promise.all([
 import('../../src/rag.ts'),import('../../src/generation/llm.ts'),import('../../src/retrieval/acronyms.ts'),import('../../src/generation/tokens.ts')]);
try{
 const prior=rows(`${base}/results.jsonl`),done=new Set(prior.filter(r=>r.success).map(r=>r.callId));
 const attempts=rows(`${base}/attempts.jsonl`),known=new Set(prior.map(r=>r.callId));
 if(attempts.some(a=>a.event==='reserved'&&!known.has(a.callId)))throw Error('Unresolved prior request reservation; no automatic duplicate call');
 for(const [i,q]of jobs.entries()){
  const arms=i%2?['old','new']:['new','old'];
  if(arms.every(arm=>done.has(`${q.caseId}:${arm}`)))continue;
  const day=new Date().toISOString().slice(0,10),initialDay=read(`${base}/budget.json`).initialUtcDay;
  const budget=day===initialDay?3500:8500;
  const used=rows(`${base}/results.jsonl`).filter(r=>r.utcDay===day).reduce((s,r)=>s+(r.usage?.neurons??50),0);
  if(used+100>budget){stopReason='daily-budget';break;}
  for(const arm of arms){
   callId=`${q.caseId}:${arm}`;if(done.has(callId))continue;
   if(rows(`${base}/results.jsonl`).filter(r=>r.callId===callId&&r.utcDay===day&&!r.success).length>=3){stopReason='retry-limit';break;}
   active=q;trace={embeddingInputs:[],embeddingCalls:0,qdrantRequests:[]};provider=null;
   const startedAt=new Date().toISOString(),start=performance.now();
   let prep;
   try{
    prep=await retrieveForQuestion(q.question,{answerProfile:arm==='old'?'legacy':'new',mode:'hybrid',scoreThreshold:.63,collection,
     documentScope:{status:'resolved',references:[],documentIds:[q.documentId]}});
   }catch(e){append('retrieval-errors.jsonl',{callId,error:e.message,trace,at:new Date().toISOString()});throw e;}
   const retrievalMs=performance.now()-start;
   if(trace.embeddingCalls!==1)throw Error('Expected fresh embedding per arm');
   if(prep.passages.some(p=>p.documentId!==q.documentId)||prep.chunks.some(p=>p.documentId!==q.documentId))throw Error('Context escaped selected paper');
   const systemTokensEstimate=countTokens(prep.systemPrompt),promptTokensEstimate=countTokens(prep.prompt)+systemTokensEstimate+32;
   const settings=arm==='old'?{total:4096,context:1200,k:5}:{total:5000,context:3200,k:15};
   const preparation={callId,caseId:q.caseId,cohort:q.cohort,arm,paperId:q.paperId,format:q.format,question:q.question,documentId:q.documentId,collection,
    settings,system:prep.systemPrompt,prompt:prep.prompt,chunks:prep.chunks,passages:prep.passages,documentScope:prep.documentScope,
    promptSha256:sha(prep.prompt),gateRejected:prep.chunks.length===0,trace,retrievalMs,promptTokensEstimate,totalWithReserveEstimate:promptTokensEstimate+512,
    nearBudgetEstimate:promptTokensEstimate+512>=settings.total*.95};
   append('preparations.jsonl',preparation);
   ledger({event:'reserved',callId,utcDay:day,arm,at:new Date().toISOString()});
   const genStart=performance.now();
   try{
    const answer=await generate(prep.prompt,{system:prep.systemPrompt,maxTokens:512,temperature:0});
    const elapsedMs=performance.now()-start,generationMs=performance.now()-genStart;
    if(!provider?.usage||!Number.isFinite(provider.usage.neurons))throw Error('Provider usage missing; stop budget tracking');
    append('results.jsonl',{callId,caseId:q.caseId,cohort:q.cohort,arm,format:q.format,question:q.question,utcDay:day,startedAt,endedAt:new Date().toISOString(),
     success:true,answer,retrievalMs,generationMs,elapsedMs,promptSha256:sha(prep.prompt),gateRejected:prep.chunks.length===0,
     totalBudget:settings.total,nearBudgetActual:provider.usage.prompt_tokens+512>=settings.total*.95,actualPromptPlusReserve:provider.usage.prompt_tokens+512,...provider});
    done.add(callId);completed++;
   }catch(e){append('results.jsonl',{callId,caseId:q.caseId,cohort:q.cohort,arm,format:q.format,question:q.question,utcDay:day,startedAt,success:false,error:e.message,
     retrievalMs,generationMs:performance.now()-genStart,elapsedMs:performance.now()-start,...provider});throw e;}
   finally{active=null;callId=null;}
  }
  if(stopReason)break;
  if(completed&&completed%10===0)console.log(JSON.stringify({format,newCompletedCalls:completed,dayUsedNeurons:rows(`${base}/results.jsonl`).filter(r=>r.utcDay===day).reduce((s,r)=>s+(r.usage?.neurons??50),0)}));
 }
}catch(e){stopReason=e.message;}
finally{
 globalThis.fetch=originalFetch;fs.closeSync(ledgerFd);fs.closeSync(lockFd);fs.unlinkSync(lock);
 if(format==='offtopic'&&!fs.existsSync(`${base}/blind-review.jsonl`)&&new Set(rows(`${base}/results.jsonl`).filter(r=>r.success).map(r=>r.callId)).size===558)await import('./blind-pack.mjs');
 const changed=hashes.filter(h=>sha(fs.readFileSync(h.file))!==h.sha256);
 const result={format,completed,stopReason,changedInputs:changed,finishedAt:new Date().toISOString()};
 fs.writeFileSync(`${base}/${format}.status.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 if(stopReason)process.exitCode=stopReason==='daily-budget'?3:2;
 if(changed.length)process.exitCode=2;
}
