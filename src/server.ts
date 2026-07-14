import express, { type Express, type Request, type Response, type NextFunction } from "express";
import multer, { MulterError } from "multer";
import { tmpdir } from "node:os";
import { unlink } from "node:fs/promises";
import { QdrantClient } from "@qdrant/js-client-rest";
import { answerQuestion, answerQuestionStream } from "./rag.js";
import { ingestDocument } from "./ingest/pipeline.js";
import { listDocuments, deleteDocument, getDocument, addDocument, type DocumentRecord } from "./documentStore.js";
import { deleteByDocumentId } from "./retrieval/vectorStore.js";
import { retrievalConfig } from "./config.js";

const PORT = Number(process.env.PORT ?? 3000);
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const MAX_INGEST_BYTES = Number(process.env.MAX_INGEST_BYTES ?? 50 * 1024 * 1024);

const app: Express = express();
const qsClient = new QdrantClient({ url: QDRANT_URL, checkCompatibility: false });

app.use(express.json());

// ----- multer: write uploads to OS temp dir; auto-cleaned in the /ingest finally block
const upload = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, file, cb) => cb(null, `${process.pid}-${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: MAX_INGEST_BYTES },
});

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
  const [ollamaUp, qdrantUp] = await Promise.all([
    probe(`${OLLAMA_URL}/api/tags`),
    probe(`${QDRANT_URL}/readyz`),
  ]);

  const collectionName = retrievalConfig.collection;
  let chunkCount: number | null = null;

  if (qdrantUp) {
    try {
      const exists = await qsClient.collectionExists(collectionName);
      if (exists.exists === true) {
        const countResult = await qsClient.count(collectionName, { exact: true });
        chunkCount = countResult.count ?? 0;
      }
    } catch {
      // fall through -- collection stat unavailable; report null
    }
  }

  res.json({
    ollama: ollamaUp,
    qdrant: qdrantUp,
    collection: qdrantUp ? collectionName : null,
    chunkCount,
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
}

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

// ----- 404 (no route matched) ---------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: `route not found: ${req.method} ${req.path}` });
});

// ----- centralized error middleware ---------------------------------------------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
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