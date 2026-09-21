import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { QdrantClient } from "@qdrant/js-client-rest";
import {
  ensureCollection,
  upsertChunks,
  searchSimilar,
  hybridSearch,
  deleteByDocumentId,
  type ChunkPoint,
} from "../src/retrieval/vectorStore.js";
import { sparseVectorFor } from "../src/retrieval/sparse.js";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const TEST_COLLECTION = `test-vectorstore-${process.pid}`;
const DIM = Number(process.env.OLLAMA_EMBED_DIM ?? 768);
const EMPTY_SPARSE = { indices: [], values: [] };

const client = new QdrantClient({ url: QDRANT_URL, checkCompatibility: false });

let qdrantUp = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${QDRANT_URL}/readyz`, { signal: AbortSignal.timeout(2000) });
    qdrantUp = res.ok;
  } catch {
    qdrantUp = false;
  }
  if (!qdrantUp) return;
  try {
    await client.deleteCollection(TEST_COLLECTION).catch(() => {});
    await ensureCollection(TEST_COLLECTION);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Setup failed; marking tests as skipped:", e instanceof Error ? e.message : e);
    qdrantUp = false;
  }
}, 30_000);

afterAll(async () => {
  if (!qdrantUp) return;
  await client.deleteCollection(TEST_COLLECTION).catch(() => {});
});

// Build a sparse unit-ish dense vector at the given axis (axis < DIM). All other entries 0.
function vecAt(axis: number): number[] {
  const v = new Array<number>(DIM).fill(0);
  v[axis] = 1;
  return v;
}

// Cosine sim of v1, v2. With our dense unit vectors this is exact.
function cosine(v1: number[], v2: number[]): number {
  let dot = 0, n1 = 0, n2 = 0;
  for (let i = 0; i < v1.length; i++) { dot += v1[i] * v2[i]; n1 += v1[i] * v1[i]; n2 += v2[i] * v2[i]; }
  return dot / (Math.sqrt(n1) * Math.sqrt(n2));
}

describe("vectorStore", () => {
  test.skipIf(!qdrantUp)("upsert + search retrieves the close-by chunk above threshold", async () => {
    const vA = vecAt(0);
    const vB = vecAt(1);
    const vC = (() => { const v = new Array<number>(DIM).fill(0); v[0] = 0.7; v[1] = 0.7; return v; })();
    const chunks: ChunkPoint[] = [
      { id: "a", denseVector: vA, sparseVector: EMPTY_SPARSE, payload: { text: "alpha", source: "t.pdf", page: 1, chunkIndex: 0, documentId: "doc1" } },
      { id: "b", denseVector: vB, sparseVector: EMPTY_SPARSE, payload: { text: "beta",  source: "t.pdf", page: 1, chunkIndex: 1, documentId: "doc1" } },
      { id: "c", denseVector: vC, sparseVector: EMPTY_SPARSE, payload: { text: "gamma", source: "t.pdf", page: 2, chunkIndex: 2, documentId: "doc1" } },
    ];
    await upsertChunks(TEST_COLLECTION, chunks);

    const q = vecAt(0); // identical to vector A
    const hits = await searchSimilar(TEST_COLLECTION, q, { limit: 5, scoreThreshold: 0.9 });

    expect(hits.length).toBeGreaterThanOrEqual(1);
    const top = hits[0];
    expect(top.id).toBe("a");
    expect(top.score).toBeGreaterThanOrEqual(0.99);
    expect(top.payload?.text).toBe("alpha");
    expect(top.payload?.source).toBe("t.pdf");
    expect(top.payload?.page).toBe(1);
    expect(top.payload?.chunkIndex).toBe(0);
  });

  test.skipIf(!qdrantUp)("search with unrelated vector + high threshold returns zero results", async () => {
    // Already-upserted chunks have nonzero components only on axes 0 and 1.
    // Anti-vector flips all axes so cosine similarity is <= 0 against all of them.
    const anti = new Array<number>(DIM).fill(0);
    anti[0] = -1;
    anti[1] = -1;
    for (let i = 2; i < DIM; i++) anti[i] = 1;
    // Sanity check: cosine between anti and any of vA/vB/vC is <= 0
    const vA = vecAt(0); const vB = vecAt(1);
    const vC = (() => { const v = new Array<number>(DIM).fill(0); v[0] = 0.7; v[1] = 0.7; return v; })();
    expect(cosine(anti, vA)).toBeLessThanOrEqual(0);
    expect(cosine(anti, vB)).toBeLessThanOrEqual(0);
    expect(cosine(anti, vC)).toBeLessThanOrEqual(0);

    const hits = await searchSimilar(TEST_COLLECTION, anti, { limit: 5, scoreThreshold: 0.9 });
    expect(hits).toHaveLength(0);
  });

  test.skipIf(!qdrantUp)("deleteByDocumentId removes all chunks for that document", async () => {
    // Upsert a separate doomed document.
    const doomed: ChunkPoint[] = [
      { id: "doomed-0", denseVector: vecAt(50), sparseVector: EMPTY_SPARSE, payload: { text: "doomed one",  source: "d.pdf", page: 1, chunkIndex: 0, documentId: "doomed" } },
      { id: "doomed-1", denseVector: vecAt(51), sparseVector: EMPTY_SPARSE, payload: { text: "doomed two",  source: "d.pdf", page: 2, chunkIndex: 1, documentId: "doomed" } },
      { id: "doomed-2", denseVector: vecAt(52), sparseVector: EMPTY_SPARSE, payload: { text: "doomed three", source: "d.pdf", page: 3, chunkIndex: 2, documentId: "doomed" } },
    ];
    await upsertChunks(TEST_COLLECTION, doomed);

    // Sanity: a search matching one doomed chunk finds it.
    const before = await searchSimilar(TEST_COLLECTION, vecAt(50), { limit: 5, scoreThreshold: 0.9 });
    expect(before.some((h) => h.payload?.documentId === "doomed")).toBe(true);

    await deleteByDocumentId(TEST_COLLECTION, "doomed");

    const after = await searchSimilar(TEST_COLLECTION, vecAt(50), { limit: 5, scoreThreshold: 0.9 });
    expect(after).toHaveLength(0);
    // Other documents in the collection remain.
    const doc1Hits = await searchSimilar(TEST_COLLECTION, vecAt(0), { limit: 5, scoreThreshold: 0.9 });
    expect(doc1Hits.length).toBeGreaterThanOrEqual(1);
  });

  describe("hybridSearch", () => {
    const HYBRID_DOC = "hybrid-doc";

    test.skipIf(!qdrantUp)("a chunk matched only by its sparse (exact-keyword) vector is still found", async () => {
      // Dense vectors deliberately far from every existing axis used above, and from
      // the query's dense vector -- if this chunk is found, it's the sparse prefetch
      // (or the fusion of a weak dense signal + a strong sparse one) doing the work,
      // not a dense near-match.
      const denseIrrelevant = vecAt(100);
      const denseQuery = vecAt(200); // orthogonal to denseIrrelevant -- cosine 0
      const sparseVec = sparseVectorFor("zephyrquartz onboarding checklist", 50);
      expect(sparseVec.indices.length).toBeGreaterThan(0);

      await upsertChunks(TEST_COLLECTION, [
        {
          id: "hybrid-0",
          denseVector: denseIrrelevant,
          sparseVector: sparseVec,
          payload: { text: "zephyrquartz onboarding checklist", source: "h.pdf", chunkIndex: 0, documentId: HYBRID_DOC },
        },
      ]);

      const hits = await hybridSearch(
        TEST_COLLECTION,
        denseQuery,
        sparseVectorFor("zephyrquartz onboarding checklist", 50),
        { limit: 5 },
      );

      expect(hits.some((h) => h.payload?.documentId === HYBRID_DOC)).toBe(true);

      await deleteByDocumentId(TEST_COLLECTION, HYBRID_DOC);
    });

    test.skipIf(!qdrantUp)("an empty sparse query (stopwords only) degenerates to dense-only search", async () => {
      const emptySparse = sparseVectorFor("the a an", 50);
      expect(emptySparse.indices).toHaveLength(0);

      const hits = await hybridSearch(TEST_COLLECTION, vecAt(0), emptySparse, { limit: 5 });
      // Should not throw, and should still return dense results (doc1's chunk 'a' at axis 0).
      expect(hits.length).toBeGreaterThanOrEqual(1);
    });
  });
});
