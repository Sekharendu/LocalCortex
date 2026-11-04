# Paper split and retrieval depth evaluation

Approved plan EVAL-SPLIT-K-1, including acceptable development cases, separate
scope rejections, and a strict zero-hit omission-case k=5 sanity gate.

Only this directory is written. Existing RAG sources are imported unchanged;
their hashes must match the frozen production run. No ingestion, generation,
rewrite, Cloudflare, or database operations run.

## Commands

```powershell
node eval/split.mjs
node --test eval/eval.test.mjs
node eval/retrieval-k.mjs
```

Split creation refuses to overwrite existing files. The split uses 200 distinct
paper IDs (250 assets, 871 cases), seed 42, and exactly 140/60 papers. PDF/DOCX
copies share membership. Mulberry32 shuffling is followed by deterministic pair
swaps to balance format-by-answerability case proportions. Diagnosis verdicts
are reported but never used to optimize the split. Annotation disagreements
remain a separate `mixed` answerability category.

Part A reads the full diagnosis and annotation metadata. Part B reads only the
development manifests and allowlisted development evidence bundles and indexed
chunk snapshots. It never reads the all-case diagnosis, held-out case bundles,
whole-corpus chunk exports, or title catalogs. Exact saved production scope
decisions are replayed through the existing `documentScope` option; recomputing
scope against the mixed collection would read held-out paper titles. Scope
rejections remain rejections. Every Qdrant query, including prefetches, must
carry the saved development document filter. The network guard blocks all other
endpoints except exact development evidence-point validation and local embedding.

Each k is a fresh call to existing hybrid retrieval: k changes its production
prefetch depth. Sparse corpus statistics retain their original production values.
No corpus is rebuilt or subsetted. Existing indexes necessarily contain all
papers, but payloads returned and inspected are restricted to development.

The metric is case-level recovery of at least one validated recorded evidence
anchor, not exhaustive semantic Recall@K. Anchor identity and text hashes must
match the live index. No gold anchors are removed because they appeared in the
captured top five. Acceptable cases without diagnostic anchors can be mapped by
an exact normalized reference evidence paragraph or extractive answer span of
at least 20 characters. All acceptable cases are run and rankings retained;
cases lacking exact mapped evidence are excluded from recall denominators.
Scope rejections are reported separately and excluded from retrieval recall.

Omission cases run at k=5 first. A single recorded-anchor hit stops the run
conservatively, before larger k or acceptable-case execution. The saved record
distinguishes captured-top-five anchor overlap, current recovery, infrastructure
failure, and a completed zero-hit gate. A failure is not treated as a zero.

Run outputs are under `eval/runs/seed42/`. Files use exclusive creation. Existing
completed phase files are reused; failed phases require deliberate inspection
before starting a new run. There is one sequential worker per format, bounded
one-document chunk retention, request timeouts, and no background work or new
connection pools. The fetch guard is restored on exit.

This split establishes an execution holdout. It does not erase earlier use of
the full diagnosis during project investigation.
