import type { RetrievedChunk } from "../retrieval/retriever.js";

/**
 * Variant instruction strings. The universal RAG baseline persona lives in
 * src/generation/llm.ts as RAG_SYSTEM_PROMPT (passed as Ollama's `system` field).
 * These two are SITUATION-SPECIFIC framings -- they live here next to the logic
 * that knows which situation applies (non-empty vs empty chunks). Both are
 * editable constants so the wording is easy to iterate on without hunting through
 * templated prompt strings.
 */

export const WITH_CONTEXT_INSTRUCTION = `Answer the question using ONLY the context passages provided below. If the context does not contain enough information to answer fully, say "The provided context is insufficient to answer this question." Otherwise, start directly with the answer in plain language, without mentioning the context, the passages or any sources.`;

// Repeated right before the question: with 1,500-2,600-token contexts from big documents
// llama3 lost the opening instruction by the end (bare "Economy class." answers, an
// "According to the provided context" opener, a dropped "after 90 days" condition, one
// answer that was in the passages refused). SESSION-LOG §27.
export const ANSWER_REMINDER = `Reminder: if the passages above answer the question, answer it in full sentences, keep any conditions or limits they give, and do not mention the passages or the context. Only if they do not answer it, say "The provided context is insufficient to answer this question."`;

export const NO_CONTEXT_INSTRUCTION = `No relevant context was found in the knowledge base for this question. Tell the user explicitly that no relevant information was found. Do not attempt to answer from general knowledge.`;

const CONTEXT_SEPARATOR = "\n\n---\n\n";

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

// Enough recent turns to resolve "it" / "that policy", without the history crowding
// out the retrieved context in the model's window.
export const HISTORY_MAX_MESSAGES = 6;
export const HISTORY_MAX_ASSISTANT_CHARS = 800;

export function formatHistory(history: HistoryMessage[]): string {
  return history
    .slice(-HISTORY_MAX_MESSAGES)
    .map((m) => {
      const text =
        m.role === "assistant" && m.content.length > HISTORY_MAX_ASSISTANT_CHARS
          ? `${m.content.slice(0, HISTORY_MAX_ASSISTANT_CHARS)}…`
          : m.content;
      return `${m.role === "user" ? "User" : "Assistant"}: ${text}`;
    })
    .join("\n");
}

/**
 * Build the prompt text fed to `generate()`.
 *
 * - Non-empty chunks: emit a "Context:" block with the passages separated by `---`.
 *   Passages carry no `[1] (source: file, page: N)` tags: with them llama3 opened
 *   answers with "According to [1] (source: …)" and appended its own (sometimes
 *   misspelled) "Source:" line. Sources reach the user from retrieval instead
 *   (buildCitations in rag.ts).
 * - Empty chunks: do NOT emit an empty "Context:" block -- that confuses the model
 *   into fabricating passages. Instead emit a different variant that explicitly
 *   states no relevant context was found and instructs the model to say so.
 */
export function buildPrompt(question: string, chunks: RetrievedChunk[], history: HistoryMessage[] = []): string {
  // No-context path deliberately ignores history: with nothing retrieved the model must
  // refuse, not answer from its own earlier replies.
  if (chunks.length === 0) {
    return `${NO_CONTEXT_INSTRUCTION}\n\nQuestion: ${question}\nAnswer:`;
  }

  const contextBlock = chunks.map((c) => c.text).join(CONTEXT_SEPARATOR);

  // History only helps the model resolve references ("it", "that policy"); facts still
  // have to come from the Context block.
  const historyBlock =
    history.length > 0
      ? `Conversation so far (for resolving references only; answer from the Context above):\n${formatHistory(history)}\n\n`
      : "";

  return `${WITH_CONTEXT_INSTRUCTION}\n\nContext:\n${contextBlock}\n\n${historyBlock}${ANSWER_REMINDER}\n\nQuestion: ${question}\nAnswer:`;
}