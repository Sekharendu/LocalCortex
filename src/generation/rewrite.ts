import { rewriteConfig } from "../config.js";
import { generate } from "./llm.js";
import { HISTORY_MAX_MESSAGES, type HistoryMessage } from "./promptBuilder.js";
import { isRefusal } from "./refusal.js";

// Turns a follow-up that refers back ("tell me more about him") into a question that
// stands on its own ("Tell me more about Sekharendu Dey."), so retrieval finds it with
// the normal threshold. Embedding only the previous question + the new one loses any
// subject named more than one turn back, and no score floor can tell "tell me more about
// him" (0.46 on its own) from "What is the capital of France?" (0.48) -- the difference
// is in the conversation, not the words.
//
// Guard rails, because llama3 is not a reliable rewriter on its own (first probe: it
// turned "What is the capital of France?" into "What was his employment period?"):
// - only questions that actually refer back are rewritten (needsRewrite);
// - a rewrite must keep the question's own content words (cleanRewrite);
// - anything else, or any failure, falls back to the previous-question retrieval.

export const REWRITE_SYSTEM_PROMPT = `You rewrite the user's latest question so it can be understood without the conversation.
Replace pronouns and vague references (he, his, it, that, those, "the second one") with the names or things they refer to in the conversation.
Keep the question short and keep the user's wording otherwise. Do not answer it. Do not add details that the question did not ask about.
Reply with the rewritten question only, on one line.

Example
Conversation:
User: How many vacation days do I get per year?
Assistant: 15 days per year for your first five years.
Latest question: And after five years?
Standalone question: How many vacation days do I get per year after five years?

Example
Conversation:
User: Tell me about Priya Sharma.
Assistant: Priya Sharma is a data analyst at Acme.
User: Where did she study?
Latest question: what are her skills?
Standalone question: What are Priya Sharma's skills?

Example
Conversation:
User: Tell me about Priya Sharma.
Assistant: Priya Sharma is a data analyst at Acme.
User: what are her skills?
Latest question: tell me more about her
Standalone question: Tell me more about Priya Sharma.`;

// Words that point back into the conversation. Questions without one (and not opening
// with "And ..." / "What about ...") are treated as standalone and never rewritten.
const REFERRING_WORDS =
  /\b(he|him|his|she|her|hers|it|its|they|them|their|theirs|this|that|these|those|one|ones|there|same|former|latter)\b/i;
const CONTINUATION_START = /^\s*(and|also|so|what about|how about|and what about)\b/i;

export function needsRewrite(question: string): boolean {
  return REFERRING_WORDS.test(question) || CONTINUATION_START.test(question);
}

// Assistant replies only need to supply the names and topics being referred to.
const REWRITE_ASSISTANT_CHARS = 300;

export function buildRewritePrompt(history: HistoryMessage[], question: string): string {
  const lines = history
    // A refusal carries no names to resolve and confused the rewriter ("the person whose
    // employment status ... were previously unknown").
    .filter((m) => !(m.role === "assistant" && isRefusal(m.content)))
    .slice(-HISTORY_MAX_MESSAGES)
    .map((m) => {
      const text =
        m.role === "assistant" && m.content.length > REWRITE_ASSISTANT_CHARS
          ? `${m.content.slice(0, REWRITE_ASSISTANT_CHARS)}…`
          : m.content;
      return `${m.role === "user" ? "User" : "Assistant"}: ${text.replace(/\s+/g, " ").trim()}`;
    });
  return `Conversation:\n${lines.join("\n")}\nLatest question: ${question}\nStandalone question:`;
}

const STOP_WORDS = new Set(
  "a an the and or but so also what about how about is are was were be been do does did can could should would will i me my you your we our of to in on for at by with from as into".split(
    " ",
  ),
);

function contentWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((w) => !STOP_WORDS.has(w) && !REFERRING_WORDS.test(w));
}

/**
 * Validates the model's output; null means "use the fallback". Rejects empty output,
 * output far longer than a rewrite needs (it answered instead), and rewrites that drop
 * the question's own content words (it swapped in a different question).
 */
export function cleanRewrite(raw: string, original: string): string | null {
  let text = raw.trim().split("\n")[0]?.trim() ?? "";
  text = text.replace(/^(standalone question|rewritten question|question)\s*:\s*/i, "");
  text = text.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  if (text.length === 0) return null;
  if (text.length > original.length + 120) return null;

  const kept = new Set(contentWords(text));
  const own = contentWords(original);
  const matched = own.filter((w) => kept.has(w) || [...kept].some((k) => k.startsWith(w.slice(0, 5))));
  if (own.length > 0 && matched.length / own.length < 0.6) return null;
  return text;
}

/**
 * The standalone form of `question`, or null when it shouldn't or couldn't be rewritten
 * (no reference back, error, timeout, unusable output). Null means: use the fallback.
 */
export async function rewriteFollowUp(history: HistoryMessage[], question: string): Promise<string | null> {
  if (!needsRewrite(question)) return null;
  try {
    const raw = await generate(buildRewritePrompt(history, question), {
      system: REWRITE_SYSTEM_PROMPT,
      model: rewriteConfig.model,
      timeoutMs: rewriteConfig.timeoutMs,
      options: { temperature: 0, num_predict: 48 },
    });
    return cleanRewrite(raw, question);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[rewrite] falling back to previous-question retrieval: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}
