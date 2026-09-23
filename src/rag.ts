import { retrieve, type RetrievedChunk, type RetrieveOptions } from "./retrieval/retriever.js";
import { buildPrompt, type HistoryMessage } from "./generation/promptBuilder.js";
import { generate, generateStream } from "./generation/llm.js";
import { rewriteFollowUp } from "./generation/rewrite.js";
import { rewriteConfig } from "./config.js";
import type { Citation } from "./types.js";

export interface RetrieveForQuestionResult {
  prompt: string;
  chunks: RetrievedChunk[];
  /** For follow-ups: the standalone question retrieval searched with, when rewriting succeeded. */
  searchQuestion?: string;
}

export interface AskOptions extends Omit<RetrieveOptions, "previousQuestion"> {
  /** Earlier turns of the conversation, oldest first. Follow-ups are rewritten into a
   * standalone question for retrieval, and the model sees the history to resolve "it". */
  history?: HistoryMessage[];
  /** Cancels generation (streaming only), e.g. when the user presses Stop. */
  signal?: AbortSignal;
}

export interface AnswerResult {
  answer: string;
  chunks: RetrievedChunk[];
  citations: Citation[];
}

/**
 * Streaming setup result: the eager work is done (retrieve + buildPrompt), so citations
 * are known up front. The tokens generator is the lazy half -- the model hasn't been
 * called yet when setup resolves. Routes that want streamed tokens and the citations
 * digest in one call get both without doubling the retrieve/embed cost.
 */
export interface StreamSetup {
  tokens: AsyncGenerator<string>;
  citations: Citation[];
}

/**
 * Derive the distinct { source, page } pairs from a retrieved-chunks array, in
 * first-appearance order. Only sources for chunks that cleared the retrieval threshold
 * (i.e. were actually included in the prompt context) appear here -- we never invent
 * citations for chunks that didn't make the cut. The key uses a NUL sentinel so
 * page === undefined compares distinctly from page === 0 (which wouldn't happen in
 * practice but keeps the contract honest).
 */
function buildCitations(chunks: RetrievedChunk[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of chunks) {
    const key = `${c.source}\0${c.page ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ source: c.source, ...(c.page !== undefined ? { page: c.page } : {}) });
  }
  return out;
}

/**
 * Shared orchestrator prep: retrieve chunks for the question, build the prompt via
 * the prompt builder. Pulled out so the streaming and non-streaming variants of
 * answerQuestion don't duplicate retrieve+buildPrompt logic -- both end up with
 * { prompt, chunks } and then choose their generation path.
 *
 * Returned chunks are also the source of the citations digest (deduped { source, page }).
 */
export async function retrieveForQuestion(
  question: string,
  options: AskOptions = {},
): Promise<RetrieveForQuestionResult> {
  const { history = [], signal: _signal, ...retrieveOptions } = options;
  const previousQuestion = [...history].reverse().find((m) => m.role === "user")?.content;

  let chunks: RetrievedChunk[];
  let searchQuestion: string | undefined;
  if (previousQuestion === undefined) {
    chunks = await retrieve(question, retrieveOptions);
  } else {
    // A follow-up: search with its standalone form, gated like any first question. If
    // rewriting is off or fails, fall back to previous + current question with the
    // follow-up floor.
    searchQuestion = rewriteConfig.enabled ? ((await rewriteFollowUp(history, question)) ?? undefined) : undefined;
    chunks = searchQuestion
      ? await retrieve(searchQuestion, retrieveOptions)
      : await retrieve(question, { ...retrieveOptions, previousQuestion });
  }
  // The model still sees the user's own words plus the history.
  const prompt = buildPrompt(question, chunks, history);
  return { prompt, chunks, searchQuestion };
}

/**
 * One place that ties retrieval and generation together (non-streaming). Returns the
 * full answer text plus the citations digest built from the chunks that cleared the
 * retrieval threshold for this question. Non-streaming callers (POST /query default)
 * get { answer, chunks, citations }; consumers that don't care about citations can
 * ignore the field -- it's additive.
 *
 * Why two functions instead of one with a stream flag: a single function returning
 * `Promise<AnswerResult> | AsyncGenerator<string>` is unergonomic to type and to
 * call. Two single-purpose functions, both sharing retrieveForQuestion, keeps the
 * type system honest while centralizing the retrieve+buildPrompt+citations logic.
 */
export async function answerQuestion(
  question: string,
  opts: AskOptions = {},
): Promise<AnswerResult> {
  const { prompt, chunks } = await retrieveForQuestion(question, opts);
  const answer = await generate(prompt);
  return { answer, chunks, citations: buildCitations(chunks) };
}

/**
 * Streaming variant: retrieve + buildPrompt EAGERLY (the await), compute citations
 * up front from the retrieved chunks, then return a token-streaming generator. The
 * eager setup is critical -- it lets callers (the /query streaming route) catch
 * pre-stream infrastructure failures (Qdrant down, Ollama embed down) BEFORE
 * flushing response headers, so they can return a normal 503 JSON envelope. A lazy
 * generator returning AsyncGenerator<string> would force those errors to surface
 * mid-stream as footers since the generator doesn't run until the first iteration --
 * by which point the route has already committed to a 200 + streaming headers.
 *
 * Citations are computed at setup time (cheap: a dedup pass over the chunk array)
 * and returned in the StreamSetup object; the route sets them in an HTTP response
 * header BEFORE flushing the token stream so clients reading just the body bytes
 * see the same answer text as before, and clients wanting citation metadata read
 * the header -- zero body-format change, citations in a metadata side channel.
 */
export async function answerQuestionStream(
  question: string,
  opts: AskOptions = {},
): Promise<StreamSetup> {
  const { prompt, chunks } = await retrieveForQuestion(question, opts);
  return {
    tokens: generateStream(prompt, opts.signal),
    citations: buildCitations(chunks),
  };
}