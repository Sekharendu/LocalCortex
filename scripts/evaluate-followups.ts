// Measures conversation-memory retrieval: does a follow-up question find the right
// chunk, and does an off-topic follow-up stay blocked? Compares four strategies at the
// production threshold:
//   alone     -- retrieve with the follow-up only (no memory)
//   combined  -- previous question + follow-up embedded together
//   +floor    -- combined, plus the follow-up must clear RETRIEVE_FOLLOWUP_FLOOR on its own
//   rewrite   -- production: follow-ups that refer back are rewritten into a standalone
//                question by llama3 (rewrite.ts); everything else, or a failed rewrite,
//                uses +floor
// Cases: two-turn follow-ups, three-turn "chains" where the subject is named only in
// turn 1 (scored on turn 3), and off-topic follow-ups (must get no context).
// Usage: npx tsx scripts/evaluate-followups.ts [--collection rag]
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retrieve, type RetrievedChunk } from "../src/retrieval/retriever.js";
import { rewriteFollowUp } from "../src/generation/rewrite.js";
import { retrievalConfig } from "../src/config.js";
import type { HistoryMessage } from "../src/generation/promptBuilder.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argValue(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

interface EvalSet {
  followups: { first: string; followup: string; expected: string }[];
  offtopic: { first: string; followup: string }[];
  chains?: { turns: string[]; expected: string }[];
}

interface Case {
  kind: "follow-up" | "chain" | "off-topic";
  earlier: string[]; // earlier user turns, oldest first
  question: string;
  expected?: string;
}

const STRATEGIES = ["alone", "combined", "+floor", "rewrite"] as const;
type Strategy = (typeof STRATEGIES)[number];

interface Run {
  chunks: RetrievedChunk[];
  rewritten?: string | null;
  ms?: number;
}

async function run(strategy: Strategy, c: Case, collection: string): Promise<Run> {
  const base = { collection, topK: 5 };
  const previous = c.earlier.at(-1)!;
  if (strategy === "alone") return { chunks: await retrieve(c.question, base) };
  if (strategy === "combined") return { chunks: await retrieve(c.question, { ...base, previousQuestion: previous, followupFloor: 0 }) };
  if (strategy === "+floor") return { chunks: await retrieve(c.question, { ...base, previousQuestion: previous }) };

  // Only user turns are available here (no generated answers), which is the harder case
  // for the rewriter: names must come from the questions themselves.
  const history: HistoryMessage[] = c.earlier.map((content) => ({ role: "user", content }));
  const t0 = Date.now();
  const rewritten = await rewriteFollowUp(history, c.question);
  const ms = Date.now() - t0;
  const chunks = rewritten
    ? await retrieve(rewritten, base)
    : await retrieve(c.question, { ...base, previousQuestion: previous });
  return { chunks, rewritten, ms };
}

async function main(): Promise<void> {
  const collection = argValue("--collection", retrievalConfig.collection);
  const set: EvalSet = JSON.parse(await fs.readFile(path.join(ROOT, "data/followup-eval-set.json"), "utf8"));
  const cases: Case[] = [
    ...set.followups.map((f) => ({ kind: "follow-up" as const, earlier: [f.first], question: f.followup, expected: f.expected })),
    ...(set.chains ?? []).map((ch) => ({
      kind: "chain" as const,
      earlier: ch.turns.slice(0, -1),
      question: ch.turns.at(-1)!,
      expected: ch.expected,
    })),
    ...set.offtopic.map((o) => ({ kind: "off-topic" as const, earlier: [o.first], question: o.followup })),
  ];
  console.log(
    `\nFollow-up evaluation  (collection ${collection}, mode ${retrievalConfig.mode}, threshold ${retrievalConfig.scoreThreshold}, floor ${retrievalConfig.followupFloor})`,
  );

  type Tally = { rank1: number; top5: number; refused: number; leaked: number };
  const tally = (): Record<Strategy, Tally> =>
    Object.fromEntries(STRATEGIES.map((s) => [s, { rank1: 0, top5: 0, refused: 0, leaked: 0 }])) as Record<Strategy, Tally>;
  const byKind = { "follow-up": tally(), chain: tally(), "off-topic": tally() };
  const rewriteTimes: number[] = [];
  const detail: string[] = [];

  for (const c of cases) {
    const cells: string[] = [];
    let rewriteNote = "";
    for (const s of STRATEGIES) {
      const r = await run(s, c, collection);
      const t = byKind[c.kind][s];
      if (s === "rewrite") {
        if (r.rewritten) {
          rewriteTimes.push(r.ms ?? 0);
          rewriteNote = `  => "${r.rewritten}" (${((r.ms ?? 0) / 1000).toFixed(1)}s)`;
        } else rewriteNote = "  => (not rewritten)";
      }
      if (c.kind === "off-topic") {
        if (r.chunks.length > 0) t.leaked++;
        cells.push(`${s}: ${r.chunks.length > 0 ? `LEAKED ${r.chunks[0].score.toFixed(3)}` : "blocked"}`);
        continue;
      }
      const rank = r.chunks.findIndex((ch) => ch.text.toLowerCase().includes(c.expected!.toLowerCase())) + 1;
      if (r.chunks.length === 0) t.refused++;
      if (rank === 1) t.rank1++;
      if (rank >= 1) t.top5++;
      cells.push(`${s}: ${r.chunks.length === 0 ? "REFUSED" : rank === 0 ? "miss" : `rank ${rank}`}`);
    }
    detail.push(`    [${c.kind}] ${c.question.padEnd(46)} ${cells.join(" | ")}${rewriteNote}`);
  }

  const count = (k: Case["kind"]) => cases.filter((c) => c.kind === k).length;
  const nf = count("follow-up");
  const nc = count("chain");
  const no = count("off-topic");
  console.log(`\n  strategy   follow-ups (${nf}): rank1  top5  refused | chains (${nc}): rank1  top5  refused | off-topic leaked/${no}`);
  for (const s of STRATEGIES) {
    const f = byKind["follow-up"][s];
    const ch = byKind.chain[s];
    const o = byKind["off-topic"][s];
    console.log(
      `  ${s.padEnd(9)}  ${String(f.rank1).padStart(21)} ${String(f.top5).padStart(5)} ${String(f.refused).padStart(8)} | ${String(ch.rank1).padStart(16)} ${String(ch.top5).padStart(5)} ${String(ch.refused).padStart(8)} | ${String(o.leaked).padStart(17)}`,
    );
  }
  if (rewriteTimes.length > 0) {
    const avg = rewriteTimes.reduce((a, b) => a + b, 0) / rewriteTimes.length;
    console.log(`\n  rewrites: ${rewriteTimes.length}/${cases.length} questions, avg ${(avg / 1000).toFixed(1)}s, max ${(Math.max(...rewriteTimes) / 1000).toFixed(1)}s`);
  }
  console.log(`\n  per question:`);
  for (const d of detail) console.log(d);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
