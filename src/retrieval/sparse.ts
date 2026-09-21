// BM25-inspired sparse vector encoder for hybrid search. Pure/local -- unlike dense
// embedding, computing a sparse vector makes zero network calls.
//
// Term -> index mapping uses feature hashing (a stable hash of each token, reduced mod
// a fixed range) instead of a growing vocabulary table. This keeps encoding stateless:
// ingest and query never need to read or update a shared vocabulary file. Collisions
// between unrelated terms are possible but rare at this corpus's scale, and only blur
// two terms' weights together rather than corrupting retrieval.
//
// This file computes the term-frequency (TF) half of BM25 only. The IDF half is applied
// by Qdrant server-side via the sparse vector field's `modifier: "idf"` (collection-wide
// term statistics, tracked automatically as points are inserted/deleted) -- see
// vectorStore.ts's ensureCollection. TF here uses BM25's standard saturation + document
// length normalization (k1=1.2, b=0.75, Okapi BM25 defaults); the corpus average
// document length it needs comes from sparseStats.ts.

const K1 = 1.2;
const B = 0.75;

// Filtering common function words keeps sparse vectors focused on content terms. Their
// IDF would be near-zero anyway once Qdrant's idf modifier is applied, but skipping them
// keeps vectors smaller and avoids wasted prefetch candidates.
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "in",
  "is", "it", "its", "of", "on", "or", "that", "the", "to", "was", "were", "will", "with",
]);

export function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return raw.filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// FNV-1a, 32-bit, reduced to a fixed non-negative range so it's a stable, stateless
// term -> sparse-vector-index mapping.
const HASH_RANGE = 2 ** 24;

export function hashTerm(term: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < term.length; i++) {
    hash ^= term.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % HASH_RANGE;
}

export interface SparseVector {
  indices: number[];
  values: number[];
}

/**
 * Encode text into a BM25 term-frequency sparse vector. Used identically at ingest time
 * (per chunk, against the corpus avgDocLength) and at query time (per question, against
 * the same avgDocLength so index-time and query-time vectors are computed consistently).
 * Returns an empty sparse vector for text with no content tokens (e.g. a stopword-only
 * query) -- callers should treat that as "no sparse signal" rather than an error.
 */
export function sparseVectorFor(text: string, avgDocLength: number): SparseVector {
  const tokens = tokenize(text);
  if (tokens.length === 0) return { indices: [], values: [] };

  const termFreq = new Map<number, number>();
  for (const token of tokens) {
    const idx = hashTerm(token);
    termFreq.set(idx, (termFreq.get(idx) ?? 0) + 1);
  }

  const lengthNorm = 1 - B + B * (tokens.length / Math.max(avgDocLength, 1));
  const indices: number[] = [];
  const values: number[] = [];
  for (const [idx, tf] of termFreq) {
    const value = (tf * (K1 + 1)) / (tf + K1 * lengthNorm);
    indices.push(idx);
    values.push(value);
  }
  return { indices, values };
}
