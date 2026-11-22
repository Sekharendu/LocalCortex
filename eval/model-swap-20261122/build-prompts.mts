// Freeze the 100 answer prompts for the model-swap comparison (no LLM calls).
// Source: the original Qwen run (rerank/neurons-top10-vs-top15, config top10, rep 1), whose exact prompts were rebuilt in
// eval/answer-step-review-20261118/prompts.jsonl. A prompt is kept as-is when a gold (relevant) chunk is in it and it matches
// the recorded size. Otherwise the search missed the answer, so the prompt is rebuilt with the gold chunks first ("gold-added"):
// gold chunks that carry the evidence, then the original blend order, top 10 -> the same selectPassages/buildPrompt path.
// Needs the ragbench Qdrant on 127.0.0.1:36333. Run (repo root): npx tsx eval/model-swap-20261122/build-prompts.mts
import fs from "node:fs";
const STATE = "X:/LocalCortex-ragbench/state";
const SRC = "eval-ragbench-dev-20261115";
const RB = "eval/ragbench-20261115";
const HERE = "eval/model-swap-20261122";
Object.assign(process.env, {
  QDRANT_URL: "http://127.0.0.1:36333", QDRANT_COLLECTION: SRC, DOC_STORE_PATH: `${STATE}/documents.json`,
  SPARSE_STATS_PATH: `${STATE}/sparse-stats.json`, RERANK_ENABLED: "0", CLOUDFLARE_API_TOKEN: "", CLOUDFLARE_ACCOUNT_ID: "",
});
for (const k of ["RETRIEVE_MODE", "RETRIEVE_SCORE_THRESHOLD", "RETRIEVE_TOP_K", "RAG_PROFILE"]) delete process.env[k];
const { selectPassages } = await import("../../src/retrieval/context.ts");
const { chunksByDocumentId } = await import("../../src/retrieval/vectorStore.ts");
const { buildPrompt } = await import("../../src/generation/promptBuilder.ts");
const { C_SYSTEM_PROMPT } = await import("../../src/generation/promptVariants.ts");
const { countTokens } = await import("../../src/generation/tokens.ts");
const { contextBudget } = await import("../../src/rag.ts");
const { contextConfig, answerSettings } = await import("../../src/config.ts");

const jl = (p: string) => fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const Q = new Map<string, any>(jl(`${RB}/dev.jsonl`).map((r) => [r.id, r]));
const docId = new Map<string, string>(jl(`${STATE}/ingest-dev.jsonl`).filter((r) => r.ok).map((r) => [r.path, r.documentId]));
const rebuilt = new Map<string, any>(jl("eval/answer-step-review-20261118/prompts.jsonl").filter((r) => r.run === "neurons-top10").map((r) => [r.id, r]));
const qwen = jl(`${RB}/rerank/neurons-top10-vs-top15.jsonl`).filter((r) => r.config === "top10" && r.rep === 1);
const settings = answerSettings();
// Numbers/phrases the answer needs that the earlier answer-step review found missing from the Qwen prompt even though a
// relevant chunk was there (failure-cases.json, inPrompt "no"). These are rebuilt too, preferring chunks that hold them.
const NEEDLES: Record<string, string[]> = {
  "financebench-0047": ["1,250", "2,811"], "financebench-0011": ["1,493,602", "903,095"],
  "financebench-0121": ["material adverse effect"], "tat-0711": ["6,759", "7,031", "7,146"],
};

// How much of the evidence the prompt holds: short evidence strings (cells, numbers) must appear; long ones (passages)
// count when their first 120 normalised chars appear.
function evidenceCoverage(prompt: string, evidence: string[]) {
  const P = norm(prompt);
  const ev = [...new Set(evidence.map(norm).filter(Boolean))];
  const hit = ev.filter((e) => P.includes(e.length <= 120 ? e : e.slice(0, 120)));
  return { found: hit.length, total: ev.length };
}
// Evidence score of a chunk: how many evidence strings it contains, or whether it is a piece of a long evidence passage.
function goldScore(text: string, evidence: string[], needles: string[] = []) {
  const t = norm(text);
  let s = needles.filter((n) => text.includes(n)).length * 100;
  for (const e0 of evidence) {
    const e = norm(e0);
    if (!e) continue;
    if (e.length <= 120) { if (t.includes(e)) s += 1; }
    else if (e.includes(t.slice(0, 80)) || t.includes(e.slice(0, 80))) s += 5;
  }
  return s;
}

const out: string[] = [];
for (const rec of qwen) {
  const q = Q.get(rec.id), r = rebuilt.get(rec.id);
  const goldInPrompt = r.relevant.some((i: number) => r.relInPrompt.includes(i));
  const keep = goldInPrompt && r.fidelity?.tokensSame && !NEEDLES[rec.id];
  let prompt = r.prompt, kind = "qwen-identical", gold: number[] = [];
  if (!keep) {
    const chunks = await chunksByDocumentId(SRC, docId.get(q.path)!);
    const byIdx = new Map<number, any>(chunks.map((c: any) => [c.chunkIndex, c]));
    gold = r.relevant.filter((i: number) => byIdx.has(i))
      .map((i: number) => ({ i, s: goldScore(byIdx.get(i).text, q.evidence, NEEDLES[rec.id]) }))
      .sort((a: any, b: any) => b.s - a.s || a.i - b.i).slice(0, 4).map((x: any) => x.i);
    const order = [...gold, ...r.blendTop10.filter((i: number) => !gold.includes(i))].slice(0, 10);
    const pick = order.map((ci, k) => { const c = byIdx.get(ci); return { text: c.text, source: c.source, page: c.page, documentId: c.documentId, chunkIndex: ci, score: 1 - k / 100 }; });
    const passages = selectPassages([{ chunks, hits: pick } as any], { budgetTokens: contextBudget(q.question, [], settings.promptVariant, settings.numCtx),
      wholeMaxTokens: contextConfig.wholeDocMaxTokens, chunkedMaxTokens: settings.chunkedDocMaxTokens, titleChunk: contextConfig.titleChunk });
    prompt = buildPrompt(q.question, passages, [], settings.promptVariant);
    kind = "gold-added";
  }
  const goldNowInPrompt = (kind === "gold-added" ? gold : r.relevant).filter((i: number) => {
    const c = r.relInPrompt.includes(i); return kind === "qwen-identical" ? c : true; });
  out.push(JSON.stringify({ n: out.length + 1, id: rec.id, source: q.source, question: q.question, reference: q.answer,
    kind, goldAdded: gold, needles: NEEDLES[rec.id] ? Object.fromEntries(NEEDLES[rec.id].map((n) => [n, prompt.includes(n)])) : undefined, evidence: evidenceCoverage(prompt, q.evidence), llama3Tokens: countTokens(C_SYSTEM_PROMPT) + countTokens(prompt),
    qwenPromptTokens: rec.usage?.prompt_tokens ?? null, prompt }));
  console.error(rec.id, kind, gold.join(","), goldNowInPrompt.length);
}
fs.writeFileSync(`${HERE}/prompts.jsonl`, out.join("\n") + "\n");
console.log("lines", out.length);
process.exit(0);
