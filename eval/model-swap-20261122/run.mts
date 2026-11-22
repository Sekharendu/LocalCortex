// Run the 100 frozen prompts (prompts.jsonl) through one Cloudflare Workers AI model and record what each call cost.
// Same prompt text and system prompt (C_SYSTEM_PROMPT) as the original Qwen run; only the call format changes per model:
//  - Qwen3-30b (original, now deprecated) used a raw ChatML string with an empty <think></think> block (raw: true).
//  - The new models take a `messages` array, so Cloudflare applies each model's own chat template (Gemma folds the
//    system turn into the user turn, GLM and Granite have a system role). GLM and Gemma are reasoning models: thinking
//    is switched off with chat_template_kwargs.enable_thinking=false (without it GLM spent all its output tokens thinking).
//  - Output: choices[0].message.content (fallback: result.response); any leftover <think>…</think> is stripped and its
//    length recorded. max_tokens 512 and temperature unset (model default), as in the Qwen run.
// Resumable: appends to results-<model>.jsonl and skips ids already answered. Stops on HTTP 429 (daily Neuron allocation).
// Run (repo root): node --env-file=.env --import tsx eval/model-swap-20261122/run.mts <glm|gemma|granite> [--limit N]
import fs from "node:fs";
const { C_SYSTEM_PROMPT } = await import("../../src/generation/promptVariants.ts");

const HERE = "eval/model-swap-20261122";
const MODELS: Record<string, { model: string; extra: Record<string, unknown> }> = {
  glm: { model: "@cf/zai-org/glm-4.7-flash", extra: { chat_template_kwargs: { enable_thinking: false } } },
  gemma: { model: "@cf/google/gemma-4-26b-a4b-it", extra: { chat_template_kwargs: { enable_thinking: false } } },
  granite: { model: "@cf/ibm-granite/granite-4.0-h-micro", extra: {} },
};
const name = process.argv[2];
const cfg = MODELS[name];
if (!cfg) throw new Error(`usage: run.mts <${Object.keys(MODELS).join("|")}> [--limit N]`);
const li = process.argv.indexOf("--limit");
const limit = li > 0 ? Number(process.argv[li + 1]) : Infinity;
const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim(), token = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!account || !token) throw new Error("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN missing (run with --env-file=.env)");

const jl = (p: string) => fs.existsSync(p) ? fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const prompts = jl(`${HERE}/prompts.jsonl`);
const outPath = `${HERE}/results-${name}.jsonl`;
const done = new Set(jl(outPath).filter((r) => !r.error).map((r) => r.id));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let ran = 0;
for (const p of prompts) {
  if (done.has(p.id)) continue;
  if (ran >= limit) break;
  ran++;
  const body = { messages: [{ role: "system", content: C_SYSTEM_PROMPT }, { role: "user", content: p.prompt }], max_tokens: 512, ...cfg.extra };
  let rec: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t0 = performance.now();
    let http = 0, j: any = null, netErr = "";
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${cfg.model}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body), signal: AbortSignal.timeout(120_000) });
      http = res.status;
      j = await res.json().catch(() => null);
    } catch (e) { netErr = String(e); }
    const ms = Math.round(performance.now() - t0);
    const result = j?.result ?? {};
    const msg = result.choices?.[0]?.message ?? {};
    const raw: string = typeof msg.content === "string" ? msg.content : typeof result.response === "string" ? result.response : "";
    const thinkMatch = raw.match(/<think>[\s\S]*?<\/think>/g) ?? [];
    const answer = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    const reasoning = String(msg.reasoning_content ?? msg.reasoning ?? "") + thinkMatch.join("");
    const ok = http === 200 && j?.success !== false && Number.isFinite(result.usage?.neurons);
    rec = { n: p.n, id: p.id, source: p.source, kind: p.kind, model: cfg.model, attempt, http, ms,
      usage: result.usage ?? null, neurons: result.usage?.neurons ?? null,
      promptTokens: result.usage?.prompt_tokens ?? null, outputTokens: result.usage?.completion_tokens ?? null,
      finish: result.choices?.[0]?.finish_reason ?? result.finish_reason ?? null,
      reasoningChars: reasoning.length, answer, at: new Date().toISOString(),
      error: ok ? (answer ? undefined : "empty answer") : (netErr || JSON.stringify(j?.errors ?? j ?? null).slice(0, 300)) };
    if (ok && answer) break;
    if (http === 429) break;
    if (ok && !answer) break; // metered but empty: record it, don't pay again
    await sleep(3000 * attempt);
  }
  fs.appendFileSync(outPath, JSON.stringify(rec) + "\n");
  console.log(`${name} ${p.n} ${p.id} http=${rec.http} ${rec.ms}ms in=${rec.promptTokens} out=${rec.outputTokens} neurons=${rec.neurons?.toFixed?.(2)} ${rec.error ?? ""}`);
  if (rec.http === 429) { console.log("STOP: HTTP 429 (Neuron allocation). Rerun later; finished ids are skipped."); process.exit(2); }
}
console.log(`${name}: ran ${ran}, total answered ${new Set(jl(outPath).filter((r) => !r.error).map((r) => r.id)).size}/${prompts.length}`);
