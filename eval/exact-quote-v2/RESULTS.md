# Exact-quote evaluation result — 2026-11-01

Status: **stopped at Step 3a**, as requested. The old chunk-identity false hit is rejected by the new matcher. No acceptable-case retrieval or top-50 measurement followed the failed gate.

## Final table

| Dev group | Cases queried | Locatable gold cases | k=5 quote hits | k=10 | k=20 | k=50 | MRR |
|---|---:|---:|---|---|---|---|---|
| Chunk omissions | 236 | 157 | 20/157 (12.74%) | Not run | Not run | Not run | Not computed |
| Acceptable | 0 of 204 | 118 available | Not run after stop | — | — | — | — |
| Scope rejections | 0 of 19 | Excluded | Excluded | Excluded | Excluded | Excluded | Excluded |

The 20 matches comprise 15 PDF cases and 5 DOCX cases. All are whole annotated-quote containment matches. None depends on the range-overlap branch.

The 79 unscorable omission cases comprise 67 whose literal gold quotes cannot be found in the extracted paper, 11 with no literal answer quote (such as yes/no references), and one with only unanswerable references. They were queried but excluded from the quote-hit denominator. A score over all 236 cases cannot be established from this gold mapping. The 118 locatable acceptable cases are a preparation count, not an executed hit score.

## Why the sanity check failed

The predeclared near-zero criterion was at most 1%. The observed mapped-case rate is 12.74%.

**All 20 matched quotes also occur in the saved production top five.** These hits do not demonstrate that the retrieval pipeline improved or that a missing fact was recovered. The diagnosis category identifies cases with missing required information; some other parts of the answer can already be present.

The available annotated extractive spans sometimes contain separate items of a list, such as “English”, “BERT”, or “MLE”. Each complete annotated span was treated as a gold quote and a match to any span counted as a hit. Multiple spans in one reference can be components of a complete answer, rather than independent complete answers. Exact text matching alone does not resolve that distinction. No quotes were shortened, removed, or selected based on their original retrieval rank to force a zero score.

The matcher normalizes whitespace only. It preserves case, Unicode, punctuation, and LaTeX. It accepts the entire quote as a literal substring, or positive overlap of exact same-paper offsets. An offset is established only through exact text location in the normalized extracted paper. Repeated chunk text is not assigned an arbitrary position. The gold data uses literal annotated extractive answers or literal free-form reference answers, not generic diagnostic sourceEvidence. Cases without a trustworthy literal mapping remain explicit.

## Evidence

- [Previous false hit: whole chunk, gold quote, and explanation](false-hit.md)
- [Every observed hit: whole chunks and quotes](all-hit-details.md)
- [Ten random hits and ten random misses, seed 42](random-examples.md)
- [Machine-readable result](final-summary.json)
- [Gold mapping and coverage](gold-mapping.jsonl)
- [Preservation check](preservation-check.json)

The ten random misses display rank1 as a comparison chunk. None of their top-five chunks matched a mapped gold quote. The ten random hits display their first matching chunk. These examples were printed by the run and saved in full.

The requested comparison between the top five of a k=50 run and production k=5 for 20 cases was **not run**, because Step 3a stopped the experiment. The existing hybrid implementation uses a k-dependent prefetch size; equivalence must be checked rather than assumed if a later run reaches Step 4.

## Validation and preservation

- Seven focused offline matcher tests passed.
- 236 dev-only retrieval calls completed successfully.
- All 33 frozen production file hashes remain unchanged.
- The split SHA-256 remains 8b9d27fdca32d319355d92da0cce5f430b4725bb0cdc00faa7140b218da560c8.
- Only new files under eval/exact-quote-v2 were created. Old evaluation scripts and results were preserved.
- No test-paper content, answer generation, Cloudflare, ingestion, or index mutation was used.

## Unresolved questions

To measure recovery of the information responsible for each diagnosed omission, a future gold mapping needs to identify the required missing fact or a complete answer set, rather than count any annotated answer component. That is a proposed next step, not an applied change. The current strict quote rule and the failed sanity result are preserved as evidence. No further retrieval should be inferred from this report.
