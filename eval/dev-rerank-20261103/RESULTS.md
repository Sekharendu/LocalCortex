# Larger dev comparison: reranking off versus on

Tested the same 234 dev cases, using the existing split and selecting the paper for each question. Reranking off uses a normal top 5 retrieval. Reranking on selects 5 after ranking the top 50 candidates. No answers were generated.

A pass means the first 5 chunks contain all literal quotes from at least one eligible reference answer. This is quote coverage, not verified answer accuracy.

## Main check: 119 cases with longer reference quotes

| Reranking off | Reranking on |
|---|---|
| **dense: 62/119 (52.1%)** | **dense: 52/119 (43.7%)** |
| **hybrid: 62/119 (52.1%)** | **hybrid: 53/119 (44.5%)** |

## Separate check: 115 cases with short names or terms

| Reranking off | Reranking on |
|---|---|
| **dense: 55/115 (47.8%)** | **dense: 51/115 (44.3%)** |
| **hybrid: 50/115 (43.5%)** | **hybrid: 56/115 (48.7%)** |

The reranker reduced coverage in the main longer-quote group. This remains true when failed requests are excluded: dense improved 13 cases but regressed 21; hybrid improved 12 but regressed 19. Short-term results were mixed and are weaker evidence of full answer coverage.

All 234 cases were accounted for in both modes. Of 444 hosted attempts, 435 succeeded and 9 failed: 6 timed out under the unchanged 15-second application limit and 3 had other request failures. Failed requests count as unsuccessful delivery in the tables, not as evidence that the model judged the chunks irrelevant. There were no retries. 24 empty pools from 12 questions were skipped without a hosted call and remain misses.

The earlier 19 dev scope rejections remain separate controls and are excluded from these 234 cases. Test-paper content was not accessed. Split and application files are unchanged. The reranker has not been enabled or deployed.

Provider responses reported about 1092.7 Neurons across this run. This is not verified account-wide usage; failed-request usage may be unreported.

Audit checked all 444 request hashes, serial durable ledger order, no duplicate attempts, 435 exact candidate permutations, and unchanged input/application/prior experiment hashes. Detailed ranking changes and paired denominators are in comparison.json and scored-cases.jsonl; failures are in request-failures.json. REPORT.md explains protocol changes and limits. Human semantic completeness, context assembly, and final answer quality have not been evaluated.
