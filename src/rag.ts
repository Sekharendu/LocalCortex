import { retrieve, type RetrievedChunk, type RetrieveOptions } from "./retrieval/retriever.js";
import { buildPrompt } from "./generation/promptBuilder.js";
import { generate, generateStream } from "./generation/llm.js";

export interface RetrieveForQuestionResult {
  prompt: string;
  chunks: RetrievedChunk[];
}

export type AskOptions = RetrieveOptions;

export interface AnswerResult {
  answer: string;
  chunks: RetrievedChunk[];
}

/**
 * Shared orchestrator prep: retrieve chunks for the question, build the prompt via
 * the prompt builder. Pulled out so the streaming and non-streaming variants of
 * answerQuestion don't duplicate retrieve+buildPrompt logic -- both end up with
 * { prompt, chunks } and then choose their generation path.
 *
 * Returned chunks are also surfaced in the non-streaming JSON response as citation
 * metadata alongside the answer; the streaming branch forwards them in a trailer
 * header (or drops them, depending on the route).
 */
export async function retrieveForQuestion(
  question: string,
  options: AskOptions = {},
): Promise<RetrieveForQuestionResult> {
  const chunks = await retrieve(question, options);
  const prompt = buildPrompt(question, chunks);
  return { prompt, chunks };
}

/**
 * One place that ties retrieval and generation together (non-streaming). The API
 * route calls this so server.ts doesn't need to import generate / buildPrompt
 * itself -- it just gets back { answer, chunks }.
 *
 * Why two functions instead of one with a stream flag: a single function returning
 * `Promise<AnswerResult> | AsyncGenerator<string>` is unergonomic to type and to
 * call. Two single-purpose functions, both sharing retrieveForQuestion, keeps the
 * type system honest while still centralizing the retrieve+buildPrompt logic.
 */
export async function answerQuestion(
  question: string,
  opts: AskOptions = {},
): Promise<AnswerResult> {
  const { prompt, chunks } = await retrieveForQuestion(question, opts);
  const answer = await generate(prompt);
  return { answer, chunks };
}

/**
 * Streaming variant: retrieve + buildPrompt eagerly (the await), then return a
 * token-streaming generator. The eager setup is critical -- it lets callers (the
 * /query streaming route) catch pre-stream infrastructure failures (Qdrant down,
 * Ollama embed down) BEFORE flushing response headers, so they can return a normal
 * status-coded JSON envelope. A lazy generator returning AsyncGenerator<string>
 * would force those errors to surface mid-stream as footers since the generator
 * doesn't run until the first iteration -- by which point the route has already
 * committed to a 200 + streaming headers.
 */
export async function answerQuestionStream(
  question: string,
  opts: AskOptions = {},
): Promise<AsyncGenerator<string>> {
  const { prompt } = await retrieveForQuestion(question, opts);
  return generateStream(prompt);
}