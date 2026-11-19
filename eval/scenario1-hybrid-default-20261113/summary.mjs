// Coverage of the gate-on runs through the app's own context assembly (concise prompt, numCtx 5000, cap 3200, title chunk).
import { readFileSync, writeFileSync } from "node:fs";
import { selectPassages } from "../../src/retrieval/context.ts";
import { contextBudget } from "../../src/rag.ts";
import { contextConfig } from "../../src/config.ts";
const here = new URL(".", import.meta.url);
const jl = (p) => readFileSync(new URL(p, here), "utf8").split("\n").filter(Boolean).map(JSON.parse);
const cases = new Map(jl("../scenario1-top5-mrr-20261112/per-question.jsonl").map((c) => [c.caseId, c]));
const docs = new Map();
for (const r of jl("../dev-set-preparation-20261103/source-chunks.jsonl"))
  docs.set(r.asset, r.chunks.map((c) => ({ text: c.text, source: r.asset, documentId: r.documentId, chunkIndex: c.chunkIndex })));
const inside = (t, ps) => { const a = Math.floor(t.length / 4), m = t.slice(a, Math.max(a + 20, t.length - a)); return ps.some((p) => p.text.includes(m)); };
const stat = {};
let n = 0;
for (const r of [...jl("pdf.results.jsonl"), ...jl("docx.results.jsonl")]) {
  if (++n % 200 === 0) console.error("rows", n);
  const c = cases.get(r.caseId); const g = c?.group ?? "unknown";
  const s = (stat[`${r.label}|${g}`] ??= { n: 0, rejected: 0, inContext: 0, ms: [] });
  s.n++; s.ms.push(r.elapsedMs); if (r.gateRejected) { s.rejected++; continue; }
  if (g !== "answerable") continue;
  const chunks = docs.get(`${c.format}/${c.paperId}`), byIdx = new Map(chunks.map((x) => [x.chunkIndex, x]));
  const passages = selectPassages([{ chunks, hits: r.top.map((t) => ({ ...byIdx.get(t.chunkIndex), score: t.score })) }],
    { budgetTokens: contextBudget(c.question, [], "concise", 5000), wholeMaxTokens: contextConfig.wholeDocMaxTokens, chunkedMaxTokens: 3200, titleChunk: true });
  if (c.relevantChunks.some((i) => byIdx.get(i) && inside(byIdx.get(i).text, passages))) s.inContext++;
}
const lines = Object.entries(stat).sort().map(([k, s]) => { const ms = s.ms.sort((a, b) => a - b)[Math.floor(s.ms.length / 2)];
  return `${k.padEnd(24)} n=${s.n}  gate-rejected=${s.rejected}  answer-in-context=${s.inContext} (${(100 * s.inContext / s.n).toFixed(1)}%)  median ${ms} ms`; });
console.log(lines.join("\n")); writeFileSync(new URL("report.txt", here), lines.join("\n") + "\n");
