/** Owned cached services only. No pulls, default-container changes or secret output. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import net from 'node:net';import {execFileSync,spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {args,readJson,writeNew,DEADLINE} from './common.mjs';
import {readFrozenRun,verifyFrozenFiles} from './validation.mjs';
const options=args(),out=options.out;if(!out)throw Error('--out required');const run=readFrozenRun(out);verifyFrozenFiles(run,path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out);const names={qdrant:'eval-qasper-full2-'+run.id+'-qdrant',postgres:'eval-qasper-full2-'+run.id+'-postgres'};
const ports={qdrant:36333,postgres:35433,pdfApi:33001,docxApi:33002,web:35173};
if(options.apply!=='reviewed-isolated'){console.log(JSON.stringify({dryRun:true,names,ports,images:'cached qdrant/qdrant:latest and postgres:17-alpine only',noSharedServiceChanges:true}));process.exit(0);}
if(Date.now()>=Date.parse(DEADLINE))throw Error('Authorized day ended');
const docker=(args,env={})=>{try{return execFileSync('docker',args,{env:{...process.env,...env},encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();}catch{throw Error('Owned Docker operation failed; no raw command/credential output');}};
for(const port of [ports.qdrant,ports.postgres,ports.pdfApi,ports.docxApi])await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',()=>reject(Error('Candidate port unavailable')));server.listen(port,'127.0.0.1',()=>server.close(resolve));});
const statePath=path.join(out,'services.json');if(fs.existsSync(statePath))throw Error('Owned services already recorded; inspect rather than recreate');
const password=crypto.randomBytes(24).toString('hex');const database='postgres://eval:'+password+'@127.0.0.1:'+ports.postgres+'/eval';
const privateFile=path.join(out,'private.env');writeNew(privateFile,'DATABASE_URL='+database+'\n');
const state={runId:run.id,names,ports,volumes:{qdrant:names.qdrant+'-data',postgres:names.postgres+'-data'},privateEnvironment:privateFile,started:[],deadline:DEADLINE};writeNew(statePath,state);
try{
 docker(['run','--pull=never','-d','--name',names.qdrant,'--label','localcortex.eval.run='+run.id,'--memory','1g','--cpus','2','-p','127.0.0.1:'+ports.qdrant+':6333','-v',state.volumes.qdrant+':/qdrant/storage','qdrant/qdrant:latest']);state.started.push(names.qdrant);
 docker(['run','--pull=never','-d','--name',names.postgres,'--label','localcortex.eval.run='+run.id,'--memory','256m','--cpus','1','-p','127.0.0.1:'+ports.postgres+':5432','-e','POSTGRES_USER=eval','-e','POSTGRES_DB=eval','-e','POSTGRES_PASSWORD','-v',state.volumes.postgres+':/var/lib/postgresql/data','postgres:17-alpine','-c','max_connections=30','-c','shared_buffers=32MB'],{POSTGRES_PASSWORD:password});state.started.push(names.postgres);
 fs.writeFileSync(statePath,JSON.stringify(state,null,2));console.log(JSON.stringify({state:statePath,started:state.started,ports,noCloudCalls:true}));
}catch(error){fs.writeFileSync(statePath,JSON.stringify({...state,error:'service-start-failed; owned resources retained for inspection'},null,2));throw error;}
