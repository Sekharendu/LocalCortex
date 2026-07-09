// Shared types for the local RAG pipeline, kept compatible with LangChain's Document shape.
import type { Document } from "@langchain/core/documents";

/**
 * Metadata attached to every loaded document.
 * - `source`: original file path
 * - `page`: 1-indexed page number (only for paginated formats like PDF)
 * - `chunkIndex`: assigned later by the chunker (undefined at load time)
 */
export interface LoadedMetadata {
  source: string;
  page?: number;
  chunkIndex?: number;
}

/**
 * A loaded document, structurally compatible with LangChain's `Document<Metadata>`.
 * PDFs become one LoadedDocument per page so the chunker/citation layer can reference
 * the exact page; non-paginated formats (txt/md/docx) yield a single document.
 */
export type LoadedDocument = Document<LoadedMetadata>;

/**
 * Aggregate result returned by loadDocument: the concatenated full text plus the
 * per-page documents. Downstream chunking consumes `documents`; the `text` field is
 * a convenience for callers that just want the whole blob.
 */
export interface LoadResult {
  text: string;
  pages?: number;
  documents: LoadedDocument[];
  source: string;
}

/**
 * A text chunk emitted by the chunker. `chunkIndex` is sequential within a single
 * document, assigned in document order. Downstream embedders attach it to the
 * vector-store payload as the citation handle.
 */
export interface Chunk {
  text: string;
  chunkIndex: number;
}

/**
 * Payload shape stored on every Qdrant point in a RAG collection. Mirrors the fields
 * required for citation: source file, page (for PDFs), chunkIndex within the doc,
 * and the documentId used to group all chunks of one document together (for delete).
 */
export interface ChunkPayload {
  text: string;
  source: string;
  page?: number;
  chunkIndex: number;
  documentId: string;
}

/**
 * A deduplicated { source, page } pair derived from the chunks that cleared the
 * retrieval threshold for a given answer. Surfaces to API callers as the citations
 * array -- only sources that actually contributed to the prompt context appear, never
 * fabricated. Stable ordering mirrors first-appearance order in the prompt so a
 * reader can map citations to the order passages were presented to the model.
 */
export interface Citation {
  source: string;
  page?: number;
}