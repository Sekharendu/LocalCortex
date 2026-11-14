// Build chunk sets + nomic vectors for the structure-chunking experiment (dev PDFs only).
// Variants:
//   base       current app chunks (frozen dev snapshot); dense vectors read from the eval Qdrant
//   clean500   new loader text, app's recursive chunker at 500,  "Title › Section" header
//   clean1200  new loader text, app's recursive chunker at 1200, "Title › Section" header
//   struct     new loader, section -> paragraph chunks, title-only header (like today's PDFs)
//   structSec  same chunks as struct, "Title › Section" header
// Vectors are cached on X: (resumable); nothing is written to Qdrant.
// Run: npx tsx --env-file=.env eval/scenario1-structure-chunking-20261114/build.mts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadStructured, blocksToText } from "./structLoader.mjs";
import { loadDocument } from "../../src/ingest/loader.ts";
import { chunkText, contextHeader, documentTitle, headingsAt } from "../../src/ingest/chunker.ts";
import { embedBatch } from "../../src/retrieval/embedder.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVAL = path.join(HERE, "..");
const PDFS = "C:/Users/hp/.codex/visualizations/2026/10/26/01a179e5-1fc9-7972-8730-2b3c14ea0da5/qasper-full-2026-10-28/pdf-acquisition-1793191591781/pdfs/";
const CACHE = "X:/LocalCortex-chunk-test";
const QDRANT = "http://127.0.0.1:36333";
fs.mkdirSync(CACHE, { recursive: true });

const split = JSON.parse(fs.readFileSync(path.join(EVAL, "split.json"), "utf8"));
const perQ = fs.readFileSync(path.join(EVAL, "scenario1-top5-mrr-20261112/per-question.jsonl"), "utf8")
  .split("\n").filter(Boolean).map((l) => JSON.parse(l));
const papers = [...new Set(perQ.filter((r) => r.format === "pdf" && r.group === "answerable").map((r) => r.paperId))].sort();
for (const p of papers) if (!split.dev.includes(p) || split.test.includes(p)) throw new Error("non-dev paper " + p);
// Seeded shuffle (LCG), first 40.
let seed = 20261114;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const shuffled = [...papers];
for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
const SAMPLE = shuffled.slice(0, 40).sort();
fs.writeFileSync(path.join(HERE, "sample.json"), JSON.stringify({ note: "40 dev PDF papers with answerable questions, LCG seed 20261114", papers: SAMPLE }, null, 1));

const snapshot = new Map<string, { documentId: string; chunks: { chunkIndex: number; text: string }[] }>();
for (const l of fs.readFileSync(path.join(EVAL, "dev-set-preparation-20261103/source-chunks.jsonl"), "utf8").split("\n")) {
  if (!l) continue;
  const r = JSON.parse(l);
  if (!r.asset.startsWith("pdf/")) continue;
  const paper = r.asset.slice(4);
  if (SAMPLE.includes(paper)) snapshot.set(paper, { documentId: r.documentId, chunks: r.chunks });
}
const manifest = JSON.parse(fs.readFileSync(path.join(EVAL, "runs/seed42/production-manifest.json"), "utf8"));
const BASE_COLLECTION = manifest.collections.pdf;

type C = { text: string; embed: string };

// --- struct chunker: section -> paragraph; split >1500 at sentence ends, merge <200 forward.
const MAX = 1500, MIN = 200;
function splitLong(t: string): string[] {
  if (t.length <= MAX) return [t];
  const n = Math.ceil(t.length / MAX), target = t.length / n;
  const sents = t.match(/[^.!?]+(?:[.!?]+["”)\]]?|$)\s*/g) ?? [t];
  const out: string[] = []; let cur = "";
  for (const s of sents) {
    if (cur && cur.length + s.length > target * 1.15 && cur.length >= target * 0.6) { out.push(cur.trim()); cur = ""; }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.flatMap((p) => (p.length > MAX * 1.3 ? p.match(new RegExp(`[\\s\\S]{1,${MAX}}(\\s|$)`, "g"))!.map((x) => x.trim()) : [p]));
}
function structChunks(blocks: any[]): { text: string; section: string[] }[] {
  const out: { text: string; section: string[] }[] = [];
  let stack: string[] = [];
  let group: string[] = []; // paragraphs of the current section
  const flushGroup = () => {
    const merged: string[] = [];
    let carry = "";
    for (const p of group) {
      const t = carry ? carry + "\n" + p : p;
      if (t.length < MIN) { carry = t; continue; }
      merged.push(t); carry = "";
    }
    if (carry) { if (merged.length && merged[merged.length - 1].length + carry.length <= MAX) merged[merged.length - 1] += "\n" + carry; else merged.push(carry); }
    for (const m of merged) for (const piece of splitLong(m)) out.push({ text: piece, section: [...stack] });
    group = [];
  };
  for (const b of blocks) {
    if (b.type === "heading") {
      flushGroup();
      const lvl = Math.max(1, b.level ?? 1);
      stack = stack.slice(0, lvl - 1);
      while (stack.length < lvl - 1) stack.push("");
      stack.push(b.text);
    } else group.push(b.text);
  }
  flushGroup();
  return out;
}

async function variantsFor(paper: string): Promise<Record<string, C[]>> {
  // Pick the PDF copy the snapshot was made from: re-chunk each candidate with the app's
  // loader + chunker and keep the one whose chunks equal the frozen snapshot exactly.
  const snap = snapshot.get(paper)!;
  const ROOT = PDFS.replace(/pdf-acquisition-[^/]+\/pdfs\/$/, "");
  const candidates = [PDFS + paper + ".pdf"];
  for (const dir of ["pdf-identity-resolution-r3/pdfs/", "pdf-identity-resolution-r2/pdfs/", "pdf-identity-resolution-r1/pdfs/", "pdf-source-snapshot-r3/"]) {
    if (fs.existsSync(ROOT + dir)) for (const f of fs.readdirSync(ROOT + dir)) if (f.startsWith(paper) && f.endsWith(".pdf")) candidates.push(ROOT + dir + f);
  }
  let file = "", loaded: Awaited<ReturnType<typeof loadDocument>> | null = null;
  for (const cand of candidates) {
    if (!fs.existsSync(cand)) continue;
    const l = await loadDocument(cand);
    const appChunks: string[] = [];
    for (const d of l.documents) for (const c of await chunkText(d.pageContent, "recursive", { maxSize: 500, fixHeadingSplit: true })) appChunks.push(c.text);
    if (appChunks.length === snap.chunks.length && appChunks.every((t, i) => t === snap.chunks[i].text)) { file = cand; loaded = l; break; }
  }
  if (!loaded) throw new Error(`${paper}: no PDF copy reproduces the snapshot (tried ${candidates.length})`);

  const st = await loadStructured(file);
  const title = st.title || documentTitle(loaded.documents[0]?.pageContent ?? "", paper);
  const text = blocksToText(st.blocks);
  const rec = async (maxSize: number): Promise<C[]> => {
    const cs = await chunkText(text, "recursive", { maxSize, fixHeadingSplit: true });
    let from = 0;
    return cs.map((c) => {
      const at = text.indexOf(c.text, from);
      if (at >= 0) from = at + 1;
      const section = contextHeader(title, headingsAt(text, at >= 0 ? at : from));
      return { text: c.text, embed: `${section}\n\n${c.text}` };
    });
  };
  const sc = structChunks(st.blocks);
  return {
    clean500: await rec(500),
    clean1200: await rec(1200),
    struct: sc.map((c) => ({ text: c.text, embed: `${title}\n\n${c.text}` })),
    structSec: sc.map((c) => ({ text: c.text, embed: `${contextHeader(title, c.section)}\n\n${c.text}` })),
  };
}

async function qdrantDense(documentId: string): Promise<Map<number, { vec: number[]; section?: string }>> {
  const out = new Map();
  let offset: unknown = null;
  do {
    const body: any = { limit: 500, with_payload: ["chunkIndex", "section", "documentId"], with_vector: ["dense"], filter: { must: [{ key: "documentId", match: { value: documentId } }] } };
    if (offset !== null) body.offset = offset;
    const res = await (await fetch(`${QDRANT}/collections/${BASE_COLLECTION}/points/scroll`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
    for (const p of res.result.points) out.set(p.payload.chunkIndex, { vec: p.vector.dense, section: p.payload.section });
    offset = res.result.next_page_offset ?? null;
  } while (offset !== null);
  return out;
}

if (process.argv.includes("--dry")) {
  const med = (a: number[]) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const tot: Record<string, number[]> = {};
  for (const paper of SAMPLE) {
    const v = await variantsFor(paper);
    v.base = snapshot.get(paper)!.chunks.map((c) => ({ text: c.text, embed: c.text }));
    for (const [k, cs] of Object.entries(v)) (tot[k] ??= []).push(...cs.map((c) => c.text.length));
    if (paper === SAMPLE[0]) for (const c of v.structSec.slice(0, 8)) console.log("---", c.embed.slice(0, 300).replaceAll("\n", " / "));
  }
  for (const [k, a] of Object.entries(tot)) console.log(k.padEnd(10), "chunks", a.length, "median chars", med(a));
  process.exit(0);
}
const t0 = Date.now();
let embedded = 0;
for (const [i, paper] of SAMPLE.entries()) {
  const outFile = path.join(CACHE, `${paper}.json`);
  if (fs.existsSync(outFile)) continue;
  const snap = snapshot.get(paper)!;
  const v = await variantsFor(paper);
  const dense = await qdrantDense(snap.documentId);
  if (dense.size !== snap.chunks.length) throw new Error(`${paper}: ${dense.size} points vs ${snap.chunks.length}`);
  const result: Record<string, { text: string; embed: string; vec: number[] }[]> = {
    base: snap.chunks.map((c) => {
      const d = dense.get(c.chunkIndex)!;
      return { text: c.text, embed: d.section ? `${d.section}\n\n${c.text}` : c.text, vec: d.vec };
    }),
  };
  // struct and structSec share chunk text but not embedded text, so all four need embedding.
  for (const [name, cs] of Object.entries(v)) {
    const vecs = await embedBatch(cs.map((c) => c.embed), 16);
    embedded += cs.length;
    result[name] = cs.map((c, k) => ({ ...c, vec: vecs[k].map((x) => Math.round(x * 1e6) / 1e6) }));
  }
  fs.writeFileSync(outFile + ".tmp", JSON.stringify(result));
  fs.renameSync(outFile + ".tmp", outFile);
  const counts = Object.fromEntries(Object.entries(result).map(([k, c]) => [k, c.length]));
  console.log(JSON.stringify({ done: i + 1, of: SAMPLE.length, paper, counts, chunksPerSec: +(embedded / ((Date.now() - t0) / 1000)).toFixed(1) }));
}
console.log(JSON.stringify({ finished: true }));
