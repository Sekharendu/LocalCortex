import type { RetrievedChunk } from "../retrieval/retriever.js";

/**
 * Variant instruction strings. The universal RAG baseline persona lives in
 * src/generation/llm.ts as RAG_SYSTEM_PROMPT (passed as Ollama's `system` field).
 * These two are SITUATION-SPECIFIC framings -- they live here next to the logic
 * that knows which situation applies (non-empty vs empty chunks). Both are
 * editable constants so the wording is easy to iterate on without hunting through
 * templated prompt strings.
 */

export const WITH_CONTEXT_INSTRUCTION = `Answer the question using ONLY the context passages provided below. If the context does not contain enough information to answer fully, say "The provided context is insufficient to answer this question." Cite the source (file name and page) of any fact you state.`;

export const NO_CONTEXT_INSTRUCTION = `No relevant context was found in the knowledge base for this question. Tell the user explicitly that no relevant information was found. Do not attempt to answer from general knowledge.`;

const CONTEXT_SEPARATOR = "\n\n---\n\n";

function formatCitationTag(chunk: RetrievedChunk, index: number): string {
  const parts: string[] = [`[${index + 1}]`];
  if (chunk.source) parts.push(`(source: ${chunk.source}${chunk.page != null ? `, page: ${chunk.page}` : ""})`);
  return parts.join(" ");
}

/**
 * Build the prompt text fed to `generate()`.
 *
 * - Non-empty chunks: emit a labelled "Context:" block with one passage per entry,
 *   each prefixed by a light citation tag `[1] (source: file, page: N)`. The tag is
 *   the only way the model can name where its facts came from -- the RetrievedChunk
 *   source/page fields exist specifically to enable this, so they must reach the
 *   prompt rather than live only in the API response wrapper.
 * - Empty chunks: do NOT emit an empty "Context:" block -- that confuses the model
 *   into fabricating passages. Instead emit a different variant that explicitly
 *   states no relevant context was found and instructs the model to say so.
 */
export function buildPrompt(question: string, chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return `${NO_CONTEXT_INSTRUCTION}\n\nQuestion: ${question}\nAnswer:`;
  }

  const contextBlock = chunks
    .map((c, i) => `${formatCitationTag(c, i)}\n${c.text}`)
    .join(CONTEXT_SEPARATOR);

  return `${WITH_CONTEXT_INSTRUCTION}\n\nContext:\n${contextBlock}\n\nQuestion: ${question}\nAnswer:`;
}