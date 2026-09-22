// Generates a sampled starter eval set for the multi-document data/large-corpus/
// corpus. Same technique as gen-eval-set.ts (llama3 authors a question per chunk, a
// unique n-gram phrase becomes the expectedSubstring) but adapted for scale:
//   - loads and chunks all documents in the directory, not just one
//   - SAMPLES a subset of chunks (one question per chunk would mean one llama3 call per
//     chunk -- at ~200+ chunks that's hours; a representative sample keeps this
//     practical while still covering every document)
//   - uniqueness is checked against ALL chunks across ALL documents, since a phrase
//     could coincidentally repeat across documents now, not just within one
//   - each entry is tagged category: "baseline" (same meaning as in the original
//     eval-set.json: an auto-generated, keyword-anchored "easy" question) so a
//     hand-curated hard-case layer can be added on top later with its own categories
//
// Usage:
//   npx tsx scripts/gen-large-eval-set.ts \
//     [--dir data/large-corpus] [--out data/large-eval-set.json] [--sample-size 40]
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDocument } from "../src/ingest/loader.js";
import { chunkText } from "../src/ingest/chunker.js";
import { generate } from "../src/generation/llm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function argValue(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

interface EnrichedChunk {
  source: string;
  text: string;
  uniquePhrase: string | null;
  question: string | null;
}

function candidatePhrases(text: string): string[] {
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

function findUniquePhrase(allChunks: EnrichedChunk[], chunk: EnrichedChunk): string | null {
  const candidates = candidatePhrases(chunk.text);
  for (const phrase of candidates) {
    const matches = allChunks.filter((c) => c.text.toLowerCase().includes(phrase.toLowerCase()));
    if (matches.length === 1) return phrase;
  }
  return null;
}

// Evenly-spaced deterministic sample (not random) so re-runs are reproducible.
function sample<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const step = items.length / count;
  const out: T[] = [];
  for (let i = 0; i < count; i++) out.push(items[Math.floor(i * step)]);
  return out;
}

const QUESTION_GEN_PROMPT_PREFIX = `You are generating retrieval evaluation questions.

Below is ONE passage from a corporate policy document. Write ONE short, specific
question a real employee might type into a search box, whose answer requires a fact
stated in this passage. Make the question natural-language search-style, not a
reading-comprehension test. Do not echo the passage in the question.

Reply with ONLY the question, no preamble, no quotes, no numbering.`;

async function probeStack(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const dir = path.resolve(ROOT, argValue("--dir", "data/large-corpus"));
  const outPath = path.resolve(ROOT, argValue("--out", "data/large-eval-set.json"));
  const sampleSize = Number(argValue("--sample-size", "40"));

  const stackUp = await probeStack();
  if (!stackUp) {
    console.error("Ollama not reachable. Bring up the stack with `docker compose up -d && ollama pull llama3`.");
    process.exit(1);
  }

  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".txt"));
  console.log(`Loading + chunking ${files.length} document(s) from ${path.relative(ROOT, dir)}`);

  const allChunks: EnrichedChunk[] = [];
  const chunksByFile = new Map<string, EnrichedChunk[]>();
  for (const file of files) {
    const loaded = await loadDocument(path.join(dir, file));
    const fileChunks: EnrichedChunk[] = [];
    for (const doc of loaded.documents) {
      const pageChunks = await chunkText(doc.pageContent, "recursive", { maxSize: 500 });
      for (const c of pageChunks) {
        fileChunks.push({ source: file, text: c.text, uniquePhrase: null, question: null });
      }
    }
    chunksByFile.set(file, fileChunks);
    allChunks.push(...fileChunks);
    console.log(`  ${file}: ${fileChunks.length} chunks`);
  }
  console.log(`  total: ${allChunks.length} chunks across ${files.length} document(s)`);

  // Sample proportionally per document so every document is represented.
  const sampled: EnrichedChunk[] = [];
  for (const [file, fileChunks] of chunksByFile) {
    const perFileCount = Math.max(1, Math.round((fileChunks.length / allChunks.length) * sampleSize));
    sampled.push(...sample(fileChunks, perFileCount));
  }
  console.log(`  sampled ${sampled.length} chunks for question generation (target ${sampleSize})`);

  for (const chunk of sampled) {
    chunk.uniquePhrase = findUniquePhrase(allChunks, chunk);
  }
  const withoutPhrase = sampled.filter((c) => !c.uniquePhrase);
  if (withoutPhrase.length > 0) {
    console.warn(`  warning: ${withoutPhrase.length} sampled chunk(s) have no unique phrase; they'll be skipped`);
  }

  console.log(`\nGenerating questions via llama3 (one prompt per sampled chunk)...`);
  for (let i = 0; i < sampled.length; i++) {
    const chunk = sampled[i];
    if (!chunk.uniquePhrase) continue;
    process.stdout.write(`  [${String(i + 1).padStart(2, "0")}/${sampled.length}] (${chunk.source}) `);
    const prompt = `${QUESTION_GEN_PROMPT_PREFIX}\n\nPassage:\n${chunk.text}\n\nQuestion:`;
    try {
      const q = await generate(prompt);
      chunk.question = q.replace(/\n+/g, " ").replace(/^[""]+|[""]+$/g, "").trim();
      process.stdout.write(`"${chunk.question}"\n`);
    } catch (e) {
      process.stdout.write(`(generation failed: ${e instanceof Error ? e.message : String(e)})\n`);
    }
  }

  const out = sampled
    .filter((c) => c.uniquePhrase && c.question)
    .map((c) => ({
      question: c.question as string,
      expectedSubstrings: [c.uniquePhrase as string],
      notes: `auto-generated from ${c.source}`,
      category: "baseline",
    }));

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${out.length} entries to ${path.relative(ROOT, outPath)}`);
  console.log(`Next: eyeball the file, then layer hand-curated hard-case questions (distractor/abbreviation/paraphrase-no-overlap) on top.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
