import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ retrieve: vi.fn(), scope: vi.fn(), assemble: vi.fn() }));
vi.mock("../src/retrieval/retriever.js", () => ({ retrieve: mocks.retrieve }));
vi.mock("../src/retrieval/documentScope.js", () => ({ resolveDocumentScope: mocks.scope, scopeQuestion: (q: string) => q }));
vi.mock("../src/retrieval/context.js", () => ({ assembleContext: mocks.assemble }));

import { buildPrompt, formatHistory } from "../src/generation/promptBuilder.js";
import { LEGACY_RAG_SYSTEM_PROMPT as RAG_SYSTEM_PROMPT, generate } from "../src/generation/llm.js";
import { PARTIAL_ANSWER_SYSTEM_PROMPT, PARTIAL_ANSWER_REMINDER, C_SYSTEM_PROMPT } from "../src/generation/promptVariants.js";
import { answerQuestion, answerQuestionStream, contextBudget, retrieveForQuestion } from "../src/rag.js";
import { contextConfig, rerankConfig } from "../src/config.js";
import { countTokens } from "../src/generation/tokens.js";

const chunk = { text: "A supported fact.", source: "paper.pdf", score: .8 };
const history = [{ role: "user" as const, content: "Earlier question?" }, { role: "assistant" as const, content: "Earlier answer." }];
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const original = { expand: contextConfig.expand, rerank: rerankConfig.enabled };
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "a".repeat(32));
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-token");
  vi.stubGlobal("fetch", fetchMock);
  contextConfig.expand = true; rerankConfig.enabled = false;
  mocks.scope.mockResolvedValue({ status: "resolved", documentIds: ["paper"] });
  mocks.retrieve.mockResolvedValue([chunk]); mocks.assemble.mockResolvedValue([chunk]);
  fetchMock.mockImplementation(async () => Response.json({ result: { choices: [{ text: "A supported answer." }] }, success: true }));
});
afterEach(() => {
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
  contextConfig.expand = original.expand; rerankConfig.enabled = original.rerank;
});

describe("opt-in partial answer prompts", () => {
  test("default production prompt bytes match the pre-change snapshot", () => {
    expect(hash(RAG_SYSTEM_PROMPT)).toBe("f79467778d852d5c6b88dde4515330128202044009efb6cdf786bc9927af08c5");
    expect(hash(buildPrompt("Question?", [chunk], [], "legacy"))).toBe("734fd61e87700534f690f16b7999ce90a095feb82cfa2819033015d33395a0b8");
    expect(hash(buildPrompt("Question?", [chunk], history, "legacy"))).toBe("107c8a54588548fc995fbb63f639ebdfe600c21ce0061667c1e4596fd5dd60ca");
    expect(hash(buildPrompt("Question?", [], history))).toBe("1c0fb8b097b25887abde8305814d6bc6d83cdb85d907ec67c5438117dec69aa8");
  });

  test("partial template preserves passages, separators and history but drops old refusal instructions", () => {
    const prompt = buildPrompt("Question?", [chunk, { ...chunk, text: "Second fact." }], history, "partial");
    expect(prompt).toBe(`Context passages:\n\nA supported fact.\n\n---\n\nSecond fact.\n\nConversation so far (for resolving references only; answer from the Context above):\n${formatHistory(history)}\n\n${PARTIAL_ANSWER_REMINDER}\n\nQuestion: Question?\nAnswer:`);
    expect(PARTIAL_ANSWER_SYSTEM_PROMPT).toContain("give the supported part");
    expect(PARTIAL_ANSWER_SYSTEM_PROMPT + prompt).not.toContain("enough information");
    expect(PARTIAL_ANSWER_SYSTEM_PROMPT + prompt).not.toContain("answer fully");
    expect(prompt).not.toContain("paper.pdf");
  });

  test("no-context user message is identical in both variants and still ignores history", () => {
    expect(buildPrompt("Question?", [], history, "partial")).toBe(buildPrompt("Question?", [], history));
    expect(buildPrompt("Question?", [], history, "partial")).not.toContain("Earlier answer.");
  });

  test("budget uses the selected system and user instructions with unchanged history accounting", () => {
    const skeleton = buildPrompt("Question?", [{ text: "", source: "", score: 0 }], history, "partial");
    expect(contextBudget("Question?", history, "partial")).toBe(contextConfig.numCtx - 32 - countTokens(PARTIAL_ANSWER_SYSTEM_PROMPT) - countTokens(skeleton) - contextConfig.answerReserveTokens);
    expect(contextBudget("Question?", history, "partial")).not.toBe(contextBudget("Question?", history));
  });

  test("retrieval never receives the prompt flag; preparation returns matching instructions", async () => {
    const prep = await retrieveForQuestion("Question?", { promptVariant: "partial", topK: 15 });
    expect(mocks.retrieve).toHaveBeenCalledWith("Question?", { topK: 15, documentScope: { status: "resolved", documentIds: ["paper"] } });
    expect(mocks.assemble.mock.calls[0][1].budgetTokens).toBe(contextBudget("Question?", [], "partial"));
    expect(prep.systemPrompt).toBe(PARTIAL_ANSWER_SYSTEM_PROMPT);
    expect(prep.passages).toEqual([chunk]);
    expect(prep.prompt).toBe(buildPrompt("Question?", [chunk], [], "partial"));
  });

  test("overlapping default and partial requests send their own system and user prompts", async () => {
    await Promise.all([answerQuestion("Partial?", { promptVariant: "partial" }), answerQuestion("Default?", { answerProfile: "legacy" })]);
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as { prompt: string });
    const partial = bodies.find(b => b.prompt.includes("Question: Partial?"))!.prompt;
    const legacy = bodies.find(b => b.prompt.includes("Question: Default?"))!.prompt;
    expect(partial).toContain(`<|im_start|>system\n${PARTIAL_ANSWER_SYSTEM_PROMPT}<|im_end|>`);
    expect(partial).not.toContain("answer fully");
    expect(legacy).toContain(`<|im_start|>system\n${RAG_SYSTEM_PROMPT}<|im_end|>`);
    expect(legacy).toContain("answer fully");
    expect(legacy).not.toContain(PARTIAL_ANSWER_REMINDER);
  });

  test.each(["legacy", "partial", "concise"] as const)("streaming forwards the %s system variant", async variant => {
    fetchMock.mockResolvedValue(new Response('data: {"choices":[{"text":"Supported answer.","finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', { headers: { "Content-Type": "text/event-stream" } }));
    const setup = await answerQuestionStream("Question?", { promptVariant: variant });
    let text = "";
    for await (const token of setup.tokens) text += token;
    expect(text).toBe("Supported answer.");
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.stream).toBe(true);
    expect(body.prompt).toContain(`<|im_start|>system\n${variant === "concise" ? C_SYSTEM_PROMPT : variant === "partial" ? PARTIAL_ANSWER_SYSTEM_PROMPT : RAG_SYSTEM_PROMPT}<|im_end|>`);
  });

  test("new default uses C,512 output and15hits while legacy stays per-request", async () => {
    await answerQuestion("New defaults?");
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.max_tokens).toBe(512);
    expect(body.prompt).toContain(C_SYSTEM_PROMPT);
    expect(body.prompt).toContain("Context passages:");
    expect(mocks.retrieve.mock.calls[0][1].topK).toBe(15);
    expect(mocks.assemble.mock.calls[0][1].chunkedMaxTokens).toBe(3200);
    await answerQuestion("Old defaults?", { answerProfile: "legacy" });
    expect(mocks.retrieve.mock.calls[1][1].topK).toBe(5);
    expect(mocks.assemble.mock.calls[1][1].chunkedMaxTokens).toBe(1200);
  });

  test("explicit paper selection bypasses catalog scans and remains filtered", async () => {
    const selected = { status: "resolved" as const, references: [], documentIds: ["dev-only"] };
    await retrieveForQuestion("Question?", { documentScope: selected });
    expect(mocks.scope).not.toHaveBeenCalled();
    expect(mocks.retrieve.mock.calls[0][1].documentScope).toBe(selected);
  });

  test("an explicit rewrite/custom system override is still honored", async () => {
    await generate("Rewrite this.", { system: "Custom rewrite rules.", maxTokens: 48 });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.prompt).toContain("<|im_start|>system\nCustom rewrite rules.<|im_end|>");
    expect(body.max_tokens).toBe(48);
    expect(body.prompt).not.toContain(PARTIAL_ANSWER_SYSTEM_PROMPT);
  });
});
