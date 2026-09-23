import { describe, test, expect } from "vitest";
import { loadDocument, isSupportedFile, pageTextFromItems } from "../src/ingest/loader.js";
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

describe("pageTextFromItems (PDF line handling)", () => {
  // Shaped like a real resume page: pdf.js ends each line with an (often empty) hasEOL item.
  const items = [
    { str: "Skills", hasEOL: false },
    { str: "", hasEOL: true },
    { str: "Programming Languages: JavaScript, TypeScript", hasEOL: true },
    { str: "Projects", hasEOL: false },
    { str: " ", hasEOL: true },
    { str: "Built a telemetry wrapper with exponential", hasEOL: true },
    { str: "backoff retries.", hasEOL: false },
  ];

  test("keeps line breaks instead of gluing lines into one word", () => {
    const text = pageTextFromItems(items);
    expect(text).toBe(
      "Skills\nProgramming Languages: JavaScript, TypeScript\nProjects\nBuilt a telemetry wrapper with exponential\nbackoff retries.",
    );
    expect(text).not.toContain("SkillsProgramming");
    expect(text).not.toContain("exponentialbackoff");
  });

  test("items on one line join as-is (pdf.js supplies its own spaces)", () => {
    expect(pageTextFromItems([{ str: "Hello", hasEOL: false }, { str: " ", hasEOL: false }, { str: "world", hasEOL: false }])).toBe("Hello world");
  });
});
