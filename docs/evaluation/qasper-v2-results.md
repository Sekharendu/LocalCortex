# LocalCortex V2 evaluation results

Evaluation date: 29 October 2026. The original dense baseline and the requested scoped hybrid follow-up have finished. **All 871 scoped hybrid cases generated successfully, but the fixed 200-case sample does not show overall answer-quality improvement.** Explicit document selection is now enforced; many incomplete answers and answerable-annotation refusals remain. The separate conversation condition-transfer defect remains outside this change.

This is an adapted QASPER evaluation, not an official QASPER score. Review is AI-assisted, independent of the evaluated Qwen model, with no Cloudflare judge calls. It is not independent human grading or a semantic grade for every answer/citation claim. Remaining certification limits are listed below rather than declared passed.

## Scoped hybrid follow-up: completed execution

The approved QH-SCOPE-1 change enforces explicitly named document/version identity before retrieval. Missing, deleted or ambiguous identities fail closed. It retains the generation prompt/persona, Cloudflare `@cf/qwen/qwen3-30b-a3b-fp8` model, chunking, relevance threshold 0.63, follow-up floor 0.57 and dense:sparse RRF weights 2:1. Four implementation review findings were corrected and independently verified before dispatch.

| Execution | PDF | DOCX | Total |
|---|---:|---:|---:|
| Same indexed documents reused |200|50|250|
| Same question/format cases |708|163|871|
| Successful new answers |708|163|871|
| Execution errors / unattempted cases |0|0|0|
| Strict refusal-pattern flags |288|73|361|

The independent new arm preserves the old case IDs and actual question wording, including all four former execution errors, which now completed successfully. The 871 cases still comprise 708 distinct questions plus 163 repetitions across formats. New attempts/results/usage are separate from the old dense baseline; there were no uploads or reembedding.

Scope resolution succeeded for 845 cases. All 26 unavailable PDF references received no context and a refusal-pattern answer. Eight have literal requested-title/PDF-title typos; 18 have unsupported leading layouts or an omitted title suffix. All remain in the denominator. The conservative grammar is described in [document scope and hybrid evaluation](<C:/Users/hp/Desktop/My Products/LocalCortex-cloudflare-inference/docs/evaluation/qasper-hybrid-scope.md>).

Strict refusal-pattern flags increased from 354 to 361; 285 new flags have consistently answerable annotations. These are diagnostic candidates, not independently confirmed false refusals. Among the 867 cases generated successfully in both arms, 302 were flagged in both, 52 only in old dense, 58 only in new scoped hybrid and 455 in neither. Format-pair refusal disagreements increased from 28 to 34 of 163 pairs. None of these counts is semantic accuracy.

The hosted run finished at 15:20:24 UTC on 29 October. It made 871 answer requests with 871 durable settlements, one request outstanding at most, no unknown usage, and no quota/rate/auth stops. Reported run usage was 1,301,502 tokens and 6,661.15 neurons; prior/account-wide usage remains unknown. Median complete-case time was 1.39 seconds, p95 3.73 seconds. The old run's sleep/authorization stalls prevent a fair old-versus-new latency comparison.

The final read-only audit checked the exact queue/wording, scope of every hit and assembled passage, all 2,356 citation-to-prompt hit mappings, ledger ordering and frozen application/tool/input hashes. Old dense results/attempts/ledger hashes remained unchanged. Citation provenance does not certify every answer claim or original PDF page. All 871 results and their errors, refusals and usage remain recorded; no provider requests were made for judging.

[Final integrity audit](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qh-scope-1/hosted-integrity-final-r4.json); [execution/refusal diagnostics](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qh-scope-1/hosted-outcomes-r4.json).

### Retrieval mode comparison on identical new code

The local comparison tested all 871 questions with dense and hybrid retrieval on the same scoped application. Both returned five chunks for all 845 resolved references and no chunks for 26 unavailable references; no resolved case missed the dense relevance gate. Every hit stayed within the resolved identity. A unique document filter makes document-rank recall uninformative, so it is not used as an improvement claim.

| Formatting-sensitive retrieval diagnostic |Dense|Hybrid|
|---|---:|---:|
| Any complete reference-evidence span in top five |20|23|
| Any reference sentence in top five |187|181|
| PDF cases with a reference sentence in top five |153|145|
| DOCX cases with a reference sentence in top five |34|36|
| Median resolved-case retrieval time |171 ms|252 ms|

There are 787 cases with usable nonempty reference evidence. Hybrid changed the top chunk on 230 of 845 nonempty cases; full-span best rank improved in six and worsened in four, while sentence best rank improved in 47 and worsened in 81. These single-chunk substring checks cannot credit paraphrases, evidence split across chunks, altered citation markers, absent tables/figures or PDF/reference version differences. They are neither semantic accuracy nor assembled-prompt coverage. Dense always ran first, so latency has order/warmup bias and excludes the separate catalog lookup. The results do not establish a general hybrid advantage.

In the new hosted prompts, 60 cases contain a full reference-evidence span and 259 contain at least one reference sentence, versus 50 and 264 in the old arm. This answer-arm comparison changes scope and retrieval mode together. It cannot isolate the effect of hybrid search.

[Same-source mode-only report](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qh-scope-1/local-mode-comparison-r4.md).

### New fixed-sample reference review

The same fixed 200-case, one-question-per-paper sample (150 PDF, 50 DOCX) was assessed using the earlier reference/completeness rubric. The independent Reviewer newly read 122 cases and transparently reused 78 prior assessments only where the question, answer, status and reference inputs were identical. All 200 are classified; none is pending. This is AI-assisted review, not independent human grading.

| Reference/completeness category |Old dense|New scoped hybrid|
|---|---:|---:|
| Reference complete |46|44|
| Reference partial |41|40|
| Annotated answerable refusal |68|72|
| Mixed annotation refusal |1|1|
| Annotation or scope ambiguous |29|29|
| Reference mismatch |9|8|
| Annotated unanswerable refusal |3|4|
| Unsupported answer on unanswerable case |1|1|
| Correct core with unsupported rationale |1|1|
| Execution error |1|0|

Thirty-seven cases changed category. Reference-complete PDF cases stayed at 36; DOCX fell from 10 to eight. Some cases improved, but eight formerly complete answers became answerable-annotation refusals, while four formerly refused answers became complete. **This sample does not demonstrate an overall answer-quality improvement.** Execution improved, and scope safety is enforced, while supporting-evidence selection and complete answers remain unresolved.

The original minimum-hash selection rule was answer-independent and recorded during baseline generation, rather than being a pre-answer or simple random question sample. Its categories do not establish population-wide accuracy. Reference completeness does not certify every added claim, reused classifications do not establish prompt grounding, and no universal citation-claim entailment review was performed. Annotation/PDF revision differences, missing floating tables/figures and generated-DOCX limitations remain. The old-versus-new answers combine scope enforcement with hybrid search; only the separate local retrieval comparison isolates mode.

[Fixed-sample review summary and input hashes](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qh-scope-1/sample-review-r4/sample-reference-summary.json); [per-case assessments](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qh-scope-1/sample-review-r4/sample-reference-review.jsonl).

## Original dense baseline: scope and execution

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

The answer-independent selection froze one question per selected paper: 150 PDF and 50 DOCX cases. It was saved on 28 October at 20:25:52 UTC while generation was already running, not before all answers existed. Its minimum-SHA256 rule was independently reproduced from frozen coverage and paper IDs without reading answers. Earlier commentary calling it pre-answer was inaccurate. All 200 questions, answers and reference variants were read for reference agreement and completeness. A separate targeted grounding review covers 15 additional cases and reuses the hash-verified first 20 startup review. The sample is not a simple random sample of questions; its categories must not be presented as whole-corpus accuracy.

| Reference/completeness outcome in the 200-case sample | Cases |
|---|---:|
| reference complete | 46 |
| annotated answerable refusal | 68 |
| mixed annotation refusal | 1 |
| reference partial | 41 |
| annotation or scope ambiguous | 29 |
| reference mismatch | 9 |
| unsupported answer on unanswerable case | 1 |
| reference correct core with unsupported rationale | 1 |
| annotated unanswerable refusal | 3 |
| execution error | 1 |

“Reference complete” means the core answer matches a valid reference formulation; it does not certify every added claim. Partial answers often describe a method or result generically instead of supplying requested names, metrics, counts or complete lists. Ambiguities include disagreeing annotators, question scope and source-version differences. No unexplained combined accuracy is reported.

Across all 871 cases, the production refusal pattern flags 354 refusals, including 279 on consistently answerable annotations. These are diagnostic candidates, not 279 independently confirmed false refusals. The detector also misses some genuine admissions. Thirteen all-unanswerable-labelled cases not flagged as refusals were individually inspected: some contain grounded broad answers, some are incomplete, and some use unsupported speculation or wrongly attribute related work to the paper. They are not automatically 13 hallucinations.

Concrete failure traces distinguish stages:

- **Retrieval:** Stanford NER, ilur.am, the 85.99 F1 value and a 300-dimensional embedding fact are present in the loaded sources but absent from the selected top chunks and prompt for their questions.
- **Generation/scope:** the Reddit dataset sampling passage includes AskReddit, but the answer selects broader illustrative Reddit topics instead of the requested sampled categories.
- **Input construction:** the generated DOCX inputs lack some floating-table details such as absolute CER 2.49 and FDUR feature labels. The native synthetic table test succeeds; missing paper tables cannot be blamed automatically on the DOCX loader.
- **Annotation/version alignment:** the supplied Estonian NER PDF, Table 5 on page 6, shows 0.79/0.89/0.91. Those numbers in the answer are supported by the actual table, although the references demand a 0.05 improvement. Another all-unanswerable-labelled question has its 4.85%/15.09% WER answer explicitly in the original abstract. Naive reference/refusal scoring would misclassify these examples.
- **Grounding:** the cloze-to-natural-question answer speculates beyond its passages; the ARAML and tweet-survey examples attribute background methods to the target work.

The expected paper is top-ranked in 861/871 cases and appears among retrieved chunks in 871/871. **Paper identity is not supporting-evidence recall.** Exact full-evidence-paragraph containment at ranks 1/3/5 is only 6/14/20 cases; 50 have such a paragraph in the assembled prompt and 264 have at least one exact reference sentence there. These are formatting-sensitive diagnostics: bibliography/table placeholders, long evidence paragraphs, line breaks and version drift prevent calling them semantic Recall@K.

[Full case diagnostics](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-post-baseline-final/audit-summary.json); [200-case review and rubric outcomes](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-post-baseline/semantic-200-reference-review.jsonl); [Detailed grounding inspection](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-post-baseline/detailed-grounding-review.json); [Failure-stage traces](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-post-baseline/failure-stage-traces.json).

## Index, context and citations

All **16,987 PDF points and 3,721 DOCX points** were reconciled read-only against all 250 document records. There are no per-document count mismatches, orphan documents, duplicate/missing chunk indexes, source-text mismatches or assigned-PDF-page mismatches. Source identity uses the actual ingestion ledger and acquisition filenames, including verified versioned/retry names; initial filename-only diagnostic revisions are preserved.

Every captured passage is present in its saved prompt. Maximum measured system+prompt size is 2,761 retained llama3-tokenizer tokens; this is an approximation for Qwen, not a provider-token/window certification. The 512-token reserve was not imposed as an answer cap.

All **2,601 returned citations map to an actual chunk included in the prompt**. The 201 initial source/page metadata flags arise from passages merged across page boundaries retaining only the starting-page field; chunk-level checks clear them. No invented DOCX page numbers were found. These checks establish provenance and page/text membership, not universal answer-claim entailment.

[Final per-point reconciliation](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-post-baseline/index-integrity-final.json); [Citation-to-prompt-chunk checks](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-post-baseline/citation-chunk-validation.json).

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
| Live stream cancellation | Passed; partial answer saved asinterrupted | First token ~805 ms for this one measured request |
| Browser switch/reload/citation chips | Five normal-flow checks passed | Actual headless Chromium148/Vite; test-only request attribution headers |
| Browser Stop/reload | Immediate reload missedStopped; later bounded-persistence follow-up passed | Backend interruption became visible after~1.2s; immediate reload race remains an observedUXedge, not permanent data loss |

In the approval failure, the rewriter correctly produced “Does the AsterLab retention period need manager approval?” The answering prompt still used the user’s pronoun question plus history, and the answer incorrectly borrowed the travel condition. A standalone explicit retention-approval question correctly refused. This distinguishes condition/reference binding from an invented permission rule in the source.

Provider simulations exercised401/429/503, transport failure, malformed/empty completions, timeout, pre-stream503JSON, truncated-stream error/partial persistence, interruption, failed/interrupted history exclusion and Qdrant-delete rollback. Original setup failures are retained separately: the first custom harness reached APIs before readiness and sent zero provider calls; the first mock stream fixtures omitted the SSE content type and were corrected, again with zero real provider calls. These harness errors are not application-quality scores.

[Custom suite results](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-scenarios-r2/scenario-summary.json); [Attack exposure checks](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/injection-exposure-validation.json); [Additional conversations](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/conversation-chain-qa/results.json); [Lifecycle evidence](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/lifecycle-qa/results.jsonl); [HTTP failure/rollback checks](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/http-failure-qa-r2/summary.json); [Browser evidence](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/browser-qa/browser-summary.json); [Stop timing follow-up](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/browser-qa/stop-timing-followup.json).

## Coverage of the planned fourteen blocks

| Block | Executed evidence and remaining limits |
|---|---|
|1 Data/grading | Full frozen coverage/hashes;200-caseAI reference review; targeted grounding; disagreements preserved. Human adjudication of every uncertain annotation remains unavailable. |
|2 Ingestion |250actual uploads; all files re-extracted/hash-checked; native structures and HTTP malformed/type/size failures; zero leftover upload temp files. Visual source fidelity sampled. |
|3 Retrieval | Saved ranked hits for all 871; exact evidence diagnostics and concrete miss traces. No semantic all-case Recall@K claimed. |
|4 Context | Actual prompts/passages captured for all 871; prompt membership/budget diagnostics and targeted missing-fact tracing. |
|5 Answers |200preselected reference/completeness reviews;35 startup/targeted grounding cases; no all 871 human correctness score. |
|6 Refusals | Full strict-pattern diagnostics, all 13flagged unanswerable/nonrefusal cases inspected,50 controlled absent cases; global primary-corpus absence not certified. |
|7 Citations | All 2601source/chunk provenance checks, per-point PDF-page checks, original-page visual examples and targeted claim review; not all claim/citation pairs adjudicated. |
|8 Chunking/indexing | All 20708 points and250 records reconciled; no index gaps; source/retrieval/generation misses separated. No baseline retuning. |
|9 Conversations |30repeatedfour-turn chats, additional pronoun/topic-return/off-topic chains and chat-separation checks; condition-binding failure found. |
|10 Security/privacy |30exposed injections, malformed inputs, built-assets/report credential scan and unauthenticated owned-document listing. Authentication/multi-user isolation are absent; no comprehensive penetration test. |
|11 Lifecycle/conflicts | Duplicate/delete/rollback, two dated revisions, post-delete retrieval and saved-history behavior; named-document scope failure found. |
|12 Provider failures |14 controlled HTTP failure/recovery/persistence checks plus earlier11 component checks; no deliberate live quota exhaustion or shared-service disruption; no fallback added. |
|13 Streaming/cancellation | Live cancellation/interrupted persistence, controlled truncated streams/history exclusion, realUI switch/reload/Stop; immediate-reload timing edge retained. |
|14 Performance/retention |871 recorded latencies, bounded concurrent inference,100 health requests atconcurrency2, temp/state/pool cleanup and resource snapshots; not an extendedproductionsoak. |

## Rendering, performance, privacy and verification

All 50 Wordfixtures exported successfully through Microsoft Word (471 pages). The packaged renderer was tried first and diagnosed missing LibreOffice; Word was used as the documented fallback. Representative rendered pages were inspected: native lists/table/header/footer, a research-paper page, both lifecycle fixtures, a PDF injection and two original PDF evidence pages. This does not certify every page, publisher fidelity, native equations or missing figures. DOCX paper fixtures retain structured source text/BIBREF placeholders and omit floating figures/tables. PDF extraction emitted font/cMap/wasm warnings; OCR/image-content coverage is not assumed.

Successful primary-case median total latency: **1.135s**,p95 **2.157s**,p99 **3.390s**, including local retrieval and hosted generation in this run. Two-request concurrency passed. The 100 localhealth requests had zero errors (median~9.4 ms,p95~16.0 ms). These workloads are different; they are not a fair small-versus-full-model latency experiment or a long soak. Short resource observations do not prove absence of leaks.

The follow-on provider ledger contains **350 requests** (279 answers,71 rewrites),allsettled,with 1 unknown-usage cancellation and no quota/auth stop. Baseline ledgers record870dispatches with 3 unknownusage cases. Provider-reported usage excludes unknown consumption and is not total account billing; historical preflight requests are separate. No paid capacity, added provider or judge calls were enabled.

Actual credential-value scan passed across113currentevaluationtext artifacts and built frontend files, with zero leaks. Backend secret files remained private and excluded from report content; git/.dockerignore credential checks passed. The app has no authentication/multi-user isolation, as declared in the plan.

Repository verification required byAGENTS.md passed: API,test andwebtypechecks; webbuild;135 offline tests passed,28 live-stack tests intentionallyskipped,0failed. The 26 guard/cohort tests passed and new evaluation modules passed syntax checks. Locked dependencies were installed offline from cache; application/dependency source files were preserved.

All owned synthetic documents/chats were cleaned up; both synthetic stores/vector collections and upload-temp directories are empty, and the owned database has0remaining conversations. Test-only servers/UI were stopped; original baseline containers/volumes and all evidence were preserved. No further evaluation generation is running.

## Assessment and next work

The tested system has strong basic ingestion/index consistency and useful refusal/injection defenses on the declared synthetic cases. **It does not yet demonstrate reliable, complete research-document answering or robust conversational scope.** Prioritize retrieval of answer-bearing sections, complete list/numeric answers, condition binding in follow-ups and respect for named-document/version qualifiers. Correct the evaluation’s source/reference alignment and DOCX floating-table limitations before using a single headline quality score. Application fixes require separate approval under the evaluation plan and were not applied here.

The bounded test runs are finished with these limitations. A fully adjudicated871-answer accuracy/grounding score, independent human review, all-page rendering certification, comprehensive adversarial/security coverage and extended production soak are not claimed complete.

[Machine-readable final summary](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/final-evaluation-summary.json); [Cleanup proof](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/cleanup-summary.json); [Secret scan](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/credential-artifact-scan.json); [Bounded sustained-use checks](C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/sustained-use-summary.json).
