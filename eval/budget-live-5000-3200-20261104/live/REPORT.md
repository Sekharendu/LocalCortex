# Paired Qwen budget experiment — 2026-11-04

Ten unique longer-quote dev questions, two configurations, twenty successful Qwen calls. Same selected paper, saved hybrid ranking sliced to k=15, unchanged context builder, no history, temperature 0, 512-token accounting reserve, provider default max_tokens omitted (documented default 2000), 180-second client timeout. New and previous arms alternate first position across pairs. No application settings changed. Sample chosen by fixed seed-42 hash independent of outcomes; not representative of all questions.

| Measurement | Previous: total 4096 / context 1200 | New: total 5000 / context 3200 |
|---|---:|---:|
| Successful calls | 10 | 10 |
| mean request time (seconds) | 1.318 | 1.199 |
| median request time (seconds) | 0.801 | 0.956 |
| min request time (seconds) | 0.505 | 0.608 |
| max request time (seconds) | 4.355 | 2.763 |
| Mean actual input tokens | 1593.50 | 3370.20 |
| Mean actual output tokens | 38.60 | 45.10 |
| Total actual input tokens | 15935.00 | 33702.00 |
| Total actual output tokens | 386.00 | 451.00 |
| Total Neurons | 85.46 | 169.60 |
| Mean Neurons/call | 8.55 | 16.96 |
| Mean assembled context tokens (local estimate) | 1164.40 | 2893.70 |
| Largest actual prompt tokens | 1609.00 | 3719.00 |
| Largest actual prompt + output tokens | 1685.00 | 3798.00 |
| Exact gold quote covered in final context | 6/10 | 7/10 |
| Failed calls | 0 | 0 |

## Each paired call

| Pair | Previous time (s) | New time (s) | Previous input/output tokens | New input/output tokens | Previous Neurons | New Neurons |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 2.503 | 1.435 | 1590/11 | 2979/53 | 7.688 | 15.392 |
| 2 | 4.355 | 1.945 | 1601/62 | 3688/102 | 9.293 | 20.164 |
| 3 | 0.894 | 2.763 | 1578/62 | 3603/77 | 9.187 | 19.009 |
| 4 | 0.589 | 0.619 | 1586/19 | 2897/19 | 7.914 | 13.976 |
| 5 | 0.564 | 0.608 | 1608/13 | 3643/13 | 7.832 | 17.244 |
| 6 | 0.709 | 0.957 | 1604/39 | 3460/11 | 8.606 | 16.336 |
| 7 | 1.095 | 0.857 | 1578/70 | 3470/66 | 9.431 | 18.059 |
| 8 | 1.275 | 1.201 | 1606/79 | 3719/79 | 9.835 | 19.606 |
| 9 | 0.687 | 0.955 | 1575/20 | 2607/20 | 7.893 | 12.666 |
| 10 | 0.505 | 0.653 | 1609/11 | 3636/11 | 7.776 | 17.150 |

## Interpretation and limits

Larger budgets used about twice the Neurons. Their median was higher, while their average was lower because the smaller-budget run contained a slower request. This sample cannot establish a speed improvement. Coverage is literal full-reference-quote coverage in final passages, not generated-answer correctness. Answers are saved but have not been independently graded.

The requested caps are upper limits, not padding targets: the builder sends less when selected passages do not fill the allowance. Actual provider token counts differ from the local tokenizer. A total budget is local assembly bookkeeping; it does not set Cloudflare's 32768-token model window. The 512-token reserve remains unchanged and does not enforce the API output cap. Provider actual prompt+output and prompt+512 checks are recorded separately from worst-case prompt+2000 checks.

{
  "cases": 10,
  "calls": 20,
  "allHttp200": true,
  "allFinishedStop": true,
  "frozenInputsUnchanged": true,
  "generationOnlyLatency": true,
  "applicationDefaultsChanged": false,
  "heldOutTestPaperContentRead": false,
  "retrievalCalls": 0,
  "rerankerCalls": 0,
  "rewriteCalls": 0,
  "graderCalls": 0,
  "newFasterPairs": 4,
  "totalReportedNeurons": 255.0577311515808,
  "limits": "Local tokenizer is llama3 estimate; provider token counts are actual reported values. 512 reserve is unchanged bookkeeping, not output cap; normal API default remains 2000. Full-model window not changed by local total budget.",
  "latencyCaveat": "Ten sequential paired calls per arm; medians average central two. Nearest-rank p95 equals max at n=10. No streaming TTFT or provider compute-only timings measured. Includes HTTP round trip and body parsing, excludes retrieval.",
  "metadata": "Saved actual usage including cache tokens, answer text, HTTP status, request/response sizes, headers latency, total latency, timestamps, provider request/completion IDs, model, finish reason, prompt and request hashes. Provider internal metrics were not retained; no inference about their values.",
  "initialFailure": "Initial sandbox attempts could not resolve api.cloudflare.com; no HTTP response or usage received. Kept in parent directory, excluded from live results."
}
