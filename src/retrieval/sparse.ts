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

// Standard English stopword list (the classic ~150-word set used across most IR
// tooling), minus the negation particles below -- those are handled specially by
// tokenize(), not filtered out. A too-thin stopword list lets ordinary function words
// through as if they were content terms; on a small corpus a word appearing in just a
// couple of chunks by chance gets an inflated "rare = important" IDF weight from
// Qdrant's idf modifier even though it's semantically meaningless (this caused real
// ranking regressions -- see the hybrid-search hardening plan).
const STOPWORDS = new Set([
  "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours",
  "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers",
  "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
  "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are",
  "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does",
  "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until",
  "while", "of", "at", "by", "for", "with", "about", "against", "between", "into",
  "through", "during", "before", "after", "above", "below", "to", "from", "up", "down",
  "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
  "most", "other", "some", "such", "only", "own", "same", "so", "than", "too", "very",
  "s", "t", "can", "will", "just", "should", "now", "also", "upon", "within", "per",
  "via", "let", "ought",
]);

// True negation particles that grammatically precede and modify the next word --
// handled by tokenize()'s negation-scope logic below, deliberately NOT in STOPWORDS.
const NEGATION_CUES = new Set(["not", "no", "never", "without", "cannot", "neither", "nor"]);

// Applied before word extraction so "isn't required" and "is not required" tokenize
// identically, and so the "not" cue (needed by the negation logic below) is visible as
// a whole word rather than trapped inside a contraction.
const CONTRACTION_EXPANSIONS: [RegExp, string][] = [
  [/\bisn't\b/g, "is not"],
  [/\baren't\b/g, "are not"],
  [/\bwasn't\b/g, "was not"],
  [/\bweren't\b/g, "were not"],
  [/\bdon't\b/g, "do not"],
  [/\bdoesn't\b/g, "does not"],
  [/\bdidn't\b/g, "did not"],
  [/\bcan't\b/g, "cannot"],
  [/\bwon't\b/g, "will not"],
  [/\bwouldn't\b/g, "would not"],
  [/\bshouldn't\b/g, "should not"],
  [/\bcouldn't\b/g, "could not"],
  [/\bhasn't\b/g, "has not"],
  [/\bhaven't\b/g, "have not"],
  [/\bhadn't\b/g, "had not"],
];

function expandContractions(text: string): string {
  let out = text;
  for (const [pattern, replacement] of CONTRACTION_EXPANSIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

// Plural-only light stemmer -- deliberately does NOT touch verb tense (-ed/-ing).
// A naive -ed/-ing stripper produces inconsistent stems across inflections of the same
// verb (e.g. "required" -> "requir" but "require" stays "require" -- they'd never hash
// the same), trading one mismatch bug for another. Plurals are safe and consistent:
// every regular plural collapses onto its singular, and singular forms are untouched
// since they don't match these suffix patterns.
function destem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y"; // policies -> policy
  if (word.length > 4 && /(?:ses|xes|zes|ches|shes)$/.test(word)) return word.slice(0, -2); // boxes -> box
  if (word.length > 3 && word.endsWith("s") && !/(?:ss|us|is)$/.test(word)) return word.slice(0, -1); // paychecks -> paycheck
  return word;
}

export function tokenize(text: string): string[] {
  // Strip parens rather than treating them as hard separators, so "401(k)" and "401k"
  // tokenize identically instead of the former splitting into two tokens ("401", "k").
  const normalized = expandContractions(text.toLowerCase()).replace(/[()]/g, "");
  // Split into clauses so a negation's effect can't leak across sentence/clause
  // boundaries -- "Not eligible. Contractors are eligible." must not tag the second
  // "eligible" as negated just because an earlier clause had a cue.
  const clauses = normalized.split(/[.!?,;:]+/);

  const tokens: string[] = [];
  for (const clause of clauses) {
    const words = clause.match(/[a-z0-9]+/g) ?? [];
    let negationBudget = 0;
    for (const word of words) {
      if (NEGATION_CUES.has(word)) {
        // Scope = 1: only the single next content word is tagged. A wider window was
        // considered and rejected -- tracing "not eligible for the 401k match" through
        // a 3-word window also tagged "401k" and "match" as negated, which would have
        // broken normal topical retrieval for those terms entirely.
        negationBudget = 1;
        continue;
      }
      if (word.length <= 1 || STOPWORDS.has(word)) continue; // stopwords don't consume budget, aren't emitted
      const stemmed = destem(word);
      if (negationBudget > 0) {
        tokens.push(`not_${stemmed}`);
        negationBudget--;
      } else {
        tokens.push(stemmed);
      }
    }
  }
  return tokens;
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
