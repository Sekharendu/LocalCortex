// Standalone retrieval evaluation: measures Recall@{1,3,5}, Mean Reciprocal Rank, and
// avg rank/score of the correct hit -- overall and broken down by each eval entry's
// optional `category` field -- against a labeled eval set (data/eval-set.json), printed
// to the console and written to a per-question JSON breakdown.
//
// Usage:
//   npx tsx scripts/evaluate-retrieval.ts \
//     [--collection eval-run] \
//     [--eval-set data/eval-set.json] \
//     [--out data/eval-results-<ts>.json] \
//     [--threshold 0] \
//     [--mode dense|hybrid]
//
// --mode defaults to whatever retrieve() defaults to (retrievalConfig.mode, "hybrid"
// unless RETRIEVE_MODE=dense is set). Pass --mode dense explicitly to reproduce a
// pre-hybrid baseline for direct before/after comparison against a --mode hybrid run.
//
// Why scoreThreshold defaults to 0: this script measures RANKING quality (does the
// expected chunk live in the top-K, and at what rank?), not threshold-tuning. A
// production deployment also needs the threshold knob, but tuning it is a separate
// axis and conflating it here would mask ranking failures.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retrieve } from "../src/retrieval/retriever.js";
import { retrievalConfig, embedConfig } from "../src/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

interface EvalEntry {
  question: string;
  expectedSubstrings: string[];
  notes?: string;
  category?: string;
}

interface PerQuestionHit {
  rank: number;
  score: number;
  text: string;
  matchedSubstring: string | null;
}

interface PerQuestionResult {
  question: string;
  expectedSubstrings: string[];
  notes?: string;
  category: string;
  hits: PerQuestionHit[];
  hitAt1: boolean;
  hitAt3: boolean;
  hitAt5: boolean;
  rank: number;
  reciprocalRank: number;
  matchedScore: number | null;
}

interface GroupStats {
  entries: number;
  recallAt1: number;
  recallAt3: number;
  recallAt5: number;
  mrr: number;
  avgRankOfHit: number | null;
  avgScoreOfHit: number | null;
}

function computeGroupStats(group: PerQuestionResult[]): GroupStats {
  const count = group.length;
  const recallAt1 = group.filter((p) => p.hitAt1).length / count;
  const recallAt3 = group.filter((p) => p.hitAt3).length / count;
  const recallAt5 = group.filter((p) => p.hitAt5).length / count;
  const mrr = group.reduce((sum, p) => sum + p.reciprocalRank, 0) / count;
  const hits = group.filter((p) => p.rank > 0);
  const avgRankOfHit = hits.length > 0 ? hits.reduce((sum, p) => sum + p.rank, 0) / hits.length : null;
  const avgScoreOfHit =
    hits.length > 0 ? hits.reduce((sum, p) => sum + (p.matchedScore ?? 0), 0) / hits.length : null;
  return { entries: count, recallAt1, recallAt3, recallAt5, mrr, avgRankOfHit, avgScoreOfHit };
}

function groupByCategory(perQuestion: PerQuestionResult[]): Record<string, GroupStats> {
  const order: string[] = [];
  const groups = new Map<string, PerQuestionResult[]>();
  for (const p of perQuestion) {
    if (!groups.has(p.category)) {
      groups.set(p.category, []);
      order.push(p.category);
    }
    groups.get(p.category)!.push(p);
  }
  const result: Record<string, GroupStats> = {};
  for (const category of order) {
    result[category] = computeGroupStats(groups.get(category)!);
  }
  return result;
}

function fmtRate(value: number | null): string {
  return value === null ? "n/a" : value.toFixed(3);
}

function printStatsTable(title: string, rows: Array<{ label: string; stats: GroupStats }>): void {
  console.log(`  ${title}`);
  console.log(
    `  ${"category".padEnd(22)}${"N".padStart(4)}${"R@1".padStart(8)}${"R@3".padStart(8)}${"R@5".padStart(8)}${"MRR".padStart(8)}${"avgRank".padStart(10)}${"avgScore".padStart(10)}`
  );
  for (const { label, stats } of rows) {
    console.log(
      `  ${label.padEnd(22)}${String(stats.entries).padStart(4)}${fmtRate(stats.recallAt1).padStart(8)}${fmtRate(stats.recallAt3).padStart(8)}${fmtRate(stats.recallAt5).padStart(8)}${fmtRate(stats.mrr).padStart(8)}${fmtRate(stats.avgRankOfHit).padStart(10)}${fmtRate(stats.avgScoreOfHit).padStart(10)}`
    );
  }
}

function matchSubstring(text: string, expected: string): string | null {
  // case-insensitive substring match -- the point is content identification, not
  // capitalization fidelity (a chunk's casing can shift from upstream pipeline changes)
  if (text.toLowerCase().includes(expected.toLowerCase())) return expected;
  return null;
}

function firstMatch(hit: PerQuestionHit): boolean {
  return hit.matchedSubstring !== null;
}

async function loadEvalSet(filePath: string): Promise<EvalEntry[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`eval set must be an array; got ${typeof parsed}`);
  for (const [i, e] of parsed.entries()) {
    if (typeof e?.question !== "string" || !Array.isArray(e.expectedSubstrings) || e.expectedSubstrings.length === 0) {
      throw new Error(`eval set entry ${i} invalid: must have question (string) and non-empty expectedSubstrings[]`);
    }
  }
  return parsed as EvalEntry[];
}

async function probeStack(): Promise<boolean> {
  try {
    const oRes = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(2000) });
    const qRes = await fetch("http://localhost:6333/readyz", { signal: AbortSignal.timeout(2000) });
    return oRes.ok && qRes.ok;
  } catch {
    return false;
  }
}

function argValue(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

async function main(): Promise<void> {
  const evalSetPath = path.resolve(ROOT, argValue("--eval-set", "data/eval-set.json"));
  const collection = argValue("--collection", process.env.QDRANT_COLLECTION ?? "rag");
  const threshold = Number(argValue("--threshold", "0"));
  const modeArg = argValue("--mode", "");
  if (modeArg !== "" && modeArg !== "dense" && modeArg !== "hybrid") {
    console.error(`--mode must be "dense" or "hybrid", got: ${modeArg}`);
    process.exit(1);
  }
  const mode = modeArg as "dense" | "hybrid" | "";
  const maxK = 5;
  const outArg = argValue("--out", "");
  const outPath = outArg
    ? path.resolve(ROOT, outArg)
    : path.resolve(ROOT, "data", `eval-results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);

  const stackUp = await probeStack();
  if (!stackUp) {
    console.error("Ollama or Qdrant not reachable. Bring up the stack with `docker compose up -d` and `ollama pull nomic-embed-text`.");
    process.exit(1);
  }

  const evalSet = await loadEvalSet(evalSetPath);
  const perQuestion: PerQuestionResult[] = [];

  console.log(`\nRetrieval Evaluation`);
  console.log(`====================`);
  console.log(`  collection: ${collection}`);
  console.log(`  eval set:   ${path.relative(ROOT, evalSetPath)} (${evalSet.length} entries)`);
  console.log(`  threshold:  ${threshold}`);
  console.log(`  topK:       ${maxK}`);
  console.log(`  mode:       ${mode || "(retriever default)"}`);
  console.log(`  fusion:     ${retrievalConfig.fusion} (hybrid only; set RETRIEVE_FUSION=dbsf to switch)`);
  console.log(`  prefixes:   ${embedConfig.taskPrefixes ? "on" : "off"} (set OLLAMA_EMBED_PREFIXES=0 to disable)`);
  console.log();

  for (let i = 0; i < evalSet.length; i++) {
    const entry = evalSet[i];
    process.stdout.write(`  [${String(i + 1).padStart(2, "0")}/${evalSet.length}] ${entry.question} `);
    const retrieved = await retrieve(entry.question, {
      topK: maxK,
      scoreThreshold: threshold,
      collection,
      ...(mode ? { mode } : {}),
    });

    const hits: PerQuestionHit[] = retrieved.map((r, idx) => {
      const matchedSubstring = entry.expectedSubstrings.find((s) => matchSubstring(r.text, s)) ?? null;
      return { rank: idx + 1, score: r.score, text: r.text, matchedSubstring };
    });

    const firstMatchIdx = hits.findIndex(firstMatch);
    const rank = firstMatchIdx === -1 ? 0 : hits[firstMatchIdx]?.rank ?? 0;
    const matchedScore = firstMatchIdx === -1 ? null : hits[firstMatchIdx]?.score ?? null;
    const reciprocalRank = rank > 0 ? 1 / rank : 0;
    const hitAt1 = rank >= 1 && rank <= 1;
    const hitAt3 = rank >= 1 && rank <= 3;
    const hitAt5 = rank >= 1 && rank <= 5;

    process.stdout.write(`-> hit@rank=${rank || "MISS"} (RR=${reciprocalRank.toFixed(3)})\n`);

    perQuestion.push({
      question: entry.question,
      expectedSubstrings: entry.expectedSubstrings,
      notes: entry.notes,
      category: entry.category ?? "uncategorized",
      hits,
      hitAt1,
      hitAt3,
      hitAt5,
      rank,
      reciprocalRank,
      matchedScore,
    });
  }

  const overall = computeGroupStats(perQuestion);
  const byCategory = groupByCategory(perQuestion);
  const failures = perQuestion.filter((p) => p.reciprocalRank === 0);

  console.log();
  printStatsTable("Aggregate", [{ label: "all", stats: overall }]);
  console.log();
  printStatsTable(
    "By category",
    Object.entries(byCategory).map(([category, stats]) => ({ label: category, stats }))
  );

  if (failures.length > 0) {
    console.log();
    console.log(`  Per-question failures (RR = 0):`);
    for (const p of failures) {
      console.log(`    "${p.question}"  expected ${JSON.stringify(p.expectedSubstrings)}`);
    }
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const payload = {
    runAt: new Date().toISOString(),
    collection,
    evalSetPath: path.relative(ROOT, evalSetPath),
    threshold,
    topK: maxK,
    mode: mode || "default",
    fusion: retrievalConfig.fusion,
    embedPrefixes: embedConfig.taskPrefixes,
    aggregate: {
      ...overall,
      byCategory,
    },
    notes:
      "MRR 1.0 = perfect (right chunk always ranked first). >=0.7 good for a well-chunked corpus. " +
      "0.3-0.6 right but not first; <0.3 retriever frequently missing or burying the right chunk. " +
      "A wide gap between Recall@1 and Recall@5 means ranking is mediocre but retrieval is happening -- " +
      "suspect prompt/embedding model quality. A low Recall@5 means the right chunk isn't in top-5: " +
      "start by re-tuning the chunking strategy and size, NOT the embedding model -- most retrieval failures " +
      "are chunking failures in disguise (key sentence split across chunks, chunk mixing topics, " +
      "too-small chunks lacking context). Embedding model swap is the expensive knob; tune chunking first. " +
      "avgRankOfHit/avgScoreOfHit (overall and per-category) can move even when Recall@5 is already 100%, " +
      "which is often the only visible signal when comparing two retrieval methods on an easy corpus. " +
      "byCategory isolates known dense-vs-sparse failure modes (exact-keyword, ambiguous-short, " +
      "paraphrase-no-overlap, abbreviation, distractor) so a technique change that only helps one failure " +
      "mode doesn't get diluted into a flat aggregate number.",
    perQuestion,
  };
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log();
  console.log(`  file written: ${path.relative(ROOT, outPath)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});