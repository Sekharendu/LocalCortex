import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { tokenize } from "./sparse.js";

const SPARSE_STATS_PATH = process.env.SPARSE_STATS_PATH ?? "./data/sparse-stats.json";
const DEFAULT_AVG_DOC_LENGTH = 50;

interface SparseStats {
  totalChunks: number;
  totalTokens: number;
}

/**
 * Tiny persisted corpus stat -- just enough for BM25's document-length normalization
 * term (sparse.ts needs a corpus-wide average chunk length in tokens). Mirrors
 * documentStore.ts's atomic-write + write-chain-serialization pattern for the same
 * reason: a batch ingest must not interleave two read-modify-write cycles.
 *
 * Known limitation: NOT decremented on document delete, so avgDocLength can drift over
 * time as documents are removed. Accepted approximation for v1 (same tradeoff already
 * made for the "no payload keyword index" note in vectorStore.ts) -- a full recompute
 * (re-tokenize every chunk still in the document store) is a cheap follow-up if drift
 * ever matters in practice.
 */

let writeChain: Promise<unknown> = Promise.resolve();

async function readStats(): Promise<SparseStats> {
  if (!existsSync(SPARSE_STATS_PATH)) return { totalChunks: 0, totalTokens: 0 };
  try {
    const raw = await fs.readFile(SPARSE_STATS_PATH, "utf8");
    if (raw.trim().length === 0) return { totalChunks: 0, totalTokens: 0 };
    const parsed = JSON.parse(raw) as Partial<SparseStats>;
    return {
      totalChunks: typeof parsed.totalChunks === "number" ? parsed.totalChunks : 0,
      totalTokens: typeof parsed.totalTokens === "number" ? parsed.totalTokens : 0,
    };
  } catch (e) {
    throw new Error(
      `sparseStats: failed to read ${SPARSE_STATS_PATH}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

async function writeStatsAtomic(stats: SparseStats): Promise<void> {
  await fs.mkdir(path.dirname(SPARSE_STATS_PATH), { recursive: true });
  const tmp = `${SPARSE_STATS_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(stats, null, 2), "utf8");
  await fs.rename(tmp, SPARSE_STATS_PATH);
}

function serialize<T>(work: () => Promise<T>): Promise<T> {
  const run = writeChain.then(work, work);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Average chunk length in tokens, for sparse.ts's BM25 length-normalization term. Falls
 * back to a fixed default before anything has been ingested, so the very first ingest
 * doesn't divide by zero.
 */
export async function getAvgDocLength(): Promise<number> {
  const stats = await readStats();
  if (stats.totalChunks === 0) return DEFAULT_AVG_DOC_LENGTH;
  return stats.totalTokens / stats.totalChunks;
}

/** Record newly-ingested chunks' token counts into the running corpus stats. */
export async function recordChunks(chunkTexts: string[]): Promise<void> {
  if (chunkTexts.length === 0) return;
  const tokenCounts = chunkTexts.map((t) => tokenize(t).length);
  return serialize(async () => {
    const stats = await readStats();
    stats.totalChunks += tokenCounts.length;
    stats.totalTokens += tokenCounts.reduce((sum, n) => sum + n, 0);
    await writeStatsAtomic(stats);
  });
}
