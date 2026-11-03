/** Explicitly requested continuation after an expired segment; never replays attempts. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {args,readLines,readJson,sha,writeNew} from './common.mjs';
import {readFrozenRun,verifyFrozenFiles} from './validation.mjs';
import {assertFrozenCohort} from './cohort.mjs';

const o=args(),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
for(const key of ['from','out','id','deadline','reset'])if(!o[key])throw Error('Missing '+key);
if(!/^[a-z0-9-]+$/.test(o.id)||fs.existsSync(o.out))throw Error('Use a fresh owned segment');
const deadline=Date.parse(o.deadline),reset=Date.parse(o.reset);
if(!(Date.now()<deadline&&deadline<=Date.parse('2026-10-29T18:30:00Z')&&deadline<reset))throw Error('Only the explicitly renewed29October free-only window is allowed');
const old=readFrozenRun(o.from);verifyFrozenFiles(old,root,o.from);
const cohort=assertFrozenCohort(old,o.from),attempts=readLines(path.join(o.from,'baseline-attempts.jsonl')),results=readLines(path.join(o.from,'baseline-results.jsonl')),ledger=readLines(path.join(o.from,'cloud-ledger.jsonl'));
const attempted=new Set(attempts.map(r=>r.caseId)),settled=new Set(ledger.filter(r=>r.event==='settle').map(r=>r.id));
if(attempted.size!==attempts.length||new Set(results.map(r=>r.caseId)).size!==results.length||results.length!==attempts.length||results.some(r=>!attempted.has(r.caseId)))throw Error('Attempt/result reconciliation failed');
if(ledger.some(r=>r.event==='reserve'&&!settled.has(r.id)))throw Error('Unknown outstanding provider call requires reconciliation');
const selected=new Set(cohort.selectedPdfIds),coverage=readLines(path.join(o.from,'coverage.jsonl'));
const pending=coverage.filter(c=>(c.format==='docx'||selected.has(c.paperId))&&c.executionEligibility==='ready'&&!attempted.has(c.caseId));
if(!pending.length)throw Error('No untouched cases remain');
const toolingRelative='scripts/evaluation-resume-'+o.id,tooling=path.join(root,toolingRelative);
if(fs.existsSync(tooling))throw Error('Snapshot directory already exists');
fs.mkdirSync(tooling);fs.mkdirSync(o.out,{recursive:true});
for(const name of fs.readdirSync(path.join(root,'scripts/evaluation')).filter(n=>n.endsWith('.mjs')&&n!=='resume-segment.mjs')){
 let text=fs.readFileSync(path.join(root,'scripts/evaluation',name),'utf8');
 if(name==='common.mjs')text=text.replace("export const DEADLINE='2026-10-29T00:00:00.000Z';",`export const DEADLINE='${new Date(deadline).toISOString()}';`).replace("export const RESET='2026-10-29T00:00:00.000Z';",`export const RESET='${new Date(reset).toISOString()}';`);
 if(name==='offline.test.mjs')text=text.replace("29IST renewal stops at next reset, earlier than local day end","explicit renewal stops at local day end before next reset").replace('assert.equal(DEADLINE,RESET);assert.ok(Date.parse(DEADLINE)<Date.parse(AUTHORIZATION_DAY_END));','assert.equal(DEADLINE,AUTHORIZATION_DAY_END);assert.ok(Date.parse(DEADLINE)<Date.parse(RESET));');
 writeNew(path.join(tooling,name),text);
}
const inherited=['coverage.jsonl','cohort-coverage.jsonl','ingestion.jsonl','initial-exclusions.jsonl','baseline-attempts.jsonl','baseline-results.jsonl'];
if(fs.existsSync(path.join(o.from,'ingestion-skips.jsonl')))inherited.push('ingestion-skips.jsonl');
for(const name of inherited)fs.copyFileSync(path.join(o.from,name),path.join(o.out,name),fs.constants.COPYFILE_EXCL);
for(const format of ['pdf','docx']){fs.mkdirSync(path.join(o.out,format));for(const name of ['documents.json','sparse-stats.json'])fs.copyFileSync(path.join(o.from,format,name),path.join(o.out,format,name),fs.constants.COPYFILE_EXCL);}
const services=readJson(path.join(o.from,'services.json'));
fs.copyFileSync(services.privateEnvironment,path.join(o.out,'private.env'),fs.constants.COPYFILE_EXCL);
writeNew(path.join(o.out,'services.json'),{...services,runId:o.id,privateEnvironment:path.join(o.out,'private.env'),deadline:new Date(deadline).toISOString()});
writeNew(path.join(o.out,'pdf-cohort.json'),{...cohort,runId:o.id,inheritedCohortFrom:o.from});
writeNew(path.join(o.out,'pdf-cohort.sha256'),sha(fs.readFileSync(path.join(o.out,'pdf-cohort.json')))+'\n');
const proofNames=['run.json','run.sha256','services.json','pdf-cohort.json','pdf-cohort.sha256','cloud-ledger.jsonl',...inherited];
const proof=proofNames.map(name=>({file:path.join(o.from,name),sha256:sha(fs.readFileSync(path.join(o.from,name)))}));
const run={...old,id:o.id,createdAt:new Date().toISOString(),settings:{...old.settings,deadline:new Date(deadline).toISOString(),providerReset:new Date(reset).toISOString()},authorization:{userRenewedFreeOnlyOn:'2026-10-29',userInstruction:'Proceed with remaining cases; restart Docker approved',localDayEnd:'2026-10-29T18:30:00.000Z',nextProviderReset:new Date(reset).toISOString(),effectiveStop:new Date(deadline).toISOString(),noAutomaticResetOrNextDayContinuation:true},initialExclusionsFile:path.join(o.out,'initial-exclusions.jsonl'),toolingHashes:fs.readdirSync(tooling).map(name=>({file:toolingRelative+'/'+name,sha256:sha(fs.readFileSync(path.join(tooling,name)))})),inputHashes:[...old.inputHashes,...proof],resumeFrom:{out:o.from,attempts:attempts.length,results:results.length,pending:pending.length,retainedErrors:results.filter(r=>r.status!=='success').map(r=>r.caseId),ledgerReserves:ledger.filter(r=>r.event==='reserve').length,unsettled:0},baselineExecutionTarget:cohort.selectedPdfQuestionCount+cohort.selectedDocxQuestionCount};
writeNew(path.join(o.out,'run.json'),run);writeNew(path.join(o.out,'run.sha256'),sha(fs.readFileSync(path.join(o.out,'run.json')))+'\n');
writeNew(path.join(o.out,'pending-cases.jsonl'),pending.map(r=>JSON.stringify(r)).join('\n')+'\n');
console.log(JSON.stringify({out:o.out,tooling:toolingRelative,runId:o.id,inheritedResults:results.length,pending:pending.length,deadline:run.settings.deadline,newProviderRequests:0}));
