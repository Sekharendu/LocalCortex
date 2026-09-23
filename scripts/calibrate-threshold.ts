// Measures where the retrieval relevance threshold (RETRIEVE_SCORE_THRESHOLD) should sit.
// The threshold decides whether a question gets any context at all: in hybrid mode a
// dense probe returns nothing if the top chunk scores below it. evaluate-retrieval.ts
// runs at threshold 0 (ranking only), so this is the only place both sides are measured:
//   - answerable questions (data/eval-set.json on `rag`, data/large-eval-set.json on
//     `rag-large`): a top score below the threshold means a real question gets refused
//   - off-topic questions (data/offtopic-set.json, against both collections): a top
//     score at or above the threshold means an unanswerable question gets context
//
// Usage:
//   npx tsx scripts/calibrate-threshold.ts [--out data/threshold-calibration-<ts>.json]
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retrieve } from "../src/retrieval/retriever.js";
import { retrievalConfig, embedConfig } from "../src/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SAFETY_MARGIN = 0.02;

function argValue(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

interface AnswerableResult {
  corpus: string;
  question: string;
  category: string;
  top1: number;
  /** Score of the first top-5 chunk containing an expected substring; null if none. */
  correct: number | null;
}

interface OfftopicResult {
  collection: string;
  question: string;
  group: "unrelated" | "near-miss";
  top1: number;
  topText: string;
}

// Same code path as the hybrid probe: acronym expansion + (prefixed) embedding + dense
// search. scoreThreshold 0 so every score comes back unfiltered.
async function denseTop(question: string, collection: string) {
  return retrieve(question, { mode: "dense", scoreThreshold: 0, topK: 5, collection });
}

async function main(): Promise<void> {
  const outPath = path.resolve(
    ROOT,
    argValue("--out", `data/threshold-calibration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`),
  );
  const read = async (p: string) => JSON.parse(await fs.readFile(path.resolve(ROOT, p), "utf8"));

  const answerableSets = [
    { corpus: "small", collection: "rag", entries: await read("data/eval-set.json") },
    { corpus: "large", collection: "rag-large", entries: await read("data/large-eval-set.json") },
  ];
  const offtopic: { question: string; group: "unrelated" | "near-miss" }[] = await read("data/offtopic-set.json");

  console.log(`\nThreshold calibration (current default ${retrievalConfig.scoreThreshold}, prefixes ${embedConfig.taskPrefixes ? "on" : "off"})`);

  const answerable: AnswerableResult[] = [];
  for (const set of answerableSets) {
    for (const e of set.entries as { question: string; expectedSubstrings: string[]; category?: string }[]) {
      const chunks = await denseTop(e.question, set.collection);
      const hit = chunks.find((c) =>
        e.expectedSubstrings.some((s) => c.text.toLowerCase().includes(s.toLowerCase())),
      );
      answerable.push({
        corpus: set.corpus,
        question: e.question,
        category: e.category ?? "uncategorized",
        top1: chunks[0]?.score ?? 0,
        correct: hit ? hit.score : null,
      });
    }
  }

  const offtopicResults: OfftopicResult[] = [];
  for (const collection of ["rag", "rag-large"]) {
    for (const q of offtopic) {
      const chunks = await denseTop(q.question, collection);
      offtopicResults.push({
        collection,
        question: q.question,
        group: q.group,
        top1: chunks[0]?.score ?? 0,
        topText: (chunks[0]?.text ?? "").replace(/\s+/g, " ").slice(0, 80),
      });
    }
  }

  // Distributions
  const range = (xs: number[]) => `min ${Math.min(...xs).toFixed(3)}  max ${Math.max(...xs).toFixed(3)}`;
  console.log(`\n  Top-1 score distributions`);
  for (const corpus of ["small", "large"]) {
    console.log(`    answerable (${corpus})`.padEnd(34) + range(answerable.filter((a) => a.corpus === corpus).map((a) => a.top1)));
  }
  for (const group of ["unrelated", "near-miss"] as const) {
    for (const collection of ["rag", "rag-large"]) {
      const xs = offtopicResults.filter((o) => o.group === group && o.collection === collection).map((o) => o.top1);
      console.log(`    off-topic ${group} (${collection})`.padEnd(34) + range(xs));
    }
  }

  // Sweep
  type Row = { t: number; refusedSmall: number; refusedLarge: number; droppedSmall: number; droppedLarge: number; leakedUnrelated: number; leakedNearMiss: number };
  const rows: Row[] = [];
  for (let i = 50; i <= 80; i++) {
    const t = i / 100;
    const count = <T,>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length;
    rows.push({
      t,
      refusedSmall: count(answerable, (a) => a.corpus === "small" && a.top1 < t),
      refusedLarge: count(answerable, (a) => a.corpus === "large" && a.top1 < t),
      droppedSmall: count(answerable, (a) => a.corpus === "small" && (a.correct === null || a.correct < t)),
      droppedLarge: count(answerable, (a) => a.corpus === "large" && (a.correct === null || a.correct < t)),
      leakedUnrelated: count(offtopicResults, (o) => o.group === "unrelated" && o.top1 >= t),
      leakedNearMiss: count(offtopicResults, (o) => o.group === "near-miss" && o.top1 >= t),
    });
  }
  const nSmall = answerable.filter((a) => a.corpus === "small").length;
  const nLarge = answerable.length - nSmall;
  const nUnrel = offtopicResults.filter((o) => o.group === "unrelated").length;
  const nNear = offtopicResults.length - nUnrel;
  console.log(`\n  Sweep (refused = answerable question gets no context; dropped = correct chunk filtered out;`);
  console.log(`         leaked = off-topic question gets context, counted across both collections)`);
  console.log(`    thresh  refused S/${nSmall} L/${nLarge}  dropped S/L  leaked unrelated/${nUnrel} near-miss/${nNear}`);
  for (const r of rows) {
    console.log(
      `    ${r.t.toFixed(2)}    ${String(r.refusedSmall).padStart(7)} ${String(r.refusedLarge).padStart(5)}   ${String(r.droppedSmall).padStart(5)} ${String(r.droppedLarge).padStart(4)}   ${String(r.leakedUnrelated).padStart(9)} ${String(r.leakedNearMiss).padStart(10)}`,
    );
  }

  // The usable range blocks every unrelated question (with a margin) and refuses no
  // answerable one. Near-miss leakage falls as the threshold rises, so the top of the
  // range leaks least -- but sits closest to the answerable minimum, which is a sample
  // statistic that unseen real questions can fall below. Report both ends; a human picks.
  const maxUnrelated = Math.max(...offtopicResults.filter((o) => o.group === "unrelated").map((o) => o.top1));
  const minAnswerable = Math.min(...answerable.map((a) => a.top1));
  const suggested = Math.ceil((maxUnrelated + SAFETY_MARGIN) * 100) / 100;
  const rangeTop = Math.floor(minAnswerable * 100 - 1e-9) / 100;
  const at = (t: number) => rows.find((r) => Math.abs(r.t - t) < 1e-9);
  const describe = (t: number) => {
    const r = at(t);
    return r ? `refuses ${r.refusedSmall}/${nSmall} small + ${r.refusedLarge}/${nLarge} large answerable, leaks ${r.leakedNearMiss}/${nNear} near-miss` : "outside sweep";
  };
  console.log(`\n  Highest unrelated off-topic top-1: ${maxUnrelated.toFixed(3)}  |  lowest answerable top-1: ${minAnswerable.toFixed(3)}`);
  if (suggested <= rangeTop) {
    console.log(`  Clean gap. Usable range ${suggested.toFixed(2)}-${rangeTop.toFixed(2)} (blocks all unrelated with a ${SAFETY_MARGIN} margin, refuses no answerable):`);
    console.log(`    ${suggested.toFixed(2)} (bottom, most headroom for unseen answerable questions): ${describe(suggested)}`);
    console.log(`    ${rangeTop.toFixed(2)} (top, least near-miss leakage, ${(minAnswerable - rangeTop).toFixed(3)} from the answerable minimum): ${describe(rangeTop)}`);
  } else {
    console.log(`  No clean gap: blocking every unrelated question at ${suggested.toFixed(2)} ${describe(suggested)}.`);
  }

  const leakedNearMissAtSuggested = offtopicResults
    .filter((o) => o.group === "near-miss" && o.top1 >= suggested)
    .sort((a, b) => b.top1 - a.top1);
  if (leakedNearMissAtSuggested.length > 0) {
    console.log(`\n  Near-miss questions that would get context at ${suggested.toFixed(2)} (the prompt's "context is insufficient" rule must catch these):`);
    for (const o of leakedNearMissAtSuggested) {
      console.log(`    ${o.top1.toFixed(3)} (${o.collection}) ${o.question}  ->  "${o.topText}..."`);
    }
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(
    outPath,
    JSON.stringify(
      { runAt: new Date().toISOString(), currentDefault: retrievalConfig.scoreThreshold, embedPrefixes: embedConfig.taskPrefixes, suggested, maxUnrelated, minAnswerable, sweep: rows, answerable, offtopic: offtopicResults },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\n  file written: ${path.relative(ROOT, outPath)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
