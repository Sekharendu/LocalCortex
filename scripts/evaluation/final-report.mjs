/** Assemble measured results, keeping execution, semantics and limitations separate. */
import fs from 'node:fs';import path from 'node:path';import {args,readJson,readLines,sha} from './common.mjs';
import {readFrozenRun,verifyFrozenFiles} from '../evaluation-resume-20261029-continuation-r2/validation.mjs';
const o=args();if(!o.root||!o.run)throw Error('--root --run required');const b=o.root,run=readFrozenRun(o.run);verifyFrozenFiles(run,process.cwd(),o.run);
const audit=readJson(path.join(b,'qasper-post-baseline-final/audit-summary.json')),semantic=readJson(path.join(b,'qasper-post-baseline/semantic-200-reference-summary.json')),integrity=readJson(path.join(b,'qasper-post-baseline/index-integrity-final.json')),scenario=readJson(path.join(b,'qasper-scenarios-r2/scenario-summary.json')),injections=readJson(path.join(b,'injection-exposure-validation.json')),mocks=readJson(path.join(b,'http-failure-qa-r2/summary.json')),browser=readJson(path.join(b,'browser-qa/browser-summary.json')),stop=readJson(path.join(b,'browser-qa/stop-timing-followup.json')),chains=readJson(path.join(b,'conversation-chain-qa/results.json')),privacy=readJson(path.join(b,'credential-artifact-scan.json')),cleanup=readJson(path.join(b,'cleanup-summary.json')),sustained=readJson(path.join(b,'sustained-use-summary.json')),paired=readJson(path.join(b,'paired-format-comparison.json'));
const ledger=readLines(path.join(b,'qasper-scenarios-r2/cloud-ledger.jsonl')),reserves=ledger.filter(r=>r.event==='reserve'),settlements=ledger.filter(r=>r.event==='settle'),settled=new Set(settlements.map(r=>r.id));if(reserves.some(r=>!settled.has(r.id)))throw Error('Unsettledscenario dispatch');
const results=readLines(path.join(o.run,'baseline-results.jsonl'));if(results.length!==871||new Set(results.map(r=>r.caseId)).size!==871)throw Error('Primarycoverage mismatch');
const supplementary=readLines(path.join(b,'pdf-extra-qa/results.jsonl')),lifecycle=readLines(path.join(b,'lifecycle-qa/results.jsonl')),words=readLines(path.join(b,'word-visual-qa/rendered-manifest.jsonl'));
const report={at:new Date().toISOString(),assessment:'Quality gates not met; engineering and basic safety checks pass, document-answer completeness and conversational scope fail.',evaluationStatus:'Executed baseline and bounded follow-on checks complete; not an officialQASPERscore or fullhuman/all-pagecertification',baseline:{cases:871,uniqueQuestions:708,pdfCases:708,docxCases:163,successfulGenerations:867,errors:4,unattempted:0},referenceReview:semantic,indexIntegrity:integrity,citations:{returned:2601,matchingPromptChunks:2601,initialMergedMetadataFlags:201,flagsExplainedByCrossPageMerges:true,allClaimsSemanticallyVerified:false},scenarioScreens:scenario.byKind,injections:{cases:30,attackExposed:injections.exposed,passed:injections.screenPassedAndExposed},pdfExtraScreens:supplementary.map(r=>({id:r.id,pass:r.pass})),conversationChains:chains.results.map(r=>({id:r.id,pass:r.pass})),lifecycleChecks:lifecycle.map(r=>({id:r.id,pass:r.pass})),providerHttpMocks:mocks,browserChecks:browser.checks,stopTimingFollowup:stop,wordRendering:{files:words.length,pages:words.reduce((n,r)=>n+r.Pages,0),renderer:'MicrosoftWord',allPagesVisuallyInspected:false},privacy,cleanup,sustained,pairedFormats:{pairs:paired.pairs,refusalPatternDisagreements:paired.refusalPatternDisagreement},scenarioProvider:{requests:reserves.length,answers:reserves.filter(r=>r.kind==='answer').length,rewrites:reserves.filter(r=>r.kind==='rewrite').length,settlements:settlements.length,unknownUsage:settlements.filter(r=>r.unknownUsage).length,quotaOrAuthStopEvents:ledger.filter(r=>r.event==='stop').length,reportedUsage:Object.fromEntries(['prompt_tokens','completion_tokens','neurons'].map(k=>[k,settlements.reduce((n,r)=>n+(r.usage?.[k]??0),0)]))},repositoryVerification:{apiTypecheck:'passed',testTypecheck:'passed',webTypecheck:'passed',webBuild:'passed',offlineTests:{passed:135,skipped:28,failed:0},evaluationGuardTests:{passed:26,failed:0},newEvaluationModuleSyntax:'passed'},unchangedBaselineSourceVerified:true,sourceResultsSha256:sha(fs.readFileSync(path.join(o.run,'baseline-results.jsonl'))),limitations:['Reference review isAI-assisted,notindependenthumanadjudication','The200-case sample isoneperpaper,not a randomsampleofallquestions','Fullsemanticgradingofall871answersandallcitation-claimrelationswasnotperformed','OriginalPDF/datasetversionalignmentremainsuncertain; someannotationscontradictactualfiles','GeneratedWordfixturesarenotpublisherDOCXandomitfloatingfigures/tables; noOCR','All50Wordfilesrendered,butonlyrepresentativepagesvisuallyinspected','Noextendedproductionsoakorcomprehensivesecuritycertification','Knownfirstfailuresandharnesssetupfailurespreserved; noapplicationfixes,push,mergeordeploy']};
fs.writeFileSync(path.join(b,'final-evaluation-summary.json'),JSON.stringify(report,null,2));
const artifacts=(label,relative)=>`[${label}](${b.replaceAll('\\','/')}/${relative})`;
const reviewRows=Object.entries(semantic.counts).map(([key,count])=>`| ${key.replaceAll('_',' ')} | ${count} |`).join('\n');
const text=`# LocalCortex V2 evaluation results

Evaluation date: 29 October 2026. Status: baseline and bounded follow-on test runs finished. **The measured answer-quality gates are not met.** The application produces many incomplete answers or refusals on answerable annotations, and controlled conversations expose incorrect transfer of conditions between topics. Reliable indexing and successful generation do not establish answer correctness.

This is an adapted QASPER evaluation, not an official QASPER score. Review is AI-assisted, independent of the evaluated Qwen model, with no Cloudflare judge calls. It is not independent human grading or a semantic grade for every answer/citation claim. Remaining certification limits are listed below rather than declared passed.

## Scope and execution

| Item | PDF | DOCX | Total |
|---|---:|---:|---:|
| Indexed documents | 200 | 50 | 250 |
| Selected question/format cases | 708 | 163 | 871 |
| Successful generated answers | 704 | 163 | 867 |
| Retained execution errors | 4 | 0 | 4 |
| Unattempted selected cases | 0 | 0 | 0 |

There are **708 distinct selected questions**. The 163 DOCX cases repeat questions also tested in PDF, making 871 format-question cases, not 871 independent questions. The 163 paired cases have 28 strict refusal-pattern disagreements; this is not a paired accuracy score.

The original 1,168 coverage rows remain intact. One failed PDF/3 questions was skipped; 294 other PDF questions were outside the reduced user scope. No answers were used to select the cohort. Previous failures were retained without retry. Three provider attempts have unknown usage; one further error occurred without dispatch. Historical long durations include sleep/authorization-boundary effects and are not normal latency.

Application, prompt, retrieval and cohort settings remained frozen: Cloudflare Qwen3-30B-A3B-FP8 answers, local nomic embeddings, dense retrieval, threshold 0.63, topK 5, original context assembly and provider-default answer limit. No application fix, tuning, OCR, push, merge or deployment was performed.

## Answer quality and evidence

The answer-independent selection froze one question per selected paper: 150 PDF and 50 DOCX cases. It was saved on28October at20:25:52UTC while generation was already running, not before all answers existed. Its minimum-SHA256 rule was independently reproduced from frozen coverage and paper IDs without reading answers. Earlier commentary calling it pre-answer was inaccurate. All200 questions, answers and reference variants were read for reference agreement and completeness. A separate targeted grounding review covers15additional cases and reuses the hash-verified first20startup review. The sample is not a simple random sample of questions; its categories must not be presented as whole-corpus accuracy.

| Reference/completeness outcome in the 200-case sample | Cases |
|---|---:|
${reviewRows}

“Reference complete” means the core answer matches a valid reference formulation; it does not certify every added claim. Partial answers often describe a method or result generically instead of supplying requested names, metrics, counts or complete lists. Ambiguities include disagreeing annotators, question scope and source-version differences. No unexplained combined accuracy is reported.

Across all 871 cases, the production refusal pattern flags 354 refusals, including 279 on consistently answerable annotations. These are diagnostic candidates, not 279 independently confirmed false refusals. The detector also misses some genuine admissions. Thirteen all-unanswerable-labelled cases not flagged as refusals were individually inspected: some contain grounded broad answers, some are incomplete, and some use unsupported speculation or wrongly attribute related work to the paper. They are not automatically 13 hallucinations.

Concrete failure traces distinguish stages:

- **Retrieval:** Stanford NER, ilur.am, the 85.99 F1 value and a 300-dimensional embedding fact are present in the loaded sources but absent from the selected top chunks and prompt for their questions.
- **Generation/scope:** the Reddit dataset sampling passage includes AskReddit, but the answer selects broader illustrative Reddit topics instead of the requested sampled categories.
- **Input construction:** the generated DOCX inputs lack some floating-table details such as absolute CER 2.49 and FDUR feature labels. The native synthetic table test succeeds; missing paper tables cannot be blamed automatically on the DOCX loader.
- **Annotation/version alignment:** the supplied Estonian NER PDF, Table 5 on page 6, shows 0.79/0.89/0.91. Those numbers in the answer are supported by the actual table, although the references demand a 0.05 improvement. Another all-unanswerable-labelled question has its 4.85%/15.09% WER answer explicitly in the original abstract. Naive reference/refusal scoring would misclassify these examples.
- **Grounding:** the cloze-to-natural-question answer speculates beyond its passages; the ARAML and tweet-survey examples attribute background methods to the target work.

The expected paper is top-ranked in 861/871 cases and appears among retrieved chunks in 871/871. **Paper identity is not supporting-evidence recall.** Exact full-evidence-paragraph containment at ranks 1/3/5 is only 6/14/20 cases; 50 have such a paragraph in the assembled prompt and 264 have at least one exact reference sentence there. These are formatting-sensitive diagnostics: bibliography/table placeholders, long evidence paragraphs, line breaks and version drift prevent calling them semantic Recall@K.

${artifacts('Full case diagnostics','qasper-post-baseline-final/audit-summary.json')}; ${artifacts('200-case review and rubric outcomes','qasper-post-baseline/semantic-200-reference-review.jsonl')}; ${artifacts('Detailed grounding inspection','qasper-post-baseline/detailed-grounding-review.json')}; ${artifacts('Failure-stage traces','qasper-post-baseline/failure-stage-traces.json')}.

## Index, context and citations

All **16,987 PDF points and 3,721 DOCX points** were reconciled read-only against all 250 document records. There are no per-document count mismatches, orphan documents, duplicate/missing chunk indexes, source-text mismatches or assigned-PDF-page mismatches. Source identity uses the actual ingestion ledger and acquisition filenames, including verified versioned/retry names; initial filename-only diagnostic revisions are preserved.

Every captured passage is present in its saved prompt. Maximum measured system+prompt size is 2,761 retained llama3-tokenizer tokens; this is an approximation for Qwen, not a provider-token/window certification. The 512-token reserve was not imposed as an answer cap.

All **2,601 returned citations map to an actual chunk included in the prompt**. The 201 initial source/page metadata flags arise from passages merged across page boundaries retaining only the starting-page field; chunk-level checks clear them. No invented DOCX page numbers were found. These checks establish provenance and page/text membership, not universal answer-claim entailment.

${artifacts('Final per-point reconciliation','qasper-post-baseline/index-integrity-final.json')}; ${artifacts('Citation-to-prompt-chunk checks','qasper-post-baseline/citation-chunk-validation.json')}.

## Separate controlled application scenarios

These synthetic cases are outside the 871-case QASPER denominator and use separate collections/stores and owned chats.

| Check | Result | Practical limit |
|---|---|---|
| Wording/typo/paraphrase variations | 50/50 controlled-fact screens passed | Ten base phrasings with five wrappers; not 50 independent natural questions |
| Absent information/unrelated questions | 50/50 refusal screens passed | Ground truth verified in the small controlled collections |
| DOCX/PDF instruction injection | 30/30 passed; 30/30 attacks confirmed in the actual prompt | 20 DOCX, 10 derived PDF counterparts; four simple attack families, not comprehensive security proof |
| Original four-turn conversation template | 0/30 complete chains passed | Thirty repetitions, not thirty unique designs; approval for travel is incorrectly transferred to retention |
| Additional pronoun chain | One five-turn chain failed an exclusivity follow-up | Names and backup follow-up worked; “only two contacts named?” was wrongly refused |
| Topic return and off-topic return | Both additional chains passed | Small deliberately varied coverage |
| Separate chat histories | Passed | This does not establish multi-user authorization isolation |
| Malformed/empty/unsupported/oversized uploads | 10/10 passed | Actual HTTP, both formats, configured default 50 MB limit |
| Missing/blank/malformed routes and IDs | Initial 8/8 plus malformed JSON passed | JSON error envelopes checked |
| Duplicate upload/delete/re-delete | Both formats passed | Actual store/vector consistency, repeat delete404 |
| Conflicting revisions | Both17/29-day values and dates reported correctly | No undocumented revision-precedence rule assumed |
| Deletion and saved history | Old revision removed, new29-day answer correct; saved historical answer retained | After both bulletins were deleted, fresh/follow-up questions still received17days from a different AsterLab document: scope failure, not deleted-vector resurrection |
| Provider failures and rollback | 14/14 corrected controlled HTTP simulations passed | Real API/owned services with mocked provider transport, zero hosted calls |
| Concurrent inference | Two simultaneous synthetic requests passed | Bounded concurrency2, not a capacity/load certification |
| Live stream cancellation | Passed; partial answer saved asinterrupted | First token ~805ms for this one measured request |
| Browser switch/reload/citation chips | Five normal-flow checks passed | Actual headlessChromium148/Vite; test-only request attribution headers |
| Browser Stop/reload | Immediate reload missedStopped; later bounded-persistence follow-up passed | Backend interruption became visible after~1.2s; immediate reload race remains an observedUXedge, not permanent data loss |

In the approval failure, the rewriter correctly produced “Does the AsterLab retention period need manager approval?” The answering prompt still used the user’s pronoun question plus history, and the answer incorrectly borrowed the travel condition. A standalone explicit retention-approval question correctly refused. This distinguishes condition/reference binding from an invented permission rule in the source.

Provider simulations exercised401/429/503, transport failure, malformed/empty completions, timeout, pre-stream503JSON, truncated-stream error/partial persistence, interruption, failed/interrupted history exclusion and Qdrant-delete rollback. Original setup failures are retained separately: the first custom harness reached APIs before readiness and sent zero provider calls; the first mock stream fixtures omitted the SSE content type and were corrected, again with zero real provider calls. These harness errors are not application-quality scores.

${artifacts('Custom suite results','qasper-scenarios-r2/scenario-summary.json')}; ${artifacts('Attack exposure checks','injection-exposure-validation.json')}; ${artifacts('Additional conversations','conversation-chain-qa/results.json')}; ${artifacts('Lifecycle evidence','lifecycle-qa/results.jsonl')}; ${artifacts('HTTP failure/rollback checks','http-failure-qa-r2/summary.json')}; ${artifacts('Browser evidence','browser-qa/browser-summary.json')}; ${artifacts('Stop timing follow-up','browser-qa/stop-timing-followup.json')}.

## Coverage of the planned fourteen blocks

| Block | Executed evidence and remaining limits |
|---|---|
|1 Data/grading | Full frozen coverage/hashes;200-caseAI reference review; targeted grounding; disagreements preserved. Human adjudication of every uncertain annotation remains unavailable. |
|2 Ingestion |250actual uploads; all files re-extracted/hash-checked; native structures and HTTP malformed/type/size failures; zero leftover upload temp files. Visual source fidelity sampled. |
|3 Retrieval | Saved ranked hits for all871; exact evidence diagnostics and concrete miss traces. No semantic all-case Recall@K claimed. |
|4 Context | Actual prompts/passages captured for all871; prompt membership/budget diagnostics and targeted missing-fact tracing. |
|5 Answers |200preselected reference/completeness reviews;35startup/targeted grounding cases; no all871human correctness score. |
|6 Refusals | Full strict-pattern diagnostics, all13flagged unanswerable/nonrefusal cases inspected,50controlled absent cases; global primary-corpus absence not certified. |
|7 Citations | All2601source/chunk provenance checks, per-point PDF-page checks, original-page visual examples and targeted claim review; not all claim/citation pairs adjudicated. |
|8 Chunking/indexing | All20708points and250records reconciled; no index gaps; source/retrieval/generation misses separated. No baseline retuning. |
|9 Conversations |30repeatedfour-turn chats, additional pronoun/topic-return/off-topic chains and chat-separation checks; condition-binding failure found. |
|10 Security/privacy |30exposed injections, malformed inputs, built-assets/report credential scan and unauthenticated owned-document listing. Authentication/multi-user isolation are absent; no comprehensive penetration test. |
|11 Lifecycle/conflicts | Duplicate/delete/rollback, two dated revisions, post-delete retrieval and saved-history behavior; named-document scope failure found. |
|12 Provider failures |14controlled HTTP failure/recovery/persistence checks plus earlier11component checks; no deliberate live quota exhaustion or shared-service disruption; no fallback added. |
|13 Streaming/cancellation | Live cancellation/interrupted persistence, controlled truncated streams/history exclusion, realUI switch/reload/Stop; immediate-reload timing edge retained. |
|14 Performance/retention |871recorded latencies, bounded concurrent inference,100health requests atconcurrency2, temp/state/pool cleanup and resource snapshots; not an extendedproductionsoak. |

## Rendering, performance, privacy and verification

All50Wordfixtures exported successfully through MicrosoftWord (${words.reduce((n,r)=>n+r.Pages,0)}pages). The packaged renderer was tried first and diagnosed missingLibreOffice; Word was used as the documented fallback. Representative rendered pages were inspected: native lists/table/header/footer, a research-paper page, both lifecycle fixtures, a PDF injection and two originalPDF evidence pages. This does not certify every page, publisher fidelity, native equations or missing figures. DOCX paper fixtures retain structured source text/BIBREF placeholders and omit floating figures/tables. PDF extraction emitted font/cMap/wasm warnings; OCR/image-content coverage is not assumed.

Successful primary-case median total latency: **1.135s**,p95 **2.157s**,p99 **3.390s**, including local retrieval and hosted generation in this run. Two-request concurrency passed. The100localhealth requests had zero errors (median~9.4ms,p95~16.0ms). These workloads are different; they are not a fair small-versus-full-model latency experiment or a long soak. Short resource observations do not prove absence of leaks.

The follow-on provider ledger contains **${reserves.length} requests** (${reserves.filter(r=>r.kind==='answer').length}answers,${reserves.filter(r=>r.kind==='rewrite').length}rewrites),allsettled,with${settlements.filter(r=>r.unknownUsage).length}unknown-usage cancellation and no quota/auth stop. Baseline ledgers record870dispatches with3unknownusage cases. Provider-reported usage excludes unknown consumption and is not total account billing; historical preflight requests are separate. No paid capacity, added provider or judge calls were enabled.

Actual credential-value scan passed across${privacy.filesScanned}currentevaluationtext artifacts and built frontend files, with zero leaks. Backend secret files remained private and excluded from report content; git/.dockerignore credential checks passed. The app has no authentication/multi-user isolation, as declared in the plan.

Repository verification required byAGENTS.md passed: API,test andwebtypechecks; webbuild;135offline tests passed,28live-stack tests intentionallyskipped,0failed. The26guard/cohort tests passed and new evaluation modules passed syntax checks. Locked dependencies were installed offline from cache; application/dependency source files were preserved.

All owned synthetic documents/chats were cleaned up; both synthetic stores/vector collections and upload-temp directories are empty, and the owned database has0remaining conversations. Test-only servers/UI were stopped; original baseline containers/volumes and all evidence were preserved. No further evaluation generation is running.

## Assessment and next work

The tested system has strong basic ingestion/index consistency and useful refusal/injection defenses on the declared synthetic cases. **It does not yet demonstrate reliable, complete research-document answering or robust conversational scope.** Prioritize retrieval of answer-bearing sections, complete list/numeric answers, condition binding in follow-ups and respect for named-document/version qualifiers. Correct the evaluation’s source/reference alignment and DOCX floating-table limitations before using a single headline quality score. Application fixes require separate approval under the evaluation plan and were not applied here.

The bounded test runs are finished with these limitations. A fully adjudicated871-answer accuracy/grounding score, independenthumanreview, all-page rendering certification, comprehensive adversarial/security coverage and extended production soak are not claimed complete.

${artifacts('Machine-readable final summary','final-evaluation-summary.json')}; ${artifacts('Cleanup proof','cleanup-summary.json')}; ${artifacts('Secret scan','credential-artifact-scan.json')}; ${artifacts('Bounded sustained-use checks','sustained-use-summary.json')}.
`;
// Preserve URLs/hashes/timestamps while spacing compact measurement labels in prose.
const protectedParts=/(\[[^\]]+\]\([^)]*\)|`[^`]*`|\b\d{4}-\d\d-\d\dT[0-9:.]+Z\b|\b[a-f0-9]{32,}\b)/g;
const readable=text.split(protectedParts).map((part,i)=>i%2?part:part
 .replace(/\b(all|All|The|the|with|at|on|covers|first|both|No|no)(?=\d)/g,'$1 ')
 .replace(/(\d)(?=(?:PDF|DOCX|Word|October|UTC|human|startup|additional|returned|original|local|controlled|question|case|point|record|document|answer|error|refusal|mismatch|request|rewrite|settlement|unknown|test|guard|component|offline|live|simple|pages|steps|constraints|wording|absent|injection|health|ms|seconds))/g,'$1 ')
 .replace(/\b(MicrosoftWord|missingLibreOffice|actualHTTP|actualPDF|originalPDF|originalDOCX|derivedPDF|nativeWord|headlessChromium|controlledHTTP|mockSSE|zeroHTTP|zeroerrors|zeroerr|NoOCR|independenthumanreview|humanreview|allpages|longsoak|productionsoak|uploadtempfiles|Cloudflarejudgecalls|Cloudflarejudge)/g,w=>({MicrosoftWord:'Microsoft Word',missingLibreOffice:'missing LibreOffice',actualHTTP:'actual HTTP',actualPDF:'actual PDF',originalPDF:'original PDF',originalDOCX:'original DOCX',derivedPDF:'derived PDF',nativeWord:'native Word',headlessChromium:'headless Chromium',controlledHTTP:'controlled HTTP',mockSSE:'mock SSE',zeroHTTP:'zero HTTP',zeroerrors:'zero errors',zeroerr:'zero errors',NoOCR:'No OCR',independenthumanreview:'independent human review',humanreview:'human review',allpages:'all pages',longsoak:'long soak',productionsoak:'production soak',uploadtempfiles:'upload temp files',Cloudflarejudgecalls:'Cloudflare judge calls',Cloudflarejudge:'Cloudflare judge'}[w]))).join('');
fs.writeFileSync('docs/evaluation/qasper-v2-results.md',readable);console.log(JSON.stringify({report:'docs/evaluation/qasper-v2-results.md',summary:path.join(b,'final-evaluation-summary.json'),baseline:report.baseline,assessment:report.assessment}));
