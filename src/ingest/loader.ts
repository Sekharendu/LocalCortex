import fs from "node:fs/promises";
import path from "node:path";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api.js";
import mammoth from "mammoth";
import { Document } from "@langchain/core/documents";
import { DocumentReadError, UnsupportedFileTypeError } from "../errors.js";
import type { LoadResult, LoadedDocument, LoadedMetadata } from "../types.js";

// Run pdfjs on the main thread (no real worker needed in Node); the legacy build is Node-compatible.
GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";

function isTextItem(item: unknown): item is TextItem {
  return typeof item === "object" && item !== null && "str" in item;
}

function makeDoc(pageContent: string, metadata: LoadedMetadata): LoadedDocument {
  return new Document<LoadedMetadata>({ pageContent, metadata });
}

/**
 * Reads a raw file and returns its clean extracted text plus LangChain-compatible
 * per-page documents. Supports: .txt, .md (UTF-8), .pdf (pdfjs-dist, one document
 * per page), .docx (mammoth). No chunking or embedding happens here --
 * raw file in, clean text out.
 */
export async function loadDocument(filePath: string): Promise<LoadResult> {
  const ext = path.extname(filePath).toLowerCase();
  const source = filePath;

  if (ext === ".txt" || ext === ".md") {
    try {
      const text = await fs.readFile(filePath, "utf8");
      const documents = [makeDoc(text, { source })];
      return { text, documents, source };
    } catch (e) {
      throw new DocumentReadError(`Failed to read text file: ${filePath}`, { cause: e });
    }
  }

  if (ext === ".docx") {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const documents = [makeDoc(result.value, { source })];
      return { text: result.value, documents, source };
    } catch (e) {
      throw new DocumentReadError(`Failed to read docx file: ${filePath}`, { cause: e });
    }
  }

  if (ext === ".pdf") {
    try {
      const buf = await fs.readFile(filePath);
      const data = new Uint8Array(buf);
      const loadingTask = getDocument({ data, useSystemFonts: true });
      const doc = await loadingTask.promise;
      const pages = doc.numPages;
      const documents: LoadedDocument[] = [];
      const pageTexts: string[] = [];
      for (let i = 1; i <= pages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.filter(isTextItem).map((it) => it.str).join("");
        pageTexts.push(pageText);
        documents.push(makeDoc(pageText, { source, page: i }));
      }
      await loadingTask.destroy();
      const text = pageTexts.join("\n");
      return { text, pages, documents, source };
    } catch (e) {
      throw new DocumentReadError(`Failed to read pdf file: ${filePath}`, { cause: e });
    }
  }

  throw new UnsupportedFileTypeError(
    `Unsupported file type '${ext}' for file: ${filePath}`,
  );
}