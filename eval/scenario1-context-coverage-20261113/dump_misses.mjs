// Step 1: dump 20 random PDF misses (hybrid top5 cap3200, labelled chunk not in context) for hand review.
import { readFileSync, writeFileSync } from "node:fs";
import { selectPassages } from "../../src/retrieval/context.ts";
import { contextBudget } from "../../src/rag.ts";
import { contextConfig } from "../../src/config.ts";
const here = new URL(".", import.meta.url);
const jl = (p) => readFileSync(new URL(p, here), "utf8").split("\n").filter(Boolean).map(JSON.parse);
const cov = jl("per-question.jsonl");
const inv = new Map(jl("../dev-set-preparation-20261103/inventory.jsonl").map((r) => [r.caseId, r]));
const cases = new Map(jl("../scenario1-top5-mrr-20261112/per-question.jsonl").map((c) => [c.caseId, c]));
const lists = new Map(jl("../scenario1-gate-off-topk-20261113/pdf.results.jsonl").map((r) => [`${r.caseId}|${r.mode}|${r.k}`, r.top]));
const docs = new Map(jl("../dev-set-preparation-20261103/source-chunks.jsonl").map((r) => [r.asset, r.chunks.map((c) => ({ text: c.text, source: r.asset, documentId: r.documentId, chunkIndex: c.chunkIndex }))]));
const misses = cov.filter((r) => r.format === "pdf" && !r["hybrid|top5 cap3200"].inContext).map((r) => r.caseId);
let s = 7; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = []; const pool = [...misses]; while (pick.length < 20) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
const out = [`${misses.length} PDF misses; sample of 20 (seeded)\n`];
pick.forEach((id, n) => {
  const c = cases.get(id), v = inv.get(id), chunks = docs.get(`pdf/${c.paperId}`);
  const byIdx = new Map(chunks.map((x) => [x.chunkIndex, x]));
  const top = lists.get(`${id}|hybrid|5`);
  const passages = selectPassages([{ chunks, hits: top.map((t) => ({ ...byIdx.get(t.chunkIndex), score: t.score })) }], { budgetTokens: contextBudget(c.question, [], "concise", 5000), wholeMaxTokens: contextConfig.wholeDocMaxTokens, chunkedMaxTokens: 3200, titleChunk: true });
  const refs = v.references.map((r) => ({ spans: r.original.extractive_spans, free: r.original.free_form_answer, yesno: r.original.yes_no, evidence: (r.original.evidence ?? []).map((e) => e.slice(0, 300)) }));
  out.push(`\n######## ${n + 1}. ${id}\nQ: ${c.question}\nkind: ${c.answerKind} | labelled chunks: ${JSON.stringify(c.relevantChunks)} | top5: ${JSON.stringify(top.map((t) => t.chunkIndex))}`);
  out.push(`GOLD: ${JSON.stringify(refs)}`);
  out.push(`LABELLED CHUNK TEXT:\n${c.relevantChunks.map((i) => `[${i}] ${byIdx.get(i)?.text}`).join("\n")}`);
  out.push(`CONTEXT (${passages.length} passages):\n${passages.map((p) => `--- from chunk ${p.chunkIndex}\n${p.text}`).join("\n")}`);
});
writeFileSync(new URL("misses-review.txt", here), out.join("\n"));
console.log("wrote", pick.length);
