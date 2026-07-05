import express, { type Express, type Request, type Response } from "express";
import { retrieveForQuestion } from "./rag.js";
import { generate, generateStream } from "./generation/llm.js";
import { GenerationError } from "./errors.js";

const PORT = Number(process.env.PORT ?? 3000);
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";

const app: Express = express();
app.use(express.json());

async function probe(url: string, timeoutMs = 2000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

app.get("/health", async (_req, res) => {
  const [ollama, qdrant] = await Promise.all([
    probe(`${OLLAMA_URL}/api/tags`),
    probe(`${QDRANT_URL}/readyz`),
  ]);
  res.json({ ollama, qdrant });
});

interface QueryBody {
  question?: unknown;
  stream?: unknown;
  topK?: unknown;
  scoreThreshold?: unknown;
  collection?: unknown;
}

/**
 * POST /query
 * Body: { question: string, stream?: boolean, topK?: number, scoreThreshold?: number, collection?: string }
 *
 * - stream falsy (default): returns JSON { answer, chunks: RetrievedChunk[] }.
 * - stream truthy: returns text/plain; charset=utf-8 streamed token-by-token as
 *   the model generates them. Once the response has begun, status cannot change, so
 *   a mid-stream generation error surfaces as a trailing `\n\n[generation error: msg]` footer.
 *   Errors before the first token (infra down at retrieval time, before any bytes
 *   have been written) return a normal 503/500 JSON envelope.
 */
app.post("/query", async (req: Request, res: Response) => {
  const body = req.body as QueryBody;
  const question = body.question;
  if (typeof question !== "string" || question.trim().length === 0) {
    res.status(400).json({ error: "question is required and must be a non-empty string" });
    return;
  }

  const opts = {
    topK: typeof body.topK === "number" ? body.topK : undefined,
    scoreThreshold: typeof body.scoreThreshold === "number" ? body.scoreThreshold : undefined,
    collection: typeof body.collection === "string" ? body.collection : undefined,
  };

  let prepared;
  try {
    prepared = await retrieveForQuestion(question, opts);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(503).json({ error: `Retrieval failed: ${msg}` });
    return;
  }

  const wantStream = body.stream === true;

  if (!wantStream) {
    try {
      const answer = await generate(prepared.prompt);
      res.json({ answer, chunks: prepared.chunks });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(502).json({ error: `Generation failed: ${msg}` });
    }
    return;
  }

  // Streaming branch.
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx proxy buffering
  res.flushHeaders();

  // Pre-first-token error path: if generation throws before yielding anything, we
  // haven't actually written a body yet -- but we DID flush 200 headers. We can't
  // change the status, so we surface the failure as a clear error marker in the body.
  let firstToken = true;
  try {
    for await (const token of generateStream(prepared.prompt)) {
      if (firstToken) firstToken = false;
      if (!res.write(token)) {
        // backpressure: wait for drain
        await new Promise<void>((resolve) => res.once("drain", () => resolve()));
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (firstToken && !res.headersSent) {
      // shouldn't be reachable since headers are flushed above, kept as a guard
      res.status(502).json({ error: `Generation failed: ${msg}` });
      return;
    }
    res.write(`\n\n[generation error: ${msg}]`);
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`local-rag API listening on http://localhost:${PORT}`);
});

export { app };