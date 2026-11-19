# Saved Stage 2 outcomes by question clarity

Prepared 6 November 2026 by an offline case-ID join. No retrieval, embedding, generation calls, label edits, held-out paper content reads, application changes or changes to previous results. Counts are PDF/DOCX case units, not necessarily independent original question IDs.

## Main sample: 200 dev cases

The requested totals of 25 relevance-gate rejections, 57 missing/incomplete-evidence cases and 14 rank-16–50 cases all belong to the dev200 cohort. The earlier40 cohort and 39 off-topic controls are excluded from this table. Every case appears once per arm, with unchanged saved grades.

| Clarity group | Cases per arm | Settings | Adequate | Partial | Wrong | Refused |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| Standalone **(under 20)** | 13 | old | 5 | 4 | 0 | 4 |
| Standalone **(under 20)** | 13 | new | 7 | 2 | 0 | 4 |
| Topic given; context missing | 77 | old | 32 | 7 | 11 | 27 |
| Topic given; context missing | 77 | new | 47 | 10 | 8 | 12 |
| Too general | 110 | old | 46 | 14 | 1 | 49 |
| Too general | 110 | new | 62 | 11 | 6 | 31 |
| **Total** | **200** | **old** | **83** | **25** | **12** | **80** |
| **Total** | **200** | **new** | **116** | **23** | **14** | **47** |

## Diagnostic groups within the same 200 cases

| Clarity group | Cases | Gate rejections (of 25) | Saved missing-evidence cases (of 57) | Found at ranks 16–50 (of 14) |
| --- | ---: | ---: | ---: | ---: |
| Standalone **(under 20)** | 13 | 1 | 5 | 2 |
| Topic given; context missing | 77 | 4 | 15 | 3 |
| Too general | 110 | 20 | 37 | 9 |
| **Total** | **200** | **25** | **57** | **14** |

The same 25 case IDs were rejected by the relevance gate in both arms; they are counted once here. The 57 and 14 refer to the new arm only. The 14 are a subset of the 57. The 25 gate rejections are also contained in the 57. These columns overlap and must not be added.

The historical 57-case membership is preserved exactly. The later saved audit classified 3 as already present and 11 as unresolved. They remain in the requested 57-case cross-tab; this report does not rejudge or relabel them. The ranks16–50 column uses the saved gap category b, without recomputing ranks.

## Small groups

Only the standalone group in the main sample has fewer than 20 cases: 13 case units. The other groups have 77 and 110. Small-group percentages would be unstable, so raw counts are shown. Question-level counts, including the number of distinct original IDs in each group, are in summary.json.

## Earlier 40 cases, kept separate

| Clarity group | Cases per arm | Settings | Adequate | Partial | Wrong | Refused |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| Standalone **(under 20)** | 3 | old | 3 | 0 | 0 | 0 |
| Standalone **(under 20)** | 3 | new | 3 | 0 | 0 | 0 |
| Topic given; context missing **(under 20)** | 15 | old | 9 | 2 | 0 | 4 |
| Topic given; context missing **(under 20)** | 15 | new | 12 | 1 | 1 | 1 |
| Too general | 22 | old | 14 | 2 | 0 | 6 |
| Too general | 22 | new | 17 | 1 | 1 | 3 |

The standalone group (3) and topic/context-missing group (15) have fewer than 20 earlier40 case units. The generic group has 22. This cohort was used in earlier prompt selection and is not part of the requested 25/57/14 denominators.

## Interpretation

These Stage 2 answers used the original question with the correct paper selected, in both arms. They are not the subsequent no-selection test and do not measure no-selection answer quality. Selected-paper context already resolves much of a vague question's missing reference. Associations between clarity groups and failures do not prove that question wording caused those failures. The clarity labels are provisional assistant question-only judgments, including saved borderline flags, not new outcome labels.

Old settings: 4096 total / 1200 per-document context / 5 hits / strict prompt. New settings: 5000 total / 3200 per-document context / 15 hits / prompt C. Both used Qwen, hybrid retrieval, reranking off, temperature 0 and explicit output max_tokens 512.

## Artifacts and checks

- joined-dev200.jsonl: every main-sample case, preserved clarity label, old/new grades, gate flags and diagnostic membership.
- summary.json: group counts, separate earlier40 counts, small-group flags and input hashes.
- verification.json: totals, subset checks and before/after hashes.
- report.mjs: reproducible offline join and assertions.

Saved inputs:

- judgments: eval/stage2-end-to-end-20261105/judgments.jsonl
- gates: eval/stage2-end-to-end-20261105/gate-rejections.jsonl
- gaps: eval/stage2-evidence-gaps-20261105/cases.jsonl
- clarity: eval/dev-question-clarity-20261106/cases.jsonl
- split: eval/split.json
