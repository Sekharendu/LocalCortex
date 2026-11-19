# More chunks: saved-ranking coverage and paired answer-quality test

Completed on 2026-11-04. Existing dev/test split unchanged. No new searching, embeddings, reranking, ingestion or application changes. Coverage reused the saved dense/hybrid top 50 rankings; generation was separately authorized by the user for a maximum 80 Cloudflare calls.

## 1. Coverage of the 119 longer-quote cases

A covered case has every literal quote from at least one eligible reference answer in the selected chunks. Quotes preserve case/punctuation; whitespace is normalized. These are not supporting-paragraph or final-answer accuracy scores.

| First chunks retained | Dense | Hybrid |
|---|---:|---:|
| 5 | 62/119 (52.1%) | 62/119 (52.1%) |
| 8 | 75/119 (63.0%) | 78/119 (65.5%) |
| 10 | 82/119 (68.9%) | 84/119 (70.6%) |
| 15 | 90/119 (75.6%) | 92/119 (77.3%) |
| 20 | 95/119 (79.8%) | 98/119 (82.4%) |
| 50 | 108/119 (90.8%) | 110/119 (92.4%) |

Fifteen is the smallest tested depth that exceeds 75% in both modes. Compared with 5, it adds 28 covered cases in dense and 30 in hybrid. Twenty adds another 5 dense/6 hybrid covered cases beyond 15. No cases are removed when the relevance gate returns an empty list.

## 2. Existing context-builder limitation

Replaying the current selector on the same hybrid saved ranking cuts, including its 1200-token long-document limit, whole-document threshold 1000, title chunk and neighbouring chunks, gives:

| Retrieved hits provided to selector | All reference quotes retained in selected context |
|---|---:|
| 5 | 76/119 (63.9%) |
| 15 | 87/119 (73.1%) |

The 5-hit replay can gain evidence from neighbours, so it exceeds raw 5 coverage. At 15, the cap can discard some raw retrieved evidence. The paired replay improves 15 cases and regresses 4; it is not automatically monotonic. This is offline context selection on saved k 50 cutoffs, not a live end-to-end production test or a provider-token-window certification. Simply changing retrieval k does not guarantee sending all 15 chunks.

## 3. Final-answer experiment

Fixed 40 dev cases:22 previously failed and 18 previously acceptable, chosen before generation by a deterministic hash ordering using seed label 42. They contain 38 unique original question IDs; two are represented as bothPDF/DOCX. Hybrid search only for this generation sample. Selected paper and reranker-off conditions are held fixed.

For each case, send the first 5 or first 15 raw chunks directly through the existing buildPrompt()/generate() and unchanged system/model, with temperature 0 in both arms. No neighbour expansion or source annotations are sent to the answering model. All sampled prompts fit the legacy 4096-token estimate including 512 reserve. This isolates direct chunk-count changes; it is not the current production context-assembly baseline.

The sample input quote coverage was 23/40 at 5 and 31/40 at 15. We then read the actual answers semantically, accepting supported paraphrases and using all original reference alternatives. The review labels do not come from exact word matching.

| Reviewed outcome | 5 chunks | 15 chunks |
|---|---:|---:|
| Adequately complete and supported | 20/40 | 27/40 |
| Partially answered | 5/40 | 6/40 |
| Materially wrong or wrong attribution | 5/40 | 1/40 |
| Refused to answer | 10/40 | 6/40 |

Under this stricter AI-assisted review, adequately complete supported answers rose 20/40(50.0%)to 27/40(67.5%). Ten cases became correct, three became non-correct,17 were correct in both. Refusals fell 10 to 6. This is a small dev sample, not an independently human-certified overall accuracy score. Three 15-chunk partial labels(numbers 6,10,18)are borderline under a more permissive interpretation; accepting all three would give 30/40(75.0%). Their exact reasons and answers remain visible.

## 4. Examples checked against actual passages

- SemEval training dataset:5 chunks refused;15 correctly named SemEval 2010 Task 8.
- Online-harassment types:5 imported information-threat from related work;15 correctly gave indirect/sexual/physical target categories.
- Crowd-worker instructions:5 gave a supported description;15 refused despite the relevant passage still being present. This is a clear extra-context regression.
- Dataset sizes:both omitted WikiLarge development/test counts even though available. More chunks did not fix answer completeness.
- One experiment-method question remained wrong at both depths because the model attributed background methods to the target paper.

See reviewed-cases.jsonl and answers.jsonl for every judgment and answer. requests.jsonl stores full sent prompts/chunks plus expected references separately for audit.

## 5. Requests, time and resource observations

79 Cloudflare calls completed;0 failed. The 80 th comparison outcome reused an identical-prompt answer (one empty-context pair); no request was retried. No answers hit the recorded output-length limit. The original run command was blocked by automatic approval review before execution; the user then explicitly authorized the export in authorization.json.

- 5 chunks: mean provider prompt tokens 888, mean completion tokens 36, median request duration 0.90 s, mean reported Neurons 5.19 per actual call.
- 15 chunks: mean provider prompt tokens 1967, mean completion tokens 41, median request duration 0.96 s, mean reported Neurons 10.36 per actual call.

Total provider-reported usage: 611.7 Neurons. This is not account-wide usage or remaining allowance. Prompt cost roughly doubled, although median latency was similar in this small sequential run; no load/throughput conclusion follows.

## 6. Interpretation and next action

Sending 15 raw chunks is a promising tested direction: full-reference quote coverage is about 76–77% instead of 52%, and reviewed complete supported answers improve in the fixed sample. It also causes noise-related regressions and raises prompt usage. Current context selection trims evidence, so a production change would need to explicitly budget for the intended additional hits and verify the final prompt—not merely change RETRIEVE_TOP_K. No application setting or code was changed, enabled, deployed or pushed.

Before claiming reliable research answering, perform human review of the borderline labels, test the actual proposed production context policy, and validate supporting-evidence coverage and multi-source behavior. This experiment retains the selected-paper and answer-quote limitations of its saved rankings.
