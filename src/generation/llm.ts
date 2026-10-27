import { GenerationError } from "../errors.js";

export const GENERATION_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const GEN_TIMEOUT_MS = Number(process.env.CLOUDFLARE_GEN_TIMEOUT_MS ?? 180_000);

// Baseline instructions are unchanged; the provider template keeps them in the system role.
export const RAG_SYSTEM_PROMPT = `You are a strict retrieval-augmented assistant. You answer questions using ONLY the context provided in the user's prompt. You do not use any outside or general knowledge to answer questions.

If the context does not contain enough information, you explicitly say "The provided context is insufficient to answer this question."
If no context was provided at all, you explicitly say "I could not find any relevant information in the knowledge base to answer this question."
You never speculate, fabricate, or guess.

When you can answer, start with the answer itself, as if you simply know it. Answer in full sentences and include any conditions, limits or exceptions the context gives (for example "Yes, up to three days per week, with your manager's approval." rather than just "Yes."). Do not mention the context, the passages, or any file names, and do not describe how you found the answer (no "According to...", "Based on the provided context...", "The answer would be..."). Do not add a sources line: the user is shown the sources separately. Never answer with just a name or a bare yes/no: when the question asks who or what someone or something is, describe them with the key facts the context gives (for a person: their role, work and background).`;


// Legacy parser retained for existing consumers/tests; hosted generation uses SSE below.
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


export interface GenerateOptions {
  system?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Omit for answers: Cloudflare's documented default is 2000 output tokens. */
  maxTokens?: number;
  temperature?: number;
}

/** Cloudflare raw:true bypasses its chat template. This is Qwen's official template
 * with enable_thinking=false rendered locally, not an unsupported API parameter.
 * https://developers.cloudflare.com/workers-ai/features/prompting/
 * https://huggingface.co/Qwen/Qwen3-30B-A3B-FP8/blob/main/tokenizer_config.json */
function formatPrompt(system: string, prompt: string): string {
  return `<|im_start|>system\n${system}<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`;
}

type Completion = {
  success?: boolean;
  error?: unknown;
  errors?: unknown[];
  choices?: { message?: { content?: unknown }; delta?: { content?: unknown }; finish_reason?: string | null }[];
};

function completion(value: unknown): Completion {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GenerationError("Cloudflare returned an invalid completion");
  }
  const envelope = value as Completion & { result?: unknown };
  if (envelope.success === false || envelope.error || envelope.errors?.length) {
    throw new GenerationError("Cloudflare reported an inference error");
  }
  if ("result" in envelope) return completion(envelope.result);
  return envelope;
}

/** Per-call ownership: timeout covers headers AND body; callers always dispose. */
function request(prompt: string, stream: boolean, opts: GenerateOptions) {
  opts.signal?.throwIfAborted();
  if (!prompt.trim()) throw new GenerationError("Generation requires a non-empty prompt");
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !token) {
    throw new GenerationError("Cloudflare generation requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN on the backend");
  }
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new GenerationError("CLOUDFLARE_ACCOUNT_ID must be a 32-character hexadecimal account ID");
  const timeoutMs = opts.timeoutMs ?? GEN_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new GenerationError("Cloudflare generation timeout must be positive");
  if (opts.maxTokens !== undefined && (!Number.isInteger(opts.maxTokens) || opts.maxTokens < 1)) {
    throw new GenerationError("Generation output limit must be a positive integer");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = opts.signal ? AbortSignal.any([opts.signal, controller.signal]) : controller.signal;
  return {
    controller,
    signal,
    dispose() { clearTimeout(timer); controller.abort(); },
    async fetch() {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${GENERATION_MODEL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt: formatPrompt(opts.system ?? RAG_SYSTEM_PROMPT, prompt), raw: true, stream,
          ...(opts.maxTokens !== undefined ? { max_tokens: opts.maxTokens } : {}),
          ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        }),
        signal,
      });
      if (!response.ok) {
        // Do not echo provider bodies: they may contain sensitive request data.
        await response.body?.cancel().catch(() => {});
        const hint = response.status === 401 || response.status === 403 ? " (check backend credentials and Workers AI permissions)" : "";
        throw new GenerationError(`Cloudflare generation returned HTTP ${response.status}${hint}`);
      }
      return response;
    },
  };
}

function generationFailure(error: unknown, caller: AbortSignal | undefined, timeout: AbortSignal): never {
  // Cancellation is not a recoverable rewrite failure and must not start more work.
  if (caller?.aborted) throw new GenerationError("Generation cancelled");
  if (timeout.aborted) throw new GenerationError("Cloudflare generation timed out");
  if (error instanceof GenerationError) throw error;
  // Raw fetch/JSON errors can include URLs or response fragments; never propagate them.
  throw new GenerationError("Cloudflare generation failed while sending or reading the response");
}

export async function generate(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  const call = request(prompt, false, opts);
  try {
    const response = await call.fetch();
    const data = completion(await response.json());
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new GenerationError("Cloudflare returned no generated text");
    return text.trim();
  } catch (error) {
    return generationFailure(error, opts.signal, call.controller.signal);
  } finally {
    call.dispose();
  }
}

/** Incremental SSE framing; handles split UTF-8, CRLF, comments and multiline data. */
async function* sseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<{ event: string; data: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "";
  let data: string[] = [];
  let eventSize = 0;
  const maxEventBytes = 1024 * 1024;
  try {
    for (;;) {
      const part = await reader.read();
      buffer += part.done ? decoder.decode() : decoder.decode(part.value, { stream: true });
      if (buffer.length > maxEventBytes) throw new GenerationError("Cloudflare stream event exceeded the size limit");
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line === "") {
          if (data.length || event) yield { event, data: data.join("\n") };
          event = ""; data = []; eventSize = 0;
        } else if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          const value = line.slice(5).replace(/^ /, "");
          data.push(value);
          eventSize += value.length;
          if (eventSize > maxEventBytes) throw new GenerationError("Cloudflare stream event exceeded the size limit");
        }
      }
      if (part.done) {
        if (buffer.trim() || data.length || event) throw new GenerationError("Cloudflare stream ended with an incomplete event");
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function* generateStream(prompt: string, signal?: AbortSignal): AsyncGenerator<string> {
  const call = request(prompt, true, { signal });
  let hasText = false;
  let finished = false;
  try {
    const response = await call.fetch();
    if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
      await response.body?.cancel().catch(() => {});
      throw new GenerationError("Cloudflare did not return an SSE generation stream");
    }
    for await (const frame of sseEvents(response.body)) {
      if (frame.event === "error") throw new GenerationError("Cloudflare reported a streaming inference error");
      if (!frame.data) continue;
      if (frame.data.trim() === "[DONE]") { finished = true; break; }
      let value: unknown;
      try { value = JSON.parse(frame.data); }
      catch { throw new GenerationError("Cloudflare returned malformed stream JSON"); }
      const data = completion(value);
      if (!Array.isArray(data.choices)) throw new GenerationError("Cloudflare returned an invalid stream completion");
      const choice = data.choices[0];
      const text = choice?.delta?.content;
      if (text !== undefined && text !== null && typeof text !== "string") throw new GenerationError("Cloudflare returned invalid stream text");
      if (typeof text === "string" && text.length) { hasText ||= text.trim().length > 0; yield text; }
      if (choice?.finish_reason) finished = true;
    }
    if (!finished) throw new GenerationError("Cloudflare generation stream ended before completion");
    if (!hasText) throw new GenerationError("Cloudflare returned no generated text");
  } catch (error) {
    generationFailure(error, signal, call.controller.signal);
  } finally {
    call.dispose();
  }
}
