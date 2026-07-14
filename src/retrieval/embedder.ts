import { EmbeddingError } from "../errors.js";
import { embedConfig } from "../config.js";

const REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_CONCURRENCY = 4;

interface EmbedResponse {
  embeddings: number[][];
}

async function postEmbed(input: string | string[]): Promise<number[][]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${embedConfig.url}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: embedConfig.model, input }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw new EmbeddingError(
      `Failed to reach Ollama embed endpoint at ${embedConfig.url}/api/embed`,
      { cause: e },
    );
  }
  clearTimeout(timer);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new EmbeddingError(
      `Ollama /api/embed returned HTTP ${res.status}: ${body.slice(0, 200)}`,
    );
  }

  let data: EmbedResponse;
  try {
    data = (await res.json()) as EmbedResponse;
  } catch (e) {
    throw new EmbeddingError("Ollama /api/embed returned non-JSON body", { cause: e });
  }

  if (!Array.isArray(data.embeddings)) {
    throw new EmbeddingError(
      `Ollama /api/embed response missing 'embeddings' array. Got: ${JSON.stringify(data).slice(0, 200)}`,
    );
  }
  return data.embeddings;
}

function assertDim(vec: number[], label: string): void {
  if (!Array.isArray(vec) || vec.length !== embedConfig.dim) {
    const got = Array.isArray(vec) ? vec.length : typeof vec;
    throw new EmbeddingError(
      `Embedding dimension mismatch for ${label}: expected ${embedConfig.dim}, got ${got}. Model: ${embedConfig.model}. ` +
        `If you changed OLLAMA_embedConfig.model, also set OLLAMA_embedConfig.dim to match.`,
    );
  }
}

/**
 * Embed a single text via Ollama's /api/embed endpoint. Returns a number[] of length
 * OLLAMA_embedConfig.dim (default 768). Throws EmbeddingError on network failure, non-2xx
 * response, malformed body, or dimension mismatch.
 */
export async function embed(text: string): Promise<number[]> {
  const vectors = await postEmbed(text);
  if (vectors.length !== 1) {
    throw new EmbeddingError(
      `Expected 1 embedding for single input, got ${vectors.length}`,
    );
  }
  assertDim(vectors[0], "input");
  return vectors[0];
}

/**
 * Embed an array of texts with bounded concurrency. The input array is split into
 * sub-batches of size `concurrency` (default 4); each sub-batch is a single /api/embed
 * call sent sequentially. This keeps simultaneous model work to at most `concurrency`
 * embeddings, honoring the CPU/GPU cost concern of hitting a local model. Results are
 * returned in input order.
 */
export async function embedBatch(
  texts: string[],
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<number[][]> {
  if (concurrency < 1) throw new RangeError("concurrency must be >= 1");
  if (texts.length === 0) return [];

  const out: number[][] = new Array(texts.length);
  for (let start = 0; start < texts.length; start += concurrency) {
    const slice = texts.slice(start, start + concurrency);
    const vectors = await postEmbed(slice);
    if (vectors.length !== slice.length) {
      throw new EmbeddingError(
        `Ollama returned ${vectors.length} embeddings for a sub-batch of ${slice.length} inputs`,
      );
    }
    for (let i = 0; i < vectors.length; i++) {
      assertDim(vectors[i], `sub-batch item ${start + i}`);
      out[start + i] = vectors[i];
    }
  }
  return out;
}