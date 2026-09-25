import { chunksByDocumentId } from "./vectorStore.js";
import { countTokens } from "../generation/tokens.js";
import type { RetrievedChunk } from "./retriever.js";
import type { ChunkPayload } from "../types.js";

/**
 * Turns the chunks retrieval found into what the model reads. Retrieval (and its 0.63
 * gate) still decides WHETHER there is an answer and WHICH documents hold it; this
 * decides how much of each document the model sees:
 *
 * - Whole: a matched document of at most `wholeMaxTokens` goes in complete. Top-5
 *   chunks of a resume are fragments out of reading order: "how many projects" never got
 *   the Projects section, bullets lost their project name, and "who is X" / "list all"
 *   questions depend on the document's overall shape anyway.
 * - Chunked: a longer document contributes its matched chunks, its first chunk (title and
 *   byline) and one neighbour each side of each match, in that priority, up to
 *   `chunkedMaxTokens`; in reading order, touching chunks merged into one passage.
 *
 * Documents are filled in rank order within `budgetTokens` (llama3 tokens left for
 * context after system prompt, instruction, history, question and the answer). The best
 * document always gets at least its best chunk; a lower-ranked one that no longer fits is
 * left out.
 */

/** What the "---" separator between two passages costs. */
const SEPARATOR_TOKENS = 4;
/** The chunker repeats ~10% (50 chars at 500) of a chunk at the start of the next; a
 * shorter match between the end of one chunk and the start of the next is coincidence. */
const MIN_OVERLAP_CHARS = 16;

/** Join consecutive chunks of one document, dropping the overlap the splitter repeats. */
export function mergeChunkTexts(texts: string[]): string {
  let out = texts[0] ?? "";
  for (const t of texts.slice(1)) {
    let k = Math.min(out.length, t.length);
    for (; k >= MIN_OVERLAP_CHARS; k--) if (out.endsWith(t.slice(0, k))) break;
    out += k >= MIN_OVERLAP_CHARS ? t.slice(k) : `\n${t}`;
  }
  return out;
}

export interface DocumentHits {
  /** Every chunk of the document, in reading order. */
  chunks: ChunkPayload[];
  /** The document's retrieved chunks, best first. */
  hits: RetrievedChunk[];
}

export interface SelectOptions {
  budgetTokens: number;
  wholeMaxTokens: number;
  /** Most a chunked document may add; its hits beat neighbours when it runs out. */
  chunkedMaxTokens?: number;
  /** Add a chunked document's first chunk (title, authors, affiliations). */
  titleChunk?: boolean;
}

interface Passage {
  chunk: RetrievedChunk;
  tokens: number;
}

/** Pure selection step of assembleContext; `docs` in rank order. */
export function selectPassages(
  docs: DocumentHits[],
  { budgetTokens, wholeMaxTokens, chunkedMaxTokens = Infinity, titleChunk = false }: SelectOptions,
): RetrievedChunk[] {
  let remaining = budgetTokens;
  const out: RetrievedChunk[] = [];
  const cost = (ps: Passage[]) => ps.reduce((s, p) => s + p.tokens + SEPARATOR_TOKENS, 0);
  const take = (ps: Passage[]) => {
    remaining -= cost(ps);
    out.push(...ps.map((p) => p.chunk));
  };

  docs.forEach(({ chunks, hits }, rank) => {
    const position = new Map(chunks.map((c, i) => [c.chunkIndex, i]));
    const scoreAt = new Map<number, number>();
    for (const h of hits) {
      const i = h.chunkIndex === undefined ? undefined : position.get(h.chunkIndex);
      if (i !== undefined && !scoreAt.has(i)) scoreAt.set(i, h.score);
    }
    if (scoreAt.size === 0) return;
    const bestScore = Math.max(...scoreAt.values());

    // Consecutive positions become one merged passage.
    const passagesFor = (positions: Iterable<number>): Passage[] => {
      const sorted = [...new Set(positions)].filter((i) => i >= 0 && i < chunks.length).sort((a, b) => a - b);
      const runs: number[][] = [];
      for (const i of sorted) {
        const last = runs[runs.length - 1];
        if (last && i === last[last.length - 1] + 1) last.push(i);
        else runs.push([i]);
      }
      return runs.map((run) => {
        const text = mergeChunkTexts(run.map((i) => chunks[i].text));
        const first = chunks[run[0]];
        const score = Math.max(...run.map((i) => scoreAt.get(i) ?? 0));
        return {
          chunk: {
            text,
            source: first.source,
            ...(first.page !== undefined ? { page: first.page } : {}),
            score: score || bestScore,
            documentId: first.documentId,
            chunkIndex: first.chunkIndex,
          },
          tokens: countTokens(text),
        };
      });
    };

    const whole = passagesFor(chunks.keys());
    if (cost(whole) - SEPARATOR_TOKENS <= wholeMaxTokens && cost(whole) <= remaining) return take(whole);

    // A chunked document: its best hit, its other hits, its first chunk (a paper's title,
    // authors and affiliations, which "who wrote this" questions never retrieve), then one
    // neighbour each side of every hit (restores a heading or the rest of a list cut at a
    // chunk edge), best hit first, while they fit the budget and chunkedMaxTokens. Past
    // that, more text buried the answer (48-page PDF, SESSION-LOG §26) and doubled latency.
    const limit = Math.min(remaining, chunkedMaxTokens);
    const byScore = [...scoreAt.entries()].sort((a, b) => b[1] - a[1]).map(([i]) => i);
    const candidates = [...byScore, ...(titleChunk ? [0] : []), ...byScore.flatMap((i) => [i - 1, i + 1])];
    const picked: number[] = [];
    for (const i of candidates) {
      if (i < 0 || i >= chunks.length || picked.includes(i)) continue;
      if (cost(passagesFor([...picked, i])) <= limit) picked.push(i);
      // The best document never goes missing: its best hit goes in even over budget.
      else if (picked.length === 0) {
        if (rank > 0) return;
        picked.push(i);
      }
    }
    take(passagesFor(picked));
  });
  return out;
}

/**
 * Assemble the prompt context for `chunks` (retrieve()'s result, best first). Chunks
 * without a documentId (points from before it was stored) pass through unchanged.
 */
export async function assembleContext(
  chunks: RetrievedChunk[],
  { collection, ...opts }: SelectOptions & { collection: string },
): Promise<RetrievedChunk[]> {
  const byDoc = new Map<string, RetrievedChunk[]>();
  const loose: RetrievedChunk[] = [];
  for (const c of chunks) {
    if (c.documentId === undefined || c.chunkIndex === undefined) loose.push(c);
    else byDoc.set(c.documentId, [...(byDoc.get(c.documentId) ?? []), c]);
  }
  const docs = await Promise.all(
    [...byDoc].map(async ([id, hits]) => ({ chunks: await chunksByDocumentId(collection, id), hits })),
  );
  return [...selectPassages(docs, opts), ...loose];
}
