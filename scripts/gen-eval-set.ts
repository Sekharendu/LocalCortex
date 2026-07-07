// One-off generator: uses the local llama3 model to author plausible retrieval
// questions from each chunk of a sample document. Writes a starter eval set to
// data/eval-set.json so you don't have to hand-write 15-20 (question, expected-substring)
// pairs from scratch.
//
// Usage:
//   npx tsx scripts/gen-eval-set.ts \
//     [--doc data/eval-corpus.txt] \
//     [--out data/eval-set.json] \
//     [--strategy recursive] [--maxSize 500]
//
// Approach: load+chunk the doc (same chunker the pipeline uses so the chunks match
// production reality), then for each chunk:
//   1. Ask llama3 to write ONE natural-language search-engine-style question whose
//      answer requires a specific fact stated in this chunk.
//   2. Extract a unique phrase from the chunk's text -- the longest word n-gram (3-5
//      words) that doesn't appear in any other chunk -- so the substring uniquely
//      identifies that chunk at retrieval time.
//   3. Emit { question, expectedSubstrings: [uniquePhrase] } to the eval-set file.
//
// The generated set is a STARTER -- you should eyeball it, delete tautological
// questions, and refine phrasing to match real user language.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDocument } from "../src/ingest/loader.js";
import { chunkText, type ChunkStrategy } from "../src/ingest/chunker.js";
import { generate } from "../src/generation/llm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function argValue(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

interface EnrichedChunk {
  index: number;
  text: string;
  uniquePhrase: string | null;
  question: string | null;
}

// Extract candidate phrases (3-5 word n-grams) from a chunk.
function candidatePhrases(text: string): string[] {
  // Strip markdown headings; we want prose n-grams that uniquely identify the chunk
  const prose = text.replace(/^#{1,6}\s.+$/gm, "").replace(/\s+/g, " ").trim();
  const words = prose.split(" ").filter((w) => w.length > 0);
  const out: string[] = [];
  for (let n = 5; n >= 3; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      out.push(words.slice(i, i + n).join(" "));
    }
  }
  return out;
}

function findUniquePhrase(chunks: EnrichedChunk[], chunk: EnrichedChunk): string | null {
  const candidates = candidatePhrases(chunk.text);
  for (const phrase of candidates) {
    // unique iff phrase appears in only this chunk's text (case-insensitive)
    const matches = chunks.filter((c) => c.text.toLowerCase().includes(phrase.toLowerCase()));
    if (matches.length === 1) return phrase;
  }
  return null;
}

const QUESTION_GEN_PROMPT_PREFIX = `You are generating retrieval evaluation questions.

Below is ONE passage from a corporate employee handbook. Write ONE short, specific
question a real employee might type into a search box, whose answer requires a fact
stated in this passage. Make the question natural-language search-style, not a
reading-comprehension test. Do not echo the passage in the question.

Reply with ONLY the question, no preamble, no quotes, no numbering.`;

async function probeStack(): Promise<boolean> {
  try {
    const oRes = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(2000) });
    return oRes.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const docPath = path.resolve(ROOT, argValue("--doc", "data/eval-corpus.txt"));
  const outPath = path.resolve(ROOT, argValue("--out", "data/eval-set.json"));
  const strategy = argValue("--strategy", "recursive") as ChunkStrategy;
  const maxSize = Number(argValue("--maxSize", "500"));

  const stackUp = await probeStack();
  if (!stackUp) {
    console.error("Ollama not reachable. Bring up the stack with `docker compose up -d && ollama pull llama3`.");
    process.exit(1);
  }

  console.log(`Loading document: ${path.relative(ROOT, docPath)}`);
  const loaded = await loadDocument(docPath);
  console.log(`  loaded ${loaded.text.length} chars, ${loaded.documents.length} page(s)`);

  console.log(`Chunking (strategy=${strategy}, maxSize=${maxSize})...`);
  let globalIndex = 0;
  const chunks: EnrichedChunk[] = [];
  for (const doc of loaded.documents) {
    const pageChunks = await chunkText(doc.pageContent, strategy, { maxSize });
    for (const c of pageChunks) {
      chunks.push({ index: globalIndex++, text: c.text, uniquePhrase: null, question: null });
    }
  }
  console.log(`  produced ${chunks.length} chunks`);

  // 1. Find a unique phrase per chunk.
  for (const chunk of chunks) {
    chunk.uniquePhrase = findUniquePhrase(chunks, chunk);
  }
  const withoutPhrase = chunks.filter((c) => !c.uniquePhrase);
  if (withoutPhrase.length > 0) {
    console.warn(`  warning: ${withoutPhrase.length} chunk(s) have no unique phrase; they'll be skipped`);
  }

  // 2. Author one question per chunk via llama3.
  console.log(`\nGenerating questions via llama3 (one short prompt per chunk)...`);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk.uniquePhrase) continue;
    process.stdout.write(`  [${String(i + 1).padStart(2, "0")}/${chunks.length}] `);
    const prompt = `${QUESTION_GEN_PROMPT_PREFIX}\n\nPassage:\n${chunk.text}\n\nQuestion:`;
    try {
      const q = await generate(prompt);
      chunk.question = q.replace(/\n+/g, " ").replace(/^[""]+|[""]+$/g, "").trim();
      process.stdout.write(`"${chunk.question}"\n`);
    } catch (e) {
      process.stdout.write(`(generation failed: ${e instanceof Error ? e.message : String(e)})\n`);
    }
  }

  // 3. Emit the eval set.
  const out = chunks
    .filter((c) => c.uniquePhrase && c.question)
    .map((c) => ({
      question: c.question as string,
      expectedSubstrings: [c.uniquePhrase as string],
    }));

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${out.length} entries to ${path.relative(ROOT, outPath)}`);
  console.log(`Next: eyeball the file, delete tautological questions, refine phrasing.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});