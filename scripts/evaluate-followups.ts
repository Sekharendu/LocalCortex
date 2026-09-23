// Measures conversation-memory retrieval: does a follow-up question find the right
// chunk, and does an off-topic follow-up stay blocked? Compares three strategies at the
// production threshold:
//   alone     -- retrieve with the follow-up only (no memory)
//   combined  -- previous question + follow-up embedded together
//   +floor    -- combined, plus the follow-up must clear RETRIEVE_FOLLOWUP_FLOOR on its own
//               (what production uses)
// Usage: npx tsx scripts/evaluate-followups.ts [--collection rag]
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retrieve, type RetrievedChunk } from "../src/retrieval/retriever.js";
import { retrievalConfig } from "../src/config.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argValue(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

interface EvalSet {
  followups: { first: string; followup: string; expected: string }[];
  offtopic: { first: string; followup: string }[];
}

const STRATEGIES = ["alone", "combined", "+floor"] as const;
type Strategy = (typeof STRATEGIES)[number];

async function run(strategy: Strategy, first: string, followup: string, collection: string): Promise<RetrievedChunk[]> {
  const base = { collection, topK: 5 };
  if (strategy === "alone") return retrieve(followup, base);
  if (strategy === "combined") return retrieve(followup, { ...base, previousQuestion: first, followupFloor: 0 });
  return retrieve(followup, { ...base, previousQuestion: first });
}

async function main(): Promise<void> {
  const collection = argValue("--collection", retrievalConfig.collection);
  const set: EvalSet = JSON.parse(await fs.readFile(path.join(ROOT, "data/followup-eval-set.json"), "utf8"));

  console.log(`\nFollow-up evaluation  (collection ${collection}, mode ${retrievalConfig.mode}, threshold ${retrievalConfig.scoreThreshold}, floor ${retrievalConfig.followupFloor})`);

  const results: Record<Strategy, { rank1: number; top5: number; refused: number; offtopicLeaked: number }> = {
    alone: { rank1: 0, top5: 0, refused: 0, offtopicLeaked: 0 },
    combined: { rank1: 0, top5: 0, refused: 0, offtopicLeaked: 0 },
    "+floor": { rank1: 0, top5: 0, refused: 0, offtopicLeaked: 0 },
  };
  const detail: { kind: string; followup: string; perStrategy: Record<string, string> }[] = [];

  for (const f of set.followups) {
    const row: Record<string, string> = {};
    for (const s of STRATEGIES) {
      const chunks = await run(s, f.first, f.followup, collection);
      const rank = chunks.findIndex((c) => c.text.toLowerCase().includes(f.expected.toLowerCase())) + 1;
      if (chunks.length === 0) results[s].refused++;
      if (rank === 1) results[s].rank1++;
      if (rank >= 1) results[s].top5++;
      row[s] = chunks.length === 0 ? "REFUSED" : rank === 0 ? "miss" : `rank ${rank}`;
    }
    detail.push({ kind: "follow-up", followup: f.followup, perStrategy: row });
  }

  for (const o of set.offtopic) {
    const row: Record<string, string> = {};
    for (const s of STRATEGIES) {
      const chunks = await run(s, o.first, o.followup, collection);
      if (chunks.length > 0) results[s].offtopicLeaked++;
      row[s] = chunks.length > 0 ? `LEAKED (${chunks[0].score.toFixed(3)})` : "blocked";
    }
    detail.push({ kind: "off-topic", followup: o.followup, perStrategy: row });
  }

  const n = set.followups.length;
  const m = set.offtopic.length;
  console.log(`\n  strategy    follow-ups: rank1/${n}  top5/${n}  refused/${n}   off-topic leaked/${m}`);
  for (const s of STRATEGIES) {
    const r = results[s];
    console.log(`  ${s.padEnd(10)}  ${String(r.rank1).padStart(19)}  ${String(r.top5).padStart(6)}  ${String(r.refused).padStart(9)}   ${String(r.offtopicLeaked).padStart(17)}`);
  }
  console.log(`\n  per question:`);
  for (const d of detail) {
    console.log(`    [${d.kind}] ${d.followup.padEnd(52)} ${STRATEGIES.map((s) => `${s}: ${d.perStrategy[s]}`).join(" | ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
