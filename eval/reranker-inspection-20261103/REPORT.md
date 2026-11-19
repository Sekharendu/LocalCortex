# What the saved reranker results show

Two unique questions lost top-five gold coverage; two gained it. Across modes, that is three unique lost quote items and two gained items. The classifier gain occurs only in dense mode; hybrid already had the term in its top five. These are quote-retrieval results, not answer accuracy.

## The two regressions

**News sources (1707.06806).** Question: “What is the source of the news articles?” The passage naming “main news channels, such as Yahoo News, The Guardian or The Washington Post” fell from rank **1 to 28 in both modes**. The same chunk received rerank score 0.00034381175646558404. “The BreakingNews dataset” fell **2→6 dense / 4→6 hybrid**. The new top passage discusses predicting popularity from titles, rather than naming those publishers. This is a clear loss of directly answering text from the top five.

**Compared methods (1908.05441).** Question: “What previous methods is their model compared to?” The short gold term “CNN” changed from best matching rank **2→30 dense / 2→34 hybrid**. Those final ranks belong to a different table chunk containing “MP-CNN.” The original rank-2 passage itself fell **2→37 dense / 2→39 hybrid**. The new top dense passage discusses performance gains without listing the methods; the top hybrid passage lists subject categories. An exact short-term hit does not establish a complete list of compared methods.

## The two gains

**Classifiers (1909.02027).** Question: “Which classifiers are evaluated?” The term “CNN” changed **7→4 dense / 5→4 hybrid**. The new first match is a performance table (chunk 34), moving **38→4 dense / 10→4 hybrid**. The actual model-definition list containing MLP, FastText, CNN and BERT (chunk 23) fell **8→30 dense / 9→30 hybrid**. The top-ranked abstract says classifiers were evaluated without listing them. The metric gained a literal CNN hit in dense mode; that alone does not show a better full answer.

**Vocabulary distillation (1909.11687).** The question asks why earlier distillation cannot produce a student with a different vocabulary. The full explanation—student and teacher must share vocabulary and output space—rose **22→3 dense / 15→3 hybrid**, with score 0.9484116435050964. This is a useful, direct quote-retrieval improvement; generation was not tested.

## The longer omission result is dominated by one question

The four mapped longer omission items come from **only two questions**. Three are overlapping gold references to the same corpora in DOCX 1603.01514 and all match the same chunk 41. They improved slightly; the news-source quote worsened severely.

| Gold quote | Dense | Hybrid |
|---|---:|---:|

| English (EN) and German (DE) sections of the CoNLL 2009 corpus BIBREF13 | 10 → 9 | 11 → 10 |

| EN-DE section of the Europarl corpus BIBREF14 | 10 → 9 | 11 → 10 |

| the English (EN) and German (DE) sections of the CoNLL 2009 corpus BIBREF13 , and EN-DE section of the Europarl corpus BIBREF14  | 10 → 9 | 11 → 10 |

| main news channels, such as Yahoo News, The Guardian or The Washington Post | 1 → 28 | 1 → 28 |


These are correlated items, not four independent questions. Only the news question worsened among longer omission questions. Across omission and acceptable cohorts together, only three sampled questions have mapped longer quotes.

## Why so few cases can be scored

Only **8 of 20 questions** have any source-mapped gold: 6 omission and 2 acceptable. Four have no literal gold quote, and another eight have quotes that do not map to their extracted paper. There are 37 gold items: 17 mapped and 20 unmapped. The subset was fixed before outcomes and was not resampled. Mapping failures predate reranking; this inspection does not establish whether each comes from extraction differences, annotation differences or a nonliteral answer.

| Cohort | Quote length | Selected questions | Scorable questions | Mapped items | Unmapped items |
|---|---|---:|---:|---:|---:|

| chunk_omission | 4+ words | 10 | 2 | 4 | 2 |

| chunk_omission | under 4 words | 10 | 5 | 11 | 3 |

| chunk_omission | all | 10 | 6 | 15 | 5 |

| acceptable | 4+ words | 10 | 1 | 1 | 13 |

| acceptable | under 4 words | 10 | 1 | 1 | 2 |

| acceptable | all | 10 | 2 | 2 | 15 |


## Was the mapping or sorting wrong?

The saved evidence shows **no local mapping/sorting defect**: all 40 dispatch hashes match frozen queries and candidates; outputs are exact permutations, scores descend, and ties keep input order. Across all 20 dense/hybrid question pairs, **922 of 922 shared chunks receive exactly identical reranker scores**, despite different retrieval ordering. That supports the observed ranks being consistent model scoring rather than local candidate swaps. Raw provider response rows were not retained, so the provider's internal index/text association cannot be independently replayed from these artifacts.

All **34 first hits before and 34 afterward** are whitespace-normalized whole-quote matches. None is a boundary-overlap-only first hit. All matching candidates for the detailed affected/longer items are also whole-quote matches. The unchanged scorer permits verified same-paper range overlap, but that rule does not cause these reported changes. Short quotes remain substring matches: “CNN” can match “MP-CNN” in a table, which is weaker evidence than a complete answer.

## Facts and limits

The largest sampled query was **162 UTF-8 bytes**, and candidate passage **603 bytes**; each pool had 50 candidates. Queries and text were preserved. Bytes are not BGE token counts, and neither these sizes nor the smoke checks prove exactly how hosted truncation works.

Verified: the passages above received the saved scores and moved to the reported ranks. Hypotheses: the reranker's relevance preferences or extracted formatting might contribute. Neither a neural mechanism nor truncation is established as the cause. No alternate query, title stripping, model change or answer generation was tested.

Full exact questions, gold quotes, every matching candidate with its own before/after rank, method, containsExactQuote flag and full text, plus both top-five lists with scores, are in [evidence.json](evidence.json). It also contains all longer omission items, per-case score comparisons, excluded-case statuses and preservation hashes.

Validation: `node eval/reranker-inspection-20261103/inspect.mjs` and `node eval/reranker-inspection-20261103/render.mjs`. The inspection recomputed matching from dev sources only after membership/hash checks. Frozen r1/r2 hashes matched before and after. No network, credentials, inference, held-out source reads or application edits occurred.

