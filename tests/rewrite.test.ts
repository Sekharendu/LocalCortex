import { describe, test, expect } from "vitest";
import { buildRewritePrompt, cleanRewrite, needsRewrite } from "../src/generation/rewrite.js";

describe("needsRewrite", () => {
  // Follow-ups from data/followup-eval-set.json and the resume conversation that refer back.
  test.each([
    "And after five years?",
    "Do I need approval for that?",
    "What about for my dependents?",
    "Does it apply to secondary caregivers too?",
    "Do unused ones carry over?",
    "Do they follow the same holidays as headquarters?",
    "is he employed or unemployed now?",
    "what are his projects?",
    "tell me more about him",
  ])("rewrites %s", (q) => {
    expect(needsRewrite(q)).toBe(true);
  });

  // Standalone questions, including every off-topic follow-up: never sent to the rewriter,
  // so it can't turn "capital of France" into a question about the conversation.
  test.each([
    "What is the capital of France?",
    "How do I bake a chocolate cake?",
    "Who won the 2018 FIFA World Cup?",
    "What is the tallest mountain in the world?",
    "Explain how photosynthesis works.",
    "What is the boiling point of water in Fahrenheit?",
    "Does the company match contributions?",
    "When is the last paycheck paid?",
  ])("leaves %s alone", (q) => {
    expect(needsRewrite(q)).toBe(false);
  });
});

describe("cleanRewrite", () => {
  test("accepts a rewrite that resolves the pronoun", () => {
    expect(cleanRewrite("What are Sekharendu Dey's projects?", "what are his projects?")).toBe("What are Sekharendu Dey's projects?");
  });

  test("strips a label and quotes, keeps the first line", () => {
    expect(cleanRewrite('Standalone question: "Tell me more about Priya Sharma."\nExtra', "tell me more about her")).toBe(
      "Tell me more about Priya Sharma.",
    );
  });

  test("rejects a rewrite that swaps in a different question", () => {
    // Seen in the first probe: "tell me more about him" came back as the previous question.
    expect(cleanRewrite("What are Sekharendu Dey's projects?", "tell me more about him")).toBeNull();
    expect(cleanRewrite("What was his employment period?", "What does it cost?")).toBeNull();
  });

  test("rejects empty output and answers disguised as rewrites", () => {
    expect(cleanRewrite("   ", "Do I need approval for that?")).toBeNull();
    expect(
      cleanRewrite(
        "Yes, you need approval from your manager for remote work, which is allowed up to three days per week with core hours from 10am to 3pm in your local timezone.",
        "Do I need approval for that?",
      ),
    ).toBeNull();
  });
});

describe("buildRewritePrompt", () => {
  test("drops refusal replies, which only confuse the rewriter", () => {
    const prompt = buildRewritePrompt(
      [
        { role: "user", content: "Hey, I want to know about Sekharendu Dey" },
        { role: "assistant", content: "Sekharendu Dey is a software engineer." },
        { role: "user", content: "what are his projects?" },
        { role: "assistant", content: "I could not find any relevant information in the knowledge base to answer this question." },
      ],
      "tell me more about him",
    );
    expect(prompt).toContain("User: Hey, I want to know about Sekharendu Dey");
    expect(prompt).toContain("Assistant: Sekharendu Dey is a software engineer.");
    expect(prompt).not.toContain("could not find");
    expect(prompt.trimEnd().endsWith("Latest question: tell me more about him\nStandalone question:")).toBe(true);
  });
});
