import { retrieve, type RetrievedChunk, type RetrieveOptions } from "./retrieval/retriever.js";
import { buildPrompt } from "./generation/promptBuilder.js";

export interface RetrieveForQuestionResult {
  prompt: string;
  chunks: RetrievedChunk[];
}

export type AskOptions = RetrieveOptions;

/**
 * Shared orchestration helper for the API route: retrieve chunks for the question,
 * build the prompt via the prompt builder. Pulled out so the streaming and
 * non-streaming branches in the /query route don't duplicate retrieve+buildPrompt
 * logic -- both end up with { prompt, chunks } and then choose their generation path.
 *
 * Returns chunks too because the non-streaming JSON response surface them as
 * citation metadata alongside the answer; the streaming branch ignores chunks for
 * the streamed body and returns them in a trailer header (or just drops them on
 * the floor, depending on the route).
 */
export async function retrieveForQuestion(
  question: string,
  options: AskOptions = {},
): Promise<RetrieveForQuestionResult> {
  const chunks = await retrieve(question, options);
  const prompt = buildPrompt(question, chunks);
  return { prompt, chunks };
}