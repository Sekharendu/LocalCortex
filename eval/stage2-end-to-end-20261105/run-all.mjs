import fs from 'node:fs';
import {spawn} from 'node:child_process';
const base='eval/stage2-end-to-end-20261105';
const rows=()=>fs.existsSync(`${base}/results.jsonl`)?fs.readFileSync(`${base}/results.jsonl`,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse):[];
const status=x=>{const r=rows();const value={...x,at:new Date().toISOString(),successfulCalls:new Set(r.filter(x=>x.success).map(x=>x.callId)).size,
 attempts:r.length,reportedNeurons:r.reduce((s,x)=>s+(x.usage?.neurons??0),0),unknownUsageFailures:r.filter(x=>!x.success&&!x.usage).length};
 fs.writeFileSync(`${base}/RUN_STATUS.json`,JSON.stringify(value,null,2)+'\n');console.log(JSON.stringify(value));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let retries=0,lastProgress=0;
status({state:"running",expectedSuccessfulCalls:558});
for(;;){
 let stop=null;
 for(const format of ['pdf','docx','offtopic']){
  const code=await new Promise(resolve=>{
   const child=spawn(process.execPath,['--use-env-proxy','--import','tsx',`${base}/worker.mjs`,format],{stdio:'inherit',windowsHide:true});
   child.on('error',()=>resolve(2));child.on('exit',resolve);
  });
  if(code!==0){stop=JSON.parse(fs.readFileSync(`${base}/${format}.status.json`)).stopReason;break;}
 }
 if(!stop){status({state:'generation-complete',grading:'pending blinded review',expectedSuccessfulCalls:558});break;}
 if(stop==='daily-budget'||stop==='retry-limit'||/HTTP 429/.test(stop)){
  const next=new Date();next.setUTCHours(24,5,0,0);
  status({state:'waiting-for-allowance-reset',reason:stop,resumeAt:next.toISOString(),resumeIndiaTime:'05:35 IST',grading:'pending full collection'});
  if(!process.argv.includes('--wait-reset'))break;
  while(Date.now()<next.getTime())await sleep(Math.min(60_000,next.getTime()-Date.now()));
  retries=0;continue;
 }
 const nowProgress=new Set(rows().filter(r=>r.success).map(r=>r.callId)).size;
 if(nowProgress>lastProgress){retries=0;lastProgress=nowProgress;}
 if(/while sending or reading/.test(stop)&&retries++<2){status({state:'retrying-transient-error',reason:stop});await sleep(5000);continue;}
 status({state:'stopped-error',reason:stop,grading:'pending'});break;
}
