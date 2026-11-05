import fs from 'node:fs';
import crypto from 'node:crypto';

const BASE='eval/context-budget-2400-20261104';
const read=f=>JSON.parse(fs.readFileSync(f));
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const normalize=value=>value.replace(/\s+/gu,' ').trim();
const readyFile='eval/dev-set-preparation-20261103/ready.jsonl';
const chunkFile='eval/dev-set-preparation-20261103/source-chunks.jsonl';
const rankingFiles=['pdf','docx'].map(f=>`eval/dev-retrieval-20261103/${f}.results.jsonl`);
const oldReplayFile='eval/depth-and-answer-quality-20261104/coverage-cases.jsonl';
const inputFiles=['eval/split.json',readyFile,chunkFile,...rankingFiles,oldReplayFile,
 'src/config.ts','src/rag.ts','src/retrieval/context.ts','src/generation/tokens.ts',
 'src/generation/llm.ts','src/generation/promptBuilder.ts'];
const inputHashes=inputFiles.map(file=>({file,sha256:sha(fs.readFileSync(file))}));
const split=read('eval/split.json');
if(sha(fs.readFileSync('eval/split.json'))!==read('eval/dev-set-preparation-20261103/summary.json').splitSha256)throw Error('Split changed');
const ready=rows(readyFile).filter(c=>c.status==='ready-long-quote-proxy');
if(ready.length!==119||new Set(ready.map(c=>c.caseId)).size!==119)throw Error('Wrong main cohort');
for(const c of ready)if(!split.dev.includes(c.paperId)||split.test.includes(c.paperId))throw Error('Non-dev case denied');
const ranked=new Map(rankingFiles.flatMap(rows).filter(r=>r.mode==='hybrid'&&r.requestedK===50).map(r=>[r.caseId,r]));
const assets=new Map(rows(chunkFile).map(a=>[a.documentId,a]));
const oldReplay=new Map(rows(oldReplayFile).filter(r=>r.mode==='hybrid'&&r.group==='ready-long-quote-proxy'&&r.k===15).map(r=>[r.caseId,r]));

// Explicit evaluation-only configuration. No .env edits and no live services.
Object.assign(process.env,{OLLAMA_NUM_CTX:'4096',ANSWER_RESERVE_TOKENS:'512',
 WHOLE_DOC_MAX_TOKENS:'1000',CONTEXT_TITLE_CHUNK:'1',RERANK_ENABLED:'0',
 QDRANT_URL:'http://127.0.0.1:1',OLLAMA_URL:'http://127.0.0.1:1'});
const nativeFetch=globalThis.fetch;
let blockedNetworkAttempts=0;
globalThis.fetch=async()=>{blockedNetworkAttempts++;throw Error('Offline replay: all network access blocked');};
const [{selectPassages},{buildPrompt,formatHistory},{RAG_SYSTEM_PROMPT},{countTokens},{contextBudget},{contextConfig}]=await Promise.all([
 import('../../src/retrieval/context.ts'),import('../../src/generation/promptBuilder.ts'),
 import('../../src/generation/llm.ts'),import('../../src/generation/tokens.ts'),
 import('../../src/rag.ts'),import('../../src/config.ts')]);
if(contextConfig.numCtx!==4096||contextConfig.answerReserveTokens!==512)throw Error('Budget settings drifted');
const history=[];
const decisions=[],prompts=[],tokenRows=[];
function coverage(c,passages){
 return c.references.filter(r=>c.scoringReferenceIndices.includes(r.referenceIndex)).map(r=>({
  referenceIndex:r.referenceIndex,items:r.items.map(item=>({quote:item.text,
   present:passages.some(p=>normalize(p.text).includes(item.normalized))}))}));
}
function covered(refs){return refs.some(r=>r.items.length&&r.items.every(i=>i.present));}
let completed=0;
try{
 for(const c of ready){
  const ranking=ranked.get(c.caseId),asset=assets.get(c.documentId);
  if(!ranking||!asset||ranking.question!==c.question||ranking.chunks.some(h=>h.documentId!==c.documentId))throw Error('Ranking/source identity mismatch');
  const hits=ranking.chunks.slice(0,15);
  for(const hit of hits){const source=asset.chunks.find(p=>p.chunkIndex===hit.chunkIndex);if(!source||source.text!==hit.text)throw Error('Saved hit changed');}
  const chunks=asset.chunks.map(p=>({...p,source:hits[0]?.source??c.format,documentId:c.documentId}));
  const availableContextTokens=contextBudget(c.question,history);
  const arms=[];
  for(const cap of[1200,2400]){
   // Same exported builder, same hit array/order and all other options in both arms.
   const passages=hits.length?selectPassages([{chunks,hits}],{
    budgetTokens:availableContextTokens,wholeMaxTokens:1000,chunkedMaxTokens:cap,titleChunk:true}):[];
   const prompt=buildPrompt(c.question,passages,history),refs=coverage(c,passages);
   const contextText=passages.map(p=>p.text).join('\n\n---\n\n');
   const systemTokens=countTokens(RAG_SYSTEM_PROMPT),userPromptTokens=countTokens(prompt);
   const questionTokens=countTokens(c.question),historyTokens=countTokens(formatHistory(history));
   const contextTokens=countTokens(contextText);
   // Exact existing application accounting: system + built user prompt +32 template
   // overhead. Component counts are descriptive; tokenizer boundaries are not additive.
   const templateOverheadTokens=32,promptTokens=systemTokens+userPromptTokens+templateOverheadTokens;
   const reserve=512,totalWithReserve=promptTokens+reserve;
   const tokenRecord={caseId:c.caseId,question:c.question,cap,requestedHits:15,availableHits:hits.length,
    availableContextTokens,systemTokens,userPromptTokens,questionTokens,historyTokens,contextTokens,
    instructionAndUserFormattingResidual:userPromptTokens-questionTokens-historyTokens-contextTokens,
    templateOverheadTokens,totalPromptTokens:promptTokens,answerReserveTokens:reserve,
    totalWithReserve,remainingAfterReserve:4096-totalWithReserve,
    under4096WithReserve:totalWithReserve<4096,within4096WithReserve:totalWithReserve<=4096,
    passageCount:passages.length,promptSha256:sha(prompt),
    tokenizer:'Existing llama3-tokenizer-js/application estimate; not exact hosted Qwen token accounting.'};
   tokenRows.push(tokenRecord);
   arms.push({cap,covered:covered(refs),references:refs,passageCount:passages.length,
    contextTextTokens:contextTokens,promptSha256:sha(prompt)});
   prompts.push({caseId:c.caseId,paperId:c.paperId,cap,question:c.question,history,
    system:RAG_SYSTEM_PROMPT,prompt,passages,tokenRecord});
  }
  if(arms[0].covered!==oldReplay.get(c.caseId)?.productionAssembledCoverage)throw Error('1200 baseline does not reproduce previous replay');
  const change=arms[0].covered===arms[1].covered?(arms[0].covered?'both-covered':'neither-covered'):(arms[1].covered?'gained':'lost');
  decisions.push({caseId:c.caseId,paperId:c.paperId,question:c.question,previousVerdict:c.verdict,
   availableHits:hits.length,hitChunkIndices:hits.map(h=>h.chunkIndex),change,arms});
  completed++;if(completed%10===0)console.log(JSON.stringify({completed,cases:119}));
 }
 for(const h of inputHashes)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('Input changed');
 const baseline=decisions.filter(r=>r.arms[0].covered).length,expanded=decisions.filter(r=>r.arms[1].covered).length;
 if(baseline!==87)throw Error('Expected prior1200 coverage87/119');
 const allFit=tokenRows.every(r=>r.within4096WithReserve),strictFit=tokenRows.every(r=>r.under4096WithReserve);
 const maxRow=tokenRows.filter(r=>r.cap===2400).toSorted((a,b)=>b.totalWithReserve-a.totalWithReserve)[0];
 const sampleIds=[maxRow.caseId,...ready.toSorted((a,b)=>sha('budget42:'+a.caseId).localeCompare(sha('budget42:'+b.caseId))).map(c=>c.caseId).filter(id=>id!==maxRow.caseId).slice(0,9)];
 const sample=sampleIds.flatMap(id=>tokenRows.filter(r=>r.caseId===id));
 const stats=[1200,2400].map(cap=>{const a=tokenRows.filter(r=>r.cap===cap);return{cap,cases:a.length,
  covered:decisions.filter(r=>r.arms.find(a=>a.cap===cap).covered).length,
  minTotalPromptTokens:Math.min(...a.map(r=>r.totalPromptTokens)),maxTotalPromptTokens:Math.max(...a.map(r=>r.totalPromptTokens)),
  minWithReserve:Math.min(...a.map(r=>r.totalWithReserve)),maxWithReserve:Math.max(...a.map(r=>r.totalWithReserve)),
  maxContextTextTokens:Math.max(...a.map(r=>r.contextTokens)),
  allUnder4096WithReserve:a.every(r=>r.under4096WithReserve)};});
 const gains=decisions.filter(r=>r.change==='gained'),losses=decisions.filter(r=>r.change==='lost');
 const summary={cases:119,mode:'hybrid',hitCount:15,baselineCap:1200,expandedCap:2400,
  baselineCovered:baseline,expandedCovered:expanded,baselinePercent:100*baseline/119,expandedPercent:100*expanded/119,
  gained:gains.length,lost:losses.length,bothCovered:decisions.filter(r=>r.change==='both-covered').length,
  neitherCovered:decisions.filter(r=>r.change==='neither-covered').length,
  unchangedBaselineCases:119,tokenAudit:{requestsChecked:tokenRows.length,sampleRequests:sample.length,sampleCases:sampleIds.length,
   reserveTokens:512,appWindow:4096,allFit,allStrictlyUnder:strictFit,stats,maxBudgetCase:maxRow.caseId,
   histories:'All cases are standalone questions, so history is empty and its token contribution is0.',
   counting:'Existing application tokenizer and32-token template estimate; not provider-exact Qwen tokens.'},
  changedApplicationFiles:[],networkCalls:0,blockedNetworkAttempts,retrievalCalls:0,generationCalls:0,
  scope:'Same selected dev paper and saved top50 ranking sliced to15; not a fresh retrieve(k15) search.',
  metric:'All literal reference-answer quotes from at least one eligible alternative in the FINAL assembled passages; not final answer quality or full evidence-paragraph recall.'};
 const save=(f,v)=>fs.writeFileSync(`${BASE}/${f}`,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
 save('manifest.json',{snapshot:'CONTEXT-CAP-1200-VS-2400-20261104',inputHashes,
  onlyTreatmentDifference:'selectPassages chunkedMaxTokens1200 versus2400',
  fixed:{hits:15,numCtx:4096,answerReserve:512,wholeDocMaxTokens:1000,titleChunk:true,history:[]},
  importedBuilder:'src/retrieval/context.ts::selectPassages',importedBudget:'src/rag.ts::contextBudget',
  noApplicationDefaultChange:true});
 save('summary.json',summary);save('case-results.jsonl',decisions.map(r=>JSON.stringify(r)).join('\n')+'\n');
 save('gained-cases.json',gains);save('lost-cases.json',losses);
 save('prompt-token-log.jsonl',tokenRows.map(r=>JSON.stringify(r)).join('\n')+'\n');save('prompt-token-sample.json',sample);
 save('assembled-prompts.jsonl',prompts.map(r=>JSON.stringify(r)).join('\n')+'\n');
 let report='# Fifteen hits:1200 versus2400 context tokens\n\n';
 report+='Offline replay using the exact existing selectPassages() and contextBudget() functions. Every case receives the same first15hits from its saved hybrid top50ranking, same question, same source chunks, no history, same ordering/merging/title/neighbour logic. Only chunkedMaxTokens changes from1200to2400. No application default, source file or saved input was edited.\n\n';
 report+=`## Final assembled-context coverage\n\n| Per-long-document context cap | Covered cases | Coverage |\n|---|---:|---:|\n|1200|${baseline}/119|${(100*baseline/119).toFixed(1)}%|\n|2400|${expanded}/119|${(100*expanded/119).toFixed(1)}%|\n\nGained:${gains.length}. Lost:${losses.length}. Both covered:${summary.bothCovered}. Neither:${summary.neitherCovered}. The1200arm reproduces the previous119case results exactly. Empty retrievals remain misses.\n\n`;
 report+='This is the same complete eligible answer-quote coverage rule as the earlier tests, applied after context selection/merging. It is not a generated-answer quality measurement or full QASPER evidence-paragraph recall.\n\n## Gained cases\n\n';
 for(const r of gains)report+=`- ${r.caseId}: ${r.question}\n`;
 if(!gains.length)report+='None.\n';
 report+='\n## Lost cases\n\n';for(const r of losses)report+=`- ${r.caseId}: ${r.question}\n`;if(!losses.length)report+='None.\n';
 report+='\n## Prompt-token accounting\n\nAll238assembled requests were logged; a20-request sample covers10cases including the largest2400-token-arm prompt. TotalPromptTokens includes the system instructions plus the complete built user prompt (context, instructions/reminder, question and history) plus the unchanged32-token template estimate. History is0for these standalone dataset questions. The512-token answer reserve is then added for the4096check. Component counts are descriptive because tokenizer boundary effects are not additive.\n\n';
 for(const s of stats)report+=`- Cap${s.cap}: total prompt tokens${s.minTotalPromptTokens}–${s.maxTotalPromptTokens}; with512reserve${s.minWithReserve}–${s.maxWithReserve}; every request strictly under4096:${s.allUnder4096WithReserve}.\n`;
 report+='\nThese checks use the existing llama3-tokenizer-js accounting and template estimate. They confirm the application budget, not exact hosted Qwen token counts. No provider calls were made to certify provider tokens.\n\n';
 report+='| Sample case | Cap | System | User prompt | History | Template | Total prompt | Answer reserve | Total plus reserve | Spare within4096 |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n';
 for(const r of sample)report+=`|${r.caseId}|${r.cap}|${r.systemTokens}|${r.userPromptTokens}|${r.historyTokens}|${r.templateOverheadTokens}|${r.totalPromptTokens}|${r.answerReserveTokens}|${r.totalWithReserve}|${r.remainingAfterReserve}|\n`;
 report+='\nFull strings and passages:assembled-prompts.jsonl. Per-case retained/missing quotes:case-results.jsonl. Full token log:prompt-token-log.jsonl. Gains/losses:gained-cases.json,lost-cases.json. Sample component details:prompt-token-sample.json.\n\nThe overall4096budget,512reserve,1000whole-document threshold, title chunk,15hit count, scoring, builder and selected-paper setting remain unchanged. Source hashes and split are verified unchanged. No new searches, generation, reranking, ingestion, held-out content or app configuration changes.\n';
 save('REPORT.md',report);
 console.log(JSON.stringify(summary,null,2));
 if(!allFit)process.exitCode=2;
}finally{globalThis.fetch=nativeFetch;}
