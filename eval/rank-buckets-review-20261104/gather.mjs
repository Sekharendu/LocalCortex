import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/rank-buckets-review-20261104';
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const read=f=>JSON.parse(fs.readFileSync(f));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const files=['pdf','docx'].map(f=>`eval/dev-retrieval-20261103/${f}.results.jsonl`);
const all=files.flatMap(rows).filter(r=>r.requestedK===50&&r.status==='ready-long-quote-proxy');
const reviewed=rows('eval/depth-and-answer-quality-20261104/reviewed-cases.jsonl');
const reviewedIds=new Set(reviewed.map(r=>r.caseId));
const replayFile='eval/depth-and-answer-quality-20261104/coverage-cases.jsonl',replay=rows(replayFile);
const split=read('eval/split.json');
function completion(r){
 const refs=r.references.filter(a=>a.items.length&&a.items.every(i=>i.rank!==null))
  .map(a=>({referenceIndex:a.referenceIndex,items:a.items,rank:Math.max(...a.items.map(i=>i.rank))})).sort((a,b)=>a.rank-b.rank);
 return refs[0]??null;
}
const cases=all.map(r=>{
 if(!split.dev.includes(r.paperId)||split.test.includes(r.paperId))throw Error('Held-out case denied');
 const c=completion(r),rank=c?.rank??null;
 return{caseId:r.caseId,paperId:r.paperId,mode:r.mode,question:r.question,rank,
  bucket:rank===null?'not-within50':rank<=5?'1-5':rank<=15?'6-15':'16-50',
  gateRejected:r.chunks.length===0,reference:c};
});
const buckets=['dense','hybrid'].map(mode=>{
 const a=cases.filter(r=>r.mode===mode);
 if(a.length!==119)throw Error('Wrong denominator');
 return{mode,cases:a.length,counts:Object.fromEntries(['1-5','6-15','16-50','not-within50'].map(k=>[k,a.filter(r=>r.bucket===k).length])),
  gateRejected:a.filter(r=>r.gateRejected).length};
});
const hybrid=all.filter(r=>r.mode==='hybrid');
const chosen=hybrid.filter(r=>reviewedIds.has(r.caseId)&&completion(r)?.rank>5);
for(const r of hybrid.filter(r=>/Which parallel corpora are used\?|Why are prior knowledge distillation/iu.test(r.question)))
 if(completion(r)?.rank>5&&!chosen.some(a=>a.caseId===r.caseId))chosen.push(r);
if(chosen.length!==15)throw Error('Expected15 previously inspected low-rank cases');
// Visible-pattern synthesis after reading original first results, bottleneck chunks,
// and earlier answer/reranker reviews. These labels are hypotheses, not causal tests.
const patterns=[
 ['fragmentation','Three evaluation datasets appear in different chunks; the full Fisher Phase1 name is on a continued bullet list. The first result discusses ASR training and dataset construction, a related but different role.','Preserve dataset-list continuations; distinguish evaluation data from ASR training data.','The previous five-chunk answer named all three datasets without reproducing the full Phase1 phrase; literal quote completion can be conservative.'],
 ['metric','The top result already explains nouns versus verbs and captures information beyond alignment. The rank16quote describes attention distribution more generally.','Repair semantic/evidence scoring before calling this a retrieval failure.','Five- and15-chunk answers were both judged correct earlier despite the selected long quote not appearing by15.'],
 ['fragmentation','The first hit introduces challenges without enumerating them; separate subsection chunks describe wrong assignments, split words and low coverage at ranks8,4,7.','Keep the relevant subsection cluster or pack a coherent challenges section.','A useful summary can be present before every exact subsection-heading quote.'],
 ['fragmentation','The target three-class list begins with tweets are divided, separated from the preceding dataset explanation. Earlier passages discuss the general topic and related-work categories.','Preserve the dataset paragraph across the chunk boundary and retain it when increasing k.','The old first5assembled-context replay already recovers it;15-hit assembly loses it under the unchanged cap.'],
 ['fragmentation','The two event categories are split across adjacent chunks47and48. Rank1contains PoliticianDeath; its preceding chunk47contains CyberAttack but ranks38.','Prioritize the adjacent paragraph continuation instead of independently ranking its halves.','The15-raw-chunk answer already named both datasets using other mentions; rank38is strict full-quote coverage, not proof the answer was unavailable until38.'],
 ['wording','The question says importance of output words; the mechanism passage discusses importance of input words using contributions, aggregation and softmax. The first hit is background about input-output interpretation.','Test intent-preserving query variants and mechanism-oriented passages; flag the input/output wording mismatch.','Question/reference wording is imperfect, so do not infer one latent model cause.'],
 ['wording','Starting point and dialogue dataset match the seed-data analysis paragraph strongly. The source passage instead says nurse-initiated telephone recordings for heart-failure patients.','Distinguish data origin from seed-sample size; test source/corpus-oriented query variants.','The source passage is understandable and has a Data Preparation heading; it is not simply absent or garbled.'],
 ['wording','The question says vocabulary size; the answer says33,663distinct review keywords. Earlier passages repeat vocabulary while discussing a vocabulary mismatch, not its size.','Test vocabulary/lexicon/keyword terminology and keep the count with its dataset description.','The answer chunk starts as a sentence continuation; wording and context are overlapping issues.'],
 ['wording','The first hit says MLmethods identify argument components but does not name them. The answer is in the definition of the modified Toulmin model in a different section.','Connect task descriptions to model-definition evidence; avoid preferring a question restatement.','The answer chunk itself explicitly lists all five components.'],
 ['topic-over-fact','The first result reports performance on16datasets without naming the collection. The Corpora paragraph names Universal Dependencies and treebanks.','Prefer experimental-dataset statements over results summaries for dataset questions.','Dataset versus corpora/treebanks wording may also matter; the needed paragraph is already coherent.'],
 ['fragmentation','Four baseline definitions span distant sections; B1is rank4, B2rank6, and S1/S2rank3. The first result merely announces comparison with baselines.','Collect complete baseline definitions and join B1/B2adjacent passages before dropping one at a cutoff.','INLINEFORM placeholders are a separate readability limitation, not evidence that ranking caused their creation.'],
 ['topic-over-fact','The first hit repeats experiment with various machine learning methods. The concrete We chose SVMhmm/Structural Support Vector Machines statement ranks28.','Prefer specific method-identification statements over generic experiment summaries; test structural method context.','Terminology mismatch is secondary; the answer-bearing chunk is readable and explicit.'],
 ['topic-over-fact','The first hit is about training models, learning rates and epochs. The preceding Experiments and Results chunk identifies SemEval2010Task8and train/test sizes, but ranks15.','Retain the dataset paragraph next to training details; distinguish data identity from optimization settings.','Existing5-hit neighbour expansion already recovers the strict quote.'],
 ['topic-over-fact','The first hit repeats that prior distillation cannot change vocabulary. The because explanation about shared vocabulary/output space is embedded after parameter-count text at rank15.','Keep the full explanatory paragraph and prefer mechanism evidence for why questions.','The earlier reranker improved this particular explanation, although it worsened the larger test overall.'],
 ['topic-over-fact','The first hit discusses the usefulness of parallel corpora. The Data paragraph names CoNLL2009and Europarl with language pairs at rank11.','Prefer the experimental-data paragraph for which-corpus questions; avoid thematic discussion taking all slots.','The Data paragraph is intact, headed and directly answer-bearing; this is not a missing-text case.'],
];
const evidence=chosen.map((r,i)=>{
 const c=completion(r),[pattern,observation,nextTest,caveat]=patterns[i];
 const current=reviewed.find(a=>a.caseId===r.caseId);
 return{number:i+1,caseId:r.caseId,question:r.question,firstCompleteQuoteRank:c.rank,reference:c,
  primaryVisiblePattern:pattern,observation,nextTest,caveat,
  previousAnswerReview:current??null,
  previousInspection:current?'40-case paired answer review':'earlier reranker inspection and long-quote audit',
  topFive:r.chunks.slice(0,5),bottleneckChunk:r.chunks[c.rank-1],
  requiredMatchingChunks:c.items.map(item=>({quote:item.quote,rank:item.rank,chunk:r.chunks[item.rank-1]})),
  productionStyleReplay:[5,15].map(k=>({k,covered:replay.find(a=>a.caseId===r.caseId&&a.mode==='hybrid'&&a.k===k).productionAssembledCoverage}))};
});
const summary={buckets,reviewedCases:15,samplePolicy:'Reuse13low-hybrid-rank cases from the earlier40-case answer review and2from earlier reranker/long-item inspection. Purposeful history-based sample, not a random sample of all119.',
 sampleBuckets:{'6-15':evidence.filter(r=>r.firstCompleteQuoteRank<=15).length,'16-50':evidence.filter(r=>r.firstCompleteQuoteRank>15).length},
 primaryPatternCounts:Object.fromEntries([...new Set(evidence.map(r=>r.primaryVisiblePattern))].map(k=>[k,evidence.filter(r=>r.primaryVisiblePattern===k).length])),
 alreadyRecoveredByExisting5HitAssembly:evidence.filter(r=>r.productionStyleReplay[0].covered).map(r=>r.number),
 lostBy15HitAssembly:evidence.filter(r=>r.productionStyleReplay[0].covered&&!r.productionStyleReplay[1].covered).map(r=>r.number),
 definition:'Completion rank=min over eligible reference alternatives of max first-hit rank of all required quotes; null if no alternative is complete within50. This is not a semantic first-answer rank.',
 limits:'Visible patterns overlap; primary-label counts describe these15cases only, not demonstrated causes or prevalence across all119. Selected-paper benchmark. No new searches or model calls.'};
const save=(f,v)=>fs.writeFileSync(`${base}/${f}`,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
save('buckets.json',summary);save('case-buckets.jsonl',cases.map(r=>JSON.stringify(r)).join('\n')+'\n');
save('reviewed-evidence.json',evidence);
let report='# Where complete reference coverage first appears: saved-data review\n\n';
report+='No new retrieval, generation, inference, ingestion or application changes. This combines saved rankings with previously inspected cases; the bucket calculation and synthesis are new offline summaries of existing records.\n\n';
report+='## All119cases\n\nFor each valid reference alternative, take the largest first-hit rank among its required quotes; choose the earliest complete alternative. These are raw top50ranking cutoffs, not generated-answer quality or validated evidence-paragraph coverage.\n\n| Earliest complete reference-quote coverage | Dense | Hybrid |\n|---|---:|---:|\n';
for(const k of['1-5','6-15','16-50','not-within50'])report+=`| ${k} | ${buckets[0].counts[k]} | ${buckets[1].counts[k]} |\n`;
report+='\nIn hybrid,57cases are not complete in the first5:30become complete by15,18more by50,and9do not complete within50. Two of the9are existing relevance-gate rejections; the other7lack a complete mapped quote set in the50results. Never means not within the saved50, not absent from the paper or unanswerable.\n\n';
report+='##15previously inspected cases:10from ranks6–15and5from16–50\n\nPrimary visible patterns:5fragmentation/list coverage,5topic statements above specific facts,4wording/task-link mismatch,1clear literal-metric limitation. Labels overlap and are hypotheses about what a fix should address, not proof of the neural ranker cause. This purposeful sample does not estimate how common each cause is in all119.\n\n';
for(const r of evidence){report+=`### ${r.number}. ${r.question}\n\nCase: ${r.caseId}; complete quote coverage at rank${r.firstCompleteQuoteRank}.\n\n**Observed:** ${r.observation}\n\n**Candidate fix to test:** ${r.nextTest}\n\n**Caveat:** ${r.caveat}\n\n**First result:**\n\n> ${r.topFive[0].text.replace(/\n/gu,' ')}\n\n**The chunk completing the reference:**\n\n> ${r.bottleneckChunk.text.replace(/\n/gu,' ')}\n\n`;}
report+='## What the history supports\n\n1. Keep the tested15-chunk direction as a candidate, but inspect the final prompt. Existing neighbour expansion already recovers the complete quote set for4of these15cases. Under the same1200-token cap,15-hit assembly loses it for2of those4. These are not new neighbour features to implement; priority and budget are the relevant things to test.\n2. For list/paragraph cases, test preserving coherent paragraph/list continuations and all requested items, not merely independently ranked sentence fragments.\n3. For thematic versus factual passages, test question-intent-aware selection and structural experiment/data/method context, without using gold answers to rewrite the query.\n4. For terminology mismatches, test bounded meaning-preserving query variants. Do not conclude a new embedding model is necessary from these observations.\n5. Repair gold evidence/semantic scoring: attention is already answered usefully at rank1in one example, and the event-dataset names can be answered before the exact long quote at38. Late literal coverage is not automatically a failure.\n\nThe existing direct5-versus15answer test found20/40versus27/40adequately complete supported answers under strict AI-assisted review, with3borderline15labels. It did not establish that changing only the production k setting fixes these cases. No fixes are applied in this report.\n';
report=report.split(/(\b(?:eval|docs|scripts)\/[^\s;,)]+|\b(?:pdf|docx)\/[^\s;,)]+)/gu).map((s,i)=>i%2?s:s.replace(/([A-Za-z])([0-9])/gu,'$1 $2').replace(/([0-9%])([A-Za-z])/gu,'$1 $2')).join('');
save('REPORT.md',report);
const inputFiles=[...files,'eval/split.json','eval/depth-and-answer-quality-20261104/reviewed-cases.jsonl',replayFile];
save('manifest.json',{at:new Date().toISOString(),inputs:inputFiles.map(file=>({file,sha256:hash(fs.readFileSync(file))})),
 retrievalCalls:0,inferenceCalls:0,testPaperContentRead:false});
console.log(JSON.stringify(summary,null,2));
