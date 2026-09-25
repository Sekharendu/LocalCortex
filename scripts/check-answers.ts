// Answer-quality check for context assembly (src/retrieval/context.ts), old vs new on the
// SAME retrieval: each question is retrieved once, then llama3 answers twice, from the
// retrieved chunks best first ("old", the pre-assembly behaviour) and from the assembled
// context ("new": whole small documents, or hits + neighbours). Any difference is the
// context's doing, not retrieval noise. When both prompts are identical (nothing retrieved,
// or assembly changed nothing) the model is called once.
//
// Question files (--set a.json,b.json) come in two shapes:
// - keyword sets ({ q, doc, must?, refuse? }, e.g. data/answer-check-set.json): an answer
//   passes when every `must` group has one of its words in it;
// - eval sets ({ question, expectedSubstrings?, category? }, e.g. data/eval-set.json):
//   auto-graded, every number and capitalised name in the expected text must appear,
//   else half of its content words. An entry with no expected text must be refused
//   (data/offtopic-set.json).
// Everywhere: a refusal fails an answerable question, and talk about "the context"
// outside a refusal is a leak (a fail).
//
// Collections: --collection NAME (default "check-answers"); --ingest a,b,c ingests those
// files first if the collection is empty. The document store and BM25 stats point at temp
// files, so data/documents.json and data/sparse-stats.json are never touched. --delete
// drops the collection at the end.
//
// Results are appended per question to data/answer-check-<run>.jsonl (--run NAME), and a
// rerun skips questions already done, so a sleep or crash loses one question at most.
// --limit N takes the first N of each set; --summary prints the tally without running.
//
// Usage:
//   npx tsx scripts/check-answers.ts --run pdfs --collection check-thorough \
//     --ingest data/eval-corpus.txt,test_pdfs/IJRTI2304061.pdf --set test_pdfs/questions.json
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "check-answers-"));
process.env.DOC_STORE_PATH = path.join(tmp, "documents.json");
process.env.SPARSE_STATS_PATH = path.join(tmp, "sparse-stats.json");
if (arg("--whole-max") !== undefined) process.env.WHOLE_DOC_MAX_TOKENS = arg("--whole-max");

const { ingestDocument } = await import("../src/ingest/pipeline.js");
const { retrieveForQuestion } = await import("../src/rag.js");
const { buildPrompt } = await import("../src/generation/promptBuilder.js");
const { generate, RAG_SYSTEM_PROMPT } = await import("../src/generation/llm.js");
const { isRefusal } = await import("../src/generation/refusal.js");
const { countTokens } = await import("../src/generation/tokens.js");
const { QdrantClient } = await import("@qdrant/js-client-rest");

const COLLECTION = arg("--collection") ?? "check-answers";
const RUN = arg("--run") ?? new Date().toISOString().replace(/[:.]/g, "-");
const OUT = `data/answer-check-${RUN}.jsonl`;
const SETS = (arg("--set") ?? "data/answer-check-set.json").split(",");
const LIMIT = arg("--limit") ? Number(arg("--limit")) : Infinity;
const qdrant = new QdrantClient({ url: process.env.QDRANT_URL ?? "http://localhost:6333", checkCompatibility: false });

interface Question {
  set: string;
  doc: string;
  q: string;
  /** Each group needs one of its (lower-case) words in the answer. */
  must: string[][];
  /** Nothing in the corpus answers it: only a refusal passes. */
  refuse: boolean;
}

const STOP = new Set(
  "the and for with from that this into over your their have has are was were will what when where which who how does each per any all may can must not only also than then they them been being about after before under".split(" "),
);

/** Key facts of an expected passage: its numbers and capitalised names, else its content words. */
function gradeGroups(expected: string[]): { groups: string[][]; fuzzy: string[] } {
  const groups: string[][] = [];
  for (const text of expected) {
    const tokens = text.split(/\s+/).map((t) => t.replace(/^[^\w$]+|[^\w%]+$/g, ""));
    for (const [i, t] of tokens.entries()) {
      if (!t) continue;
      const isNumber = /\d/.test(t);
      const isAllCaps = /^[A-Z]{2,}$/.test(t);
      const isName = i > 0 && /^[A-Z][a-z]/.test(t) && !STOP.has(t.toLowerCase());
      if (isNumber) groups.push([t.toLowerCase().replace(/^\$/, "")]);
      else if (isAllCaps || isName) groups.push([t.toLowerCase()]);
    }
  }
  const fuzzy = expected
    .join(" ")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
  return { groups, fuzzy: groups.length ? [] : [...new Set(fuzzy)] };
}

async function loadSet(file: string): Promise<Question[]> {
  const set = path.basename(file, ".json");
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as Record<string, unknown>[];
  return raw.slice(0, LIMIT).map((e) => {
    if (typeof e.q === "string") {
      return { set, doc: String(e.doc ?? set), q: e.q, must: (e.must as string[][]) ?? [], refuse: e.refuse === true };
    }
    const expected = (e.expectedSubstrings as string[] | undefined) ?? [];
    const { groups, fuzzy } = gradeGroups(expected);
    // Fuzzy grading is one group per content word; half of them must appear (see grade()).
    return {
      set,
      doc: String(e.category ?? e.group ?? set),
      q: String(e.question),
      must: groups.length ? groups : fuzzy.map((w) => [`~${w}`]),
      refuse: expected.length === 0,
    };
  });
}

// Talk about the context outside a refusal (the answer-style rule, scripts/check-answer-style.ts).
// Only "the context" / "the passages" count: a document's own wording ("in the
// Business-Process-Outsourcing context") is not a leak.
const LEAK = /\bthe (provided |given )?(context|passages?)\b|according to|based on (the )?(provided |given )?(context|passages?|information)/i;
/** A bare fragment ("Economy class.", "$100 million") instead of the full sentence the prompt asks for. */
const TERSE_MAX_WORDS = 5;

function grade(qn: Question, answer: string) {
  const low = answer.toLowerCase().replace(/(\d),(\d{3})/g, "$1$2");
  const refused = isRefusal(answer);
  const leak = !refused && LEAK.test(answer);
  const terse = !refused && answer.trim().split(/\s+/).length <= TERSE_MAX_WORDS;
  const fuzzy = qn.must.length > 0 && qn.must.every((g) => g[0].startsWith("~"));
  let missing: string[];
  if (fuzzy) {
    // Match on a 5-letter stem so "reimbursed" counts for "reimbursement".
    const hit = qn.must.filter((g) => low.includes(g[0].slice(1, 6)));
    missing = hit.length * 2 >= qn.must.length ? [] : qn.must.filter((g) => !hit.includes(g)).map((g) => g[0]);
  } else {
    missing = qn.must.filter((g) => !g.some((w) => low.includes(w.replace(/(\d),(\d{3})/g, "$1$2")))).map((g) => g[0]);
  }
  const ok = qn.refuse ? refused : !refused && !leak && missing.length === 0;
  return { ok, refused, leak, terse, missing };
}

interface Row {
  set: string;
  doc: string;
  q: string;
  refuse: boolean;
  chunks: number;
  passages: number;
  sources: string[];
  same: boolean;
  old: ReturnType<typeof grade> & { answer: string; tokens: number; sec: number };
  new: ReturnType<typeof grade> & { answer: string; tokens: number; sec: number };
}

async function readRows(): Promise<Row[]> {
  const text = await fs.readFile(OUT, "utf8").catch(() => "");
  return text.split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
}

function summarize(rows: Row[]) {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = `${r.set} / ${r.refuse ? "refuse" : r.doc}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  groups.set("ALL", rows);
  const n = (rs: Row[], f: (r: Row) => boolean) => rs.filter(f).length;
  const avg = (rs: Row[], f: (r: Row) => number) => Math.round(rs.reduce((s, r) => s + f(r), 0) / (rs.length || 1));
  const table = [...groups].map(([key, rs]) => ({
    group: key,
    n: rs.length,
    "old ok": n(rs, (r) => r.old.ok),
    "new ok": n(rs, (r) => r.new.ok),
    "new wins": n(rs, (r) => r.new.ok && !r.old.ok),
    "new losses": n(rs, (r) => r.old.ok && !r.new.ok),
    "old refused": n(rs, (r) => r.old.refused),
    "new refused": n(rs, (r) => r.new.refused),
    "old leak": n(rs, (r) => r.old.leak),
    "new leak": n(rs, (r) => r.new.leak),
    "old terse": n(rs, (r) => r.old.terse),
    "new terse": n(rs, (r) => r.new.terse),
    "old tok": avg(rs, (r) => r.old.tokens),
    "new tok": avg(rs, (r) => r.new.tokens),
    "old s": avg(rs, (r) => r.old.sec),
    "new s": avg(rs, (r) => r.new.sec),
  }));
  console.table(table);
}

if (process.argv.includes("--summary")) {
  // Regrade the stored answers with the current grader, using --set for the questions' keywords.
  const rows = await readRows();
  if (arg("--set") !== undefined) {
    const byKey = new Map((await Promise.all(SETS.map(loadSet))).flat().map((qn) => [`${qn.set}\0${qn.q}`, qn]));
    for (const r of rows) {
      const qn = byKey.get(`${r.set}\0${r.q}`);
      if (!qn) continue;
      Object.assign(r.old, grade(qn, r.old.answer));
      Object.assign(r.new, grade(qn, r.new.answer));
    }
  }
  summarize(rows);
  process.exit(0);
}

const points = await qdrant.getCollection(COLLECTION).then((c) => c.points_count ?? 0).catch(() => 0);
if (points > 0) {
  console.log(`using collection ${COLLECTION} (${points} points)`);
} else {
  const files = arg("--ingest")?.split(",") ?? [];
  if (files.length === 0) throw new Error(`collection ${COLLECTION} is empty and no --ingest files were given`);
  for (const file of files) {
    const t0 = Date.now();
    const r = await ingestDocument(file, { strategy: "recursive", collection: COLLECTION });
    if (!r.success) throw new Error(`ingest ${file} failed at stage '${r.stage}': ${r.error}`);
    console.log(`ingested ${file}: ${r.chunkCount} chunks in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}

const questions = (await Promise.all(SETS.map(loadSet))).flat();
const done = new Set((await readRows()).map((r) => `${r.set}\0${r.q}`));
const systemTokens = countTokens(RAG_SYSTEM_PROMPT);
const answer = async (prompt: string) => {
  const t0 = Date.now();
  const text = await generate(prompt);
  return { text, sec: (Date.now() - t0) / 1000, tokens: systemTokens + countTokens(prompt) };
};

let i = 0;
for (const qn of questions) {
  i++;
  if (done.has(`${qn.set}\0${qn.q}`)) continue;
  const { chunks, passages, prompt: newPrompt } = await retrieveForQuestion(qn.q, { collection: COLLECTION });
  const oldPrompt = buildPrompt(qn.q, chunks);
  const same = oldPrompt === newPrompt;
  // Alternate which prompt goes first so Ollama's prompt cache favours neither.
  let o, n;
  if (same) o = n = await answer(oldPrompt);
  else if (i % 2) (o = await answer(oldPrompt)), (n = await answer(newPrompt));
  else (n = await answer(newPrompt)), (o = await answer(oldPrompt));
  const row: Row = {
    set: qn.set,
    doc: qn.doc,
    q: qn.q,
    refuse: qn.refuse,
    chunks: chunks.length,
    passages: passages.length,
    sources: [...new Set(passages.map((p) => p.source))],
    same,
    old: { ...grade(qn, o.text), answer: o.text, tokens: o.tokens, sec: o.sec },
    new: { ...grade(qn, n.text), answer: n.text, tokens: n.tokens, sec: n.sec },
  };
  await fs.appendFile(OUT, JSON.stringify(row) + "\n");
  const v = (x: Row["old"]) => (x.ok ? "ok " : x.refused ? "REF" : x.leak ? "LEK" : "bad");
  console.log(
    `[${i}/${questions.length}] old ${v(row.old)} new ${v(row.new)}${same ? " (same)" : ""} ` +
      `${row.old.tokens}->${row.new.tokens}tok ${chunks.length}c/${passages.length}p ` +
      `${qn.set}/${qn.doc} :: ${qn.q.slice(0, 70)}`,
  );
}

summarize(await readRows());
console.log(`results: ${OUT}`);
if (process.argv.includes("--delete")) await qdrant.deleteCollection(COLLECTION);
await fs.rm(tmp, { recursive: true, force: true });
