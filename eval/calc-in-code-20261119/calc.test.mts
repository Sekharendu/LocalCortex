// Unit tests for calc.mts (plain tsx + node:assert; no app code, no network).
// Run (repo root): npx tsx eval/calc-in-code-20261119/calc.test.mts
import assert from "node:assert/strict";
import { evaluate, tokenize, CalcError, indexNumbers, literalFound, proseNumberFound, decimalsFor, formatResult, processAnswer, contextOf, REFUSAL } from "./calc.mts";

let n = 0, failed = 0;
function t(name: string, fn: () => void) {
  n++;
  try { fn(); } catch (e) { failed++; console.log("FAIL", name, "\n   ", String((e as Error).message).split("\n").slice(0, 6).join("\n    ")); }
}
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

// ---- evaluator ----
t("precedence", () => near(evaluate("2 + 3 * 4").value, 14));
t("parentheses", () => near(evaluate("(2 + 3) * 4").value, 20));
t("left-assoc division", () => near(evaluate("100 / 10 / 2").value, 5));
t("left-assoc minus", () => near(evaluate("10 - 3 - 2").value, 5));
t("unary minus", () => near(evaluate("-3 + 5").value, 2));
t("double unary", () => near(evaluate("--3").value, 3));
t("unary in parens", () => near(evaluate("2 * (-3)").value, -6));
t("thousands commas", () => near(evaluate("6,489 / ((253 + 282) / 2)").value, 6489 / 267.5));
t("decimals", () => near(evaluate("1,380.5 * 2").value, 2761));
t("leading-dot decimal", () => near(evaluate(".5 * 4").value, 2));
t("percent literal", () => near(evaluate("5.3% * 200").value, 10.6));
t("dollar sign ignored", () => near(evaluate("$1,000 + $2").value, 1002));
t("unicode operators", () => near(evaluate("6 × 2 ÷ 3 − 1").value, 3));
t("names", () => near(evaluate("a + b", new Map([["a", 1.5], ["b", 2]])).value, 3.5));
t("braced name", () => near(evaluate("{a} * 2", new Map([["a", 4]])).value, 8));
t("literals reported", () => assert.deepEqual(evaluate("6,489 / 267.5 * 100").literals.map((l) => l.text), ["6,489", "267.5", "100"]));
for (const bad of ["", "2 +", "(2 + 3", "2 + 3)", "2 ** 3", "2 ^ 3", "Math.max(1,2)", "max(1, 2)", "1,23 + 4", "x + 1", "2 3", "process.exit(1)", "1; 2", "\"1\"", "1e5", "2 / 0", "2 / (1 - 1)", "a = 3"]) {
  t(`rejects ${JSON.stringify(bad)}`, () => assert.throws(() => evaluate(bad), CalcError));
}
t("tokenize keeps comma-grouped number", () => assert.equal((tokenize("17,215,800")[0] as any).value, 17215800));

// ---- provenance ----
const ctx = `Total net revenues 6,489 7,500 7,017
Property and equipment, net 253 282
Accumulated other comprehensive loss (619) (601)
Operating margin 5.3% in 2019
Revenue of $6.5 billion and 9,497,578 thousand`;
const idx = indexNumbers(ctx);
const L = (text: string, pct = false) => ({ text, value: Number(text.replace(/,/g, "")), pct });
t("found: plain", () => assert.ok(literalFound(L("6,489"), idx)));
t("found: without comma", () => assert.ok(literalFound(L("6489"), idx)));
t("found: parenthesized negative used as -619", () => assert.ok(literalFound({ text: "619", value: -619, pct: false }, idx)));
t("found: percent literal", () => assert.ok(literalFound(L("5.3", true), idx)));
t("found: billion -> millions", () => assert.ok(literalFound(L("6500"), idx)));
t("found: billion -> full", () => assert.ok(literalFound(L("6500000000"), idx)));
t("found: thousand -> millions", () => assert.ok(literalFound(L("9497.578"), idx)));
t("constant 100", () => assert.ok(literalFound(L("100"), idx)));
t("constant 365", () => assert.ok(literalFound(L("365"), idx)));
t("constant 2", () => assert.ok(literalFound(L("2"), idx)));
t("not found: precomputed average 267.5", () => assert.ok(!literalFound(L("267.5"), idx)));
t("not found: invented", () => assert.ok(!literalFound(L("7,491.5"), idx)));
t("not found: 100% as percent literal is not a constant", () => assert.ok(!literalFound(L("100", true), idx)));

// ---- prose numbers ----
t("prose: exact", () => assert.ok(proseNumberFound("6,489", idx)));
t("prose: rounded copy", () => assert.ok(proseNumberFound("5", idx) && proseNumberFound("6.5", idx)));
t("prose: year", () => assert.ok(proseNumberFound("2018", indexNumbers(""))));
t("prose: small int", () => assert.ok(proseNumberFound("3", indexNumbers(""))));
t("prose: computed value rejected", () => assert.ok(!proseNumberFound("24.26", idx)));
t("prose: scale change only with scale word", () => {
  assert.ok(proseNumberFound("9.5", idx, true)); // 9,497,578 thousand -> 9.5 billion
  assert.ok(!proseNumberFound("7.5", indexNumbers("7,491.5"), false));
});

// ---- formatting ----
t("decimals default 2", () => assert.equal(decimalsFor("What is the margin?"), 2));
t("decimals two", () => assert.equal(decimalsFor("Round your answer to two decimal places."), 2));
t("decimals one", () => assert.equal(decimalsFor("Answer in % rounded to one decimal place."), 1));
t("decimals whole", () => assert.equal(decimalsFor("Round to the nearest whole number."), 0));
t("format 2dp", () => assert.equal(formatResult(6489 / 267.5, 2), "24.26"));
t("format thousands", () => assert.equal(formatResult(1234567.891, 2), "1,234,567.89"));
t("format integer", () => assert.equal(formatResult(368109, 2), "368,109"));
t("format negative", () => assert.equal(formatResult(-4.6, 2), "-4.60"));
t("format tiny negative to 0", () => assert.equal(formatResult(-0.001, 2), "0.00"));
t("format 0dp", () => assert.equal(formatResult(39.73, 0), "40"));

// ---- whole answers ----
const Q = "What is the FY2019 fixed asset turnover ratio? Round your answer to two decimal places.";
t("computed: placeholder substituted, CALC stripped", () => {
  const r = processAnswer("CALC: avg_ppe = (253 + 282) / 2\nCALC: ratio = 6,489 / avg_ppe\nThe FY2019 fixed asset turnover ratio was {ratio} (revenue 6,489 / average PP&E of 253 and 282).", ctx, Q);
  assert.equal(r.status, "computed", r.reason);
  assert.equal(r.final, "The FY2019 fixed asset turnover ratio was 24.26 (revenue 6,489 / average PP&E of 253 and 282).");
  assert.ok(r.calcFirst && r.parsed && r.provenanceOk && r.proseOk);
  assert.equal(r.placeholdersUsed, 1);
});
t("model's own '= result' in CALC is ignored", () => {
  const r = processAnswer("CALC: ratio = 6,489 / ((253 + 282) / 2) = 2.86\nThe ratio was {ratio}.", ctx, Q);
  assert.equal(r.final, "The ratio was 24.26.");
});
t("markdown CALC line", () => {
  const r = processAnswer("**CALC:** ratio = 6,489 / 253.\nThe ratio was {ratio}.", ctx, Q);
  assert.equal(r.status, "computed", r.reason);
});
t("percent", () => {
  const r = processAnswer("CALC: share = 619 / 6,489 * 100\nIt was {share}% of revenue.", ctx, "What share?");
  assert.equal(r.final, "It was 9.54% of revenue.");
});
t("fallback: number not in context", () => {
  const r = processAnswer("CALC: ratio = 6,489 / 267.5\nThe ratio was {ratio}.", ctx, Q);
  assert.equal(r.status, "fallback"); assert.equal(r.final, REFUSAL); assert.ok(!r.provenanceOk); assert.match(r.reason, /267\.5/);
});
t("fallback: parse error", () => {
  const r = processAnswer("CALC: ratio = avg(253, 282)\nThe ratio was {ratio}.", ctx, Q);
  assert.equal(r.status, "fallback"); assert.ok(!r.parsed);
});
t("fallback: unknown placeholder", () => {
  const r = processAnswer("CALC: a = 253 + 282\nThe total was {b}.", ctx, Q);
  assert.equal(r.status, "fallback"); assert.match(r.reason, /placeholder/);
});
t("fallback: computed number written in prose", () => {
  const r = processAnswer("CALC: a = 6,489 / 253\nThe ratio was {a}, about 25.6 times.", ctx, Q);
  assert.equal(r.status, "fallback"); assert.match(r.reason, /prose number/);
});
t("fallback: no CALC, own arithmetic in prose", () => {
  const r = processAnswer("The ratio was 24.26 (6,489 / 267.5).", ctx, Q);
  assert.equal(r.status, "fallback");
});
t("no CALC, copied numbers only: unchanged", () => {
  const a = "Total net revenues were 6,489 in 2019, down from 7,500 in 2018.";
  const r = processAnswer(a, ctx, "What were revenues?");
  assert.equal(r.status, "no-calc"); assert.equal(r.final, a);
});
t("currency-prefixed prose number checked whole (RMB37,896)", () => {
  assert.equal(processAnswer("Free cash flow was RMB37,896 million.", "free cash flow of RMB37,896 million; revenues 84,896", "q").status, "no-calc");
  assert.equal(processAnswer("Free cash flow was RMB37,897 million.", "free cash flow of RMB37,896 million", "q").status, "fallback");
});
t("constants allowed in prose", () => assert.equal(processAnswer("DPO uses 365 days and x 100.", ctx, "q").status, "no-calc"));
t("question numbers allowed in prose", () => {
  const r = processAnswer("In FY2021 the value was 6,489.", ctx, "What was it in FY2021?");
  assert.equal(r.status, "no-calc");
});
t("refusal passes through", () => {
  const r = processAnswer(REFUSAL, ctx, Q); assert.equal(r.final, REFUSAL); assert.equal(r.status, "no-calc");
});
t("unused CALC line is just stripped", () => {
  const r = processAnswer("CALC: a = 253 + 282\nRevenue was 6,489.", ctx, Q);
  assert.equal(r.final, "Revenue was 6,489."); assert.equal(r.placeholdersUsed, 0);
});
t("calc after prose: still works, calcFirst false", () => {
  const r = processAnswer("The ratio was {r}.\nCALC: r = 6,489 / 253", ctx, Q);
  assert.equal(r.status, "computed"); assert.ok(!r.calcFirst);
});
t("duplicate names fall back", () => {
  const r = processAnswer("CALC: a = 253\nCALC: a = 282\nIt was {a}.", ctx, Q);
  assert.equal(r.status, "fallback");
});
t("no leftover braces / CALC in final", () => {
  const r = processAnswer("CALC: a = 253 + 282\nTotal {a}.", ctx, Q);
  assert.ok(!/CALC|[{}]/.test(r.final));
});
t("contextOf cuts at reminder and history", () => {
  const p = "Context passages:\nA 1\n\nConversation so far (for resolving references only; answer from the Context above):\nUser: x 99\n\nReminder: r\n\nQuestion: q 7\nAnswer:";
  assert.equal(contextOf(p, "Reminder: r"), "Context passages:\nA 1\n\n");
});

// source must not use eval / Function
import fs from "node:fs";
const src = fs.readFileSync(new URL("./calc.mts", import.meta.url), "utf8");
t("calc.mts has no eval( / new Function / Function(", () => assert.ok(!/\beval\s*\(|new Function|\bFunction\s*\(/.test(src)));

console.log(`${n - failed}/${n} passed`);
process.exit(failed ? 1 : 0);
