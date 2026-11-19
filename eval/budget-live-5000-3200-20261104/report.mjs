import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/budget-live-5000-3200-20261104/live';
const rows=f=>fs.readFileSync(`${base}/${f}`,'utf8').trim().split(/\r?\n/u).map(JSON.parse);
const results=rows('results.jsonl'),requests=rows('requests.jsonl');
const summary=JSON.parse(fs.readFileSync(`${base}/summary.json`));
const manifest=JSON.parse(fs.readFileSync(`${base}/manifest.json`));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
if(results.length!==20||results.some(r=>!r.success||!r.usage)||new Set(results.map(r=>r.attempt)).size!==20)throw Error('Incomplete live run');
for(const h of manifest.inputHashes)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('Input changed');
const pairs=Array.from({length:10},(_,i)=>{
 const old=results.find(r=>r.pair===i+1&&r.arm==='previous'),fresh=results.find(r=>r.pair===i+1&&r.arm==='new');
 if(old.caseId!==fresh.caseId)throw Error('Unpaired cases');
 return{pair:i+1,caseId:old.caseId,question:requests.find(r=>r.caseId===old.caseId).question,
  previous:{elapsedMs:old.elapsedMs,...old.usage},new:{elapsedMs:fresh.elapsedMs,...fresh.usage}};
});
for(const v of summary.variants){
 const r=results.filter(r=>r.arm===v.id),q=requests.filter(r=>r.id===v.id);
 Object.assign(v,{meanInputTokens:v.totalInputTokens/10,meanOutputTokens:v.totalOutputTokens/10,meanNeurons:v.totalNeurons/10,
  cachedInputTokens:r.reduce((s,x)=>s+(x.usage.prompt_tokens_details?.cached_tokens??0),0),
  maxProviderPromptTokens:Math.max(...r.map(x=>x.usage.prompt_tokens)),maxActualPromptPlusOutput:Math.max(...r.map(x=>x.usage.total_tokens)),
  providerPromptPlus512WithinConfiguredTotal:r.every(x=>x.usage.prompt_tokens+512<=v.totalCap),
  providerPromptPlusDefault2000WithinConfiguredTotal:r.every(x=>x.usage.prompt_tokens+2000<=v.totalCap),
  maximumLocalPromptPlusReserve:Math.max(...q.map(x=>x.totalWithReserve)),
  paidEquivalentUSD:v.totalNeurons*.011/1000});
}
const audit={cases:10,calls:20,allHttp200:results.every(r=>r.httpStatus===200),allFinishedStop:results.every(r=>r.finishReason==='stop'),
 frozenInputsUnchanged:true,generationOnlyLatency:true,applicationDefaultsChanged:false,heldOutTestPaperContentRead:false,
 retrievalCalls:0,rerankerCalls:0,rewriteCalls:0,graderCalls:0,
 newFasterPairs:pairs.filter(p=>p.new.elapsedMs<p.previous.elapsedMs).length,
 totalReportedNeurons:summary.variants.reduce((s,v)=>s+v.totalNeurons,0),
 limits:'Local tokenizer is llama3 estimate; provider token counts are actual reported values. 512 reserve is unchanged bookkeeping, not output cap; normal API default remains 2000. Full-model window not changed by local total budget.',
 latencyCaveat:'Ten sequential paired calls per arm; medians average central two. Nearest-rank p95 equals max at n=10. No streaming TTFT or provider compute-only timings measured. Includes HTTP round trip and body parsing, excludes retrieval.',
 metadata:'Saved actual usage including cache tokens, answer text, HTTP status, request/response sizes, headers latency, total latency, timestamps, provider request/completion IDs, model, finish reason, prompt and request hashes. Provider internal metrics were not retained; no inference about their values.',
 initialFailure:'Initial sandbox attempts could not resolve api.cloudflare.com; no HTTP response or usage received. Kept in parent directory, excluded from live results.'};
let report='# Paired Qwen budget experiment — 2026-11-04\n\n';
report+='Ten unique longer-quote dev questions, two configurations, twenty successful Qwen calls. Same selected paper, saved hybrid ranking sliced to k=15, unchanged context builder, no history, temperature 0, 512-token accounting reserve, provider default max_tokens omitted (documented default 2000), 180-second client timeout. New and previous arms alternate first position across pairs. No application settings changed. Sample chosen by fixed seed-42 hash independent of outcomes; not representative of all questions.\n\n';
report+='| Measurement | Previous: total 4096 / context 1200 | New: total 5000 / context 3200 |\n|---|---:|---:|\n';
const [o,n]=summary.variants;
const line=(label,a,b)=>report+=`| ${label} | ${a} | ${b} |\n`;
line('Successful calls',o.succeeded,n.succeeded);
for(const k of ['mean','median','min','max'])line(`${k} request time (seconds)`,(o.latencyMs[k]/1000).toFixed(3),(n.latencyMs[k]/1000).toFixed(3));
for(const [label,key] of [['Mean actual input tokens','meanInputTokens'],['Mean actual output tokens','meanOutputTokens'],['Total actual input tokens','totalInputTokens'],['Total actual output tokens','totalOutputTokens'],['Total Neurons','totalNeurons'],['Mean Neurons/call','meanNeurons'],['Mean assembled context tokens (local estimate)','meanContextTokensEstimate'],['Largest actual prompt tokens','maxProviderPromptTokens'],['Largest actual prompt + output tokens','maxActualPromptPlusOutput']])line(label,o[key].toFixed(2),n[key].toFixed(2));
line('Exact gold quote covered in final context',`${o.exactQuoteCovered}/10`,`${n.exactQuoteCovered}/10`);
line('Failed calls',o.failed,n.failed);
report+='\n## Each paired call\n\n| Pair | Previous time (s) | New time (s) | Previous input/output tokens | New input/output tokens | Previous Neurons | New Neurons |\n|---|---:|---:|---:|---:|---:|---:|\n';
for(const p of pairs)report+=`| ${p.pair} | ${(p.previous.elapsedMs/1000).toFixed(3)} | ${(p.new.elapsedMs/1000).toFixed(3)} | ${p.previous.prompt_tokens}/${p.previous.completion_tokens} | ${p.new.prompt_tokens}/${p.new.completion_tokens} | ${p.previous.neurons.toFixed(3)} | ${p.new.neurons.toFixed(3)} |\n`;
report+='\n## Interpretation and limits\n\nLarger budgets used about twice the Neurons. Their median was higher, while their average was lower because the smaller-budget run contained a slower request. This sample cannot establish a speed improvement. Coverage is literal full-reference-quote coverage in final passages, not generated-answer correctness. Answers are saved but have not been independently graded.\n\nThe requested caps are upper limits, not padding targets: the builder sends less when selected passages do not fill the allowance. Actual provider token counts differ from the local tokenizer. A total budget is local assembly bookkeeping; it does not set Cloudflare\'s 32768-token model window. The 512-token reserve remains unchanged and does not enforce the API output cap. Provider actual prompt+output and prompt+512 checks are recorded separately from worst-case prompt+2000 checks.\n\n';
report+=JSON.stringify(audit,null,2)+'\n';
fs.writeFileSync(`${base}/analysis.json`,JSON.stringify({summary,audit,pairs},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(`${base}/REPORT.md`,report,{flag:'wx'});
console.log(JSON.stringify({summary,audit},null,2));
