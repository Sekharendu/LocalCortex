// Standalone retrieval evaluation: measures Recall@{1,3,5} and Mean Reciprocal Rank
// against a labeled eval set (data/eval-set.json) and writes a per-question breakdown.
//
// Usage:
//   npx tsx scripts/evaluate-retrieval.ts \
//     [--collection eval-run] \
//     [--eval-set data/eval-set.json] \
//     [--out data/eval-results-<ts>.json] \
//     [--threshold 0]
//
// Why scoreThreshold defaults to 0: this script measures RANKING quality (does the
// expected chunk live in the top-K, and at what rank?), not threshold-tuning. A
// production deployment also needs the threshold knob, but tuning it is a separate
// axis and conflating it here would mask ranking failures.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retrieve } from "../src/retrieval/retriever.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

interface EvalEntry {
  question: string;
  expectedSubstrings: string[];
  notes?: string;
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
  hits: PerQuestionHit[];
  hitAt1: boolean;
  hitAt3: boolean;
  hitAt5: boolean;
  reciprocalRank: number;
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
  console.log();

  for (let i = 0; i < evalSet.length; i++) {
    const entry = evalSet[i];
    process.stdout.write(`  [${String(i + 1).padStart(2, "0")}/${evalSet.length}] ${entry.question} `);
    const retrieved = await retrieve(entry.question, {
      topK: maxK,
      scoreThreshold: threshold,
      collection,
    });

    const hits: PerQuestionHit[] = retrieved.map((r, idx) => {
      const matchedSubstring = entry.expectedSubstrings.find((s) => matchSubstring(r.text, s)) ?? null;
      return { rank: idx + 1, score: r.score, text: r.text, matchedSubstring };
    });

    const firstMatchIdx = hits.findIndex(firstMatch);
    const rank = firstMatchIdx === -1 ? 0 : hits[firstMatchIdx]?.rank ?? 0;
    const reciprocalRank = rank > 0 ? 1 / rank : 0;
    const hitAt1 = rank >= 1 && rank <= 1;
    const hitAt3 = rank >= 1 && rank <= 3;
    const hitAt5 = rank >= 1 && rank <= 5;

    process.stdout.write(`-> hit@rank=${rank || "MISS"} (RR=${reciprocalRank.toFixed(3)})\n`);

    perQuestion.push({
      question: entry.question,
      expectedSubstrings: entry.expectedSubstrings,
      notes: entry.notes,
      hits,
      hitAt1,
      hitAt3,
      hitAt5,
      reciprocalRank,
    });
  }

  const count = perQuestion.length;
  const recallAt1 = perQuestion.filter((p) => p.hitAt1).length / count;
  const recallAt3 = perQuestion.filter((p) => p.hitAt3).length / count;
  const recallAt5 = perQuestion.filter((p) => p.hitAt5).length / count;
  const mrr = perQuestion.reduce((sum, p) => sum + p.reciprocalRank, 0) / count;
  const failures = perQuestion.filter((p) => p.reciprocalRank === 0);

  console.log();
  console.log(`  Metric      Value`);
  console.log(`  --------    ------`);
  console.log(`  Recall@1    ${recallAt1.toFixed(3)}  (${perQuestion.filter((p) => p.hitAt1).length}/${count})`);
  console.log(`  Recall@3    ${recallAt3.toFixed(3)}  (${perQuestion.filter((p) => p.hitAt3).length}/${count})`);
  console.log(`  Recall@5    ${recallAt5.toFixed(3)}  (${perQuestion.filter((p) => p.hitAt5).length}/${count})`);
  console.log(`  MRR         ${mrr.toFixed(3)}`);

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
    aggregate: {
      entries: count,
      recallAt1,
      recallAt3,
      recallAt5,
      mrr,
    },
    notes:
      "MRR 1.0 = perfect (right chunk always ranked first). >=0.7 good for a well-chunked corpus. " +
      "0.3-0.6 right but not first; <0.3 retriever frequently missing or burying the right chunk. " +
      "A wide gap between Recall@1 and Recall@5 means ranking is mediocre but retrieval is happening -- " +
      "suspect prompt/embedding model quality. A low Recall@5 means the right chunk isn't in top-5: " +
      "start by re-tuning the chunking strategy and size, NOT the embedding model -- most retrieval failures " +
      "are chunking failures in disguise (key sentence split across chunks, chunk mixing topics, " +
      "too-small chunks lacking context). Embedding model swap is the expensive knob; tune chunking first.",
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