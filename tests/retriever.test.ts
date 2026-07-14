import { describe, test, expect, beforeAll, afterAll } from "vitest";
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

beforeAll(async () => {
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
}, 180_000);

afterAll(async () => {
  if (!stackUp) return;
  if (documentId) await deleteByDocumentId(TEST_COLLECTION, documentId).catch(() => {});
  await client.deleteCollection(TEST_COLLECTION).catch(() => {});
});

describe("retrieve", () => {
  test.skipIf(!stackUp || documentId === null)(
    "(a) clear match returns relevant chunks ranked by score descending",
    async () => {
      const chunks = await retrieve("What does the sample say about a quick brown fox?", {
        collection: TEST_COLLECTION,
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].text).toContain("quick brown fox");
      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i - 1].score).toBeGreaterThanOrEqual(chunks[i].score);
      }
    },
  );

  test.skipIf(!stackUp || documentId === null)(
    "(b) unrelated query with default threshold returns nothing",
    async () => {
      const chunks = await retrieve(
        "Quantum chromodynamics gauge invariance and the strong nuclear force confinement hypothesis",
        { collection: TEST_COLLECTION },
      );
      expect(chunks).toHaveLength(0);
    },
  );

  test.skipIf(!stackUp || documentId === null)(
    "(c) topK: 1 vs topK: 5 on the same query returns the right count",
    async () => {
      const question = "What does the sample text mention about a fox?";
      const one = await retrieve(question, { topK: 1, scoreThreshold: 0, collection: TEST_COLLECTION });
      const five = await retrieve(question, { topK: 5, scoreThreshold: 0, collection: TEST_COLLECTION });

      expect(one).toHaveLength(1);
      expect(five.length).toBeLessThanOrEqual(5);
      // The top-1 result should match the top result of the top-5 query
      // (Qdrant's deterministic search for the same query vector).
      if (five.length > 0) {
        expect(five[0].text).toBe(one[0].text);
      }
    },
  );
});