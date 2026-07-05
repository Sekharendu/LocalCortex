// Manual RAG sanity harness: ingest a small sample doc, ask one clearly answerable
// question and one deliberately absent-topic question, print both built prompts and
// both model answers. Lets you eyeball whether llama3 at default settings declines
// the absent-topic question or fabricates an answer.
//
// Run with: npx tsx scripts/probe-rag.ts
// Requires: docker compose up -d
//           docker exec -it local-rag-ollama ollama pull nomic-embed-text
//           docker exec -it local-rag-ollama ollama pull llama3
import { ingestDocument } from "../src/ingest/pipeline.js";
import { retrieve } from "../src/retrieval/retriever.js";
import { buildPrompt } from "../src/generation/promptBuilder.js";
import { generate } from "../src/generation/llm.js";
import { deleteByDocumentId } from "../src/retrieval/vectorStore.js";
import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const TEST_COLLECTION = `probe-rag-${process.pid}`;
const qsClient = new QdrantClient({ url: QDRANT_URL, checkCompatibility: false });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function probeHealth() {
  try {
    const [q, o] = await Promise.all([
      fetch(`${QDRANT_URL}/readyz`, { signal: AbortSignal.timeout(2000) }),
      fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) }),
    ]);
    if (!q.ok || !o.ok) {
      console.error("Health check failed: Qdrant or Ollama returned non-2xx.");
      process.exit(1);
    }
  } catch (e) {
    console.error(`Ollama or Qdrant not reachable at ${OLLAMA_URL} / ${QDRANT_URL}.`, e instanceof Error ? `(${e.message})` : "");
    process.exit(1);
  }
}

function rule(label: string) {
  console.log("\n" + "=".repeat(70));
  console.log(label);
  console.log("=".repeat(70));
}

async function ask(question: string, documentId: string) {
  rule(`RETRIEVE: "${question}"`);
  const chunks = await retrieve(question, { collection: TEST_COLLECTION });
  console.log(`retrieved ${chunks.length} chunk(s)`);
  for (const c of chunks) {
    console.log(`  score=${c.score.toFixed(4)} source=${c.source} page=${c.page ?? "-"} :: ${c.text.slice(0, 80).replace(/\n/g, " ")}...`);
  }

  rule("PROMPT (built)");
  const prompt = buildPrompt(question, chunks);
  console.log(prompt);

  rule("ANSWER (llama3)");
  const answer = await generate(prompt);
  console.log(answer);
}

async function main() {
  await probeHealth();
  await qsClient.deleteCollection(TEST_COLLECTION).catch(() => {});

  rule(`INGEST sample.txt into '${TEST_COLLECTION}'`);
  const r = await ingestDocument("data/sample.txt", { strategy: "recursive", collection: TEST_COLLECTION });
  if (!r.success) {
    console.error(`Ingest failed at stage '${r.stage}': ${r.error}`);
    process.exit(1);
  }
  console.log(`ingested documentId=${r.documentId} chunkCount=${r.chunkCount}`);
  await sleep(500); // tiny settle window; vectorStore.upsert already wait:true

  try {
    await ask("What does the sample text say about a fox?", r.documentId);
    await ask("What is the capital of France?", r.documentId);
  } finally {
    await deleteByDocumentId(TEST_COLLECTION, r.documentId).catch(() => {});
    await qsClient.deleteCollection(TEST_COLLECTION).catch(() => {});
    console.log("\ncleanup done.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});