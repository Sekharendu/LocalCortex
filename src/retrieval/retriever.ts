import { embed } from "./embedder.js";
import { searchSimilar, hybridSearch } from "./vectorStore.js";
import { sparseVectorFor } from "./sparse.js";
import { getAvgDocLength } from "./sparseStats.js";
import { expandAcronyms } from "./acronyms.js";
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
  /** "hybrid" (default, per retrievalConfig.mode) fuses dense+sparse via Qdrant's RRF;
   * "dense" reproduces pure cosine-similarity search -- mainly useful for A/B comparing
   * against a pre-hybrid baseline (see scripts/evaluate-retrieval.ts's --mode flag).
   * Note: scoreThreshold is ignored in hybrid mode -- RRF-fused scores aren't cosine
   * similarities, so the threshold default (tuned for dense) doesn't carry over. */
  mode?: "dense" | "hybrid";
}

/**
 * Retrieve the top-K passages most relevant to a natural-language question.
 *
 * 1. Embed the question with the SAME embedder used at ingestion time (so query and
 *    chunk vectors live in the same space -- a model swap silently breaks retrieval
 *    otherwise). In hybrid mode, also compute the question's BM25-ish sparse vector
 *    (pure/local, no network call).
 * 2. Delegate to searchSimilar (dense) or hybridSearch (dense+sparse RRF, fused
 *    server-side by Qdrant).
 * 3. Return RetrievedChunk[] sorted by score descending.
 *
 * Empty result semantics: when nothing clears the threshold (dense mode) or nothing is
 * retrieved (hybrid mode), an empty array is returned. The generation step decides what
 * to do with an empty context, not this function -- we do NOT fabricate a low-confidence
 * chunk, do NOT throw on empty, do NOT relax the threshold silently.
 *
 * Infrastructure failures (Ollama down, Qdrant down, dimension mismatch) -- these are
 * NOT "no relevant chunks" situations and DO propagate as typed errors EmbeddingError
 * / CollectionError. A down Qdrant is a different failure mode from "no match above
 * threshold" and silently returning [] would make the LLM hallucinate with no signal.
 *
 * Hybrid mode's relevance floor: RRF-fused scores aren't cosine similarities, so
 * hybridSearch can't apply effectiveThreshold directly -- left unchecked it would
 * always return up to topK results even for a completely off-topic question, breaking
 * the hallucination-safety guarantee dense mode provides via scoreThreshold. Instead of
 * inventing a new (unvalidated) RRF cutoff number, a cheap limit:1 dense probe using
 * the SAME tested threshold decides whether anything relevant exists at all before a
 * full hybrid query is even attempted; a miss short-circuits straight to [].
 */
export async function retrieve(
  question: string,
  { topK, scoreThreshold, collection, mode }: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const effectiveTopK = topK ?? retrievalConfig.topK;
  const effectiveThreshold = scoreThreshold ?? retrievalConfig.scoreThreshold;
  const effectiveCollection = collection ?? retrievalConfig.collection;
  const effectiveMode = mode ?? retrievalConfig.mode;

  // Expand known abbreviations (PTO, WFH, ...) before embedding/encoding -- sparse
  // retrieval structurally can't bridge a term that never appears in the corpus, and
  // the expansion helps dense's semantic match too. See acronyms.ts.
  const expandedQuestion = expandAcronyms(question);
  const queryVector = await embed(expandedQuestion);

  let hits;
  if (effectiveMode === "dense") {
    hits = await searchSimilar(effectiveCollection, queryVector, {
      limit: effectiveTopK,
      scoreThreshold: effectiveThreshold,
    });
  } else {
    const probe = await searchSimilar(effectiveCollection, queryVector, {
      limit: 1,
      scoreThreshold: effectiveThreshold,
    });
    hits =
      probe.length === 0
        ? []
        : await hybridSearch(
            effectiveCollection,
            queryVector,
            sparseVectorFor(expandedQuestion, await getAvgDocLength()),
            { limit: effectiveTopK, fusion: retrievalConfig.fusion },
          );
  }

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
