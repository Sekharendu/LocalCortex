import fs from 'node:fs';
import {spawn} from 'node:child_process';
const base='eval/stage2-end-to-end-20261105';
const lock=`${base}/supervisor.lock`,fd=fs.openSync(lock,'wx');fs.writeSync(fd,String(process.pid));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let resumed=false,child=null,recoveryStarts=0;
function update(){
 const raw=fs.existsSync(`${base}/results.jsonl`)?fs.readFileSync(`${base}/results.jsonl`,'utf8'):'';
 const records=raw.split(/\r?\n/u).filter(Boolean).flatMap(s=>{try{return[JSON.parse(s)];}catch{return[];}});
 const success=records.filter(r=>r.success),unique=new Map(success.map(r=>[r.callId,r]));
 const counts={};for(const r of unique.values()){const k=`${r.cohort}/${r.arm}`;counts[k]=(counts[k]??0)+1;}
 const progress={at:new Date().toISOString(),supervisorPid:process.pid,resumedAfterReset:resumed,successfulCalls:unique.size,
  totalPlannedCalls:558,remainingCalls:558-unique.size,failedAttempts:records.filter(r=>!r.success).length,
  reportedNeurons:records.reduce((s,r)=>s+(r.usage?.neurons??0),0),counts,grading:'Pending complete generation and blinded review'};
 fs.writeFileSync(`${base}/progress.json`,JSON.stringify(progress,null,2)+'\n');return progress;
}
try{
 for(;;){
  const progress=update();
  if(progress.remainingCalls===0)break;
  const status=fs.existsSync(`${base}/RUN_STATUS.json`)?JSON.parse(fs.readFileSync(`${base}/RUN_STATUS.json`)):null;
  if(status?.state==='stopped-error'){
   if(/while sending or reading/.test(status.reason??'')&&!fs.existsSync(`${base}/execution.lock`)&&recoveryStarts++<2){
    resumed=true;child=spawn(process.execPath,[`${base}/run-all.mjs`,'--wait-reset'],{windowsHide:true,stdio:'inherit'});
    await sleep(3000);continue;
   }
   break;
  }
  if(status?.state==='waiting-for-allowance-reset'&&!resumed&&!fs.existsSync(`${base}/execution.lock`)){
   resumed=true;
   child=spawn(process.execPath,[`${base}/run-all.mjs`,'--wait-reset'],{windowsHide:true,stdio:'inherit'});
   child.on('error',e=>fs.writeFileSync(`${base}/supervisor-error.json`,JSON.stringify({error:e.message})));
  }
  if(child?.exitCode!==null&&child?.exitCode!==undefined)break;
  await sleep(30_000);
 }
 update();
}finally{fs.closeSync(fd);fs.unlinkSync(lock);}
