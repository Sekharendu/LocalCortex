# Question-only search within the same paper — 2026-11-02

The proposed change was implemented only in a new evaluation harness. The running app is unchanged. Q searches with the actual question while retaining A's exact saved document scope. This isolates the query-text change between A and Q. Missing document identities remain rejected; no gold paper was forced into scope.

- A: title-prefixed question, search the resolved paper.
- P: original question, search across dev papers under production unrestricted scope.
- Q: original question, search within the same paper as A.

All 459 dev cases were tested for Q: 236 prior chunk omissions, 204 acceptable cases, and 19 separate scope rejections. The 918 saved A/P rankings were integrity-checked and reused rather than rerun. Hybrid mode, model name, task prefixes, threshold 0.63, RRF fusion, original sparse statistics and dev corpus boundary were held constant. The source defaults dense unless configured otherwise; these are hybrid experiments.

Each result is a single request for up to 50 chunks. R@5/10/20/50 are cutoffs from that ranking. Metrics score individual source-locatable reference quote items, using the same whitespace-only exact containment or verified same-paper range overlap rule as the previous experiment. They do not measure final generated answer accuracy. Gold and all denominators are unchanged.

## Quotes of four or more words

| Cases | Variant | Mapped items | R@5 | R@10 | R@20 | R@50 | MRR@50 |
|---|---|---:|---:|---:|---:|---:|---:|
| chunk_omission | A | 148 | 4.05% | 27.03% | 52.03% | 85.81% | 0.0730 |
| chunk_omission | P | 148 | 15.54% | 21.62% | 29.73% | 45.27% | 0.0984 |
| chunk_omission | Q | 148 | 49.32% | 66.22% | 76.35% | 87.84% | 0.2712 |
| acceptable | A | 103 | 44.66% | 52.43% | 71.84% | 92.23% | 0.2851 |
| acceptable | P | 103 | 31.07% | 38.83% | 53.40% | 64.08% | 0.2247 |
| acceptable | Q | 103 | 59.22% | 73.79% | 87.38% | 93.20% | 0.4095 |

## Quotes under four words

| Cases | Variant | Mapped items | R@5 | R@10 | R@20 | R@50 | MRR@50 |
|---|---|---:|---:|---:|---:|---:|---:|
| chunk_omission | A | 298 | 10.40% | 24.83% | 52.01% | 84.56% | 0.1016 |
| chunk_omission | P | 298 | 20.47% | 28.86% | 35.23% | 47.65% | 0.1162 |
| chunk_omission | Q | 298 | 54.03% | 63.76% | 76.85% | 89.93% | 0.3590 |
| acceptable | A | 157 | 55.41% | 64.97% | 82.17% | 96.18% | 0.3228 |
| acceptable | P | 157 | 31.21% | 35.67% | 47.13% | 58.60% | 0.1767 |
| acceptable | Q | 157 | 70.06% | 73.89% | 89.17% | 96.82% | 0.4598 |

Unmapped quote items excluded identically in all variants: omissions 214 long / 45 short; acceptable 158 long / 22 short. Cases with no mapped items remain unscorable: 79 omissions and 86 acceptable cases. Main case-change comparisons therefore cover 157 omission cases and 118 acceptable cases.

## Case changes

Finding at least one mapped item is a case-level hit for this table, not a complete or correct generated answer. Detailed per-length and all-mapped-item changes are in case-changes.json.

| Previous variant | Cases | Cutoff | Both find an item | Lost with Q | Gained with Q | Neither finds an item | Different |
|---|---|---:|---:|---:|---:|---:|---:|
| A | chunk_omission | 5 | 17 | 3 | 85 | 52 | 88 |
| A | chunk_omission | 10 | 57 | 5 | 57 | 38 | 62 |
| A | chunk_omission | 20 | 97 | 10 | 34 | 16 | 44 |
| A | chunk_omission | 50 | 137 | 12 | 4 | 4 | 16 |
| A | acceptable | 5 | 57 | 12 | 19 | 30 | 31 |
| A | acceptable | 10 | 72 | 10 | 15 | 21 | 25 |
| A | acceptable | 20 | 92 | 7 | 12 | 7 | 19 |
| A | acceptable | 50 | 107 | 7 | 4 | 0 | 11 |
| P | chunk_omission | 5 | 38 | 0 | 64 | 55 | 64 |
| P | chunk_omission | 10 | 48 | 0 | 66 | 43 | 66 |
| P | chunk_omission | 20 | 63 | 0 | 68 | 26 | 68 |
| P | chunk_omission | 50 | 80 | 0 | 61 | 16 | 61 |
| P | acceptable | 5 | 36 | 0 | 40 | 42 | 40 |
| P | acceptable | 10 | 45 | 1 | 42 | 30 | 43 |
| P | acceptable | 20 | 60 | 0 | 44 | 14 | 44 |
| P | acceptable | 50 | 70 | 0 | 41 | 7 | 41 |

## Scope and relevance gates

| Cases | Variant | Cases tested | Scope rejected | Relevance gate rejected | Returned chunks | Intended paper in top50 |
|---|---|---:|---:|---:|---:|---:|
| chunk_omission | A | 236 | 0 | 0 | 236 | 236 |
| chunk_omission | P | 236 | 0 | 0 | 236 | 176 |
| chunk_omission | Q | 236 | 0 | 27 | 209 | 209 |
| acceptable | A | 204 | 0 | 0 | 204 | 204 |
| acceptable | P | 204 | 0 | 1 | 203 | 162 |
| acceptable | Q | 204 | 0 | 16 | 188 | 188 |
| scope_rejection | A | 19 | 19 | 0 | 0 | 0 |
| scope_rejection | P | 19 | 0 | 0 | 19 | 13 |
| scope_rejection | Q | 19 | 19 | 0 | 0 | 0 |

Scope rejections are excluded from the main recall and case-change tables. Q preserves A's document selection including all 19 rejections. Its plain query can change the existing dense relevance-gate result; the threshold was not relaxed.

## Validation and preservation

Five focused tests passed before live execution. All 33 production source hashes, all 33 manifested A/P baseline artifacts, and split.json remain unchanged. Sparse-statistic hashes match the A/P baseline. Network guards checked actual embedding inputs, sparse encodings and document filters, blocked generation/nonlocal requests and held-out documents, and validated retrieved payloads against dev-only indexed snapshots. Only new files under eval/question-only-same-paper-20261102 were created.

Raw Q rankings and traces are in pdf/docx.results.jsonl and pdf/docx.traces.jsonl. All item ranks are in item-first-ranks.jsonl. Full comparisons are in final-summary.json and case-changes.json. A/P baselines are from the earlier run, so this is not a simultaneous baseline rerun. No answers, follow-up rewrites, ingestion, index mutations, deployment or GitHub push occurred.
