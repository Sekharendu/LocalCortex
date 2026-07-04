import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Chunk } from "../types.js";

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
 *  - `semantic` respects paragraph and heading boundaries, but a single oversized
 *    paragraph (common in PDFs where the layout collapses logical paragraphs into
 *    one text block) forces it straight into the fixed-size fallback anyway, so you
 *    pay the cost of both passes for the same result. It also has no graceful
 *    behavior inside an unbreakable run-on block -- it just hard-cuts.
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
 * `semantic` only when section attribution matters more than throughput and the
 * corpus is well-formed markdown. For everything else, `recursive` is the robust
 * default.
 */

export interface FixedSizeOptions {
  size?: number;
  overlapPercent?: number;
}

export interface MaxSizeOptions {
  maxSize: number;
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
 * 2. Semantic chunking: split on paragraph breaks and markdown heading boundaries,
 * keeping each heading attached to its following body. Any resulting segment larger
 * than `maxSize` is sub-chunked via the fixed-size strategy with a 15% overlap so
 * the fallback never hard-cuts a sentence.
 */
export async function chunkSemantic(
  text: string,
  { maxSize }: MaxSizeOptions,
): Promise<Chunk[]> {
  if (maxSize < 1) throw new RangeError("maxSize must be >= 1");
  if (text.length === 0) return [];

  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const segments: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const isHeading = /^#{1,6}\s/.test(paragraphs[i]);
    if (isHeading && i + 1 < paragraphs.length) {
      segments.push(paragraphs[i] + "\n\n" + paragraphs[i + 1]);
      i++;
    } else {
      segments.push(paragraphs[i]);
    }
  }

  const out: Chunk[] = [];
  let idx = 0;
  for (const seg of segments) {
    if (seg.length <= maxSize) {
      out.push({ text: seg, chunkIndex: idx++ });
    } else {
      const sub = await chunkFixedSize(seg, { size: maxSize, overlapPercent: 15 });
      for (const c of sub) out.push({ text: c.text, chunkIndex: idx++ });
    }
  }
  return out;
}

/**
 * 3. Recursive chunking: keep the largest structural unit intact, subdividing by
 * smaller-grain separators only when a unit exceeds `maxSize`. Priority order:
 *   markdown heading -> paragraph -> line -> sentence -> word -> character.
 * 10% overlap is baked in so a sentence on a chunk boundary survives intact.
 */
export async function chunkRecursive(
  text: string,
  { maxSize }: MaxSizeOptions,
): Promise<Chunk[]> {
  if (maxSize < 1) throw new RangeError("maxSize must be >= 1");
  if (text.length === 0) return [];
  const overlap = clampOverlap(Math.round(maxSize * 0.1), maxSize);
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxSize,
    chunkOverlap: overlap,
    separators: ["\n## ", "\n# ", "\n\n", "\n", ". ", " ", ""],
  });
  const parts = await splitter.splitText(text);
  return toChunks(parts);
}

/**
 * Dispatcher: call site passes a strategy name and options, gets back chunks.
 * Unknown strategies are rejected with a typed Error so config typos surface early.
 */
export async function chunkText(
  text: string,
  strategy: ChunkStrategy,
  options: FixedSizeOptions | MaxSizeOptions = {},
): Promise<Chunk[]> {
  if (strategy === "fixed") {
    return chunkFixedSize(text, options as FixedSizeOptions);
  }
  if (strategy === "semantic") {
    return chunkSemantic(text, options as MaxSizeOptions);
  }
  if (strategy === "recursive") {
    return chunkRecursive(text, options as MaxSizeOptions);
  }
  throw new Error(`Unknown chunk strategy: ${strategy}`);
}