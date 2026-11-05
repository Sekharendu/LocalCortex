import fs from 'node:fs';
import crypto from 'node:crypto';
import { generate, GENERATION_MODEL } from '../../src/generation/llm.ts';
const base='eval/depth-and-answer-quality-20261104';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f));
const lines=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const manifest=read(base+'/manifest.json'),requests=lines(base+'/requests.jsonl');
if(requests.length!==80||manifest.maximumGenerationAttempts!==80)throw Error('Unexpected authorized sample');
for(const h of manifest.inputHashes)if(hash(fs.readFileSync(h.file))!==h.sha256)throw Error('Input changed');
const split=read('eval/split.json');
for(const r of requests)if(!split.dev.includes(r.paperId)||split.test.includes(r.paperId)||hash(r.prompt)!==r.promptSha256)throw Error('Dev/prompt identity mismatch');
for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/u)){
 const m=/^(?:export\s+)?(CLOUDFLARE_ACCOUNT_ID|CLOUDFLARE_API_TOKEN)\s*=\s*(.*)$/u.exec(line.trim());
 if(m){let value=m[2].trim();if(/^(['"]).*\1$/u.test(value))value=value.slice(1,-1);process.env[m[1]]=value;}
}
if(!process.env.CLOUDFLARE_API_TOKEN||!process.env.CLOUDFLARE_ACCOUNT_ID)throw Error('Credentials unavailable');
const lock=base+'/answers.lock',lockFd=fs.openSync(lock,'wx');
let ledger;
try{ledger=fs.openSync(base+'/answer-attempts.jsonl','wx');}catch(e){fs.closeSync(lockFd);fs.unlinkSync(lock);throw e;}
const writeLedger=row=>{fs.writeSync(ledger,JSON.stringify(row)+'\n');fs.fsyncSync(ledger);};
const append=(f,row)=>fs.appendFileSync(base+'/'+f,JSON.stringify(row)+'\n');
const nativeFetch=globalThis.fetch;let active=null,attempts=0,completed=0,failed=0,reused=0,consecutiveFailures=0;
const cache=new Map();
globalThis.fetch=async(url,init)=>{
 if(!active||String(url)!==`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID.trim()}/ai/run/${GENERATION_MODEL}`)throw Error('Non-generation endpoint blocked');
 const response=await nativeFetch(url,init);append('answer-http.jsonl',{attempt:attempts,status:response.status});
 if(!response.body)return response;
 let bytes=0,text='';const decoder=new TextDecoder();
 const body=response.body.pipeThrough(new TransformStream({
  transform(chunk,controller){bytes+=chunk.byteLength;if(bytes<=1024*1024)text+=decoder.decode(chunk,{stream:true});controller.enqueue(chunk);},
  flush(){
   if(bytes>1024*1024)return;
   try{let j=JSON.parse(text+decoder.decode());let usage=j.usage;
    if(j.result){j=j.result;usage??=j.usage;}
    const numeric=usage&&typeof usage==='object'?Object.fromEntries(Object.entries(usage).filter(([k,v])=>/^[a-zA-Z0-9_]{1,80}$/u.test(k)&&typeof v==='number'&&Number.isFinite(v))):null;
    const reason=j.choices?.[0]?.finish_reason;
    append('answer-usage.jsonl',{attempt:attempts,usage:numeric,finishReason:typeof reason==='string'&&/^[a-zA-Z_]{1,40}$/u.test(reason)?reason:null});
   }catch{/* application client validates the response */}
  },
 }));
 return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
};
let status='complete',stopReason=null;
try{
 for(const r of requests){
  if(cache.has(r.promptSha256)){
   const value=cache.get(r.promptSha256);append('answers.jsonl',{caseId:r.caseId,k:r.k,promptSha256:r.promptSha256,answer:value.answer,reusedFromAttempt:value.attempt});reused++;continue;
  }
  if(attempts>=80)throw Error('Generation budget exhausted');
  active=r;const attempt=++attempts,started=performance.now();
  writeLedger({event:'reserved',attempt,caseId:r.caseId,k:r.k,promptSha256:r.promptSha256,at:new Date().toISOString()});
  try{
   const answer=await generate(r.prompt,{temperature:0});
   writeLedger({event:'completed',attempt,elapsedMs:performance.now()-started});
   append('answers.jsonl',{caseId:r.caseId,k:r.k,attempt,promptSha256:r.promptSha256,answer,elapsedMs:performance.now()-started});
   cache.set(r.promptSha256,{answer,attempt});completed++;consecutiveFailures=0;
  }catch(e){
   failed++;consecutiveFailures++;
   writeLedger({event:'failed-no-retry',attempt,error:e.name+': '+e.message,elapsedMs:performance.now()-started});
   append('answer-failures.jsonl',{caseId:r.caseId,k:r.k,attempt,error:e.name+': '+e.message});
   if(/HTTP (401|403|429)/u.test(e.message)||consecutiveFailures>=3)throw e;
  }finally{active=null;}
  if((completed+failed)%10===0)console.log(JSON.stringify({attempts,completed,failed,reused,maximum:80}));
 }
}catch(e){status='stopped';stopReason=e.name+': '+e.message;}
finally{
 globalThis.fetch=nativeFetch;cache.clear();fs.closeSync(ledger);fs.closeSync(lockFd);fs.unlinkSync(lock);
 const usage=fs.existsSync(base+'/answer-usage.jsonl')?lines(base+'/answer-usage.jsonl'):[];
 const changed=manifest.inputHashes.filter(h=>hash(fs.readFileSync(h.file))!==h.sha256);
 const result={status,stopReason,attempts,completed,failed,reused,maximumAttempts:80,
  reportedRunNeurons:usage.reduce((s,r)=>s+(r.usage?.neurons??0),0),usageRecords:usage.length,
  lengthLimitedAnswers:usage.filter(r=>r.finishReason==='length').length,changedInputs:changed,
  retrievalCalls:0,rerankingCalls:0,graderInferenceCalls:0,testPaperContentRead:false};
 fs.writeFileSync(base+'/answer-execution.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(result));if(changed.length)throw Error('Frozen inputs changed');
}
if(status!=='complete')process.exitCode=2;
