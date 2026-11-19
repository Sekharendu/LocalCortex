import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/graded-budget-2400-vs-3200-20261104';
fs.mkdirSync(base,{recursive:true});
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const save=(name,x)=>fs.writeFileSync(`${base}/${name}`,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const append=(name,x)=>fs.appendFileSync(`${base}/${name}`,JSON.stringify(x)+'\n');
Object.assign(process.env,{OLLAMA_NUM_CTX:'4096',ANSWER_RESERVE_TOKENS:'512',WHOLE_DOC_MAX_TOKENS:'1000',CONTEXT_TITLE_CHUNK:'1',RERANK_ENABLED:'0'});
const [{selectPassages},{buildPrompt},{generate,GENERATION_MODEL,RAG_SYSTEM_PROMPT},{countTokens},{contextBudget},{contextConfig}]=await Promise.all([
 import('../../src/retrieval/context.ts'),import('../../src/generation/promptBuilder.ts'),import('../../src/generation/llm.ts'),
 import('../../src/generation/tokens.ts'),import('../../src/rag.ts'),import('../../src/config.ts')]);
const inputFiles=['eval/split.json','eval/dev-set-preparation-20261103/ready.jsonl','eval/dev-set-preparation-20261103/source-chunks.jsonl',
 ...['pdf','docx'].map(f=>`eval/dev-retrieval-20261103/${f}.results.jsonl`),
 'eval/depth-and-answer-quality-20261104/requests.jsonl','src/config.ts','src/rag.ts','src/retrieval/context.ts','src/generation/llm.ts','src/generation/tokens.ts','src/generation/promptBuilder.ts'];
if(process.argv.includes('--prepare')){
 const split=JSON.parse(fs.readFileSync(inputFiles[0]));
 const ranking=new Map(inputFiles.slice(3,5).flatMap(rows).filter(r=>r.mode==='hybrid'&&r.requestedK===50).map(r=>[r.caseId,r]));
 const assets=new Map(rows(inputFiles[2]).map(a=>[a.documentId,a]));
 const prior=rows('eval/depth-and-answer-quality-20261104/requests.jsonl');
 const ids=[...new Set(prior.map(r=>r.caseId))];
 const ready=new Map(rows(inputFiles[1]).map(c=>[c.caseId,c]));
 const selected=ids.map(id=>ready.get(id));
 if(selected.length!==40||selected.some(c=>!c)||selected.filter(c=>c.verdict==='failed').length!==22||selected.filter(c=>c.verdict==='acceptable').length!==18)throw Error('Original sample mismatch');
 const requests=[];
 for(const [i,c]of selected.entries()){
  if(!split.dev.includes(c.paperId)||split.test.includes(c.paperId))throw Error('Test case denied');
  const r=ranking.get(c.caseId),a=assets.get(c.documentId),hits=r.chunks.slice(0,15);
  if(!a||r.question!==c.question||hits.some(h=>h.documentId!==c.documentId))throw Error('Identity mismatch');
  const chunks=a.chunks.map(p=>({...p,source:hits[0]?.source??c.format,documentId:c.documentId}));
  for(const h of hits)if(!chunks.some(p=>p.chunkIndex===h.chunkIndex&&p.text===h.text))throw Error('Chunk mismatch');
  const arms=[{id:'B',total:5000,cap:3200},{id:'A',total:4096,cap:2400}];
  if(i%2)arms.reverse();
  for(const arm of arms){
   contextConfig.numCtx=arm.total;
   const budget=contextBudget(c.question,[]);
   const passages=hits.length?selectPassages([{chunks,hits}],{budgetTokens:budget,wholeMaxTokens:1000,chunkedMaxTokens:arm.cap,titleChunk:true}):[];
   const prompt=buildPrompt(c.question,passages,[]);
   const totalPromptEstimate=countTokens(RAG_SYSTEM_PROMPT)+countTokens(prompt)+32;
   const covered=c.references.filter(r=>c.scoringReferenceIndices.includes(r.referenceIndex)).some(r=>r.items.length&&r.items.every(item=>passages.some(p=>p.text.replace(/\s+/gu,' ').trim().includes(item.normalized))));
   if(totalPromptEstimate+512>arm.total)throw Error('Local budget violation');
   requests.push({pair:i+1,caseId:c.caseId,paperId:c.paperId,format:c.format,previousVerdict:c.verdict,question:c.question,...arm,
    originalReferences:c.references.map(r=>r.original),k:15,budget,contextTokensEstimate:countTokens(passages.map(p=>p.text).join('\n\n---\n\n')),totalPromptEstimate,
    answerReserve:512,totalWithReserve:totalPromptEstimate+512,covered,passages,prompt,promptSha256:sha(prompt)});
  }
 }
 if(requests.length!==80)throw Error('Wrong sample size');
 save('manifest.json',{createdAt:new Date().toISOString(),model:GENERATION_MODEL,maximumCalls:80,temperature:0,maxTokens:512,
  timeoutMs:180000,history:[],k:15,mode:'hybrid saved top50 sliced to15',selection:'Exact fixed 40 case IDs from prior 5-vs-15 sample, 22 failed and 18 acceptable; includes PDF/DOCX duplicates and empty retrieval gate case',
  order:'paired, alternating first arm',tokenizer:'existing llama3 estimate; provider actual usage separately recorded',
  scope:'same selected paper per case; no new retrieval, reranking, rewrite or grader calls',authorization:'User explicitly requested 40 fixed dev cases across A/B, max_tokens512, grading and recorded usage in this conversation',
  inputHashes:inputFiles.map(file=>({file,sha256:sha(fs.readFileSync(file))}))});
 fs.writeFileSync(`${base}/requests.jsonl`,requests.map(JSON.stringify).join('\n')+'\n',{flag:'wx'});
 console.log(JSON.stringify({prepared:requests.length,caseUnits:40,settings:[4096,2400,5000,3200],model:GENERATION_MODEL}));
}else if(process.argv.includes('--run')){
 const manifest=JSON.parse(fs.readFileSync(`${base}/manifest.json`)),requests=rows(`${base}/requests.jsonl`);
 for(const h of manifest.inputHashes)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('Frozen input changed');
 for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/u)){
  const m=/^(CLOUDFLARE_ACCOUNT_ID|CLOUDFLARE_API_TOKEN)\s*=\s*(.*)$/u.exec(line.trim());
  if(m)process.env[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/u,'$2');
 }
 if(!process.env.CLOUDFLARE_ACCOUNT_ID||!process.env.CLOUDFLARE_API_TOKEN)throw Error('Credentials unavailable');
 const fd=fs.openSync(`${base}/attempts.jsonl`,'wx');
 const nativeFetch=globalThis.fetch;let active=null,metadata=null,attempts=0,stopReason=null;
 globalThis.fetch=async(url,init)=>{
  if(!active||String(url)!==`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID.trim()}/ai/run/${GENERATION_MODEL}`)throw Error('Endpoint denied');
  const body=JSON.parse(init.body);
  if(body.max_tokens!==512||body.temperature!==0||body.raw!==true||body.stream!==false)throw Error('Request settings mismatch');
  const started=performance.now(),response=await nativeFetch(url,init);
  const headersMs=performance.now()-started;
  const headers=Object.fromEntries(['cf-ray','content-type','date','server-timing','x-request-id','retry-after'].map(k=>[k,response.headers.get(k)]).filter(([,v])=>v!==null));
  metadata={httpStatus:response.status,headersMs,headers,requestBytes:Buffer.byteLength(init.body),requestBodySha256:sha(init.body)};
  const raw=await response.clone().text();metadata.responseBytes=Buffer.byteLength(raw);
  try{const j=JSON.parse(raw),r=j.result??j;metadata.usage=r.usage??j.usage??null;metadata.finishReason=r.choices?.[0]?.finish_reason??null;
   metadata.responseId=r.id??null;metadata.responseModel=r.model??null;metadata.providerTimings=r.timings??j.timings??null;metadata.providerMetrics=r.metrics??null;metadata.serviceTier=r.service_tier??null;metadata.providerCreated=r.created??null;
   metadata.responseTopLevelKeys=Object.keys(j);metadata.resultKeys=Object.keys(r);
  }catch{metadata.jsonParseFailed=true;}
  return response;
 };
 try{
  for(const r of requests){
   if(++attempts>80)throw Error('Call limit');active=r;metadata=null;
   fs.writeSync(fd,JSON.stringify({event:'reserved',attempt:attempts,caseId:r.caseId,arm:r.id,at:new Date().toISOString()})+'\n');fs.fsyncSync(fd);
   const startedAt=new Date().toISOString(),start=performance.now();
   try{const answer=await generate(r.prompt,{temperature:0,maxTokens:512,timeoutMs:180000});
    append('results.jsonl',{attempt:attempts,caseId:r.caseId,pair:r.pair,arm:r.id,promptSha256:r.promptSha256,startedAt,endedAt:new Date().toISOString(),elapsedMs:performance.now()-start,success:true,answer,...metadata});
   }catch(e){append('results.jsonl',{attempt:attempts,caseId:r.caseId,pair:r.pair,arm:r.id,startedAt,elapsedMs:performance.now()-start,success:false,error:e.name+': '+e.message,...metadata});
    if(/HTTP (401|403|429)/u.test(e.message))throw e;
   }finally{active=null;}
   console.log(JSON.stringify({completedAttempts:attempts,total:80,arm:r.id,httpStatus:metadata?.httpStatus}));
  }
 }catch(e){stopReason=e.name+': '+e.message;}
 finally{globalThis.fetch=nativeFetch;fs.closeSync(fd);}
 const results=rows(`${base}/results.jsonl`),changedInputs=manifest.inputHashes.filter(h=>sha(fs.readFileSync(h.file))!==h.sha256);
 const quantile=(xs,p)=>[...xs].sort((a,b)=>a-b)[Math.ceil(xs.length*p)-1];
 const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
 const summary={model:GENERATION_MODEL,attempts,stopReason,changedInputs,variants:['A','B'].map(id=>{
  const rs=results.filter(r=>r.arm===id),ok=rs.filter(r=>r.success),req=requests.filter(r=>r.id===id),times=ok.map(r=>r.elapsedMs),u=ok.map(r=>r.usage);
  const sum=k=>u.reduce((s,x)=>s+(x?.[k]??0),0);
  return{id,totalCap:req[0].total,contextCap:req[0].cap,calls:rs.length,succeeded:ok.length,failed:rs.length-ok.length,
   latencyMs:{mean:mean(times),median:([ ...times].sort((a,b)=>a-b)[Math.floor((times.length-1)/2)]+[...times].sort((a,b)=>a-b)[Math.floor(times.length/2)])/2,min:Math.min(...times),p95:quantile(times,.95),max:Math.max(...times)},
   usageRecords:u.filter(Boolean).length,totalInputTokens:sum('prompt_tokens'),totalOutputTokens:sum('completion_tokens'),totalTokens:sum('total_tokens'),totalNeurons:sum('neurons'),
   meanContextTokensEstimate:mean(req.map(r=>r.contextTokensEstimate)),meanPromptTokensEstimate:mean(req.map(r=>r.totalPromptEstimate)),maxPromptTokensEstimate:Math.max(...req.map(r=>r.totalPromptEstimate)),
   exactQuoteCovered:req.filter(r=>r.covered).length,finishReasons:ok.map(r=>r.finishReason)};
 })};
 save('summary.json',summary);console.log(JSON.stringify(summary,null,2));
 if(stopReason||changedInputs.length)process.exitCode=2;
}else throw Error('Use --prepare or --run');
