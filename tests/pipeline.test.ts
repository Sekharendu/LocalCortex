import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { QdrantClient } from "@qdrant/js-client-rest";
import { ingestDocument } from "../src/ingest/pipeline.js";
import { embed } from "../src/retrieval/embedder.js";
import { searchSimilar, deleteByDocumentId } from "../src/retrieval/vectorStore.js";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const TEST_COLLECTION = `pipeline-test-${process.pid}`;

const client = new QdrantClient({ url: QDRANT_URL, checkCompatibility: false });

let stackUp = false;

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
  } catch {
    // ignore
  }
});

after(async () => {
  if (!stackUp) return;
  await client.deleteCollection(TEST_COLLECTION).catch(() => {});
});

test("ingestDocument ingests sample.txt end-to-end and chunkCount > 0", async (t) => {
  if (!stackUp) { t.skip("Ollama or Qdrant not reachable"); return; }

  const result = await ingestDocument("data/sample.txt", {
    strategy: "recursive",
    collection: TEST_COLLECTION,
  });

  assert.equal(result.success, true, `expected success, got: ${JSON.stringify(result)}`);
  if (!result.success) return; // type narrow
  assert.ok(result.chunkCount > 0, `expected chunkCount > 0, got ${result.chunkCount}`);
  console.log(`  ingested: documentId=${result.documentId} chunkCount=${result.chunkCount}`);

  // Follow-up search: embed a phrase known to be in data/sample.txt and verify a hit
  // returns a chunk whose text contains that phrase.
  const query = "The quick brown fox jumps over the lazy dog";
  const qVec = await embed(query);
  const hits = await searchSimilar(TEST_COLLECTION, qVec, { scoreThreshold: 0.5, limit: 5 });

  assert.ok(hits.length >= 1, "expected at least one search hit for a known phrase");
  const foundPhrase = hits.some((h) => {
    const text = h.payload?.text ?? "";
    return text.includes("quick brown fox");
  });
  assert.ok(foundPhrase, "expected a hit whose text contains 'quick brown fox'");
  console.log(`  search: ${hits.length} hits, top score=${hits[0].score.toFixed(4)}`);

  // Cleanup: remove the ingested document's chunks so test reruns don't accumulate.
  await deleteByDocumentId(TEST_COLLECTION, result.documentId);
});

test("ingestDocument returns a typed load-stage failure for a missing file", async (t) => {
  // This test does not need the live stack -- load failure is local I/O.
  const result = await ingestDocument("data/does-not-exist.txt", {
    collection: TEST_COLLECTION,
  });
  assert.equal(result.success, false);
  if (result.success) return;
  assert.equal(result.stage, "load");
  assert.ok(result.error.length > 0, "expected an error message");
});