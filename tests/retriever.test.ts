import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { QdrantClient } from "@qdrant/js-client-rest";
import { retrieve } from "../src/retrieval/retriever.js";
import { ingestDocument } from "../src/ingest/pipeline.js";
import { deleteByDocumentId } from "../src/retrieval/vectorStore.js";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const TEST_COLLECTION = `retriever-test-${process.pid}`;

const client = new QdrantClient({ url: QDRANT_URL, checkCompatibility: false });

let stackUp = false;
let documentId: string | null = null;

before(async () => {
  try {
    const [qRes, oRes] = await Promise.all([
      fetch(`${QDRANT_URL}/readyz`, { signal: AbortSignal.timeout(2000) }),
      fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) }),
    ]);
    stackUp = qRes.ok && oRes.ok;
  } catch {
    stackUp = false;
  }
  if (!stackUp) return;

  try {
    await client.deleteCollection(TEST_COLLECTION).catch(() => {});
    const r = await ingestDocument("data/sample.txt", {
      strategy: "recursive",
      collection: TEST_COLLECTION,
    });
    if (r.success) documentId = r.documentId;
  } catch {
    stackUp = false;
  }
});

after(async () => {
  if (!stackUp) return;
  if (documentId) await deleteByDocumentId(TEST_COLLECTION, documentId).catch(() => {});
  await client.deleteCollection(TEST_COLLECTION).catch(() => {});
});

test("retrieve on a matching question returns relevant chunks ranked by score descending", async (t) => {
  if (!stackUp || !documentId) { t.skip("Ollama or Qdrant not reachable, or ingest failed"); return; }

  const chunks = await retrieve("What does the quick brown fox do?", { collection: TEST_COLLECTION });

  assert.ok(chunks.length > 0, "expected at least one chunk for a matching question");
  const topHasPhrase = chunks[0].text.includes("quick brown fox");
  assert.ok(topHasPhrase, `top chunk text should include 'quick brown fox'; got: ${JSON.stringify(chunks[0].text.slice(0, 80))}`);
  for (let i = 1; i < chunks.length; i++) {
    assert.ok(
      chunks[i - 1].score >= chunks[i].score,
      `chunks must be score-descending: ${chunks[i - 1].score} < ${chunks[i].score} at index ${i}`,
    );
  }
  console.log(`  matching  -> ${chunks.length} hits, top score=${chunks[0].score.toFixed(4)}`);
});

test("retrieve on an absent topic returns empty array at default threshold", async (t) => {
  if (!stackUp || !documentId) { t.skip("Ollama or Qdrant not reachable, or ingest failed"); return; }

  const chunks = await retrieve(
    "Quantum chromodynamics gauge invariance and the strong nuclear force confinement hypothesis",
    { collection: TEST_COLLECTION },
  );

  assert.equal(chunks.length, 0, `expected zero hits for an absent topic at threshold 0.7, got ${chunks.length}`);
  console.log("  absent    -> 0 hits at default threshold (0.7)");
});

test("lowering the threshold to 0 on the same absent-topic question returns results anyway", async (t) => {
  if (!stackUp || !documentId) { t.skip("Ollama or Qdrant not reachable, or ingest failed"); return; }

  const chunks = await retrieve(
    "Quantum chromodynamics gauge invariance and the strong nuclear force confinement hypothesis",
    { scoreThreshold: 0, collection: TEST_COLLECTION },
  );

  assert.ok(chunks.length > 0, "expected >0 hits when threshold is 0 (proving threshold, not luck, filtered the prior test)");
  console.log(`  absent@0  -> ${chunks.length} hits, top score=${chunks[0].score.toFixed(4)}`);
});