// Neurons, tokens and time of real answer calls: 50/50 blend top 10 vs 50/50 blend top 15.
// 100 ordinary-PDF dev questions (same fixed sample as llm-rerank.mts), app context assembly + C prompt,
// app's 512-token cap and default temperature, direct Cloudflare call so usage (incl. neurons) is recorded.
// Order of the two calls alternates per question. Then the first 20 questions are repeated for both
// settings (noise on an identical prompt). Resumable: one line per call in neurons-top10-vs-top15.jsonl.
// Run (repo root): npx tsx eval/ragbench-20261115/rerank/neurons-top10-vs-top15.mts
import fs from "node:fs";
import crypto from "node:crypto";
for (const l of fs.readFileSync(".env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const STATE = "X:/LocalCortex-ragbench/state";
const SRC = "eval-ragbench-dev-20261115";
const HERE = "eval/ragbench-20261115";
Object.assign(process.env, {
  QDRANT_URL: "http://127.0.0.1:36333", OLLAMA_URL: "http://127.0.0.1:11434", QDRANT_COLLECTION: SRC,
  DOC_STORE_PATH: `${STATE}/documents.json`, SPARSE_STATS_PATH: `${STATE}/sparse-stats.json`,
  OLLAMA_EMBED_MODEL: "nomic-embed-text", OLLAMA_EMBED_DIM: "768", OLLAMA_EMBED_PREFIXES: "1",
  RETRIEVE_FUSION: "rrf", RERANK_ENABLED: "0",
});
for (const k of ["RETRIEVE_MODE", "RETRIEVE_SCORE_THRESHOLD", "RETRIEVE_TOP_K", "RAG_PROFILE"]) delete process.env[k];
const { retrieve } = await import("../../../src/retrieval/retriever.ts");
const { selectPassages } = await import("../../../src/retrieval/context.ts");
const { chunksByDocumentId } = await import("../../../src/retrieval/vectorStore.ts");
const { buildPrompt } = await import("../../../src/generation/promptBuilder.ts");
const { C_SYSTEM_PROMPT } = await import("../../../src/generation/promptVariants.ts");
const { countTokens } = await import("../../../src/generation/tokens.ts");
const { contextBudget } = await import("../../../src/rag.ts");
const { contextConfig, answerSettings, answerConfig } = await import("../../../src/config.ts");
const { GENERATION_MODEL } = await import("../../../src/generation/llm.ts");

const jl = (p: string) => fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const rows = jl(`${HERE}/rerank/candidates.jsonl`);
const scores = new Map<string, Record<string, number>>(jl(`${HERE}/rerank/scores.jsonl`).map((r) => [r.id, r.scores]));
const Q = new Map<string, any>(jl(`${HERE}/dev.jsonl`).map((r) => [r.id, r]));
const docId = new Map<string, string>(jl(`${STATE}/ingest-dev.jsonl`).filter((r) => r.ok).map((r) => [r.path, r.documentId]));
const h = (s: string) => crypto.createHash("sha1").update("llm-rerank:" + s).digest("hex");
const sample = [...rows].sort((a, b) => h(a.id).localeCompare(h(b.id))).slice(0, 100);
const settings = answerSettings();
const outPath = `${HERE}/rerank/neurons-top10-vs-top15.jsonl`;
const done = new Set(fs.existsSync(outPath) ? jl(outPath).map((r) => `${r.id}|${r.config}|${r.rep}`) : []);

async function retry<T>(f: () => Promise<T>, tries = 8): Promise<T> {
  for (let a = 1; ; a++) { try { return await f(); } catch (e) { if (a >= tries) throw e; console.log("retry", a, String(e).slice(0, 100)); await new Promise((r) => setTimeout(r, 5000 * a)); } }
}
function blend(cand: number[], s: Record<string, number>, w: number) {
  const rr = new Map([...cand].sort((a, b) => s[b] - s[a]).map((x, i) => [x, i]));
  return [...cand].sort((a, b) => (w / (60 + rr.get(b)!) + (1 - w) / (60 + cand.indexOf(b))) - (w / (60 + rr.get(a)!) + (1 - w) / (60 + cand.indexOf(a))));
}
async function call(prompt: string) {
  const body = JSON.stringify({ prompt: `<|im_start|>system\n${C_SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`,
    raw: true, stream: false, max_tokens: answerConfig.maxOutputTokens });
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${GENERATION_MODEL}`,
    { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }, body, signal: AbortSignal.timeout(180_000) });
  if (!r.ok) { await r.body?.cancel().catch(() => {}); throw new Error("HTTP " + r.status); }
  const j: any = await r.json(); const res = j.result ?? j;
  const text = String(res.choices?.[0]?.text ?? "").trim();
  if (!text) throw new Error("empty text");
  return { text, usage: res.usage ?? null, finish: res.choices?.[0]?.finish_reason ?? null };
}

// Build both prompts per question once (deterministic), cache for repeats.
const prompts = new Map<string, any>();
async function build(r: any) {
  if (prompts.has(r.id)) return prompts.get(r.id);
  const q = Q.get(r.id);
  const scope = { status: "resolved" as const, references: [], documentIds: [docId.get(q.path)!] };
  const hits = await retry(() => retrieve(q.question, { mode: "hybrid", topK: 20, scoreThreshold: -1, documentScope: scope } as any));
  const byIdx = new Map(hits.map((x: any) => [x.chunkIndex, x]));
  const order = blend(hits.map((x: any) => x.chunkIndex), scores.get(r.id)!, 0.5);
  const chunks = await retry(() => chunksByDocumentId(SRC, hits[0].documentId));
  const relTexts = chunks.filter((c: any) => r.relevant.includes(c.chunkIndex)).map((c: any) => c.text);
  const out: any = { sameOrderAsCandidates: hits.map((x: any) => x.chunkIndex).join() === r.hybrid.slice(0, 20).join() };
  for (const k of [10, 15]) {
    const pick = order.slice(0, k).map((i) => byIdx.get(i)!);
    const passages = selectPassages([{ chunks, hits: pick }], { budgetTokens: contextBudget(q.question, [], settings.promptVariant, settings.numCtx),
      wholeMaxTokens: contextConfig.wholeDocMaxTokens, chunkedMaxTokens: settings.chunkedDocMaxTokens, titleChunk: contextConfig.titleChunk });
    const prompt = buildPrompt(q.question, passages, [], settings.promptVariant);
    out[`top${k}`] = { prompt, llama3Tokens: countTokens(C_SYSTEM_PROMPT) + countTokens(prompt), chars: C_SYSTEM_PROMPT.length + prompt.length,
      passages: passages.length, answerChunkInTopK: pick.some((x: any) => r.relevant.includes(x.chunkIndex)),
      answerTextInPrompt: relTexts.some((t: string) => prompt.includes(t.trim().slice(0, 200))) };
  }
  prompts.set(r.id, out);
  return out;
}

const jobs: { r: any; config: "top10" | "top15"; rep: number }[] = [];
sample.forEach((r, i) => { const pair: ("top10" | "top15")[] = i % 2 ? ["top15", "top10"] : ["top10", "top15"]; for (const c of pair) jobs.push({ r, config: c, rep: 1 }); });
sample.slice(0, 20).forEach((r, i) => { const pair: ("top10" | "top15")[] = i % 2 ? ["top10", "top15"] : ["top15", "top10"]; for (const c of pair) jobs.push({ r, config: c, rep: 2 }); });

let n = 0;
for (const { r, config, rep } of jobs) {
  n++;
  if (done.has(`${r.id}|${config}|${rep}`)) continue;
  const b = await build(r);
  const p = b[config];
  let res: any = null, err = "", attempts = 0;
  const t0 = Date.now();
  for (attempts = 1; attempts <= 3 && !res; attempts++) {
    try { res = await call(p.prompt); } catch (e) { err = String(e).slice(0, 120); await new Promise((x) => setTimeout(x, 3000 * attempts)); }
  }
  const rec = { id: r.id, source: r.source, area: r.area, config, rep, at: new Date().toISOString(), ms: Date.now() - t0, attempts: attempts - 1,
    error: res ? "" : err, usage: res?.usage ?? null, finish: res?.finish ?? null, answerChars: res?.text.length ?? 0, answer: res?.text ?? "",
    llama3Tokens: p.llama3Tokens, chars: p.chars, passages: p.passages, answerChunkInTopK: p.answerChunkInTopK, answerTextInPrompt: p.answerTextInPrompt,
    sameOrderAsCandidates: b.sameOrderAsCandidates };
  fs.appendFileSync(outPath, JSON.stringify(rec) + "\n");
  if (n % 10 === 0) console.log(JSON.stringify({ n: `${n}/${jobs.length}`, config, ms: rec.ms, usage: rec.usage, err: rec.error }));
}
console.log(JSON.stringify({ finished: jobs.length }));
