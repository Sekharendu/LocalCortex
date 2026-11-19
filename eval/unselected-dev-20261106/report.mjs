import fs from 'node:fs';
const base='eval/unselected-dev-20261106';
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const data=['pdf','docx'].flatMap(f=>rows(`${base}/${f}.results.jsonl`));
const statuses=['pdf','docx'].map(f=>JSON.parse(fs.readFileSync(`${base}/${f}.status.json`)));
if(statuses.some(s=>s.error||s.completedTotal!==s.expected||s.changedInputs.length)||data.length!==610||new Set(data.map(x=>x.caseId)).size!==610)throw Error('Incomplete or inconsistent run');
const old=['pdf','docx'].flatMap(f=>rows(`eval/dev-retrieval-20261103/${f}.results.jsonl`)).filter(r=>r.mode==='hybrid'&&r.requestedK===5);
const oldById=new Map(old.map(r=>[r.caseId,r]));
const complete=(refs,k=Infinity)=>refs.some(r=>r.items.length&&r.items.every(i=>i.rank!==null&&i.rank<=k));
const count=(a,fn)=>a.filter(fn).length;
const pct=(n,d)=>`${n}/${d} (${(100*n/d).toFixed(1)}%)`;
const metrics=a=>({cases:a.length,gateRejected:count(a,r=>r.gateRejected),expectedPaperFirst:count(a,r=>r.correctPaperAt1),expectedPaperWithin15:count(a,r=>r.correctPaperWithin15),expectedPaperInContext:count(a,r=>r.correctPaperInContext)});
const scorable=data.filter(r=>r.score15!==null);
const groups=Object.fromEntries(['ready-long-quote-proxy','ready-short-quote-proxy'].map(group=>{
 const a=scorable.filter(r=>r.score15.group===group);
 return [group,{cases:a.length,selectedPaperK5:count(a,r=>complete(oldById.get(r.caseId).references,5)),noSelectionK5:count(a,r=>r.independentK5.score.complete),
  noSelectionK15:count(a,r=>r.score15.complete),noSelectionFinalContext:count(a,r=>r.scoreContext.complete),gateRejected:count(a,r=>r.gateRejected),
  gainsVsSelectedK5:a.filter(r=>!complete(oldById.get(r.caseId).references,5)&&r.independentK5.score.complete).map(r=>r.caseId),
  lossesVsSelectedK5:a.filter(r=>complete(oldById.get(r.caseId).references,5)&&!r.independentK5.score.complete).map(r=>r.caseId)}];
}));
const preparations=rows('eval/stage2-end-to-end-20261105/preparations.jsonl').filter(r=>r.arm==='new'&&r.cohort!=='offtopic');
const prior=new Map(preparations.map(r=>[r.caseId,r]));
const norm=s=>s.replace(/\s+/gu,' ').trim();
const ready=new Map(rows('eval/dev-set-preparation-20261103/ready.jsonl').map(r=>[r.caseId,r]));
function contextHit(r,passages){const q=ready.get(r.caseId);return q.references.filter(ref=>q.scoringReferenceIndices.includes(ref.referenceIndex)).some(ref=>ref.items.length&&ref.items.every(i=>passages.some(p=>p.documentId===r.targetDocumentId&&norm(p.text).includes(i.normalized))));}
const paired=scorable.filter(r=>prior.has(r.caseId)).map(r=>({caseId:r.caseId,cohort:prior.get(r.caseId).cohort,selectedContext:contextHit(r,prior.get(r.caseId).passages),unselectedContext:r.scoreContext.complete}));
const summary={completedCases:data.length,uniqueQuestions:new Set(data.map(r=>r.caseId.split('/').at(-1))).size,
 overall:metrics(data),byFormat:Object.fromEntries(['pdf','docx'].map(f=>[f,metrics(data.filter(r=>r.format===f))])),
 groups,scorable:scorable.length,notQuoteScorable:data.length-scorable.length,
 contextPaired:{cases:paired.length,selectedHits:count(paired,r=>r.selectedContext),unselectedHits:count(paired,r=>r.unselectedContext),gains:count(paired,r=>!r.selectedContext&&r.unselectedContext),losses:count(paired,r=>r.selectedContext&&!r.unselectedContext)},
 scopes19:metrics(data.filter(r=>r.status==='scope-rejection-control')),
 calls:statuses.reduce((a,s)=>{for(const [k,v]of Object.entries(s.counts))a[k]=(a[k]??0)+v;return a;},{}),
 heldOutPayloadsRead:false,changedInputs:statuses.flatMap(s=>s.changedInputs),generationCalls:0};
fs.writeFileSync(`${base}/summary.json`,JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(`${base}/paired-context.jsonl`,paired.map(r=>JSON.stringify(r)).join('\n')+'\n');
const flips=scorable.map(r=>({caseId:r.caseId,question:r.question,selectedPaperK5:complete(oldById.get(r.caseId).references,5),noSelectionK5:r.independentK5.score.complete})).filter(r=>r.selectedPaperK5!==r.noSelectionK5);
fs.writeFileSync(`${base}/flips-k5.jsonl`,flips.map(r=>JSON.stringify(r)).join('\n')+'\n');
const lines=[
 '# Dev retrieval without selecting the correct paper', '',
 'Completed 6 November 2026. Retrieval and context assembly only; no answer generation or Cloudflare calls. Application code/defaults and split.json were unchanged.', '',
 '## Setup', '',
 'All 610 dev case units were run with their original question, no added title, no selected-paper ID, no history, hybrid RRF, threshold 0.63, nomic search_query prefixes, reranking off, 15 hits, prompt C, 3200 per-document context cap and 5000 total budget. The same application retrieveForQuestion/context/prompt functions were used. The expected paper is read only for scoring, never to construct the query/filter. Independent production k=5 retrieval was also run for all 234 previously quote-scorable cases. Embeddings were reused between depths for the same question; all searches were fresh.', '',
 'Every query and hybrid prefetch used the same fixed development-corpus allowlist for that format. PDF queries searched all 140 dev PDF papers; DOCX queries searched all 33 available dev DOCX assets. Existing format collections were kept separate, as in previous evaluations. This is not a combined PDF+DOCX collection test. No held-out paper payloads or source files were read. Existing sparse statistics/global Qdrant IDF were retained; server-side statistics are not claimed dev-only.', '',
 '## Expected-paper retrieval across all cases', '',
 '| Measurement | Result |','| --- | --- |',
 `| Expected paper supplied the first chunk | ${pct(summary.overall.expectedPaperFirst,610)} |`,
 `| Expected paper appeared within 15 chunks | ${pct(summary.overall.expectedPaperWithin15,610)} |`,
 `| Expected paper appeared in final context | ${pct(summary.overall.expectedPaperInContext,610)} |`,
 `| Relevance gate returned no chunks | ${pct(summary.overall.gateRejected,610)} |`, '',
 'These are source-paper recall measurements, not answer correctness. An answer from another paper can be valid for a broad question. QASPER questions were written in the context of an individual paper; many original questions (e.g. "Which datasets do they use?") lose their referent when submitted alone. We do not classify all non-target-paper results as wrong.', '',
 '## Exact reference-quote coverage', '',
 'A pass requires every quote in one eligible reference alternative, after whitespace normalization, in chunks from the expected paper. No fuzzy/partial matches. This conservative source-specific proxy does not grade meaning, prove complete evidence, or judge answers from other papers. The same 234 frozen quote-scorable cases and reference alternatives as the prior selected-paper retrieval test were used. All 610 were searched; the other 376 are excluded from this quote metric because the earlier preparation did not validate them for this rule (including yes/no, unanswerable, ambiguous, boundary/extraction/reference mapping issues).', '',
 '| Group | Previous: selected paper, k=5 | No paper selection, k=5 | No paper selection, k=15 | No paper selection, final context |',
 '| --- | --- | --- | --- | --- |',
 ...Object.entries(groups).map(([g,m])=>`| ${g.includes('long')?'119 longer-quote cases':'115 short-name/term cases (weaker proxy)'} | ${pct(m.selectedPaperK5,m.cases)} | ${pct(m.noSelectionK5,m.cases)} | ${pct(m.noSelectionK15,m.cases)} | ${pct(m.noSelectionFinalContext,m.cases)} |`), '',
 `On ${paired.length} quote-scorable cases overlapping Stage 2, the exact same k=15/current-builder final-context comparison found ${summary.contextPaired.selectedHits} covered with paper selection versus ${summary.contextPaired.unselectedHits} without: ${summary.contextPaired.gains} gained, ${summary.contextPaired.losses} lost. This is quote coverage, not the Stage 2 blind semantic evidence judgment. Case-level pairing is in paired-context.jsonl.`, '',
 '## Controls and limitations', '',
 `The 19 historical scope-rejection controls were included in the all-dev retrieval run but excluded from quote recall: ${summary.scopes19.gateRejected} relevance-gate rejections; expected paper within 15 in ${summary.scopes19.expectedPaperWithin15}/19. Their old title-wrapper rejection category does not carry over to this original-question, no-selection setup.`, '',
 'No adequate/partial/wrong/refused answer rates are reported, because no answers were generated. Gate rejections are reported as retrieval events, not graded generated refusals. This is a first-turn, no-document-selection retrieval baseline; it does not test clarification dialogues or source-aware synthesis across documents.', '',
 `Network totals: ${summary.calls.embeddingCalls} local embeddings, ${summary.calls.reusedEmbeddings} embedding-response reuses, ${summary.calls.queryCalls} Qdrant query calls, ${summary.calls.scrollCalls} dev-filtered context scrolls, zero hosted/generation calls. Before/after hashes verified all frozen application inputs and split unchanged.`, '',
 'Artifacts: run.mjs, report.mjs, format manifests/status files, format results.jsonl (questions, query traces, retrieved chunks, final passages/prompts and scores), summary.json, flips-k5.jsonl, paired-context.jsonl.',
 ];
fs.writeFileSync(`${base}/REPORT.md`,lines.join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
