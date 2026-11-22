// Build summary.json, REPORT.md and results-all.csv for the model-swap comparison from results-*.jsonl + grades.json.
// Run (repo root): npx tsx eval/model-swap-20261122/report.mts
import fs from "node:fs";
const HERE = "eval/model-swap-20261122";
const USD_PER_1K_NEURONS = 0.011;
const jl = (p: string) => fs.existsSync(p) ? fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const prompts = jl(`${HERE}/prompts.jsonl`);
const grades: any[] = JSON.parse(fs.readFileSync(`${HERE}/grades.json`, "utf8"));
const G = new Map(grades.map((g) => [g.id, g]));
const MODELS = [
  { key: "qwen", label: "Qwen3-30B-A3B-FP8 (original)", model: "@cf/qwen/qwen3-30b-a3b-fp8" },
  { key: "glm", label: "GLM-4.7-Flash", model: "@cf/zai-org/glm-4.7-flash" },
  { key: "gemma", label: "Gemma-4-26B-A4B-it", model: "@cf/google/gemma-4-26b-a4b-it" },
  { key: "granite", label: "Granite-4.0-H-Micro", model: "@cf/ibm-granite/granite-4.0-h-micro" },
];
// One normalised row per (model, question): the successful attempt, else the last error row.
type Row = { ok: boolean; ms: number | null; promptTokens: number | null; outputTokens: number | null; neurons: number | null; finish: string | null; reasoningChars: number; answer: string; error?: string };
const rows: Record<string, Map<string, Row>> = {};
const raw: Record<string, { calls: number; errors: number; http429: number }> = {};
{
  const q = jl("eval/ragbench-20261115/rerank/neurons-top10-vs-top15.jsonl").filter((r) => r.config === "top10" && r.rep === 1);
  rows.qwen = new Map(q.map((r) => [r.id, { ok: !r.error, ms: r.ms, promptTokens: r.usage?.prompt_tokens ?? null, outputTokens: r.usage?.completion_tokens ?? null,
    neurons: r.usage?.neurons ?? null, finish: r.finish ?? null, reasoningChars: 0, answer: r.answer ?? "", error: r.error || undefined }]));
  raw.qwen = { calls: q.length, errors: q.filter((r) => r.error).length, http429: 0 };
}
for (const m of MODELS.slice(1)) {
  const all = jl(`${HERE}/results-${m.key}.jsonl`);
  raw[m.key] = { calls: all.length, errors: all.filter((r) => r.error).length, http429: all.filter((r) => r.http === 429).length };
  const map = new Map<string, Row>();
  for (const r of all) {
    if (map.get(r.id)?.ok && r.error) continue;
    map.set(r.id, { ok: !r.error, ms: r.ms, promptTokens: r.promptTokens, outputTokens: r.outputTokens, neurons: r.neurons, finish: r.finish,
      reasoningChars: r.reasoningChars ?? 0, answer: r.answer ?? "", error: r.error });
  }
  rows[m.key] = map;
}
const mean = (a: number[]) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
const pct = (a: number[], p: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const r1 = (x: number, d = 1) => Number.isFinite(x) ? Number(x.toFixed(d)) : null;
const isRefusal = (a: string) => /context is insufficient/i.test(a);
function acc(ids: string[], key: string) {
  const c = { C: 0, P: 0, W: 0, R: 0, ungraded: 0 };
  for (const id of ids) { const g = G.get(id)?.[key]; if (g === "C" || g === "P" || g === "W" || g === "R") c[g]++; else c.ungraded++; }
  const graded = ids.length - c.ungraded;
  return { n: ids.length, ...c, accuracyPct: r1(100 * c.C / graded), partialCreditPct: r1(100 * (c.C + 0.5 * c.P) / graded) };
}
const ALL = prompts.map((p) => p.id);
const IDENT = prompts.filter((p) => p.kind === "qwen-identical").map((p) => p.id);
const GOLD = prompts.filter((p) => p.kind === "gold-added").map((p) => p.id);
const SOURCES = [...new Set(prompts.map((p) => p.source))] as string[];
const summary: any = { generatedAt: new Date().toISOString(), usdPer1kNeurons: USD_PER_1K_NEURONS, questions: prompts.length,
  qwenIdenticalPrompts: IDENT.length, goldAddedPrompts: GOLD.length, goldAddedIds: GOLD, models: {} };
for (const m of MODELS) {
  const R = [...rows[m.key].values()].filter((r) => r.ok);
  const ms = R.map((r) => r.ms!).filter(Number.isFinite), out = R.map((r) => r.outputTokens!).filter(Number.isFinite);
  const neu = R.map((r) => r.neurons!).filter(Number.isFinite), pt = R.map((r) => r.promptTokens!).filter(Number.isFinite);
  const finish: Record<string, number> = {};
  for (const r of R) finish[r.finish ?? "null"] = (finish[r.finish ?? "null"] ?? 0) + 1;
  const neuMean = mean(neu);
  summary.models[m.key] = {
    label: m.label, model: m.model, answered: R.length, callsMade: raw[m.key].calls, errorRows: raw[m.key].errors, http429: raw[m.key].http429,
    accuracy: { all: acc(ALL, m.key), qwenIdentical: acc(IDENT, m.key), goldAdded: acc(GOLD, m.key),
      bySource: Object.fromEntries(SOURCES.map((s) => [s, acc(prompts.filter((p) => p.source === s).map((p) => p.id), m.key)])) },
    latencyMs: { mean: r1(mean(ms), 0), median: pct(ms, 0.5), p90: pct(ms, 0.9), max: Math.max(...ms) },
    promptTokensMean: r1(mean(pt), 0), outputTokens: { mean: r1(mean(out)), max: Math.max(...out), total: out.reduce((s, x) => s + x, 0) },
    neurons: { meanPerRequest: r1(neuMean, 2), total: r1(neu.reduce((s, x) => s + x, 0), 1) },
    usd: { per100Requests: r1(neuMean * 100 / 1000 * USD_PER_1K_NEURONS, 4), per1000Requests: r1(neuMean * USD_PER_1K_NEURONS, 3) },
    requestsPerDayOnFree10kNeurons: r1(10000 / neuMean, 0),
    finishReasons: finish, reasoningCharsTotal: R.reduce((s, r) => s + (r.reasoningChars ?? 0), 0),
    refusals: R.filter((r) => isRefusal(r.answer)).length,
  };
}
fs.writeFileSync(`${HERE}/summary.json`, JSON.stringify(summary, null, 2) + "\n");

// CSV: one row per question, the four models side by side.
const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const head = ["n", "id", "source", "kind", "question", "reference", "note"];
for (const m of MODELS) head.push(...["grade", "ms", "promptTokens", "outputTokens", "neurons", "finish", "answer"].map((f) => `${m.key}_${f}`));
const csv = [head.join(",")];
for (const p of prompts) {
  const g = G.get(p.id) ?? {};
  const line: unknown[] = [p.n, p.id, p.source, p.kind, p.question, p.reference, g.note];
  for (const m of MODELS) { const r = rows[m.key].get(p.id); line.push(g[m.key], r?.ms, r?.promptTokens, r?.outputTokens, r1(r?.neurons ?? NaN, 2), r?.finish, r?.ok ? r.answer : r?.error); }
  csv.push(line.map(esc).join(","));
}
fs.writeFileSync(`${HERE}/results-all.csv`, csv.join("\n") + "\n");

// REPORT.md
const S = summary.models, K = MODELS.map((m) => m.key);
const tbl = (hdr: string[], body: unknown[][]) => [`| ${hdr.join(" | ")} |`, `|${hdr.map(() => "---").join("|")}|`, ...body.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const a = (x: any) => `${x.C}/${x.n - x.ungraded} (${x.accuracyPct}%)`;
const md: string[] = [
  "# Model swap: 100 RAGBench questions, four Cloudflare models", "",
  `Generated ${summary.generatedAt.slice(0, 10)} by \`report.mts\`. Grades: C correct, P partial, W wrong, R refused ("context is insufficient").`, "",
  "## Headline", "",
  tbl(["", ...K.map((k) => S[k].label)], [
    ["Correct (all 100)", ...K.map((k) => a(S[k].accuracy.all))],
    ["C + half P", ...K.map((k) => `${S[k].accuracy.all.partialCreditPct}%`)],
    ["C / P / W / R", ...K.map((k) => { const x = S[k].accuracy.all; return `${x.C} / ${x.P} / ${x.W} / ${x.R}`; })],
    [`Correct on the ${IDENT.length} identical prompts`, ...K.map((k) => a(S[k].accuracy.qwenIdentical))],
    [`Correct on the ${GOLD.length} gold-added prompts`, ...K.map((k) => a(S[k].accuracy.goldAdded) + (k === "qwen" ? " (1)" : ""))],
    ["Latency mean / median / p90 (ms)", ...K.map((k) => `${S[k].latencyMs.mean} / ${S[k].latencyMs.median} / ${S[k].latencyMs.p90}`)],
    ["Prompt tokens (mean, model's own tokenizer)", ...K.map((k) => S[k].promptTokensMean)],
    ["Output tokens mean / max", ...K.map((k) => `${S[k].outputTokens.mean} / ${S[k].outputTokens.max}`)],
    ["Neurons per request (mean)", ...K.map((k) => S[k].neurons.meanPerRequest)],
    ["Neurons total", ...K.map((k) => S[k].neurons.total)],
    ["$ per 1,000 requests", ...K.map((k) => `$${S[k].usd.per1000Requests}`)],
    ["Requests/day on the free 10k Neurons", ...K.map((k) => S[k].requestsPerDayOnFree10kNeurons)],
    ["Finish reasons", ...K.map((k) => Object.entries(S[k].finishReasons).map(([f, c]) => `${f} ${c}`).join(", "))],
    ["Error rows / HTTP 429", ...K.map((k) => `${S[k].errorRows} / ${S[k].http429}`)],
  ]), "",
  "(1) Qwen's answers on the gold-added questions come from its original prompts, which did not contain the answer; only the new models saw the rebuilt prompts. Compare models on the identical-prompt row.", "",
  "## By source (correct / graded)", "",
  tbl(["source", ...K.map((k) => S[k].label)], SOURCES.map((s) => [s, ...K.map((k) => a(S[k].accuracy.bySource[s]))])), "",
  "## Method", "",
  "- Same 100 questions as the original Qwen run (`rerank/neurons-top10-vs-top15`, top10, rep 1). Prompts frozen in `prompts.jsonl` by `build-prompts.mts`, with no LLM calls.",
  `- ${IDENT.length} prompts are byte-identical to Qwen's. ${GOLD.length} were rebuilt with the gold (answer-bearing) chunks first because the original search missed the answer or the needed numbers, so retrieval is not what is being tested: ${GOLD.join(", ")}.`,
  "- Same system prompt (`C_SYSTEM_PROMPT`), `max_tokens` 512, model-default temperature. Qwen took a raw ChatML string with an empty `<think></think>`; the new models take a `messages` array so Cloudflare applies each model's own chat template. GLM and Gemma had thinking switched off (`chat_template_kwargs.enable_thinking=false`).",
  "- Neurons and tokens are Cloudflare's own `result.usage` per call. Prompt token counts differ per model only because the tokenizers differ (the text is the same). $ uses $0.011 per 1,000 Neurons.",
  "- Graded by hand against the reference and the document. Where the reference is known wrong, an answer matching the document is C (noted per question). Calculation answers were checked by redoing the arithmetic. One answer per question per model (no repeats), so a gap of 2-3 questions is within noise.", "",
  "## Per question", "",
  tbl(["n", "id", "kind", ...K, "note"], grades.map((g) => [g.n, g.id, g.kind === "gold-added" ? "gold" : "", ...K.map((k) => g[k]), String(g.note ?? "").replace(/\|/g, "/")])), "",
];
fs.writeFileSync(`${HERE}/REPORT.md`, md.join("\n"));
console.log(JSON.stringify(Object.fromEntries(K.map((k) => [k, { all: S[k].accuracy.all, ident: S[k].accuracy.qwenIdentical.accuracyPct, neu: S[k].neurons.meanPerRequest, ms: S[k].latencyMs, n: S[k].answered }]))));
