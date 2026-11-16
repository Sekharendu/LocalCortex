// How big is the prompt the app would send to Cloudflare, per question, for a given chunk order and top k?
// Uses the app's own context assembly (whole small docs, hits + neighbours + title chunk, 3200-token cap per document)
// and buildPrompt + system prompt. Orders: search (today) and the 50/50 reranker blend (stored scores). No LLM calls.
// Run (repo root): npx tsx eval/ragbench-20261115/rerank/context-size.mts
import fs from "node:fs";
const STATE = "X:/LocalCortex-ragbench/state";
const SRC = "eval-ragbench-dev-20261115";
const HERE = "eval/ragbench-20261115";
Object.assign(process.env, {
  QDRANT_URL: "http://127.0.0.1:36333", OLLAMA_URL: "http://127.0.0.1:11434", QDRANT_COLLECTION: SRC,
  DOC_STORE_PATH: `${STATE}/documents.json`, SPARSE_STATS_PATH: `${STATE}/sparse-stats.json`,
  OLLAMA_EMBED_MODEL: "nomic-embed-text", OLLAMA_EMBED_DIM: "768", OLLAMA_EMBED_PREFIXES: "1",
  RETRIEVE_FUSION: "rrf", RERANK_ENABLED: "0", CLOUDFLARE_API_TOKEN: "", CLOUDFLARE_ACCOUNT_ID: "",
});
for (const k of ["RETRIEVE_MODE", "RETRIEVE_SCORE_THRESHOLD", "RETRIEVE_TOP_K"]) delete process.env[k];
const { retrieve } = await import("../../../src/retrieval/retriever.ts");
const { selectPassages } = await import("../../../src/retrieval/context.ts");
const { chunksByDocumentId } = await import("../../../src/retrieval/vectorStore.ts");
const docCache = new Map<string, any[]>();
async function docChunks(id: string) {
  if (!docCache.has(id)) for (let a = 1; ; a++) { try { docCache.clear(); docCache.set(id, await chunksByDocumentId(SRC, id)); break; } catch (e) { if (a >= 5) throw e; await new Promise((r) => setTimeout(r, 5000 * a)); } }
  return docCache.get(id)!;
}
const { buildPrompt } = await import("../../../src/generation/promptBuilder.ts");
const { C_SYSTEM_PROMPT } = await import("../../../src/generation/promptVariants.ts");
const { countTokens } = await import("../../../src/generation/tokens.ts");
const { contextBudget } = await import("../../../src/rag.ts");
const { contextConfig, answerSettings } = await import("../../../src/config.ts");

const jl = (p: string) => fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const cands = jl(`${HERE}/rerank/candidates.jsonl`);
const scores = new Map<string, Record<string, number>>(jl(`${HERE}/rerank/scores.jsonl`).map((r) => [r.id, r.scores]));
const Q = new Map<string, any>(jl(`${HERE}/dev.jsonl`).map((r) => [r.id, r]));
const docId = new Map<string, string>(jl(`${STATE}/ingest-dev.jsonl`).filter((r) => r.ok).map((r) => [r.path, r.documentId]));
const settings = answerSettings();
const sys = countTokens(C_SYSTEM_PROMPT);

function blend(cand: number[], s: Record<string, number>, w: number) {
  const rr = new Map([...cand].sort((a, b) => s[b] - s[a]).map((x, i) => [x, i]));
  return [...cand].sort((a, b) => (w / (60 + rr.get(b)!) + (1 - w) / (60 + cand.indexOf(b))) - (w / (60 + rr.get(a)!) + (1 - w) / (60 + cand.indexOf(a))));
}
const configs: [string, number, number][] = [["search top 5", 0, 5], ["search top 10", 0, 10], ["search top 15", 0, 15], ["blend top 10", 0.5, 10], ["blend top 15", 0.5, 15]];
const res: Record<string, { tokens: number[]; chars: number[]; passages: number[]; raw: number[] }> = {};
for (const [name] of configs) res[name] = { tokens: [], chars: [], passages: [], raw: [] };
const perPath = `${HERE}/rerank/context-size-per-question.jsonl`;
const prev = fs.existsSync(perPath) ? jl(perPath) : [];
const doneIds = new Set(prev.map((r) => r.id));
for (const r of prev) for (const [name] of configs) for (const f of ["tokens", "chars", "passages", "raw"] as const) (res[name] as any)[f].push(r[name][f]);
async function retry<T>(f: () => Promise<T>): Promise<T> {
  for (let a = 1; ; a++) { try { return await f(); } catch (e) { if (a >= 8) throw e; console.log("retry", a, String(e).slice(0, 100)); await new Promise((r) => setTimeout(r, 5000 * a)); } }
}
let n = prev.length;
for (const c of cands) {
  if (doneIds.has(c.id)) continue;
  const q = Q.get(c.id);
  const scope = { status: "resolved" as const, references: [], documentIds: [docId.get(q.path)!] };
  const hits = await retry(() => retrieve(q.question, { mode: "hybrid", topK: 20, scoreThreshold: -1, documentScope: scope } as any));
  const rec: any = { id: c.id, source: c.source };
  const byIdx = new Map(hits.map((h: any) => [h.chunkIndex, h]));
  const order: number[] = hits.map((h: any) => h.chunkIndex);
  for (const [name, w, k] of configs) {
    const pick = (w === 0 ? order : blend(order, scores.get(c.id)!, w)).slice(0, k).map((i) => byIdx.get(i)!);
    const chunks = await docChunks(pick[0].documentId);
    const passages = selectPassages([{ chunks, hits: pick }], { budgetTokens: contextBudget(q.question, [], settings.promptVariant, settings.numCtx),
      wholeMaxTokens: contextConfig.wholeDocMaxTokens, chunkedMaxTokens: settings.chunkedDocMaxTokens, titleChunk: contextConfig.titleChunk });
    const prompt = buildPrompt(q.question, passages, [], settings.promptVariant);
    rec[name] = { tokens: sys + countTokens(prompt), chars: C_SYSTEM_PROMPT.length + prompt.length, passages: passages.length,
      raw: pick.reduce((a: number, h: any) => a + countTokens(h.text), 0) };
    for (const f of ["tokens", "chars", "passages", "raw"] as const) (res[name] as any)[f].push(rec[name][f]);
  }
  fs.appendFileSync(perPath, JSON.stringify(rec) + "\n");
  if (++n % 100 === 0) console.log(n);
}
const st = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return { mean: Math.round(v.reduce((a, b) => a + b, 0) / v.length), median: s[s.length >> 1], p90: s[Math.floor(s.length * 0.9)], max: s[s.length - 1] }; };
const summary: any = { questions: n, note: "tokens counted with the app's llama3 tokenizer; Qwen counts are similar but not identical", systemPromptTokens: sys };
for (const [name] of configs) summary[name] = { promptTokens: st(res[name].tokens), promptChars: st(res[name].chars), rawChunkTokens: st(res[name].raw), passagesSent: st(res[name].passages) };
fs.writeFileSync(`${HERE}/rerank/context-size-summary.json`, JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
