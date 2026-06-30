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