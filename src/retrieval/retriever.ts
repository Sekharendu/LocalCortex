import { embed } from "./embedder.js";
import { searchSimilar } from "./vectorStore.js";
import { retrievalConfig } from "../config.js";
import type { ChunkPayload } from "../types.js";

/**
 * A retrieved passage surfaced to the generation layer. Narrower than the vector
 * store's SearchMatch -- Qdrant's internal point id / version / shard metadata is
 * dropped here, so the prompt builder never imports Qdrant types and stays decoupled
 * from the storage backend.
 */
export interface RetrievedChunk {
  text: string;
  source: string;
  page?: number;
  score: number;
}

export interface RetrieveOptions {
  topK?: number;
  scoreThreshold?: number;
  collection?: string;
}

/**
 * Retrieve the top-K passages most relevant to a natural-language question.
 *
 * 1. Embed the question with the SAME embedder used at ingestion time (so query and
 *    chunk vectors live in the same space -- a model swap silently breaks retrieval
 *    otherwise).
 * 2. Delegate to searchSimilar, which applies the score threshold SERVER-SIDE in
 *    Qdrant (cheaper than client-side post-filtering).
 * 3. Return RetrievedChunk[] sorted by score descending.
 *
 * Empty result semantics: when nothing clears the threshold, Qdrant returns an empty
 * array and so do we. The generation step decides what to do with an empty context,
 * not this function -- we do NOT fabricate a low-confidence chunk, do NOT throw on
 * empty, do NOT relax the threshold silently.
 *
 * Infrastructure failures (Ollama down, Qdrant down, dimension mismatch) -- these are
 * NOT "no relevant chunks" situations and DO propagate as typed errors EmbeddingError
 * / CollectionError. A down Qdrant is a different failure mode from "no match above
 * threshold" and silently returning [] would make the LLM hallucinate with no signal.
 */
export async function retrieve(
  question: string,
  { topK, scoreThreshold, collection }: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const effectiveTopK = topK ?? retrievalConfig.topK;
  const effectiveThreshold = scoreThreshold ?? retrievalConfig.scoreThreshold;
  const effectiveCollection = collection ?? retrievalConfig.collection;

  const queryVector = await embed(question);

  const hits = await searchSimilar(effectiveCollection, queryVector, {
    limit: effectiveTopK,
    scoreThreshold: effectiveThreshold,
  });

  const chunks: RetrievedChunk[] = hits.map((h) => {
    const payload = (h.payload ?? {}) as Partial<ChunkPayload>;
    return {
      text: payload.text ?? "",
      source: payload.source ?? "",
      page: payload.page,
      score: h.score,
    };
  });

  // Defensive sort: Qdrant already returns scored results in descending order, but
  // we sort again to guarantee the contract from this layer independent of SDK quirks
  // or future filter reshuffles. Cheaper than trusting and cheaper than debugging a
  // hallucination caused by an unsorted top-K reaching the prompt builder.
  chunks.sort((a, b) => b.score - a.score);
  return chunks;
}