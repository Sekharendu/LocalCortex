# Exact-quote evaluator V2

This is a new, isolated evaluator. Existing RAG and eval files are not modified. See [RESULTS.md](RESULTS.md) for the completed, stopped run.

Commands executed:

```powershell
node --test eval/exact-quote-v2/matching.test.mjs
node eval/exact-quote-v2/prepare.mjs
node eval/exact-quote-v2/run.mjs
node eval/exact-quote-v2/finish.mjs
```

Outputs use exclusive creation and preserve the prior experiment. The run reuses unchanged production retrieve() with exact saved dev document scope, frozen collection/settings/sparse statistics and local embeddings. A network guard rejects unscoped or nonlocal requests and generation endpoints. The stop gate ran before acceptable or k50 calls. Re-running these commands does not overwrite completed evidence.

No fuzzy matching, case folding, Unicode normalization, punctuation/math conversion, generic diagnostic anchors, or model-produced gold is used. The permitted range-overlap branch can match a quote split across chunk boundaries, but only with exact same-paper coordinates.
