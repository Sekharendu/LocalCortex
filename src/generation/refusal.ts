// Recognizes the model's "I can't answer from this context" replies. Shared by
// scripts/test-hallucination.ts and tests/rag.test.ts so they judge answers the same way.
//
// The patterns must match what RAG_SYSTEM_PROMPT (llm.ts) and promptBuilder.ts tell the
// model to say -- "The provided context is insufficient..." and "I could not find any
// relevant information..." -- plus the paraphrases llama3 actually produces. An earlier
// version only accepted "insufficient context" and "couldn't", so neither canonical
// sentence matched and every correct refusal scored as AMBIGUOUS or FAIL.
//
// Patterns reference the context/information explicitly on purpose: a bare "cannot" or
// "does not include" also appears in legitimate answers ("contractors cannot...").
export const REFUSAL_PATTERNS: RegExp[] = [
  /\bcontext is insufficient\b/i,
  /\binsufficient (context|information)\b/i,
  /\bcould(?: not|n'?t) (find|locate) (any )?(relevant )?(information|context|details)\b/i,
  /\b(context|passages?|documents?|sources?) (does|do)(?: not|n'?t) (contain|mention|provide|include)\b/i,
  /\b(none|neither) of the (provided|given) (passages?|documents?|contexts?|sources?)\b/i,
  /\bno (relevant|matching|related) (information|context|documents|passages?)\b/i,
  /\bnot (found|available) in the (knowledge base|context|provided context)\b/i,
  /\b(cannot|can'?t|unable to) (answer|provide an answer)\b/i,
  /\bthere is no mention of\b/i,
];

export function matchRefusal(answer: string): string | null {
  return REFUSAL_PATTERNS.find((p) => p.test(answer))?.source ?? null;
}

export function isRefusal(answer: string): boolean {
  return matchRefusal(answer) !== null;
}

const HEDGE_PATTERNS = [/\bi think\b/i, /\bi'?m not sure\b/i, /\blikely\b/i, /\bprobably\b/i, /\bit seems\b/i];

export type AnswerVerdict = "PASS" | "FAIL" | "AMBIGUOUS";

/**
 * Judges an answer to a question whose answer is NOT in the corpus.
 * PASS = refused; FAIL = a fabrication marker fired with no refusal; AMBIGUOUS = both or
 * neither (left for a human, never forced).
 *
 * Markers that also appear in the question are ignored: a refusal naturally restates the
 * question ("None of the passages mention parking reimbursement"), so those words can't
 * tell a refusal from a fabrication.
 */
export function classifyAnswer(
  answer: string,
  question: string,
  fabricationMarkers: string[],
): { verdict: AnswerVerdict; matchedRefusal: string | null; matchedFabrication: string | null; isHedged: boolean } {
  const matchedRefusal = matchRefusal(answer);
  const lowerAnswer = answer.toLowerCase();
  const lowerQuestion = question.toLowerCase();
  const matchedFabrication =
    fabricationMarkers
      .map((m) => m.toLowerCase())
      .filter((m) => !lowerQuestion.includes(m))
      .find((m) => lowerAnswer.includes(m)) ?? null;
  const isHedged = HEDGE_PATTERNS.some((p) => p.test(answer));

  if (matchedRefusal && !matchedFabrication) return { verdict: "PASS", matchedRefusal, matchedFabrication, isHedged };
  if (matchedFabrication && !matchedRefusal) return { verdict: "FAIL", matchedRefusal, matchedFabrication, isHedged };
  return { verdict: "AMBIGUOUS", matchedRefusal, matchedFabrication, isHedged };
}
