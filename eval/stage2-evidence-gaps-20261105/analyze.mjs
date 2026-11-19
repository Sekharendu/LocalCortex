import fs from 'node:fs';
import crypto from 'node:crypto';
import {targets} from './targets.mjs';
const base='eval/stage2-evidence-gaps-20261105';
const json=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const save=(f,x)=>fs.writeFileSync(`${base}/${f}`,JSON.stringify(x,null,2)+'\n');
const jsonl=(f,x)=>fs.writeFileSync(`${base}/${f}`,x.map(r=>JSON.stringify(r)).join('\n')+'\n');
const inputs=rows(`${base}/inputs.jsonl`),computed=new Map(rows(`${base}/computed-rankings.jsonl`).map(r=>[r.caseId,r]));
const norm=s=>s.replace(/(\p{L})-\s*\n\s*(\p{L})/gu,'$1$2').replace(/\s+/gu,' ').trim();
Object.assign(process.env,{RAG_PROFILE:'new',ANSWER_RESERVE_TOKENS:'512',RERANK_ENABLED:'0',WHOLE_DOC_MAX_TOKENS:'1000',CONTEXT_TITLE_CHUNK:'1'});
let blockedNetworkAttempts=0;
globalThis.fetch=async()=>{blockedNetworkAttempts++;throw Error('Offline analysis: generation and every network call blocked');};
const [{selectPassages,mergeChunkTexts},{contextBudget},{countTokens}]=await Promise.all([import('../../src/retrieval/context.ts'),import('../../src/rag.ts'),import('../../src/generation/tokens.ts')]);
for(const h of json(`${base}/input-manifest.json`).files)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('Protected input changed '+h.file);
const invalid=[],out=[];
for(const r of inputs){
 const t=targets[r.blindId];if(!t)throw Error('Unreviewed case '+r.blindId);
 const p=r.preparation,hits=p.chunks,byIndex=new Map(r.sourceAsset.chunks.map(c=>[c.chunkIndex,c]));
 const pool=r.ranking50??computed.get(r.caseId)??null;
 const poolChunks=pool?.chunks??[];
 const units=t.units.map(u=>({label:u.label,alternatives:u.alternatives.map(a=>{
  const c=byIndex.get(a.index);if(!c)throw Error('Unknown source chunk');
  const text=norm(c.text);for(const q of a.quotes)if(!text.includes(q))invalid.push({id:r.blindId,index:a.index,quote:q,text});
  const occurrences=r.sourceAsset.chunks.filter(c=>a.quotes.every(q=>norm(c.text).includes(q))).map(c=>c.chunkIndex);
  // All occurrences must be independently equivalent witnesses. For short labels,
  // retain the manually reviewed source occurrence to avoid bibliography false hits.
  return {...a,sourceChunk:{...c},occurrences:[a.index],otherLiteralOccurrences:occurrences};
 })}));
 const textHas=(text,u)=>u.alternatives.some(a=>a.quotes.every(q=>norm(text).includes(q)));
 const textsHave=(texts,u)=>u.alternatives.some(a=>a.quotes.every(q=>texts.some(text=>norm(text).includes(q))));
 const rankFor=(cs,u)=>{const ranks=u.alternatives.map(a=>{const i=cs.findIndex(c=>c.chunkIndex===a.index);return i<0?Infinity:i+1});const k=Math.min(...ranks);return Number.isFinite(k)?k:null;};
 const finalTexts=p.passages.map(c=>c.text),budget=contextBudget(r.question,[],'concise',5000);
 const chunks=r.sourceAsset.chunks.map(c=>({...c,documentId:r.documentId,source:hits[0]?.source??r.format}));
 const replay=cap=>selectPassages(hits.length?[{chunks,hits}]:[],{budgetTokens:budget,wholeMaxTokens:1000,chunkedMaxTokens:cap,titleChunk:true});
 const replay3200=replay(3200);
 if(JSON.stringify(replay3200.map(c=>c.text))!==JSON.stringify(finalTexts))throw Error('Actual Stage2 context replay mismatch '+r.blindId);
 const larger=replay(budget);
 const reach=radius=>{
  const positions=new Set();for(const h of hits)for(let i=Math.max(0,h.chunkIndex-radius);i<=h.chunkIndex+radius;i++)if(byIndex.has(i))positions.add(i);
  return [...positions].sort((a,b)=>a-b).map(i=>byIndex.get(i));
 };
 const unitRows=units.map(u=>({label:u.label,alternatives:u.alternatives,rawTop15Rank:rankFor(hits,u),rank50:rankFor(poolChunks,u),presentInFinalPrompt:textsHave(finalTexts,u),presentWithLargerBudget:textsHave(larger.map(c=>c.text),u),reachableWithinOneNeighbour:textsHave(reach(1).map(c=>c.text),u),reachableWithinTwoNeighbours:textsHave(reach(2).map(c=>c.text),u)}));
 const allFinal=units.length>0&&unitRows.every(u=>u.presentInFinalPrompt),missing=unitRows.filter(u=>!u.presentInFinalPrompt);
 let category,subtype;
 if(r.judgment.gateRejected){category='c';subtype='relevance-gate-short-circuit';}
 else if(t.override==='unresolved-ground-truth'){category='unresolved';subtype='no-verifiable-complete-answer-witness';}
 else if(t.override==='already-in-final-prompt'||allFinal){category='already-present';subtype='earlier-gap-label-not-confirmed';}
 else if(t.override==='c-unavailable-in-index'){category='c';subtype='answer-representation-unavailable-in-index';}
 else if(missing.every(u=>u.rawTop15Rank!==null)){category='a';subtype='actual-retrieved-hit-omitted-by-builder';}
 else if(pool&&missing.every(u=>u.rank50!==null)){
  const last=Math.max(...missing.map(u=>u.rank50));category=last>15?'b':'wider-pool-top15-change';subtype=last>15?'complete-missing-witness-within16-to50':'prefetch-width-changes-first15';
 }else {category='c';subtype='mapped-witness-not-in50';}
 const firstCompleteRank50=units.length&&unitRows.every(u=>u.rank50!==null)?Math.max(...unitRows.map(u=>u.rank50)):null;
 const earliestAdditionalRank50=missing.length&&missing.every(u=>u.rank50!==null)?Math.max(...missing.map(u=>u.rank50)):null;
 const chosen=units.map(u=>u.alternatives[0].index),witnessIndices=[...new Set(chosen)].sort((a,b)=>a-b);
 const witnessText=witnessIndices.length?mergeChunkTexts(witnessIndices.map(i=>byIndex.get(i).text)):'';
 const fullEvidenceWithinLargerBudget=units.length>0&&unitRows.every(u=>u.presentWithLargerBudget);
 const reach1=units.length>0&&unitRows.every(u=>u.reachableWithinOneNeighbour||u.presentInFinalPrompt),reach2=units.length>0&&unitRows.every(u=>u.reachableWithinTwoNeighbours||u.presentInFinalPrompt);
 const top15equal=pool&&poolChunks.length?JSON.stringify(poolChunks.slice(0,15).map(c=>c.chunkIndex))===JSON.stringify(hits.map(c=>c.chunkIndex)):null;
 const record={caseId:r.caseId,blindId:r.blindId,paperId:r.paperId,format:r.format,question:r.question,savedStage2Grade:r.judgment.grade,savedEvidenceJudgment:r.judgment.evidence,gateRejected:r.judgment.gateRejected,category,subtype,
  neededEvidence:{source:'saved',files:['eval/stage2-end-to-end-20261105/judgments.jsonl','eval/stage2-end-to-end-20261105/blind-judgments.jsonl','eval/stage2-end-to-end-20261105/sample.json','eval/dev-set-preparation-20261103/source-chunks.jsonl'],sourceExcerpts:r.judgment.sourceExcerpts,originalAnnotatedSupportingPassages:r.judgment.referenceAnswers.map((a,i)=>({referenceIndex:i,unanswerable:a.unanswerable,evidence:a.evidence,highlightedEvidence:a.highlighted_evidence})),units:unitRows,closestRelatedNotProvenAnswer:(t.closest??[]).map(i=>byIndex.get(i)),unresolvedReason:t.units.length?null:t.note},
  location:{source:pool?.source??'not-computed-unnecessary',file:pool?.file??(computed.has(r.caseId)?`${base}/computed-rankings.jsonl`:null),firstCompleteRank50,rankNeededToSupplyMissingUnits:earliestAdditionalRank50,actualStage2Top15ChunkIndices:hits.map(c=>c.chunkIndex),rank50ChunkIndices:poolChunks.map(c=>c.chunkIndex),first15Of50EqualsStage2:top15equal,k50Prefetch:200,k15Prefetch:60,gateProof:r.judgment.gateRejected?'Dense gate from saved Stage2 run returned no result; it is independent of k and short-circuits every hybrid k. No ungated diagnostic search was run.':null},
  patterns:{source:'computed now — manual review of saved source witnesses, actual top15 and final prompt',labels:t.patterns,note:t.note,qualification:t.qualification??null,topRankedPassage:hits[0]?.text??null},
  offlineCounterfactuals:{source:'computed now — no network; unchanged selectPassages/contextBudget',stage2ReplayExact:true,originalContextCap:3200,largerPerDocumentCap:budget,wholeRequestTotal:5000,largerBudgetSuppliesAllWitnesses:fullEvidenceWithinLargerBudget,newlySuppliesAllWitnesses:!allFinal&&fullEvidenceWithinLargerBudget,currentOneNeighbourCandidateSetContainsAllWitnesses:reach1,twoNeighbourCandidateSetContainsAllWitnesses:reach2,minimalReviewedWitnessChunksTokenUpperBound:countTokens(witnessText)+4*witnessIndices.length,withinCurrent3200IfCorrectWitnessesPrioritized:units.length>0&&countTokens(witnessText)+4*witnessIndices.length<=3200,spanExpansionCaveat:'Reachability/oracle packing is a feasibility diagnostic, not a tested prioritization algorithm or a promise of better generated answers. Existing builder already merges touching chunks and considers one neighbour. App tokenizer is approximate for Qwen; no larger real prompt was sent.'},
  sources:{stage2RetrievalAndContext:'saved — eval/stage2-end-to-end-20261105/preparations.jsonl',neededPassageText:'saved — dev source snapshot; aligned to saved reference evidence by this new manual review',retrievalTo50:pool?.source==='computed now'?'computed now — four explicitly selected queries':pool?'saved — '+(pool.file??'saved gate result'):'not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence',classification:'computed now — offline witness/location comparison',patterns:'computed now — reviewed source text; hypotheses about ranking mechanism, not proven neural causes'}};
 out.push(record);
}
if(invalid.length){save('invalid-witness-anchors.json',invalid);throw Error(`Invalid source anchors: ${invalid.length}; inspect new artifact before classifying`);}
jsonl('cases.jsonl',out);
const counts=field=>Object.fromEntries([...new Set(out.map(field))].map(k=>[k,out.filter(r=>field(r)===k).length]));
const patternLabels=['split_across_chunks','table_or_figure','different_wording','generic_outranks_specific'];
const summary={cases:out.length,categories:{a:0,b:0,c:0,...counts(r=>r.category)},subtypes:counts(r=>r.subtype),patterns:Object.fromEntries(patternLabels.map(p=>[p,out.filter(r=>r.patterns.labels.includes(p)).length])),conditionalWitnessCases:out.filter(r=>r.patterns.qualification).map(r=>r.blindId),actualStage2ContextReplaysMatched:out.filter(r=>r.offlineCounterfactuals.stage2ReplayExact).length,
 largerBudgetNewlySupplies:out.filter(r=>r.offlineCounterfactuals.newlySuppliesAllWitnesses&&['a','b','c'].includes(r.category)).map(r=>r.blindId),
 currentNeighbourSetCanSupply:out.filter(r=>['a','b','c'].includes(r.category)&&!r.gateRejected&&r.offlineCounterfactuals.currentOneNeighbourCandidateSetContainsAllWitnesses).map(r=>r.blindId),
 twoNeighbourSetCanSupply:out.filter(r=>['a','b','c'].includes(r.category)&&!r.gateRejected&&r.offlineCounterfactuals.twoNeighbourCandidateSetContainsAllWitnesses).map(r=>r.blindId),
 first15RankDifferences:out.filter(r=>r.location.first15Of50EqualsStage2===false).map(r=>r.blindId),
 compute:json(`${base}/network-audit.json`),blockedOfflineNetworkAttempts:blockedNetworkAttempts,
 sourceIntegrity:json(`${base}/input-manifest.json`).files.every(h=>sha(fs.readFileSync(h.file))===h.sha256)};
save('summary.json',summary);console.log(JSON.stringify(summary,null,2));
