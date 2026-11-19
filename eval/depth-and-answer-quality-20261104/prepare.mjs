import fs from 'node:fs';
import crypto from 'node:crypto';
import { buildPrompt } from '../../src/generation/promptBuilder.ts';
import { RAG_SYSTEM_PROMPT } from '../../src/generation/llm.ts';
import { countTokens } from '../../src/generation/tokens.ts';
import { selectPassages } from '../../src/retrieval/context.ts';
const BASE = 'eval/depth-and-answer-quality-20261104';
const read = f => JSON.parse(fs.readFileSync(f));
const lines = f => fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const norm = x => x.replace(/\s+/gu,' ').trim();
const splitFile='eval/split.json', split=read(splitFile);
const readyFile='eval/dev-set-preparation-20261103/ready.jsonl', ready=lines(readyFile);
if(hash(fs.readFileSync(splitFile))!==read('eval/dev-set-preparation-20261103/summary.json').splitSha256)throw Error('Split changed');
for(const c of ready)if(!split.dev.includes(c.paperId)||split.test.includes(c.paperId))throw Error('Held-out case denied');
const files=['pdf','docx'].map(f=>`eval/dev-retrieval-20261103/${f}.results.jsonl`);
const ranked=files.flatMap(lines).filter(r=>r.requestedK===50);
if(ranked.length!==468)throw Error('Expected468 saved pools');
const assetsFile='eval/dev-set-preparation-20261103/source-chunks.jsonl';
const assets=new Map(lines(assetsFile).map(a=>[a.documentId,a]));
const depths=[5,8,10,15,20,50], coverage=[], cases=[];
const refsFor=c=>c.references.filter(r=>c.scoringReferenceIndices.includes(r.referenceIndex));
const covers=(c,chunks)=>refsFor(c).some(r=>r.items.every(i=>chunks.some(p=>norm(p.text).includes(i.normalized))));
const budget=q=>4096-32-countTokens(RAG_SYSTEM_PROMPT)-countTokens(buildPrompt(q,[{text:'',source:'',score:0}]))-512;
for(const row of ranked){
 const c=ready.find(c=>c.caseId===row.caseId);
 if(!c||row.chunks.some(p=>p.documentId!==c.documentId))throw Error('Saved identity mismatch');
 const asset=assets.get(c.documentId);
 if(!asset)throw Error('Dev source unavailable');
 for(const k of depths){
  const hits=row.chunks.slice(0,k), raw=covers(c,hits);
  const measureProduction=c.status==='ready-long-quote-proxy'&&row.mode==='hybrid'&&[5,15].includes(k);
  let passages=[];
  if(measureProduction&&hits.length){
   const chunks=asset.chunks.map(p=>({...p,source:hits[0].source,documentId:c.documentId}));
   passages=selectPassages([{chunks,hits}],{budgetTokens:budget(c.question),wholeMaxTokens:1000,chunkedMaxTokens:1200,titleChunk:true});
  }
  const prompt=buildPrompt(c.question,hits);
  const estimatedPromptAndReserve=measureProduction?countTokens(RAG_SYSTEM_PROMPT)+countTokens(prompt)+32+512:null;
  cases.push({caseId:c.caseId,mode:row.mode,group:c.status,k,rawCoverage:raw,
    productionAssembledCoverage:measureProduction?covers(c,passages):null,rawPromptTokens:measureProduction?countTokens(prompt):null,
    rawEstimatedPromptAndReserve:estimatedPromptAndReserve,rawFitsLegacy4096Budget:measureProduction?estimatedPromptAndReserve<=4096:null,
    productionPromptTokens:measureProduction?countTokens(buildPrompt(c.question,passages)):null,
    requestedChunks:k,availableChunks:hits.length,productionPassages:measureProduction?passages.length:null});
 }
}
for(const group of ['ready-long-quote-proxy','ready-short-quote-proxy'])for(const mode of ['dense','hybrid'])for(const k of depths){
 const rows=cases.filter(r=>r.group===group&&r.mode===mode&&r.k===k);
 coverage.push({group,mode,k,cases:rows.length,rawCovered:rows.filter(r=>r.rawCoverage).length,
  rawPercent:100*rows.filter(r=>r.rawCoverage).length/rows.length,
  productionMeasuredCases:rows.filter(r=>r.productionAssembledCoverage!==null).length,
  productionAssembledCovered:rows.some(r=>r.productionAssembledCoverage!==null)?rows.filter(r=>r.productionAssembledCoverage).length:null,
  overBudget:rows.filter(r=>r.rawFitsLegacy4096Budget===false).length});
}
const main=ready.filter(c=>c.status==='ready-long-quote-proxy');
if(main.length!==119)throw Error('Main denominator changed');
const chosenK=[10,15,20].find(k=>coverage.find(r=>r.group==='ready-long-quote-proxy'&&r.mode==='hybrid'&&r.k===k).rawPercent>=75);
if(chosenK!==15)throw Error('Selected depth differs from preflight');
const sample=[...main.filter(c=>c.verdict==='failed').toSorted((a,b)=>hash('depth42:'+a.caseId).localeCompare(hash('depth42:'+b.caseId))).slice(0,22),
 ...main.filter(c=>c.verdict==='acceptable').toSorted((a,b)=>hash('depth42:'+a.caseId).localeCompare(hash('depth42:'+b.caseId))).slice(0,18)]
 .toSorted((a,b)=>a.caseId.localeCompare(b.caseId));
const requests=[];
for(const [index,c]of sample.entries()){
 const row=ranked.find(r=>r.caseId===c.caseId&&r.mode==='hybrid');
 for(const k of index%2?[15,5]:[5,15]){
  const hits=row.chunks.slice(0,k),prompt=buildPrompt(c.question,hits);
  if(countTokens(RAG_SYSTEM_PROMPT)+countTokens(prompt)+32+512>4096)throw Error('Selected raw context exceeds legacy budget');
  requests.push({caseId:c.caseId,paperId:c.paperId,question:c.question,previousVerdict:c.verdict,k,
   prompt,promptSha256:hash(prompt),chunks:hits,referenceCoverage:covers(c,hits),
   originalReferences:refsFor(c).map(r=>({referenceIndex:r.referenceIndex,original:r.original,items:r.items})),
   emptyContext:hits.length===0});
 }
}
const inputFiles=[splitFile,readyFile,assetsFile,...files,'src/generation/promptBuilder.ts','src/generation/llm.ts','src/generation/tokens.ts','src/retrieval/context.ts'];
const manifest={clientDate:'2026-11-04',splitSha256:hash(fs.readFileSync(splitFile)),inputHashes:inputFiles.map(file=>({file,sha256:hash(fs.readFileSync(file))})),
 model:'@cf/qwen/qwen3-30b-a3b-fp8',mode:'hybrid',selectedPaper:true,reranking:false,chosenK,
 samplePolicy:'40 dev cases,22 previously failed and18 previously acceptable, selected by SHA256(depth42:caseId) independently of retrieval ranks or generation outcomes.',
 cases:40,maximumGenerationAttempts:80,temperature:0,maxOutputTokens:'unchanged provider default',
 answerExperiment:'Controlled direct top5 versus direct top15 using unchanged buildPrompt/system/generate; no neighbour expansion. This is not the current production assembled-context path.',
 productionContextDiagnostic:'Offline selectPassages with current documented4096 window,512 reserve,32 template overhead,1000 whole-doc and1200 chunked-doc token caps, title chunk on.',
 tokenizerLimit:'Legacy llama3 tokenizer is a budget estimate, not exact Qwen provider token accounting.',
 inferenceAuthorization:'User requested saved-ranking depth coverage and final-answer quality at a promising depth. This experiment caps generation at80 total attempts, serial, no retries.',
 noRetrieval:true,testPaperContentRead:false,inputsUnchanged:true};
const save=(f,v)=>fs.writeFileSync(`${BASE}/${f}`,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
save('coverage.json',coverage);save('coverage-cases.jsonl',cases.map(r=>JSON.stringify(r)).join('\n')+'\n');
save('requests.jsonl',requests.map(r=>JSON.stringify(r)).join('\n')+'\n');save('manifest.json',manifest);
console.log(JSON.stringify({chosenK,requests:requests.length,sampleCases:sample.length,coverage:coverage.filter(r=>r.group==='ready-long-quote-proxy')},null,2));
