import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/prompt-comparison-20261104';
fs.mkdirSync(base,{recursive:true});
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const save=(name,x)=>fs.writeFileSync(`${base}/${name}`,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const append=(name,x)=>fs.appendFileSync(`${base}/${name}`,JSON.stringify(x)+'\n');
Object.assign(process.env,{OLLAMA_NUM_CTX:'5000',ANSWER_RESERVE_TOKENS:'512',WHOLE_DOC_MAX_TOKENS:'1000',CONTEXT_TITLE_CHUNK:'1',RERANK_ENABLED:'0'});
const [{selectPassages},{buildPrompt},{generate,GENERATION_MODEL,RAG_SYSTEM_PROMPT},{countTokens},{contextBudget},{contextConfig},{PARTIAL_ANSWER_SYSTEM_PROMPT}]=await Promise.all([
 import('../../src/retrieval/context.ts'),import('../../src/generation/promptBuilder.ts'),import('../../src/generation/llm.ts'),
 import('../../src/generation/tokens.ts'),import('../../src/rag.ts'),import('../../src/config.ts'),import('../../src/generation/promptVariants.ts')]);
const inputFiles=['eval/split.json','eval/dev-set-preparation-20261103/ready.jsonl','eval/dev-set-preparation-20261103/source-chunks.jsonl',
 ...['pdf','docx'].map(f=>`eval/dev-retrieval-20261103/${f}.results.jsonl`),
 'eval/depth-and-answer-quality-20261104/requests.jsonl','eval/graded-budget-2400-vs-3200-20261104/requests.jsonl','data/offtopic-set.json','data/eval-corpus.txt','src/generation/promptVariants.ts','src/config.ts','src/rag.ts','src/retrieval/context.ts','src/generation/llm.ts','src/generation/tokens.ts','src/generation/promptBuilder.ts'];
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
  const arms=[{id:'B',variant:'partial',total:5000,cap:3200},{id:'A',variant:'legacy',total:5000,cap:3200}];
  if(i%2)arms.reverse();
  for(const arm of arms){
   contextConfig.numCtx=arm.total;
   const budget=contextBudget(c.question,[]);
   const passages=hits.length?selectPassages([{chunks,hits}],{budgetTokens:budget,wholeMaxTokens:1000,chunkedMaxTokens:arm.cap,titleChunk:true}):[];
   const system=arm.variant==='partial'?PARTIAL_ANSWER_SYSTEM_PROMPT:RAG_SYSTEM_PROMPT;
   const prompt=buildPrompt(c.question,passages,[],arm.variant);
   const totalPromptEstimate=countTokens(system)+countTokens(prompt)+32;
   const covered=c.references.filter(r=>c.scoringReferenceIndices.includes(r.referenceIndex)).some(r=>r.items.length&&r.items.every(item=>passages.some(p=>p.text.replace(/\s+/gu,' ').trim().includes(item.normalized))));
   if(totalPromptEstimate+512>arm.total)throw Error('Local budget violation');
   requests.push({cohort:'dev',system,pair:i+1,caseId:c.caseId,paperId:c.paperId,format:c.format,previousVerdict:c.verdict,question:c.question,...arm,
    originalReferences:c.references.map(r=>r.original),k:15,budget,contextTokensEstimate:countTokens(passages.map(p=>p.text).join('\n\n---\n\n')),totalPromptEstimate,
    answerReserve:512,totalWithReserve:totalPromptEstimate+512,covered,passages,prompt,promptSha256:sha(prompt)});
  }
 }
 if(requests.length!==80)throw Error('Wrong sample size');
 const previous=rows('eval/graded-budget-2400-vs-3200-20261104/requests.jsonl').filter(r=>r.id==='B');
 for(const q of requests.filter(r=>r.id==='A')){
  const old=previous.find(r=>r.caseId===q.caseId);
  if(!old||old.prompt!==q.prompt||JSON.stringify(old.passages)!==JSON.stringify(q.passages))throw Error('Prior strict B context/prompt mismatch');
 }
 const handbook=fs.readFileSync('data/eval-corpus.txt','utf8');
 const off=JSON.parse(fs.readFileSync('data/offtopic-set.json','utf8'));
 if(off.length!==39)throw Error('Unexpected rejection set');
 for(const [i,c]of off.entries()){
  const chunks=[{text:handbook,source:'eval-corpus.txt',documentId:'offline-handbook',chunkIndex:0}];
  const hits=chunks.map(c=>({...c,score:1}));
  const budget=Math.min(contextBudget(c.question,[],'legacy'),contextBudget(c.question,[],'partial'));
  const passages=selectPassages([{chunks,hits}],{budgetTokens:budget,wholeMaxTokens:1000,chunkedMaxTokens:3200,titleChunk:true});
  if(passages.length!==1||passages[0].text!==handbook)throw Error('Handbook must be fully retained');
  const arms=i%2?['A','B']:['B','A'];
  for(const id of arms){
   const variant=id==='B'?'partial':'legacy',system=id==='B'?PARTIAL_ANSWER_SYSTEM_PROMPT:RAG_SYSTEM_PROMPT;
   const prompt=buildPrompt(c.question,passages,[],variant),totalPromptEstimate=countTokens(system)+countTokens(prompt)+32;
   if(totalPromptEstimate+512>5000)throw Error('Negative budget violation');
   requests.push({cohort:'offtopic',system,pair:i+1,caseId:`offtopic/${String(i+1).padStart(2,'0')}`,question:c.question,group:c.group,notes:c.notes,
    id,variant,total:5000,cap:3200,k:15,availableHits:1,budget,contextTokensEstimate:countTokens(handbook),totalPromptEstimate,
    answerReserve:512,totalWithReserve:totalPromptEstimate+512,passages,prompt,promptSha256:sha(prompt),originalReferences:[],covered:false});
  }
 }
 for(const r of requests){
  r.wirePrompt=`<|im_start|>system\n${r.system}<|im_end|>\n<|im_start|>user\n${r.prompt}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`;
  r.wirePromptSha256=sha(r.wirePrompt);
  if(r.id==='B'&&/enough information to answer fully/iu.test(r.wirePrompt.replace(/\s+/gu,' ')))throw Error('Forbidden phrase survives in B');
 }
 for(const c of [...new Set(requests.map(r=>r.caseId))]){
  const [a,b]=requests.filter(r=>r.caseId===c);
  if(JSON.stringify(a.passages)!==JSON.stringify(b.passages)||a.k!==b.k||a.total!==b.total||a.cap!==b.cap)throw Error('Arm context/settings mismatch');
 }
 save('manifest.json',{createdAt:new Date().toISOString(),model:GENERATION_MODEL,maximumCalls:158,temperature:0,maxTokens:512,timeoutMs:180000,
  fixed:{contextCap:3200,total:5000,k:15,reranking:false,history:[],wholeMaxTokens:1000,titleChunk:true},
  devCases:40,offtopicCases:39,selection:'Exact original 40 dev IDs, 22 previously failed and18 acceptable; 39 repository off-topic questions',
  mode:'Saved hybrid top50 sliced15; existing builder; final passages frozen equal between arms; exact prior strict B prompts reproduced',
  offtopicDesign:'Generation-only negative control: full intended sample handbook in one available passage, requested maximum15 hits. No production retrieval or relevance gate; cannot estimate full-app rejection rate.',
  order:'Paired with alternating first arm',allBFinalPromptsFreeOfForbiddenPhrase:true,
  authorization:'User explicitly requested both dev prompt arms and existing rejection set on Workers AI',
  inputHashes:inputFiles.map(file=>({file,sha256:sha(fs.readFileSync(file))}))});
 fs.writeFileSync(`${base}/requests.jsonl`,requests.map(JSON.stringify).join('\n')+'\n',{flag:'wx'});
 fs.writeFileSync(`${base}/exact-wire-prompts.jsonl`,requests.map(r=>JSON.stringify({caseId:r.caseId,arm:r.id,system:r.system,userPrompt:r.prompt,wirePrompt:r.wirePrompt,sha256:r.wirePromptSha256})).join('\n')+'\n',{flag:'wx'});
 save('preflight.json',{devCases:40,rejectionCases:39,calls:requests.length,allContextPairsIdentical:true,oldStrictContextsAndPromptsReproduced:40,BForbiddenPhraseMatches:0,
   allLocalBudgetsFit:requests.every(r=>r.totalWithReserve<=5000),appInputsFrozen:true});
 console.log(JSON.stringify({prepared:requests.length,devCases:40,offtopicCases:39,BForbiddenPhraseMatches:0}));
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
  if(body.prompt!==active.wirePrompt)throw Error('Wire prompt mismatch');
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
   if(++attempts>158)throw Error('Call limit');active=r;metadata=null;
   fs.writeSync(fd,JSON.stringify({event:'reserved',attempt:attempts,caseId:r.caseId,arm:r.id,at:new Date().toISOString()})+'\n');fs.fsyncSync(fd);
   const startedAt=new Date().toISOString(),start=performance.now();
   try{const answer=await generate(r.prompt,{system:r.system,temperature:0,maxTokens:512,timeoutMs:180000});
    append('results.jsonl',{attempt:attempts,caseId:r.caseId,cohort:r.cohort,pair:r.pair,arm:r.id,promptSha256:r.promptSha256,startedAt,endedAt:new Date().toISOString(),elapsedMs:performance.now()-start,success:true,answer,...metadata});
   }catch(e){append('results.jsonl',{attempt:attempts,caseId:r.caseId,cohort:r.cohort,pair:r.pair,arm:r.id,startedAt,elapsedMs:performance.now()-start,success:false,error:e.name+': '+e.message,...metadata});
    if(/HTTP (401|403|429)/u.test(e.message))throw e;
   }finally{active=null;}
   console.log(JSON.stringify({completedAttempts:attempts,total:158,arm:r.id,httpStatus:metadata?.httpStatus}));
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
