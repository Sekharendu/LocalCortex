import { beforeEach, afterEach, test, expect, vi } from "vitest";
import express from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
const mock = vi.hoisted(() => ({ retrieve: vi.fn(), scope: vi.fn(), rewrite: vi.fn(), rerank: vi.fn(), assemble: vi.fn(), generate: vi.fn(), stream: vi.fn() }));
vi.mock("../src/retrieval/retriever.js", () => ({ retrieve: mock.retrieve }));
vi.mock("../src/retrieval/documentScope.js", () => ({ resolveDocumentScope: mock.scope, scopeQuestion: (q: string) => q }));
vi.mock("../src/generation/rewrite.js", () => ({ rewriteFollowUp: mock.rewrite }));
vi.mock("../src/retrieval/reranker.js", () => ({ rerank: mock.rerank }));
vi.mock("../src/retrieval/context.js", () => ({ assembleContext: mock.assemble }));
vi.mock("../src/generation/llm.js", () => ({ generate: mock.generate, generateStream: mock.stream, RAG_SYSTEM_PROMPT: "system", LEGACY_RAG_SYSTEM_PROMPT: "system" }));
import { retrieveForQuestion, answerQuestion, answerQuestionStream } from "../src/rag.js";
import { rerankConfig, contextConfig, rewriteConfig } from "../src/config.js";
import { RerankingError } from "../src/errors.js";
const scope = { status: "resolved", documentIds: ["only"] };
const chunks = [{ text: "unchanged text", source: "only.pdf", page: 2, score: .67, documentId: "only", chunkIndex: 3 }];
const defaults = { enabled: rerankConfig.enabled, expand: contextConfig.expand, rewrite: rewriteConfig.enabled };
beforeEach(() => {
  vi.clearAllMocks(); rerankConfig.enabled = true; contextConfig.expand = false; rewriteConfig.enabled = true;
  mock.scope.mockResolvedValue(scope); mock.retrieve.mockResolvedValue(chunks); mock.rewrite.mockResolvedValue(null);
  mock.rerank.mockImplementation(async (_q, cs) => cs.map((c: object) => ({ ...c, rerankScore: .9 })));
  mock.assemble.mockImplementation(async cs => cs); mock.generate.mockResolvedValue("answer");
});
afterEach(() => { rerankConfig.enabled = defaults.enabled; contextConfig.expand = defaults.expand; rewriteConfig.enabled = defaults.rewrite; });

test("off preserves retrieval options, chunks identity, prompt, citations and zero rerank calls", async () => {
  rerankConfig.enabled = false;
  const prep = await retrieveForQuestion("original", { topK: 7, mode: "hybrid", scoreThreshold: .7 });
  expect(mock.retrieve).toHaveBeenCalledWith("original", { topK: 7, mode: "hybrid", scoreThreshold: .7, documentScope: scope });
  expect(prep.chunks).toBe(chunks); expect(prep.passages).toBe(chunks); expect(prep.prompt).toContain(chunks[0].text);
  expect((await answerQuestion("original")).citations).toEqual([{ source: "only.pdf", page: 2 }]);
  expect(mock.rerank).not.toHaveBeenCalled();
});
test("enabled changes only retrieval candidate k and reranks before context selection", async () => {
  contextConfig.expand = true;
  const signal = new AbortController().signal;
  await retrieveForQuestion("PTO?", { topK: 10, mode: "dense", followupFloor: .6, signal });
  expect(mock.retrieve).toHaveBeenCalledWith("PTO?", { topK: 50, mode: "dense", followupFloor: .6, documentScope: scope });
  expect(mock.rerank).toHaveBeenCalledWith("PTO paid vacation time off?", chunks, 10, signal);
  expect(mock.assemble.mock.calls[0][0][0].rerankScore).toBe(.9);
});
test.each([null, "Standalone PTO?"])("followup policy with rewrite %s", async rewritten => {
  mock.rewrite.mockResolvedValue(rewritten);
  await retrieveForQuestion("And WFH?", { history: [{ role: "user", content: "PTO?" }] });
  expect(mock.rerank.mock.calls[0][0]).toBe(rewritten ? "Standalone PTO paid vacation time off?" : "PTO paid vacation time off?\nAnd WFH remote work from home?");
  expect(mock.retrieve.mock.calls[0]).toEqual(rewritten ? [rewritten, { topK: 50, documentScope: scope }] : ["And WFH?", { topK: 50, previousQuestion: "PTO?", documentScope: scope }]);
});
test("scope rejection and relevance rejection never dispatch rerank", async () => {
  mock.scope.mockResolvedValueOnce({ status: "ambiguous", documentIds: [] });
  expect((await retrieveForQuestion("paper conflict")).chunks).toEqual([]);
  expect(mock.retrieve).not.toHaveBeenCalled();
  mock.retrieve.mockResolvedValueOnce([]); await retrieveForQuestion("irrelevant");
  expect(mock.rerank).not.toHaveBeenCalled();
});
test("stream setup rejects eagerly on rerank failure before any generation", async () => {
  mock.rerank.mockRejectedValue(new RerankingError("provider offline"));
  await expect(answerQuestionStream("question")).rejects.toThrow("provider offline");
  await expect(answerQuestion("question")).rejects.toThrow("provider offline");
  expect(mock.generate).not.toHaveBeenCalled(); expect(mock.stream).not.toHaveBeenCalled();
});
test("cancellation after rerank stops context and generation", async () => {
  const controller = new AbortController();
  mock.rerank.mockImplementation(async () => { controller.abort(); return chunks; });
  await expect(answerQuestionStream("question", { signal: controller.signal })).rejects.toThrow();
  expect(mock.assemble).not.toHaveBeenCalled(); expect(mock.stream).not.toHaveBeenCalled();
});

test("HTTP streaming request returns JSON 503 before stream headers on rerank failure", async () => {
  const unbound = createServer();
  const listen = vi.spyOn(express.application, "listen").mockReturnValue(unbound);
  let server: ReturnType<typeof createServer> | undefined;
  try {
    const { app } = await import("../src/server.js");
    listen.mockRestore();
    server = createServer(app);
    await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
    mock.rerank.mockRejectedValue(new RerankingError("contract invalid"));
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/query`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "question", stream: true }),
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-citations")).toBeNull();
    expect(await response.json()).toEqual({ error: "Failed to answer question: contract invalid" });
    expect(mock.stream).not.toHaveBeenCalled();
  } finally {
    listen.mockRestore();
    if (server) { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve())); }
  }
});
