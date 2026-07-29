import { randomUUID } from "node:crypto";
import path from "node:path";
import { loadDocument } from "./loader.js";
import { chunkText, type ChunkStrategy } from "./chunker.js";
import { embedBatch } from "../retrieval/embedder.js";
import { ensureCollection, upsertChunks, type ChunkPoint } from "../retrieval/vectorStore.js";
import { addDocument } from "../documentStore.js";
import type { Chunk } from "../types.js";

const DEFAULT_COLLECTION = process.env.QDRANT_COLLECTION ?? "rag";
const DEFAULT_MAX_SIZE = 500;
const DEFAULT_SIZE = 500;
const DEFAULT_OVERLAP_PERCENT = 15;
const DEFAULT_SIMILARITY_THRESHOLD = 0.75;
const DEFAULT_EMBED_CONCURRENCY = 4;

export interface IngestOptions {
  strategy?: ChunkStrategy;
  size?: number;            // fixed only
  overlapPercent?: number;  // fixed only
  maxSize?: number;         // recursive only
  similarityThreshold?: number; // semantic only
  collection?: string;
  concurrency?: number;     // embedBatch
  originalName?: string;    // original filename (used in citations + document record)
}

export type IngestResult =
  | { success: true; documentId: string; chunkCount: number }
  | {
      success: false;
      documentId: string;
      error: string;
      stage: "load" | "chunk" | "embed" | "upsert" | "persist";
    };

function log(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`[ingest] ${msg}`);
}

/**
 * Wire loader -> chunker -> embedder -> vectorStore into one ingest flow.
 *
 * Document identity: a fresh documentId (randomUUID) is minted per call. Re-ingesting
 * the same file creates a NEW record and a NEW set of points (non-idempotent). The
 * DELETE route pairs deleteDocument(id) with vectorStore.deleteByDocumentId to clean
 * both leaves.
 *
 * Per-page chunking: each LoadedDocument (one per page for PDFs) is chunked
 * independently -- this preserves accurate page attribution on every chunk's payload
 * (the whole point of using pdfjs-dist for extraction). chunkIndex is re-numbered
 * globally across the document so it stays unique within the document.
 *
 * Error handling: every stage is wrapped. A failure short-circuits to a discriminated
 * failure result with the stage name and error message. A batch caller can loop this
 * function across many files and one bad file never crashes the loop.
 */
export async function ingestDocument(
  filePath: string,
  options: IngestOptions = {},
): Promise<IngestResult> {
  const documentId = randomUUID();
  const collection = options.collection ?? DEFAULT_COLLECTION;
  const strategy: ChunkStrategy = options.strategy ?? "recursive";
  const sourceName = options.originalName ?? path.basename(filePath);

  // Stage 1: load
  let loadResult;
  try {
    loadResult = await loadDocument(filePath);
  } catch (e) {
    return {
      success: false,
      documentId,
      error: e instanceof Error ? e.message : String(e),
      stage: "load",
    };
  }
  log(
    `extracted ${loadResult.text.length} characters` +
      (loadResult.pages ? ` (${loadResult.pages} pages)` : ""),
  );

  // Stage 2: chunk (per loaded page; renumber globally across the document)
  let chunks: (Chunk & { page?: number })[] = [];
  try {
    const chunkOptions =
      strategy === "fixed"
        ? { size: options.size ?? DEFAULT_SIZE, overlapPercent: options.overlapPercent ?? DEFAULT_OVERLAP_PERCENT }
        : strategy === "semantic"
          ? { similarityThreshold: options.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD }
          : { maxSize: options.maxSize ?? DEFAULT_MAX_SIZE };

    let globalIndex = 0;
    for (const doc of loadResult.documents) {
      const pageChunks = await chunkText(doc.pageContent, strategy, chunkOptions);
      for (const c of pageChunks) {
        chunks.push({ text: c.text, chunkIndex: globalIndex++, page: doc.metadata.page });
      }
    }
  } catch (e) {
    return {
      success: false,
      documentId,
      error: e instanceof Error ? e.message : String(e),
      stage: "chunk",
    };
  }
  log(`created ${chunks.length} chunks`);
  if (chunks.length === 0) {
    return { success: true, documentId, chunkCount: 0 };
  }

  // Stage 3: embed
  let vectors: number[][];
  try {
    vectors = await embedBatch(
      chunks.map((c) => c.text),
      options.concurrency ?? DEFAULT_EMBED_CONCURRENCY,
    );
  } catch (e) {
    return {
      success: false,
      documentId,
      error: e instanceof Error ? e.message : String(e),
      stage: "embed",
    };
  }
  log(`embedded ${vectors.length}/${chunks.length} chunks`);

  // Stage 4: upsert to Qdrant
  const chunkPoints: ChunkPoint[] = chunks.map((c, i) => ({
    id: randomUUID(),
    vector: vectors[i],
    payload: {
      text: c.text,
      source: sourceName,
      page: c.page,
      chunkIndex: c.chunkIndex,
      documentId,
    },
  }));
  try {
    await ensureCollection(collection);
    await upsertChunks(collection, chunkPoints);
  } catch (e) {
    return {
      success: false,
      documentId,
      error: e instanceof Error ? e.message : String(e),
      stage: "upsert",
    };
  }
  log(`upserted ${chunkPoints.length} chunks to Qdrant ('${collection}')`);

  // Stage 5: persist document record
  try {
    await addDocument({
      id: documentId,
      source: sourceName,
      ingestedAt: new Date().toISOString(),
      chunkCount: chunks.length,
    });
  } catch (e) {
    return {
      success: false,
      documentId,
      error: e instanceof Error ? e.message : String(e),
      stage: "persist",
    };
  }
  log(`persisted document record (id=${documentId})`);

  return { success: true, documentId, chunkCount: chunks.length };
}