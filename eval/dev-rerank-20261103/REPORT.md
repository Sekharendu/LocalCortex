# Fresh dev retrieval and reranking comparison

Status: complete. Same existing seed42 dev split; no held-out paper content. 234 prepared questions, 170 PDF and64 DOCX cases. Both modes called the unchanged retrieve() function at k5 and k50:936 live retrieval invocations,234 actual local embedding requests with same-case embedding responses reused,1602 Qdrant query requests. No application edits or generation.

## Main group:119 questions with longer reference quotes

A pass means the first five chunks collectively contain every literal quote from at least one fully eligible selected reference answer. Every question counts once; reference alternatives stay separate. At least one quote in each eligible main-group reference has4+words.

| Reranking off | Reranking on |
|---|---|
| **dense: 62/119 (52.1%)** | **dense: 52/119 (43.7%)**; 2 request failure(s), 0 unattempted |
| **hybrid: 62/119 (52.1%)** | **hybrid: 53/119 (44.5%)**; 4 request failure(s), 0 unattempted |

## Separate short-term group:115 questions

Short names or terms can appear without the full answer; these figures are weaker evidence and are not merged into the main group.

| Reranking off | Reranking on |
|---|---|
| **dense: 55/115 (47.8%)** | **dense: 51/115 (44.3%)**; 3 request failure(s), 0 unattempted |
| **hybrid: 50/115 (43.5%)** | **hybrid: 56/115 (48.7%)**; 0 request failure(s), 0 unattempted |

## What changed

- dense, longer quotes: 13 newly passed, 21 regressed, 39 passed both, 44 failed both; 0 untested. The independent k5 order differed from the first5 of the k50 pool for 0/119 questions.
- hybrid, longer quotes: 12 newly passed, 19 regressed, 41 passed both, 43 failed both; 0 untested. The independent k5 order differed from the first5 of the k50 pool for 21/119 questions.
- dense, short terms: 11 newly passed, 13 regressed, 40 passed both, 48 failed both; 0 untested. The independent k5 order differed from the first5 of the k50 pool for 0/115 questions.
- hybrid, short terms: 11 newly passed, 5 regressed, 45 passed both, 54 failed both; 0 untested. The independent k5 order differed from the first5 of the k50 pool for 28/115 questions.

12 unique questions were rejected by the existing relevance gate; they remain misses, not removed from denominators. Empty pools consume no reranker call. The19 earlier scope rejections remain separate in the prepared control file and were not sent to retrieval/reranking here.

## Run evidence and limits

- Authorized maximum468 hosted attempts; actual 444, completed 435, empty pools skipped 24. Serial, no retries. Initial failure: RerankingError: Reranking cancelled or timed out. Continuation failure: none.
- Initial request19 exceeded the unchanged15-second application limit. It was retained as a failure and never retried. A separately recorded continuation inherited all19 reservations and the same global468-attempt cap, skipped every previously attempted pool and continued only untouched pools. Further timeouts are retained; other failures stop the run.
- The two-column tables use full cohort denominators and count failed reranker requests as unsuccessful delivery, with failures disclosed separately. Paired ranking-change counts exclude failed requests. No unattempted request is treated as a quality miss.
- Provider response usage reports 1092.7056924546291 Neurons across this run; this is not verified account-wide daily usage or remaining allowance.
- Model: @cf/baai/bge-reranker-base. Queries and raw candidate text preserved. Exact BGE token/truncation policy was not measured.
- Off uses a real retrieve(k5) call. On uses the full retrieve(k50) candidate pool, then reranks and takes5, matching the intended enabled pipeline. Therefore the main difference includes candidate-pool widening; comparison.json separately includes k50's original first5 to isolate ordering.
- Same-paper selection is an explicit test condition. This does not test automatic paper selection, conversational rewriting, context assembly, or answers.
- Every ready case is still a quote-coverage proxy with humanSemanticCompletenessReviewed=false. A collection of literal terms can be insufficient for a complete answer; none of these percentages is answer accuracy.
- Full50 coverage is invariant under reranking; all result permutations and selected-reference coverage were checked. Empty gated pools remain paired misses.
- Split, prepared data, current reviewed application, frozen chunks, and run input hashes verified unchanged. All new artifacts stay under eval/.

Files: comparison.json for aggregate counts, scored-cases.jsonl for every question/reference rank and gain/loss, results.jsonl for exact reranker indices/scores, attempts.jsonl/http.jsonl/usage.jsonl for audit. Continuation records are under continuation/. Fresh retrieval payloads and traces are in ../dev-retrieval-20261103/.
