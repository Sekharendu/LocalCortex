import { describe, test, expect } from "vitest";
import { chunkRecursive, contextHeader, documentTitle, hasHeadingStructure, headingsAt } from "../src/ingest/chunker.js";

describe("chunkRecursive fixHeadingSplit", () => {
  const body = "Employees must encrypt laptops and phones. ".repeat(20);
  const text = `# Handbook\n\n## Device Encryption Standards\n${body}\n\n## Travel\nBook trips early.`;

  test("default separators leave '#'-only chunks for an oversized section", async () => {
    const chunks = await chunkRecursive(text, { maxSize: 300 });
    expect(chunks.some((c) => /^#+$/.test(c.text.trim()))).toBe(true);
  });

  test("fixed: no marker-only or heading-only chunks, headings stay with their body", async () => {
    const chunks = await chunkRecursive(text, { maxSize: 300, fixHeadingSplit: true });
    expect(chunks.some((c) => /^#+$/.test(c.text.trim()))).toBe(false);
    expect(chunks.some((c) => /^#{1,6} [^\n]+$/.test(c.text.trim()))).toBe(false);
    expect(chunks.some((c) => /## Device Encryption Standards\n+Employees/.test(c.text))).toBe(true);
    expect(chunks.some((c) => /^# [A-Z]/.test(c.text) && !c.text.startsWith("# Handbook"))).toBe(false);
  });
});

describe("hasHeadingStructure", () => {
  test("true for a document with 2+ markdown headings", () => {
    expect(hasHeadingStructure("# Handbook\n\n## Vacation\ntext\n\n## Travel\nmore")).toBe(true);
  });

  test("false for a document with only one heading", () => {
    expect(hasHeadingStructure("# Priya Sharma\nData Engineer based in Pune.")).toBe(false);
  });

  test("false for a document with no headings at all", () => {
    expect(hasHeadingStructure("Just plain paragraphs.\nNo headings here.\nAnother line.")).toBe(false);
  });

  test("ignores a '#' that isn't a heading (no space, or mid-line)", () => {
    expect(hasHeadingStructure("This costs #5 and that one #10, no headings though.")).toBe(false);
  });
});

describe("documentTitle / headingsAt / contextHeader", () => {
  test("title from the first line, else the fallback", () => {
    expect(documentTitle("# Employee Handbook (Sample)\n\n## Vacation", "x")).toBe("Employee Handbook (Sample)");
    expect(documentTitle("## Priya Sharma\nData Engineer", "x")).toBe("Priya Sharma");
    expect(documentTitle("This file starts with a sentence.\nMore.", "notes")).toBe("notes");
  });

  test("heading path at an offset, carried across pages", () => {
    const text = "# Handbook\n## Leave\ntext\n### Sick Leave\nmore\n## Travel\nx";
    expect(headingsAt(text, text.indexOf("more"))).toEqual(["Handbook", "Leave", "Sick Leave"]);
    expect(headingsAt(text, text.indexOf("x", text.indexOf("Travel")))).toEqual(["Handbook", "Travel"]);
    expect(headingsAt("Databases: Postgres", 5, ["", "SKILLS"])).toEqual(["", "SKILLS"]);
    expect(contextHeader("Handbook", ["Handbook", "Leave", "Sick Leave"])).toBe("Handbook › Leave › Sick Leave");
    expect(contextHeader("Priya Sharma", ["", "Priya Sharma"])).toBe("Priya Sharma");
  });
});
