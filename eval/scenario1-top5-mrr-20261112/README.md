# Scenario 1: top-5 retrieval inside each question's own paper (dev set only)

Goal: for every dev question, search only inside its own paper, take the top 5 chunks, and measure
how early the first answer-bearing chunk appears (reciprocal rank; MRR@5 when averaged). Dense and hybrid side by side.
Retrieval only: no answer generation, no reranking, no Cloudflare calls. Held-out (test) papers are never read.

## Files
- label.py -> labels.auto.jsonl: answer-location labels for all 610 dev cases, made offline from QASPER evidence.
  A chunk is "relevant" when it contains part of a reference's highlighted evidence sentence(s) (fallback: the evidence
  paragraph), or a whole extractive answer span of 4+ words. Any reference alternative counts.
- labels.manual.json: manual decisions for the 14 cases the automatic matching could not place.
- run.mjs: the search run (you run this on your PC). Writes pdf/docx .results.jsonl, .manifest.json, .status.json.
- score.py: per-question reciprocal rank + grouped summaries -> per-question.jsonl/.csv, summary.json.
- preview-nov3-234cases.*: scorer dry run on the saved Nov 3 real k=5 results (234 cases only). Not the final result.

## Groups
- answerable: has at least one relevant chunk -> scored (MRR denominator).
- unanswerable: every reference says the paper does not answer it -> not scored.
- no-answer-passage: yes/no answered "No" with no evidence cited -> no chunk can hold the answer, not scored.
- answer-missing-from-file: the needed table is absent from the supplied DOCX -> not scored.

## Run (repository root, PowerShell)
    docker start eval-qasper-full2-20261028-primary-r3-qdrant   # evaluation Qdrant on port 36333
    docker compose up -d ollama                                  # or however Ollama (11434) is usually started
    node --import tsx eval/scenario1-top5-mrr-20261112/run.mjs pdf
    node --import tsx eval/scenario1-top5-mrr-20261112/run.mjs docx
A run can be re-started; finished searches are skipped.
