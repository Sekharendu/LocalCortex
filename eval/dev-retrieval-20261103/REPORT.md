# Fresh dev retrieval test: reranking off

Completed all234 prepared dev questions:170PDF and64DOCX cases. Called unchanged retrieve() independently at k5 and k50 in dense and hybrid modes, with the original question, selected paper, relevance threshold0.63, task prefixes on and hybrid RRF fusion. No answer generation, reranking, held-out paper content or application edits.

## Longer-quote group:119 questions

- dense: **62/119 (52.1%)** had all selected reference quotes in the independently retrieved first5. Within50: **108/119 (90.8%)**. Gate rejected2. k5 order differed from the first5 of k50 for0 cases.
- hybrid: **62/119 (52.1%)** had all selected reference quotes in the independently retrieved first5. Within50: **110/119 (92.4%)**. Gate rejected2. k5 order differed from the first5 of k50 for21 cases.
## Short-term group:115 questions, weaker evidence

- dense: **55/115 (47.8%)** had all selected reference quotes in the independently retrieved first5. Within50: **102/115 (88.7%)**. Gate rejected10. k5 order differed from the first5 of k50 for0 cases.
- hybrid: **50/115 (43.5%)** had all selected reference quotes in the independently retrieved first5. Within50: **102/115 (88.7%)**. Gate rejected10. k5 order differed from the first5 of k50 for28 cases.

A pass is exact whole-quote coverage after whitespace normalization of every quote within at least one eligible reference alternative. It does not prove enough semantic evidence for an answer. Short names can occur in unrelated passages; longer quotes remain a proxy too. All cases are retained in denominators, including relevance-gate misses. The19 scope controls remain separate in the prepared dataset and were not run here. Context assembly and generation are outside this test.

936 live retrieve() invocations;234 actual local embedding requests, reused across each case’s four comparisons;1602 Qdrant query requests. Returned payloads were checked against frozen dev chunk text and every dense/hybrid prefetch filter was checked for the selected dev document ID before dispatch. All input hashes remained unchanged.

The subsequent reranking comparison is in ../dev-rerank-20261103/REPORT.md.
