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

/**
 * Joins a page's pdf.js text items into text, keeping line breaks. pdf.js marks the last
 * item of each line with `hasEOL` (often an empty item); joining with "" dropped those
 * breaks and glued lines into words like "SkillsProgramming", which embed badly and
 * leave the recursive chunker no newlines to split sections on.
 */
export function pageTextFromItems(items: Array<Pick<TextItem, "str" | "hasEOL">>): string {
  return items
    .map((it) => it.str + (it.hasEOL ? "\n" : ""))
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function makeDoc(pageContent: string, metadata: LoadedMetadata): LoadedDocument {
  return new Document<LoadedMetadata>({ pageContent, metadata });
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Converts the HTML mammoth.convertToHtml produces (headings, paragraphs, list items,
 * table cells, <br>) into plain text with markdown `#`/`##`/... headings, so a well-
 * formatted Word document is chunked by section like a .md file instead of losing its
 * structure. Not mammoth's own --output-format=markdown: that mode is deprecated in
 * mammoth's own docs and escapes punctuation ("1\. Item"), which would leak into stored
 * text. Only handles the small set of tags mammoth actually emits -- everything else is
 * stripped, not preserved.
 */
export function htmlToMarkdown(html: string): string {
  return decodeEntities(
    html
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, body: string) => {
        const text = body.replace(/<[^>]+>/g, "").trim();
        return `\n${"#".repeat(Number(level))} ${text}\n`;
      })
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, body: string) => `\n- ${body.replace(/<[^>]+>/g, "").trim()}`)
      .replace(/<\/p>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/t[dh]>/gi, " ")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** File extensions loadDocument can read. The upload route rejects anything else up front. */
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".pdf", ".docx"] as const;

export function isSupportedFile(name: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(path.extname(name).toLowerCase());
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
      const result = await mammoth.convertToHtml({ path: filePath });
      const text = htmlToMarkdown(result.value);
      const documents = [makeDoc(text, { source })];
      return { text, documents, source };
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
        const pageText = pageTextFromItems(content.items.filter(isTextItem));
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