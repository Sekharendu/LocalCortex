# Stage 2: audit of the 57 missing/incomplete-evidence cases

Completed 5 November 2026. New files only under this folder. No generation, reranking-model calls, application/default changes, re-ingestion, or edits to saved results. All research-document reads and searches were limited to dev assets.

The original 57-case group is not 57 confirmed retrieval failures. This review found three cases whose supporting information was already in the prompt and eleven whose references do not establish a defensible complete answer passage. Those fourteen are retained and explained rather than forced into retrieval buckets. The requested buckets are used for the other 43, with qualifications preserved.

## 1. What was reused and what was computed

| Input | Treatment |
| --- | --- |
| Stage 2 preparations.jsonl, judgments.jsonl, blind-judgments.jsonl, sample.json | Reused actual top 15 hits, final passages/prompts, frozen judgments, reference alternatives and marked support for all 57. |
| dev-retrieval-20261103/*results.jsonl | Reused matching hybrid/k 50 rows: original question, selected dev document, same collection/embedding/prefixes/sparse statistics/RRF/threshold, reranking off. |
| question-only-same-paper-20261102/*results.jsonl and traces | Reused Q hybrid/k 50 rows when the exact embedding input, scope and source payloads matched. Retriever file difference is only an optional TypeScript rerankScore property; removing those two lines reproduces the old source hash. |
| rank-buckets-review-20261104 report, case-buckets.jsonl and manifest | Read the earlier 119-case quote-based review. Its raw rank source is reusable for overlapping cases; its cohort totals and quote-completeness labels are not substituted for this semantic 57-case audit. |
| context-budget, context-budget-k-grid, depth-and-answer-quality reports/replays | Read the saved replays. They use slices of k 50, older prompt/overall-budget settings, and literal-quote scoring. Same query form, different context setup: not reused as actual Stage 2 final contexts. Their raw same-query rankings were reused where available. |
| A/P query-form results | Rejected: A embeds/searches the title wrapper; P removes the selected-paper restriction. Different query/scope. |
| Dense and reranking-on results | Rejected: different search mode or post-retrieval ordering. |
| New computation | Four missing k 50 retrievals only: R297,R464,R532,R546. Eight successful Qdrant query requests (four dense gate probes and four hybrid queries), four successful local embeddings, zero generation calls. A prior sandbox-blocked embedding attempt reached neither model nor vector search. |

The initial audit found 26 usable saved k 50 records, plus 12 other cases whose saved Stage 2 gate result determines that retrieve(k 50) would return empty. Of 19 cases without a saved pool, only 4 needed fresh ranking. The remaining 15 already had the necessary prompt evidence, had no verifiable target, or lacked the answer representation throughout the saved index. Maximum planned searches for the new step was 8, well below 500.

Saved Stage 2 sourceExcerpts summarize text the model actually saw; they cannot be assumed to contain a missing paragraph. Needed witnesses were therefore taken from the saved referenceAnswers.evidence/highlighted_evidence in the same judgment/sample, then manually aligned to the saved dev source-chunk snapshot. Every selected literal anchor was checked in its cited source chunk and in the actual prompt. This is a semantic witness audit with exact source-text checks, not fuzzy reference-answer scoring. Gold alternatives remain alternatives. Closest related passages are explicitly labelled when they do not prove an answer.

All 57 actual Stage 2 contexts were reproduced byte-for-byte using the unchanged selectPassages builder with the saved real top 15 results,3200 cap,5000 total,1000 whole-document limit and title chunk enabled. These contexts are authoritative, rather than slices of an older k 50 ranking.

## 2. Location totals

| Location | Cases | Meaning |
| --- | --- | --- |
| (a) Actual top 15 hit discarded/cut by builder | 0 | No reviewed missing witness met this strict definition. Neighbour omissions are discussed separately. |
| (b) Missing witness found at 16–50 | 14 | Rank shown per case. Some judgments/reference scopes remain conditional; see qualifications. |
| (c) Not supplied within 50 | 29 | 25 gate short-circuits +2 mapped misses +2 unavailable source representations. These mechanisms must not be merged into one ranking failure. |
| Already in final prompt | 3 | R037,R336,R542. Two have interpretation caveats; R542 is a clear diagnosis correction. |
| Unresolved reference/ground truth | 11 | No verified complete answer passage to rank. Calling these top 50 misses would invent ground truth. |
| Total | 57 | Every original case is retained. |

### The 29 category(c) cases

- **25 relevance-gate rejections.** The normal 0.63 dense probe returned empty, before hybrid retrieval. The probe does not depend on k; a production-form k 50 request would also short-circuit. We did not bypass the gate or claim to observe an ungated rank. Some of these cases also have conflicting references, noted individually.
- **2 mapped witnesses missing from the top 50:** R187(annotation/social-context bias) and R193(Clustergen synthesis method). Other required parts can be available; a partial set is not complete evidence.
- **2 source-representation gaps:** R460’s DOCX has a table reference but none of the annotated numerical results; R467’s flattened figure text does not preserve a verifiable eight-layer count. The first is missing benchmark input data; the second is a provisional figure/layout diagnosis. Neither proves a loader bug without checking the original visual source.

### Important corrections and qualifications

- **R542, tweet count:** actual top 1 and the final prompt explicitly contain “19, 300 tweets” and the 2500 added random tweets. The earlier missing-evidence reading missed comma spacing. The answer 7200 confuses the transport-relevant subset with the collected pool: this is an answering error with evidence present, not a retrieval omission.
- **R037:** the human-marked Space Needle/Splash Mountain modality-attention discussion is already supplied, partly through a neighbour. The narrower wording “image parts” remains debatable.
- **R336:** the marked WSJ/Penn Treebank dataset paragraph and the corpus’s English bibliographic title are already supplied. English-only inference is debatable, but the supporting material itself was not omitted.
- **R283:** the LR/MLP list is at rank 16, while a weaker reference alternative merely says probabilistic model, already present. The more specific retrieval gap is conditional on that interpretation.
- **R297:** Word MemNN is already in the supplied comparison table. Prose expanding Memory Neural Networks appears at 16 and explicitly identifying its baseline role completes at 33. Do not describe the prompt as having no baseline information.
- **R464:** rank 26 provides hired undergraduate students. That supports a qualified recruitment answer, not proof that no online platform was ever used.
- **R546:** the paper’s discussion at rank 31 confirms LAN–P600 and ELAN–P600, the two pairs the new answer gave. The saved reference discusses a different behavioral-data result. The earlier factual-wrong interpretation is questionable; the missing prompt-support/provenance distinction remains visible. Existing judgments were not edited.

### Ranks 16–50

| Case | Question | First complete witness rank | Rank source |
| --- | --- | --- | --- |
| R100 | What predictive model do they build? | 27 | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R271 | What are the distinctive characteristics of how Arabic speakers use offensive language? | 49 | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R283 | What type of classifiers are used? | 16 | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R297 | What word level and character level model baselines are used? | 33 | computed now — eval/stage2-evidence-gaps-20261105/computed-rankings.jsonl |
| R306 | HOw does the method perform compared with baselines? | 44 | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R420 | what was their character error rate? | 16 | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R454 | Which dataset do they use? | 36 | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R464 | What crowdsourcing platform is used? | 26 | computed now — eval/stage2-evidence-gaps-20261105/computed-rankings.jsonl |
| R489 | Which languages are explored in this paper? | 27 | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R492 | What labels do they create on their dataset? | 35 | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R498 | What is the size of the Chinese data? | 33 | saved — eval/dev-retrieval-20261103/docx.results.jsonl |
| R531 | what language does this paper focus on? | 22 | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R532 | Ngrams of which length are aligned using PARENT? | 19 | computed now — eval/stage2-evidence-gaps-20261105/computed-rankings.jsonl |
| R546 | Which two pairs of ERPs from the literature benefit from joint training? | 31 | computed now — eval/stage2-evidence-gaps-20261105/computed-rankings.jsonl |

Hybrid k affects the prefetch pool: Stage 2 k 15 prefetched 60 per channel; k 50 prefetches 200. In 5 available comparisons, the first 15 of k 50 are not exactly the actual Stage 2 ordering (R187, R271, R306, R454, R492). Thus rank 50 is a wider-pool diagnostic rank; category(a) always uses the actual Stage 2 top 15. No target was mislabelled(a) merely because it entered the first 15 of a wider pool.

## 3. Observed patterns

| Pattern | Cases | Interpretation |
| --- | --- | --- |
| Split across chunks | 14 | Needed list/definition/schema crosses chunk boundaries; some cases never got past the gate. |
| Table or figure evidence | 9 | Numerical/tabular/visual evidence; only two are missing or unusable in the saved representation. |
| Different wording / broad question versus specific passage terms | 37 | Includes broad questions versus concrete names/abbreviations; an observed mismatch, not proof of an embedding-model defect. |
| Generic discussion ranks above specific answer | 15 | A narrative/topic statement ranks above the specific definition, list or table. |

Patterns overlap and are not exclusive root-cause totals. One additional wrong-role distractor is R454: a downstream conflict dataset was substituted for the primary speech corpus; it is not merely generic prose. Unresolved cases are not assigned speculative ranking causes. The 25 gate failures have no observed hybrid ordering to inspect. Per-case source passages and raw top-ranked passages make these observations reviewable.

## 4. Which changes could address the observed gaps

| Change | Evidence from this audit | Practical conclusion |
| --- | --- | --- |
| Larger context allowance | Offline replay increased the per-document cap from 3200 to the existing 5000-total request’s remaining builder allowance, about 4.1 k. It newly exposed all reviewed missing facts for R187 only (cap 4151). | A blanket increase has little demonstrated benefit for this group. It cannot fix the 25 gate rejections, unseen candidate chunks, missing table cells or invalid references. No larger prompt was sent, and local-token estimates are not a provider-token safety check. |
| Prioritize coherent spans / neighbours | Current±1 neighbour candidate set already contains all needed witnesses for R187 and R306. A±2 set reaches all witnesses for nine cases: R100, R187, R193, R283, R306, R420, R454, R532, R546. Their reviewed witness text fits 3200 tokens if appropriately selected. | These are feasibility results, not nine proven fixes. Existing code already merges touching chunks and considers±1 neighbours. A useful change would expand/prioritize complete sections, table-plus-caption or definition continuations, rather than merely adding another merge operation. Some cases need budget-aware reprioritization. |
| Wider candidate pool and candidate selection/reranking | All missing witnesses for 14 cases are available by rank 50. Their reviewed witness chunks fit the current 3200 allowance. | This is the largest verified ranking opportunity among cases that passed the gate. Retrieve a wider pool and test selecting coherent evidence for the final context. No reranker was called; availability does not prove the existing reranker will choose correctly. |
| Change chunk boundaries / preserve headings and table schemas | 14 cases have split source witnesses; R030’s table/list and R328’s architecture settings are examples. | Section/list/table-aware chunks are plausible candidates. Split patterns are not 14 guaranteed gains: some also fail the gate. Measure on these exact cases and working dev controls. |
| Repair missing table/figure representation | R460’s numeric table data is absent from the DOCX index; R467’s figure topology/count is not recoverable from saved flattened labels. | Check benchmark document construction and original visual source before blaming a PDF/DOCX loader. No ranker or larger budget can supply absent representation. R467’s exact gold count needs visual adjudication. |
| Revisit relevance gating for selected documents | 25 questions fail the dense relevance probe before any hybrid search. | Study gate calibration/query specificity with dev answerable cases AND off-topic controls. Neither widening k nor reranking can help while the gate returns no candidates. This audit does not lower the threshold. |
| Fix the evaluation diagnoses/ground truth | 3 already-present cases and 11 unverifiable witnesses; several additional conflicting references. | Correct the diagnostic labels in a separately approved future revision. This audit preserves all old artifacts and does not manufacture evidence or re-score the 200-case answer table. |

The nine±2 cases include the two±1 cases; do not add these counts together. Candidate-pool and span opportunities also overlap. “Fits 3200” is an oracle packing feasibility check using the reviewed source chunks, not an implemented evidence selector or an answer-quality result.

## 5. All 57 cases at a glance

| Case | Question | Location | Rank 50 | Patterns | Ranking provenance |
| --- | --- | --- | --- | --- | --- |
| R011 | What data do they look at? | (c) Not supplied within 50 | gate | Different wording / broad question versus specific passage terms | saved — eval/dev-retrieval-20261103/docx.results.jsonl |
| R016 | What is the Random Kitchen Sink approach? | (c) Not supplied within 50 | gate | Split across chunks; Different wording / broad question versus specific passage terms | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R030 | what is the state of the art? | (c) Not supplied within 50 | gate | Split across chunks; Table or figure evidence; Different wording / broad question versus specific passage terms | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R037 | Do they inspect their model to see if their model learned to associate image parts with words related to entities? | Supporting information already in final prompt | already supplied | Split across chunks; Table or figure evidence | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R050 | Do they train their model starting from a checkpoint? | (c) Not supplied within 50 | gate | not assigned | saved — eval/stage2-end-to-end-20261105/preparations.jsonl |
| R056 | Does the corpus contain only English documents? | No verifiable complete gold passage | unverifiable | not assigned | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R058 | Does their model suffer exhibit performance drops when incorporating word importance? | No verifiable complete gold passage | unverifiable | not assigned | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R072 | What is the best reported system? | (c) Not supplied within 50 | gate | Table or figure evidence; Different wording / broad question versus specific passage terms | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R078 | Do they experiment with the toolkits? | (c) Not supplied within 50 | gate | Different wording / broad question versus specific passage terms | saved — eval/stage2-end-to-end-20261105/preparations.jsonl |
| R089 | What are the deep learning architectures used in the task? | (c) Not supplied within 50 | gate | Different wording / broad question versus specific passage terms | saved — eval/stage2-end-to-end-20261105/preparations.jsonl |
| R099 | Do they report results only on English data? | No verifiable complete gold passage | unverifiable | not assigned | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R100 | What predictive model do they build? | (b) Missing witness at ranks 16–50 | 27 | Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R106 | Do they evaluate only on English datasets? | No verifiable complete gold passage | unverifiable | not assigned | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R132 | Do the authors conduct experiments on the tasks mentioned? | (c) Not supplied within 50 | gate | Different wording / broad question versus specific passage terms | saved — eval/stage2-end-to-end-20261105/preparations.jsonl |
| R174 | Why are current ELS's not sufficiently effective? | (c) Not supplied within 50 | gate | Split across chunks; Different wording / broad question versus specific passage terms | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R187 | What biases does their model capture? | (c) Not supplied within 50 | not found | Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R193 | What are the models used for the baseline of the three NLP tasks? | (c) Not supplied within 50 | not found | Split across chunks; Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R244 | What is the benchmark dataset and is its quality high? | (c) Not supplied within 50 | gate | Different wording / broad question versus specific passage terms | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R249 | How much is performance improved on NLI? | (c) Not supplied within 50 | gate | Different wording / broad question versus specific passage terms | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R258 | What accuracy does the proposed system achieve? | (c) Not supplied within 50 | gate | Split across chunks; Table or figure evidence; Different wording / broad question versus specific passage terms | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R271 | What are the distinctive characteristics of how Arabic speakers use offensive language? | (b) Missing witness at ranks 16–50 | 49 | Split across chunks; Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R283 | What type of classifiers are used? | (b) Missing witness at ranks 16–50 | 16 | Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R287 | Is it valid to presume a bad medical wikipedia article should not contain much domain-specific jargon? | No verifiable complete gold passage | unverifiable | not assigned | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R297 | What word level and character level model baselines are used? | (b) Missing witness at ranks 16–50 | 33 | Split across chunks; Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | computed now — four explicitly selected queries |
| R306 | HOw does the method perform compared with baselines? | (b) Missing witness at ranks 16–50 | 44 | Table or figure evidence; Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R317 | How many humans participated? | (c) Not supplied within 50 | gate | Split across chunks; Different wording / broad question versus specific passage terms | saved — eval/stage2-end-to-end-20261105/preparations.jsonl |
| R328 | What are the hyperparameters of the bi-GRU? | (c) Not supplied within 50 | gate | Split across chunks; Different wording / broad question versus specific passage terms | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R331 | What are the state of the art models? | (c) Not supplied within 50 | gate | Different wording / broad question versus specific passage terms | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R336 | Do they evaluate only on English datasets? | Supporting information already in final prompt | already supplied | Split across chunks | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R357 | Do they report results only on English data? | (c) Not supplied within 50 | gate | not assigned | saved — eval/stage2-end-to-end-20261105/preparations.jsonl |
| R367 | Do they remove seasonality from the time series? | (c) Not supplied within 50 | gate | not assigned | saved — eval/stage2-end-to-end-20261105/preparations.jsonl |
| R383 | What data do they look at? | (c) Not supplied within 50 | gate | Different wording / broad question versus specific passage terms | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R394 | How did they obtain the dataset? | (c) Not supplied within 50 | gate | Split across chunks; Different wording / broad question versus specific passage terms | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R402 | What is the meta knowledge specifically? | No verifiable complete gold passage | unverifiable | not assigned | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R412 | What is the size of the Chinese data? | (c) Not supplied within 50 | gate | Different wording / broad question versus specific passage terms | saved — eval/stage2-end-to-end-20261105/preparations.jsonl |
| R420 | what was their character error rate? | (b) Missing witness at ranks 16–50 | 16 | Table or figure evidence; Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R454 | Which dataset do they use? | (b) Missing witness at ranks 16–50 | 36 | Different wording / broad question versus specific passage terms; Wrong-role dataset distractor | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R460 | What was their performance on emotion detection? | (c) Not supplied within 50 | not found | Table or figure evidence | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R464 | What crowdsourcing platform is used? | (b) Missing witness at ranks 16–50 | 26 | Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | computed now — four explicitly selected queries |
| R466 | Do they report results only on English data? | No verifiable complete gold passage | unverifiable | not assigned | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R467 | How many layers does the UTCNN model have? | (c) Not supplied within 50 | not found | Table or figure evidence | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R477 | Is the discriminator's reward made available at each step to the generator? | No verifiable complete gold passage | unverifiable | not assigned | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R478 | Is the data de-identified? | (c) Not supplied within 50 | gate | Different wording / broad question versus specific passage terms | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R481 | Do they experiment with other tasks? | No verifiable complete gold passage | unverifiable | not assigned | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R483 | Are the annotations automatic or manually created? | (c) Not supplied within 50 | gate | Split across chunks; Different wording / broad question versus specific passage terms | saved — eval/stage2-end-to-end-20261105/preparations.jsonl |
| R489 | Which languages are explored in this paper? | (b) Missing witness at ranks 16–50 | 27 | Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R492 | What labels do they create on their dataset? | (b) Missing witness at ranks 16–50 | 35 | Split across chunks; Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | saved — eval/question-only-same-paper-20261102/pdf.results.jsonl |
| R496 | What type of inflections are considered? | No verifiable complete gold passage | unverifiable | not assigned | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R498 | What is the size of the Chinese data? | (b) Missing witness at ranks 16–50 | 33 | Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | saved — eval/dev-retrieval-20261103/docx.results.jsonl |
| R531 | what language does this paper focus on? | (b) Missing witness at ranks 16–50 | 22 | Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | saved — eval/dev-retrieval-20261103/pdf.results.jsonl |
| R532 | Ngrams of which length are aligned using PARENT? | (b) Missing witness at ranks 16–50 | 19 | Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | computed now — four explicitly selected queries |
| R542 | How many tweets were collected? | Supporting information already in final prompt | already supplied | not assigned | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R545 | Did they use a crowdsourcing platform for annotations? | No verifiable complete gold passage | unverifiable | not assigned | not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence |
| R546 | Which two pairs of ERPs from the literature benefit from joint training? | (b) Missing witness at ranks 16–50 | 31 | Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer | computed now — four explicitly selected queries |
| R547 | What language is explored in this paper? | (c) Not supplied within 50 | gate | not assigned | saved — eval/stage2-end-to-end-20261105/preparations.jsonl |
| R554 | Do the authors conduct experiments on the tasks mentioned? | (c) Not supplied within 50 | gate | Different wording / broad question versus specific passage terms | saved — eval/stage2-end-to-end-20261105/preparations.jsonl |
| R557 | what were the baselines? | (c) Not supplied within 50 | gate | Table or figure evidence; Different wording / broad question versus specific passage terms | saved — eval/stage2-end-to-end-20261105/preparations.jsonl |

## 6. Full case evidence and provenance

### R011: What data do they look at?

Case ID: `docx/1608.01884/9a7ba5ed1779c664d2cac92494a43517d3e87c96`; paper `1608.01884`; formatdocx. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "WSC collection". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **WSC collection**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 19, pagenot recorded. Exact checked anchors:"WSC collection".

> . For instance, schema 23 from the WSC collection can be translated into both “The girls were bullying the boys so we [punished/rescued] them” and “The boys were bullying the girls, so we [punished/rescued] them,” thus avoiding any presupposition of whether girls are more likely to bully boys or vice versa.


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms. Generic data question versus collection name; actual hybrid ranking never ran. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/dev-retrieval-20261103/docx.results.jsonl (eval/dev-retrieval-20261103/docx.results.jsonl);location and patterns=computed now by the offline witness audit.

### R016: What is the Random Kitchen Sink approach?

Case ID: `pdf/2001.03131/a778b8204a415b295f73b93623d09599f242f202`; paper `2001.03131`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "Random Kitchen Sink method uses a kernel function to map data vectors to a space where linear separation is possible." / "explicitly maps data vectors to a space where linear separation is possible; RKS method provides an approximate kernel function via explicit mapping". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Explicit mapping permits linear separation**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 22, page 3. Exact checked anchors:"explicitly maps data vectors to a space where linear separation is possible".

> the important transitional dynamics of sentences. Also, for the signal representation of sentences, each word vector will act as a single point in the signal. For the present work, to generate DMD and HODMD based features, Fastext based embedding is used. 3. Proposed Approach RKS approach proposed in [26, 27], explicitly maps data vectors to a space where linear separation is pos- sible. It has been explored for natural language pro- cessing tasks [29, 30]. The RKS method provides an

- **Approximate kernel via explicit mapping**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 23, page 3. Exact checked anchors:"approximate kernel function via explicit mapping".

> approximate kernel function via explicit mapping. K(x1, x2) = 〈φ(x1), φ(x2)〉 ≈ 〈 Z(x1), Z(x2)〉 (4) Here, φ(.) denotes the implicit mapping function (used to compute kernel matrix), Z(.) denotes the explicit mapping function using RKS and Ωk denotes random variable . Z(x) = √1/k   Cos(xT Ω1) ... Cos(xT Ωk) S in(xT Ω1) ... S in(xT Ωk)   (5) Figure 1 show the block diagram of the proposed ap- proach.


**Pattern (computed now from saved text):** Split across chunks; Different wording / broad question versus specific passage terms. Question spells out Random Kitchen Sink; defining section uses RKS. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R030: what is the state of the art?

Case ID: `pdf/1608.06757/c2b8ee872b99f698b3d2082d57f9408a91e1b4c1`; paper `1608.06757`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "Babelfy, DBpedia Spotlight, Entityclassifier.eu, FOX, LingPipe MUC-7, NERD-ML, Stanford NER, TagMe 2". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **First compared systems**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 48, page 6. Exact checked anchors:"Babelfy"; "DBpedia Spotlight".

> Common Test Sets CoNLL2003 KORE50 ACE2004 MSNBC corpus RCV-1 RCV-1 newswire MSNBC news topic news (en) news (en) news (en) news (en) annotation guideline named entities named entities all mentions wikif cation Annotator MethodPrec Rec F1 Prec Rec F1 Prec Rec F1 Prec Rec F1 Babelfy POS+DICT53.8 70.4 61.0 72.1 73.6 72.9 12.1 42.2 18.8 43.3 77.8 55.6 DBpedia Spotlight DICT74.7 66.4 70.3 n/a n/a n/a 13.0 74.8 22.2 56.2 49.0 52.4

- **Remaining compared systems**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 49, page 6. Exact checked anchors:"Entityclassif er.eu"; "FOX"; "LingPipe MUC-7"; "NERD-ML"; "Stanford NER"; "TagMe 2".

> Entityclassif er.eu Noun phrase81.2 83.0 82.1 93.8 94.4 94.1 13.3 90.5 23.2 76.2 93.9 84.1 FOX Ensemble99.1 75.2 85.5 94.6 73.6 82.8 12.4 59.5 20.6 38.3 31.3 34.4 LingPipe MUC-7 LM+HMM91.5 66.6 77.1 93.9 86.1 89.9 16.3 88.9 27.5 73.3 78.7 75.9 NERD-ML Ensemble59.9 72.0 65.4 70.4 82.6 76.0 19.6 47.4 27.7 69.7 57.2 62.8 Stanford NER CRF+Dist99.5 76.1 86.2 94.8 76.4 84.6 18.2 90.9 30.3 95.2 84.1 89.3 TagMe 2 DICT68.3 47.7 56.2 66.5 88.2 75.8 23.2 71.6 35.0 55.6 38.0 45.2


**Pattern (computed now from saved text):** Split across chunks; Table or figure evidence; Different wording / broad question versus specific passage terms. Comparison-table row names answer vague state-of-art question. One model name has extraction spacing/ligature damage. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R037: Do they inspect their model to see if their model learned to associate image parts with words related to entities?

Case ID: `pdf/1802.07862/7cd22ca9e107d2b13a7cc94252aaa9007976b338`; paper `1802.07862`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:partial.

**Location:** Supporting information already in final prompt — earlier-gap-label-not-confirmed. The relevant supporting text is already in the final prompt.

**Needed evidence (saved):** reference alternatives are "true" / "true". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Inspection of image-aided modality attention**. Actual top 15 rank:9;k 50 rank:not found in available pool;present in final prompt:yes.

  Source chunk 63, page 7. Exact checked anchors:"we confirm that the modality attention successfully attenuates irrelevant signals".

> For the image-aided model (W+C+V; upper row in Figure 3), we confirm that the modality at- tention successfully attenuates irrelevant signals (e.g. selfies, etc.) and amplifies relevant modality- based contexts in prediction of a given token. In the example of “disney word essential = cof- fee” with visual tags selfie, phone, person, the modality attention successfully attenuates distract- ing visual signals and focuses on textual modali- ties, consequently making correct predictions. The

- **Qualitative named-entity analysis**. Actual top 15 rank:not found in available pool;k 50 rank:not found in available pool;present in final prompt:yes.

  Source chunk 64, page 7. Exact checked anchors:"visual contexts make stronger indicators for these named entities".

> named entities in the examples of “Beautiful night atop The Space Needle” and “Splash Mountain” are challenging to predict because they are com- posed of common nouns (space, needle, splash, mountain), and thus they often need additional contexts to correctly predict. In the training data, visual contexts make stronger indicators for these named entities (space needle, splash mountain), and the modality attention module successfully at- tends more to stronger signals.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 63: For the image-aided model (W+C+V; upper row in Figure 3), we confirm that the modality at- tention successfully attenuates irrelevant signals (e.g. selfies, etc.) and amplifies relevant modality- based contexts in prediction of a given token. In the example of “disney word essential = cof- fee” with visual tags selfie, phone, person, the modality attention successfully attenuates distract- ing visual signals and focuses on textual modali- ties, consequently making correct predictions. The
- Chunk 64: named entities in the examples of “Beautiful night atop The Space Needle” and “Splash Mountain” are challenging to predict because they are com- posed of common nouns (space, needle, splash, mountain), and thus they often need additional contexts to correctly predict. In the training data, visual contexts make stronger indicators for these named entities (space needle, splash mountain), and the modality attention module successfully at- tends more to stronger signals.

**Pattern (computed now from saved text):** Split across chunks; Table or figure evidence. The human-marked qualitative support is already in the prompt. Pixel-region/word attention is narrower than the modality-attention experiment; retain the saved borderline note. Qualification: Annotated support present; precise image-part wording remains ambiguous.

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4137 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:true;reachable with±2:true. Reviewed witness chunks cost at most 214 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R050: Do they train their model starting from a checkpoint?

Case ID: `pdf/1909.03405/7b4fb6da74e6bd1baea556788a02969134cf0800`; paper `1909.03405`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "false" / "false". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. Gate rejected. Training schedule/pretraining paragraphs 32–34 are available, but they do not explicitly say training started without a checkpoint.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 32: • IsNextInadj: Choosing the in-adjacent following sen- tence as B. There is a sentence between A and B. • IsPrevInadj: Choosing the in-adjacent previous sen- tence as B. There is a sentence between A and B. • DiffDoc: Drawing B randomly from a different docu- ment. 4 Experiment Settings This section gives detailed experiment settings. The method is evaluated on the BERTbase model, which has 12 layers, 12 self-attention heads with a hidden size of 768.
- Chunk 33: To accelerate the training speed, two-phase training (De- vlin et al. 2018) is adopted. The first phase uses a maximal sentence length of 128, and 512 for the second phase. The numbers of training steps of two phases are 50K and 40K for the BERTBase model. We used AdamW (Loshchilov and Hutter 2019) optimizer with a learning rate of 1e-4, a β1 of 0.9, a β2 of 0.999 and a L2 weight decay rate of 0.01. The first 10% of the total steps are used for learning rate
- Chunk 34: warming up, followed by the linear decay schema. We used a dropout probability of 0.1 on all layers. The data used for pre-training is the same as BERT, i.e., English Wikipedia (2500M words) and BookCorpus (800M words) (Zhu et al. 2015). For the Masked LM task, we followed the same masking rate and settings as in BERT. We explore three method settings for comparison. • BERT-PN: The NSP task in BERT is replaced by a 3-class task with IsNext, IsPrev and DiffDoc. The label distribution is 1:1:1.

**Pattern (computed now from saved text):** not assigned. Gate rejected. Training schedule/pretraining paragraphs 32–34 are available, but they do not explicitly say training started without a checkpoint. Qualification: Negative reference not fully supported by marked passage.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/stage2-end-to-end-20261105/preparations.jsonl (eval/stage2-end-to-end-20261105/preparations.jsonl);location and patterns=computed now by the offline witness audit.

### R056: Does the corpus contain only English documents?

Case ID: `docx/1704.04452/8e44c02c2d9fa56fb74ace35ee70a5add50b52ae`; paper `1704.04452`; formatdocx. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** No verifiable complete gold passage — no-verifiable-complete-answer-witness. No trustworthy complete answer passage established.

**Needed evidence (saved):** reference alternatives are "true" / "[unanswerable]" / "[unanswerable]". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. One yes annotation and two unanswerable annotations. Marked corpus-creation/English figure examples do not establish an English-only corpus; no explicit English-only statement found in saved indexed text.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 9: To overcome these issues, we present a corpus creation method that effectively combines automatic preprocessing, scalable crowdsourcing and high-quality expert annotations. Using it, we can avoid the high effort for single annotators, allowing us to scale to document clusters that are 15 times larger than in traditional summarization corpora
- Chunk 10: . We created a new corpus of 30 topics, each with around 40 source documents on educational topics and a summarizing concept map that is the consensus of many crowdworkers (see Figure FIGREF3 ).
- Chunk 76: In addition to the variety of genres, the documents also differ in terms of language use. To capture this property, we follow Zopf.2016 and compute, for every topic, the average Jensen-Shannon divergence between the word distribution of one document and the word distribution in the remaining documents. The higher this value is, the more the language differs between documents. We found the average divergence over all topics to be 0.3490, whereas it is 0.3019 in DUC 2004 and 0.3188 in TAC 2008A.

**Pattern (computed now from saved text):** not assigned. One yes annotation and two unanswerable annotations. Marked corpus-creation/English figure examples do not establish an English-only corpus; no explicit English-only statement found in saved indexed text. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R058: Does their model suffer exhibit performance drops when incorporating word importance?

Case ID: `pdf/1909.00326/384bf1f55c34b36cb03f916f50bbefade6c86a75`; paper `1909.00326`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** No verifiable complete gold passage — no-verifiable-complete-answer-witness. No trustworthy complete answer passage established.

**Needed evidence (saved):** reference alternatives are "false". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. False reference has no supporting evidence annotation. The paper measures perturbation-induced translation degradation; that is different from proving no drop when incorporating importance. No defensible missing-answer passage can be specified.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 36: timating word importance by the translation per- formance decrease. More specifically, unlike the usual way, we measure the decrease of translation performance when perturbing a set of important words that are of top-most word importance in a sentence. The more translation performance de- grades, the more important the word is. We use the standard BLEU score as the evalua- tion metric for translation performance. To make the conclusion more convincing, we conduct ex-
- Chunk 56: Transformer under the Mask perturbation. In all the cases, Attribution shows the best perfor- mance while Random achieves the worst result. More specifically, Attribution method shows similar translation quality degradation on all three language-pairs, which declines to around the half of the original BLEU score with five operations. 4.3 Comparison with Supervised Erasure There exists another straightforward method, Era- sure (Alvarez-Melis and Jaakkola, 2017; Arras
- Chunk 57: sure (Alvarez-Melis and Jaakkola, 2017; Arras et al., 2016; Zintgraf et al., 2017), which directly evaluates the word importance by measuring the translation performance degradation of each word. Specifically, it erases (i.e., Mask) one word from the input sentence each time and uses the BLEU score changes to denote the word importance (af- ter normalization).Mask Transformer BLEU 0 5 10 15 20 25 Number of Operations 0 1 2 3 4 5 Random Content Attribution RNN BLEU 5 10 15 20 25

**Pattern (computed now from saved text):** not assigned. False reference has no supporting evidence annotation. The paper measures perturbation-induced translation degradation; that is different from proving no drop when incorporating importance. No defensible missing-answer passage can be specified. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R072: What is the best reported system?

Case ID: `pdf/1701.05574/bbb77f2d6685c9257763ca38afaaef29044b4018`; paper `1701.05574`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "Gaze Sarcasm using Multi Instance Logistic Regression." / "the MILR classifier". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Best-performing MILR classifier**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 62, page 7. Exact checked anchors:"Multi Instance Logistic Regression: Best Performing Classifier"; "Gaze+Sarcasm".

> Sarcasm (Joshi et. al.) 59.9 78.7 72.1 61.4 77.6 71.9 60.6 78.2 72 0.39 Gaze 65.9 75.9 72.4 49.7 86 73.2 56.7 80.6 72.2 0.38 Gaze+Sarcasm 63.7 79.5 74 61.7 80.9 74.1 62.7 80.2 74 0.43 Multi Instance Logistic Regression: Best Performing Classifier Gaze 65.3 77.2 73 53 84.9 73.8 58.5 80.8 73.1 0.41 Gaze+Sarcasm 62.5 84 76.5 72.6 76.7 75.3 67.2 80.2 75.7 0.47 Table 3: Classification results for different feature combinations. P→ Precision, R→ Recall, F→ F˙score,


**Pattern (computed now from saved text):** Table or figure evidence; Different wording / broad question versus specific passage terms.  

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/dev-retrieval-20261103/pdf.results.jsonl (eval/dev-retrieval-20261103/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R078: Do they experiment with the toolkits?

Case ID: `pdf/1907.04433/5f2bade0881c719ab026bc2e2962e2ada96cdb25`; paper `1907.04433`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "true" / "true". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Explicit experiments with toolkit models**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 26, page 4. Exact checked anchors:"In the experiments, we compare model performance between GluonCV/NLP".

> natural language processing tasks. Specifically, we evaluate popular or state-of-the-art mod- els on standard benchmark data sets. In the experiments, we compare model performance between GluonCV/NLP and other open source implementations with Caffe, Caffe2, Theano, and TensorFlow, including ResNet (He et al., 2016) and MobileNet (Howard et al., 2017) for image classification (ImageNet), Faster R-CNN (Girshick, 2015) for object detection


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms. Toolkits is used generically in the question; source names GluonCV/NLP implementations. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/stage2-end-to-end-20261105/preparations.jsonl (eval/stage2-end-to-end-20261105/preparations.jsonl);location and patterns=computed now by the offline witness audit.

### R089: What are the deep learning architectures used in the task?

Case ID: `pdf/1910.05603/53f74250948015c394e7b8438a2041fdeb330911`; paper `1910.05603`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "DNN-based acoustic model BIBREF0" / "[unanswerable]". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **DNN acoustic architecture**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 6, page 1. Exact checked anchors:"DNN-based acoustic model"; "11 hidden layers".

> inference process. A. Acoustic Model We adopt a DNN-based acoustic model [1] with 11 hidden layers and the alignment used to train the model is derived from a HMM-GMM model trained with SAT criterion. In a conventional Gaussian Mixture Model - Hidden Markov Model (GMM-HMM) acoustic model, the state emission log- likelihood of the observation feature vector ot for certain tied state sj of HMMs at time t is computed as log p(ot\|sj ) = log M∑ m=1 πjmN(ot\|sj ) (1)


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms. One reference is unanswerable, another gives the explicit DNN acoustic model. Qualification: Mixed answerability.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/stage2-end-to-end-20261105/preparations.jsonl (eval/stage2-end-to-end-20261105/preparations.jsonl);location and patterns=computed now by the offline witness audit.

### R099: Do they report results only on English data?

Case ID: `pdf/1703.10344/77c34f1033702278f7f044806c1eba0c6ecb8b04`; paper `1703.10344`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** No verifiable complete gold passage — no-verifiable-complete-answer-witness. No trustworthy complete answer passage established.

**Needed evidence (saved):** reference alternatives are "true" / "true". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. Marked paragraphs describe Wikipedia/news collection, not English-only evaluation. The only explicit English Wikipedia mention is introductory background, not a dataset language restriction.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 6: c© 2015 ACM. ISBN 978-1-4503-3794-6/15/10 ...$15.00. DOI: http://dx.doi.org/10.1145/2806416.2806531. Figure 1: Comparing how cyclones are reported in Wikipedia entity pages. Wikipedia is the largest source of open and collabora- tively curated knowledge in the world. Introduced in 2001, it has evolved into a reference work with around 5m pages for the English Wikipedia alone. In addition, entities and event pages are updated quickly via collaborative editing
- Chunk 18: trunk entities. Afterwards, based on the constructed tem- plate our method determines the best fit for the news article with one of the sections. We evaluate the proposed approach on a news corpus con- sisting of 351,982 articles crawled from the news external references in Wikipedia from 73,734 entity pages. Given the Wikipedia snapshot at a given year (in our case [2009-2014]), we suggest news articles that might be cited in the coming
- Chunk 83: revision history. The generated data represents one of the contributions of our paper.7 The datasets are the following: Entity Classes. We focus on a manually predetermined set of entity classes for which we expect to have news cover- age. The number of analyzed entity classes is 27, including 73, 734 entities with at least one news reference. The entity classes were selected from the DBpedia class ontology. Fig- ure 3 shows the number of entities per class for the years (2009-2014).
- Chunk 85: # Instances Figure 3: Number of entities with at least one news reference for different entity classes. News Articles. We extract all news references from the collected Wikipedia entity pages.8 The extracted news ref- erences are associated with the sections in which they ap- pear. In total there were 411, 673 news references, and after crawling we end up with 351, 982 successfully crawled news articles. The details of the news article distribution, and the

**Pattern (computed now from saved text):** not assigned. Marked paragraphs describe Wikipedia/news collection, not English-only evaluation. The only explicit English Wikipedia mention is introductory background, not a dataset language restriction. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R100: What predictive model do they build?

Case ID: `pdf/1609.00425/a87a009c242d57c51fc94fe312af5e02070f898b`; paper `1609.00425`; formatpdf. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 27.

**Needed evidence (saved):** reference alternatives are "logistic regression models" / "logistic regression models based on unigram bag-of-words features (BOW), sentiment signals (SENT), the linguistic features from our earlier analyses (LING), and combinations of these features.". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Logistic regression model**. Actual top 15 rank:not found in available pool;k 50 rank:27;present in final prompt:no.

  Source chunk 45, page 5. Exact checked anchors:"predictions of logistic regression models".

> This means the classes are balanced, with 2,500 total comments in the Reddit training data and 500 total comments in the New York Times testing data. We compare the predictions of logistic regression models based on unigram bag-of-words features (BOW), sentiment signals2 (SENT), the linguistic 2For SENT, we use normalized word counts from LIWC’s positive and negative emotional categories.


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. Generic predictive-model/task description outranks explicit classifier definition. 

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4151 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:true. Reviewed witness chunks cost at most 89 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/dev-retrieval-20261103/pdf.results.jsonl (eval/dev-retrieval-20261103/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R106: Do they evaluate only on English datasets?

Case ID: `docx/1701.08229/00c57e45ac6afbdfa67350a57e81b4fad0ed2885`; paper `1701.08229`; formatdocx. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** No verifiable complete gold passage — no-verifiable-complete-answer-witness. No trustworthy complete answer passage established.

**Needed evidence (saved):** reference alternatives are "true" / "true". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. Marked Twitter/depression methods passage and English example tweets are already supplied, but they do not explicitly establish that every evaluated dataset is English. Country or example language is not proof of exclusivity.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 10: # METHODS  Specifically, we conducted a feature ablation study to assess the informativeness of each feature group and a feature elimination study to determine the optimal feature sets for classifying Twitter tweets. We leveraged an existing, annotated Twitter dataset that was constructed based on a hierarchical model of depression-related symptoms BIBREF12 , BIBREF13 . The dataset contains 9,473 annotations for 9,300 tweets
- Chunk 11: . Each tweet is annotated as no evidence of depression (e.g., “Citizens fear an economic depression") or evidence of depression (e.g., “depressed over disappointment"). If a tweet is annotated evidence of depression, then it is further annotated with one or more depressive symptoms, for example, depressed mood (e.g., “feeling down in the dumps"), disturbed sleep (e.g., “another restless night"), or fatigue or loss of energy (e.g., “the fatigue is unbearable") BIBREF10
- Chunk 12: . For each class, every annotation (9,473 tweets) is binarized as the positive class e.g., depressed mood=1 or negative class e.g., not depressed mood=0.

**Pattern (computed now from saved text):** not assigned. Marked Twitter/depression methods passage and English example tweets are already supplied, but they do not explicitly establish that every evaluated dataset is English. Country or example language is not proof of exclusivity. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R132: Do the authors conduct experiments on the tasks mentioned?

Case ID: `pdf/1608.01884/1dc2da5078a7e5ea82ccd1c90d81999a922bc9bf`; paper `1608.01884`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "true" / "false". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Concrete translation-system probes**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 20, page 4. Exact checked anchors:"Google Translate (GT), Bing Translate, and Yandex".

> is a group of women. For instance, the sentence “The girls sang a song and they danced” is translated into French as “Les filles ont chant´e une chanson et ils ont dans´e” by Google Translate (GT), Bing Translate, and Yandex. In fact, I have been unable to construct any sentence in English that is translated into any language using the feminine plural pronun. Note that, since the masculine plural pronoun is used for groups of mixed gender in all these


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms. Yes/no annotations conflict: qualitative probes exist, but a formal benchmark-experiment reading could give no. Qualification: Contradictory yes/no reference; witness supports qualitative testing only.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/stage2-end-to-end-20261105/preparations.jsonl (eval/stage2-end-to-end-20261105/preparations.jsonl);location and patterns=computed now by the offline witness audit.

### R174: Why are current ELS's not sufficiently effective?

Case ID: `pdf/1806.05504/ef7212075e80bf35b7889dc8dd52fcbae0d1400a`; paper `1806.05504`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "Linked entities may be ambiguous or too common" / "linked entities extracted from ELS's have issues because of low precision rates BIBREF11 and design challenges in training datasets BIBREF12 . These issues can be summarized into two parts: ambiguity and coarseness.; the linked entities may also be too common to be considered an entity.". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Ambiguity issue**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 20, page 3. Exact checked anchors:"ambiguity and coarseness".

> 2.2 Possible issues Despite its usefulness, linked entities extracted from ELS’s have issues because of low precision rates (Hasibi et al., 2016) and design challenges in training datasets (Ling et al., 2015). These issues can be summarized into two parts: ambiguity and coarseness. First, the extracted entities may be ambiguous. In the example, the entity “South Korean” is am- biguous because it can refer to both the South Korean person and the South Korean language,

- **Common/irrelevant linked entities**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 22, page 3. Exact checked anchors:"linked entities may also be too common to be considered an entity".

> ambiguity problems. Second, the linked entities may also be too com- mon to be considered an entity. This may intro- duce errors and irrelevance to the summary. In the example, “Wednesday” is erroneous because it is wrongly linked to the entity “Wednesday Night Baseball”. Also, “swap” is irrelevant because al- though it is linked correctly to the entity “Trade (Sports)”, it is too common and irrelevant when generating the summaries. In our experimental


**Pattern (computed now from saved text):** Split across chunks; Different wording / broad question versus specific passage terms.  

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R187: What biases does their model capture?

Case ID: `pdf/1910.12574/96a4091f681872e6d98d0efee777d9e820cb8dae`; paper `1910.12574`; formatpdf. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** (c) Not supplied within 50 — mapped-witness-not-in 50. Not complete in the available top 50, or representation unavailable.

**Needed evidence (saved):** reference alternatives are "Data annotation biases where tweet containing disrespectful words are annotated as hate or offensive without any presumption about the social context of tweeters". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Annotation bias ignores speaker social context**. Actual top 15 rank:not found in available pool;k 50 rank:not found in available pool;present in final prompt:no.

  Source chunk 68, page 10. Exact checked anchors:"annotators tended to annotate many samples containing disrespectful words as hate or offensive without any presumption about the social context of tweeters".

> tions do not confirm the low performance of our classifier because annotators tended to annotate many samples containing disrespectful words as hate or of- fensive without any presumption about the social context of tweeters such as the speakers identity or dialect, whereas they were just offensive or even neither tweets. Tweets IDs 6, 8, and 10 are some samples containing offensive words and slurs which arenot hate or offensive in all cases and writers of them used this


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. Specific clause is the next chunk after retrieved 67; current budget did not retain that neighbour. 

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4151 newly supplies all witnesses:true;all witnesses reachable in current±1 neighbour candidate set:true;reachable with±2:true. Reviewed witness chunks cost at most 101 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R193: What are the models used for the baseline of the three NLP tasks?

Case ID: `pdf/1912.01772/5cc2daca2a84ddccba9cdd9449e51bb3f64b3dde`; paper `1912.01772`; formatpdf. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** (c) Not supplied within 50 — mapped-witness-not-in 50. Not complete in the available top 50, or representation unavailable.

**Needed evidence (saved):** reference alternatives are "state-of-the-art Transformer architecture; Kaldi; speech clustergen statistical speech synthesizer" / "For speech synthesis, they build a speech clustergen statistical speech synthesizer BIBREF9. For speech recognition, they use Kaldi BIBREF11. For Machine Translation, they use a Transformer architecture from BIBREF15.". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Speech synthesis implementation**. Actual top 15 rank:not found in available pool;k 50 rank:not found in available pool;present in final prompt:no.

  Source chunk 41, page 4. Exact checked anchors:"built a speech clustergen statistical speech synthesizer".

> This gave us 13 hours and 48 minutes of speech. We phonetically aligned this data and built a speech clus- tergen statistical speech synthesizer (Black, 2006) from all of this data. We resynthesized all of the data and mea- sured the difference between the synthesized data and the original data using Mel Cepstral Distortion, a standard method for automatically measuring quality of speech gen- eration (Kominek et al., 2008). We then ordered the seg-

- **Speech recognition implementation**. Actual top 15 rank:not found in available pool;k 50 rank:24;present in final prompt:yes.

  Source chunk 44, page 4. Exact checked anchors:"For speech recognition (ASR) we used Kaldi".

> 10k 6.26 0.3 1.09 0.1 Results on test set 220k (all) 20.4 0.5 12.9 0.4 100k 16.9 0.4 6.4 0.2 50k 13.3 0.4 1.1 0.1 10k 7.8 0.3 0.7 0.1 Table 3: Machine Translation Results Speech Recognition For speech recognition (ASR) we used Kaldi (Povey et al., 2011). As we do not have ac- cess to pronunciation lexica for Mapudungun, we had to approximate them with two settings. In the first setting, we made the simple assumption that each character corre-

  Source chunk 46, page 4. Exact checked anchors:"we used the nnet training recipe from Kaldi".

> 60%, and employing the phonemes from generated lexicon, we achieved 30% phone error rate. For both these systems, we used the nnet training recipe from Kaldi. Naturally, these results are relatively far from the quality of ASR sys- tems trained on large amounts of clean data such as those available in English. Given the quality of the recordings, and the lack of additional resources, we consider our re- sults fairly reasonable and they would still be usable for

- **Translation implementation**. Actual top 15 rank:not found in available pool;k 50 rank:41;present in final prompt:no.

  Source chunk 48, page 4. Exact checked anchors:"Transformer architecture".

> Mapudungun and Spanish in both directions, using state- of-the-art Transformer architecture (Vaswani et al., 2017) with the toolkit of (Nguyen and Salazar, 2019). We train our systems at the subword level using Byte-Pair Encod- ing (Sennrich et al., 2016) with a vocabulary of 5000 sub- words, shared between the source and target languages. We use five layers for each of the encoder and the decoder, an embedding size of 512, feed forward transformation


**Pattern (computed now from saved text):** Split across chunks; Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. Three task-specific methods lie in different parts of the baseline section. Bibliography hits naming tools do not establish the target task/method relationship. 

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4143 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:true. Reviewed witness chunks cost at most 418 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R244: What is the benchmark dataset and is its quality high?

Case ID: `pdf/1604.08504/a1645d0ba50e4c29f0feb806521093e7b1459081`; paper `1604.08504`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "Social Honeypot dataset (public) and Weibo dataset (self-collected); yes" / "Social Honeypot, which is not of high quality". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Benchmark dataset identities**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 24, page 3. Exact checked anchors:"public dataset Social Honeypot dataset"; "self-collected dataset Weibo dataset".

> We use one public dataset Social Honeypot dataset and one self-collected dataset Weibo dataset to vali- date the effectiveness of our proposed features. Social Honeypot Dataset: Lee et al. (2010) cre- ated and deployed 60 seed social accounts on Twitter to attract spammers by reporting back what accounts interact with them. They collected 19,276 legitimate users and 22,223 spammers in their datasets along with their tweet content in 7 months. This is our first test dataset.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 24: We use one public dataset Social Honeypot dataset and one self-collected dataset Weibo dataset to vali- date the effectiveness of our proposed features. Social Honeypot Dataset: Lee et al. (2010) cre- ated and deployed 60 seed social accounts on Twitter to attract spammers by reporting back what accounts interact with them. They collected 19,276 legitimate users and 22,223 spammers in their datasets along with their tweet content in 7 months. This is our first test dataset.
- Chunk 28: experiments on the employed datasets, we first delete some accounts with few posts in the two employed since the number of tweets is highly in- dicative of spammers. For the English Honeypot dataset, we remove stopwords, punctuations, non- ASCII words and apply stemming. For the Chi- nese Weibo dataset, we perform segmentation with "Jieba"2, a Chinese text segmentation tool. Af- ter preprocessing steps, the Weibo dataset contains 2197 legitimate users and 802 spammers, and the
- Chunk 29: 2197 legitimate users and 802 spammers, and the honeypot dataset contains 2218 legitimate users and 2947 spammers. It is worth mentioning that the Honeypot dataset has been slashed because most of the Twitter accounts only have limited number of posts, which are not enough to show their interest inclination. Predicted Polluter Legitimate Actual Polluter TP FN Legitimate FP TN Table 2: Confusion matrix 1Tianchi Site http://tianchi.aliyun.com 2Jieba Project Page https://github.com/fxsjy/jieba
- Chunk 35: al. (2011)(Table 4). Two classifiers (Adaboost and SVM) are selected to conduct feature performance comparisons. Using Adaboost, our LOSS+GOSS features outperform all other features except for UFN which is 2% higher than ours with regard to precision on the Honeypot dataset. It is caused by the incorrectly classified spammers who are mostly news source after our manual check. They keep posting all kinds of news pieces covering diverse topics, which is similar to the behavior of fake ac-

**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms. Dataset identities are explicit; quality yes/no references conflict, with filtering and misclassification caveats in 28–29/35. Qualification: Dataset identity verified; binary quality judgment ambiguous.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R249: How much is performance improved on NLI?

Case ID: `pdf/1909.03405/bdc91d1283a82226aeeb7a2f79dbbc57d3e84a1a`; paper `1909.03405`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are " improvement on the RTE dataset is significant, i.e., 4% absolute gain over the BERTBase" / "The average score improved by 1.4 points over the previous best result.". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **RTE/NLI improvement**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 42, page 4. Exact checked anchors:"4% absolute gain over the BERTBase".

> epochs for all the tasks, with a learning rate of 2e-5. The predictions were obtained by evaluating the training check- point with the best validation performance. Table 2 illustrates the experimental results, showing that our method is beneficial for all of NLI tasks. The improve- ment on the RTE dataset is significant, i.e., 4% absolute gain over the BERTBase. Besides NLI, our model also per- forms better than BERTBase in the STS task. The STS tasks


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms. Accepts the RTE improvement reference alternative; no need to union it with average 1.4 points alternative. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R258: What accuracy does the proposed system achieve?

Case ID: `pdf/1801.05147/ef4dba073d24042f24886580ae77add5326f2130`; paper `1801.05147`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "F1 scores of 85.99 on the DL-PS data,  75.15 on the EC-MT data and 71.53 on the EC-UQ data " / "F1 of 85.99 on the DL-PS dataset (dialog domain); 75.15 on EC-MT and 71.53 on EC-UQ (e-commerce domain)". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **DL-PS table schema/result**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 65, page 6. Exact checked anchors:"Model P R F1"; "ALCrowd 89.56 82.70 85.99".

> the source code provided by the authors. • LSTM-CRF: Our baseline system trained on the crowd- sourcing labeled data. • LSTM-CRF-VT: Our baseline system trained on the voted corpus, which is the same as CRF-VT. 1https://code.google.com/archive/p/word2vec 2http://www.chokkan.org/software/crfsuite/ Model P R F1 CRF 89.48 70.38 78.79 CRF-VT 85.16 65.07 73.77 CRF-MA 72.83 90.79 80.82 LSTM-CRF 90.50 79.97 84.91 LSTM-CRF-VT 88.68 75.51 81.57 LSTM-Crowd 86.40 83.43 84.89 ALCrowd 89.56 82.70 85.99

- **Both ecommerce table results**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 66, page 6. Exact checked anchors:"ALCrowd 76.33 74.00 75.15"; "ALCrowd 74.72 68.60 71.53".

> ALCrowd 89.56 82.70 85.99 Table 2: Main results on the DL-PS data. Model Data: EC-MT P R F1 CRF 75.12 66.67 70.64 LSTM-CRF 75.02 72.84 73.91 LSTM-Crowd 73.81 75.18 74.49 ALCrowd 76.33 74.00 75.15 Data: EC-UQ CRF 65.45 55.33 59.96 LSTM-CRF 71.96 66.55 69.15 LSTM-Crowd 67.51 71.10 69.26 ALCrowd 74.72 68.60 71.53 Table 3: Main results on the EC-MT and EC-UQ datasets. • LSTM-Crowd: The LSTM-CRF model with crowd anno- tation learning proposed by Nguyen et al. (2017). We use


**Pattern (computed now from saved text):** Split across chunks; Table or figure evidence; Different wording / broad question versus specific passage terms.  

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R271: What are the distinctive characteristics of how Arabic speakers use offensive language?

Case ID: `pdf/2004.02192/55507f066073b29c1736b684c09c045064053ba9`; paper `2004.02192`; formatpdf. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 49.

**Needed evidence (saved):** reference alternatives are "Frequent use of direct animal name calling, using simile and metaphors, through indirect speech like sarcasm, wishing evil to others, name alteration, societal stratification, immoral behavior and sexually related uses." / "Direct name calling; Simile and metaphor; Indirect speech; Wishing Evil; Name alteration; Societal stratification; Immoral behavior; Sexually related". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Name calling**. Actual top 15 rank:2;k 50 rank:2;present in final prompt:yes.

  Source chunk 40, page 4. Exact checked anchors:"Direct name calling".

> sive to better understand how Arabic speakers use offensive language. Here is a breakdown of usage: Direct name calling: The most frequent attack is to call a person an animal name, and the most used

- **Simile/metaphor**. Actual top 15 rank:not found in available pool;k 50 rank:30;present in final prompt:no.

  Source chunk 43, page 5. Exact checked anchors:"Simile and metaphor".

> “microbe”) and I. ÀAj£ (“THAlb” – “algae”); inan- imate objects such as È”Qk. (“jzmp” – “shoes”) and …¢É (“sTl” – “bucket”) among other usages. Simile and metaphor: Users use simile and Figure 3: Gender distribution for offensive language and its sub-categoriesDisability/Diseases Gender Social Class/Job Religion Sport Affiliation Origin (race, ethnicity, nationality) Political Ideology 0 0.1 0.2 0.3 0.4 Figure 4: Distribution of Hate Speech Types. Note: A tweet may have more than one type.

- **Indirect speech**. Actual top 15 rank:not found in available pool;k 50 rank:36;present in final prompt:no.

  Source chunk 46, page 6. Exact checked anchors:"Indirect speech".

> (Nawal is female name)”) and ¯QKP ¯ XAK (“nAdy zyzy” – “Zizi’s club (Zizi is a female nickname)”). Indirect speech: This includes: sarcasm such as ΩK@Òk@ ˙ªX @ (“A*kY AxwAtk” – “smartest one of your siblings”) and Q“mÃ'@ ¨ÒÇ JØ (“fylswf AlH- myr” – “the donkeys’ philosopher”); questions such as ËX ZAJ. ™À@ …ø ÈK @ (“Ayh kl AlgbA dh” – “what is all this stupidity”); and indirect speech such as Q“J” Q´ ’Á' AÓD.À@ ©” ÄAÆJÀ@ (“AlnqA$ mE AlbhAym gyr mvmr” – “no use arguing with cat- tle”).

- **Wishing evil/name alteration**. Actual top 15 rank:not found in available pool;k 50 rank:49;present in final prompt:no.

  Source chunk 47, page 6. Exact checked anchors:"Wishing Evil"; "Name alteration".

> tle”). Wishing Evil: This entails wishing death or ma- jor harm to befall someone such as ºYgAK AJK. P (“rbnA yAxdk” – “May God take (kill) you”), ΩJ™ K È<À@ (“Allh ylEnk” – “may God curse you”), and ÈJÎ@X ˙Ø hP (“rwH fy dAhyp” – equivalent to “go to hell”). Name alteration: One common way to insult oth- ers is to change a letter or two in their names to pro- duce new offensive words that rhyme with the orig- inal names. Some such examples include chang-

- **Social strata**. Actual top 15 rank:not found in available pool;k 50 rank:39;present in final prompt:yes.

  Source chunk 48, page 6. Exact checked anchors:"Societal stratification".

> inal names. Some such examples include chang- ing ËQKQm.Ã'@ (“Aljzyrp” – “Aljazeera (channel)”) to ËQKQmÃ'@ (“Alxnzyrp” – “the pig”) and ‡AÆ g (“xl- fAn” – “Khalfan (person name)”) to ‡AØQk (“xrfAn” – “crazed”). Societal stratification: Some insults are associ- ated with: certain jobs such as H. @ÒK. (“bwAb” – “doorman”) or –XAg (“xAdm” – “servant”); and specific societal components such ¯ YK. (“bdwy” – “bedouin”) and hCØ (“flAH” – “farmer”). Immoral behavior: These insults are associated

- **Moral/sexual categories**. Actual top 15 rank:5;k 50 rank:5;present in final prompt:yes.

  Source chunk 49, page 6. Exact checked anchors:"Immoral behavior"; "Sexually related".

> Immoral behavior: These insults are associated with negative moral traits or behaviors such as Q Æk (“Hqyr” – “vile”), ·K Ag (“xAyn” – “traitor”), and áØAJ” (“mnAfq” – “hypocrite”). Sexually related: They include expressions such as »Òk (“xwl” – “gay”), ÈmÖ (“wsxp” – “prosti- tute”), and êQ´ (“ErS” – “pimp”). Figure 5 shows the top words with the highest valance scores for individual words in the offensive tweets. Larger fonts are used to highlight words


**Pattern (computed now from saved text):** Split across chunks; Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. Long category inventory split over several chunks; top hits supply only some categories. 

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4145 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:false. Reviewed witness chunks cost at most 932 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/dev-retrieval-20261103/pdf.results.jsonl (eval/dev-retrieval-20261103/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R283: What type of classifiers are used?

Case ID: `pdf/1912.00667/bc730e4d964b6a66656078e2da130310142ab641`; paper `1912.00667`; formatpdf. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 16.

**Needed evidence (saved):** reference alternatives are "probabilistic model" / "Logistic Regression; Multilayer Perceptron". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Named experimental classifiers**. Actual top 15 rank:not found in available pool;k 50 rank:16;present in final prompt:no.

  Source chunk 50, page 5. Exact checked anchors:"Logistic Regression (LR)"; "Multilayer Perceptron (MLP)".

> lated to ‘politician’ and ‘death’ (such as ‘bureaucrat’, ‘dead’ etc.) For each dataset, we randomly select 500 tweets from the unlabeled subset and manually label them for evaluation. Table 1 shows key statistics from our two datasets. Comparison Methods. To demonstrate the generality of our approach on different event detection models, we con- sider Logistic Regression (LR) (Ritter et al. 2015) and Mul- tilayer Perceptron (MLP) (Chambers, Fry, and McMasters


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. Ranks refer to concrete LR/MLP reference. Another, weaker reference says only probabilistic model, which is already in the prompt. Qualification: Conditional evidence gap: generic reference alternative already covered.

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4151 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:true. Reviewed witness chunks cost at most 122 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/dev-retrieval-20261103/pdf.results.jsonl (eval/dev-retrieval-20261103/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R287: Is it valid to presume a bad medical wikipedia article should not contain much domain-specific jargon?

Case ID: `docx/1603.01987/6a633811019e9323dc8549ad540550d27aa6d972`; paper `1603.01987`; formatdocx. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** No verifiable complete gold passage — no-verifiable-complete-answer-witness. No trustworthy complete answer passage established.

**Needed evidence (saved):** reference alternatives are "[unanswerable]" / "false". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. The selected annotation discusses infobox presence across quality classes, not whether low-quality articles contain little jargon. Its relevant infobox paragraph is already in the final prompt. Other reference says unanswerable; no verified jargon-specific target.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 43: The idea of considering infoboxes is not novel: for example, in BIBREF7 the authors noticed that the presence of an infobox is a characteristic featured by good articles. However, in the specific case of the Medicine Portal, the presence of an infobox does not seem strictly related to the quality class the article belongs to (according to the manual labelling). Indeed, it is recurrent that articles, spanning all classes, have an infobox, containing a schematic synthesis of the article
- Chunk 44: . In particular, pages with descriptions of diseases usually have an infobox with the medical standard code of the disease (i.e., IDC-9 and IDC-10), as in Figure 2 .

**Pattern (computed now from saved text):** not assigned. The selected annotation discusses infobox presence across quality classes, not whether low-quality articles contain little jargon. Its relevant infobox paragraph is already in the final prompt. Other reference says unanswerable; no verified jargon-specific target. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R297: What word level and character level model baselines are used?

Case ID: `pdf/1604.00727/7705dd04acedaefee30d8b2c9978537afb2040dc`; paper `1604.00727`; formatpdf. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 33.

**Needed evidence (saved):** reference alternatives are "None" / "Word-level Memory Neural Networks (MemNNs) proposed in Bordes et al. (2015)". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Expanded baseline model name**. Actual top 15 rank:not found in available pool;k 50 rank:16;present in final prompt:no.

  Source chunk 41, page 6. Exact checked anchors:"Memory Neural Networks (MemNNs)".

> aliases and 886 out of 1,034 unique predicates in the test set were present in the train set. For the proposed dataset, there are two evaluation settings, called FB2M and FB5M, respectively. The former uses a KB for candidate generation which is a sub- set of Freebase and contains 2M entities, while the latter uses subset of Freebase with 5M entities. In our experiments, the Memory Neural Networks (MemNNs) proposed in Bordes et al. (2015) serve

- **Explicit baseline role**. Actual top 15 rank:not found in available pool;k 50 rank:33;present in final prompt:no.

  Source chunk 42, page 6. Exact checked anchors:"serve as the baselines".

> (MemNNs) proposed in Bordes et al. (2015) serve as the baselines. For training, in addition to the 76K questions in the training set, the MemNNs use 3K training questions from WebQuestions (Berant et al., 2013), 15M paraphrases from WikiAnswers (Fader et al., 2013), and 11M and 12M automatically gener- ated questions from the KB for the FB2M and FB5M settings, respectively. In contrast, our models are trained only on the 76K questions in the training set.


**Pattern (computed now from saved text):** Split across chunks; Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. The top 15/final prompt already includes a Word MemNN comparison table. Missing prose expands the name and explicitly calls it the baseline. None versus MemNN references conflict. Qualification: Conditional gap: expanded name/role missing, abbreviation already present; saved partial judgment is debatable.

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4146 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:false. Reviewed witness chunks cost at most 238 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=computed now — four explicitly selected queries (eval/stage2-evidence-gaps-20261105/computed-rankings.jsonl);location and patterns=computed now by the offline witness audit.

### R306: HOw does the method perform compared with baselines?

Case ID: `pdf/1909.00015/f8c1b17d265a61502347c9a937269b38fc3fcab1`; paper `1909.00015`; formatpdf. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 44.

**Needed evidence (saved):** reference alternatives are "On the datasets DE-EN, JA-EN, RO-EN, and EN-DE, the baseline achieves 29.79, 21.57, 32.70, and 26.02  BLEU score, respectively. The 1.5-entmax achieves  29.83, 22.13, 33.10, and 25.89 BLEU score, which is a difference of +0.04, +0.56, +0.40, and -0.13 BLEU score versus the baseline. The α-entmax achieves 29.90, 21.74, 32.89, and 26.93 BLEU score, which is a difference of +0.11, +0.17, +0.19, +0.91 BLEU score versus the baseline.". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Complete BLEU comparison table**. Actual top 15 rank:not found in available pool;k 50 rank:44;present in final prompt:no.

  Source chunk 39, page 5. Exact checked anchors:"softmax 29.79 21.57 32.70 26.02"; "1.5-entmax 29.83 22.13 33.10 25.89"; "α-entmax 29.90 21.74 32.89 26.93".

> activation DEEN JAEN ROEN ENDE softmax 29.79 21.57 32.70 26.02 1.5-entmax 29.83 22.13 33.10 25.89 α-entmax 29.90 21.74 32.89 26.93 Table 1: Machine translation tokenized BLEU test results on IWSLT 2017 DEEN, KFTT JAEN, WMT 2016 ROEN and WMT 2014 ENDE, respectively. 5.1 High-Level Statistics What kind of α values are learned? Figure 2 shows the learning trajectories of the α parameters of a selected subset of heads. We generally observe a tendency for the randomly-initialized α parame-


**Pattern (computed now from saved text):** Table or figure evidence; Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. Narrative performance summary ranks before the numeric results table. 

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4147 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:true;reachable with±2:true. Reviewed witness chunks cost at most 180 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R317: How many humans participated?

Case ID: `docx/1609.00559/4dcf67b5e7bd1422e7e70c657f6eacccd8de06d3`; paper `1609.00559`; formatdocx. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "[unanswerable]" / "16". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **MayoSRS raters**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 49, pagenot recorded. Exact checked anchors:"nine medical coders and three physicians".

> MiniMayoSRS: The MayoSRS, developed by PakhomovPMMRC10, consists of 101 clinical term pairs whose relatedness was determined by nine medical coders and three physicians from the Mayo Clinic. The relatedness of each term pair was assessed based on a four point scale: (4.0) practically synonymous, (3.0) related, (2.0) marginally related and (1.0) unrelated. MiniMayoSRS is a subset of the MayoSRS and consists of 30 term pairs on which a higher inter–annotator agreement was achieved

- **UMNSRS raters**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 51, pagenot recorded. Exact checked anchors:"four medical residents".

> UMNSRS: The University of Minnesota Semantic Relatedness Set (UMNSRS) was developed by PakhomovMALPM10, and consists of 725 clinical term pairs whose semantic similarity and relatedness was determined independently by four medical residents from the University of Minnesota Medical School


**Pattern (computed now from saved text):** Split across chunks; Different wording / broad question versus specific passage terms. 12+4 yields annotated 16, but these are different resources and the passage does not prove participant uniqueness. Mixed answerability. Qualification: 16 is an inferred sum, not an explicit unique-participant total.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/stage2-end-to-end-20261105/preparations.jsonl (eval/stage2-end-to-end-20261105/preparations.jsonl);location and patterns=computed now by the offline witness audit.

### R328: What are the hyperparameters of the bi-GRU?

Case ID: `pdf/1907.09369/6b6d498546f856ac20958f666fc3fd55811347e2`; paper `1907.09369`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "They use the embedding layer with a size 35 and embedding dimension of 300. They use a dense layer with 70 units and a dropout layer with a rate of 50%.". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Embedding hyperparameters**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 27, page 3. Exact checked anchors:"300 dimensions"; "more than 35 terms".

> to its corresponding embedding vector. In our experiments, we tried various word embedding models but saw little dif- ference in their performance. Here we report the results for two which had the best performance among all, ConceptNet Numberbatch (Speer, Chin, and Havasi 2017) and fastText (Mikolov et al. 2018) both had 300 dimensions. As none of our tweets had more than 35 terms, we set the size of the embedding layer to 35 and added padding

- **Classifier/dropout hyperparameters**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 30, page 4. Exact checked anchors:"70 nodes"; "rate of 50%".

> These partial representations are then were concatenated to create out final hidden representation. For classification, the output of the concatenation is passed to a dense classifica- tion layer with 70 nodes along with a dropout layer with a rate of 50% to prevent over-fitting. The final layer is a sig- moid layer that generates the final output of the classifier returning the class probability. Experiment Minimal pre-processing was done by converting text to


**Pattern (computed now from saved text):** Split across chunks; Different wording / broad question versus specific passage terms. All requested settings also exist in prose; retrieving the figure image is unnecessary for these facts. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R331: What are the state of the art models?

Case ID: `pdf/1610.08815/3a6e843c6c81244c14730295cfb8b865cd7ede46`; paper `1610.08815`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "BIBREF9 ; BIBREF8 " / "BIBREF9 , BIBREF8". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Compared prior systems**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 63, page 8. Exact checked anchors:"Joshi et al., 2015"; "Pt´acek et al., 2014".

> useful for sarcasm detection. We also compare our approach with the best research study conducted on this dataset (Table 3). Both the proposed baseline model and the baseline + sentiment + emotion + personality model outperform the state of the art (Joshi et al., 2015; Pt´acek et al., 2014). One important difference with the state of the art is that (Pt´acek et al., 2014) used relatively larger feature vector size


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms. Original BIBREF placeholders are resolved using the actual indexed comparison paragraph. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R336: Do they evaluate only on English datasets?

Case ID: `pdf/1808.09111/5eabfc6cc8aa8a99e6e42514ef9584569cb75dec`; paper `1808.09111`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:partial.

**Location:** Supporting information already in final prompt — earlier-gap-label-not-confirmed. The relevant supporting text is already in the final prompt.

**Needed evidence (saved):** reference alternatives are "true" / "[unanswerable]". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Both task datasets**. Actual top 15 rank:not found in available pool;k 50 rank:not found in available pool;present in final prompt:yes.

  Source chunk 400, page 5. Exact checked anchors:"For both POS tagging and dependency parsing, we run experiments on the Wall Street Journal (WSJ) portion of the Penn Treebank".

> experimental setup. We then instantiate our ap- proach with Markov and DMV-structured syntax models, and report results on POS tagging and de- pendency grammar induction respectively. Lastly, we analyze the learned latent embeddings. 4.1 Data For both POS tagging and dependency parsing, we run experiments on the Wall Street Journal (WSJ) portion of the Penn Treebank.3 To create the ob- served data embeddings, we train skip-gram word embeddings (Mikolov et al., 2013) that are found

- **Corpus identified as English**. Actual top 15 rank:7;k 50 rank:not found in available pool;present in final prompt:yes.

  Source chunk 457, page 11. Exact checked anchors:"Building a large annotated corpus of english: The penn treebank".

> Laurens van der Maaten and Geoffrey Hinton. 2008. Visualizing data using t-sne. Journal of Machine Learning Research. Mitchell P Marcus, Mary Ann Marcinkiewicz, and Beatrice Santorini. 1993. Building a large annotated corpus of english: The penn treebank. Computa- tional linguistics, 19(2):313–330. Yishu Miao and Phil Blunsom. 2016. Language as a latent variable: Discrete generative models for sen- tence compression. In Proceedings of EMNLP. Tomas Mikolov, Kai Chen, Greg Corrado, and Jef-


**Pattern (computed now from saved text):** Split across chunks. Both marked dataset description and corpus-language bibliographic title are already in prompt. An English-only inference is debatable, but no supporting passage is missing. Qualification: Mixed annotation; English-only inference versus explicit statement. Indexed document also contains irrelevant base 64/markup noise.

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4150 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:true;reachable with±2:true. Reviewed witness chunks cost at most 269 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R357: Do they report results only on English data?

Case ID: `pdf/1912.00667/4ac2c3c259024d7cd8e449600b499f93332dab60`; paper `1912.00667`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "true" / "[unanswerable]". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. Gate rejected. Marked event-data collection paragraphs 48–50 do not explicitly establish English-only evaluation.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 48: death of politicians (PoliticianDeath). These event cate- gories are chosen as they are representative of important event types that are of interest to many governments and companies. The need to create our own dataset was mo- tivated by the lack of public datasets for event detection on microposts. The few available datasets do not suit our requirements. For example, the publicly available Events- 2012 Twitter dataset (McMinn, Moshfeghi, and Jose 2013)
- Chunk 49: contains generic event descriptions such as Politics, Sports, Culture etc. Our work targets more specific event cate- gories (Bhardwaj et al. 2019). Following previous studies (Ritter et al. 2015), we collect event-related microposts from Twitter using 11 and 8 seed events (see Section 2) for Cyber- Attack and PoliticianDeath, respectively. Unlabeled microp- osts are collected by using the keyword ‘hack’ for CyberAt- tack, while for PoliticianDeath, we use a set of keywords re-
- Chunk 50: lated to ‘politician’ and ‘death’ (such as ‘bureaucrat’, ‘dead’ etc.) For each dataset, we randomly select 500 tweets from the unlabeled subset and manually label them for evaluation. Table 1 shows key statistics from our two datasets. Comparison Methods. To demonstrate the generality of our approach on different event detection models, we con- sider Logistic Regression (LR) (Ritter et al. 2015) and Mul- tilayer Perceptron (MLP) (Chambers, Fry, and McMasters

**Pattern (computed now from saved text):** not assigned. Gate rejected. Marked event-data collection paragraphs 48–50 do not explicitly establish English-only evaluation. Qualification: Mixed answerability; no verified English-only target.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/stage2-end-to-end-20261105/preparations.jsonl (eval/stage2-end-to-end-20261105/preparations.jsonl);location and patterns=computed now by the offline witness audit.

### R367: Do they remove seasonality from the time series?

Case ID: `docx/1610.09225/3611a72f754de1e256fbd25b012197e1c24e8470`; paper `1610.09225`; formatdocx. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "[unanswerable]" / "false". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. Gate rejected. Preprocessing paragraph 22 describes filling missing prices, not an explicit assertion that no seasonality adjustment is performed.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 22: # Data Pre-Processing Stock prices data collected is not complete understandably because of weekends and public holidays when the stock market does not function. The missing data is approximated using a simple technique by Goel BIBREF17 . Stock data usually follows a concave function. So, if the stock value on a day is x and the next value present is y with some missing in between. The first missing value is approximated to be (y+x)/2 and the same method is followed to fill all the gaps.

**Pattern (computed now from saved text):** not assigned. Gate rejected. Preprocessing paragraph 22 describes filling missing prices, not an explicit assertion that no seasonality adjustment is performed. Qualification: Mixed answerability; lack of mention is not proof of no adjustment.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/stage2-end-to-end-20261105/preparations.jsonl (eval/stage2-end-to-end-20261105/preparations.jsonl);location and patterns=computed now by the offline witness audit.

### R383: What data do they look at?

Case ID: `pdf/1608.01884/9a7ba5ed1779c664d2cac92494a43517d3e87c96`; paper `1608.01884`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "WSC collection". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **WSC collection**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 16, page 3. Exact checked anchors:"WSC collection".

> Care must be taken to avoid relying on, or seeming to rely on, objectionable stereotypes about men and women. One mechanism that can sometimes be used is to include a potentially problematic sentence in both directions. For instance, schema 23 from the WSC collection can be translated into both “The girls were bullying the boys so we [punished/rescued] them” and “The boys were bullying the girls, so we [punished/rescued] them,” thus avoiding any


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms.  

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/dev-retrieval-20261103/pdf.results.jsonl (eval/dev-retrieval-20261103/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R394: How did they obtain the dataset?

Case ID: `pdf/1910.06592/e35c2fa99d5c84d8cb5d83fca2b434dcd83f3851`; paper `1910.06592`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "For the non-factual accounts, we rely on a list of 180 Twitter accounts from BIBREF1; we use a list with another 32 Twitter accounts from BIBREF19 that are considered trustworthy" / "public resources where suspicious Twitter accounts were annotated; list with another 32 Twitter accounts from BIBREF19 that are considered trustworthy". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Nonfactual account source**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 22, page 4. Exact checked anchors:"180 Twitter accounts".

> works. For the non-factual accounts, we rely on a list of 180 Twitter accounts from [21]6. This list was created based on public resources7 where suspicious Twitter ac- counts were annotated with the main fake news types (clickbait, propaganda, satire, and hoax). We discard the satire labeled accounts since their intention is not to mis- lead or deceive. On the other hand, for the factual accounts, we use a list with another

- **Trusted-account source**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 23, page 4. Exact checked anchors:"32 Twitter accounts".

> 32 Twitter accounts from [15] that are considered trustworthy by independent third par- ties8. We discard some accounts that publish news in languages other than English (e.g., Russian or Arabic). Moreover, to ensure the quality of the data, we remove the dupli- cate, media-based, and link-only tweets. For each account, we collect the maximum amount of tweets allowed by Twitter API. Table 1 presents statistics on our dataset.


**Pattern (computed now from saved text):** Split across chunks; Different wording / broad question versus specific passage terms.  

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R402: What is the meta knowledge specifically?

Case ID: `pdf/1705.04153/04bde1d2b445f971e97bb46ade2d0290981c7a32`; paper `1705.04153`; formatpdf. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** No verifiable complete gold passage — no-verifiable-complete-answer-witness. No trustworthy complete answer passage established.

**Needed evidence (saved):** reference alternatives are "[unanswerable]". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. All references say unanswerable and have no evidence. A generic meta-network description is present, but no gold passage defining more specific meta-knowledge exists to rank.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 10: network is used to extract the shared meta-knowledge across different compositional rules and to dynamically generate the context-specific compositional function. Thus, the composi- tional function of our models varies with positions, contexts arXiv:1705.04153v1 [cs.CL] 11 May 2017
- Chunk 20: compositional neural network, consisting of two components: (1) meta network and (2) basic network with dynamic param- eters. Specifically, we propose two meta networks to generate the context-specific compositional functions for RecNN and TreeLSTM respectively. 3.1 Meta Network for RecNN For RecNN, we replace the static parameters W and b in Eq.(1) with the dynamic parameters W(zj ) and b(zj ), which are generated by a meta network. The meta network is a

**Pattern (computed now from saved text):** not assigned. All references say unanswerable and have no evidence. A generic meta-network description is present, but no gold passage defining more specific meta-knowledge exists to rank. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R412: What is the size of the Chinese data?

Case ID: `pdf/1611.03599/6a31db1aca57a818f36bba9002561724655372a7`; paper `1611.03599`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "32,595 posts" / "32,595". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Chinese post count**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 46, page 6. Exact checked anchors:"32,595 posts".

> them – is reliable, we examine the likes from authors of different stances. Posts in FBFans dataset are used for this analysis. We calculate the like statistics of each distinct author from these 32,595 posts. As the numbers of authors in the Sup, Neu and Uns stances are largely imbalanced, these numbers are normalized by the number of users of each stance. Table 4 shows the results. Posts with stances (i.e., not


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms.  

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/stage2-end-to-end-20261105/preparations.jsonl (eval/stage2-end-to-end-20261105/preparations.jsonl);location and patterns=computed now by the offline witness audit.

### R420: what was their character error rate?

Case ID: `pdf/1703.07090/1bb7eb5c3d029d95d1abf9f2892c1ec7b6eef306`; paper `1703.07090`; formatpdf. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 16.

**Needed evidence (saved):** reference alternatives are "2.49% for  layer-wise training, 2.63% for distillation, 6.26% for transfer learning." / "Their best model achieved a 2.49% Character Error Rate.". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Best CER, a complete reference alternative**. Actual top 15 rank:not found in available pool;k 50 rank:16;present in final prompt:no.

  Source chunk 55, page 6. Exact checked anchors:"9 3.87 2.82 2.49".

> Layer CER (%) Xavier Init CE Layer-wise CE CE+sMBR 6 3.72 - 2.85 7 3.93 3.68 2.81 8 3.81 3.60 2.77 9 3.87 2.82 2.49 Table 2. The CER of 6 to 9-layers models trained by regular Xavier Initialization, layer-wise training with CE criterion and CE + sMBR criteria. The teacher of 9-layer model is 8-layers sMBR model, while the others’ teacher is CE model. the total dataset for sMBR training. There is no obvious performance enhancement when the size of sMBR training dataset increases.

  Source chunk 60, page 6. Exact checked anchors:"9-layers LSTM 2.49".

> only little knowledge of deep network is lost. Moreover, CER of 2-layers distilled LSTM decreases relative 14%, compared with 2-layers regular-trained LSTM. Models CER (%) RTF 9-layers LSTM 2.49 0.74 2-layers regular-trained LSTM 3.06 0.36 2-laryers distilled LSTM 2.63 0.35 Table 3. The CER and RTF of 9-layers, 2-layers regular-trained and 2-laryers distilled LSTM. Training methods CER (%) Shenma model 7.87 Amap CE + sMBR 6.81 Shenma model + Amap sMBR 6.26


**Pattern (computed now from saved text):** Table or figure evidence; Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. Best 2.49% is a complete reference alternative; full three-method alternative also uses table 3/4 in 60–61. 

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4151 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:true. Reviewed witness chunks cost at most 168 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R454: Which dataset do they use?

Case ID: `pdf/1802.00396/c88a846197b72d25e04ec55f00ee3e72f655504c`; paper `1802.00396`; formatpdf. Saved Stage 2 outcome:wrong; saved evidence label:partial.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 36.

**Needed evidence (saved):** reference alternatives are "corpus of state speeches delivered during the annual UN General Debate" / "corpus of state speeches delivered during the annual UN General Debate". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Primary UN speech corpus**. Actual top 15 rank:not found in available pool;k 50 rank:36;present in final prompt:no.

  Source chunk 18, page 4. Exact checked anchors:"corpus of state speeches delivered during the annual UN General Debate".

> We draw on a recently released corpus of state speeches delivered during the annual UN General Debate that provides the first dataset of textual output from states that is recorded at regular time- series intervals and includes a sample of all countries that deliver speeches (Baturo, Dasandi and Mikhaylov, 2017). There are limitations to both votes and speeches in the UN in deriving estimates of states’ underlying preferences.2 However, it is not controversial to suggest that state speeches

  Source chunk 84, page 12. Exact checked anchors:"new dataset of state speeches in the UN General Debate".

> and network science literatures. The approach helps to better exploit information found in textual data, and to locate dense clusters in complex and multilayered networks in ways that were previously not computationally possible. Drawing on a new dataset of state speeches in the UN General Debate, together with voting data from the UNGA, these tools were employed to better estimate revealed 12


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms; Wrong-role dataset distractor. A downstream COW conflict-outcome dataset is a different role, not a generic passage or a valid substitute. 

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4152 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:true. Reviewed witness chunks cost at most 102 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/dev-retrieval-20261103/pdf.results.jsonl (eval/dev-retrieval-20261103/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R460: What was their performance on emotion detection?

Case ID: `docx/1611.02988/fa30a938b58fc05131c3854f12efe376cbad887f`; paper `1611.02988`; formatdocx. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** (c) Not supplied within 50 — answer-representation-unavailable-in-index. Not complete in the available top 50, or representation unavailable.

**Needed evidence (saved):** reference alternatives are "Answer with content missing: (Table 3) Best author's model B-M average micro f-score is 0.409, 0.459, 0.411 on Affective, Fairy Tales and ISEAR datasets respectively. ". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. Reference gives B-M F1=.409/.459/.411, but these values and table body are absent from the saved DOCX indexed text. Only the table reference remains in 54. Wider retrieval cannot retrieve missing cells.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 54: # Results In Table TABREF26 we report the results of our model on the three datasets standardly used for the evaluation of emotion classification, which we have described in Section SECREF3 .

**Pattern (computed now from saved text):** Table or figure evidence. Reference gives B-M F1=.409/.459/.411, but these values and table body are absent from the saved DOCX indexed text. Only the table reference remains in 54. Wider retrieval cannot retrieve missing cells. Qualification: Missing benchmark document representation is established; an application loader bug is not established.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R464: What crowdsourcing platform is used?

Case ID: `pdf/1801.05147/2df4a045a9cd7b44874340b6fdf9308d3c55327a`; paper `1801.05147`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:partial.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 26.

**Needed evidence (saved):** reference alternatives are "[unanswerable]" / "They did not use any platform, instead they hired undergraduate students to do the annotation.". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Actual annotator recruitment**. Actual top 15 rank:not found in available pool;k 50 rank:26;present in final prompt:no.

  Source chunk 54, page 5. Exact checked anchors:"We hire undergraduate students to annotate the sentences".

> Experiments Data Sets With the purpose of obtaining evaluation datasets from crowd annotators, we collect the sentences from two do- mains: Dialog and E-commerce domain. We hire undergrad- uate students to annotate the sentences. They are required to identify the predefined types of entities in the sentences. To- gether with the guideline document, the annotators are edu- cated some tips in fifteen minutes and also provided with 20 exemplifying sentences.


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. Specific recruitment passage supports a qualified students answer. It does not prove that no platform was used; other annotation says unanswerable. Qualification: Ranks the positive recruitment fact, not an unsupported categorical no-platform claim.

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4151 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:false. Reviewed witness chunks cost at most 100 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=computed now — four explicitly selected queries (eval/stage2-evidence-gaps-20261105/computed-rankings.jsonl);location and patterns=computed now by the offline witness audit.

### R466: Do they report results only on English data?

Case ID: `docx/1703.10344/77c34f1033702278f7f044806c1eba0c6ecb8b04`; paper `1703.10344`; formatdocx. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** No verifiable complete gold passage — no-verifiable-complete-answer-witness. No trustworthy complete answer passage established.

**Needed evidence (saved):** reference alternatives are "true" / "true". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. Same news/Wikipedia language-exclusivity question as PDF R099. Marked collection descriptions do not explicitly restrict the evaluated news to English; introductory English Wikipedia mention is insufficient.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 21: We evaluate the proposed approach on a news corpus consisting of 351,982 articles crawled from the news external references in Wikipedia from 73,734 entity pages. Given the Wikipedia snapshot at a given year (in our case [2009-2014]), we suggest news articles that might be cited in the coming years. The existing news references in the entity pages along with their reference date act as our ground-truth to evaluate our approach. In summary, we make the following contributions.

**Pattern (computed now from saved text):** not assigned. Same news/Wikipedia language-exclusivity question as PDF R099. Marked collection descriptions do not explicitly restrict the evaluated news to English; introductory English Wikipedia mention is insufficient. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R467: How many layers does the UTCNN model have?

Case ID: `pdf/1611.03599/518dae6f936882152c162058895db4eca815e649`; paper `1611.03599`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:partial.

**Location:** (c) Not supplied within 50 — answer-representation-unavailable-in-index. Not complete in the available top 50, or representation unavailable.

**Needed evidence (saved):** reference alternatives are "eight layers". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. The eight-layer reference appears to depend on Figure 2 layout. Chunk 26 contains flattened diagram labels, not recoverable topology/count; no eight-layer statement exists in saved indexed text.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 26: Document Composition uk tj Document Label Fully Connected Softmax Uk Maximum Pooling Likerl ... Author Liker1 Likerl Liker1Author Maximum Pooling ... TopicpTopic1 Comment Representation ... Topic1 Topicp ... ... ... ... ... xdw Tj Ri Commenter ... TopicpTopic1 ... xcw Tj Document Representation ri tj user vector embeddings user matrix embeddings topic matrix embeddings topic vector embeddingsFigure 2: The UTCNN model. Assuming one post author, l likers and p topics, xdw is the word embed-
- Chunk 29: encoding unigram, bigram, and trigram semantics accordingly. After the convolutional layer, we add a maximum pooling layer among convolutional outputs to obtain the unigram, bigram, and trigram n-gram representations. This is succeeded by an average pooling layer for an element-wise average of the three maximized convolution outputs. 3.2 UTCNN Model Description Figure 2 illustrates the UTCNN model. As more than one user may interact with a given post, we first add

**Pattern (computed now from saved text):** Table or figure evidence. The eight-layer reference appears to depend on Figure 2 layout. Chunk 26 contains flattened diagram labels, not recoverable topology/count; no eight-layer statement exists in saved indexed text. Qualification: Figure-to-text representation gap is plausible; the gold count itself is not visually adjudicated and no PDF re-extraction was performed.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R477: Is the discriminator's reward made available at each step to the generator?

Case ID: `pdf/1908.07195/c262d3d1c5a8b6fef6b594d5eee86bc2b09e3baf`; paper `1908.07195`; formatpdf. Saved Stage 2 outcome:wrong; saved evidence label:partial.

**Location:** No verifiable complete gold passage — no-verifiable-complete-answer-witness. No trustworthy complete answer passage established.

**Needed evidence (saved):** reference alternatives are "[unanswerable]". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. All references say unanswerable with no evidence. The every-step reward passage concerns related-work IRL/LeakGAN, not ARAML. Do not use it as gold for the target system.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 16: task. MaskGAN (Fedus et al., 2018) employed an actor-critic architecture to make the generator fill in missing text conditioned on the surrounding context, which is expected to mitigate the prob- lem of mode collapse. As for the discriminator, RankGAN (Lin et al., 2017) replaced traditional discriminator with a ranker to learn the relative ranking information between the real texts and generated ones. Inverse reinforcement learning (Shi et al., 2018) used a trainable reward approxi-
- Chunk 17: mator as the discriminator to provide dense reward signals at each generation step. DPGAN (Xu et al., 2018) introduced a language model based discrim- inator and regarded cross-entropy as rewards to promote the diversity of generation results. The most similar works to our model are RAML (Norouzi et al., 2016) and MaliGAN (Che et al., 2017): 1) Compared with RAML, our model adds a discriminator to learn the reward signals instead of choosing existing metrics as rewards. We be-
- Chunk 37: So far, we can successfully optimize the gener- ator’s loss LGθ via Equation 6. This training paradigm makes our generator avoid possible vari- ances caused by policy gradient and get more sta- ble reward signals from the discriminator, because our generator is restricted to explore the training samples near the real data. Algorithm 1 Adversarial Reward Augmented Maximum Likelihood Require: Total adversarial training iterations: N iters Steps of training generator: G steps
- Chunk 38: Steps of training generator: G steps Steps of training discriminator: D steps 1: Pre-train the generator Gθ with MLE loss 2: Generate samples from PGθ 3: Pre-train the discriminator Dφ via Eq.(1) 4: Construct Ps(X) via Eq.(7) - Eq.(12) 5: for each s = 1, 2, ..., N iters do 6: for each j = 1, 2, ..., G steps do 7: Update Gθ via Eq.(6) 8: end for 9: for each k = 1, 2, ..., D steps do 10: Update Dφ via Eq.(1) 11: end for 12: end for 3.4 Extension to Conditional Text Generation

**Pattern (computed now from saved text):** not assigned. All references say unanswerable with no evidence. The every-step reward passage concerns related-work IRL/LeakGAN, not ARAML. Do not use it as gold for the target system. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R478: Is the data de-identified?

Case ID: `pdf/1912.04961/861187338c5ad445b9acddba8f2c7688785667b1`; paper `1912.04961`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "true" / "true". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Explicit de-identification**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 19, page 3. Exact checked anchors:"Both the audio and the transcript are de-identified".

> an average duration of 9min 28s and have a verbatim transcript of 1,500 words on average (written by the experts). Both the audio and the transcript are de-identified (by removing the identifying information) with digital zeros and [de-identified] tags, respectively. The sentences in the transcript are grounded to the audio with the timestamps of its first and last word. The transcript of the conversations are annotated with summaries and Medication


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms.  

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R481: Do they experiment with other tasks?

Case ID: `pdf/2003.13032/8df35c24af9efc3348d3b8d746df116480dfe661`; paper `2003.13032`; formatpdf. Saved Stage 2 outcome:wrong; saved evidence label:partial.

**Location:** No verifiable complete gold passage — no-verifiable-complete-answer-witness. No trustworthy complete answer passage established.

**Needed evidence (saved):** reference alternatives are "false". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. False reference has no supporting annotation. Context already distinguishes tasks enabled by the corpus from NER experiments/supporting RE. A missing passage proving the absence of all other experiments cannot be defined.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 1: library. In the case reports, we annotate cases, conditions, findings, factors and negation modifiers. Moreover, where applicable, we annotate relations between these entities. As such, this is the first corpus of this kind made available to the scientific community in English. It enables the initial investigation of automatic information extraction from case reports through tasks like Named Entity
- Chunk 37: one or multiple shared layers. Through finding supporting patterns in related tasks, MTL provides better generaliza- tion on unseen cases and the main tasks we are trying to solve. We rely on the model presented by Bekoulis et al. (2018b) and reuse the implementation provided by the authors.11 The model jointly trains two objectives supported by the dataset: the main task of NER and a supporting task of Re- lation Extraction (RE). Two separate models are developed
- Chunk 38: for each of the tasks. The NER task is solved with the help of a BiLSTM-CRF model, similar to the one presented in Section 3.2. The RE task is solved by using a multi-head selection approach, where each token can have none or more relationships to in-sentence tokens. Additionally, this model also leverages the output of the NER branch model (the CRF prediction) to learn label embeddings. Shared layers consist of a concatenation of word and character em-
- Chunk 40: as the learning rate with the Adam optimizer and tanh ac- tivation functions across layers. Although it is possible to use adversarial training (Bekoulis et al., 2018a), we omit from using it. We also omit the publication of results for the task of RE as we consider it to be a supporting task and no other competing approaches have been developed. 3.4. BioBERT Deep neural language models have recently evolved to a successful method for representing text. In particular,

**Pattern (computed now from saved text):** not assigned. False reference has no supporting annotation. Context already distinguishes tasks enabled by the corpus from NER experiments/supporting RE. A missing passage proving the absence of all other experiments cannot be defined. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R483: Are the annotations automatic or manually created?

Case ID: `pdf/1804.11346/7793805982354947ea9fc742411bec314a6998f6`; paper `1804.11346`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "Automatic" / "We performed the annotation with freely available tools for the Portuguese language.". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Automated annotation tools**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 27, page 4. Exact checked anchors:"linguistic annotation of the texts using different NLP tools".

> transcription process in PEAPL2 and Leiria files. As a second step, we proceeded to the linguistic annotation of the texts using different NLP tools. We annotated the dataset at two levels: Part of Speech (POS) and syntax. We performed the an- notation with freely available tools for the Por- tuguese language. For POS we added a sim- ple POS, that is, only type of word, and a fine-

- **Named Portuguese annotation tools**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 28, page 5. Exact checked anchors:"LX Parser"; "Freeling"; "DepPattern toolkit".

> grained POS, which is the type of word plus its morphological features. We used the LX Parser (Silva et al., 2010), for the simple POS and the Portuguese morphological module of Freeling (Padr´o and Stanilovsky, 2012), for detailed POS. Concerning syntactic annotations, we included constituency and dependency annotations. For constituency parsing, we used the LX Parser, and for dependency, the DepPattern toolkit (Otero and Gonz´alez, 2012). 4 Applications


**Pattern (computed now from saved text):** Split across chunks; Different wording / broad question versus specific passage terms.  

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/stage2-end-to-end-20261105/preparations.jsonl (eval/stage2-end-to-end-20261105/preparations.jsonl);location and patterns=computed now by the offline witness audit.

### R489: Which languages are explored in this paper?

Case ID: `pdf/1707.05236/cd32a38e0f33b137ab590e1677e8fb073724df7f`; paper `1707.05236`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 27.

**Needed evidence (saved):** reference alternatives are "English " / "English ". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **English source data**. Actual top 15 rank:not found in available pool;k 50 rank:27;present in final prompt:no.

  Source chunk 23, page 3. Exact checked anchors:"English Vocabulary Profile".

> public FCE training set (Yannakoudakis et al., 2011) and used them to generate additional arti- ficial training data. Grammatically correct text is needed as the starting point for inserting artificial errors, and we used two different sources: 1) the corrected version of the same FCE training set on which the system is trained (450K tokens), and 2) example sentences extracted from the English Vocabulary Profile (270K tokens).1. While there are other text corpora that could be used (e.g.,


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer.  

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4150 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:false. Reviewed witness chunks cost at most 124 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/dev-retrieval-20261103/pdf.results.jsonl (eval/dev-retrieval-20261103/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R492: What labels do they create on their dataset?

Case ID: `pdf/1903.03530/73a7acf33b26f5e9475ee975ba00d14fd06f170f`; paper `1903.03530`; formatpdf. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 35.

**Needed evidence (saved):** reference alternatives are "(1) the time the patient has been experiencing the symptom, (2) activities that trigger the symptom (to occur or worsen), (3) the extent of seriousness, (4) the frequency occurrence of the symptom, and (5) the location of symptom; No Answer" / "the time the patient has been experiencing the symptom; activities that trigger the symptom; the extent of seriousness; the frequency occurrence of the symptom; the location of symptom; 9 symptoms". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Five symptom attributes**. Actual top 15 rank:not found in available pool;k 50 rank:35;present in final prompt:no.

  Source chunk 18, page 3. Exact checked anchors:"the time the patient has been experiencing the symptom"; "activities that trigger the symptom"; "the extent of seriousness"; "the frequency occurrence of the symptom"; "the location of symptom".

> swer types of A: (1) the time the patient has been experiencing the symptom, (2) activities that trig- ger the symptom (to occur or worsen), (3) the ex- tent of seriousness, (4) the frequency occurrence of the symptom, and (5) the location of symptom. For each symptom/attribute, it can take on differ- ent linguistic expressions, defined as entities. Note that if the queried symptom or attribute is not men- tioned in the dialogue, the groundtruth output is

- **Absent-symptom output label**. Actual top 15 rank:not found in available pool;k 50 rank:33;present in final prompt:no.

  Source chunk 19, page 3. Exact checked anchors:"No Answer".

> tioned in the dialogue, the groundtruth output is “No Answer”, as in (Rajpurkar et al., 2018). 2 Related Work 2.1 Reading Comprehension Large-scale reading comprehension tasks like SQuAD (Rajpurkar et al., 2016) and MARCO (Nguyen et al., 2016) provide question-answer pairs from a vast range of written passages, cov- ering different kinds of factual answers involv- ing entities such as location and numerical val- ues. Furthermore, HotpotQA (Yang et al., 2018)


**Pattern (computed now from saved text):** Split across chunks; Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer.  

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4149 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:false. Reviewed witness chunks cost at most 235 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/question-only-same-paper-20261102/pdf.results.jsonl (eval/question-only-same-paper-20261102/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R496: What type of inflections are considered?

Case ID: `pdf/1809.01541/c9b8d3858c112859eabee54248b874331c48f71b`; paper `1809.01541`; formatpdf. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** No verifiable complete gold passage — no-verifiable-complete-answer-witness. No trustworthy complete answer passage established.

**Needed evidence (saved):** reference alternatives are "[unanswerable]" / "[unanswerable]". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. Both annotations say unanswerable with no evidence. Generic morphological inflection is already described; no gold inventory of specific inflection types exists to locate.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 1: sal morphological reinflection, Task 2 with an overall accuracy of 49.87. Task 2 focuses on morphological inflection in context: generat- ing an inflected word form, given the lemma of the word and the context it occurs in. Previous SIGMORPHON shared tasks have focused on context-agnostic inflection—the “inflection in context” task was introduced this year. We ap- proach this with an encoder-decoder architec- ture over character sequences with three core
- Chunk 3: an inflected word form given its lemma and the context in which it occurs. Morphological (re)inflection from context is of particular relevance to the field of computational linguistics: it is compelling to estimate how well a machine-learned system can capture the mor- phosyntactic properties of a word given its con- text, and map those properties to the correct sur- face form for a given lemma. There are two tracks of Task 2 of CoNLL– SIGMORPHON 2018: in Track 1 the context is

**Pattern (computed now from saved text):** not assigned. Both annotations say unanswerable with no evidence. Generic morphological inflection is already described; no gold inventory of specific inflection types exists to locate. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R498: What is the size of the Chinese data?

Case ID: `docx/1611.03599/6a31db1aca57a818f36bba9002561724655372a7`; paper `1611.03599`; formatdocx. Saved Stage 2 outcome:partial; saved evidence label:partial.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 33.

**Needed evidence (saved):** reference alternatives are "32,595 posts" / "32,595". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Chinese post count**. Actual top 15 rank:not found in available pool;k 50 rank:33;present in final prompt:no.

  Source chunk 46, pagenot recorded. Exact checked anchors:"32,595 posts".

> To test whether the assumption of this paper – posts attract users who hold the same stance to like them – is reliable, we examine the likes from authors of different stances. Posts in FBFans dataset are used for this analysis. We calculate the like statistics of each distinct author from these 32,595 posts. As the numbers of authors in the Sup, Neu and Uns stances are largely imbalanced, these numbers are normalized by the number of users of each stance. Table TABREF13 shows the results


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. Dataset description supplies user counts, while actual post count occurs in a later behavior-analysis paragraph. 

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4149 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:false. Reviewed witness chunks cost at most 107 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/dev-retrieval-20261103/docx.results.jsonl (eval/dev-retrieval-20261103/docx.results.jsonl);location and patterns=computed now by the offline witness audit.

### R531: what language does this paper focus on?

Case ID: `pdf/1810.04428/2c6b50877133a499502feb79a682f4023ddab63e`; paper `1810.04428`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:partial.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 22.

**Needed evidence (saved):** reference alternatives are "English" / "Simple English". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **English/Simple-English target data**. Actual top 15 rank:not found in available pool;k 50 rank:22;present in final prompt:no.

  Source chunk 18, page 2. Exact checked anchors:"We collected a simplified dataset from Simple English Wikipedia".

> sidering simplified data plays an important role in boosting fluency for phrase-based text simplification, and we investigate the use of simplified data for text simplification. We are the first to show that we can effectively adapt neural translation models for text simplifiation with simplified corpora. 3 NMT Training with Simplified Corpora 3.1 Simplified Corpora We collected a simplified dataset from Simple English Wikipedia that are freely avail-

  Source chunk 19, page 2. Exact checked anchors:"We downloaded all articles from Simple English Wikipedia".

> able1, which has been previously used for many text simplification methods (Biran et al., 2011; Coster and Kauchak, 2011; Zhu et al., 2010). The simple English Wikipedia is pretty easy to understand than normal English Wikipedia. We downloaded all articles from Simple English Wikipedia. For these 1simple.wikipedia.org

  Source chunk 27, page 4. Exact checked anchors:"ordinary and simple English Wikipedias".

> 4 Evaluation We evaluate the performance of text simplification using neural machine translation on available parallel sentences and additional simplified sentences. Dataset. We use two simplification datasets (WikiSmall and WikiLarge). WikiSmall consists of ordinary and simplified sentences from the ordinary and simple English Wikipedias, which has been used as benchmark for evaluating text simplification (Woodsend and Lapata, 2011; Wubben et al., 2012;


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. Already supplied background English-resource mention is weaker than explicit target data-collection passage. 

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4150 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:false. Reviewed witness chunks cost at most 95 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/dev-retrieval-20261103/pdf.results.jsonl (eval/dev-retrieval-20261103/pdf.results.jsonl);location and patterns=computed now by the offline witness audit.

### R532: Ngrams of which length are aligned using PARENT?

Case ID: `pdf/1906.01081/28067da818e3f61f8b5152c0d42a531bf0f987d4`; paper `1906.01081`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 19.

**Needed evidence (saved):** reference alternatives are "[unanswerable]" / "Answer with content missing: (Parent subsections) combine precisions for n-gram orders 1-4". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Ngram orders**. Actual top 15 rank:not found in available pool;k 50 rank:19;present in final prompt:no.

  Source chunk 26, page 3. Exact checked anchors:"We combine precisions for n-gram orders 1-4".

> n), and otherwise it receives a reward of w(g). Both numerator and denominator are weighted by the count of the n-gram in Gi n. P r(g ∈ Ri n) re- wards an n-gram for appearing as many times as it appears in the reference, not more. We combine precisions for n-gram orders 1-4 using a geometric 5Glickman and Dagan (2005) used a product instead of geometric mean. Here we use a geometric mean to ensure that n-grams of different lengths have comparable probabili- ties of being entailed.

  Source chunk 30, page 4. Exact checked anchors:"combine recalls for n = 1-4".

> When computing Er(Ri), divergent references will have n-grams with low w(g). We want to ex- clude these from the computation of recall, and hence their contributions are weighted by w(g): En r (Ri) = ∑ g∈Ri n #Gi n,Ri n (g)w(g) ∑ g∈Ri n #Ri n (g)w(g) . (5) Similar to precision, we combine recalls for n = 1-4 using a geometric average to get Er(Ri). For computing Er(T i), note that a table is a set of records T i = {rk}K k=1. For a record rk, let ¯rk denote its string value (such as “Michael


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. Method-definition passage ranks below evaluation/metric-summary discussion; mixed annotation. 

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4147 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:true. Reviewed witness chunks cost at most 134 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=computed now — four explicitly selected queries (eval/stage2-evidence-gaps-20261105/computed-rankings.jsonl);location and patterns=computed now by the offline witness audit.

### R542: How many tweets were collected?

Case ID: `pdf/2001.09215/bcc0cd4e262f2db4270429ab520971bcf39414cf`; paper `2001.09215`; formatpdf. Saved Stage 2 outcome:wrong; saved evidence label:partial.

**Location:** Supporting information already in final prompt — earlier-gap-label-not-confirmed. The relevant supporting text is already in the final prompt.

**Needed evidence (saved):** reference alternatives are "$19,300$; added 2500 randomly sampled tweets" / "$19,300$ tweets". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Full collected tweet pool**. Actual top 15 rank:1;k 50 rank:not found in available pool;present in final prompt:yes.

  Source chunk 6, page 1. Exact checked anchors:"collection of 19, 300 tweets".

> tribution, mandating the need to curate a novel dataset via specific lexicons. We scraped 500 random posts from rec- ognized transport forum3. A pool of 50 uni/bi-grams was created based on tf-idf representations, extracted from the posts, which was further pruned by annotators. Querying posts on Twitter with extracted lexicons led to a collection of 19, 300 tweets. In order to have lexical diversity, we added 2500 randomly sampled tweets to our dataset. In spite of the

- **Added random tweets**. Actual top 15 rank:1;k 50 rank:not found in available pool;present in final prompt:yes.

  Source chunk 6, page 1. Exact checked anchors:"added 2500 randomly sampled tweets".

> tribution, mandating the need to curate a novel dataset via specific lexicons. We scraped 500 random posts from rec- ognized transport forum3. A pool of 50 uni/bi-grams was created based on tf-idf representations, extracted from the posts, which was further pruned by annotators. Querying posts on Twitter with extracted lexicons led to a collection of 19, 300 tweets. In order to have lexical diversity, we added 2500 randomly sampled tweets to our dataset. In spite of the


**Pattern (computed now from saved text):** not assigned. Both quantities are already in actual top 1 and final prompt. The old audit searched 19,300 without allowing the source comma-space; the answer confused total pool with 7200 transport-relevant subset. Qualification: Confirmed correction to the earlier missing-evidence diagnosis; saved result files remain unchanged.

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4152 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:true;reachable with±2:true. Reviewed witness chunks cost at most 117 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R545: Did they use a crowdsourcing platform for annotations?

Case ID: `pdf/1710.07960/0ba3ea93eef5660a79ea3c26c6a270eac32dfa4c`; paper `1710.07960`; formatpdf. Saved Stage 2 outcome:wrong; saved evidence label:absent.

**Location:** No verifiable complete gold passage — no-verifiable-complete-answer-witness. No trustworthy complete answer passage established.

**Needed evidence (saved):** reference alternatives are "false" / "[unanswerable]". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. False/unanswerable references disagree; marked feature-selection paragraph does not address annotator platform. No explicit no-platform statement exists in saved indexed text. Lack of mention cannot support categorical denial.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 4: occurrences of the target word to build a machine learning model to label test cases. However, this approach suffers from a knowledge acquisition bot- tleneck. The annotation of a separate training cor- pus for every target word demands a considerable amount of human labour. Therefore, this approach is unusable in applications that require WSD across a wide vocabulary, such as open-domain question an- swering (Przybyła, 2015). The method of monosemous relatives, which is
- Chunk 5: The method of monosemous relatives, which is the focus of this work, bypasses the bottleneck by gathering occurences of words related to the target word, but free from ambiguity, and treating them as training cases of the respective senses. Human labour is eliminated at the expense of accuracy, as the context of each relative only approximately matches the context of the target word sense. Monosemous relatives have been employed mul- tiple times (see Section 2), but results remain un-
- Chunk 37: sidered equally probable. Thus, for the given context features x, sense y∗ is selected when: y∗ = arg max y ∏ i : xi=1 P (Xi = 1\|Y = y) P (Xi = 0\|Y = y) The table with final results (4) contains accuracies of both original and modified versions of the classifier. 4 Evaluation For experiments and evaluation a sub-corpus of the National Corpus of Polish, NCP (Przepiórkowski et al., 2012) was employed. The manually anno- tated sub-corpus contains sense labels of 106 differ-
- Chunk 38: ent words: 50 nouns, 48 verbs and 8 adjectives. As verbs have much poorer connectivity in plWordNet, they have been ignored within this study. The senses used for annotation are coarse-grained – with one sense covering a range of related usages. Each word has between two and four senses. To em- ploy the method described in previous section, the NCP senses have been manually mapped to fine- grained plWordNet synsets. As NCP senses have been created independently from wordnet senses, a
- Chunk 61: WSD task first. What is more, sense distributions obviously change with genre, time, author, etc. When it comes to feature selection, the most un- expected phenomenon observed in this study is low usefulness of the interpretation-based features. Ac- cording to Table 1, adding interpretations of neigh- bouring words (I) yields very little improvement, while this type of information regarding replace- ments (I0) even lowers the accuracy. This result
- Chunk 63: represented as one of several dozen part of speech identifiers, in Slavonic languages, such as Polish, we need to specify the values of several tags for each word, leading to thousands of possible interpreta- tions. Obviously, the features based on these tags are very sparse. Finally, the morphosyntactic anno- tation was performed automatically, which may lead to errors, especially in the case of noisy web text. One of the purposes of this study was to check

**Pattern (computed now from saved text):** not assigned. False/unanswerable references disagree; marked feature-selection paragraph does not address annotator platform. No explicit no-platform statement exists in saved indexed text. Lack of mention cannot support categorical denial. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=not needed — no verifiable witness, or entire indexed representation missing, or actual prompt already contains evidence;location and patterns=computed now by the offline witness audit.

### R546: Which two pairs of ERPs from the literature benefit from joint training?

Case ID: `pdf/1904.01548/7d2f812cb345bb3ab91eb8cbbdeefd4b58f65569`; paper `1904.01548`; formatpdf. Saved Stage 2 outcome:wrong; saved evidence label:partial.

**Location:** (b) Missing witness at ranks 16–50 — complete-missing-witness-within 16-to 50. Complete reviewed witness at rank 31.

**Needed evidence (saved):** reference alternatives are "Answer with content missing: (Whole Method and Results sections) Self-paced reading times widely benefit ERP prediction, while eye-tracking data seems to have more limited benefit to just the ELAN, LAN, and PNP ERP components.\nSelect:\n- ELAN, LAN\n- PNP ERP" / "[unanswerable]". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Two literature-established ERP pairs**. Actual top 15 rank:not found in available pool;k 50 rank:31;present in final prompt:no.

  Source chunk 70, page 8. Exact checked anchors:"the LAN and P600 are related"; "the ELAN and P600 are related"; "previous work".

> Relationship between ERPs. Our findings that the LAN and P600 are related, and that the ELAN and P600 are related are expected from both a the- oretical perspective and from previous work exam- ining the interactions of ERP components (Gunter et al., 1997; Hagoort et al., 2003a; Hahne and Friederici, 1999; Kutas et al., 2006; Palolahti et al., 2005). Since the ELAN and LAN have been the- orized by some to mark word-category (i.e. part- of-speech) or morpho-syntactic (e.g. subject-verb


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms; Generic discussion ranks above specific answer. Discussion 70 confirms the new answer’s two pairs. The saved reference concerns a different behavioral/ERP result, so the factual-wrong judgment is questionable. Prompt support still depends on missing 70. Qualification: New source audit corrects target-reference interpretation; no saved judgment is edited.

**Offline fix checks:** exact original-context replay:true;raising only the cap to 4144 newly supplies all witnesses:false;all witnesses reachable in current±1 neighbour candidate set:false;reachable with±2:true. Reviewed witness chunks cost at most 149 local tokens, including separator allowance. These checks measure exposure/feasibility, not generated answer quality.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=computed now — four explicitly selected queries (eval/stage2-evidence-gaps-20261105/computed-rankings.jsonl);location and patterns=computed now by the offline witness audit.

### R547: What language is explored in this paper?

Case ID: `pdf/2001.09215/f641f561ad2ea2794a52e4e4bdd62e1f353ab797`; paper `2001.09215`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "[unanswerable]" / "English language". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

No verified complete source witness is asserted. Gate rejected. Marked complaint examples are in English, but do not explicitly establish the language scope of the entire dataset.

**Related passages / qualification:** the following are retained for inspection; they are not automatically treated as complete answer evidence.

- Chunk 7: sparse nature of these posts, the lexical characteristics act as information cues. Figure 1 pictorially represents our methodology. Our ap- proach required an initial set of informative tweets for which we employed two human annotators annotating a random sub-sample of the original dataset. From the 1500 sam- ples, 326 were marked as informative and 1174 as non in- formative (κ = 0.81), discriminated on this criteria: Is the tweet addressing any complaint or raising grievances
- Chunk 8: about modes of transport or services/ events associated with transportation such as traffic; public or private trans- port?. An example tweet marked as informative: “No, metro fares will be reduced ???, but proper fare structure needs to presented right, it’s bad !!!”. We utilized tf-idf for the identification of initial “seed phrases” from the curated set of informative tweets. 50 terms having the highest tf-idf scores were passed through the

**Pattern (computed now from saved text):** not assigned. Gate rejected. Marked complaint examples are in English, but do not explicitly establish the language scope of the entire dataset. Qualification: Mixed answerability; language inferred from examples is not explicit scope.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/stage2-end-to-end-20261105/preparations.jsonl (eval/stage2-end-to-end-20261105/preparations.jsonl);location and patterns=computed now by the offline witness audit.

### R554: Do the authors conduct experiments on the tasks mentioned?

Case ID: `docx/1608.01884/1dc2da5078a7e5ea82ccd1c90d81999a922bc9bf`; paper `1608.01884`; formatdocx. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "true" / "false". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Concrete translation probes**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 24, pagenot recorded. Exact checked anchors:"Google Translate (GT), Bing Translate, and Yandex".

> What may be more surprising is that currently (July 2016), machine translation programs are unable to choose the feminine plural pronoun even when the only possible antecedent is a group of women. For instance, the sentence “The girls sang a song and they danced” is translated into French as “Les filles ont chanté une chanson et ils ont dansé” by Google Translate (GT), Bing Translate, and Yandex


**Pattern (computed now from saved text):** Different wording / broad question versus specific passage terms. Same qualitative-versus-formal-experiment ambiguity as PDF R132. Qualification: Contradictory yes/no references.

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/stage2-end-to-end-20261105/preparations.jsonl (eval/stage2-end-to-end-20261105/preparations.jsonl);location and patterns=computed now by the offline witness audit.

### R557: what were the baselines?

Case ID: `pdf/1904.03288/2ddb51b03163d309434ee403fef42d6b9aecc458`; paper `1904.03288`; formatpdf. Saved Stage 2 outcome:refused; saved evidence label:absent.

**Location:** (c) Not supplied within 50 — relevance-gate-short-circuit. No hybrid ranks exist: the saved production gate stopped retrieval.

**Needed evidence (saved):** reference alternatives are "[unanswerable]" / "LF-MMI Attention\nSeq2Seq \nRNN-T \nChar E2E LF-MMI \nPhone E2E LF-MMI \nCTC + Gram-CTC". Source fields: Stage 2 judgments.jsonl/referenceAnswers and sourceExcerpts, sample.json, and dev-set-preparation-20261103/source-chunks.jsonl. The sourceExcerpts concern actual supplied context and are retained in cases.jsonl.

- **Conversational ASR baseline comparison**. Actual top 15 rank:not ranked: relevance gate stopped retrieval;k 50 rank:not ranked: relevance gate stopped retrieval;present in final prompt:no.

  Source chunk 36, page 4. Exact checked anchors:"LF-MMI"; "Attention Seq2Seq"; "RNN-T"; "Char E2E LF-MMI"; "Phone E2E LF-MMI"; "CTC + Gram-CTC".

> data and report Hub5’00 results in Table 7. Table 7: Hub5’00, WER (%) Model E2E LM SWB CHM LF-MMI [14] N RNN 7.3 14.2 Attention Seq2Seq [36] Y - 8.3 15.5 RNN-T [37] Y 4-gram 8.1 17.5 Char E2E LF-MMI [14] Y RNN 8.0 17.6 Phone E2E LF-MMI [14] Y RNN 7.5 14.6 CTC + Gram-CTC Y N-gram 7.3 14.7 Jasper DR 10x5 Y 4-gram 8.3 19.3 Jasper DR 10x5 Y Transformer-XL 7.8 16.2 We obtain good results for SWB. However, there is work to be done to improve WER on harder tasks such as CHM. 4. Conclusions


**Pattern (computed now from saved text):** Table or figure evidence; Different wording / broad question versus specific passage terms. Full baseline names available in comparison table; one reference says unanswerable. 

**Source of each answer:** top 15/context=saved — eval/stage2-end-to-end-20261105/preparations.jsonl;needed passage text=saved — dev source snapshot; aligned to saved reference evidence by this new manual review;rank 50=saved — eval/stage2-end-to-end-20261105/preparations.jsonl (eval/stage2-end-to-end-20261105/preparations.jsonl);location and patterns=computed now by the offline witness audit.

## 7. Audit and files

- **Generation calls:0.** Four successful local embeddings and 8 filtered vector-search requests; no unfiltered Qdrant query/scroll or collection catalog read. Network guard accepts only selected dev document IDs and checks returned payload text against frozen dev source chunks. The initial sandbox-blocked embedding attempt is logged separately; it performed 0 searches.
- **Offline replays:57/57 exact.** All source anchors validated. Offline analysis made 0 network attempts.
- **Preservation:** every protected application, split and saved-result hash is unchanged. No held-out paper payload was read. No original PDF was re-extracted or figure image visually regraded.
- **cases.jsonl:** full per-case evidence units, original human support paragraphs, exact raw source chunks, real hit indices, ranks, final-prompt inclusion, pattern judgments, qualifications and provenance.
- **summary.json:** machine-readable counts and offline feasibility results.
- **computed-rankings.jsonl / network-audit.json:** only the four new retrievals and bounded network audit.
- **reuse-audit.json / input-manifest.json:** input/setup decisions and protected hashes.
- **targets.mjs:** manually reviewed source witnesses/interpretations.
- **inputs.jsonl:** selected 57 saved cases with their original actual Stage 2 preparations and dev source snapshots.
- **analyze.mjs / report.mjs / verify.mjs:** reproducible offline comparison, report and artifact verification.

