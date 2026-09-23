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
 * Tuning surface: tighten "strictly grounded" language, adjust verbosity, switch to a
 * different refusal phrasing -- all from here. The model is told NOT to cite: sources
 * come from retrieval (buildCitations in rag.ts), shown by the UI as chips, so
 * model-written citations were redundant and sometimes misspelled.
 */
export const RAG_SYSTEM_PROMPT = `You are a strict retrieval-augmented assistant. You answer questions using ONLY the context provided in the user's prompt. You do not use any outside or general knowledge to answer questions.

If the context does not contain enough information, you explicitly say "The provided context is insufficient to answer this question."
If no context was provided at all, you explicitly say "I could not find any relevant information in the knowledge base to answer this question."
You never speculate, fabricate, or guess.

When you can answer, start with the answer itself, as if you simply know it. Answer in full sentences and include any conditions, limits or exceptions the context gives (for example "Yes, up to three days per week, with your manager's approval." rather than just "Yes."). Do not mention the context, the passages, or any file names, and do not describe how you found the answer (no "According to...", "Based on the provided context...", "The answer would be..."). Do not add a sources line: the user is shown the sources separately.`;

interface GenerateResponse {
  response?: string;
  done?: boolean;
  error?: string;
}

/**
 * Parse a newline-delimited JSON stream of GenerateResponse objects from an async
 * iterable of byte chunks. Exported separately from generateStream so unit tests
 * can feed it crafted byte sequences without mocking fetch.
 *
 * Buffer handling: maintain `buf` across reads, append each decoded chunk, split on
 * '\n', parse every complete line, and carry any trailing incomplete line over to
 * be prepended to the next chunk. A naive JSON.parse(chunk) implementation fails
 * here in two ways: (1) a single JSON object split across two chunks hits the
 * parser mid-key, (2) two complete objects concatenated in one chunk with no
 * newline between would make the second object unreachable by chunk-and-parse.
 *
 * Malformed complete lines throw GenerationError -- a corrupt stream is a real bug
 * signal, matching the project's fail-loud-on-infrastructure philosophy, not
 * something to silently swallow.
 */
export async function* parseNdjsonStream(
  chunks: AsyncIterable<Uint8Array>,
): AsyncGenerator<GenerateResponse> {
  const decoder = new TextDecoder("utf-8");
  let buf = "";
  for await (const chunk of chunks) {
    buf += decoder.decode(chunk, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.trim().length === 0) continue;
      let parsed: GenerateResponse;
      try {
        parsed = JSON.parse(line) as GenerateResponse;
      } catch (e) {
        throw new GenerationError(
          `Ollama stream returned a malformed JSON line: ${line.slice(0, 200)}`,
          { cause: e },
        );
      }
      yield parsed;
    }
  }
  // Flush decoder's trailing bytes.
  buf += decoder.decode();
  if (buf.trim().length > 0) {
    let parsed: GenerateResponse;
    try {
      parsed = JSON.parse(buf) as GenerateResponse;
    } catch (e) {
      throw new GenerationError(
        `Ollama stream ended with a malformed JSON line: ${buf.slice(0, 200)}`,
        { cause: e },
      );
    }
    yield parsed;
  }
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

/**
 * Stream tokens from Ollama's /api/generate endpoint. Calls with stream: true,
 * reads the response body as an async iterable of byte chunks, parses NDJSON via
 * parseNdjsonStream, and yields each emitted token's `response` field as it
 * arrives. The final `{ done: true }` object typically carries an empty `response`
 * -- it is suppressed (empty string yields nothing) so callers don't see a
 * trailing empty token.
 *
 * Error semantics mirror generate(): network failure, non-2xx, or malformed JSON
 * in a complete NDJSON line all throw GenerationError. The caller decides what to
 * do with a mid-stream error -- the HTTP route writes a footer and closes.
 */
export async function* generateStream(prompt: string, signal?: AbortSignal): AsyncGenerator<string> {
  if (!prompt || prompt.trim().length === 0) {
    throw new GenerationError("generateStream() called with an empty prompt");
  }

  // `signal` lets the caller cancel (e.g. the user pressed Stop). Aborting drops the
  // connection, and Ollama stops generating when its client disconnects.
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
        stream: true,
      }),
      signal: signal ? AbortSignal.any([controller.signal, signal]) : controller.signal,
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
  if (!res.body) {
    throw new GenerationError("Ollama /api/generate (stream:true) returned no body");
  }

  // Node 18+ exposes res.body as a Web ReadableStream<Uint8Array>; async-iterate it.
  const nodeStream = res.body as unknown as AsyncIterable<Uint8Array>;
  for await (const obj of parseNdjsonStream(nodeStream)) {
    if (typeof obj.error === "string" && obj.error.length > 0) {
      throw new GenerationError(`Ollama /api/generate stream reported model error: ${obj.error}`);
    }
    if (typeof obj.response === "string" && obj.response.length > 0) {
      yield obj.response;
    }
    // `done: true` final object typically carries empty response -- suppress the empty yield.
  }
}