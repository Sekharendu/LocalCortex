# Finance v3 pilot

The pilot adds exponentiation to the v2 evaluator and proposes one format retry if an answer gives an unsupported number in prose without a `CALC` line. A retry is accepted only if it passes the same checks and actually inserts a computed value in the answer.

## Historical replay

The replay reprocessed all 30 saved v2 target completions with their original prompt evidence. It verified the saved prompt hashes and reproduced the v2 answer for every case before applying the v3 evaluator.

| Result on the historical cohort | V2 as graded | V3 power support, same completions |
|---|---:|---:|
| Correct | 18 | 19 |
| Partly correct | 1 | 1 |
| Wrong | 5 | 5 |
| Refused | 6 | 5 |

The only changed answer was `financebench-0102`. The saved completion used `(65,984 / 65,398) ^ (1 / 2)` as the growth factor. V3 accepted the expression and produced the reference value of 0.4%. The current app baseline refused 2 of the 30 cases. Even if the two format retries both recovered their historical cases, this replay would still have 3 refusals and exceed that baseline.

The 95 unaffected v2 calculator tests and eight targeted v3 checks passed. The obsolete test that expected `^` to fail was replaced in the test run with checks for precedence, negative and fractional powers, non-finite results, and input provenance.

## Format retry

The two eligible historical cases were `tat-0723` and `tat-0751`. The full-context local Llama 3 request timed out after five minutes on the first case. Smaller requests using only the relevant table rows timed out after two minutes each. The evaluator did produce the correct results when given manually formatted formulas with the original input values, which verifies the calculation path. It does not establish that a model reliably returns those formulas on retry.

## Fresh paired run

The prepared cohort contains 24 previously unrun calculation questions, 20 lookup controls, 10 absent-input controls, and 10 off-topic controls. Targets and lookup controls reuse saved dev search and reranker ranks and read the original chunks from the dev index. The target set is limited to eligible questions whose required numeric values appear in the prompt. The presence check does not verify that a value belongs to the intended row or column.

The first hosted attempt was blocked by automatic approval review. After the user explicitly authorized sending the prepared benchmark excerpts, the Cloudflare run completed with 152 answers, no provider errors, and 2,904.16 Neurons used out of the 3,900 cap. The current prompt, v2, and v3 used the same passages, with rotating call order. Each answer was graded with its arm hidden. This was a single-grader pilot, and several benchmark references were ambiguous or disagreed with the source. Source-supported readings were credited when defensible. Raw answers and individual grades remain local.

| 24 fresh calculation questions | Current | V2 | V3 |
|---|---:|---:|---:|
| Correct | 13 | 17 | 18 |
| Partly correct | 5 | 3 | 3 |
| Wrong | 5 | 2 | 0 |
| Refused | 1 | 2 | 3 |
| Average Neurons per answer | 19.48 | 23.43 | 23.70 |

**Verdict: failed the refusal limit.** The protocol required at least four more correct answers than current on the 24 available cases and no increase in refusals. V3 gained five correct answers but refused three versus one. It tied current on lookup controls (19/20 each, with the same miss) and was one below v2 (20/20). It refused all 10 controls with no context, and declined or identified missing evidence on nine of the 10 absent-input cases. In the tenth, Verizon's `1,373` was taken from *other income*, then misrepresented as prepaid wireless service revenue. The number appeared in the evidence, but its label and meaning did not match.

No fresh answer used an exponent, and no first response qualified for a format retry. Two v3 answers gave the correct computed value in prose **and** included a `CALC` line. V3 rejected their prose values and kept the refusal because the proposed retry only handled answers with no `CALC` line at all. The fresh comparison measures the overall variants once on this cohort. It does not independently establish an effect for exponentiation or the format retry.
