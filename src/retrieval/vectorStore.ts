import { QdrantClient } from "@qdrant/js-client-rest";
import { CollectionError } from "../errors.js";
import { embedConfig } from "../config.js";
import type { ChunkPayload } from "../types.js";
import type { SparseVector } from "./sparse.js";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";

const client = new QdrantClient({ url: QDRANT_URL, checkCompatibility: false });

/** Named-vector field names used on every point -- dense (Ollama embedding) and sparse
 * (BM25-ish, see sparse.ts). Named vectors (rather than a single unnamed default) are
 * what let one Qdrant point carry both and one query fuse across them. */
export const DENSE_VECTOR_NAME = "dense";
export const SPARSE_VECTOR_NAME = "sparse";

/** A chunk ready to be upserted into a Qdrant collection. */
export interface ChunkPoint {
  id: string;
  denseVector: number[];
  sparseVector: SparseVector;
  payload: ChunkPayload;
}

/** A search hit returned by searchSimilar / hybridSearch. */
export interface SearchMatch {
  id: string | number;
  score: number;
  payload: ChunkPayload | null;
}

export interface SearchOptions {
  limit?: number;
  scoreThreshold?: number;
  /** Only search chunks of this document. */
  documentId?: string;
}

export interface HybridSearchOptions {
  limit?: number;
  /** Candidates each of the dense/sparse prefetches ranks before fusion. Defaults to
   * max(20, limit * 4) -- Qdrant recommends prefetching meaningfully more than the
   * final limit so RRF has enough candidates from each side to actually fuse. */
  prefetchLimit?: number;
  /** Relative RRF weight for [dense, sparse] when both prefetches are present. Defaults
   * to [2, 1] -- dense alone was already reliable on this corpus; weighting sparse down
   * makes it act as a tie-breaker / rescue signal rather than an equal vote that can
   * outrank a correct dense top-1 result purely on sparse noise (see the hybrid-search
   * hardening plan's Tier 2 -- observed regression on `paraphrase-no-overlap` questions
   * before this was added). Only applies to "rrf" -- Qdrant's DBSF takes no weights. */
  weights?: [number, number];
  /** "rrf" fuses by rank position only, discarding how confident each side was.
   * "dbsf" (distribution-based score fusion) normalizes each prefetch's scores and sums
   * the magnitudes, so a narrow dense lead or a weak one-word sparse match is weighed
   * as such instead of as a flat "rank 1 vs rank 2". */
  fusion?: "rrf" | "dbsf";
}

/**
 * Create the Qdrant collection if it does not already exist. Idempotent and safe to
 * call on every boot. Two named vectors per point: `dense` (size OLLAMA_EMBED_DIM,
 * Cosine distance -- matching nomic-embed-text) and `sparse` (BM25-ish term-frequency
 * vectors from sparse.ts, with Qdrant's `idf` modifier applying the IDF half of BM25
 * automatically from collection-wide term statistics it tracks itself).
 *
 * Note: if filter performance on `documentId` becomes an issue at scale, add a
 * payload keyword index here:
 *   `client.createPayloadIndex(name, { field_name: "documentId", field_schema: "keyword" })`
 * Skipped for now as a premature optimization; Qdrant filters without an index too.
 */
export async function ensureCollection(name: string): Promise<void> {
  try {
    const exists = await client.collectionExists(name);
    if (exists.exists === true) return;
    await client.createCollection(name, {
      vectors: { [DENSE_VECTOR_NAME]: { size: embedConfig.dim, distance: "Cosine" } },
      sparse_vectors: { [SPARSE_VECTOR_NAME]: { modifier: "idf" } },
    });
  } catch (e) {
    throw new CollectionError(`Failed to ensure collection '${name}'`, { cause: e });
  }
}

/**
 * Upsert an array of chunked points into a collection. Blocks until indexing is
 * committed (wait: true) so the chunks are searchable the moment this returns.
 * Validates every dense vector's dimension against OLLAMA_EMBED_DIM as a cross-layer
 * integrity gate -- catches a silent model-swap mismatch before garbage is written.
 * Sparse vectors are variable-length by nature (one entry per distinct term) so there's
 * no analogous dimension to check.
 */
export async function upsertChunks(collection: string, chunks: ChunkPoint[]): Promise<void> {
  if (chunks.length === 0) return;
  for (const c of chunks) {
    if (!Array.isArray(c.denseVector) || c.denseVector.length !== embedConfig.dim) {
      const got = Array.isArray(c.denseVector) ? c.denseVector.length : typeof c.denseVector;
      throw new CollectionError(
        `Vector size mismatch in upsert: chunk chunkIndex=${c.payload.chunkIndex} ` +
          `documentId=${c.payload.documentId} has dim ${got}, expected ${embedConfig.dim}. ` +
          `If you changed OLLAMA_EMBED_MODEL, also set OLLAMA_EMBED_DIM to match.`,
      );
    }
  }
  const points = chunks.map((c) => ({
    id: c.id,
    vector: {
      [DENSE_VECTOR_NAME]: c.denseVector,
      [SPARSE_VECTOR_NAME]: c.sparseVector,
    },
    payload: c.payload as unknown as Record<string, unknown>,
  }));
  try {
    await client.upsert(collection, { points, wait: true });
  } catch (e) {
    throw new CollectionError(`Failed to upsert ${points.length} chunks into '${collection}'`, { cause: e });
  }
}

/**
 * Dense-only search: nearest neighbors of `queryVector` on the `dense` named vector,
 * filtered server-side by `scoreThreshold` and capped at `limit`. The threshold is
 * applied inside Qdrant (not post-filtered by the caller) which short-circuits the HNSW
 * traversal below the threshold -- cheaper than client-side filtering. Kept alongside
 * hybridSearch so callers (and the eval script) can reproduce pure-dense retrieval for
 * comparison -- see retriever.ts's `mode` option.
 */
export async function searchSimilar(
  collection: string,
  queryVector: number[],
  { limit = 5, scoreThreshold = 0.7, documentId }: SearchOptions = {},
): Promise<SearchMatch[]> {
  if (!Array.isArray(queryVector) || queryVector.length !== embedConfig.dim) {
    const got = Array.isArray(queryVector) ? queryVector.length : typeof queryVector;
    throw new CollectionError(
      `queryVector dim ${got} does not match collection size ${embedConfig.dim}. ` +
        `If you changed OLLAMA_EMBED_MODEL, also set OLLAMA_EMBED_DIM.`,
    );
  }
  let hits;
  try {
    hits = await client.query(collection, {
      query: queryVector,
      using: DENSE_VECTOR_NAME,
      limit,
      score_threshold: scoreThreshold,// passing the threshold to the qdrant server-> to ignore the graph nodes and skip distance computations that falls below threshold.
      // Other opt was to bring all the relevant datas in the client side then filtering, but that will be less computatievely optimise. cuz we fetch all, bring all from server to client then throw the irrelevant ones off.
      with_payload: true,
      ...(documentId ? { filter: { must: [{ key: "documentId", match: { value: documentId } }] } } : {}),
    });
  } catch (e) {
    throw new CollectionError(`Failed to search '${collection}'`, { cause: e });
  }
  return hits.points.map((h) => ({
    id: h.id as string | number,
    score: h.score,
    payload: (h.payload as unknown as ChunkPayload | null | undefined) ?? null,
  }));
}

/**
 * Hybrid search: one Qdrant call that prefetches candidates from both the `dense` and
 * `sparse` named vectors, then fuses the two rankings server-side with Reciprocal Rank
 * Fusion (RRF, Qdrant defaults: k=60, prefetches weighted equally).
 *
 * No score_threshold here -- RRF-fused scores are reciprocal-rank based, not cosine
 * similarities, so the existing threshold default (tuned for dense cosine scores) does
 * not carry over meaningfully. Hybrid mode is topK-only for v1; a hybrid-appropriate
 * threshold can be calibrated later once real RRF score distributions have been
 * observed from actual eval runs.
 *
 * If the sparse vector has no terms (e.g. a stopword-only query), the sparse prefetch
 * is skipped and this degenerates to a plain dense search -- an empty sparse query is a
 * realistic input, not an error condition.
 */
export async function hybridSearch(
  collection: string,
  denseVector: number[],
  sparseVector: SparseVector,
  { limit = 5, prefetchLimit, weights, fusion = "rrf" }: HybridSearchOptions = {},
): Promise<SearchMatch[]> {
  if (!Array.isArray(denseVector) || denseVector.length !== embedConfig.dim) {
    const got = Array.isArray(denseVector) ? denseVector.length : typeof denseVector;
    throw new CollectionError(
      `queryVector dim ${got} does not match collection size ${embedConfig.dim}. ` +
        `If you changed OLLAMA_EMBED_MODEL, also set OLLAMA_EMBED_DIM.`,
    );
  }
  const effectivePrefetchLimit = prefetchLimit ?? Math.max(20, limit * 4);

  const prefetch: { query: number[] | SparseVector; using: string; limit: number }[] = [
    { query: denseVector, using: DENSE_VECTOR_NAME, limit: effectivePrefetchLimit },
  ];
  if (sparseVector.indices.length > 0) {
    prefetch.push({ query: sparseVector, using: SPARSE_VECTOR_NAME, limit: effectivePrefetchLimit });
  }
  // Weights only make sense when there are two prefetches to weigh against each other;
  // a lone dense prefetch (sparse query was empty) just needs plain unweighted fusion.
  const fusionQuery =
    fusion === "dbsf"
      ? { fusion: "dbsf" as const }
      : prefetch.length > 1
        ? { rrf: { weights: weights ?? [2, 1] } }
        : { fusion: "rrf" as const };

  let hits;
  try {
    hits = await client.query(collection, {
      prefetch,
      query: fusionQuery,
      limit,
      with_payload: true,
    });
  } catch (e) {
    throw new CollectionError(`Failed hybrid search on '${collection}'`, { cause: e });
  }
  return hits.points.map((h) => ({
    id: h.id as string | number,
    score: h.score,
    payload: (h.payload as unknown as ChunkPayload | null | undefined) ?? null,
  }));
}

/**
 * Delete every point in the collection whose payload.documentId matches the given
 * id. Blocks until the delete is committed (wait: true) so a follow-up re-ingest of
 * the same documentId does not race the tombstone. A point carries both its dense and
 * sparse vectors, so deleting it removes both together -- no separate sparse-index sync
 * to worry about.
 */
export async function deleteByDocumentId(collection: string, documentId: string): Promise<void> {
  try {
    await client.delete(collection, {
      filter: {
        must: [{ key: "documentId", match: { value: documentId } }],
      },
      wait: true,
    });
  } catch (e) {
    throw new CollectionError(`Failed to delete documentId='${documentId}' from '${collection}'`, { cause: e });
  }
}

/** Number of points (chunks) in the collection that belong to `documentId`. */
export async function countByDocumentId(collection: string, documentId: string): Promise<number> {
  try {
    const { count } = await client.count(collection, {
      filter: { must: [{ key: "documentId", match: { value: documentId } }] },
      exact: true,
    });
    return count;
  } catch (e) {
    throw new CollectionError(`Failed to count documentId='${documentId}' in '${collection}'`, { cause: e });
  }
}

export async function listCollections(): Promise<string[]> {
  try {
    return (await client.getCollections()).collections.map((c) => c.name);
  } catch (e) {
    throw new CollectionError("Failed to list collections", { cause: e });
  }
}

/** Every distinct payload.documentId in the collection, with its point count (scrolls all points). */
export async function documentIdCounts(collection: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    let offset: string | number | null | undefined = undefined;
    do {
      const page: Awaited<ReturnType<typeof client.scroll>> = await client.scroll(collection, {
        limit: 256,
        offset,
        with_payload: ["documentId"],
        with_vector: false,
      });
      for (const p of page.points) {
        const id = (p.payload as { documentId?: unknown } | null)?.documentId;
        if (typeof id === "string") counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      offset = page.next_page_offset as string | number | null | undefined;
    } while (offset !== null && offset !== undefined);
  } catch (e) {
    throw new CollectionError(`Failed to scan documentIds in '${collection}'`, { cause: e });
  }
  return counts;
}
