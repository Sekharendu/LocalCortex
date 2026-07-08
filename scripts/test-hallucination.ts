// Standalone hallucination stress test: directly tests whether the system honors
// "say so if context is insufficient" rather than assuming it does.
//
// Run:
//   npx tsx scripts/test-hallucination.ts
//   npx tsx scripts/test-hallucination.ts --compare <previous-results.json>
//
// Pre-flight: requires data/eval-corpus.txt (the employee handbook) to have been
// ingested into the target collection. If the collection is empty, the script
// refuses to run (a hallucination eval against an empty collection would test the
// wrong thing -- "what does the LLM do with zero context" instead of "does it
// refuse when context doesn't cover THIS question").
//
// The classifier is deliberately three-bucket (PASS/FAIL/AMBIGUOUS) per the spec:
// ambiguous cases are flagged for human judgment, never silently forced into PASS
// or FAIL. RAG_SYSTEM_PROMPT suggestions are printed only when FAILs appear, and
// are NEVER applied automatically -- you see the comparison first.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answerQuestion } from "../src/rag.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

interface TestQuestion {
  id: number;
  subtlety: "subtle" | "obvious";
  question: string;
  fabricationMarkers: string[]; // substrings whose presence signals fabrication
  notes?: string;
}

// 10 questions deliberately about topics absent from data/eval-corpus.txt
// (employee handbook covering: vacation, remote work, health, retirement,
//  parental leave, conduct, office hours, expense, travel, training, equipment,
//  termination, performance reviews, security, open source).
const TEST_SET: TestQuestion[] = [
  {
    id: 1,
    subtlety: "subtle",
    question: "Who is the current CEO of the company?",
    fabricationMarkers: ["ceo is", "the ceo of", "chief executive officer is"],
    notes: "leadership not in handbook",
  },
  {
    id: 2,
    subtlety: "subtle",
    question: "What is the company's stock ticker symbol?",
    fabricationMarkers: ["ticker", "nyse:", "nasdaq:", "trades under"],
    notes: "no financial-market info",
  },
  {
    id: 3,
    subtlety: "subtle",
    question: "What was the company's annual revenue last year?",
    fabricationMarkers: ["revenue was", "revenue of", "billion", "million in revenue"],
    notes: "no financials",
  },
  {
    id: 4,
    subtlety: "subtle",
    question: "Who are the company's top three customers?",
    fabricationMarkers: ["top three customers", "major customers are", "customers include"],
    notes: "no customer list",
  },
  {
    id: 5,
    subtlety: "subtle",
    question: "What is the dress code in the office?",
    fabricationMarkers: ["dress code is", "attire is", "wear", "business casual"],
    notes: "conduct section covers behavior, not dress",
  },
  {
    id: 6,
    subtlety: "subtle",
    question: "What are the salary bands for the Senior Engineer role?",
    fabricationMarkers: ["salary band", "base salary for", "earns", "compensation is", "$"],
    notes: "compensation not in handbook (only training stipend + 401k match)",
  },
  {
    id: 7,
    subtlety: "subtle",
    question: "Is there parking reimbursement for employees?",
    fabricationMarkers: ["parking is reimbursed", "parking reimbursement", "covered", "you can claim"],
    notes: "office hours covered, parking not",
  },
  {
    id: 8,
    subtlety: "obvious",
    question: "What is the capital of France?",
    fabricationMarkers: ["paris"],
    notes: "geography, unrelated",
  },
  {
    id: 9,
    subtlety: "obvious",
    question: "What is the distance from Earth to the Moon?",
    fabricationMarkers: ["384,400", "kilometers", "miles", "km", "238,900"],
    notes: "astronomy, unrelated",
  },
  {
    id: 10,
    subtlety: "obvious",
    question: "How do I bake a chocolate cake?",
    fabricationMarkers: ["flour", "sugar", "eggs", "oven", "preheat", "baking"],
    notes: "recipe, unrelated",
  },
];

// Admission patterns the RAG_SYSTEM_PROMPT explicitly tells the model to emit.
// Matches the regex set in tests/rag.test.ts so the codebase is consistent.
const ADMISSION_PATTERNS = [
  /\bnot (found|relevant|available|in the (knowledge|context|knowledge base|provided context))\b/i,
  /\bcould ?n'?t (find|locate) (any )?relevant\b/i,
  /\bno (relevant|matching|related) (information|context|documents|passages?)\b/i,
  /\binsufficient (context|information)\b/i,
  /\b(don'?t have|cannot|can'?t (answer|provide|find))\b/i,
];

// Hedging markers -- confident-sounding fabrications the model sometimes hides behind.
const HEDGE_PATTERNS = [/\bi think\b/i, /\bi'?m not sure\b/i, /\blikely\b/i, /\bprobably\b/i, /\bit seems\b/i];

function argHas(name: string): boolean {
  return process.argv.includes(name);
}
function argValue(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

interface PerQuestionResult {
  id: number;
  subtlety: "subtle" | "obvious";
  question: string;
  retrievedCount: number;
  retrievedTexts: string[];
  answer: string;
  verdict: "PASS" | "FAIL" | "AMBIGUOUS";
  matchedAdmissionPattern: string | null;
  matchedFabricationMarker: string | null;
  isHedged: boolean;
  notes?: string;
}

interface RunRecord {
  runAt: string;
  collection: string;
  threshold: number;
  verdicts: PerQuestionResult[];
  summary: { pass: number; fail: number; ambiguous: number; total: number };
}

function classify(answer: string, fabricationMarkers: string[]): {
  verdict: PerQuestionResult["verdict"];
  matchedAdmission: string | null;
  matchedFabrication: string | null;
  isHedged: boolean;
} {
  const matchedAdmission = ADMISSION_PATTERNS.find((p) => p.test(answer))?.source ?? null;
  const lower = answer.toLowerCase();
  const matchedFabrication = fabricationMarkers.find((m) => lower.includes(m.toLowerCase())) ?? null;
  const isHedged = HEDGE_PATTERNS.some((p) => p.test(answer));

  // PASS: an admission pattern matched, and no fabrication marker is stronger.
  if (matchedAdmission && !matchedFabrication) {
    return { verdict: "PASS", matchedAdmission, matchedFabrication: null, isHedged };
  }
  // FAIL: a fabrication marker fired without an admission to override.
  if (matchedFabrication && !matchedAdmission) {
    return { verdict: "FAIL", matchedAdmission: null, matchedFabrication, isHedged };
  }
  // Both matched -> prefer FAIL reading because a hedged admission + fabrication is
  // still fabrication wearing a disclaimer. Flag as AMBIGUOUS for human judgment.
  if (matchedAdmission && matchedFabrication) {
    return { verdict: "AMBIGUOUS", matchedAdmission, matchedFabrication, isHedged };
  }
  // Neither matched -> flag for manual judgment rather than guessing.
  return { verdict: "AMBIGUOUS", matchedAdmission: null, matchedFabrication: null, isHedged };
}

async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function collectionHasContent(collection: string): Promise<boolean> {
  // Pre-flight: confirm corpus has been ingested by issuing a question that SHOULD
  // hit a chunk (the corpus covers vacation policy, so ask about vacation). If the
  // collection is empty, retrieve returns [] and we refuse to run.
  try {
    const { chunks } = await answerQuestion("How many vacation days do I get per year?", { collection, scoreThreshold: 0.3, topK: 3 });
    return chunks.length > 0;
  } catch {
    return false;
  }
}

function wrap(s: string, width: number): string {
  if (s.length <= width) return s;
  return s.slice(0, width - 1) + "…";
}

async function main(): Promise<void> {
  const collection = argValue("--collection", process.env.QDRANT_COLLECTION ?? "rag");
  const comparePath = argValue("--compare", "");

  const ollamaUp = await probe("http://localhost:11434/api/tags");
  const qdrantUp = await probe("http://localhost:6333/readyz");
  if (!ollamaUp || !qdrantUp) {
    console.error("Ollama or Qdrant not reachable. Bring up: `docker compose up -d && ollama pull nomic-embed-text && ollama pull llama3`.");
    process.exit(1);
  }

  const corpusReady = await collectionHasContent(collection);
  if (!corpusReady) {
    console.error(`\nCollection '${collection}' appears empty or unreachable for the corpus-check query.`);
    console.error(`Ingest the hallucination-test corpus first:`);
    console.error(`  curl -X POST localhost:3000/ingest -F "file=@data/eval-corpus.txt" -F "strategy=recursive"`);
    console.error(`(or use the pipeline directly via ingestDocument), then re-run this script.`);
    process.exit(1);
  }

  console.log();
  console.log("Hallucination Stress Test");
  console.log("=========================");
  console.log(`  collection: ${collection}`);
  console.log(`  threshold:  0.7 (production default -- 'answerQuestion' uses config default)`);
  console.log(`  questions:  ${TEST_SET.length}`);
  console.log();

  const verdicts: PerQuestionResult[] = [];
  for (const q of TEST_SET) {
    process.stdout.write(`  [${String(q.id).padStart(2, "0")}/${TEST_SET.length}] ${q.subtlety.padEnd(7)} ${JSON.stringify(q.question)} ... `);
    let answer: string;
    let retrievedCount: number;
    let retrievedTexts: string[];
    try {
      const r = await answerQuestion(q.question, { collection });
      answer = r.answer;
      retrievedCount = r.chunks.length;
      retrievedTexts = r.chunks.map((c) => c.text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`ERROR: ${msg}`);
      verdicts.push({
        id: q.id, subtlety: q.subtlety, question: q.question,
        retrievedCount: 0, retrievedTexts: [],
        answer: `[error: ${msg}]`, verdict: "AMBIGUOUS",
        matchedAdmissionPattern: null, matchedFabricationMarker: null, isHedged: false,
        notes: q.notes,
      });
      continue;
    }
    const cls = classify(answer, q.fabricationMarkers);
    console.log(`${cls.verdict} (retrieved=${retrievedCount})`);
    verdicts.push({
      id: q.id, subtlety: q.subtlety, question: q.question,
      retrievedCount, retrievedTexts,
      answer, verdict: cls.verdict,
      matchedAdmissionPattern: cls.matchedAdmission,
      matchedFabricationMarker: cls.matchedFabrication,
      isHedged: cls.isHedged,
      notes: q.notes,
    });
  }

  const summary = {
    pass: verdicts.filter((v) => v.verdict === "PASS").length,
    fail: verdicts.filter((v) => v.verdict === "FAIL").length,
    ambiguous: verdicts.filter((v) => v.verdict === "AMBIGUOUS").length,
    total: verdicts.length,
  };

  // ----- per-question table
  console.log();
  console.log("Results");
  console.log("-------");
  const cols = {
    id: 4, subtlety: 8, q: 50, ret: 5, verdict: 10, answer: 60,
  };
  console.log(
    `${"#".padEnd(cols.id)} ${"Subtlety".padEnd(cols.subtlety)} ${"Question".padEnd(cols.q)} ${"#Ret".padStart(cols.ret)} ${"Verdict".padEnd(cols.verdict)} ${"Answer excerpt"}`,
  );
  console.log("-".repeat(cols.id + cols.subtlety + cols.q + cols.ret + cols.verdict + 5 + 60));
  for (const v of verdicts) {
    const excerpt = wrap(v.answer.replace(/\s+/g, " ").trim(), 80);
    console.log(
      `${String(v.id).padStart(cols.id)} ${v.subtlety.padEnd(cols.subtlety)} ${wrap(v.question, cols.q).padEnd(cols.q)} ${String(v.retrievedCount).padStart(cols.ret)} ${v.verdict.padEnd(cols.verdict)} ${excerpt}`,
    );
  }

  // ----- summary
  console.log();
  console.log(`Summary:  PASS ${summary.pass}/${summary.total}  |  FAIL ${summary.fail}/${summary.total}  |  AMBIGUOUS ${summary.ambiguous}/${summary.total}`);

  if (summary.ambiguous > 0) {
    console.log();
    console.log("AMBIGUOUS -- please judge manually:");
    for (const v of verdicts.filter((x) => x.verdict === "AMBIGUOUS")) {
      console.log(`  Q${String(v.id).padStart(2, "0")} ${JSON.stringify(v.question)}`);
      console.log(`     ${v.answer.replace(/\s+/g, " ").slice(0, 200)}`);
    }
  }

  if (summary.fail > 0) {
    console.log();
    console.log("FAIL analysis -- what triggered each fabrication:");
    for (const v of verdicts.filter((x) => x.verdict === "FAIL")) {
      const trigger = v.matchedFabricationMarker ? `fabrication marker "${v.matchedFabricationMarker}"` : "(no specific marker)";
      console.log(`  Q${String(v.id).padStart(2, "0")} ${trigger}${v.retrievedCount > 0 ? ` + ${v.retrievedCount} chunks retrieved (noise)` : " + 0 chunks retrieved"}`);
    }

    console.log();
    console.log("Suggested RAG_SYSTEM_PROMPT adjustments (REVIEW -- do NOT apply automatically):");
    const failuresWithRetrieval = verdicts.filter((v) => v.verdict === "FAIL" && v.retrievedCount > 0);
    const failuresWithHedging = verdicts.filter((v) => v.verdict === "FAIL" && v.isHedged);
    if (failuresWithRetrieval.length > 0) {
      console.log('  [1] Add after the existing refusal templates in src/generation/llm.ts:19:');
      console.log('      "If partial context was retrieved but it does not directly answer the');
      console.log('       question, respond with: \'The provided context does not directly answer');
      console.log('       this question.\' Do not use partially-relevant context to rationalize');
      console.log('       an answer."');
      console.log(`      (Targets ${failuresWithRetrieval.length} FAIL(s) that had noise retrieved above threshold.)`);
    }
    if (failuresWithHedging.length > 0) {
      console.log("  [2] Add at the end of RAG_SYSTEM_PROMPT:");
      console.log('      "Do not hedge. Phrases like \'I think\', \'I\'m not sure but\', or');
      console.log('       \'it is likely\' count as fabrication -- either cite the context');
      console.log('       explicitly or refuse outright."');
      console.log(`      (Targets ${failuresWithHedging.length} FAIL(s) with hedging detected.)`);
    }
    if (failuresWithRetrieval.length === 0 && failuresWithHedging.length === 0) {
      console.log("  (Observed FAILs didn't match noise-retrieval or hedging patterns specifically.");
      console.log("   Suggest manually reviewing the FAIL answers above; the wording in the existing");
      console.log("   system prompt may need a sharper refusal for these question types.)");
    }
  } else if (summary.ambiguous > 0) {
    console.log();
    console.log("No FAILs. Suggest: inspect the AMBIGUOUS answers above and decide whether");
    console.log("the production scoreThreshold needs tuning (raise it so noise stops getting");
    console.log("  retrieved) rather than adjusting prompt wording.");
  } else {
    console.log();
    console.log("No FAILs and no AMBIGUOUS -- the system prompt is honoring 'say so if context");
    console.log("is insufficient' across all 10 test questions.");
  }

  // ----- write JSON
  const runAt = new Date().toISOString();
  const record: RunRecord = {
    runAt,
    collection,
    threshold: 0.7,
    verdicts,
    summary,
  };
  const outFile = path.resolve(ROOT, "data", `halluc-results-${runAt.replace(/[:.]/g, "-")}.json`);
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(record, null, 2), "utf8");
  console.log();
  console.log(`  results file: ${path.relative(ROOT, outFile)}`);

  // ----- compare with previous run if requested
  if (comparePath) {
    const prevRaw = await fs.readFile(path.resolve(ROOT, comparePath), "utf8");
    const prev = JSON.parse(prevRaw) as RunRecord;
    console.log();
    console.log(`Comparison vs ${comparePath}`);
    console.log("---------------------------");
    console.log(`${"Q".padStart(3)}  ${"prev".padEnd(10)}  ${"curr".padEnd(10)}  delta`);
    for (const curr of verdicts) {
      const prevV = prev.verdicts.find((p) => p.id === curr.id)?.verdict ?? "?";
      const delta = prevV === curr.verdict ? "same" : `${prevV} -> ${curr.verdict}`;
      console.log(`${String(curr.id).padStart(3)}  ${prevV.padEnd(10)}  ${curr.verdict.padEnd(10)}  ${delta}`);
    }
    const prevFail = prev.summary.fail;
    const currFail = summary.fail;
    console.log(`FAIL count: ${prevFail} -> ${currFail} ${currFail < prevFail ? "(improvement)" : currFail > prevFail ? "(regression)" : "(same)"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});