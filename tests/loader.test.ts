import { describe, test, expect } from "vitest";
import { loadDocument, isSupportedFile, pageTextFromItems, htmlToMarkdown } from "../src/ingest/loader.js";
import { hasHeadingStructure } from "../src/ingest/chunker.js";
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

  test("reads a .docx with Word Heading styles as markdown headings", async () => {
    const result = await loadDocument("data/eval-corpus.docx");
    expect(result.source).toBe("data/eval-corpus.docx");
    expect(result.documents).toHaveLength(1);
    expect(result.text).toContain("# Employee Handbook (Sample)");
    expect(result.text).toContain("## Vacation Policy");
    expect(hasHeadingStructure(result.text)).toBe(true);
  });

  test("reads a .docx with no heading styles as plain paragraphs, no '#'", async () => {
    const result = await loadDocument("data/sample-plain.docx");
    expect(result.text).not.toContain("#");
    expect(result.text).toContain("Priya Sharma");
    expect(hasHeadingStructure(result.text)).toBe(false);
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

describe("htmlToMarkdown (mammoth HTML -> plain text with # headings)", () => {
  test("converts h1-h3 tags into matching '#' levels", () => {
    const html = "<h1>Employee Handbook (Sample)</h1><h2>Vacation Policy</h2><p>15 days per year.</p><h3>Accrual</h3><p>More.</p>";
    const text = htmlToMarkdown(html);
    expect(text).toContain("# Employee Handbook (Sample)");
    expect(text).toContain("## Vacation Policy");
    expect(text).toContain("### Accrual");
    expect(text).toContain("15 days per year.");
  });

  test("converts list items to '- ' lines and drops the <ul>/<ol> wrapper", () => {
    const html = "<ul><li>Python</li><li>SQL</li></ul>";
    const text = htmlToMarkdown(html);
    expect(text).toBe("- Python\n- SQL");
  });

  test("decodes HTML entities", () => {
    expect(htmlToMarkdown("<p>Tom &amp; Jerry &lt;3 &quot;cheese&quot;</p>")).toBe('Tom & Jerry <3 "cheese"');
  });

  test("strips tags it doesn't specially handle (bold, italic, span)", () => {
    expect(htmlToMarkdown("<p>This is <strong>bold</strong> and <em>italic</em>.</p>")).toBe("This is bold and italic.");
  });

  test("collapses runs of blank lines and trims", () => {
    const text = htmlToMarkdown("<h1>Title</h1>\n\n\n<p>Body.</p>");
    expect(text).not.toMatch(/\n{3,}/);
    expect(text.startsWith("#")).toBe(true);
    expect(text.endsWith(".")).toBe(true);
  });
});
