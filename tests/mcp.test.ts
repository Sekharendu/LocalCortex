import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

vi.mock("../src/retrieval/retriever.js", () => ({ retrieve: vi.fn() }));
import { retrieve } from "../src/retrieval/retriever.js";
import { searchRouter } from "../src/searchRouter.js";

describe("LocalCortex MCP over stdio", () => {
  let http: Server;
  let client: Client;
  let apiUrl: string;
  let queryBody: unknown;
  let uploadBody: string;
  let deletedId: string;
  const documentId = "8a1d2c30-f413-4eab-9ad5-9014e9a56640";

  beforeAll(async () => {
    const api = express();
    api.use(express.json());
    api.use(searchRouter);
    api.get("/health", (_req, res) => res.json({ ollama: true, qdrant: true, postgres: false }));
    api.get("/documents", (_req, res) => res.json({ documents: [{ id: documentId, source: "sample.txt" }] }));
    api.post("/query", (req, res) => {
      queryBody = req.body;
      res.json({ answer: "A fox.", chunks: [], citations: [{ source: "sample.txt" }] });
    });
    api.post("/ingest", express.raw({ type: "multipart/form-data", limit: "1mb" }), (req, res) => {
      uploadBody = (req.body as Buffer).toString();
      res.json({ documentId, chunkCount: 1 });
    });
    api.delete("/documents/:id", (req, res) => {
      deletedId = req.params.id;
      res.status(502).json({ error: "Qdrant delete failed; record restored" });
    });
    // A prefix exercises Docker's /api base URL handling too.
    const app = express();
    app.use("/api", api);
    http = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => http.once("listening", resolve));
    const address = http.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    apiUrl = `http://127.0.0.1:${address.port}/api`;
    client = new Client({ name: "localcortex-test", version: "1.0.0" });
    const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined));
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", fileURLToPath(new URL("../src/mcp.ts", import.meta.url))],
      env: { ...env, LOCALCORTEX_API_URL: apiUrl },
      stderr: "pipe",
    }));
  });

  beforeEach(() => vi.mocked(retrieve).mockReset());
  afterAll(async () => {
    await client?.close();
    if (http) {
      http.closeAllConnections();
      await new Promise<void>((resolve, reject) => http.close((error) => error ? reject(error) : resolve()));
    }
  });

  test("discovers six tools and marks deletion as destructive", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(6);
    expect(tools.find((tool) => tool.name === "localcortex_search")?.annotations?.readOnlyHint).toBe(true);
    expect(tools.find((tool) => tool.name === "localcortex_delete_document")?.annotations?.destructiveHint).toBe(true);
  });

  test("reads health and documents from the configured API", async () => {
    const health = await client.callTool({ name: "localcortex_health", arguments: {} });
    expect(health.structuredContent).toEqual({ ollama: true, qdrant: true, postgres: false });
    const documents = await client.callTool({ name: "localcortex_list_documents", arguments: {} });
    expect(documents.structuredContent).toEqual({ documents: [{ id: documentId, source: "sample.txt" }] });
  });

  test("search returns actual passages and forwards hybrid options without generation", async () => {
    const chunks = [{ text: "A fox jumps.", source: "sample.txt", page: 2, score: 0.8 }];
    vi.mocked(retrieve).mockResolvedValueOnce(chunks);
    const response = await client.callTool({ name: "localcortex_search", arguments: { question: "fox?", topK: 3, mode: "hybrid" } });
    expect(response.structuredContent).toEqual({ chunks });
    expect(retrieve).toHaveBeenCalledWith("fox?", { topK: 3, mode: "hybrid" });
  });

  test("preserves an empty retrieval result", async () => {
    vi.mocked(retrieve).mockResolvedValueOnce([]);
    const response = await client.callTool({ name: "localcortex_search", arguments: { question: "unrelated?" } });
    expect(response.structuredContent).toEqual({ chunks: [] });
  });

  test("validates MCP input before calling retrieval", async () => {
    const response = await client.callTool({ name: "localcortex_search", arguments: { question: " ", topK: -1 } });
    expect(response.isError).toBe(true);
    expect(retrieve).not.toHaveBeenCalled();
  });

  test("maps infrastructure errors to MCP tool errors", async () => {
    vi.mocked(retrieve).mockRejectedValueOnce(new Error("Qdrant unavailable"));
    const response = await client.callTool({ name: "localcortex_search", arguments: { question: "fox?" } });
    expect(response.isError).toBe(true);
    expect(JSON.stringify(response.content)).toContain("Qdrant unavailable");
  });

  test("asks the local LLM through the non-streaming endpoint", async () => {
    const response = await client.callTool({ name: "localcortex_ask", arguments: { question: "fox?" } });
    expect(queryBody).toEqual({ question: "fox?", stream: false });
    expect(response.structuredContent).toMatchObject({ answer: "A fox.", citations: [{ source: "sample.txt" }] });
  });

  test("uploads a file as multipart with its original filename and default strategy", async () => {
    const response = await client.callTool({ name: "localcortex_ingest", arguments: {
      filePath: fileURLToPath(new URL("../data/sample.txt", import.meta.url)),
    } });
    expect(response.isError).not.toBe(true);
    expect(response.structuredContent).toEqual({ documentId, chunkCount: 1 });
    expect(uploadBody).toContain('filename="sample.txt"');
    expect(uploadBody).toContain("recursive");
    expect(uploadBody).toContain("fox");
  });

  test("rejects relative upload paths and unsupported file types", async () => {
    for (const filePath of ["data/sample.txt", fileURLToPath(new URL("../package.json", import.meta.url))]) {
      const response = await client.callTool({ name: "localcortex_ingest", arguments: { filePath } });
      expect(response.isError).toBe(true);
    }
  });

  test("keeps deletion on the existing API rollback path and surfaces its error", async () => {
    const response = await client.callTool({ name: "localcortex_delete_document", arguments: { documentId } });
    expect(deletedId).toBe(documentId);
    expect(response.isError).toBe(true);
    expect(JSON.stringify(response.content)).toContain("record restored");
  });

  test("search endpoint rejects invalid input without running retrieval", async () => {
    for (const body of [{}, { question: " " }, { question: "fox?", topK: 21 }, { question: "fox?", mode: "unknown" }]) {
      const response = await fetch(`${apiUrl}/search`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty("error");
    }
    expect(retrieve).not.toHaveBeenCalled();
  });
});
