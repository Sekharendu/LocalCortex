# Model swap: 100 RAGBench questions, four Cloudflare models

Generated 2026-11-22 by `report.mts`. Grades: C correct, P partial, W wrong, R refused ("context is insufficient").

## Headline

|  | Qwen3-30B-A3B-FP8 (original) | GLM-4.7-Flash | Gemma-4-26B-A4B-it | Granite-4.0-H-Micro |
|---|---|---|---|---|
| Correct (all 100) | 66/100 (66%) | 62/100 (62%) | 70/100 (70%) | 54/100 (54%) |
| C + half P | 69.5% | 66.5% | 75% | 58% |
| C / P / W / R | 66 / 7 / 17 / 10 | 62 / 9 / 22 / 7 | 70 / 10 / 7 / 13 | 54 / 8 / 31 / 7 |
| Correct on the 90 identical prompts | 65/90 (72.2%) | 58/90 (64.4%) | 66/90 (73.3%) | 53/90 (58.9%) |
| Correct on the 10 gold-added prompts | 1/10 (10%) (1) | 4/10 (40%) | 4/10 (40%) | 1/10 (10%) |
| Latency mean / median / p90 (ms) | 875 / 771 / 1305 | 17896 / 6780 / 52164 | 2433 / 1620 / 4755 | 2749 / 2173 / 4043 |
| Prompt tokens (mean, model's own tokenizer) | 3341 | 2995 | 3375 | 2946 |
| Output tokens mean / max | 37.6 / 292 | 44.5 / 295 | 51.4 / 244 | 42.1 / 392 |
| Neurons per request (mean) | 16.6 | 18.09 | 31.82 | 4.97 |
| Neurons total | 1659.8 | 1809.1 | 3182.1 | 497 |
| $ per 1,000 requests | $0.183 | $0.199 | $0.35 | $0.055 |
| Requests/day on the free 10k Neurons | 602 | 553 | 314 | 2012 |
| Finish reasons | stop 100 | stop 100 | stop 100 | stop 100 |
| Error rows / HTTP 429 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

(1) Qwen's answers on the gold-added questions come from its original prompts, which did not contain the answer; only the new models saw the rebuilt prompts. Compare models on the identical-prompt row.

## By source (correct / graded)

| source | Qwen3-30B-A3B-FP8 (original) | GLM-4.7-Flash | Gemma-4-26B-A4B-it | Granite-4.0-H-Micro |
|---|---|---|---|---|
| tat | 14/22 (63.6%) | 12/22 (54.5%) | 9/22 (40.9%) | 9/22 (40.9%) |
| nq | 23/29 (79.3%) | 20/29 (69%) | 25/29 (86.2%) | 23/29 (79.3%) |
| feta | 21/30 (70%) | 21/30 (70%) | 25/30 (83.3%) | 17/30 (56.7%) |
| financebench | 8/19 (42.1%) | 9/19 (47.4%) | 11/19 (57.9%) | 5/19 (26.3%) |

## Method

- Same 100 questions as the original Qwen run (`rerank/neurons-top10-vs-top15`, top10, rep 1). Prompts frozen in `prompts.jsonl` by `build-prompts.mts`, with no LLM calls.
- 90 prompts are byte-identical to Qwen's. 10 were rebuilt with the gold (answer-bearing) chunks first because the original search missed the answer or the needed numbers, so retrieval is not what is being tested: tat-0711, financebench-0011, nq-0231, feta-0462, nq-0308, financebench-0121, financebench-0047, financebench-0024, nq-0280, feta-0386.
- Same system prompt (`C_SYSTEM_PROMPT`), `max_tokens` 512, model-default temperature. Qwen took a raw ChatML string with an empty `<think></think>`; the new models take a `messages` array so Cloudflare applies each model's own chat template. GLM and Gemma had thinking switched off (`chat_template_kwargs.enable_thinking=false`).
- Neurons and tokens are Cloudflare's own `result.usage` per call. Prompt token counts differ per model only because the tokenizers differ (the text is the same). $ uses $0.011 per 1,000 Neurons.
- Graded by hand against the reference and the document. Where the reference is known wrong, an answer matching the document is C (noted per question). Calculation answers were checked by redoing the arithmetic. One answer per question per model (no repeats), so a gap of 2-3 questions is within noise.

## Per question

| n | id | kind | qwen | glm | gemma | granite | note |
|---|---|---|---|---|---|---|---|
| 1 | tat-0736 |  | C | C | P | W | gemma gives both totals but not the difference; granite wrong numbers |
| 2 | tat-0785 |  | R | R | R | R |  |
| 3 | nq-0379 |  | C | W | C | C | glm says Mahone plays Mahone |
| 4 | nq-0279 |  | C | C | C | C |  |
| 5 | feta-0420 |  | C | C | C | C |  |
| 6 | feta-0485 |  | C | C | C | W |  |
| 7 | feta-0526 |  | P | C | P | W | gemma says four but lists five; granite says eight |
| 8 | feta-0446 |  | C | W | C | W | glm/granite give Napoli goals, not Italy goals |
| 9 | feta-0546 |  | C | C | C | C |  |
| 10 | nq-0151 |  | C | C | C | C |  |
| 11 | tat-0770 |  | C | C | C | W |  |
| 12 | financebench-0065 |  | C | C | C | P |  |
| 13 | nq-0176 |  | C | C | C | C |  |
| 14 | nq-0249 |  | C | C | C | C |  |
| 15 | feta-0558 |  | C | C | C | C |  |
| 16 | tat-0694 |  | W | P | P | W | reference ($23.5M) ambiguous |
| 17 | feta-0448 |  | C | C | C | C |  |
| 18 | nq-0297 |  | W | C | C | C | reference (Valencia) wrong; document says Riviera, graded against document |
| 19 | tat-0711 | gold | R | W | R | W |  |
| 20 | financebench-0011 | gold | W | W | C | P | granite states 57.7% but its working shows 65.4% |
| 21 | tat-0746 |  | C | C | C | C |  |
| 22 | feta-0442 |  | C | R | C | C |  |
| 23 | financebench-0098 |  | C | C | C | C |  |
| 24 | financebench-0091 |  | C | C | C | C | granite quotes the passage verbatim |
| 25 | feta-0574 |  | C | C | C | C |  |
| 26 | feta-0580 |  | C | C | C | C |  |
| 27 | nq-0231 | gold | W | W | R | P | reference wrong (19 Nov 2016 is a test match, not Six Nations); granite matched the flawed reference |
| 28 | tat-0683 |  | P | W | R | R |  |
| 29 | feta-0606 |  | W | P | P | W |  |
| 30 | nq-0352 |  | C | C | C | C |  |
| 31 | tat-0745 |  | C | C | C | C |  |
| 32 | feta-0389 |  | W | W | C | P |  |
| 33 | financebench-0146 |  | P | C | C | W |  |
| 34 | nq-0222 |  | C | R | C | C |  |
| 35 | nq-0214 |  | C | W | C | W | glm/granite answer Indrani Rehman |
| 36 | feta-0493 |  | W | W | W | W | no model gave the reference role |
| 37 | tat-0647 |  | C | C | C | C |  |
| 38 | feta-0550 |  | C | C | C | C |  |
| 39 | feta-0437 |  | W | P | C | C |  |
| 40 | nq-0367 |  | C | C | C | C |  |
| 41 | feta-0438 |  | P | C | C | C |  |
| 42 | feta-0426 |  | P | C | C | P |  |
| 43 | nq-0269 |  | C | C | C | C |  |
| 44 | feta-0472 |  | C | C | C | W |  |
| 45 | tat-0692 |  | C | P | P | W | granite says increased |
| 46 | feta-0462 | gold | P | W | P | P |  |
| 47 | feta-0572 |  | C | C | C | C |  |
| 48 | nq-0357 |  | C | C | C | C |  |
| 49 | tat-0753 |  | C | C | C | C |  |
| 50 | nq-0350 |  | C | C | C | C |  |
| 51 | financebench-0068 |  | P | W | C | C | glm gives gross margin 60.3% instead of 39.7% |
| 52 | nq-0234 |  | C | C | C | C |  |
| 53 | nq-0153 |  | C | C | C | C |  |
| 54 | tat-0787 |  | C | C | C | C |  |
| 55 | tat-0634 |  | C | C | C | C |  |
| 56 | feta-0390 |  | W | R | R | R |  |
| 57 | nq-0308 | gold | R | P | P | W | reference (25) doubtful |
| 58 | financebench-0121 | gold | R | C | C | W | granite says Yes (material legal battles) |
| 59 | financebench-0047 | gold | W | P | W | R | glm contradictory but gives -$1,560M; gemma says positive while citing 1,250 vs 2,811 |
| 60 | nq-0340 |  | C | W | C | C | glm irrelevant sentence |
| 61 | financebench-0057 |  | C | W | R | W | granite 101.0%: its own numbers give 101.5%, arithmetic wrong |
| 62 | feta-0594 |  | C | C | C | C |  |
| 63 | nq-0285 |  | C | C | C | C |  |
| 64 | tat-0768 |  | W | W | W | C | gemma 2017; glm: says 2017 though its own figures make 2019 largest |
| 65 | feta-0595 |  | C | C | C | C |  |
| 66 | financebench-0116 |  | R | R | C | W | granite truncated/wrong |
| 67 | tat-0775 |  | C | C | P | W | gemma gives both values, no change |
| 68 | feta-0575 |  | C | C | C | C |  |
| 69 | tat-0742 |  | C | P | R | C | granite 73,100 (rounding); glm: gives both years, not the average |
| 70 | nq-0225 |  | C | C | C | C |  |
| 71 | tat-0771 |  | C | C | C | C |  |
| 72 | financebench-0106 |  | C | W | C | W | glm: says MGM China highest |
| 73 | tat-0718 |  | C | C | R | R | glm: 12.4% decrease is right (opens with 'increased' wording slip) |
| 74 | financebench-0120 |  | C | P | P | W | gemma segment list truncated; granite only '200 countries'; glm: segment list, truncated |
| 75 | nq-0182 |  | C | C | C | C |  |
| 76 | tat-0750 |  | C | C | C | W | granite $76.4M |
| 77 | nq-0180 |  | C | C | C | C |  |
| 78 | financebench-0029 |  | W | C | W | C | gemma 4%; granite flat |
| 79 | nq-0158 |  | C | C | C | C |  |
| 80 | tat-0641 |  | W | W | W | W | both wrong figures (reference is a % change, -138.54) |
| 81 | financebench-0024 | gold | R | C | P | P | both truncated at 512 tokens; gemma 2 of 3 FY2023 acquisitions, granite 1; glm: all three FY2023 acquisitions |
| 82 | financebench-0071 |  | R | R | R | W | granite 12.6% |
| 83 | nq-0280 | gold | W | C | C | W | granite Stipe Miocic |
| 84 | financebench-0148 |  | W | C | R | R | glm: 4.3% - 4.1% = 0.2, arithmetic checked |
| 85 | feta-0476 |  | C | C | C | C |  |
| 86 | financebench-0080 |  | C | W | C | W | granite names Virginia C. Drosos; glm: names Virginia C. Drosos |
| 87 | financebench-0074 |  | C | C | C | C |  |
| 88 | nq-0288 |  | R | W | R | W | granite 707 (as of 2016); glm: 707 |
| 89 | nq-0246 |  | C | C | C | C |  |
| 90 | nq-0245 |  | C | W | C | C | glm: describes Penny, never names the actress |
| 91 | feta-0590 |  | C | P | C | C | glm: adds an invented 'Best Puppet Design' |
| 92 | feta-0534 |  | C | C | C | P | granite says 1 touchdown (0) |
| 93 | feta-0557 |  | C | C | C | W | granite invents 1957/1962 crowds; glm: also cites 1957 premiership |
| 94 | nq-0206 |  | C | C | C | C |  |
| 95 | tat-0629 |  | W | W | R | W | granite -80.7% from wrong numbers; glm: 14.39% |
| 96 | financebench-0133 |  | R | W | W | W | gemma $700M, granite $25M; glm: $700M |
| 97 | feta-0415 |  | C | C | C | W | granite: Ross sixth, no partners, no 'known for' |
| 98 | nq-0262 |  | W | W | W | W | reference T.R. Zeliang; document says Neiphiu Rio since 8 Mar 2018; graded W like Qwen for consistency |
| 99 | feta-0386 | gold | C | C | C | C |  |
| 100 | tat-0631 |  | R | R | R | R |  |
