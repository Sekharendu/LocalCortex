// Step 2: is a labelled answer chunk inside the context the model actually reads?
// Uses the app's own selectPassages + contextBudget on the gate-off search lists (dense/hybrid,
// k = 5/10/15) for all 570 answerable dev questions. No model calls.
// Run from repo root: npx tsx eval/scenario1-context-coverage-20261113/run.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { selectPassages } from "../../src/retrieval/context.ts";
import { contextBudget } from "../../src/rag.ts";
import { contextConfig } from "../../src/config.ts";
import { countTokens } from "../../src/generation/tokens.ts";
const here = new URL(".", import.meta.url);
const jl = (p) => readFileSync(new URL(p, here), "utf8").split("\n").filter(Boolean).map(JSON.parse);
const split = JSON.parse(readFileSync(new URL("../split.json", here), "utf8"));
const cases = jl("../scenario1-top5-mrr-20261112/per-question.jsonl").filter((c) => c.group === "answerable");
const lists = new Map();
for (const f of ["pdf", "docx"]) for (const r of jl(`../scenario1-gate-off-topk-20261113/${f}.results.jsonl`)) lists.set(`${r.caseId}|${r.mode}|${r.k}`, r.top);
const docs = new Map();
for (const r of jl("../dev-set-preparation-20261103/source-chunks.jsonl")) {
  const paper = r.asset.split("/")[1];
  if (!split.dev.includes(paper) || split.test.includes(paper)) throw new Error("non-dev asset");
  docs.set(r.asset, { id: r.documentId, chunks: r.chunks.map((c) => ({ text: c.text, source: r.asset, documentId: r.documentId, chunkIndex: c.chunkIndex, ...(c.page ? { page: c.page } : {}) })) });
}
// A chunk is "in context" if its middle half appears verbatim in a passage (merging only trims overlap at edges).
const inside = (text, passages) => { const a = Math.floor(text.length / 4), m = text.slice(a, Math.max(a + 20, text.length - a)); return passages.some((p) => p.text.includes(m)); };
const CONFIGS = [
  { name: "top5 cap1200", k: 5, cap: 1200 }, { name: "top5 cap3200", k: 5, cap: 3200 },
  { name: "top10 cap3200", k: 10, cap: 3200 }, { name: "top15 cap3200 (current)", k: 15, cap: 3200 },
];
const rows = [];
for (const c of cases) {
  const d = docs.get(`${c.format}/${c.paperId}`);
  const byIdx = new Map(d.chunks.map((x) => [x.chunkIndex, x]));
  const rel = c.relevantChunks.map((i) => byIdx.get(i)).filter(Boolean);
  const budget = contextBudget(c.question, [], "concise", 5000);
  const row = { caseId: c.caseId, format: c.format };
  for (const mode of ["dense", "hybrid"]) for (const cfg of CONFIGS) {
    const top = lists.get(`${c.caseId}|${mode}|${cfg.k}`);
    const hits = top.map((t) => ({ ...byIdx.get(t.chunkIndex), score: t.score }));
    const passages = selectPassages([{ chunks: d.chunks, hits }], { budgetTokens: budget, wholeMaxTokens: contextConfig.wholeDocMaxTokens, chunkedMaxTokens: cfg.cap, titleChunk: true });
    const key = `${mode}|${cfg.name}`;
    row[key] = { inTop: top.some((t) => c.relevantChunks.includes(t.chunkIndex)), inContext: rel.some((x) => inside(x.text, passages)), tokens: passages.reduce((s, p) => s + countTokens(p.text) + 4, 0) };
  }
  rows.push(row);
}
const out = [];
for (const [label, sel] of [["All", rows], ["PDF", rows.filter((r) => r.format === "pdf")], ["DOCX", rows.filter((r) => r.format === "docx")]]) {
  const N = sel.length; out.push(`\n${label} (${N} answerable questions)`, "mode   setup                    | in top-k      | in context    | context tokens (median)");
  for (const mode of ["dense", "hybrid"]) for (const cfg of CONFIGS) {
    const k = `${mode}|${cfg.name}`, a = sel.filter((r) => r[k].inTop).length, b = sel.filter((r) => r[k].inContext).length;
    const t = sel.map((r) => r[k].tokens).sort((x, y) => x - y)[Math.floor(N / 2)];
    out.push(`${mode.padEnd(6)} ${cfg.name.padEnd(24)} | ${String(a).padStart(3)} (${(100 * a / N).toFixed(1).padStart(5)}%) | ${String(b).padStart(3)} (${(100 * b / N).toFixed(1).padStart(5)}%) | ${t}`);
  }
}
const rep = out.join("\n"); console.log(rep);
writeFileSync(new URL("report.txt", here), rep + "\n");
writeFileSync(new URL("per-question.jsonl", here), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
