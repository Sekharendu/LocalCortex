import { test } from "node:test";
import assert from "node:assert/strict";
import { loadDocument } from "../src/ingest/loader.js";
import { UnsupportedFileTypeError } from "../src/errors.js";

test("loadDocument reads a .txt file and returns one document", async () => {
  const result = await loadDocument("data/sample.txt");
  assert.equal(result.source, "data/sample.txt");
  assert.ok(result.text.length > 0, "expected non-empty text");
  assert.equal(result.pages, undefined);
  assert.equal(result.documents.length, 1);
  assert.equal(result.documents[0].metadata.source, "data/sample.txt");
  assert.equal(result.documents[0].metadata.page, undefined);
  console.log("TXT  -> textLength:", result.text.length, "docs:", result.documents.length, "sourceType: txt");
});

test("loadDocument reads a .pdf and returns one document per page", async () => {
  const result = await loadDocument("data/sample.pdf");
  assert.equal(result.source, "data/sample.pdf");
  assert.ok(result.pages && result.pages >= 2, "expected at least 2 pages");
  assert.equal(result.documents.length, result.pages);
  assert.equal(result.documents[0].metadata.page, 1);
  assert.equal(result.documents[1].metadata.page, 2);
  assert.ok(result.documents[0].pageContent.includes("Page one"), "page 1 text mismatch");
  assert.ok(result.documents[1].pageContent.includes("Page two"), "page 2 text mismatch");
  console.log("PDF  -> textLength:", result.text.length, "pages:", result.pages, "docs:", result.documents.length, "sourceType: pdf");
});

test("loadDocument throws UnsupportedFileTypeError for unknown extensions", async () => {
  await assert.rejects(
    () => loadDocument("data/sample.xyz"),
    (err: unknown) => err instanceof UnsupportedFileTypeError,
  );
});