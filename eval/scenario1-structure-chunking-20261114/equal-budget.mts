// Equal-text test: is the 1,200-char gain better search, or just more text?
// Every variant sends the same character budget per question, filled two ways:
//   more = next-ranked chunks in order;  nbr = each ranked hit followed by its neighbours (+-1).
// Chunks are added in order until the next one would overflow the budget (the first one is always sent).
// A question counts if any labelled answer chunk is in what is sent. Same search/labels as evaluate.mts.
// Run (repo root): npx tsx --env-file=.env eval/scenario1-structure-chunking-20261114/equal-budget.mts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expandAcronyms } from "../../src/retrieval/acronyms.ts";
import { sparseVectorFor, tokenize } from "../../src/retrieval/sparse.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVAL = path.join(HERE, "..");
const CACHE = "X:/LocalCortex-chunk-test";
const PREFETCH = 20, GATE = 0.63, RRF_K = 60, RRF_BASE = 1;
const BUDGETS = [2400, 4500, 9000];
const VARIANTS = ["base", "clean500", "structSec", "clean1200"];

const SAMPLE: string[] = JSON.parse(fs.readFileSync(path.join(HERE, "sample.json"), "utf8")).papers;
const perQ = fs.readFileSync(path.join(EVAL, "scenario1-top5-mrr-20261112/per-question.jsonl"), "utf8")
  .split("\n").filter(Boolean).map((l) => JSON.parse(l))
  .filter((r) => r.format === "pdf" && r.group === "answerable" && SAMPLE.includes(r.paperId));
const inv = new Map(fs.readFileSync(path.join(EVAL, "dev-set-preparation-20261103/inventory.jsonl"), "utf8")
  .split("\n").filter(Boolean).map((l) => JSON.parse(l)).map((c) => [c.caseId, c]));

// ---- label.py port (same as evaluate.mts) ----
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
    const o = r.original; const mine = new Set<number>();
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

// ---- search (same as evaluate.mts), returning full orderings ----
const dot = (a: number[], b: number[]) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const norm = (a: number[]) => Math.sqrt(dot(a, a));
function search(q: number[], qs: { indices: number[]; values: number[] }, docs: any[], idf: Map<number, number>) {
  const qn = norm(q);
  const dense = docs.map((d, i) => ({ i, s: dot(q, d.vec) / (qn * d.n) })).sort((a, b) => b.s - a.s);
  const sparse = docs.map((d, i) => { let s = 0; qs.indices.forEach((t, k) => { const v = d.sp.get(t); if (v) s += qs.values[k] * v * (idf.get(t) ?? 0); }); return { i, s }; })
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const fused = new Map<number, number>();
  const add = (list: { i: number }[], w: number) => list.slice(0, PREFETCH).forEach((x, r) => fused.set(x.i, (fused.get(x.i) ?? 0) + w / (RRF_K + r + RRF_BASE)));
  if (qs.indices.length) { add(dense, 2); add(sparse, 1); } else add(dense, 1);
  const hybrid = [...fused].sort((a, b) => b[1] - a[1]).map(([i]) => i);
  const seen = new Set(hybrid);
  for (const x of dense) if (!seen.has(x.i)) hybrid.push(x.i); // beyond the fused list: dense order
  return { dense: dense.map((x) => x.i), hybrid, top1: dense[0]?.s ?? 0 };
}

function fill(order: number[], lens: number[], budget: number, nbr: boolean): number[] {
  const sent = new Set<number>(); let total = 0;
  const seq = nbr ? order.flatMap((i) => [i, i - 1, i + 1]) : order;
  for (const i of seq) {
    if (i < 0 || i >= lens.length || sent.has(i)) continue;
    if (sent.size && total + lens[i] > budget) break;
    sent.add(i); total += lens[i];
  }
  return [...sent];
}

const data: Record<string, any> = {};
for (const p of SAMPLE) data[p] = JSON.parse(fs.readFileSync(path.join(CACHE, `${p}.json`), "utf8"));
const qCache: Record<string, number[]> = JSON.parse(fs.readFileSync(path.join(CACHE, "queries.json"), "utf8"));

const rows: any[] = [];
const summary: any = { settings: { PREFETCH, GATE, RRF_K, RRF_BASE, BUDGETS }, questions: perQ.length };
for (const v of VARIANTS) {
  const all = SAMPLE.flatMap((p) => data[p][v]);
  const avg = all.reduce((s: number, c: any) => s + tokenize(c.text).length, 0) / all.length;
  const df = new Map<number, number>();
  const docsByPaper: Record<string, any[]> = {};
  for (const p of SAMPLE) docsByPaper[p] = data[p][v].map((c: any) => {
    const sp = sparseVectorFor(c.embed, avg);
    sp.indices.forEach((t) => df.set(t, (df.get(t) ?? 0) + 1));
    return { vec: c.vec, n: norm(c.vec), sp: new Map(sp.indices.map((t, k) => [t, sp.values[k]])), text: c.text };
  });
  const idf = new Map([...df].map(([t, n]) => [t, Math.log(1 + (all.length - n + 0.5) / (n + 0.5))]));
  for (const r of perQ) {
    const docs = docsByPaper[r.paperId];
    const lens = docs.map((d) => d.text.length);
    const rel = labels(inv.get(r.caseId), docs.map((d) => d.text));
    const s = search(qCache[r.caseId], sparseVectorFor(expandAcronyms(r.question), avg), docs, idf);
    const row: any = { variant: v, caseId: r.caseId, gateOk: s.top1 >= GATE };
    for (const mode of ["hybrid", "dense"] as const) for (const B of BUDGETS) for (const nbr of [false, true]) {
      const sent = fill(s[mode], lens, B, nbr);
      const key = `${mode}_${B}_${nbr ? "nbr" : "more"}`;
      row[key] = sent.some((i) => rel.has(i));
      row[key + "_chars"] = sent.reduce((a, i) => a + lens[i], 0);
      row[key + "_n"] = sent.length;
    }
    rows.push(row);
  }
}
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const pct = (n: number) => +(100 * n / perQ.length).toFixed(1);
for (const v of VARIANTS) {
  const rs = rows.filter((r) => r.variant === v);
  summary[v] = {};
  for (const mode of ["hybrid", "dense"]) for (const B of BUDGETS) for (const how of ["more", "nbr"]) {
    const key = `${mode}_${B}_${how}`;
    summary[v][key] = { found: pct(rs.filter((r) => r[key]).length), foundGateOn: pct(rs.filter((r) => r[key] && r.gateOk).length),
      medianChars: med(rs.map((r) => r[key + "_chars"])), medianChunks: med(rs.map((r) => r[key + "_n"])) };
  }
}
// Paired fixed/broke vs today's app chunks (base, more) at each budget, hybrid.
summary.paired = {};
for (const B of BUDGETS) for (const v of VARIANTS) for (const how of ["more", "nbr"]) {
  if (v === "base" && how === "more") continue;
  let fixed = 0, broke = 0;
  for (const r of perQ) {
    const a = rows.find((x) => x.variant === "base" && x.caseId === r.caseId)[`hybrid_${B}_more`];
    const b = rows.find((x) => x.variant === v && x.caseId === r.caseId)[`hybrid_${B}_${how}`];
    if (b && !a) fixed++;
    if (a && !b) broke++;
  }
  summary.paired[`${B}_${v}_${how}`] = { fixed, broke };
}
fs.writeFileSync(path.join(HERE, "equal-budget-results.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
fs.writeFileSync(path.join(HERE, "equal-budget-summary.json"), JSON.stringify(summary, null, 1));
for (const mode of ["hybrid", "dense"]) {
  console.log(`\n${mode}: found % (gate on %) [median chars, median chunks]`);
  for (const v of VARIANTS) {
    const cells = BUDGETS.flatMap((B) => ["more", "nbr"].map((h) => { const x = summary[v][`${mode}_${B}_${h}`]; return `${B}${h === "nbr" ? "N" : "M"} ${x.found} (${x.foundGateOn}) [${x.medianChars},${x.medianChunks}]`; }));
    console.log(v.padEnd(10), cells.join(" | "));
  }
}
console.log("\npaired vs base-more (hybrid):", JSON.stringify(summary.paired));
