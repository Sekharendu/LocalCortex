# A/P production-query-form comparison — 2026-11-02

Completed 918 variant executions across 459 paired dev cases: 236 chunk omissions, 204 acceptable cases, and 19 separate scope rejections. Each variant requests top 50 once per case; all cutoffs are slices of that one ranking. No answers were generated. The interrupted run preserved 379 completed PDF pairs and 2 completed DOCX pairs; the remaining 78 DOCX pairs were resumed without repeating saved retrievals. An unrecorded in-flight request at interruption cannot be audited.

## Request path

See [REQUEST-PATH.md](REQUEST-PATH.md) and [request-path.json](request-path.json). The exact embedding/keyword input per case is saved in case-plan.jsonl and checked against outgoing requests in pdf/docx.traces.jsonl.

The standalone endpoint uses the question as received. Embedding receives search_query: plus acronym-expanded question. Keyword encoding receives the same expanded question without the prefix, and executes only when hybrid mode's dense gate passes. No original dev question explicitly references a document, so P is unrestricted within the selected collection. A uses the prepared title wrapper and its recorded per-document scope. Source default retrieval mode is dense; both experiment arms explicitly retain the prior hybrid settings. This compares production query formation and scope under hybrid, not an unspecified live-server configuration.

Both variants have the same dev-document dataset boundary. No gold-paper filter is added to P. This protects held-out content but differs from unrestricted search over the full original collection. Original full-collection IDF and frozen sparse statistics are retained. A/P changes both wording and scope; it does not isolate title wording alone.

## Item-level recall

Each unique whole literal reference answer quote is an item. Items are deduplicated per case by whitespace-normalized quote. Quotes are separated by whitespace-delimited word count. Only exact source-locatable items enter the denominator; unmappable quotes and cases with no literal gold remain explicit. Direct containment or verified same-paper range overlap is accepted, as in the preceding approved rule. An identical quote retrieved from a different paper is never credited. Alternative reference variants remain separate items unless their normalized text is identical, so this is evidence-item coverage, not complete semantic answer accuracy.

| Group | Quote length | Variant | Mapped items | Unmapped items | R@5 | R@10 | R@20 | R@50 | MRR@50 |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| chunk_omission | 4+ words | A | 148 | 214 | 4.05% | 27.03% | 52.03% | 85.81% | 0.0730 |
| chunk_omission | 4+ words | P | 148 | 214 | 15.54% | 21.62% | 29.73% | 45.27% | 0.0984 |
| chunk_omission | under 4 words | A | 298 | 45 | 10.40% | 24.83% | 52.01% | 84.56% | 0.1016 |
| chunk_omission | under 4 words | P | 298 | 45 | 20.47% | 28.86% | 35.23% | 47.65% | 0.1162 |
| acceptable | 4+ words | A | 103 | 158 | 44.66% | 52.43% | 71.84% | 92.23% | 0.2851 |
| acceptable | 4+ words | P | 103 | 158 | 31.07% | 38.83% | 53.40% | 64.08% | 0.2247 |
| acceptable | under 4 words | A | 157 | 22 | 55.41% | 64.97% | 82.17% | 96.18% | 0.3228 |
| acceptable | under 4 words | P | 157 | 22 | 31.21% | 35.67% | 47.13% | 58.60% | 0.1767 |

MRR@50 averages reciprocal first-hit rank across mapped items; not found contributes 0. The production hybrid candidate prefetch depends on k; these cutoffs describe the k=50 ranking, not independent production k=5, k=10, or k=20 runs.

## Paired case changes

Here “pass” means at least one mapped gold item appears at the cutoff. It does not mean the final answer is correct or complete. There are 79 unscorable omission cases and 86 unscorable acceptable cases under the literal mapping. More detailed differences by quote length and all-mapped-item coverage are in case-changes.json.

| Group | Cutoff | Scorable cases | Both pass | A only | P only | Neither | Different |
|---|---:|---:|---:|---:|---:|---:|---:|
| chunk_omission | 5 | 157 | 7 | 13 | 31 | 106 | 44 |
| chunk_omission | 10 | 157 | 27 | 35 | 21 | 74 | 56 |
| chunk_omission | 20 | 157 | 48 | 59 | 15 | 35 | 74 |
| chunk_omission | 50 | 157 | 78 | 71 | 2 | 6 | 73 |
| acceptable | 5 | 118 | 30 | 39 | 6 | 43 | 45 |
| acceptable | 10 | 118 | 40 | 42 | 6 | 30 | 48 |
| acceptable | 20 | 118 | 57 | 42 | 3 | 16 | 45 |
| acceptable | 50 | 118 | 69 | 45 | 1 | 3 | 46 |

## Scope and relevance gates

| Group | Variant | Cases | Scope rejected | Dense gate rejected | Returned chunks | Target paper in top50 |
|---|---|---:|---:|---:|---:|---:|
| chunk_omission | A | 236 | 0 | 0 | 236 | 236 |
| chunk_omission | P | 236 | 0 | 0 | 236 | 176 |
| acceptable | A | 204 | 0 | 0 | 204 | 204 |
| acceptable | P | 204 | 0 | 1 | 203 | 162 |
| scope_rejection | A | 19 | 19 | 0 | 0 | 0 |
| scope_rejection | P | 19 | 0 | 0 | 19 | 13 |

19 of 19 A scope decisions reject the wrapper's document reference; 19 also reject on the frozen dev-only header snapshot. P has 0 scope rejections and 19 unrestricted decisions. Of these 19 P queries, 19 return chunks, 13 include the intended paper in the top 50, and 7 find at least one mapped gold item. Removing the wrapper removes the document constraint; it does not repair the title resolver or guarantee the correct paper. These 19 cases are excluded from the main recall and paired-case tables.

## Preservation and validation

Six focused offline tests passed before the live run. All 33 frozen production source hashes and split.json remain unchanged. Only new files under eval/ap-query-form-20261102 were created. All outbound requests were restricted to local Ollama embeddings or Qdrant queries with the dev boundary applied to every prefetch. Returned payloads were checked against dev-only indexed snapshots. No test-paper content, generation, Cloudflare, ingestion, or index mutations were used. Raw vectors are not included in result tables.

Files: item-recall.json, case-changes.json, scope-comparison.json, retrieval-behavior.json, item-first-ranks.jsonl, pdf/docx.results.jsonl and pdf/docx.traces.jsonl.
