import { GenerationError } from "../errors.js";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const GEN_MODEL = process.env.OLLAMA_GEN_MODEL ?? "llama3";
const GEN_TIMEOUT_MS = Number(process.env.OLLAMA_GEN_TIMEOUT_MS ?? 180_000);

/**
 * The universal baseline persona for the RAG assistant. Pass this as the Ollama
 * request's `system` field (engineered for exactly this: overrides the Modelfile
 * system message, keeps it separate from the dynamic per-turn prompt).
 *
 * This is the ONE place to edit the baseline instruction wording. Variant framings
 * for "with context" vs "no context" live next to the prompt builder that knows
 * which situation applies; this constant is the persistent persona underneath both.
 *
 * Tuning surface: tighten "strictly grounded" language, adjust verbosity, add
 * citation style hints, switch to a different refusal phrasing -- all from here.
 */
export const RAG_SYSTEM_PROMPT = `You are a strict retrieval-augmented assistant. You answer questions using ONLY the context provided in the user's prompt. You do not use any outside or general knowledge to answer questions.

If the context does not contain enough information, you explicitly say "The provided context is insufficient to answer this question."
If no context was provided at all, you explicitly say "I could not find any relevant information in the knowledge base to answer this question."
You never speculate, fabricate, or guess. You cite the source (file name and page if given) of any fact you state.`;

interface GenerateResponse {
  response?: string;
  done?: boolean;
  error?: string;
}

/**
 * Call Ollama's /api/generate endpoint with the local generation model and the
 * RAG system prompt, non-streaming. Returns the model's full response text.
 *
 * Errors: network failure, non-2xx response, malformed body, or missing `response`
 * all throw GenerationError, preserving an underlying `cause` when relevant. A down
 * Ollama is an infrastructure failure that must surface loudly rather than be
 * swallowed as an empty string -- callers (the upcoming rag.ts / API route) decide
 * how to present a generation failure to the user, but they need the signal.
 */
export async function generate(prompt: string): Promise<string> {
  if (!prompt || prompt.trim().length === 0) {
    throw new GenerationError("generate() called with an empty prompt");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEN_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GEN_MODEL,
        prompt,
        system: RAG_SYSTEM_PROMPT,
        stream: false,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw new GenerationError(
      `Failed to reach Ollama generate endpoint at ${OLLAMA_URL}/api/generate`,
      { cause: e },
    );
  }
  clearTimeout(timer);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GenerationError(
      `Ollama /api/generate returned HTTP ${res.status}: ${body.slice(0, 200)}`,
    );
  }

  let data: GenerateResponse;
  try {
    data = (await res.json()) as GenerateResponse;
  } catch (e) {
    throw new GenerationError("Ollama /api/generate returned non-JSON body", { cause: e });
  }

  if (typeof data.error === "string" && data.error.length > 0) {
    throw new GenerationError(`Ollama /api/generate reported model error: ${data.error}`);
  }
  if (typeof data.response !== "string") {
    throw new GenerationError(
      `Ollama /api/generate response missing 'response' string. Got: ${JSON.stringify(data).slice(0, 200)}`,
    );
  }
  return data.response.trim();
}