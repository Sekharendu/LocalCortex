# Dev retrieval without selecting the correct paper

Completed 6 November 2026. Retrieval and context assembly only; no answer generation or Cloudflare calls. Application code/defaults and split.json were unchanged.

## Setup

All 610 dev case units were run with their original question, no added title, no selected-paper ID, no history, hybrid RRF, threshold 0.63, nomic search_query prefixes, reranking off, 15 hits, prompt C, 3200 per-document context cap and 5000 total budget. The same application retrieveForQuestion/context/prompt functions were used. The expected paper is read only for scoring, never to construct the query/filter. Independent production k=5 retrieval was also run for all 234 previously quote-scorable cases. Embeddings were reused between depths for the same question; all searches were fresh.

Every query and hybrid prefetch used the same fixed development-corpus allowlist for that format. PDF queries searched all 140 dev PDF papers; DOCX queries searched all 33 available dev DOCX assets. Existing format collections were kept separate, as in previous evaluations. This is not a combined PDF+DOCX collection test. No held-out paper payloads or source files were read. Existing sparse statistics/global Qdrant IDF were retained; server-side statistics are not claimed dev-only.

## Expected-paper retrieval across all cases

| Measurement | Result |
| --- | --- |
| Expected paper supplied the first chunk | 210/610 (34.4%) |
| Expected paper appeared within 15 chunks | 372/610 (61.0%) |
| Expected paper appeared in final context | 349/610 (57.2%) |
| Relevance gate returned no chunks | 2/610 (0.3%) |

These are source-paper recall measurements, not answer correctness. An answer from another paper can be valid for a broad question. QASPER questions were written in the context of an individual paper; many original questions (e.g. "Which datasets do they use?") lose their referent when submitted alone. We do not classify all non-target-paper results as wrong.

## Exact reference-quote coverage

A pass requires every quote in one eligible reference alternative, after whitespace normalization, in chunks from the expected paper. No fuzzy/partial matches. This conservative source-specific proxy does not grade meaning, prove complete evidence, or judge answers from other papers. The same 234 frozen quote-scorable cases and reference alternatives as the prior selected-paper retrieval test were used. All 610 were searched; the other 376 are excluded from this quote metric because the earlier preparation did not validate them for this rule (including yes/no, unanswerable, ambiguous, boundary/extraction/reference mapping issues).

| Group | Previous: selected paper, k=5 | No paper selection, k=5 | No paper selection, k=15 | No paper selection, final context |
| --- | --- | --- | --- | --- |
| 119 longer-quote cases | 62/119 (52.1%) | 31/119 (26.1%) | 48/119 (40.3%) | 58/119 (48.7%) |
| 115 short-name/term cases (weaker proxy) | 50/115 (43.5%) | 18/115 (15.7%) | 24/115 (20.9%) | 35/115 (30.4%) |

On 111 quote-scorable cases overlapping Stage 2, the exact same k=15/current-builder final-context comparison found 90 covered with paper selection versus 43 without: 0 gained, 47 lost. This is quote coverage, not the Stage 2 blind semantic evidence judgment. Case-level pairing is in paired-context.jsonl.

## Controls and limitations

The 19 historical scope-rejection controls were included in the all-dev retrieval run but excluded from quote recall: 0 relevance-gate rejections; expected paper within 15 in 10/19. Their old title-wrapper rejection category does not carry over to this original-question, no-selection setup.

No adequate/partial/wrong/refused answer rates are reported, because no answers were generated. Gate rejections are reported as retrieval events, not graded generated refusals. This is a first-turn, no-document-selection retrieval baseline; it does not test clarification dialogues or source-aware synthesis across documents.

Network totals: 610 local embeddings, 234 embedding-response reuses, 1686 Qdrant query calls, 4741 dev-filtered context scrolls, zero hosted/generation calls. Before/after hashes verified all frozen application inputs and split unchanged.

Artifacts: run.mjs, report.mjs, format manifests/status files, format results.jsonl (questions, query traces, retrieved chunks, final passages/prompts and scores), summary.json, flips-k5.jsonl, paired-context.jsonl.
