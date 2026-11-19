/** Approved FULL2 orchestration; explicit stages, isolated data, no automatic retries. */
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {args,readJson,readLines,append,writeNew,sha,ownedCollection,buildCoverage,frozenConfig,evidenceCoverage,sentenceCoverage,lexicalReferences,DEADLINE,AUTHORIZATION_DATE} from './common.mjs';
import {CallLedger,StopRun} from './ledger.mjs';
import {readFrozenRun,verifyFrozenFiles,applyFrozenEnvironment,assertActualConfig,endpoints,assertOwnedDocker,boundedApiHealth,cloudValidation} from './validation.mjs';
import {exclusions,failureDecision,partialSourceState,safeFailure} from './ingest-policy.mjs';
import {successfulIds,freezeCohort,assertFrozenCohort,ingestionSources} from './cohort.mjs';
const options=args(),stage=options.stage,out=options.out;
if(!['baseline','summary'].includes(stage))throw new StopRun('Hybrid arm only permits answer/summary; no ingestion or legacy preparation');
if(!out||!stage)throw Error('Required --stage prepare|ingest|baseline|summary --out owned-run-directory');
const manifestPath=path.join(out,'run.json');
if(stage==='prepare'){
 if(!options.data||!options.pdf||!options.word||!options.id)throw Error('Prepare requires --data --pdf --word --id');
 if(!/^[a-z0-9-]+$/.test(options.id))throw Error('Unsafe run ID');
 fs.mkdirSync(out,{recursive:true});if(fs.existsSync(manifestPath))throw Error('Existing run is immutable; choose another ID/directory');
 const acquisition=path.join(options.pdf,'acquisition-summary.json');const status=fs.existsSync(acquisition)?readJson(acquisition):null;
 const questions=readLines(path.join(options.data,'annotations/questions.jsonl')),pdf=readLines(path.join(options.pdf,'download-manifest.jsonl'));
 const word=readJson(path.join(options.word,'word-manifest.json')),selection=readJson(path.join(options.word,'word-selection.json'));
 const coverage=buildCoverage(questions,pdf,word,selection.paperIds);
 if(questions.length!==1005||selection.paperIds.length<50)throw Error('Full dataset/Word selection missing');
 const collections={pdf:ownedCollection('eval-qasper-full2-'+options.id+'-pdf'),docx:ownedCollection('eval-qasper-full2-'+options.id+'-docx'),synthetic:ownedCollection('eval-qasper-full2-'+options.id+'-synthetic')};
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(dir+'/'+entry.name):[dir+'/'+entry.name]);
 const appFiles=[...walk('src'),...walk('migrations'),'scripts/migrate.ts','package.json','pnpm-lock.yaml','tsconfig.json','.dockerignore'];
 const sourceHashes=appFiles.map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))}));
 const toolingHashes=fs.readdirSync(path.join(root,'scripts/evaluation')).filter(name=>/\.(mjs|py|md)$/.test(name)).map(name=>({file:'scripts/evaluation/'+name,sha256:sha(fs.readFileSync(path.join(root,'scripts/evaluation',name)))}));
 const inputHashes=[path.join(options.data,'manifest.json'),path.join(options.data,'annotations/questions.jsonl'),path.join(options.pdf,'download-manifest.jsonl'),path.join(options.word,'word-manifest.json'),path.join(options.word,'word-selection.json')].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
 const coverageText=coverage.map(c=>JSON.stringify(c)).join('\n')+'\n';
 const run={coverageSha256:sha(coverageText),id:options.id,createdAt:new Date().toISOString(),dateIST:AUTHORIZATION_DATE,settings:frozenConfig(),collections,sourceData:options.data,pdfAcquisition:options.pdf,wordFixtures:options.word,sourceAcquisitionComplete:status?.accounted===status?.targets&&status?.targets===281,acquisitionStatus:status,coverageRows:coverage.length,pdfQuestions:1005,docxQuestions:coverage.filter(c=>c.format==='docx').length,wordSelection:selection,sourceHashes,toolingHashes,inputHashes,repositoryHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirtyState:execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}).trim(),credentialValuesRecorded:false,baselineQueuePolicy:'interleavedPDF/DOCX by source paper/question; original+adaptedwording saved, oneactualquestion performat'};
 writeNew(path.join(out,'coverage.jsonl'),coverageText);writeNew(manifestPath,run);writeNew(path.join(out,'run.sha256'),sha(fs.readFileSync(manifestPath))+'\n');console.log(JSON.stringify({stage,run:manifestPath,coverage:coverage.length,pdfQuestions:1005,docxQuestions:run.docxQuestions,sourceAcquisitionComplete:run.sourceAcquisitionComplete}));
}else{
 const run=readFrozenRun(out),coverage=readLines(path.join(out,'coverage.jsonl'));const skippedRows=exclusions(run,out),skipped=new Set(skippedRows.map(r=>r.format+'/'+r.paperId));
 if(Date.now()>=Date.parse(DEADLINE)&&stage!=='summary')throw new StopRun('Authorization segment ended');
 if(stage==='summary'){
  const results=readLines(path.join(out,'baseline-results.jsonl')),ingestion=readLines(path.join(out,'ingestion.jsonl'));
  const summary={runId:run.id,pdfDocumentTarget:run.pdfDocumentTarget??281,docxDocumentTarget:run.docxDocumentTarget??50,frozenCohort:fs.existsSync(path.join(out,'pdf-cohort.json'))?readJson(path.join(out,'pdf-cohort.json')):null,baselineId:run.baselineId??run.id,skippedPdfCount:skippedRows.filter(r=>r.format==='pdf').length,skippedQuestionCount:coverage.filter(c=>skipped.has(c.format+'/'+c.paperId)).length,targetQuestionsByFormat:{pdf:708,docx:run.docxQuestions},results:results.length,success:results.filter(r=>r.status==='success').length,errors:results.filter(r=>r.status!=='success').length,coverage:coverage.reduce((a,c)=>(a[c.executionEligibility]=(a[c.executionEligibility]??0)+1,a),{}),ingestionResults:ingestion.filter(r=>r.event==='result').length,semanticReview:'all provisional until independent assessment',completedEvaluation:results.length===871&&results.every(r=>r.status==='success')};writeNew(path.join(out,'summary-'+Date.now()+'.json'),summary);console.log(JSON.stringify(summary));
 }else{
  if(!run.sourceAcquisitionComplete)throw new StopRun('Source acquisition incomplete; finalize a new run snapshot before ingestion/cloud');
  const format=options.format;if(stage==='baseline'&&!format)throw new StopRun('Explicit format required; run pdf then docx sequentially');if(!['pdf','docx'].includes(format))throw Error('Format must bepdf or docx');
  const services=readJson(path.join(out,'services.json')),target=endpoints(run,services,out,format,{api:options.api,qdrant:options.qdrant});
  applyFrozenEnvironment(run);process.env.QDRANT_URL=target.qdrant;process.env.QDRANT_COLLECTION=run.collections[format];
  process.env.DOC_STORE_PATH=path.join(out,format,'documents.json');process.env.SPARSE_STATS_PATH=path.join(out,format,'sparse-stats.json');
  fs.mkdirSync(path.join(out,format),{recursive:true});
  const {app,ROOT}=await import('./bootstrap.mjs');
  verifyFrozenFiles(run,ROOT,out);assertOwnedDocker(run,services,out);const config=await app('src/config.ts');assertActualConfig(run,config);await boundedApiHealth(run,services,out,format);
  const health=await fetch(process.env.QDRANT_URL+'/readyz',{signal:AbortSignal.timeout(5000)});if(!health.ok)throw new StopRun('Isolated Qdrant unavailable');await health.text();
  const ingestionFile=path.join(out,'ingestion.jsonl');
  if(stage==='ingest'){
   const api=new URL(target.api);const prior=readLines(ingestionFile);const attempted=new Set(prior.filter(r=>r.event==='attempt').map(r=>r.format+'/'+r.paperId));
   const sources=ingestionSources(coverage,format,skipped,run.cohortPriorityIds);let successCount=successfulIds(prior,format).length;const documentTarget=format==='pdf'?run.pdfDocumentTarget:run.docxDocumentTarget;let count=0,consecutiveFailures=0;
   for(const source of sources){if(documentTarget&&successCount>=documentTarget)break;const id=format+'/'+source.paperId;if(attempted.has(id))continue;if(Date.now()>=Date.parse(DEADLINE))throw new StopRun('Localdayended');append(ingestionFile,{event:'attempt',format,paperId:source.paperId,file:source.sourceFile,at:new Date().toISOString()});const start=performance.now();let result;
    try{const bytes=fs.readFileSync(source.sourceFile);if(source.sourceSha256&&sha(bytes)!==source.sourceSha256)throw new StopRun('Inputfilechangedafterfreeze');const form=new FormData();form.append('file',new Blob([bytes]),path.basename(source.sourceFile));form.append('strategy','recursive');const response=await fetch(new URL('/ingest',api),{method:'POST',body:form,headers:{'X-Eval-Case-ID':'ingest/'+format+'/'+source.paperId},signal:AbortSignal.timeout(Math.max(1,Math.min(600000,Date.parse(DEADLINE)-Date.now())))});const body=await response.json();result=response.ok?{success:true,...body,httpStatus:response.status,interface:'actualHTTPPOST/ingest'}:{success:false,stage:'http',httpStatus:response.status,error:typeof body.error==='string'?body.error:'uploadfailed',failureStage:typeof body.error==='string'?body.error.match(/stage '([a-z]+)'/)?.[1]??null:null};}catch(failure){result={success:false,stage:'uncaught',error:'ingest failed while sending/reading owned HTTP response',...safeFailure(failure),deadlineReached:Date.now()>=Date.parse(DEADLINE)};}
    append(ingestionFile,{event:'result',format,paperId:source.paperId,ms:performance.now()-start,result,at:new Date().toISOString()});count++;console.log(JSON.stringify({event:'ingest',format,paperId:source.paperId,success:result.success,count,total:sources.length}));
    if(!result.success){consecutiveFailures++;let healthy=false,state=null;try{await boundedApiHealth(run,services,out,format);healthy=true;state=await partialSourceState({qdrant:target.qdrant,collection:run.collections[format],documentStore:process.env.DOC_STORE_PATH,source:path.basename(source.sourceFile)});}catch{}const decision=failureDecision({format,healthy,partialState:state?.hasPartialState,consecutiveFailures,fileSpecific:result.failureStage==='load'||[400,413,415].includes(result.httpStatus)});if(decision!=='skip-pdf')throw new StopRun(decision+'; failed file remains attempted, no automatic retry');const questionIds=coverage.filter(c=>c.format===format&&c.paperId===source.paperId).map(c=>c.caseId);const row={format,paperId:source.paperId,status:'skipped-file-failure',questionIds,questionCount:questionIds.length,at:new Date().toISOString(),reason:'User authorized skipping failing PDFs; owned health ready and no persistent source state confirmed',safeFailure:result,reconciliation:state};append(path.join(out,'ingestion-skips.jsonl'),row);skipped.add(format+'/'+source.paperId);console.log(JSON.stringify({event:'skip-pdf',paperId:source.paperId,questionCount:questionIds.length,totalSkippedPdfs:exclusions(run,out).length}));}else {consecutiveFailures=0;successCount++;}
    if(options.limit&&count>=Number(options.limit))break;
   }
   if(format==='pdf'&&run.pdfDocumentTarget&&successCount===run.pdfDocumentTarget){const cohort=freezeCohort(run,out);console.log(JSON.stringify({event:'cohort-frozen',pdfDocuments:cohort.pdfTarget,pdfQuestions:cohort.selectedPdfQuestionCount,docxQuestions:cohort.selectedDocxQuestionCount,originalCoverage:cohort.originalCoverageRows}));}
  }else if(stage==='baseline'){
   if(options.cloud!=='reviewed-free-today')throw new StopRun('Explicit reviewed free-only cloud gate required');
   cloudValidation({run,root:ROOT,out,services,config});await boundedApiHealth(run,services,out,format==='pdf'?'docx':'pdf');
   const cohort=run.pdfDocumentTarget?assertFrozenCohort(run,out):null,selectedPdfIds=cohort?new Set(cohort.selectedPdfIds):null;
   const ingested=readLines(ingestionFile).filter(r=>r.event==='result'),successful=new Set(ingested.filter(r=>r.result.success).map(r=>r.format+'/'+r.paperId));
   const needed=new Set(coverage.filter(c=>c.executionEligibility==='ready'&&!skipped.has(c.format+'/'+c.paperId)&&(!selectedPdfIds||c.format==='docx'||selectedPdfIds.has(c.paperId))).map(c=>c.format+'/'+c.paperId)),accounted=new Set(ingested.map(r=>r.format+'/'+r.paperId));if(cohort&&(successfulIds(ingested,'pdf').length!==run.pdfDocumentTarget||successfulIds(ingested,'docx').length!==run.docxDocumentTarget))throw new StopRun('All selected200PDF/50DOCX must be successfully indexed before baseline');if([...needed].some(key=>!accounted.has(key)))throw new StopRun('All available papers inbothformatcollections mustfinish indexing first');
   const ledger=new CallLedger(path.join(out,'cloud-ledger.jsonl'),{freePlanConfirmed:true,maxOutstanding:1});
   const {installGuard}=await import('./guard.mjs');const guard=installGuard({root:ROOT,ledger,allowCloud:true,beforeDispatch:()=>cloudValidation({run,root:ROOT,out,services,config})});
   const [{answerQuestion},{isRefusal}]=await Promise.all([app('src/rag.ts'),app('src/generation/refusal.ts')]);if(guard.observerCount()!==1)throw Error('Preparedobservernotinstalled');
   const resultFile=path.join(out,'baseline-results.jsonl'),attemptFile=path.join(out,'baseline-attempts.jsonl');const attempted=new Set(readLines(attemptFile).map(r=>r.caseId));let count=0;
   const driverLock=path.join(out,'answer-driver.lock');const driverFd=fs.openSync(driverLock,'wx');
   try{for(const c of coverage){if(c.format!==format||attempted.has(c.caseId))continue;if((selectedPdfIds&&c.format==='pdf'&&!selectedPdfIds.has(c.paperId))||skipped.has(c.format+'/'+c.paperId)||c.executionEligibility!=='ready'||!successful.has(c.format+'/'+c.paperId))continue;ledger.assertOpen();append(attemptFile,{caseId:c.caseId,at:new Date().toISOString()});const trace={caseId:c.caseId,calls:[],prepared:[]};const start=performance.now();let result,error=null;
    try{result=await guard.scope.run(trace,()=>answerQuestion(c.question,{collection:run.collections[c.format],mode:'hybrid',scoreThreshold:0.63,topK:5}));}catch(failure){error={name:failure.name,message:'Case failed; consult safe callledger and trace'};}
    const prepared=trace.prepared[0]??{chunks:[],passages:[],prompt:null};const row={caseId:c.caseId,paperId:c.paperId,questionId:c.questionId,format:c.format,originalQuestion:c.originalQuestion,actualQuestion:c.question,annotations:c.annotations,status:error?'error':'success',error,totalMs:performance.now()-start,prepared,actualResult:result??null,providerCalls:trace.calls,evidence:evidenceCoverage(prepared.chunks,prepared.passages,c.evidence),sentenceCoverage:sentenceCoverage(prepared.passages,c.evidence),lexicalReferenceDiagnostics:result?lexicalReferences(result.answer,c.references):[],refusalPattern:result?isRefusal(result.answer):null,citationSourceChecks:result?.citations.map(citation=>({...citation,inPrompt:prepared.passages.some(p=>p.source===citation.source),pageVerification:'pending original-PDF page check; DOCXdoesnotrequirePDFpages'}))??[],semanticVerdict:'pending independent review',at:new Date().toISOString()};append(resultFile,row);count++;console.log(JSON.stringify({event:'answer',caseId:c.caseId,status:row.status,completed:count}));ledger.assertOpen();if(options.limit&&count>=Number(options.limit))break;}
   }finally{guard.restore();fs.closeSync(driverFd);fs.unlinkSync(driverLock);}
  }else throw Error('Unknownstage');
 }
}
