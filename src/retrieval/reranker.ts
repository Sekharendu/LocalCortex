import { RerankingError } from "../errors.js";
import type { RetrievedChunk } from "./retriever.js";

export const RERANK_MODEL = "@cf/baai/bge-reranker-base";
export const RERANK_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
let inFlight = 0;

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Native Workers AI REST envelope and model schema (id is the input context index).
 * https://developers.cloudflare.com/workers-ai/models/bge-reranker-base/schema-output.json
 * Request all scores so mapping completeness can be checked before selecting final k.
 */
export async function rerank(
  query: string,
  candidates: RetrievedChunk[],
  topK: number,
  signal?: AbortSignal,
): Promise<RetrievedChunk[]> {
  if (signal?.aborted) throw new RerankingError("Reranking cancelled");
  if (!Number.isInteger(topK) || topK < 1 || topK > 50) throw new RerankingError("Reranking topK must be an integer from 1 to 50");
  if (candidates.length === 0) return [];
  if (!query.trim() || Buffer.byteLength(query, "utf8") > 2048) throw new RerankingError("Reranking query must be nonempty and at most 2 KiB UTF-8");
  if (candidates.length > 50 || candidates.some(c => !c.text.trim() || Buffer.byteLength(c.text, "utf8") > 8192)) {
    throw new RerankingError("Reranking requires at most 50 nonempty contexts, each at most 8 KiB UTF-8");
  }
  const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!account || !token || !/^[a-f0-9]{32}$/i.test(account)) throw new RerankingError("Reranking requires valid backend Cloudflare credentials");
  // Synchronous acquisition: there is no waiting queue and no await before increment.
  // This is a per-process budget; replicas each have two independent slots.
  if (inFlight >= 2) throw new RerankingError("Reranking capacity exhausted");
  inFlight++;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, RERANK_TIMEOUT_MS);
  let response: Response | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    if (signal?.aborted) controller.abort();
    response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${RERANK_MODEL}`, {
      method: "POST",
      redirect: "error",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, contexts: candidates.map(c => ({ text: c.text })), top_k: candidates.length }),
      signal: controller.signal,
    });
    if (!response.ok) throw new RerankingError(`Cloudflare reranking HTTP ${response.status}`);
    if (!response.body) throw new RerankingError("Cloudflare reranking response has no body");
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let body = "", bytes = 0;
    while (true) {
      const part = await reader.read();
      controller.signal.throwIfAborted();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new RerankingError("Cloudflare reranking response exceeds 64 KiB");
      body += decoder.decode(part.value, { stream: true });
    }
    body += decoder.decode();
    const envelope: unknown = JSON.parse(body);
    if (!object(envelope) || envelope.success !== true || envelope.error !== undefined ||
      (envelope.errors !== undefined && (!Array.isArray(envelope.errors) || envelope.errors.length > 0)) ||
      !object(envelope.result) || envelope.result.error !== undefined || envelope.result.success === false ||
      (envelope.result.errors !== undefined && (!Array.isArray(envelope.result.errors) || envelope.result.errors.length > 0))) {
      throw new RerankingError("Cloudflare reranking returned an invalid REST envelope");
    }
    const rows = envelope.result.response;
    if (!Array.isArray(rows) || rows.length !== candidates.length) throw new RerankingError("Cloudflare reranking returned an incomplete result");
    const seen = new Set<number>();
    const scores = rows.map((row: unknown) => {
      if (!object(row) || typeof row.id !== "number" || !Number.isInteger(row.id) || row.id < 0 || row.id >= candidates.length || seen.has(row.id) || typeof row.score !== "number" || !Number.isFinite(row.score)) {
        throw new RerankingError("Cloudflare reranking returned an invalid context mapping");
      }
      seen.add(row.id);
      return { id: row.id, score: row.score };
    });
    controller.signal.throwIfAborted();
    return scores.sort((a, b) => b.score - a.score || a.id - b.id).slice(0, topK)
      .map(row => ({ ...candidates[row.id], rerankScore: row.score }));
  } catch (cause) {
    if (cause instanceof RerankingError) throw cause;
    throw new RerankingError(controller.signal.aborted ? "Reranking cancelled or timed out" : "Cloudflare reranking failed", { cause });
  } finally {
    // Cancel before releasing the slot, including HTTP/malformed/oversize failures.
    controller.abort();
    try {
      if (reader) await reader.cancel().catch(() => {});
      else await response?.body?.cancel().catch(() => {});
    } finally {
      reader?.releaseLock();
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      inFlight--;
    }
  }
}
