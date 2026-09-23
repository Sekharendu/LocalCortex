import { describe, test, expect } from "vitest";
import { isRefusal, classifyAnswer } from "../src/generation/refusal.js";

// Real llama3 answers captured from hallucination / near-miss runs. Every one of these is
// a correct refusal; the old patterns matched none of the first two canonical sentences.
const REAL_REFUSALS = [
  "I could not find any relevant information in the knowledge base to answer this question.",
  "The provided context is insufficient to answer this question.",
  "The provided context is insufficient to answer this question. None of the given passages (eval-corpus.txt files [1], [2], [3], [4], or [5]) mention parking reimbursement for employees.",
  "The provided context does not contain any information about dress code, so I could not find any relevant information to answer this question.",
  "The provided context does not contain enough information to answer this question. Note: There is no mention of a specific probation period.",
  "I could not find any relevant information in the provided context passages to answer this question about the maximum nightly hotel rate allowed on business trips.",
  "The provided context does not contain a mission statement for the company. Therefore, I cannot answer the question based on the given information.",
  "The provided context does not contain enough information to answer this question. The Sick Leave Policy in [1] states that unused sick leave carries over up to a maximum of 10 days into the following year, but it does not mention cashing out.",
  // After the "answer directly, don't mention the context" prompt change:
  "There is no information provided about parking reimbursement for employees in this context, so it cannot be answered.",
];

// Real and realistic answers to answerable questions -- must not read as refusals, even
// when they contain "cannot" / "does not include" in a policy sense.
const REAL_ANSWERS = [
  'According to [1] (source: eval-corpus.txt), "The company matches employee contributions up to 5% of base salary." Therefore, the company match on retirement contributions is 5%.',
  "The corporate headquarters in Austin, Texas (source: eval-corpus.txt, file [1]).",
  "Contractors cannot receive employee benefits such as health insurance or paid time off (source: employee-handbook.txt).",
  "The vacation policy does not include contractors; full-time employees accrue 15 days of paid vacation per year.",
  // Direct-style answers from the current prompt (scripts/check-answer-style.ts).
  "You may work remotely up to three days per week, with manager approval.",
  "Employees relocating temporarily outside their home country may work remotely for up to four consecutive weeks per calendar year, subject to prior approval from both your manager and the international mobility team.",
  "Full-time employees accrue 15 days of paid vacation per year during their first five years of service, which doesn't include sick leave.",
];

describe("isRefusal", () => {
  test.each(REAL_REFUSALS)("recognizes refusal: %s", (answer) => {
    expect(isRefusal(answer)).toBe(true);
  });

  test.each(REAL_ANSWERS)("does not flag a real answer: %s", (answer) => {
    expect(isRefusal(answer)).toBe(false);
  });
});

describe("classifyAnswer", () => {
  test("a refusal that repeats the question's words is PASS, not FAIL", () => {
    // Previously FAIL: "parking reimbursement" is both a fabrication marker and the topic.
    const r = classifyAnswer(REAL_REFUSALS[2], "Is there parking reimbursement for employees?", [
      "parking is reimbursed",
      "parking reimbursement",
      "covered",
      "you can claim",
    ]);
    expect(r.verdict).toBe("PASS");
  });

  test("a fabricated answer with no refusal is FAIL", () => {
    const r = classifyAnswer("Paris is the capital of France.", "What is the capital of France?", ["paris"]);
    expect(r.verdict).toBe("FAIL");
    expect(r.matchedFabrication).toBe("paris");
  });

  test("a refusal that still states the fabricated fact is AMBIGUOUS", () => {
    const r = classifyAnswer(
      "I could not find any relevant information in the knowledge base, but the capital is Paris.",
      "What is the capital of France?",
      ["paris"],
    );
    expect(r.verdict).toBe("AMBIGUOUS");
  });

  test("an answer matching neither is AMBIGUOUS, never forced", () => {
    expect(classifyAnswer("Hmm.", "What is the capital of France?", ["paris"]).verdict).toBe("AMBIGUOUS");
  });
});
