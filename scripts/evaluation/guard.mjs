import {AsyncLocalStorage} from 'node:async_hooks';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {MODEL} from './common.mjs';
import {StopRun} from './ledger.mjs';
/** Observe SSE without altering bytes delivered to the application. */
export function metadataFrames(observe){const decoder=new TextDecoder();let buffer='';
 const frame=text=>{const data=text.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!data||data==='[DONE]')return;let value;try{value=JSON.parse(data);}catch{return;}observe(value);};
 return {push(bytes,final=false){buffer+=decoder.decode(bytes,{stream:!final});if(buffer.length>1024*1024)throw new StopRun('Provider metadata frame exceeded evaluation bound');let match;while((match=/\r?\n\r?\n/.exec(buffer))){frame(buffer.slice(0,match.index));buffer=buffer.slice(match.index+match[0].length);}if(final&&buffer.trim()){frame(buffer);buffer='';}}};
}
export function installGuard({root,ledger,allowCloud=false,beforeDispatch=()=>{throw new StopRun('Shared cloud preflight not installed');}}){
 const scope=new AsyncLocalStorage(),originalFetch=globalThis.fetch;let observerLoads=0;
 const observer=registerHooks({load(url,context,next){const result=next(url,context);if(url.split('?')[0]!==pathToFileURL(root+'/src/rag.ts').href)return result;const source=typeof result.source==='string'?result.source:Buffer.from(result.source).toString('utf8');const pattern=/return\s*\{\s*prompt\s*,\s*chunks\s*,\s*passages\s*,\s*searchQuestion\s*\}\s*;?/g;if([...source.matchAll(pattern)].length!==1||++observerLoads!==1)throw Error('Prepared observer source changed');return {...result,source:source.replace(pattern,match=>';globalThis[Symbol.for("localcortex.full2.capture")]({prompt,chunks,passages,searchQuestion});'+match)};}});
 globalThis[Symbol.for('localcortex.full2.capture')]=prepared=>{const state=scope.getStore();if(!state)throw Error('No case scope for actual prepared context');(state.prepared??=[]).push(structuredClone(prepared));};
 globalThis.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  if(url.pathname==='/api/generate')throw new StopRun('Local Llama generation forbidden');
  if(url.hostname!=='api.cloudflare.com')return originalFetch(input,init);
  if(!allowCloud)throw new StopRun('Cloud execution disabled until tooling review');
  const state=scope.getStore();if(!state)throw new StopRun('Hosted call outside an attributed case');
  await beforeDispatch();ledger.assertOpen();if(url.pathname!=='/client/v4/accounts/'+process.env.CLOUDFLARE_ACCOUNT_ID?.trim()+'/ai/run/'+MODEL)throw new StopRun('Unexpected hosted model');
  const body=JSON.parse(String(init?.body));const kind=body.max_tokens===48?'rewrite':'answer';if(kind==='answer'&&body.max_tokens!==undefined)throw new StopRun('Answer cap changed');
  const number=(state.calls??=[]).filter(c=>c.kind===kind).length+1,id=state.caseId+'/'+kind+'/'+number;
  ledger.reserve(id,{kind,inputBytes:Buffer.byteLength(body.prompt??''),outputCap:body.max_tokens});
  const call={id,kind,started:performance.now(),httpStatus:null,usage:null,errorCodes:[]};state.calls.push(call);
  const deadlineTimer=new AbortController();const milliseconds=Math.min(2147483647,Math.max(1,ledger.deadline-Date.now()));const timer=setTimeout(()=>deadlineTimer.abort(),milliseconds);
  let settled=false;const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);call.ms=performance.now()-call.started;delete call.started;ledger.settle(id,{status:call.httpStatus,usage:call.usage,errorCodes:call.errorCodes,unknownUsage:!call.usage});};
  try{
   const response=await originalFetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,deadlineTimer.signal]):deadlineTimer.signal});call.httpStatus=response.status;
   const observe=data=>{const value=data?.result??data;const usage=value?.usage??data?.usage;if(usage&&typeof usage==='object')call.usage=Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens','neurons'].filter(k=>typeof usage[k]==='number').map(k=>[k,usage[k]]));call.errorCodes=[...new Set([...call.errorCodes,...[...(Array.isArray(data?.errors)?data.errors:[]),...(Array.isArray(value?.errors)?value.errors:[])].map(e=>Number(e?.code)).filter(Number.isFinite)])];if(call.errorCodes.includes(3036)){finish();ledger.assertOpen();}};
   if(!response.ok){try{observe(await response.clone().json());}catch{}finish();return response;}
   if(body.stream){
    if(!response.body){finish();return response;}
    const reader=response.body.getReader();let released=false;
    const release=()=>{if(!released){released=true;reader.releaseLock();}};
    const frames=metadataFrames(observe);
    const stream=new ReadableStream({async pull(controller){try{const part=await reader.read();if(part.done){frames.push(new Uint8Array(),true);finish();release();controller.close();}else{frames.push(part.value);controller.enqueue(part.value);}}catch(error){deadlineTimer.abort();try{await reader.cancel(error);}catch{}finally{finish();release();}controller.error(error);}},async cancel(reason){deadlineTimer.abort();try{await reader.cancel(reason);}finally{finish();release();}}});
    return new Response(stream,{status:response.status,statusText:response.statusText,headers:response.headers});
   }
   const json=response.json.bind(response);response.json=async()=>{try{const data=await json();observe(data);return data;}finally{finish();}};
   return response;
  }catch(error){finish();throw error;}
 };
 return {scope,run:(caseId,work)=>{const state={caseId,calls:[],prepared:[]};return scope.run(state,async()=>({value:await work(),trace:state}));},observerCount:()=>observerLoads,restore(){globalThis.fetch=originalFetch;delete globalThis[Symbol.for('localcortex.full2.capture')];observer.deregister();}};
}
