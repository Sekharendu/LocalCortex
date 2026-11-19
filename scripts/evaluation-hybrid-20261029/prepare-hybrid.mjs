/** Seal a new independent answer arm. No provider calls, uploads or baseline writes. */
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
import {args,readJson,readLines,writeNew,sha} from './common.mjs';
import {readFrozenRun} from './validation.mjs';
export function selectHybridQueue(coverage,results) {
 if(results.length!==871||new Set(results.map(r=>r.caseId)).size!==871)throw Error('Exact completed871case baseline required');
 const ids=new Set(results.map(r=>r.caseId)),selected=coverage.filter(c=>ids.has(c.caseId));
 if(selected.length!==871||new Set(selected.map(c=>c.caseId)).size!==871||selected.filter(c=>c.format==='pdf').length!==708||selected.filter(c=>c.format==='docx').length!==163||selected.some(c=>c.question!==results.find(r=>r.caseId===c.caseId).actualQuestion))throw Error('Case identities/wordings changed');
 return selected;
}
export function prepareHybrid({from,out,root,id='20261029-scoped-hybrid-r2'}) {
 if(fs.existsSync(out))throw Error('New owned output directory required');
 const parent=readFrozenRun(from),cohort=readJson(path.join(from,'pdf-cohort.json'));
 const results=readLines(path.join(from,'baseline-results.jsonl'));
 const coverage=selectHybridQueue(readLines(path.join(from,'coverage.jsonl')),results);
 if(!/^[a-z0-9-]+$/.test(id))throw Error('Safe independent run ID required');fs.mkdirSync(out,{recursive:true});
 for(const format of ['pdf','docx']){fs.mkdirSync(path.join(out,format));for(const name of ['documents.json','sparse-stats.json'])fs.copyFileSync(path.join(from,format,name),path.join(out,format,name),fs.constants.COPYFILE_EXCL);}
 for(const name of ['ingestion.jsonl','cohort-coverage.jsonl'])fs.copyFileSync(path.join(from,name),path.join(out,name),fs.constants.COPYFILE_EXCL);
 const initial=readLines(parent.initialExclusionsFile);writeNew(path.join(out,'initial-exclusions.jsonl'),initial.map(JSON.stringify).join('\n')+'\n');
 const newCohort={...cohort,runId:id,selectedBeforeAnyBaselineGeneration:true,selectionInheritedFrom:from};writeNew(path.join(out,'pdf-cohort.json'),newCohort);writeNew(path.join(out,'pdf-cohort.sha256'),sha(fs.readFileSync(path.join(out,'pdf-cohort.json')))+'\n');
 const services=readJson(path.join(from,'services.json'));fs.copyFileSync(services.privateEnvironment,path.join(out,'private.env'),fs.constants.COPYFILE_EXCL);writeNew(path.join(out,'services.json'),{...services,runId:id,ports:{...services.ports,pdfApi:33005,docxApi:33006},privateEnvironment:path.join(out,'private.env')});
 const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
 const sourceHashes=[...walk('src'),...walk('migrations'),'scripts/migrate.ts','package.json','pnpm-lock.yaml','tsconfig.json','.dockerignore'].map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))}));
 const toolingHashes=walk('scripts/evaluation-hybrid-20261029').map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))}));
 const coverageText=coverage.map(JSON.stringify).join('\n')+'\n';writeNew(path.join(out,'coverage.jsonl'),coverageText);
 const inputHashes=[...parent.inputHashes,...['run.json','run.sha256','baseline-results.jsonl','baseline-attempts.jsonl','cloud-ledger.jsonl'].map(name=>({file:path.join(from,name),sha256:sha(fs.readFileSync(path.join(from,name)))})),...['ingestion.jsonl','pdf/documents.json','docx/documents.json','pdf/sparse-stats.json','docx/sparse-stats.json'].map(name=>({file:path.join(out,name),sha256:sha(fs.readFileSync(path.join(out,name)))}))];
 const run={...parent,id,createdAt:new Date().toISOString(),settings:{...parent.settings,mode:'hybrid'},sourceHashes,toolingHashes,inputHashes,coverageSha256:sha(coverageText),coverageRows:871,pdfQuestions:708,docxQuestions:163,initialExclusionsFile:path.join(out,'initial-exclusions.jsonl'),comparison:{baseline:from,baselineManifestSha256:sha(fs.readFileSync(path.join(from,'run.json'))),answerArm:'combined document-scope + hybrid change; not mode-only',modeOnly:'local retrieval comparison on identical new source'},freshAttempts:true};
 writeNew(path.join(out,'run.json'),run);writeNew(path.join(out,'run.sha256'),sha(fs.readFileSync(path.join(out,'run.json')))+'\n');
 return {out,cases:871,pdf:708,docx:163,priorErrorsIncluded:results.filter(r=>r.status!=='success').length,providerCalls:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const o=args();console.log(JSON.stringify(prepareHybrid({from:o.from,out:o.out,id:o.id,root:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')})));}
