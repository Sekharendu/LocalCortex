import { QdrantClient } from "@qdrant/js-client-rest";
import { CollectionError } from "../errors.js";
import { embedConfig } from "../config.js";
import type { ChunkPayload } from "../types.js";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";

const client = new QdrantClient({ url: QDRANT_URL, checkCompatibility: false });

/** A chunk ready to be upserted into a Qdrant collection. */
export interface ChunkPoint {
  id: string;
  vector: number[];
  payload: ChunkPayload;
}

/** A search hit returned by searchSimilar. */
export interface SearchMatch {
  id: string | number;
  score: number;
  payload: ChunkPayload | null;
}

export interface SearchOptions {
  limit?: number;
  scoreThreshold?: number;
}

/**
 * Create the Qdrant collection if it does not already exist. Idempotent and safe to
 * call on every boot. Vector size defaults to OLLAMA_EMBED_DIM (768) and distance is
 * Cosine -- matching nomic-embed-text and the spec.
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
      vectors: { size: embedConfig.dim, distance: "Cosine" },
    });
  } catch (e) {
    throw new CollectionError(`Failed to ensure collection '${name}'`, { cause: e });
  }
}

/**
 * Upsert an array of chunked points into a collection. Blocks until indexing is
 * committed (wait: true) so the chunks are searchable the moment this returns.
 * Validates every vector's dimension against OLLAMA_EMBED_DIM as a cross-layer
 * integrity gate -- catches a silent model-swap mismatch before garbage is written.
 */
export async function upsertChunks(collection: string, chunks: ChunkPoint[]): Promise<void> {
  if (chunks.length === 0) return;
  for (const c of chunks) {
    if (!Array.isArray(c.vector) || c.vector.length !== embedConfig.dim) {
      const got = Array.isArray(c.vector) ? c.vector.length : typeof c.vector;
      throw new CollectionError(
        `Vector size mismatch in upsert: chunk chunkIndex=${c.payload.chunkIndex} ` +
          `documentId=${c.payload.documentId} has dim ${got}, expected ${embedConfig.dim}. ` +
          `If you changed OLLAMA_EMBED_MODEL, also set OLLAMA_EMBED_DIM to match.`,
      );
    }
  }
  const points = chunks.map((c) => ({
    id: c.id,
    vector: c.vector,
    payload: c.payload as unknown as Record<string, unknown>,
  }));
  try {
    await client.upsert(collection, { points, wait: true });
  } catch (e) {
    throw new CollectionError(`Failed to upsert ${points.length} chunks into '${collection}'`, { cause: e });
  }
}

/**
 * Search a collection for the nearest neighbors of `queryVector`, filtered
 * server-side by `scoreThreshold` and capped at `limit`. The threshold is applied
 * inside Qdrant (not post-filtered by the caller, per the spec) which short-circuits
 * the HNSW traversal below the threshold -- cheaper than client-side filtering.
 */
export async function searchSimilar(
  collection: string,
  queryVector: number[],
  { limit = 5, scoreThreshold = 0.7 }: SearchOptions = {},
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
      limit,
      score_threshold: scoreThreshold,// passing the threshold to the qdrant server-> to ignore the graph nodes and skip distance computations that falls below threshold.
      // Other opt was to bring all the relevant datas in the client side then filtering, but that will be less computatievely optimise. cuz we fetch all, bring all from server to client then throw the irrelevant ones off. 
      with_payload: true,
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
 * Delete every point in the collection whose payload.documentId matches the given
 * id. Blocks until the delete is committed (wait: true) so a follow-up re-ingest of
 * the same documentId does not race the tombstone.
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