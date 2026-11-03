/** Local-only same-source dense/hybrid arm, one format per process. */
import fs from 'node:fs';import path from 'node:path';
import {args,readJson,readLines,append} from './common.mjs';
import {readFrozenRun,verifyFrozenFiles,applyFrozenEnvironment,assertOwnedDocker} from './validation.mjs';
const o=args(),out=o.out,format=o.format;if(!['pdf','docx'].includes(format))throw Error('format required');
const run=readFrozenRun(out),services=readJson(path.join(out,'services.json'));applyFrozenEnvironment(run);assertOwnedDocker(run,services,out);
process.env.QDRANT_URL='http://127.0.0.1:'+services.ports.qdrant;process.env.SPARSE_STATS_PATH=path.join(out,format,'sparse-stats.json');process.env.DOC_STORE_PATH=path.join(out,format,'documents.json');
const original=globalThis.fetch;globalThis.fetch=(input,init)=>{const u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);if(u.hostname==='api.cloudflare.com'||u.pathname==='/api/generate')throw Error('Generation forbidden during local comparison');return original(input,init);};
const {app,ROOT}=await import('./bootstrap.mjs');verifyFrozenFiles(run,ROOT,out);
const {resolveDocumentScope,resolveFromHeaders}=await app('src/retrieval/documentScope.ts');
const {retrieve}=await app('src/retrieval/retriever.ts');
const {documentHeaders}=await app('src/retrieval/vectorStore.ts');
// Scope audit uses one explicitly timestamped bounded live catalog snapshot. The
// actual retrieval comparison resolves afresh per case, just as the application does.
const catalog=o.stage==='scope'?await documentHeaders(run.collections[format]):null;
const catalogCapturedAt=new Date().toISOString();
const file=path.join(out,o.stage==='scope'?'scope-decisions-'+format+'.jsonl':'retrieval-comparison-'+format+'.jsonl');
const completed=new Set(readLines(file).map(r=>r.caseId));
for(const c of readLines(path.join(out,'coverage.jsonl')).filter(c=>c.format===format&&!completed.has(c.caseId))){
 const scope=catalog?resolveFromHeaders(c.question,catalog):await resolveDocumentScope(c.question,run.collections[format]);
 const row={caseId:c.caseId,question:c.question,documentScope:scope,source:'live user-visible header/title resolution; no annotation IDs',catalogSnapshot:o.stage==='scope'?catalogCapturedAt:null,providerCalls:0};
 if(o.stage!=='scope'){for(const mode of ['dense','hybrid']){const start=performance.now();const hits=await retrieve(c.question,{collection:run.collections[format],mode,topK:5,scoreThreshold:0.63,documentScope:scope});row[mode]={hits,ms:performance.now()-start};}}
 append(file,row);console.log(JSON.stringify({caseId:c.caseId,status:scope.status,stage:o.stage??'comparison'}));
}
