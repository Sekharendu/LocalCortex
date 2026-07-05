import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { QdrantClient } from "@qdrant/js-client-rest";
import {
  ensureCollection,
  upsertChunks,
  searchSimilar,
  deleteByDocumentId,
  type ChunkPoint,
} from "../src/retrieval/vectorStore.js";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const TEST_COLLECTION = `test-vectorstore-${process.pid}`;
const DIM = Number(process.env.OLLAMA_EMBED_DIM ?? 768);

const client = new QdrantClient({ url: QDRANT_URL, checkCompatibility: false });

let qdrantUp = false;

before(async () => {
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
    console.error("Setup failed; marking tests as skipped:", e instanceof Error ? e.message : e);
    qdrantUp = false;
  }
});

after(async () => {
  if (!qdrantUp) return;
  await client.deleteCollection(TEST_COLLECTION).catch(() => {});
});

// Build a sparse unit-ish vector at the given axis (axis < DIM). All other entries 0.
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

test("upsert + search retrieves the close-by chunk above threshold", async (t) => {
  if (!qdrantUp) { t.skip("Qdrant not reachable"); return; }
  const vA = vecAt(0);
  const vB = vecAt(1);
  const vC = (() => { const v = new Array<number>(DIM).fill(0); v[0] = 0.7; v[1] = 0.7; return v; })();
  const chunkId = (s: string) => s;
  const chunks: ChunkPoint[] = [
    { id: chunkId("a"), vector: vA, payload: { text: "alpha", source: "t.pdf", page: 1, chunkIndex: 0, documentId: "doc1" } },
    { id: chunkId("b"), vector: vB, payload: { text: "beta",  source: "t.pdf", page: 1, chunkIndex: 1, documentId: "doc1" } },
    { id: chunkId("c"), vector: vC, payload: { text: "gamma", source: "t.pdf", page: 2, chunkIndex: 2, documentId: "doc1" } },
  ];
  await upsertChunks(TEST_COLLECTION, chunks);

  const q = vecAt(0); // identical to vector A
  const hits = await searchSimilar(TEST_COLLECTION, q, { limit: 5, scoreThreshold: 0.9 });

  assert.ok(hits.length >= 1, "expected at least one hit");
  const top = hits[0];
  assert.equal(top.id, "a", "top hit should be chunk 'a' (identical vector)");
  assert.ok(top.score >= 0.99, `expected score ~1.0 for identical vectors, got ${top.score}`);
  assert.equal(top.payload?.text, "alpha");
  assert.deepEqual(top.payload?.source, "t.pdf");
  assert.equal(top.payload?.page, 1);
  assert.equal(top.payload?.chunkIndex, 0);
  console.log(`  searches -> top score=${top.score.toFixed(4)} id=${top.id} text="${top.payload?.text}"`);
});

test("search with unrelated vector + high threshold returns zero results", async (t) => {
  if (!qdrantUp) { t.skip("Qdrant not reachable"); return; }
  // Already-upserted chunks have nonzero components only on axes 0 and 1.
  // Anti-vector flips all axes so cosine similarity is <= 0 against all of them.
  const anti = new Array<number>(DIM).fill(0);
  anti[0] = -1;
  anti[1] = -1;
  for (let i = 2; i < DIM; i++) anti[i] = 1;
  // Sanity check: cosine between anti and any of vA/vB/vC is <= 0
  const vA = vecAt(0); const vB = vecAt(1);
  const vC = (() => { const v = new Array<number>(DIM).fill(0); v[0] = 0.7; v[1] = 0.7; return v; })();
  assert.ok(cosine(anti, vA) <= 0 && cosine(anti, vB) <= 0 && cosine(anti, vC) <= 0, "anti-vector sanity check");

  const hits = await searchSimilar(TEST_COLLECTION, anti, { limit: 5, scoreThreshold: 0.9 });
  assert.equal(hits.length, 0, "expected no hits at high threshold with unrelated vector");
});

test("deleteByDocumentId removes all chunks for that document", async (t) => {
  if (!qdrantUp) { t.skip("Qdrant not reachable"); return; }
  // Upsert a separate doomed document.
  const doomed: ChunkPoint[] = [
    { id: "doomed-0", vector: vecAt(50), payload: { text: "doomed one",  source: "d.pdf", page: 1, chunkIndex: 0, documentId: "doomed" } },
    { id: "doomed-1", vector: vecAt(51), payload: { text: "doomed two",  source: "d.pdf", page: 2, chunkIndex: 1, documentId: "doomed" } },
    { id: "doomed-2", vector: vecAt(52), payload: { text: "doomed three", source: "d.pdf", page: 3, chunkIndex: 2, documentId: "doomed" } },
  ];
  await upsertChunks(TEST_COLLECTION, doomed);

  // Sanity: a search matching one doomed chunk finds it.
  const before = await searchSimilar(TEST_COLLECTION, vecAt(50), { limit: 5, scoreThreshold: 0.9 });
  assert.ok(before.some((h) => h.payload?.documentId === "doomed"), "doomed chunk should be searchable before delete");

  await deleteByDocumentId(TEST_COLLECTION, "doomed");

  const after = await searchSimilar(TEST_COLLECTION, vecAt(50), { limit: 5, scoreThreshold: 0.9 });
  assert.equal(after.length, 0, "doomed chunk should be gone after delete");
  // Other documents in the collection remain.
  const doc1Hits = await searchSimilar(TEST_COLLECTION, vecAt(0), { limit: 5, scoreThreshold: 0.9 });
  assert.ok(doc1Hits.length >= 1, "doc1 chunks should survive deletion of doomed doc");
});