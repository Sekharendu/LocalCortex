import fs from 'node:fs';
import crypto from 'node:crypto';

const BASE='eval/context-budget-k-grid-20261104';
const PRIOR='eval/context-budget-2400-20261104';
const read=f=>JSON.parse(fs.readFileSync(f));
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const norm=x=>x.replace(/\s+/gu,' ').trim();
const readyFile='eval/dev-set-preparation-20261103/ready.jsonl';
const sourceFile='eval/dev-set-preparation-20261103/source-chunks.jsonl';
const rankingFiles=['pdf','docx'].map(f=>`eval/dev-retrieval-20261103/${f}.results.jsonl`);
for(const h of read(PRIOR+'/manifest.json').inputHashes)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('Prior input/app source changed');
const inputFiles=['eval/split.json',readyFile,sourceFile,...rankingFiles,PRIOR+'/case-results.jsonl',PRIOR+'/assembled-prompts.jsonl',
 'src/config.ts','src/rag.ts','src/retrieval/context.ts','src/generation/tokens.ts','src/generation/llm.ts','src/generation/promptBuilder.ts'];
const inputHashes=inputFiles.map(file=>({file,sha256:sha(fs.readFileSync(file))}));
const split=read('eval/split.json'),ready=rows(readyFile).filter(c=>c.status==='ready-long-quote-proxy');
if(ready.length!==119||new Set(ready.map(c=>c.caseId)).size!==119)throw Error('Wrong cohort');
for(const c of ready)if(!split.dev.includes(c.paperId)||split.test.includes(c.paperId))throw Error('Held-out case denied');
const rankings=new Map(rankingFiles.flatMap(rows).filter(r=>r.mode==='hybrid'&&r.requestedK===50).map(r=>[r.caseId,r]));
const assets=new Map(rows(sourceFile).map(a=>[a.documentId,a]));
const priorCases=new Map(rows(PRIOR+'/case-results.jsonl').map(c=>[c.caseId,c]));
const priorPrompts=new Map(rows(PRIOR+'/assembled-prompts.jsonl').filter(p=>p.cap===2400).map(p=>[p.caseId,p]));
Object.assign(process.env,{OLLAMA_NUM_CTX:'4096',ANSWER_RESERVE_TOKENS:'512',WHOLE_DOC_MAX_TOKENS:'1000',
 CONTEXT_TITLE_CHUNK:'1',RERANK_ENABLED:'0',QDRANT_URL:'http://127.0.0.1:1',OLLAMA_URL:'http://127.0.0.1:1'});
const nativeFetch=globalThis.fetch;let blockedNetworkAttempts=0;
globalThis.fetch=async()=>{blockedNetworkAttempts++;throw Error('Offline replay forbids network access');};
const [{selectPassages},{buildPrompt},{RAG_SYSTEM_PROMPT},{countTokens},{contextBudget}]=await Promise.all([
 import('../../src/retrieval/context.ts'),import('../../src/generation/promptBuilder.ts'),import('../../src/generation/llm.ts'),
 import('../../src/generation/tokens.ts'),import('../../src/rag.ts')]);
const variants=[{id:'2400-k15',cap:2400,k:15},{id:'2400-k20',cap:2400,k:20},
 {id:'3200-k15',cap:3200,k:15},{id:'3200-k20',cap:3200,k:20}];
const results=[],prompts=[],tokenLog=[];
try{
 for(const [index,c]of ready.entries()){
  const row=rankings.get(c.caseId),asset=assets.get(c.documentId);
  if(!row||!asset||row.question!==c.question||row.chunks.some(p=>p.documentId!==c.documentId))throw Error('Case/source identity mismatch');
  const chunks=asset.chunks.map(p=>({...p,source:row.chunks[0]?.source??c.format,documentId:c.documentId}));
  const budget=contextBudget(c.question,[]),arms=[];
  for(const v of variants){
   const hits=row.chunks.slice(0,v.k);
   for(const h of hits)if(!chunks.some(p=>p.chunkIndex===h.chunkIndex&&p.text===h.text))throw Error('Saved hit payload changed');
   const passages=hits.length?selectPassages([{chunks,hits}],{
    budgetTokens:budget,wholeMaxTokens:1000,chunkedMaxTokens:v.cap,titleChunk:true}):[];
   const references=c.references.filter(r=>c.scoringReferenceIndices.includes(r.referenceIndex)).map(ref=>({referenceIndex:ref.referenceIndex,
    items:ref.items.map(i=>({quote:i.text,present:passages.some(p=>norm(p.text).includes(i.normalized))}))}));
   const covered=references.some(r=>r.items.length&&r.items.every(i=>i.present));
   const prompt=buildPrompt(c.question,passages,[]),promptSha256=sha(prompt);
   const systemTokens=countTokens(RAG_SYSTEM_PROMPT),userPromptTokens=countTokens(prompt);
   const totalPromptTokens=systemTokens+userPromptTokens+32,totalWithReserve=totalPromptTokens+512;
   const contextTokens=countTokens(passages.map(p=>p.text).join('\n\n---\n\n'));
   const token={caseId:c.caseId,variant:v.id,cap:v.cap,k:v.k,availableHits:hits.length,
    availableContextTokens:budget,effectivePerDocumentLimit:Math.min(v.cap,budget),
    clippedByOverallBudget:budget<v.cap,systemTokens,userPromptTokens,historyTokens:0,
    templateOverheadTokens:32,totalPromptTokens,answerReserveTokens:512,totalWithReserve,
    spareTokens:4096-totalWithReserve,within4096WithReserve:totalWithReserve<=4096,contextTokens};
   tokenLog.push(token);arms.push({...v,covered,references,passageCount:passages.length,promptSha256});
   prompts.push({caseId:c.caseId,paperId:c.paperId,variant:v.id,question:c.question,system:RAG_SYSTEM_PROMPT,
    history:[],prompt,passages,token});
   if(v.id==='2400-k15'){
    const old=priorCases.get(c.caseId)?.arms.find(a=>a.cap===2400),oldPrompt=priorPrompts.get(c.caseId);
    if(!old||old.covered!==covered||oldPrompt.prompt!==prompt||JSON.stringify(oldPrompt.passages)!==JSON.stringify(passages))throw Error('Baseline does not reproduce prior prompts/context');
   }
  }
  const baseline=arms[0];
  const changes=arms.map(a=>({variant:a.id,change:baseline.covered===a.covered?(a.covered?'both-covered':'neither-covered'):(a.covered?'gained':'lost')}));
  results.push({caseId:c.caseId,paperId:c.paperId,format:c.format,question:c.question,previousVerdict:c.verdict,arms,changes});
  if((index+1)%10===0)console.log(JSON.stringify({completedCases:index+1,cases:119,variants:4}));
 }
 for(const h of inputHashes)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('Input/app file changed');
 const summaryVariants=variants.map(v=>{
  const records=results.map(r=>({r,arm:r.arms.find(a=>a.id===v.id),change:r.changes.find(a=>a.variant===v.id).change}));
  const tokens=tokenLog.filter(t=>t.variant===v.id);
  const gained=records.filter(r=>r.change==='gained'),lost=records.filter(r=>r.change==='lost');
  return{...v,cases:119,covered:records.filter(r=>r.arm.covered).length,
   coveragePercent:100*records.filter(r=>r.arm.covered).length/119,
   gained:gained.length,lost:lost.length,net:gained.length-lost.length,
   bothCovered:records.filter(r=>r.change==='both-covered').length,neitherCovered:records.filter(r=>r.change==='neither-covered').length,
   gainedCaseIds:gained.map(x=>x.r.caseId),lostCaseIds:lost.map(x=>x.r.caseId),
   minTotalPromptTokens:Math.min(...tokens.map(t=>t.totalPromptTokens)),maxTotalPromptTokens:Math.max(...tokens.map(t=>t.totalPromptTokens)),
   maxTotalWithReserve:Math.max(...tokens.map(t=>t.totalWithReserve)),minSpareTokens:Math.min(...tokens.map(t=>t.spareTokens)),
   budgetViolations:tokens.filter(t=>!t.within4096WithReserve).length,
   clippedByOverallBudgetCases:tokens.filter(t=>t.clippedByOverallBudget&&t.availableHits>0).length,
   minEffectivePerDocumentLimit:Math.min(...tokens.map(t=>t.effectivePerDocumentLimit)),
   maxEffectivePerDocumentLimit:Math.max(...tokens.map(t=>t.effectivePerDocumentLimit))};
 });
 if(summaryVariants[0].covered!==98)throw Error('Baseline98/119 mismatch');
 const flips=summaryVariants.map(v=>({variant:v.id,gained:results.filter(r=>v.gainedCaseIds.includes(r.caseId)),lost:results.filter(r=>v.lostCaseIds.includes(r.caseId))}));
 const summary={cases:119,mode:'hybrid',baseline:'2400-k15',variants:summaryVariants,
  baselineContextsAndPromptsExactlyReproduced:119,tokenRequestsChecked:476,allWithin4096With512Reserve:tokenLog.every(t=>t.within4096WithReserve),
  blockedNetworkAttempts,retrievalCalls:0,generationCalls:0,networkCalls:0,changedAppFiles:[],
  metric:'All reference quotes of at least one eligible alternative in FINAL assembled passages. Not generated-answer accuracy or full evidence-paragraph recall.',
  conditions:'Same119longer-quote dev cases; same selected paper; saved hybrid k50rankings sliced to15or20; existing builder/budget functions unchanged; no history.',
  tokenCounting:'Existing llama3-tokenizer-js and32-token template estimate; not provider-exact Qwen accounting.'};
 const save=(name,value)=>fs.writeFileSync(`${BASE}/${name}`,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 save('manifest.json',{snapshot:'CONTEXT-CAP-K-GRID-20261104',inputHashes,variants,
  fixed:{numCtx:4096,answerReserveTokens:512,wholeMaxTokens:1000,titleChunk:true,history:[],mode:'hybrid'},
  builder:'src/retrieval/context.ts::selectPassages',budget:'src/rag.ts::contextBudget',noApplicationSettingChanges:true});
 save('summary.json',summary);save('case-results.jsonl',results.map(r=>JSON.stringify(r)).join('\n')+'\n');
 save('flips.json',flips);save('prompt-token-log.jsonl',tokenLog.map(t=>JSON.stringify(t)).join('\n')+'\n');
 save('assembled-prompts.jsonl',prompts.map(p=>JSON.stringify(p)).join('\n')+'\n');
 let report='# Context budget × retained hits: saved hybrid replay\n\n';
 report+='Same119longer-quote dev cases, same selected paper, existing builder logic, scoring,4096overall estimate and512answer reserve. Only the requested caps2400/3200and hit counts15/20differ. No searches, generation, hosted calls, ingestion or application changes. The saved k50ranking is sliced; this is not a fresh independent retrieve(k15/k20) run.\n\n';
 report+='## Coverage and flips versus2400/k15\n\n| Context cap | k | Covered | Coverage | Gained | Lost | Net |\n|---|---:|---:|---:|---:|---:|---:|\n';
 for(const v of summaryVariants)report+=`|${v.cap}|${v.k}|${v.covered}/119|${v.coveragePercent.toFixed(1)}%|${v.gained}|${v.lost}|${v.net>=0?'+':''}${v.net}|\n`;
 report+='\nThe2400/k15baseline reproduces all119previous assembled contexts and prompt strings exactly, including98covered cases. Coverage requires every literal quote of one eligible reference answer in the assembled passages; it does not grade generated answers.\n\n';
 for(const f of flips){
  report+=`## ${f.variant}: case flips\n\n**Gained:**\n\n`;
  for(const c of f.gained)report+=`- ${c.caseId}: ${c.question}\n`;
  if(!f.gained.length)report+='None.\n';
  report+='\n**Lost:**\n\n';for(const c of f.lost)report+=`- ${c.caseId}: ${c.question}\n`;if(!f.lost.length)report+='None.\n';report+='\n';
 }
 report+='## Prompt budget checks\n\nAll476assembled prompts were logged. Total prompt includes system, complete built user prompt(instructions/context/question/history), plus the existing32template-token estimate. Each check then adds the unchanged512answer reserve. History is0for these standalone questions.\n\n| Variant | Largest total prompt | Largest prompt plus reserve | Minimum spare below4096 | Violations |\n|---|---:|---:|---:|---:|\n';
 for(const v of summaryVariants)report+=`|${v.id}|${v.maxTotalPromptTokens}|${v.maxTotalWithReserve}|${v.minSpareTokens}|${v.budgetViolations}|\n`;
 report+='\nA3200per-document cap is still limited by the existing overall contextBudget(). Effective limits are recorded per request; raising the cap does not raise4096or reduce the answer reserve. These are the existing application estimates, not exact Qwen provider counts. No answers were generated to test noise or quality.\n\n';
 report+='All per-case retained/missing quotes and passage hashes are in case-results.jsonl; flips.json contains the exact gained/lost cases and all arms; assembled-prompts.jsonl stores the final passages/prompts; prompt-token-log.jsonl contains every token count. Application defaults and prior results remain unchanged.\n';
 report=report.split(/(\b(?:pdf|docx)\/[^\s;,)]+|\b[\w-]+\.(?:jsonl|json))/gu).map((s,i)=>i%2?s:s.replace(/([A-Za-z])([0-9])/gu,'$1 $2').replace(/([0-9%])([A-Za-z])/gu,'$1 $2')).join('');
 save('REPORT.md',report);console.log(JSON.stringify(summary,null,2));
 if(!summary.allWithin4096With512Reserve)process.exitCode=2;
}finally{globalThis.fetch=nativeFetch;}
