# Q: default dense retrieval versus hybrid — 2026-11-02

Q asks the actual question within the same selected paper as A. The query text, document scope, model/prefixes, relevance threshold 0.63, gold items and dev-only boundary were kept identical. Only retrieval mode changed. Dense uses the actual existing default retrieve() branch, including its initial thresholded search and its same-document fill at threshold 0 after the initial search passes. No production code was modified.

459 dev cases were run for dense (236 omissions, 204 acceptable, 19 separate scope rejections). The 459 verified saved Q hybrid rankings were reused. Each mode provides one top-50 ranking per case; cutoffs are slices of that ranking, not separate production-k runs.

## Quotes of four or more words

| Cases | Mode | Mapped items | Recall@5 | @10 | @20 | @50 | MRR@50 |
|---|---|---:|---:|---:|---:|---:|---:|
| chunk_omission | hybrid | 148 | 49.32% | 66.22% | 76.35% | 87.84% | 0.2712 |
| chunk_omission | dense | 148 | 41.89% | 60.14% | 72.30% | 85.14% | 0.2976 |
| acceptable | hybrid | 103 | 59.22% | 73.79% | 87.38% | 93.20% | 0.4095 |
| acceptable | dense | 103 | 56.31% | 74.76% | 84.47% | 94.17% | 0.4062 |

## Quotes under four words

| Cases | Mode | Mapped items | Recall@5 | @10 | @20 | @50 | MRR@50 |
|---|---|---:|---:|---:|---:|---:|---:|
| chunk_omission | hybrid | 298 | 54.03% | 63.76% | 76.85% | 89.93% | 0.3590 |
| chunk_omission | dense | 298 | 56.04% | 65.10% | 73.83% | 90.60% | 0.3616 |
| acceptable | hybrid | 157 | 70.06% | 73.89% | 89.17% | 96.82% | 0.4598 |
| acceptable | dense | 157 | 67.52% | 75.16% | 89.17% | 96.82% | 0.4723 |

Recall is micro item recall. MRR averages reciprocal first-hit rank over mapped quote items, with zero for not found. Matching remains exact whitespace-normalized quote containment OR verified same-paper normalized character-range overlap, as previously approved. Gold items must come from their own paper. This does not grade generated answers or guarantee full-answer coverage.

Unmapped items were excluded identically: omissions 214 long / 45 short; acceptable 158 long / 22 short. There are 157 scorable omission cases and 118 scorable acceptable cases; 79 omissions and 86 acceptable cases lack mapped gold and remain unscorable. They were still queried.

## Case-level differences

Here a case hit means at least one mapped gold item appears within the cutoff. It does not mean a correct or complete answer. More detailed length-specific case differences are saved in case-changes.json.

| Cases | Cutoff | Both find an item | Hybrid only | Dense only | Neither | Different |
|---|---:|---:|---:|---:|---:|---:|
| chunk_omission | 5 | 93 | 9 | 9 | 46 | 18 |
| chunk_omission | 10 | 108 | 6 | 6 | 37 | 12 |
| chunk_omission | 20 | 126 | 5 | 1 | 25 | 6 |
| chunk_omission | 50 | 137 | 4 | 0 | 16 | 4 |
| acceptable | 5 | 73 | 3 | 2 | 40 | 5 |
| acceptable | 10 | 86 | 1 | 3 | 28 | 4 |
| acceptable | 20 | 101 | 3 | 2 | 12 | 5 |
| acceptable | 50 | 111 | 0 | 0 | 7 | 0 |

## Scope and relevance behavior

| Cases | Mode | Cases tested | Scope rejected | Relevance rejected | Returned chunks |
|---|---|---:|---:|---:|---:|
| chunk_omission | hybrid | 236 | 0 | 27 | 209 |
| chunk_omission | dense | 236 | 0 | 27 | 209 |
| acceptable | hybrid | 204 | 0 | 16 | 188 |
| acceptable | dense | 204 | 0 | 16 | 188 |
| scope_rejection | hybrid | 19 | 19 | 0 | 0 |
| scope_rejection | dense | 19 | 19 | 0 | 0 |

Scope rejections remain separate from recall. Dense and hybrid have 0 differences in whether the existing relevance gate passes. Dense request traces distinguish the thresholded search from the existing same-document expansion; keyword/fusion requests were blocked by the dense harness.

## Validation and preservation

Five focused checks passed before live execution. All 33 frozen production source hashes, split.json, and the manifested Q hybrid baseline files remain unchanged. Retrieved payloads were verified against dev-only indexed snapshots. No held-out paper content, answer generation, follow-up rewrite, Cloudflare call, ingestion, index mutation, deployment or GitHub push occurred. Only new files under eval/q-dense-vs-hybrid-20261102 were created.

Raw rankings/traces are in pdf/docx.results.jsonl and pdf/docx.traces.jsonl. Full machine-readable summaries are in final-summary.json, item-recall.json, case-changes.json and retrieval-behavior.json. Item ranks are in item-first-ranks.jsonl. Hybrid is a saved baseline from the preceding Q run; no runtime-performance conclusion is drawn from this comparison.
