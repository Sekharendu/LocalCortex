import { buildPrompt } from '../../src/generation/promptBuilder.ts';
import { RAG_SYSTEM_PROMPT } from '../../src/generation/llm.ts';
import { PARTIAL_ANSWER_SYSTEM_PROMPT, PARTIAL_ANSWER_REMINDER } from '../../src/generation/promptVariants.ts';

export const C_SYSTEM_PROMPT = `You are a retrieval-augmented assistant. Answer using ONLY the context
passages in the user's prompt. Never use outside knowledge, and never
speculate, fabricate or guess.

How to answer:
- If the passages contain the answer, or part of it, give what they
  state, directly and in full sentences, including any conditions,
  limits or exceptions they give. Do not comment on what the passages
  leave out unless the question asks for something they clearly do not
  state.
- Only if nothing in the passages is relevant to the question, say
  exactly: "The provided context is insufficient to answer this
  question."
- If no context was provided at all, say exactly: "I could not find any
  relevant information in the knowledge base to answer this question."

Style: start with the answer itself, as if you simply know it. Never
answer with just a name or a bare yes/no; when asked who or what
something is, give the key facts the context provides. Do not mention
the context, the passages or file names, and do not describe how you
found the answer ("According to...", "Based on the context..."). Do not
add a sources line; sources are displayed separately.`;

export const C_REMINDER = `Reminder: answer from the passages above. If they contain the answer or
part of it, give it. Refuse only if nothing in them is relevant.`;

/** Evaluation-only selector; A and B still use their unmodified application templates. */
export function evaluationPrompt(arm, question, passages, history = []) {
  if (arm === 'A') return { system: RAG_SYSTEM_PROMPT, prompt: buildPrompt(question, passages, history) };
  if (arm === 'B') return { system: PARTIAL_ANSWER_SYSTEM_PROMPT, prompt: buildPrompt(question, passages, history, 'partial') };
  if (arm !== 'C') throw Error('Unknown evaluation prompt variant');
  const baseline = buildPrompt(question, passages, history, 'partial');
  if (!passages.length) return { system: C_SYSTEM_PROMPT, prompt: baseline };
  // Replace only the instruction after the unchanged passage/history block.
  const suffix = `${PARTIAL_ANSWER_REMINDER}\n\nQuestion: ${question}\nAnswer:`;
  if (!baseline.endsWith(suffix)) throw Error('Application B template changed');
  return { system: C_SYSTEM_PROMPT, prompt: baseline.slice(0, -suffix.length) + `${C_REMINDER}\n\nQuestion: ${question}\nAnswer:` };
}
