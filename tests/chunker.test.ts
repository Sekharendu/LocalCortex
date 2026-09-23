import { describe, test, expect } from "vitest";
import {
  chunkFixedSize,
  chunkSemantic,
  chunkRecursive,
  chunkText,
} from "../src/ingest/chunker.js";
import { ollamaUp } from "./helpers/stack.js";

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
    expect(await chunkSemantic("")).toEqual([]);
    expect(await chunkRecursive("", { maxSize: 500 })).toEqual([]);
  });
});

describe("single character input", () => {
  test("all strategies yield exactly one chunk with chunkIndex 0 and the input text", async () => {
    const fixed = await chunkFixedSize("A", { size: 500, overlapPercent: 15 });
    const semantic = await chunkSemantic("A");
    const recursive = await chunkRecursive("A", { maxSize: 500 });

    for (const [name, chunks] of [["fixed", fixed], ["semantic", semantic], ["recursive", recursive]] as const) {
      expect(chunks, `${name}: expected 1 chunk`).toHaveLength(1);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].text).toBe("A");
    }
  });
});

// ==============================
//  New embedding-based semantic tests
// ==============================

describe("chunkSemantic — embedding-based topic-boundary detection", () => {
  test("single sentence returns exactly one chunk", async () => {
    const chunks = await chunkSemantic("This is a single sentence about cooking.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("This is a single sentence about cooking.");
    expect(chunks[0].chunkIndex).toBe(0);
  });

  test("empty input returns empty array", async () => {
    const chunks = await chunkSemantic("");
    expect(chunks).toEqual([]);
  });

  test.skipIf(!ollamaUp)(
    "topic-boundary detection: unrelated topics produce separate chunks",
    async () => {
      const cooking =
        "First, sauté the onions until they are translucent. Next, deglaze the pan with white wine. Finally, let the sauce simmer for twenty minutes.";
      const architecture =
        "Microservices communicate through well-defined API gateways. Each service owns its data store and domain logic. Database sharding distributes reads across replicas.";
      const text = cooking + " " + architecture;

      const chunks = await chunkSemantic(text);

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      // Find which chunk each topic landed in.
      const cookingChunk = chunks.find((c) => c.text.includes("deglaze"));
      const architectureChunk = chunks.find((c) => c.text.includes("API gateway"));
      expect(cookingChunk).toBeDefined();
      expect(architectureChunk).toBeDefined();
      // They must not be the same chunk.
      expect(cookingChunk!.chunkIndex).not.toBe(architectureChunk!.chunkIndex);
    },
    30_000,
  );

  test.skipIf(!ollamaUp)("high threshold (1.0): nearly every sentence becomes its own chunk", async () => {
    // Same-topic paragraph: 4 sentences about a dog in a park.
    const text =
      "The dog chased the red ball across the grass. It barked happily at the children playing nearby. A squirrel darted up the oak tree. The dog wagged its tail and ran to the next game.";
    const chunks = await chunkSemantic(text, { similarityThreshold: 1.0 });

    // Cosine sim between distinct sentences is always <1.0 for nomic-embed-text,
    // so nearly every pair splits. At most one pair might land at 0.999...
    // Use >=3 as a robust lower bound of 4 sentences each their own (or 3 chunk).
    expect(chunks.length).toBeGreaterThanOrEqual(3);
  }, 30_000);

  test.skipIf(!ollamaUp)("low threshold (0.0): topically-coherent paragraph returns as one chunk", async () => {
    // A DIFFERENT text from the topic-boundary test: 4 same-topic sentences
    // about a dog walking in a park. Pairwise cosine sim stays positive so
    // splitting condition (sim < 0.0) never triggers.
    const text =
      "The dog walked along the gravel path in the park. It sniffed at the base of every tree it passed. A light breeze rustled the leaves overhead. The dog seemed perfectly content with the afternoon.";
    const chunks = await chunkSemantic(text, { similarityThreshold: 0.0 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(text);
  }, 30_000);
});

// ==============================
//  Long-run-on-paragraph tests (fixed + recursive only — semantic no longer has maxSize)
// ==============================

describe("long single paragraph: fixed + recursive respect maxSize", () => {
  test("fixed and recursive both slice a 5000-char run-on and stay under maxSize", async () => {
    const runon = "word ".repeat(1000);
    const fixed = await chunkFixedSize(runon, { size: 500, overlapPercent: 15 });
    const recursive = await chunkRecursive(runon, { maxSize: 500 });

    for (const [name, chunks] of [
      ["fixed", fixed],
      ["recursive", recursive],
    ] as const) {
      expect(chunks.length, `${name}: expected >1 chunk`).toBeGreaterThan(1);
      for (const c of chunks) {
        expect(c.text.length, `${name}: chunk exceeds maxSize+5 slack`).toBeLessThanOrEqual(500 + 5);
      }
      expect(chunks.every((c, i) => c.chunkIndex === i), `${name}: chunkIndex must be sequential`).toBe(true);
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