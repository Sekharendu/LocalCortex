import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Chunk } from "../types.js";
import { embedBatch } from "../retrieval/embedder.js";

/**
 * Default strategy for a mixed corpus of PDFs and markdown docs:
 * `chunkRecursive` with `maxSize ≈ 500` characters.
 *
 * Why recursive over the other two:
 *  - `fixed` is naive about structure. It treats the whole text as a flat stream
 *    of words and cuts on a count, so a chunk routinely begins mid-sentence or
 *    ends mid-sentence, splitting a citation in half. For homogeneous plain text
 *    that's tolerable; for Markdown headings and PDF section breaks it loses the
 *    one piece of metadata (which section am I in?) that retrieval cares about.
 *  - `semantic` uses cosine similarity between sentence embeddings to detect topic
 *    boundaries. It makes one `embedBatch()` call per document, which is significantly
 *    more expensive than `fixed` or `recursive` (those make zero embedding calls).
 *    The trade-off is genuine topic-gap detection instead of structural-separator
 *    detection. Only use `semantic` when topic boundaries matter more than ingestion
 *    throughput.
 *  - `recursive` asks the splitter to try structural separators in priority order
 *    (markdown section heading -> blank-line paragraph -> newline -> sentence
 *    terminator -> word -> char). A unit is only split by a smaller-grain
 *    separator when it is genuinely too big to keep intact. That keeps sections
 *    and paragraphs whole when they fit, degrades to sentences for the awkward
 *    oversized-paragraph case, and only falls back to character cuts when nothing
 *    else works. It is the cheapest strategy that gives structural integrity. For
 *    Markdown the heading separators are recognized for free; for PDF-extracted
 *    text (which usually loses heading markup but still has blank-line paragraphs)
 *    the paragraph and sentence tiers do the structural work. A small (~10%) overlap
 *    is kept internally so a sentence that happens to land on a chunk boundary
 *    survives intact in at least one chunk -- important for citation faithfulness.
 *
 * Pick `fixed` only when the corpus is uniform plain text with no markup. Pick
 * `semantic` only when topic boundaries matter more than throughput and you can
 * afford the embedding cost. For everything else, `recursive` is the robust default.
 */

export interface FixedSizeOptions {
  size?: number;
  overlapPercent?: number;
}

export interface MaxSizeOptions {
  maxSize: number;
  /** Split only on headings at a line start, and never leave a heading without its body. */
  fixHeadingSplit?: boolean;
}

export interface SemanticOptions {
  similarityThreshold?: number;
}

export type ChunkStrategy = "fixed" | "semantic" | "recursive";

function toChunks(texts: string[]): Chunk[] {
  return texts.filter((t) => t.length > 0).map((text, i) => ({ text, chunkIndex: i }));
}

function clampOverlap(overlap: number, size: number): number {
  if (overlap < 0) return 0;
  if (size <= 1) return 0;
  return Math.min(overlap, size - 1);
}

/** Pure cosine similarity: dot(a,b) / (|a|*|b|). Returns 0 when either vector is zero. */
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * 1. Fixed-size chunking: character-aware, overlap as a percentage of `size`.
 * Uses a recursive char splitter with only word/char separators so it ignores
 * structure (flat-stream semantics) but still enforces `size` to the byte by
 * falling back to a char cut when no word boundary is available.
 */
export async function chunkFixedSize(
  text: string,
  { size = 500, overlapPercent = 15 }: FixedSizeOptions = {},
): Promise<Chunk[]> {
  if (size < 1) throw new RangeError("size must be >= 1");
  if (overlapPercent < 0 || overlapPercent > 100) throw new RangeError("overlapPercent must be in [0, 100]");
  const overlap = clampOverlap(Math.round(size * (overlapPercent / 100)), size);
  if (text.length === 0) return [];
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: size,
    chunkOverlap: overlap,
    separators: [" ", ""], // word then char -- no structural awareness
  });
  const parts = await splitter.splitText(text);
  return toChunks(parts);
}

/**
 * 2. Semantic chunking — embedding-based topic-boundary detection. Unlike the
 * structural-separator strategies, this one embeds every sentence via the existing
 * embedBatch() and splits when cosine similarity between consecutive sentences
 * drops below `similarityThreshold` (default 0.75). A topic boundary — where the
 * text shifts from cooking to software architecture — manifests as a similarity
 * dip; the splitter cuts there and starts a new chunk.
 *
 * COST WARNING: This strategy makes one embedBatch() call per document, which
 * triggers ~N/4 HTTP roundtrips to Ollama for an N-sentence document (bounded
 * concurrency default 4). This is significantly more expensive than `fixed` or
 * `recursive` chunking (which make zero embedding calls). The intentional
 * trade-off is genuine topic-boundary detection instead of structural-separator
 * detection. Prefer `recursive` for general corpora; reserve `semantic` for cases
 * where topic boundaries matter more than ingestion throughput.
 */
export async function chunkSemantic(
  text: string,
  { similarityThreshold = 0.75 }: SemanticOptions = {},
): Promise<Chunk[]> {
  if (text.trim().length === 0) return [];

  // Split into sentences using sentence-ending punctuation followed by whitespace.
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

  // Edge case: single sentence requires no embedding (nothing to compare).
  if (sentences.length <= 1) return [{ text: sentences.join(" ") || text, chunkIndex: 0 }];

  // Embed all sentences in one batch call — uses the existing embedBatch bounded-
  // concurrency stride loop (one HTTP call per batch of 4). This guarantees the
  // sentence vectors live in the same space as query vectors from the retriever.
  const vectors = await embedBatch(sentences);

  // Mark split boundaries where cosine similarity between consecutive sentences
  // falls below the threshold (strict <, matching the "below" wording).
  const boundaries: number[] = [0];
  for (let i = 1; i < sentences.length; i++) {
    if (cosineSim(vectors[i - 1], vectors[i]) < similarityThreshold) {
      boundaries.push(i);
    }
  }

  // Group sentences between boundaries into chunks; join each group with a space.
  const chunks: Chunk[] = [];
  for (let b = 0; b < boundaries.length; b++) {
    const start = boundaries[b];
    const end = b + 1 < boundaries.length ? boundaries[b + 1] : sentences.length;
    chunks.push({ text: sentences.slice(start, end).join(" "), chunkIndex: b });
  }
  return chunks;
}

/**
 * 3. Recursive chunking: keep the largest structural unit intact, subdividing by
 * smaller-grain separators only when a unit exceeds `maxSize`. Priority order:
 *   markdown heading -> paragraph -> line -> sentence -> word -> character.
 * 10% overlap is baked in so a sentence on a chunk boundary survives intact.
 */
export async function chunkRecursive(
  text: string,
  { maxSize, fixHeadingSplit = false }: MaxSizeOptions,
): Promise<Chunk[]> {
  if (maxSize < 1) throw new RangeError("maxSize must be >= 1");
  if (text.length === 0) return [];
  const overlap = clampOverlap(Math.round(maxSize * 0.1), maxSize);//10% overlap
  // The default list's bare "## " / "# " match inside a heading marker: a section over
  // maxSize is split "## Title" -> "#" + "# Title ...", leaving "#"-only chunks.
  const separators = fixHeadingSplit
    ? ["\n## ", "\n# ", "\n### ", "\n\n", "\n", ". ", " ", ""]
    : ["\n## ", "## ", "\n# ", "# ", "\n\n", "\n", ". ", " ", ""];
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: maxSize, chunkOverlap: overlap, separators });
  const parts = await splitter.splitText(text);
  return toChunks(fixHeadingSplit ? attachLoneHeadings(parts) : parts);
}

/** Drops marker-only parts and prepends a heading-only part to the part after it. */
function attachLoneHeadings(parts: string[]): string[] {
  const out: string[] = [];
  let pending = "";
  for (const raw of parts) {
    const part = raw.trim();
    if (/^#+$/.test(part)) continue;
    if (/^#{1,6} [^\n]+$/.test(part)) {
      pending = pending ? `${pending}\n${part}` : part;
      continue;
    }
    out.push(pending ? `${pending}\n\n${part}` : part);
    pending = "";
  }
  if (pending) out.push(pending);
  return out;
}

/** The document's first line when it reads as a title (a name, a "# Heading"), else `fallback`. */
export function documentTitle(text: string, fallback: string): string {
  const first = text.split("\n").find((l) => l.trim().length > 0)?.replace(/^#+\s*/, "").trim() ?? "";
  return first.length > 0 && first.length <= 80 && !/[.!?]$/.test(first) ? first : fallback;
}

/**
 * True when the text already has at least 2 markdown headings (`#`..`######`). Used to
 * decide, per document, whether contextual headers should be added automatically: a
 * document that already labels its own sections gets no benefit from one (measured: it
 * cost a refusal without raising accuracy), while one with no headings at all (a resume,
 * a plain-text export) gains a lot from a "Title › Section" prefix.
 */
export function hasHeadingStructure(text: string): boolean {
  const matches = text.match(/^#{1,6}\s+\S/gm);
  return (matches?.length ?? 0) >= 2;
}

/** Heading stack (by markdown level) in effect at `offset`, continuing from `carry`. */
export function headingsAt(text: string, offset: number, carry: string[] = []): string[] {
  const stack = [...carry];
  for (const m of text.matchAll(/^(#{1,6})\s+(.+)$/gm)) {
    if (m.index > offset) break;
    const level = m[1].length;
    stack.length = Math.min(stack.length, level - 1);
    while (stack.length < level - 1) stack.push("");
    stack.push(m[2].trim());
  }
  return stack;
}

/** "Title › Section › Subsection", skipping empty levels and the title repeated as a heading. */
export function contextHeader(title: string, headings: string[]): string {
  return [title, ...headings.filter((h) => h.length > 0 && h !== title)].join(" › ");
}

/**
 * Dispatcher: call site passes a strategy name and options, gets back chunks.
 * Unknown strategies are rejected with a typed Error so config typos surface early.
 */
export async function chunkText(
  text: string,
  strategy: ChunkStrategy,
  options: FixedSizeOptions | MaxSizeOptions | SemanticOptions = {},
): Promise<Chunk[]> {
  if (strategy === "fixed") {
    return chunkFixedSize(text, options as FixedSizeOptions);
  }
  if (strategy === "semantic") {
    return chunkSemantic(text, options as SemanticOptions);
  }
  if (strategy === "recursive") {
    return chunkRecursive(text, options as MaxSizeOptions);
  }
  throw new Error(`Unknown chunk strategy: ${strategy}`);
}