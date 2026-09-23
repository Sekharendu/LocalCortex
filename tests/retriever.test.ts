import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { QdrantClient } from "@qdrant/js-client-rest";
import { retrieve } from "../src/retrieval/retriever.js";
import { ingestDocument } from "../src/ingest/pipeline.js";
import { deleteByDocumentId } from "../src/retrieval/vectorStore.js";
import { deleteDocument } from "../src/documentStore.js";
import { stackUp } from "./helpers/stack.js";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const TEST_COLLECTION = `retriever-test-${process.pid}`;

const client = new QdrantClient({ url: QDRANT_URL, checkCompatibility: false });

let documentId: string | null = null;

beforeAll(async () => {
  if (!stackUp) return;
  await client.deleteCollection(TEST_COLLECTION).catch(() => {});
  const r = await ingestDocument("data/sample.txt", {
    strategy: "recursive",
    collection: TEST_COLLECTION,
  });
  // Fail loudly: with the stack up, a broken ingest is a real failure, not a reason to skip.
  if (!r.success) throw new Error(`test setup: ingest failed at stage '${r.stage}': ${r.error}`);
  documentId = r.documentId;
}, 180_000);

afterAll(async () => {
  if (!stackUp) return;
  if (documentId) {
    await deleteByDocumentId(TEST_COLLECTION, documentId).catch(() => {});
    await deleteDocument(documentId).catch(() => {});
  }
  await client.deleteCollection(TEST_COLLECTION).catch(() => {});
});

describe("retrieve", () => {
  test.skipIf(!stackUp)(
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

  test.skipIf(!stackUp)(
    "(b) unrelated query with default threshold returns nothing -- both modes",
    async () => {
      // Explicit per-mode assertions, not just "whatever the default happens to be":
      // hybridSearch has no server-side score_threshold of its own (RRF-fused scores
      // aren't cosine similarities), so this specifically guards the relevance-floor
      // probe in retriever.ts that gates hybrid mode behind the same tested dense
      // threshold check dense mode already passes here.
      const question =
        "Quantum chromodynamics gauge invariance and the strong nuclear force confinement hypothesis";
      const dense = await retrieve(question, { mode: "dense", collection: TEST_COLLECTION });
      const hybrid = await retrieve(question, { mode: "hybrid", collection: TEST_COLLECTION });
      expect(dense).toHaveLength(0);
      expect(hybrid).toHaveLength(0);
    },
  );

  test.skipIf(!stackUp)(
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

  test.skipIf(!stackUp)(
    "(d) mode: 'dense' and mode: 'hybrid' both find the clear match",
    async () => {
      const question = "What does the sample say about a quick brown fox?";
      const dense = await retrieve(question, { mode: "dense", collection: TEST_COLLECTION });
      const hybrid = await retrieve(question, { mode: "hybrid", collection: TEST_COLLECTION });

      expect(dense.length).toBeGreaterThan(0);
      expect(hybrid.length).toBeGreaterThan(0);
      expect(dense[0].text).toContain("quick brown fox");
      expect(hybrid[0].text).toContain("quick brown fox");
    },
  );
});