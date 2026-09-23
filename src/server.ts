import express, { type Express, type Request, type Response, type NextFunction } from "express";
import multer, { MulterError } from "multer";
import { tmpdir } from "node:os";
import { unlink } from "node:fs/promises";
import { answerQuestion, answerQuestionStream } from "./rag.js";
import { ingestDocument } from "./ingest/pipeline.js";
import { listDocuments, deleteDocument, getDocument, addDocument, type DocumentRecord } from "./documentStore.js";
import { deleteByDocumentId } from "./retrieval/vectorStore.js";
import { retrievalConfig } from "./config.js";
import { postgresReachable } from "./db.js";
import {
  appendMessage,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
} from "./conversationStore.js";
import type { Citation } from "./types.js";

const PORT = Number(process.env.PORT ?? 3000);
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const MAX_INGEST_BYTES = Number(process.env.MAX_INGEST_BYTES ?? 50 * 1024 * 1024); // 50 MB (50 * 1024 * 1024 bytes)

const app: Express = express();

app.use(express.json());

// ----- multer: write uploads to OS temp dir; auto-cleaned in the /ingest finally block
const upload = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, file, cb) => cb(null, `${process.pid}-${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: MAX_INGEST_BYTES },
});

/**
 * description: Pings a URL with a strict timeout to verify service availability.
 * Utilizes an AbortController to kill hanging network requests.
**/
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

// ----- GET /health -------------------------------------------------------------
app.get("/health", async (_req, res) => {
  const [ollamaUp, qdrantUp, postgresUp] = await Promise.all([
    probe(`${OLLAMA_URL}/api/tags`),
    probe(`${QDRANT_URL}/readyz`),
    postgresReachable(),
  ]);

  res.json({
    ollama: ollamaUp,
    qdrant: qdrantUp,
    postgres: postgresUp,
  });
});

// ----- POST /ingest ------------------------------------------------------------
app.post("/ingest", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "file upload required (multipart field 'file')" });
    return;
  }

  const strategyRaw = typeof req.body?.strategy === "string" ? req.body.strategy : undefined;
  const strategy =
    strategyRaw === "fixed" || strategyRaw === "semantic" || strategyRaw === "recursive"
      ? strategyRaw
      : "recursive";

  try {
    const result = await ingestDocument(req.file.path, {
      strategy,
      originalName: req.file.originalname,
    });
    if (!result.success) {
      res.status(502).json({ error: `Ingest failed at stage '${result.stage}': ${result.error}` });
      return;
    }
    res.json({ documentId: result.documentId, chunkCount: result.chunkCount });
  } finally {
    // always clean the temp upload; never let failed ingests leave garbage on disk
    await unlink(req.file.path).catch(() => {});
  }
});

// ----- POST /query -------------------------------------------------------------
interface QueryBody {
  question?: unknown;
  stream?: unknown;
  topK?: unknown;
  scoreThreshold?: unknown;
  collection?: unknown;
}//declared everything as unknown so as to handle the creash gracefully when user gives an invalid input.
// i first accept everything as it is and manually check for types. this prevents creash.

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

  const wantStream = body.stream === true;

  if (!wantStream) {
    try {
      const { answer, chunks, citations } = await answerQuestion(question, opts);
      res.json({ answer, chunks, citations });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(503).json({ error: `Failed to answer question: ${msg}` });
    }
    return;
  }

  // Streaming branch -- once we flush headers, status is immutable. Run the
  // retrieval+buildPrompt+citations setup EAGERLY (inside answerQuestionStream's returned
  // promise) so pre-stream infra failures surface as a normal 503 JSON envelope
  // before any bytes have been written; a post-setup mid-stream generation failure
  // surfaces as a trailing `\n\n[generation error: msg]` footer.
  //
  // Citations are emitted as an `X-Citations` response header rather than a trailing
  // SSE event so the streamed body stays pure text/plain tokens for existing clients
  // that just consume tokens -- citation metadata is a side channel clients opt into.
  let tokenStream: AsyncGenerator<string>;
  let citations: { source: string; page?: number }[];
  try {
    const setup = await answerQuestionStream(question, opts);
    tokenStream = setup.tokens;
    citations = setup.citations;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(503).json({ error: `Failed to answer question: ${msg}` });
    return;
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  // Citations in a metadata header -- zero body-format change for token-only clients.
  // Header values can't contain raw newlines; JSON.stringify escapes them safely.
  res.setHeader("X-Citations", JSON.stringify(citations));
  res.flushHeaders();

  let firstToken = true;
  try {
    for await (const token of tokenStream) {
      firstToken = false;
      if (!res.write(token)) {
        await new Promise<void>((resolve) => res.once("drain", () => resolve()));
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (firstToken && !res.headersSent) {
      // unreachable in practice (headers flushed above) but kept as a defensive guard
      res.status(503).json({ error: `Failed to answer question: ${msg}` });
      return;
    }
    res.write(`\n\n[generation error: ${msg}]`);
  } finally {
    res.end();
  }
});

// ----- GET /documents ----------------------------------------------------------
app.get("/documents", async (_req, res) => {
  const docs = await listDocuments();
  // newest first so the operator's recent ingests surface at the top
  docs.sort((a, b) => (a.ingestedAt < b.ingestedAt ? 1 : -1));
  res.json({ documents: docs });
});

// ----- DELETE /documents/:id ---------------------------------------------------
app.delete("/documents/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  let record: DocumentRecord | null;
  try {
    record = await deleteDocument(id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: `Document store delete failed: ${msg}` });
    return;
  }
  if (record === null) {
    res.status(404).json({ error: `document not found: ${id}` });
    return;
  }

  try {
    await deleteByDocumentId(retrievalConfig.collection, id);
  } catch (e) {
    // Roll back the document-store delete so the two stores never drift out of sync.
    // The record is restored; caller can retry once Qdrant recovers.
    try {
      await addDocument(record);
    } catch {
      // best-effort restoration; even if it fails, we surface the original vector error
    }
    const msg = e instanceof Error ? e.message : String(e);
    res.status(502).json({ error: `Vector store delete failed; document-store record restored: ${msg}` });
    return;
  }

  res.json({ deleted: record });
});

// ----- conversations -----------------------------------------------------------
// Express 4 doesn't forward rejected promises from async handlers to the error
// middleware -- a thrown error (e.g. Postgres down) would leave the request hanging.
function route(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

const DEFAULT_TITLE = "New chat";
const TITLE_MAX_CHARS = 60;

function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > TITLE_MAX_CHARS ? `${t.slice(0, TITLE_MAX_CHARS - 1)}…` : t;
}

/** Resolves when the socket can take more data -- or when the client goes away, so a
 * disconnect during backpressure can't leave the handler waiting forever. */
function drainOrClose(res: Response): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      res.off("drain", done);
      res.off("close", done);
      resolve();
    };
    res.once("drain", done);
    res.once("close", done);
  });
}

app.get(
  "/conversations",
  route(async (_req, res) => {
    res.json({ conversations: await listConversations() });
  }),
);

app.post(
  "/conversations",
  route(async (req, res) => {
    const raw = (req.body as { title?: unknown } | undefined)?.title;
    const title = typeof raw === "string" && raw.trim() ? titleFrom(raw) : DEFAULT_TITLE;
    res.status(201).json({ conversation: await createConversation(title) });
  }),
);

app.get(
  "/conversations/:id",
  route(async (req, res) => {
    const conversation = await getConversation(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: `conversation not found: ${req.params.id}` });
      return;
    }
    res.json({ conversation });
  }),
);

app.patch(
  "/conversations/:id",
  route(async (req, res) => {
    const raw = (req.body as { title?: unknown } | undefined)?.title;
    if (typeof raw !== "string" || raw.trim().length === 0) {
      res.status(400).json({ error: "title is required and must be a non-empty string" });
      return;
    }
    const conversation = await renameConversation(req.params.id, titleFrom(raw));
    if (!conversation) {
      res.status(404).json({ error: `conversation not found: ${req.params.id}` });
      return;
    }
    res.json({ conversation });
  }),
);

app.delete(
  "/conversations/:id",
  route(async (req, res) => {
    if (!(await deleteConversation(req.params.id))) {
      res.status(404).json({ error: `conversation not found: ${req.params.id}` });
      return;
    }
    res.json({ deleted: req.params.id });
  }),
);

// Streams the answer exactly like POST /query (text/plain body, X-Citations header,
// 503 JSON if setup fails before streaming), and saves both turns.
app.post(
  "/conversations/:id/messages",
  route(async (req, res) => {
    const content = (req.body as { content?: unknown } | undefined)?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ error: "content is required and must be a non-empty string" });
      return;
    }
    const conversation = await getConversation(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: `conversation not found: ${req.params.id}` });
      return;
    }

    // Only completed turns go into memory; a half-written or failed answer would mislead.
    const history = conversation.messages
      .filter((m) => m.status === null)
      .map((m) => ({ role: m.role, content: m.content }));

    await appendMessage(conversation.id, { role: "user", content });
    if (conversation.messages.length === 0 && conversation.title === DEFAULT_TITLE) {
      await renameConversation(conversation.id, titleFrom(content));
    }

    // Client disconnect (tab closed, Stop pressed) aborts generation so llama3 stops.
    const controller = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });

    let tokens: AsyncGenerator<string>;
    let citations: Citation[];
    try {
      ({ tokens, citations } = await answerQuestionStream(content, { history, signal: controller.signal }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await appendMessage(conversation.id, { role: "assistant", content: msg, status: "error" });
      res.status(503).json({ error: `Failed to answer question: ${msg}` });
      return;
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("X-Citations", JSON.stringify(citations));
    res.flushHeaders();

    let answer = "";
    let status: "interrupted" | "error" | null = null;
    try {
      for await (const token of tokens) {
        answer += token;
        if (!res.write(token)) await drainOrClose(res);
        if (controller.signal.aborted) break;
      }
      if (controller.signal.aborted) status = "interrupted";
    } catch (e) {
      if (controller.signal.aborted) {
        status = "interrupted";
      } else {
        status = "error";
        const msg = e instanceof Error ? e.message : String(e);
        res.write(`\n\n[generation error: ${msg}]`);
      }
    } finally {
      try {
        await appendMessage(conversation.id, { role: "assistant", content: answer, citations, status });
      } catch (e) {
        // e.g. the chat was deleted while answering. The response is already under way,
        // so there's no status left to report this with.
        // eslint-disable-next-line no-console
        console.error(`[messages] could not save the answer for ${conversation.id}:`, e);
      }
      if (!res.writableEnded) res.end();
    }
  }),
);

// ----- 404 (no route matched) ---------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: `route not found: ${req.method} ${req.path}` });
});

// ----- centralized error middleware ---------------------------------------------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Mid-stream failures can't change the status any more; log and close.
  if (res.headersSent) {
    // eslint-disable-next-line no-console
    console.error("[unhandled after headers sent]", err);
    if (!res.writableEnded) res.end();
    return;
  }
  if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: `upload too large (max ${MAX_INGEST_BYTES} bytes)` });
    return;
  }
  // express.json() parse failures arrive as SyntaxError with type=entity.parse.failed
  if (
    err instanceof SyntaxError &&
    typeof (err as unknown as { type?: string }).type === "string" &&
    (err as unknown as { type: string }).type === "entity.parse.failed"
  ) {
    res.status(400).json({ error: "request body is not valid JSON" });
    return;
  }
  // Postgres refusing connections (container stopped) is an infra outage, not a bug.
  if ((err as { code?: string } | null)?.code === "ECONNREFUSED") {
    res.status(503).json({ error: "database unreachable -- is the postgres container running? (docker compose up -d postgres)" });
    return;
  }
  // eslint-disable-next-line no-console
  console.error("[unhandled]", err);
  res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
});

// Re-export getDocument for completeness/tests if needed elsewhere
export { getDocument };

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`local-rag API listening on http://localhost:${PORT}`);
});

export { app };