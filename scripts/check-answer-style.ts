// Checks that answers get straight to the point: no "According to [1] (source: …)"
// preamble, no narration of how the answer was found, no hand-written "Source:" lines
// (the UI shows real sources from retrieval). Asks a fixed set of answerable questions
// plus a few two-turn follow-ups through answerQuestion, flags style leaks and any
// wrongly refused answer, and prints the start of each answer for a human read.
//
// Usage: npx tsx scripts/check-answer-style.ts [--collection rag]
// Needs the stack up and data/eval-corpus.txt ingested.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answerQuestion } from "../src/rag.js";
import { isRefusal } from "../src/generation/refusal.js";
import { retrievalConfig } from "../src/config.js";
import type { HistoryMessage } from "../src/generation/promptBuilder.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argValue(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

// Two questions from each category where the answer is in the corpus.
const CATEGORIES = ["baseline", "paraphrase-no-overlap", "exact-keyword", "abbreviation", "distractor"];
const PER_CATEGORY = 2;
const FOLLOWUPS = 3;

const LEAKS: { name: string; re: RegExp; skipOnRefusal?: boolean }[] = [
  { name: "opener", re: /^\s*(according to|based on)\b/i },
  { name: "tag", re: /\[\d+\]/ },
  { name: "source-line", re: /\bsources?\s*:/i },
  { name: "file-name", re: /\b[\w-]+\.(txt|pdf|docx|md)\b/i },
  // Refusals are told to say "The provided context is insufficient…", so only flag this
  // phrasing in real answers.
  { name: "context-talk", re: /\b(provided|given) (context|passages?|information)\b/i, skipOnRefusal: true },
  { name: "narration", re: /\bthe answer (would be|is)\s*:/i },
];

interface Row {
  kind: "question" | "follow-up (turn 1)" | "follow-up (turn 2)";
  category: string;
  question: string;
  answer: string;
  refused: boolean;
  leaks: string[];
}

function judge(answer: string): { refused: boolean; leaks: string[] } {
  const refused = isRefusal(answer);
  const leaks = LEAKS.filter((l) => !(refused && l.skipOnRefusal) && l.re.test(answer)).map((l) => l.name);
  return { refused, leaks };
}

const excerpt = (s: string, n = 160) => {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat;
};

async function main(): Promise<void> {
  const collection = argValue("--collection", retrievalConfig.collection);
  const evalSet: { question: string; category: string }[] = JSON.parse(
    await fs.readFile(path.join(ROOT, "data/eval-set.json"), "utf8"),
  );
  const followSet: { followups: { first: string; followup: string }[] } = JSON.parse(
    await fs.readFile(path.join(ROOT, "data/followup-eval-set.json"), "utf8"),
  );

  const questions = CATEGORIES.flatMap((cat) => evalSet.filter((e) => e.category === cat).slice(0, PER_CATEGORY));
  const rows: Row[] = [];
  const total = questions.length + FOLLOWUPS * 2;
  let n = 0;
  const progress = (q: string) => process.stdout.write(`  [${String(++n).padStart(2)}/${total}] ${excerpt(q, 60)} ... `);

  for (const q of questions) {
    progress(q.question);
    const { answer } = await answerQuestion(q.question, { collection });
    const row: Row = { kind: "question", category: q.category, question: q.question, answer, ...judge(answer) };
    rows.push(row);
    console.log(row.refused ? "REFUSED" : row.leaks.length ? `LEAK (${row.leaks.join(", ")})` : "ok");
  }

  for (const f of followSet.followups.slice(0, FOLLOWUPS)) {
    progress(f.first);
    const first = await answerQuestion(f.first, { collection });
    const r1: Row = { kind: "follow-up (turn 1)", category: "follow-up", question: f.first, answer: first.answer, ...judge(first.answer) };
    rows.push(r1);
    console.log(r1.refused ? "REFUSED" : r1.leaks.length ? `LEAK (${r1.leaks.join(", ")})` : "ok");

    progress(f.followup);
    const history: HistoryMessage[] = [
      { role: "user", content: f.first },
      { role: "assistant", content: first.answer },
    ];
    const second = await answerQuestion(f.followup, { collection, history });
    const r2: Row = { kind: "follow-up (turn 2)", category: "follow-up", question: f.followup, answer: second.answer, ...judge(second.answer) };
    rows.push(r2);
    console.log(r2.refused ? "REFUSED" : r2.leaks.length ? `LEAK (${r2.leaks.join(", ")})` : "ok");
  }

  console.log("\nAnswers (first 160 chars)\n-------------------------");
  for (const r of rows) {
    const verdict = r.refused ? "REFUSED" : r.leaks.length ? `LEAK: ${r.leaks.join(", ")}` : "ok";
    console.log(`\nQ: ${r.question}   [${verdict}]\nA: ${excerpt(r.answer)}`);
  }

  const leaky = rows.filter((r) => r.leaks.length > 0).length;
  const refused = rows.filter((r) => r.refused).length;
  const byLeak = Object.fromEntries(LEAKS.map((l) => [l.name, rows.filter((r) => r.leaks.includes(l.name)).length]));
  console.log(`\nSummary: ${rows.length} answers | with style leaks: ${leaky} | wrongly refused: ${refused}`);
  console.log(`By leak: ${Object.entries(byLeak).map(([k, v]) => `${k} ${v}`).join(" | ")}`);

  const out = path.join(ROOT, "data", `answer-style-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await fs.writeFile(out, JSON.stringify({ collection, summary: { answers: rows.length, leaky, refused, byLeak }, rows }, null, 2));
  console.log(`results file: ${path.relative(ROOT, out)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
