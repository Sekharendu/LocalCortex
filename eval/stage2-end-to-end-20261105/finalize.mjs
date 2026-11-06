import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/stage2-end-to-end-20261105';
const read=f=>JSON.parse(fs.readFileSync(`${base}/${f}`,'utf8'));
const rows=f=>fs.readFileSync(`${base}/${f}`,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const write=(f,x)=>fs.writeFileSync(`${base}/${f}`,JSON.stringify(x,null,2)+'\n');
const jsonl=(f,x)=>fs.writeFileSync(`${base}/${f}`,x.map(r=>JSON.stringify(r)).join('\n')+'\n');
const summary=read('summary.json'),rs=rows('judgments.jsonl'),ps=rows('paired.jsonl'),preps=rows('preparations.jsonl'),raw=rows('results.jsonl').filter(r=>r.success),sample=read('sample.json');
const contexts=new Map(rows('blind-contexts.jsonl').map(r=>[r.blindId,r]));
const pct=(n,d)=>`${(100*n/d).toFixed(1)}%`;
const num=(n,d=2)=>Number(n).toFixed(d);
const md=s=>String(s).replaceAll('|','\\|').replace(/\r?\n/gu,' ');
const table=(headers,items)=>[headers.join(' | '),headers.map(()=>'---').join(' | '),...items.map(row=>row.map(md).join(' | '))].map(l=>'| '+l+' |').join('\n');
const b=r=>`**${r.blindId}** \`${r.caseId}\` — ${r.question}`;
const claims=[];
for(const r of rs.filter(r=>r.arm==='new')){
 let sentences=r.absenceClaims;
 if(r.blindId==='R283')sentences=[...sentences,'It also refers to an improved version of the micropost classification model, denoted as pθ(t) (y|x), but does not specify the exact type of classifier beyond that.'];
 if(r.blindId==='R545')sentences=[...sentences,'The text mentions that the annotation of a separate training corpus for every target word demands a considerable amount of human labour, but it does not mention the use of a crowdsourcing platform.'];
 for(const sentence of sentences){
  let verdict,reason;
  const canonical=/^The provided context is insufficient|^I could not find/iu.test(sentence);
  if(r.blindId==='R027'){verdict='true';reason='No crowd platform is mentioned. This establishes lack of mention, not proof that no platform was used; the answer qualifies its opening no.';}
  else if(r.blindId==='R037'){verdict='borderline';reason='Qualitative modality-attention examples are present, but the narrower image-region/word inspection is not explicit. A qualified partial answer was possible.';}
  else if(r.blindId==='R107'){verdict='true';reason='The target stylistic-feature inventory is not listed.';}
  else if(r.blindId==='R195'){verdict='true';reason='The passage itself says the exact physical attribute meant by fast is unknown.';}
  else if(r.blindId==='R283'){verdict='true';reason='The supplied text gives a generic discriminative/probabilistic model, not the named LR/MLP experimental classifier list.';}
  else if(r.blindId==='R490'){verdict='false';reason='Table3 and the accompanying paragraph directly compare RoBERT and ToBERT; the rest of this very answer reports that comparison correctly.';}
  else if(r.blindId==='R531'){verdict='borderline';reason='English/Simple-English resource discussion provides a useful clue, but the supplied passage does not explicitly label the target corpus language. Paper-wide absence cannot be established from retrieved excerpts.';}
  else if(r.blindId==='R532'){verdict='true';reason='The requested PARENT ngram orders are absent from these passages.';}
  else if(r.blindId==='R545'){verdict='true';reason='There is no crowd-platform mention. The separate categorical assertion that no platform was used is unsupported and was graded wrong.';}
  else if(r.evidence==='complete'){verdict='false';reason=r.reason;}
  else if(r.evidence==='partial'){verdict='true-for-completeness-only';reason='A full answer is not supported, but some relevant evidence is present. Variant C should give the supported part rather than a pure refusal. '+r.reason;}
  else {verdict='true';reason=r.reason;}
  claims.push({blindId:r.blindId,caseId:r.caseId,cohort:r.cohort,question:r.question,sentence,kind:canonical?'canonical-refusal':'other-absence-claim',verdict,reason,sourceExcerpts:r.sourceExcerpts,actualPassagesFile:'blind-contexts.jsonl',borderline:/borderline/iu.test(r.reason)||['R037','R531'].includes(r.blindId)});
 }
}
jsonl('absence-claims.jsonl',claims);
const grouped=xs=>Object.fromEntries([...new Set(xs.map(x=>x.verdict))].map(v=>[v,xs.filter(x=>x.verdict===v).length]));
summary.absenceAudit={answersWithClaims:new Set(claims.map(x=>x.blindId)).size,sentences:claims.length,verdicts:grouped(claims),byCohort:Object.fromEntries(['dev200','earlier40','offtopic'].map(c=>[c,grouped(claims.filter(x=>x.cohort===c))])),falseClaims:claims.filter(c=>c.verdict==='false').map(c=>c.blindId)};
const refusalTransitions=ps.filter(p=>p.old==='refused'&&p.new!=='refused').map(p=>{
 const r=rs.find(r=>r.blindId===p.newBlindId),unsupported=r.grade==='wrong';
 return {...p,newAnswer:r.answer,supportAudit:unsupported?'unsupported-or-misapplied-content':'supported-substantive-content',supportReason:r.reason,sourceExcerpts:r.sourceExcerpts};
});jsonl('refused-to-answered-audit.jsonl',refusalTransitions);
summary.refusalTransitions={n:refusalTransitions.length,unsupported:refusalTransitions.filter(r=>r.supportAudit==='unsupported-or-misapplied-content').length};
const manifest=read('sample-audit.json');
const scoped=preps.filter(p=>p.cohort!=='offtopic');
const approvedDocs=new Map(sample.map(s=>[s.caseId,s.documentId]));
let networkFilterViolations=0,embeddingViolations=0,contextViolations=0;
for(const p of preps){
 if(p.trace.embeddingCalls!==1)embeddingViolations++;
 for(const q of p.trace.qdrantRequests)for(const part of [q,...(q.prefetch??[])]){
  const f=part.filter?.must?.find(c=>c.key==='documentId');
  if(!f||JSON.stringify(f.match?.any??[f.match?.value])!==JSON.stringify([p.documentId]))networkFilterViolations++;
 }
 if(p.cohort!=='offtopic'&&p.documentId!==approvedDocs.get(p.caseId))contextViolations++;
 for(const c of [...p.chunks,...p.passages])if(c.documentId!==p.documentId)contextViolations++;
}
summary.audit.networkFilterViolations=networkFilterViolations;summary.audit.embeddingViolations=embeddingViolations;summary.audit.contextViolations=contextViolations;
summary.audit.preparationCount=preps.length;summary.audit.freshEmbeddingCalls=preps.reduce((n,p)=>n+p.trace.embeddingCalls,0);
summary.audit.retrievalErrorsFilePresent=fs.existsSync(`${base}/retrieval-errors.jsonl`);
summary.audit.generationRequestGuard='worker.mjs rejects every request unless raw=true, stream=false, max_tokens=512, temperature=0 and model URL matches Qwen3-30b-a3b-fp8';
summary.audit.sample=manifest;
summary.audit.newPromptForbiddenPhraseInSourceContent=[];
summary.audit.newPromptForbiddenPhrase=[];
for(const p of preps.filter(p=>p.arm==='new')){
 const full=p.system+'\n'+p.prompt;
 let instructions=p.prompt;
 for(const passage of p.passages)instructions=instructions.replace(passage.text,'');
 instructions=instructions.replace(p.question,'');
 if(/enough information|\bfully\b/iu.test(p.system+'\n'+instructions))summary.audit.newPromptForbiddenPhrase.push(p.callId);
 else if(/enough information|\bfully\b/iu.test(full))summary.audit.newPromptForbiddenPhraseInSourceContent.push(p.callId);
}
summary.unambiguousAnswerable={};
for(const arm of ['old','new']){const x=rs.filter(r=>r.cohort==='dev200'&&r.arm===arm&&r.answerability==='answerable');summary.unambiguousAnswerable[arm]={n:x.length,...Object.fromEntries(['adequate','partial','wrong','refused'].map(g=>[g,x.filter(r=>r.grade===g).length]))};}
for(const r of rs){r.originalQuestionId=r.caseId.split('/').at(-1);}
jsonl('judgments.jsonl',rs);
write('summary.json',summary);
fs.mkdirSync(`${base}/prompt-examples`,{recursive:true});
for(const arm of ['old','new']){const r=raw.find(r=>r.cohort==='dev200'&&r.arm===arm),p=preps.findLast(p=>p.callId===r.callId&&p.promptSha256===r.promptSha256);fs.writeFileSync(`${base}/prompt-examples/${arm}.json`,JSON.stringify({callId:r.callId,system:p.system,user:p.prompt,wirePrompt:r.wirePrompt,settings:p.settings,max_tokens:512,temperature:0,model:'@cf/qwen/qwen3-30b-a3b-fp8'},null,2)+'\n');}
const lines=[];
lines.push('# Stage2 end-to-end old versus new defaults\n');
lines.push('Completed 5 November 2026. All558 planned responses collected:400 for the new200dev cases,80 for the earlier40cases,78 for39off-topic questions. Five transient transport failures were retried successfully. No held-out research-document payloads were fetched. No push or deployment was performed.\n');
lines.push('The new configuration produced33more complete answers on the200newdev cases (83→116), but wrong answers rose12→14. It improves usefulness and evidence delivery; it does not establish fully reliable answering. It also cost about twice as many Neurons per new-dev request.\n');
lines.push('## Setup and what this comparison establishes\n');
lines.push(table(['Setting','Old','New'],[['System/template','Strict production A','Concise partial-support C'],['Context allowance','1200 builder tokens','3200 builder tokens'],['Total budget','4096','5000'],['Retrieval hits','5','15'],['Output max_tokens','512 explicit','512 explicit'],['Generation model','Qwen3-30b-a3b-fp8','Same'],['Temperature','0','0'],['Retrieval','Fresh hybrid RRF; reranking off','Same'],['Question/scope','Original question, selected dev paper','Same']]));
lines.push('\nBoth arms ran retrieveForQuestion followed by generate, the same shared preparation and generation functions used by the application orchestrator. This is a function-level end-to-end application-path test, not an HTTP/UI/load test. Each arm freshly embedded and retrieved each question, ran the0.63dense relevance probe, assembled its own context with the existing builder, built its own prompt, and generated an answer. Rankings were not replayed. The input was the original question with ordinary acronym expansion and nomic search_query prefix, with no title wrapper. The selected-paper scope is deliberate for this benchmark; these results do not measure automatic document selection across the entire corpus.\n');
lines.push('The sample was frozen before generation. Seed42stratification targets the556eligibledev units after excluding all earlier-question IDs:92previously failed,65acceptable,43ambiguous;164PDF,36DOCX. The200case units contain188unique questions. Earlier40contain38unique questions, with no original-question overlap with the new sample. PDF/DOCX duplicates are not independent observations. The existing split stayed byte-identical. The60held-out papers/261cases were not used for generation, grading, retrieval payloads or corpus inspection. Qdrant queries/scrolls and every prefetch carried the chosen dev document filter; server-side index/global-IDF internals are not claimed to be dev-only.\n');
lines.push('This tests the whole new package, not the isolated contribution of prompt C, hits15or the3200allowance. The builder uses the existing local tokenizer; observed API input tokens use the provider tokenizer and include instructions/question/template. Different token counts do not imply a changed builder.\n');
lines.push('## 1. Answer outcomes\n');
for(const cohort of ['dev200','earlier40']){
 const n=summary.cohorts[cohort].old.n;
 lines.push(`### ${cohort==='dev200'?'New200dev cases':'Earlier40prompt-selection cases, reported separately'}\n`);
 lines.push(table(['Outcome',`Old (${n})`,`New (${n})`],['adequate','partial','wrong','refused'].map(g=>{const a=summary.cohorts[cohort].old.outcomes[g],b=summary.cohorts[cohort].new.outcomes[g];return[g,`${a.count} (${num(a.percent,1)}%)`,`${b.count} (${num(b.percent,1)}%)`]})));
}
lines.push('\nAdequate means the core question is completely answered with supported material facts. Partial means useful correct content but a material part missing. Wrong includes materially unsupported additions or answering about a related-work system instead of the target. Refused means no substantive answer. Gate-zero cases count as refusals. Judgments are shuffled, arm-label-hidden AI semantic reading, not independent human certification or keyword-only scoring; focused source excerpts and full actual prompts/passages are retained. All558judgments were frozen and hashed before opening the decode key.\n');
lines.push('Reference caveat:170of200cases have consistently answerable annotations,22have mixed answerability, and8are labelled unanswerable by every annotator. Some of those labels contradict clearly supplied paper text. The primary semantic grade follows the question and actual source, accepts a complete legitimate reference alternative, and flags disagreements rather than forcing unsupported refusals. Therefore it is not a strict automated QASPER score. On the170consistently answerable cases alone:\n');
lines.push(table(['Outcome','Old /170','New /170'],['adequate','partial','wrong','refused'].map(g=>[g,`${summary.unambiguousAnswerable.old[g]} (${pct(summary.unambiguousAnswerable.old[g],170)})`,`${summary.unambiguousAnswerable.new[g]} (${pct(summary.unambiguousAnswerable.new[g],170)})`])));
lines.push('\n## 2. Paired changes\n');
lines.push(table(['Group','Improved','Worse','Same score','All category changes'],['dev200','earlier40'].map(c=>[c,summary.paired[c].improved??0,summary.paired[c].worse??0,summary.paired[c].same??0,summary.paired[c].categoryChanges])));
lines.push('\nFrozen scoring is adequate3,partial2,wrong/refused0. Consequently a refusal becoming wrong is a tied score, not a safety success: there are5such regressions in new200and1in earlier40. Every category change, including these ties, appears below and in changed-cases.jsonl. All paired IDs including unchanged ones are in paired.jsonl.\n');
for(const cohort of ['dev200','earlier40']){
 lines.push(`### ${cohort} changed cases\n`);
 for(const p of ps.filter(p=>p.cohort===cohort&&p.categoryChanged))lines.push(`- \`${p.caseId}\` **${p.old} → ${p.new}** (${p.result}${p.safetyChange?'; '+p.safetyChange:''}). ${p.question} — ${p.reason}`);
}
lines.push('\n## 3. Where unsuccessful answers broke\n');
for(const cohort of ['dev200','earlier40']){
 const classify=arm=>{const x=rs.filter(r=>r.cohort===cohort&&r.arm===arm);return[
  x.filter(r=>r.grade!=='adequate'&&['absent','partial'].includes(r.evidence)).length,
  x.filter(r=>r.grade==='refused'&&r.evidence==='complete').length,
  x.filter(r=>r.grade==='wrong'&&r.evidence==='complete').length,
  x.filter(r=>r.grade==='partial'&&r.evidence==='complete').length,
  x.filter(r=>r.grade==='refused'&&r.evidence==='not-applicable').length
 ]};const a=classify('old'),b=classify('new');
 lines.push(`### ${cohort}\n`);lines.push(table(['Boundary','Old','New'],['Needed evidence absent or incomplete; answer unsuccessful','Complete evidence, model refused','Complete evidence, answer wrong','Complete evidence, answer incomplete','Expected refusal for unsupported/unanswerable target'].map((name,i)=>[name,a[i],b[i]])));
}
lines.push('\nThese groups are disjoint and count unsuccessful answers, not all retrieved contexts. Missing evidence is measured in the final assembled prompt, so this category can include retrieval omission, context selection/truncation, or missing extraction; this experiment alone cannot split those earlier boundaries. Complete-evidence coverage in new200was111/200(55.5%) old versus141/200(70.5%) new. Earlier40was32/40versus36/40. Semantic evidence availability is separate from exact-quote coverage. Mixed/uncertain annotation and exclusivity inferences are flagged in borderline.jsonl.\n');
lines.push('### Every refusal despite complete evidence\n');
for(const r of rs.filter(r=>r.grade==='refused'&&r.evidence==='complete'))lines.push(`- ${b(r)} (${r.arm};${r.cohort}). ${r.reason} Answer: ${JSON.stringify(r.answer)}`);
lines.push('\n### Every old-refused → new-substantive answer, individually checked\n');
for(const r of refusalTransitions)lines.push(`- \`${r.caseId}\` **${r.new} / ${r.supportAudit}**. ${r.question} — ${r.supportReason} New answer: ${JSON.stringify(r.newAnswer)}`);
lines.push('\n## 4. Every new-arm absence/insufficiency claim\n');
lines.push(`Audited${claims.length}sentences across${new Set(claims.map(c=>c.blindId)).size}answers, including all canonical refusals and the39off-topic rejections. Verdict counts: ${JSON.stringify(summary.absenceAudit.verdicts)}. A true-for-completeness-only refusal means a full answer is unsupported but useful partial evidence was withheld, contrary to C’s partial-answer instruction. There are10false claims under the primary evidence judgments, including9pure refusals and1false caveat in an otherwise correct answer; one of those refusals relies on an explicitly flagged exclusivity inference. Two further claims are borderline. This is not zero false missing-information claims.\n`);
for(const c of claims)lines.push(`- **${c.blindId} / ${c.verdict}** (${c.cohort}) \`${c.caseId}\`: ${JSON.stringify(c.sentence)} — ${c.reason}`);
lines.push('\nFull text and supporting excerpts are in absence-claims.jsonl. R490’s answer correctly compares the two models but opens by falsely saying no direct comparison is supplied. It remains adequate for task-answer completeness, with a separately flagged false caveat; a stricter no-false-caveat rubric would demote this case. R545’s lack-of-mention statement is true, but its categorical no-use assertion is unsupported and graded wrong.\n');
lines.push('## 5. Relevance-gate rejections\n');
lines.push(table(['Group','Old','New'],['dev200','earlier40','offtopic'].map(c=>[c,summary.cohorts[c].old.gateRejected,summary.cohorts[c].new.gateRejected])));
lines.push('\nGate results were identical per paired case. These are included in the refusal totals, not added to them. Every rejected call is in gate-rejections.jsonl; IDs below list each rejected case once.\n');
for(const c of ['dev200','earlier40','offtopic']){lines.push(`### ${c}\n`);for(const r of rs.filter(r=>r.cohort===c&&r.arm==='old'&&r.gateRejected))lines.push(`- \`${r.caseId}\`: ${r.question}`);}
lines.push('\n## 6. Off-topic questions through real retrieval\n');
lines.push('Old39/39rejected(100%);new39/39rejected(100%). No off-topic question received a substantive answer. In each arm28were rejected by the retrieval gate;11passed the gate and were refused by generation. This used an isolated, freshly ingested20-chunk employee-handbook collection and the39existing negative controls; it did not search held-out research papers or force the whole handbook into every prompt. It measures this negative-control corpus, not universal off-topic safety.\n');
lines.push('## 7. Tokens, latency and Neurons\n');
for(const cohort of ['dev200','earlier40','offtopic','all']){
 const a=summary.cost[cohort].old,b=summary.cost[cohort].new;
 lines.push(`### ${cohort} successful calls (${a.n}per arm); values are mean / maximum\n`);
 lines.push(table(['Metric','Old','New'],[['Input tokens',`${num(a.inputTokens.mean,1)} / ${a.inputTokens.max}`,`${num(b.inputTokens.mean,1)} / ${b.inputTokens.max}`],['Output tokens',`${num(a.outputTokens.mean,1)} / ${a.outputTokens.max}`,`${num(b.outputTokens.mean,1)} / ${b.outputTokens.max}`],['Generation seconds',`${num(a.generationSeconds.mean)} / ${num(a.generationSeconds.max)}`,`${num(b.generationSeconds.mean)} / ${num(b.generationSeconds.max)}`],['Retrieval seconds',`${num(a.retrievalSeconds.mean)} / ${num(a.retrievalSeconds.max)}`,`${num(b.retrievalSeconds.mean)} / ${num(b.retrievalSeconds.max)}`],['End-to-end seconds',`${num(a.endToEndSeconds.mean)} / ${num(a.endToEndSeconds.max)}`,`${num(b.endToEndSeconds.mean)} / ${num(b.endToEndSeconds.max)}`],['Neurons',`${num(a.neurons.mean)} / ${num(a.neurons.max)}`,`${num(b.neurons.mean)} / ${num(b.neurons.max)}`]]));
}
lines.push(`\nTotal reported usage:${num(summary.audit.reportedTotalNeurons)}Neurons across558successful calls, split over allowance windows. Five failed transport attempts returned no usage; their billing is unknown and is excluded from this known total, not assumed free. The50Neuron unknown-attempt reserve used by the worker was a budget-control estimate, not a measured bill. Dashboard balance could not be read. Request/response IDs, sizes, usage, finish reasons and wire prompts are retained in results.jsonl; individual timings include real local retrieval/network variability. Means/maxima above include successful calls only; failed attempt timings remain in results.jsonl.\n`);
lines.push(`All558finish reasons were stop; maximum observed output${summary.audit.maxOutputObserved}tokens, below512. No successful prompt was within5%of its total budget after reserving512answer tokens; none exceeded it. Largest new input4044+512=4556<5000;largest old1745+512=2257<4096. Every request was guarded for max_tokens512,temperature0,raw/nonstreaming Qwen. Budgets include no conversation history in this test.\n`);
lines.push('## 8. Checks and failures\n');
lines.push('- Application tests:199passed,28skipped,0failed. Live model/database probes were disabled for the offline run; localhost HTTP tests enabled. Skips are not passes.\n- Application and test TypeScript checks passed; Docker Compose configuration validation and affected-file whitespace diff check passed.\n- New and legacy profile smoke checks each reproduced79historical prompt/system pairs byte-for-byte.\n- No frozen source/input hash changed during generation. Fresh embedding count563includes five retry preparations. Network filter violations0;embedding-count violations0;returned-context scope violations0.\n- No retrieval-errors artifact; five generation transport failures, all recovered with successful final calls. No output-length finishes.\n- This was not a deployment, Docker rebuild, UI test, concurrency/load test or held-out test evaluation.\n');
lines.push('## 9. Borderline judgments and limitations\n');
for(const r of rs.filter(r=>/borderline/iu.test(r.reason)))lines.push(`- ${b(r)} (${r.arm};${r.grade};evidence ${r.evidence}). ${r.reason}`);
lines.push('\nAll22mixed-answerability case units per arm and other source/reference disagreements are also preserved in borderline.jsonl. Examples include negative annotations versus explicit artifact controls, one-variable-per-language-pair wording versus aligned-argument CLVs, corpus-language exclusivity, acronym-only identifiers, broad versus specific inflection/metaknowledge questions, missing table/formula placeholders, and references that answer a different question. Do not treat these as independent human-validated labels. No held-out cases were opened to resolve them.\n');
lines.push('The combined new defaults are more useful on this dev sample, but unsafe transitions and remaining unsupported answers mean reliability is not solved. The clearest next diagnostic targets are mistaken attribution to related work, list completeness, and refusal despite available tables/figures. Evidence gaps still dominate the remaining unsuccessful new-dev answers(57cases). Keep the held-out set untouched while addressing these dev failures.\n');
lines.push('## Saved artifacts\n');
lines.push('- sample.json / sample-manifest.json / sample-audit.json: frozen case IDs, references, strata and overlap checks.\n- preparations.jsonl: every actual system/user prompt, retrieved chunks, assembled passages, query/filter traces and budget estimates.\n- results.jsonl: every successful answer and failed attempt with provider metadata, usage, wire prompts and timings.\n- blind-review.jsonl / blind-contexts.jsonl / blind-judgments.jsonl / grading-freeze.json: shuffled review inputs and frozen blind grades.\n- judgments.jsonl: decoded grades, evidence status, source excerpts, reference alternatives and reasons.\n- paired.jsonl / changed-cases.jsonl: all comparisons and every category transition.\n- absence-claims.jsonl / refused-to-answered-audit.jsonl / refusal-with-complete-evidence.jsonl: detailed reliability audits.\n- gate-rejections.jsonl / borderline.jsonl / summary.json: gate cases, disputed judgments and machine-readable totals.\n- prompt-examples/old.json / new.json: exact real example prompts plus settings for each arm.\n- validation.json / implementation-snapshot/ / implementation-manifest.json: implementation checks and frozen source revision.\n');
// Improve prose spacing without changing identifiers, filenames or quoted model answers.
const prose=lines.join('\n').split(/(`[^`]*`|"(?:\\.|[^"\\])*"|\bR\d{3}\b|\b(?:F1|F0\.5|ROUGE-\d|ROGUE-\d|DTA18|DTA19|UD1\.2|Qwen3-[\w-]+)\b|[\w./-]+\.(?:jsonl|json|mjs|md|ts)\b)/gu).map((part,i)=>i%2?part:part.replace(/(?<=[A-Za-z])(?=\d)/gu,' ').replace(/(?<=\d)(?=[A-Za-z])/gu,' ')).join('').replace(/([^\n])\n(#{2,3} )/gu,'$1\n\n$2');
fs.writeFileSync(`${base}/REPORT.md`,prose+'\n');
const status={state:'complete',generation:'558/558 successful planned calls',grading:'558 frozen blinded judgments; decoded after freeze',finishedAt:new Date().toISOString(),report:'REPORT.md',knownNeurons:summary.audit.reportedTotalNeurons,unknownUsageFailures:5,noPushOrDeployment:true};
write('RUN_STATUS.json',status);
const progress=read('progress.json');progress.grading='complete';progress.report='REPORT.md';progress.at=status.finishedAt;write('progress.json',progress);
fs.writeFileSync(`${base}/STATUS.md`,'# Completed\n\nGeneration and blinded grading are complete. See [REPORT.md](REPORT.md) and summary.json.\n\n558/558 successful planned calls; 563 attempts; 5 recovered transport failures. Known usage 5747.05 Neurons, plus unknown billing for failed attempts. No push or deployment.\n');
console.log(JSON.stringify({absenceAudit:summary.absenceAudit,refusalTransitions:summary.refusalTransitions,filterViolations:networkFilterViolations,contextViolations,embeddingViolations,forbiddenNewPrompt:summary.audit.newPromptForbiddenPhrase,report:'REPORT.md'},null,2));
