import { describe, test, expect } from "vitest";
import { loadDocument, isSupportedFile } from "../src/ingest/loader.js";
import { UnsupportedFileTypeError } from "../src/errors.js";

describe("loadDocument", () => {
  test("reads a .txt file and returns one document", async () => {
    const result = await loadDocument("data/sample.txt");
    expect(result.source).toBe("data/sample.txt");
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.pages).toBeUndefined();
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].metadata.source).toBe("data/sample.txt");
    expect(result.documents[0].metadata.page).toBeUndefined();
  });

  test("reads a .pdf and returns one document per page", async () => {
    const result = await loadDocument("data/sample.pdf");
    expect(result.source).toBe("data/sample.pdf");
    expect(result.pages).toBeGreaterThanOrEqual(2);
    expect(result.documents).toHaveLength(result.pages ?? 0);
    expect(result.documents[0].metadata.page).toBe(1);
    expect(result.documents[1].metadata.page).toBe(2);
    expect(result.documents[0].pageContent).toContain("Page one");
    expect(result.documents[1].pageContent).toContain("Page two");
  });

  test("throws UnsupportedFileTypeError for unknown extensions", async () => {
    await expect(loadDocument("data/sample.xyz")).rejects.toBeInstanceOf(UnsupportedFileTypeError);
  });
});
describe("isSupportedFile (upload filter)", () => {
  test.each(["notes.txt", "README.md", "Handbook.PDF", "policy.docx"])("accepts %s", (name) => {
    expect(isSupportedFile(name)).toBe(true);
  });
  test.each(["photo.png", "sheet.xlsx", "archive.zip", "noextension", "file.txt.exe"])("rejects %s", (name) => {
    expect(isSupportedFile(name)).toBe(false);
  });
});
