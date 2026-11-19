# Why FinanceBench filing questions miss (dev set only, 2026-11-17)

Read-only diagnosis. No app changes, no LLM/Cloudflare calls, no test data. Per-miss detail: `misses.md`; data: `data.json`, `stats.json`, `causes.json`; rerun: `python -X utf8 diagnose.py`.

## Hit counts (top 10, inside the question's own document)

| Set | Scored | Hybrid top 10 | Blend top 10 | Hybrid top 20 |
|---|---|---|---|---|
| FinanceBench | 111 | 79 (32 misses) | 80 (31 misses) | 85 |
| tat | 124 | 108 (16 misses) | 115 (9 misses) | 115 |

## Causes of the 32 FinanceBench misses (one reader's judgment)

| Cause | Primary (of 32) | Mentioned at all (of 32) |
|---|---|---|
| (a) table split: needed piece has no title / units / dates | 3 | 10 |
| (b) wrong period or look-alike table | 3 | 8 |
| (c) vocabulary gap: question names a derived figure (quick ratio, margin, PP&E…) | **18** | **23** |
| (d) bad section label (page header used as section) | 0 | 7 |
| (e) doubtful label | 1 | 10 |
| (f) other (near miss, narrative split, very long doc, "none" answer) | 7 | 16 |

Primary by question: a: 0043, 0055, 0111 · b: 0039, 0108, 0132 · c: 0005, 0016, 0031, 0037, 0040, 0041, 0050, 0063, 0075, 0076, 0085, 0086, 0114, 0121, 0130, 0135, 0144, 0145 · e: 0042 · f: 0024, 0032, 0036, 0038, 0044, 0064, 0105.

- About 10 of the 18 vocabulary-gap misses are ratio/margin questions (quick ratio ×3, inventory / fixed-asset turnover, capital intensity ×2, gross and operating margins). Even a titled balance-sheet chunk ranks outside the top 20 for "quick ratio".
- 0042 is not a real miss (rank-1 hit holds the answer, unlabelled). 6 misses have the answer chunk next to a top-10 hit (0036, 0038, 0055, 0085, 0105, 0135); the app's ±1 neighbour context probably delivers it anyway.

## Page-header section labels (59 documents, 73,879 chunks)

- 71,525 / 73,879 chunks (96.8%) carry a section string repeated on ≥20% of their document's chunks; the other 1,991 (AmEx 10-K) have none. No chunk has a real section name.
- Strings: "UNITED STATES" (37 docs), "Table of Contents" (15), "Page 1 of 15", "Index", "FORM 10-KFORM 10-K".
- tat: 15,625 / 19,288 chunks repeated, 15 of 17 documents affected.

## Table pieces among relevant chunks (all 111 questions; labels loose, median 10 per question)

- Table-like: 1,042 / 1,946 (54%); 79 / 111 questions have one.
- Of those: no title/units line 510 (49%); no period header 441 (42%); continuation of a table 624 (60%).
- Chunks are ≤500 characters, so a balance sheet spans 3–4 chunks and only the first carries title and dates.
- tat: 641 / 1,906 relevant chunks table-like, 308 (48%) untitled. tat still scores well because its questions copy row labels word for word; FinanceBench uses analyst terms that don't appear in filings.

## Fixes vs the 32 misses (estimates, nothing run)

| Fix | Likely helps | Notes |
|---|---|---|
| A: table title/units/dates in every table piece's embedding header | 3 alone; 7 more only with D | Title says "Balance Sheet"; question never does |
| B: ignore repeated page headers as section names | ~0 directly | Same label on every chunk of a doc; real section detection might help ~7 (bigger change) |
| C: keep tables together (larger limit) | same targets as A | Risks diluting narrative hits |
| D: finance-term query expansion | 13 (dictionary); 6 more need general rephrasing | 7 of 13 also need A |
| No retrieval fix needed | 1 label error, 2 fixed by blend, ~6 via neighbour context | |

## Conclusions

1. Table splitting is real but rarely the main cause (primary 3/32, factor 10/32). The main cause (18/32) is derived-figure questions whose inputs sit in statements that never use the question's words.
2. A + D together is the strongest pair: plausibly ~10/32. A alone ~3.
3. B alone won't move FinanceBench; real section names would be a separate, larger fix.
4. C overlaps A and risks narrative questions; prefer A.
5. The real miss count is below 32; measure any fix on top-10 hits and answer correctness.

Uncertain: one reader's judgments (primary vs secondary debatable for ~5: 0016, 0039, 0050, 0108, 0132); fix counts are judgments; table/title checks are simple regexes; labels are loose.
