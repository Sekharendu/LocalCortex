import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { QdrantClient } from "@qdrant/js-client-rest";
import { ingestDocument } from "../src/ingest/pipeline.js";
import { embed } from "../src/retrieval/embedder.js";
import { searchSimilar, deleteByDocumentId } from "../src/retrieval/vectorStore.js";
import { stackUp } from "./helpers/stack.js";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const TEST_COLLECTION = `pipeline-test-${process.pid}`;

const client = new QdrantClient({ url: QDRANT_URL, checkCompatibility: false });

beforeAll(async () => {
  if (!stackUp) return;
  await client.deleteCollection(TEST_COLLECTION).catch(() => {});
}, 30_000);

afterAll(async () => {
  if (!stackUp) return;
  await client.deleteCollection(TEST_COLLECTION).catch(() => {});
});

describe("ingestDocument", () => {
  test.skipIf(!stackUp)("ingests sample.txt end-to-end and chunkCount > 0",
    async () => {
      const result = await ingestDocument("data/sample.txt", {
        strategy: "recursive",
        collection: TEST_COLLECTION,
      });

      expect(result.success).toBe(true);

      if (!result.success) return; // type narrow
      expect(result.chunkCount).toBeGreaterThan(0);

      // Follow-up search: embed a phrase known to be in data/sample.txt and verify a hit
      // returns a chunk whose text contains that phrase.
      const query = "The quick brown fox jumps over the lazy dog";
      const qVec = await embed(query);
      const hits = await searchSimilar(TEST_COLLECTION, qVec, { scoreThreshold: 0.5, limit: 5 });

      expect(hits.length).toBeGreaterThanOrEqual(1);
      const foundPhrase = hits.some((h) => (h.payload?.text ?? "").includes("quick brown fox"));
      expect(foundPhrase).toBe(true);

      // Sanity: each upserted point carries both a dense and a non-trivial sparse
      // vector (pipeline.ts's embed stage computes both), not just the dense one.
      const scrolled = await client.scroll(TEST_COLLECTION, {
        filter: { must: [{ key: "documentId", match: { value: result.documentId } }] },
        with_vector: true,
        limit: 1,
      });
      const point = scrolled.points[0];
      expect(point).toBeDefined();
      const vector = point.vector as Record<string, unknown>;
      expect(Array.isArray(vector.dense)).toBe(true);
      const sparse = vector.sparse as { indices: number[]; values: number[] };
      expect(sparse.indices.length).toBeGreaterThan(0);

      // Cleanup: remove the ingested document's chunks so test reruns don't accumulate.
      await deleteByDocumentId(TEST_COLLECTION, result.documentId);
    },
    120_000,
  );

  test("returns a typed load-stage failure for a missing file", async () => {
    // This test does not need the live stack -- load failure is local I/O.
    const result = await ingestDocument("data/does-not-exist.txt", {
      collection: TEST_COLLECTION,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe("load");
    expect(result.error.length).toBeGreaterThan(0);
  });
});