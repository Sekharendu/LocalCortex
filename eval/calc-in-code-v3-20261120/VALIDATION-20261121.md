# Finance v3 validation, 21 November 2026

## Result

The 95 inherited calculator checks and 18 additional checks passed. V3 remains an evaluation prototype. This validation did not activate it in the application.

The command `node --import tsx eval/calc-in-code-v3-20261120/validation-20261121.mts` executes the additional checks. Its machine-readable output is `validation-20261121.json`.

The inherited v2 suite was run against the v3 evaluator with its obsolete rejection of `2 ^ 3` removed. The additional checks explicitly cover powers, precedence, fractional and negative exponents, invalid domains, non-finite results, historical CAGR, missing evidence, and placeholder removal.

## Provider mock coverage

The actual v3 experiment runner was executed in temporary isolated directories. Imports and output paths were redirected, and its provider transport was replaced with a mock. No external requests were made during these checks.

- A valid first response completes with one v3 call.
- The eligible prose-only response triggers exactly one format retry.
- A correct retry is accepted. A retry with missing literals, no calculation, or an unused calculation is rejected.
- Direct lookups, explicit refusals, and missing calculation inputs do not trigger a format retry.
- A correct result in prose alongside a `CALC` line reproduces the known refusal. This passing regression check records existing behavior and does not mark that behavior as fixed.
- HTTP 429, a transport exception, and missing usage stop execution. Resuming the interrupted experiment stops for usage reconciliation and does not send another request.

## Live check

Three historical dev cases were prepared for at most three provider calls and a 300-Neuron cap. They cover the two original missing-`CALC` cases and the CAGR case. The first request failed at the transport layer and no response or usage was recorded. Execution stopped without dispatching the other two cases. Its reservation of 100 Neurons remains unresolved. No zero-use or successful live-result claim is made for this attempt.

## Remaining verification

The new tests exercise the evaluator and the experiment runner. The application has no v3 orchestration path yet. JSON/chat parity, saved messages, streaming without draft leakage, Stop during the first call or retry, total request deadline, parser size/nesting limits, and concurrent request isolation require testing against that implementation. These checks cannot pass merely from the standalone experiment results.

The prior quality result remains unchanged: v3 got 18 of 24 fresh questions correct, with three refusals versus one for the current prompt. Its number-presence check cannot verify the row, year, unit, or segment a number belongs to.
