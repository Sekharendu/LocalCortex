# RERANK-1 bounded hosted dev validation

Status: complete. 44/44 attempts reserved before dispatch: 4 synthetic, 40 dev. 40/40 dev pools completed across 20/20 frozen cases. Failed attempts: 0; unattempted dev pools: 0. No retries, answer generation, query rewriting or new retrieval occurred. All reviewed r1 files remained byte-identical: true.

The user reported Free plan and zero neurons used on 2026-11-02. This is dashboard evidence supplied by the user, not API verification. Billing/subscription reads remained forbidden (403). Provider response usage objects report 114.02856860280329 neurons summed over these 44 calls; this is not a current account-wide usage or remaining-allowance reading. Raw numeric usage observations are saved separately. 4/4 coarse smoke orderings matched expectations. Tiny smoke tests establish contract/coarse behavior only.

The immutable r1 sample consists of ten omission and ten acceptable cases with both saved dense/hybrid pools. No resampling or gold changes. Ranking all candidates permits cutoffs from the same k50 pool. Q hybrid first five remains a slice of one k50 ranking, not independent production k5.

## Quotes of four or more words

| Group | Mode | Ranking | Mapped items | R@5 | R@10 | R@20 | R@50 | MRR |
|---|---|---|---:|---:|---:|---:|---:|---:|
| chunk_omission | dense | saved baseline | 4 | 25.00% | 100.00% | 100.00% | 100.00% | 0.3250 |
| chunk_omission | dense | reranked | 4 | 0.00% | 75.00% | 75.00% | 100.00% | 0.0923 |
| acceptable | dense | saved baseline | 1 | 0.00% | 0.00% | 0.00% | 100.00% | 0.0455 |
| acceptable | dense | reranked | 1 | 100.00% | 100.00% | 100.00% | 100.00% | 0.3333 |
| chunk_omission | hybrid | saved baseline | 4 | 25.00% | 25.00% | 100.00% | 100.00% | 0.3182 |
| chunk_omission | hybrid | reranked | 4 | 0.00% | 75.00% | 75.00% | 100.00% | 0.0839 |
| acceptable | hybrid | saved baseline | 1 | 0.00% | 0.00% | 100.00% | 100.00% | 0.0667 |
| acceptable | hybrid | reranked | 1 | 100.00% | 100.00% | 100.00% | 100.00% | 0.3333 |

## Quotes under four words

| Group | Mode | Ranking | Mapped items | R@5 | R@10 | R@20 | R@50 | MRR |
|---|---|---|---:|---:|---:|---:|---:|---:|
| chunk_omission | dense | saved baseline | 11 | 81.82% | 90.91% | 90.91% | 100.00% | 0.4999 |
| chunk_omission | dense | reranked | 11 | 72.73% | 81.82% | 81.82% | 100.00% | 0.2721 |
| acceptable | dense | saved baseline | 1 | 100.00% | 100.00% | 100.00% | 100.00% | 1.0000 |
| acceptable | dense | reranked | 1 | 100.00% | 100.00% | 100.00% | 100.00% | 1.0000 |
| chunk_omission | hybrid | saved baseline | 11 | 90.91% | 90.91% | 90.91% | 100.00% | 0.5430 |
| chunk_omission | hybrid | reranked | 11 | 72.73% | 81.82% | 81.82% | 100.00% | 0.2718 |
| acceptable | hybrid | saved baseline | 1 | 100.00% | 100.00% | 100.00% | 100.00% | 1.0000 |
| acceptable | hybrid | reranked | 1 | 100.00% | 100.00% | 100.00% | 100.00% | 1.0000 |

## Any-item case changes

| Mode | Group | Quote length | k | Baseline only (loss) | Rerank only (gain) | Both | Neither | Unscorable |
|---|---|---|---:|---:|---:|---:|---:|---:|
| dense | chunk_omission | 4+ words | 5 | 1 | 0 | 0 | 1 | 8 |
| dense | chunk_omission | 4+ words | 10 | 1 | 0 | 1 | 0 | 8 |
| dense | chunk_omission | 4+ words | 20 | 1 | 0 | 1 | 0 | 8 |
| dense | chunk_omission | 4+ words | 50 | 0 | 0 | 2 | 0 | 8 |
| dense | chunk_omission | under 4 words | 5 | 2 | 0 | 3 | 0 | 5 |
| dense | chunk_omission | under 4 words | 10 | 1 | 0 | 4 | 0 | 5 |
| dense | chunk_omission | under 4 words | 20 | 1 | 0 | 4 | 0 | 5 |
| dense | chunk_omission | under 4 words | 50 | 0 | 0 | 5 | 0 | 5 |
| dense | acceptable | 4+ words | 5 | 0 | 1 | 0 | 0 | 9 |
| dense | acceptable | 4+ words | 10 | 0 | 1 | 0 | 0 | 9 |
| dense | acceptable | 4+ words | 20 | 0 | 1 | 0 | 0 | 9 |
| dense | acceptable | 4+ words | 50 | 0 | 0 | 1 | 0 | 9 |
| dense | acceptable | under 4 words | 5 | 0 | 0 | 1 | 0 | 9 |
| dense | acceptable | under 4 words | 10 | 0 | 0 | 1 | 0 | 9 |
| dense | acceptable | under 4 words | 20 | 0 | 0 | 1 | 0 | 9 |
| dense | acceptable | under 4 words | 50 | 0 | 0 | 1 | 0 | 9 |
| hybrid | chunk_omission | 4+ words | 5 | 1 | 0 | 0 | 1 | 8 |
| hybrid | chunk_omission | 4+ words | 10 | 1 | 1 | 0 | 0 | 8 |
| hybrid | chunk_omission | 4+ words | 20 | 1 | 0 | 1 | 0 | 8 |
| hybrid | chunk_omission | 4+ words | 50 | 0 | 0 | 2 | 0 | 8 |
| hybrid | chunk_omission | under 4 words | 5 | 2 | 0 | 3 | 0 | 5 |
| hybrid | chunk_omission | under 4 words | 10 | 1 | 0 | 4 | 0 | 5 |
| hybrid | chunk_omission | under 4 words | 20 | 1 | 0 | 4 | 0 | 5 |
| hybrid | chunk_omission | under 4 words | 50 | 0 | 0 | 5 | 0 | 5 |
| hybrid | acceptable | 4+ words | 5 | 0 | 1 | 0 | 0 | 9 |
| hybrid | acceptable | 4+ words | 10 | 0 | 1 | 0 | 0 | 9 |
| hybrid | acceptable | 4+ words | 20 | 0 | 0 | 1 | 0 | 9 |
| hybrid | acceptable | 4+ words | 50 | 0 | 0 | 1 | 0 | 9 |
| hybrid | acceptable | under 4 words | 5 | 0 | 0 | 1 | 0 | 9 |
| hybrid | acceptable | under 4 words | 10 | 0 | 0 | 1 | 0 | 9 |
| hybrid | acceptable | under 4 words | 20 | 0 | 0 | 1 | 0 | 9 |
| hybrid | acceptable | under 4 words | 50 | 0 | 0 | 1 | 0 | 9 |

## Individual item changes

| Mode | Group | Quote length | k | Item gains | Item regressions |
|---|---|---|---:|---:|---:|
| dense | chunk_omission | 4+ words | 5 | 0 | 1 |
| dense | chunk_omission | 4+ words | 10 | 0 | 1 |
| dense | chunk_omission | 4+ words | 20 | 0 | 1 |
| dense | chunk_omission | 4+ words | 50 | 0 | 0 |
| dense | chunk_omission | under 4 words | 5 | 1 | 2 |
| dense | chunk_omission | under 4 words | 10 | 0 | 1 |
| dense | chunk_omission | under 4 words | 20 | 0 | 1 |
| dense | chunk_omission | under 4 words | 50 | 0 | 0 |
| dense | acceptable | 4+ words | 5 | 1 | 0 |
| dense | acceptable | 4+ words | 10 | 1 | 0 |
| dense | acceptable | 4+ words | 20 | 1 | 0 |
| dense | acceptable | 4+ words | 50 | 0 | 0 |
| dense | acceptable | under 4 words | 5 | 0 | 0 |
| dense | acceptable | under 4 words | 10 | 0 | 0 |
| dense | acceptable | under 4 words | 20 | 0 | 0 |
| dense | acceptable | under 4 words | 50 | 0 | 0 |
| hybrid | chunk_omission | 4+ words | 5 | 0 | 1 |
| hybrid | chunk_omission | 4+ words | 10 | 3 | 1 |
| hybrid | chunk_omission | 4+ words | 20 | 0 | 1 |
| hybrid | chunk_omission | 4+ words | 50 | 0 | 0 |
| hybrid | chunk_omission | under 4 words | 5 | 0 | 2 |
| hybrid | chunk_omission | under 4 words | 10 | 0 | 1 |
| hybrid | chunk_omission | under 4 words | 20 | 0 | 1 |
| hybrid | chunk_omission | under 4 words | 50 | 0 | 0 |
| hybrid | acceptable | 4+ words | 5 | 1 | 0 |
| hybrid | acceptable | 4+ words | 10 | 1 | 0 |
| hybrid | acceptable | 4+ words | 20 | 0 | 0 |
| hybrid | acceptable | 4+ words | 50 | 0 | 0 |
| hybrid | acceptable | under 4 words | 5 | 0 | 0 |
| hybrid | acceptable | under 4 words | 10 | 0 | 0 |
| hybrid | acceptable | under 4 words | 20 | 0 | 0 |
| hybrid | acceptable | under 4 words | 50 | 0 | 0 |

Exact item IDs and before/after ranks are in comparison.json. Only source-locatable original gold items count, using whitespace-only whole-quote containment OR verified same-paper normalized range overlap. Unmapped cases remain unscorable. Failed/unattempted pools are excluded from paired quality metrics and are disclosed above; they are never treated as successful retrieval.

These results measure candidate ordering on a small dev sample, not complete-answer coverage or final answer accuracy. Input text was preserved. Byte sizes and coarse long-input ordering do not establish BGE token counts or the provider's exact 512-token truncation policy. Native model is fixed @cf/baai/bge-reranker-base. No default was enabled and no application or r1 snapshot file was changed.
