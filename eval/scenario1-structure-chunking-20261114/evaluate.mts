// Score the structure-chunking variants: top-5 hit rate inside each question's own paper.
// In-memory search with the app's math: dense cosine; hybrid = dense top-20 + BM25 sparse
// top-20 (app tokenizer/TF, IDF ln(1+(N-n+.5)/(n+.5)) over the variant's chunks) fused by
// weighted RRF [2,1]; gate = best dense cosine >= 0.63. Labels: label.py's rule, ported.
// Run: npx tsx --env-file=.env eval/scenario1-structure-chunking-20261114/evaluate.mts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { embed } from "../../src/retrieval/embedder.ts";
import { expandAcronyms } from "../../src/retrieval/acronyms.ts";
import { sparseVectorFor, tokenize } from "../../src/retrieval/sparse.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVAL = path.join(HERE, "..");
const CACHE = "X:/LocalCortex-chunk-test";
const K = 5, PREFETCH = 20, GATE = 0.63;
const RRF_K = Number(process.env.RRF_K ?? 2), RRF_BASE = Number(process.env.RRF_BASE ?? 0);

const SAMPLE: string[] = JSON.parse(fs.readFileSync(path.join(HERE, "sample.json"), "utf8")).papers
  .filter((p: string) => !process.env.PARTIAL || fs.existsSync(path.join("X:/LocalCortex-chunk-test", `${p}.json`)));
const perQ = fs.readFileSync(path.join(EVAL, "scenario1-top5-mrr-20261112/per-question.jsonl"), "utf8")
  .split("\n").filter(Boolean).map((l) => JSON.parse(l))
  .filter((r) => r.format === "pdf" && r.group === "answerable" && SAMPLE.includes(r.paperId));
const inv = new Map(fs.readFileSync(path.join(EVAL, "dev-set-preparation-20261103/inventory.jsonl"), "utf8")
  .split("\n").filter(Boolean).map((l) => JSON.parse(l)).map((c) => [c.caseId, c]));

// ---- label.py port ----
const PH = /\b(?:BIBREF|TABREF|FIGREF|SECREF|EQREF|INLINEFORM|DISPLAYFORM)\d*\b/g;
const toks = (s: string) => (s.normalize("NFKC").replaceAll("\u00ad", "").replace(/-\s*\n\s*/g, "").toLowerCase().match(/[a-z0-9]+/g) ?? []);
function segments(text: string): string[][] {
  text = text.trim().replace(/^FLOAT SELECTED:\s*/, "").replace(/<[^>]+>/g, " | ");
  const out: string[][] = [];
  for (const part of text.split(PH)) for (const sent of part.split(/(?<=[.!?;:])\s+|\s\|\s/)) { const t = toks(sent); if (t.length) out.push(t); }
  return out;
}
const N = 5;
const grams = (t: string[]) => { const s = new Set<string>(); for (let i = 0; i + N <= t.length; i++) s.add(t.slice(i, i + N).join(" ")); return s; };
function match(seg: string[], cg: Set<string>): boolean {
  if (seg.length < N) return false;
  const g = grams(seg); let hit = 0; for (const x of g) if (cg.has(x)) hit++;
  return (hit >= Math.max(1, Math.min(g.size, 4)) && hit / g.size >= 0.5) || hit >= 5;
}
function labels(caseRow: any, chunkTexts: string[]): Set<number> {
  const ct = chunkTexts.map(toks), cg = ct.map(grams), cj = ct.map((t) => " " + t.join(" ") + " ");
  const rel = new Set<number>();
  for (const r of caseRow.references) {
    const o = r.original;
    const mine = new Set<number>();
    for (const pool of [o.highlighted_evidence ?? [], o.evidence ?? []]) {
      for (const e of pool) for (const seg of segments(e)) cg.forEach((g, i) => { if (match(seg, g)) mine.add(i); });
      if (mine.size) break;
    }
    for (const s of o.extractive_spans ?? []) {
      const t = toks(s.replace(PH, " "));
      if (t.length >= 4) { const needle = " " + t.join(" ") + " "; cj.forEach((j, i) => { if (j.includes(needle)) mine.add(i); }); }
    }
    mine.forEach((i) => rel.add(i));
  }
  return rel;
}

// ---- search ----
const dot = (a: number[], b: number[]) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const norm = (a: number[]) => Math.sqrt(dot(a, a));
type Sp = { indices: number[]; values: number[] };
function search(q: number[], qs: Sp, docs: { vec: number[]; n: number; sp: Map<number, number> }[], idf: Map<number, number>) {
  const qn = norm(q);
  const dense = docs.map((d, i) => ({ i, s: dot(q, d.vec) / (qn * d.n) })).sort((a, b) => b.s - a.s);
  const sparse = docs.map((d, i) => { let s = 0; qs.indices.forEach((t, k) => { const v = d.sp.get(t); if (v) s += qs.values[k] * v * (idf.get(t) ?? 0); }); return { i, s }; })
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const fused = new Map<number, number>();
  const add = (list: { i: number }[], w: number) => list.slice(0, PREFETCH).forEach((x, r) => fused.set(x.i, (fused.get(x.i) ?? 0) + w / (RRF_K + r + RRF_BASE)));
  if (qs.indices.length) { add(dense, 2); add(sparse, 1); } else add(dense, 1);
  const hybrid = [...fused].sort((a, b) => b[1] - a[1]).map(([i]) => i);
  return { dense: dense.map((x) => x.i), hybrid, top1: dense[0]?.s ?? 0 };
}

// ---- load caches ----
const data: Record<string, any> = {};
for (const p of SAMPLE) {
  const f = path.join(CACHE, `${p}.json`);
  if (!fs.existsSync(f)) throw new Error(`missing ${f}: run build.mts first`);
  data[p] = JSON.parse(fs.readFileSync(f, "utf8"));
}
const VARIANTS = Object.keys(data[SAMPLE[0]]);

// query vectors (cached)
const qCacheFile = path.join(CACHE, "queries.json");
const qCache: Record<string, number[]> = fs.existsSync(qCacheFile) ? JSON.parse(fs.readFileSync(qCacheFile, "utf8")) : {};
for (const r of perQ) if (!qCache[r.caseId]) qCache[r.caseId] = await embed(expandAcronyms(r.question));
fs.writeFileSync(qCacheFile, JSON.stringify(qCache));

const results: any[] = [];
const summary: Record<string, any> = {};
for (const v of VARIANTS) {
  // corpus stats over this variant's chunks (sample only)
  const all = SAMPLE.flatMap((p) => data[p][v]);
  const avg = all.reduce((s: number, c: any) => s + tokenize(c.text).length, 0) / all.length;
  const docsByPaper: Record<string, any[]> = {};
  const df = new Map<number, number>();
  for (const p of SAMPLE) docsByPaper[p] = data[p][v].map((c: any) => {
    const sp = sparseVectorFor(c.embed, avg);
    sp.indices.forEach((t) => df.set(t, (df.get(t) ?? 0) + 1));
    return { vec: c.vec, n: norm(c.vec), sp: new Map(sp.indices.map((t, k) => [t, sp.values[k]])), text: c.text };
  });
  const Ntot = all.length;
  const idf = new Map([...df].map(([t, n]) => [t, Math.log(1 + (Ntot - n + 0.5) / (n + 0.5))]));

  const tally = { questions: 0, unlocated: 0, gateRefused: 0, dense5: 0, hybrid5: 0, dense5gate: 0, hybrid5gate: 0, dense1: 0, hybrid1: 0, charsTop5: [] as number[] };
  for (const r of perQ) {
    const docs = docsByPaper[r.paperId];
    const rel = labels(inv.get(r.caseId), docs.map((d) => d.text));
    const s = search(qCache[r.caseId], sparseVectorFor(expandAcronyms(r.question), avg), docs, idf);
    const hit = (list: number[], k: number) => list.slice(0, k).some((i) => rel.has(i));
    const gateOk = s.top1 >= GATE;
    tally.questions++;
    if (!rel.size) tally.unlocated++;
    if (!gateOk) tally.gateRefused++;
    if (hit(s.dense, K)) { tally.dense5++; if (gateOk) tally.dense5gate++; }
    if (hit(s.hybrid, K)) { tally.hybrid5++; if (gateOk) tally.hybrid5gate++; }
    if (hit(s.dense, 1)) tally.dense1++;
    if (hit(s.hybrid, 1)) tally.hybrid1++;
    tally.charsTop5.push(s.hybrid.slice(0, K).reduce((a, i) => a + docs[i].text.length, 0));
    results.push({ variant: v, caseId: r.caseId, relevant: [...rel], dense5: s.dense.slice(0, K), hybrid5: s.hybrid.slice(0, K), top1: +s.top1.toFixed(4) });
    if (v === "base") {
      // self-checks against the stored Qdrant run for the same chunks
      (summary.check ??= { labelsSame: 0, dense5Same: 0, hybrid5Same: 0, n: 0 });
      summary.check.n++;
      if (JSON.stringify([...rel].sort((a, b) => a - b)) === JSON.stringify(r.relevantChunks)) summary.check.labelsSame++;
      if (JSON.stringify(s.dense.slice(0, K)) === JSON.stringify(r.dense_top5)) summary.check.dense5Same++;
      if (JSON.stringify(s.hybrid.slice(0, K)) === JSON.stringify(r.hybrid_top5)) summary.check.hybrid5Same++;
    }
  }
  const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const pct = (n: number) => +(100 * n / tally.questions).toFixed(1);
  summary[v] = {
    chunks: all.length, medianChunkChars: med(all.map((c: any) => c.text.length)),
    questions: tally.questions, unlocated: tally.unlocated,
    hybridTop5: pct(tally.hybrid5), denseTop5: pct(tally.dense5),
    hybridTop5GateOn: pct(tally.hybrid5gate), denseTop5GateOn: pct(tally.dense5gate),
    hybridTop1: pct(tally.hybrid1), denseTop1: pct(tally.dense1),
    gateRefused: pct(tally.gateRefused), medianCharsTop5: med(tally.charsTop5),
  };
}
// Stored Qdrant numbers for the same questions (today's chunks) for reference.
summary.storedBase = {
  hybridTop5: +(100 * perQ.filter((r) => r.hybrid_rank != null && r.hybrid_rank <= 5).length / perQ.length).toFixed(1),
  denseTop5: +(100 * perQ.filter((r) => r.dense_rank != null && r.dense_rank <= 5).length / perQ.length).toFixed(1),
};
fs.writeFileSync(path.join(HERE, "results.jsonl"), results.map((r) => JSON.stringify(r)).join("\n") + "\n");
fs.writeFileSync(path.join(HERE, "summary.json"), JSON.stringify({ settings: { K, PREFETCH, GATE, RRF_K, RRF_BASE }, ...summary }, null, 1));
console.log(JSON.stringify({ settings: { RRF_K, RRF_BASE }, ...summary }, null, 1));
