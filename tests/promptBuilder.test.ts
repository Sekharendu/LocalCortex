import { describe, test, expect } from "vitest";
import {
  buildPrompt,
  formatHistory,
  HISTORY_MAX_MESSAGES,
  HISTORY_MAX_ASSISTANT_CHARS,
  NO_CONTEXT_INSTRUCTION,
  ANSWER_REMINDER,
  type HistoryMessage,
} from "../src/generation/promptBuilder.js";
import type { RetrievedChunk } from "../src/retrieval/retriever.js";

const chunk: RetrievedChunk = {
  text: "Full-time employees accrue 15 days of paid vacation per year.",
  source: "eval-corpus.txt",
  score: 0.8,
};

const history: HistoryMessage[] = [
  { role: "user", content: "How many vacation days do I get?" },
  { role: "assistant", content: "15 days per year." },
];

describe("buildPrompt with history", () => {
  test("includes the conversation after the context, before the question", () => {
    const prompt = buildPrompt("And after five years?", [chunk], history);
    const ctx = prompt.indexOf("Context:");
    const conv = prompt.indexOf("Conversation so far");
    const q = prompt.indexOf("Question: And after five years?");
    expect(ctx).toBeGreaterThan(-1);
    expect(conv).toBeGreaterThan(ctx);
    expect(q).toBeGreaterThan(conv);
    expect(prompt).toContain("User: How many vacation days do I get?");
    expect(prompt).toContain("Assistant: 15 days per year.");
  });

  test("passages carry no citation tags or file names for the model to repeat", () => {
    const prompt = buildPrompt("How many vacation days?", [chunk, { ...chunk, page: 3 }]);
    expect(prompt).toContain(chunk.text);
    expect(prompt).not.toMatch(/\[\d+\]/);
    expect(prompt).not.toContain("(source:");
    expect(prompt).not.toContain("eval-corpus.txt");
  });

  test("without history the prompt is unchanged", () => {
    expect(buildPrompt("Q?", [chunk], [])).toBe(buildPrompt("Q?", [chunk]));
    expect(buildPrompt("Q?", [chunk])).not.toContain("Conversation so far");
  });

  test("with no retrieved context, history is ignored so the model must refuse", () => {
    const prompt = buildPrompt("And after five years?", [], history);
    expect(prompt).toContain(NO_CONTEXT_INSTRUCTION);
    expect(prompt).not.toContain("Conversation so far");
    expect(prompt).not.toContain("15 days per year.");
  });
});

describe("formatHistory", () => {
  test("keeps only the most recent messages", () => {
    const long: HistoryMessage[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `message ${i}`,
    }));
    const lines = formatHistory(long).split("\n");
    expect(lines).toHaveLength(HISTORY_MAX_MESSAGES);
    expect(lines[0]).toContain(`message ${10 - HISTORY_MAX_MESSAGES}`);
    expect(lines.at(-1)).toContain("message 9");
  });

  test("trims long assistant replies but never user messages", () => {
    const longText = "x".repeat(HISTORY_MAX_ASSISTANT_CHARS + 500);
    const out = formatHistory([
      { role: "user", content: longText },
      { role: "assistant", content: longText },
    ]);
    const [userLine, assistantLine] = out.split("\n");
    expect(userLine).toBe(`User: ${longText}`);
    expect(assistantLine).toBe(`Assistant: ${"x".repeat(HISTORY_MAX_ASSISTANT_CHARS)}…`);
  });
});

describe("buildPrompt answer reminder", () => {
  test("repeats the rules after the context and history, right before the question", () => {
    const prompt = buildPrompt("And after five years?", [chunk], history);
    const reminder = prompt.indexOf(ANSWER_REMINDER);
    expect(reminder).toBeGreaterThan(prompt.indexOf("Conversation so far"));
    expect(prompt.indexOf("Question: And after five years?")).toBeGreaterThan(reminder);
  });

  test("is left out when there is no context", () => {
    expect(buildPrompt("Q?", [])).not.toContain(ANSWER_REMINDER);
  });
});
