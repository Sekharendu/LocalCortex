# Final held-out test run: search vs local reranker blend (Nov 17)

One-off run approved by the user ("Yes, final run now"; retrieval only; proposed setup only). The held-out test sets were
opened for the first time. **Nothing was tuned on these results**: blend weight 0.5, top 20 candidates and the label rules
were all fixed on dev before this run.

## What ran
- **Setup measured:** hybrid search top 20 inside the question's own document (gate off, `scoreThreshold -1`, documentScope =
  that document) → local bge-reranker-v2-m3 int8 (X:) scores the 20 (query = `expandAcronyms(question)`) → 50/50 blend,
  `0.5/(60+reranker rank) + 0.5/(60+search rank)`. Search-only and reranker-only shown for reference.
- **"Hit at top k"** = a chunk labelled as holding the answer is among the first k. MRR over the 20 candidates.
- **Gate:** "would refuse" = best dense score < 0.63 (the shortcut score.mts uses). "Gate on" columns count hits that the gate lets through.
- No Cloudflare calls. No app code (`src/`), dev collection or dev file was changed.

## Sets
- **QASPER test:** 60 papers / 77 files (60 PDF, 17 DOCX), 261 cases. The test papers were already in the 871-case collections
  `eval-qasper-full2-20261028-primary-r3-{pdf,docx}` (all 77 present, chunk counts matched the source index), so they were
  reused read-only; nothing was re-ingested. Labels: label.py's rules ported unchanged (`qasper-labels.py`; the port reproduces
  all 610 dev labels exactly). 237 answerable, 12 no answer passage, 12 unanswerable → **237 scored**.
- **Ordinary PDFs test:** 240 questions over 147 PDFs, ingested with the app's own `ingestDocument()` (same settings as dev) into
  `eval-ragbench-test-20261117`: 41,316 chunks, 0 failures, 192 minutes. State in `X:/LocalCortex-ragbench/state/final-test-20261117/`.
  Labels: score.mts's rules unchanged. 6 questions had no labelled chunk → **234 scored**.

## Results

QASPER test (237 answerable cases):

| Hit at | Search | Blend 50/50 | Reranker only |
|---|---|---|---|
| Top 1 | 63 (26.6%) | 70 (29.5%) | 72 (30.4%) |
| Top 5 | 148 (62.4%) | **164 (69.2%)** (fixed 24, broke 8) | 165 (69.6%) |
| Top 10 | 187 (78.9%) | **196 (82.7%)** (fixed 14, broke 5) | 194 (81.9%) |
| Top 15 | 209 (88.2%) | 213 (89.9%) | 212 (89.5%) |
| MRR | 0.430 | 0.468 | 0.477 |

- By format, top 10: PDF (194) 155 → 158 → 157; DOCX (43) 32 → 38 → 37.
- Gate would refuse 27 of 237 (11.4%). Top 10 with gate on: search 168, blend 174.

Ordinary PDFs test (234 scored):

| Hit at | Search | Blend 50/50 | Reranker only |
|---|---|---|---|
| Top 1 | 108 (46.2%) | 120 (51.3%) | 128 (54.7%) |
| Top 5 | 176 (75.2%) | **191 (81.6%)** (fixed 16, broke 1) | 187 (79.9%) |
| Top 10 | 202 (86.3%) | **205 (87.6%)** (fixed 7, broke 4) | 206 (88.0%) |
| Top 15 | 210 (89.7%) | 212 (90.6%) | 210 (89.7%) |
| MRR | 0.600 | 0.640 | 0.665 |

| Top 10 by source | Search | Blend | Reranker only |
|---|---|---|---|
| FinanceBench (39) | 26 | 26 | 29 |
| nq (67) | 58 | 60 | 59 |
| feta (68) | 61 | 63 | 62 |
| tat (60) | 57 | 56 | 56 |

- Gate would refuse 3 of 234. Top 10 with gate on: search 200, blend 203.

## Compared with dev (same procedure)

| Top 10 | Dev search → blend | Test search → blend |
|---|---|---|
| QASPER | 432 → 461 of 570 (75.8% → 80.9%, +5.1 points) | 187 → 196 of 237 (78.9% → 82.7%, +3.8 points) |
| Ordinary PDFs | 452 → 470 of 541 (83.5% → 86.9%, +3.3 points) | 202 → 205 of 234 (86.3% → 87.6%, +1.3 points) |

| Top 5 | Dev | Test |
|---|---|---|
| QASPER | 357 → 378 (+3.7 points) | 148 → 164 (+6.8 points) |
| Ordinary PDFs | 407 → 424 (+3.1 points) | 176 → 191 (+6.4 points) |

The blend helps on both held-out sets at every k. At top 10 the gain is smaller than on dev (+3.8 and +1.3 points);
at top 5 it is larger (+6.8 and +6.4). One question is 0.4 points, so the ordinary-PDF top-10 gain (+3, fixed 7 / broke 4)
is small enough to be partly chance.

## Time
- Ordinary-PDF ingest 192 min; searches about 12 min (QASPER 261) and about the same for the 240 ordinary questions.
- Reranker on CPU: median 6.7 s per QASPER question, 4.6 s per ordinary-PDF question (20 chunks), while other work shared the CPU.

## Differences from the dev procedure
- QASPER dev had 14 hand-placed labels (2 became answerable); the test has none, so the 12 unplaced cases are unscored, not hand-fixed.
- Gate counts use the dense-score shortcut for both sets; the QASPER dev gate numbers came from real gate-on runs.
- The test ingest retried a failed document up to 3 times (dev had no retry); no document failed.
- Reranker scores were computed only for answerable questions.

## Files
`ragbench-ingest.mts`, `qasper-labels.py`, `candidates.mts`, `score_pairs.py`, `summarize.py`; outputs `qasper-labels.jsonl`,
`candidates-*.jsonl`, `scores-*.jsonl`, `per-question-{qasper,ragbench}.jsonl`, `summary.json`, logs `*.log`.
