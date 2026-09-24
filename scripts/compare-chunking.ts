// Compares chunking variants on the same corpora and eval sets. Each (variant, corpus)
// pair is ingested into its own throwaway collection "cmp-<variant>-<corpus>", measured,
// then deleted (--keep leaves them). The document store and BM25 stats point at temp
// files, so data/documents.json and data/sparse-stats.json are never touched.
//
// Variants: baseline (recursive, 500, no fix, no headers -- pinned explicitly so it stays
// reproducible even though the pipeline's own defaults have since moved on); fix
// (heading-split bug fix, see chunker.ts attachLoneHeadings); 1+fix (#1 contextual
// "Title › Section" headers, forced on for every document); auto (the current pipeline
// default: fix always on, #1 header added only when hasHeadingStructure() finds fewer
// than 2 markdown headings -- see src/config.ts ingestConfig.contextHeaders); semantic /
// semantic+auto (chunkSemantic's embedding-based sentence splitter, with and without the
// auto header on top -- makes real Ollama embedding calls, unlike every other variant
// here, so it's slower). The earlier #2 (heading detection), #3 (800-char chunks + small-
// leftover merge) and Contextual Retrieval (LLM blurb per chunk) variants were measured
// (SESSION-LOG §23-§24), not adopted, and their code was removed.
// Metrics: R@1 / R@5 / MRR with no threshold (ranking); "prod@5": the production
// retrieve() (threshold 0.63 + same-document expansion) put the right chunk in the
// model's context; "refused": production returned nothing; "ingestSec": wall time to
// ingest; "avgPromptChars":
// mean total chunk-text length the production retrieve() hands the model per question
// (proxy for llama3 prompt/latency cost).
//
// Usage: npx tsx scripts/compare-chunking.ts [--variants baseline,auto] [--corpora profile-pdf] [--keep]
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cmp-chunking-"));
process.env.DOC_STORE_PATH = path.join(tmp, "documents.json");
process.env.SPARSE_STATS_PATH = path.join(tmp, "sparse-stats.json");

const { ingestDocument } = await import("../src/ingest/pipeline.js");
const { retrieve } = await import("../src/retrieval/retriever.js");
const { retrievalConfig } = await import("../src/config.js");
const { QdrantClient } = await import("@qdrant/js-client-rest");
const qdrant = new QdrantClient({ url: process.env.QDRANT_URL ?? "http://localhost:6333", checkCompatibility: false });

const VARIANTS = {
  // Pinned explicitly (contextHeaders: false, fixHeadingSplit: false) rather than left
  // as {} -- the pipeline's own defaults are now fix-on / contextHeaders-auto, so {}
  // would silently drift to mean "auto" instead of the old pre-fix, pre-headers baseline.
  baseline: { contextHeaders: false, fixHeadingSplit: false },
  fix: { contextHeaders: false, fixHeadingSplit: true },
  "1+fix": { contextHeaders: true, fixHeadingSplit: true },
  // The current pipeline default: no explicit contextHeaders (so ingestConfig's "auto"
  // decides per document) and no explicit fixHeadingSplit (so it defaults to true).
  auto: {},
  semantic: { strategy: "semantic", contextHeaders: false },
  "semantic+auto": { strategy: "semantic" },
} as const;
type Variant = keyof typeof VARIANTS;

const CORPORA: Record<string, { files: string[]; evalSet: string }> = {
  handbook: { files: ["data/eval-corpus.txt"], evalSet: "data/eval-set.json" },
  "handbook-docx": { files: ["data/eval-corpus.docx"], evalSet: "data/eval-set.json" },
  large: {
    files: ["employee-handbook", "engineering-practices", "it-security-policy", "legal-compliance-manual"].map(
      (f) => `data/large-corpus/${f}.txt`,
    ),
    evalSet: "data/large-eval-set.json",
  },
  "profile-txt": { files: ["data/eval-profile.txt"], evalSet: "data/profile-eval-set.json" },
  "profile-pdf": { files: ["data/eval-profile.pdf"], evalSet: "data/profile-eval-set.json" },
};

interface EvalEntry {
  question: string;
  expectedSubstrings: string[];
}

function argList(name: string, all: string[]): string[] {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1].split(",") : all;
}

const rankOf = (texts: string[], expected: string[]) =>
  texts.findIndex((t) => expected.some((e) => t.toLowerCase().includes(e.toLowerCase()))) + 1;

async function dropCollection(name: string): Promise<void> {
  if ((await qdrant.collectionExists(name)).exists) await qdrant.deleteCollection(name);
}

async function main(): Promise<void> {
  const variants = argList("--variants", Object.keys(VARIANTS)) as Variant[];
  const corpora = argList("--corpora", Object.keys(CORPORA));
  const keep = process.argv.includes("--keep");
  const modeIdx = process.argv.indexOf("--mode");
  const mode = (modeIdx >= 0 ? process.argv[modeIdx + 1] : "dense") as "dense" | "hybrid";
  const rows: Record<string, unknown>[] = [];

  for (const corpus of corpora) {
    const { files, evalSet } = CORPORA[corpus];
    const entries: EvalEntry[] = JSON.parse(await fs.readFile(path.join(ROOT, evalSet), "utf8"));
    for (const variant of variants) {
      const collection = `cmp-${variant}-${corpus}`;
      await dropCollection(collection);
      process.stdout.write(`${corpus.padEnd(14)} ${variant.padEnd(15)} ingest... `);
      const ingestStart = Date.now();
      for (const f of files) {
        const r = await ingestDocument(path.join(ROOT, f), {
          collection,
          strategy: "recursive",
          originalName: path.basename(f),
          ...VARIANTS[variant],
        });
        if (!r.success) throw new Error(`${f}: ingest failed at ${r.stage}: ${r.error}`);
      }
      const ingestSec = Math.round((Date.now() - ingestStart) / 1000);
      const points = (await qdrant.scroll(collection, { limit: 1000, with_payload: true, with_vector: false })).points;
      const chunks = points
        .map((p) => p.payload as { text: string; section?: string; source: string; chunkIndex: number })
        .sort((a, b) => a.source.localeCompare(b.source) || a.chunkIndex - b.chunkIndex);
      process.stdout.write(`${chunks.length} chunks in ${ingestSec}s, evaluating... `);

      const perQuestion = [];
      for (const e of entries) {
        const ranked = await retrieve(e.question, { collection, topK: 5, scoreThreshold: 0, mode });
        const prod = await retrieve(e.question, { collection, topK: retrievalConfig.topK, mode });
        const rank = rankOf(ranked.map((c) => c.text), e.expectedSubstrings);
        perQuestion.push({
          question: e.question,
          rank,
          score: rank > 0 ? Number(ranked[rank - 1].score.toFixed(3)) : null,
          topScore: Number((ranked[0]?.score ?? 0).toFixed(3)),
          inContext: rankOf(prod.map((c) => c.text), e.expectedSubstrings) > 0,
          refused: prod.length === 0,
          promptChars: prod.reduce((s, c) => s + c.text.length, 0),
        });
      }
      const n = perQuestion.length;
      const row = {
        corpus,
        variant,
        chunks: chunks.length,
        avgLen: Math.round(chunks.reduce((s, c) => s + c.text.length, 0) / chunks.length),
        ingestSec,
        r1: perQuestion.filter((q) => q.rank === 1).length,
        r5: perQuestion.filter((q) => q.rank > 0).length,
        mrr: Number((perQuestion.reduce((s, q) => s + (q.rank > 0 ? 1 / q.rank : 0), 0) / n).toFixed(3)),
        prod5: perQuestion.filter((q) => q.inContext).length,
        refused: perQuestion.filter((q) => q.refused).length,
        avgPromptChars: Math.round(perQuestion.reduce((s, q) => s + q.promptChars, 0) / n),
        n,
        perQuestion,
        chunkTexts: corpus.startsWith("profile")
          ? chunks.map((c) => ({ section: c.section, text: c.text }))
          : undefined,
      };
      rows.push(row);
      console.log(
        `R@1 ${row.r1}/${n}  R@5 ${row.r5}/${n}  MRR ${row.mrr}  prod@5 ${row.prod5}/${n}  refused ${row.refused}  avgPromptChars ${row.avgPromptChars}`,
      );
      if (!keep) await dropCollection(collection);
    }
  }

  console.log(
    `\n${"corpus".padEnd(14)} ${"variant".padEnd(15)} chunks avgLen ingestSec   R@1    R@5    MRR  prod@5 refused avgPromptChars`,
  );
  for (const r of rows as { [k: string]: number | string }[]) {
    const frac = (k: string) => `${r[k]}/${r.n}`.padStart(6);
    console.log(
      `${String(r.corpus).padEnd(14)} ${String(r.variant).padEnd(15)} ${String(r.chunks).padStart(6)} ${String(r.avgLen).padStart(6)} ${String(r.ingestSec).padStart(9)} ${frac("r1")} ${frac("r5")} ${String(r.mrr).padStart(6)} ${frac("prod5")} ${String(r.refused).padStart(7)} ${String(r.avgPromptChars).padStart(14)}`,
    );
  }
  const out = path.join(ROOT, "data", `chunking-compare-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await fs.writeFile(out, JSON.stringify({ runAt: new Date().toISOString(), threshold: retrievalConfig.scoreThreshold, rows }, null, 2));
  console.log(`\nwritten: ${path.relative(ROOT, out)}`);
  await fs.rm(tmp, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
