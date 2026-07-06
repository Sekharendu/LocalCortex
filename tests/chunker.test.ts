import { describe, test, expect } from "vitest";
import {
  chunkFixedSize,
  chunkSemantic,
  chunkRecursive,
  chunkText,
} from "../src/ingest/chunker.js";

describe("chunkFixedSize — overlap", () => {
  /**
   * Overlap-claim proof (project requirement):
   * Build a paragraph where a key sentence sits exactly on the chunk boundary at 0%
   * overlap, so the splitter is forced to cut that sentence in half. Then confirm
   * with 15% overlap the *full* sentence appears intact in at least one chunk.
   *
   * Text layout (size = 100):
   *   [0, 88)     88 run-on filler chars (no spaces, so the splitter cannot break early)
   *   [88, 116)   the 28-char key sentence "THE_KEY_SENTENCE_AT_BOUNDARY."
   *                          ^^^^ straddles the 100-char boundary ^^^^
   *   [116, 196)  80 trailing filler chars
   *
   * At 0% overlap: chunk[0] = [0,100) holds the first 12 chars of the sentence,
   *                chunk[1] = [100,196) holds the remaining 16 -- no chunk has it whole.
   * At 15% overlap (15 chars): chunk[1] starts at index 85, fully containing the
   *                [88,116) sentence, so chunk[1] holds it intact.
   */
  test("15% overlap preserves a boundary sentence that 0% splits", async () => {
    const filler = "x".repeat(88);
    const key = "THE_KEY_SENTENCE_AT_BOUNDARY.";
    const tail = "y".repeat(80);
    const text = filler + key + tail;

    const zero = await chunkFixedSize(text, { size: 100, overlapPercent: 0 });
    const fifteen = await chunkFixedSize(text, { size: 100, overlapPercent: 15 });

    expect(zero.length).toBeGreaterThanOrEqual(2);
    expect(zero.some((c) => c.text.includes(key))).toBe(false);
    expect(fifteen.some((c) => c.text.includes(key))).toBe(true);
  });
});

describe("empty input", () => {
  test("all strategies return [] on empty string", async () => {
    expect(await chunkFixedSize("", { size: 500, overlapPercent: 15 })).toEqual([]);
    expect(await chunkSemantic("", { maxSize: 500 })).toEqual([]);
    expect(await chunkRecursive("", { maxSize: 500 })).toEqual([]);
  });
});

describe("single character input", () => {
  test("all strategies yield exactly one chunk with chunkIndex 0 and the input text", async () => {
    for (const fn of [
      (t: string) => chunkFixedSize(t, { size: 500, overlapPercent: 15 }),
      (t: string) => chunkSemantic(t, { maxSize: 500 }),
      (t: string) => chunkRecursive(t, { maxSize: 500 }),
    ]) {
      const chunks = await fn("A");
      expect(chunks).toHaveLength(1);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].text).toBe("A");
    }
  });
});

describe("document with no paragraph breaks (semantic fallback stress test)", () => {
  test("semantic falls back to fixed-size chunking on a 5000-char run-on paragraph", async () => {
    const runon = "word ".repeat(1000); // ~5000 chars, no \n\n, no markdown headings
    const chunks = await chunkSemantic(runon, { maxSize: 500 });

    // The semantic fallback path must split, not yield one giant chunk.
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(500 + 5);
    }
    // chunkIndex must be sequential from 0 across the fallback-flattened output
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i));
  });
});

describe("long single paragraph: every strategy respects maxSize", () => {
  test("fixed / semantic / recursive all slice a 5000-char run-on and stay under maxSize", async () => {
    const runon = "word ".repeat(1000);
    const fixed = await chunkFixedSize(runon, { size: 500, overlapPercent: 15 });
    const semantic = await chunkSemantic(runon, { maxSize: 500 });
    const recursive = await chunkRecursive(runon, { maxSize: 500 });

    for (const [name, chunks] of [
      ["fixed", fixed],
      ["semantic", semantic],
      ["recursive", recursive],
    ] as const) {
      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) {
        expect(c.text.length).toBeLessThanOrEqual(500 + 5);
      }
      expect(chunks.every((c, i) => c.chunkIndex === i)).toBe(true);
    }
  });
});

describe("dispatcher", () => {
  test("chunkText routes to the requested strategy", async () => {
    const text = "a ".repeat(300);
    const viaDispatch = await chunkText(text, "recursive", { maxSize: 200 });
    const direct = await chunkRecursive(text, { maxSize: 200 });
    expect(viaDispatch.map((c) => c.text)).toEqual(direct.map((c) => c.text));
  });

  test("chunkText rejects an unknown strategy", async () => {
    // @ts-expect-error: intentionally passing an invalid strategy
    await expect(chunkText("hi", "bogus")).rejects.toThrow(/Unknown chunk strategy/);
  });
});