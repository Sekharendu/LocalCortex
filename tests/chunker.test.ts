import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chunkFixedSize,
  chunkSemantic,
  chunkRecursive,
  chunkText,
} from "../src/ingest/chunker.js";

/**
 * Overlap-claim proof (project requirement):
 * Build a paragraph where a key sentence sits exactly on the chunk boundary at 0%
 * overlap, so the splitter is forced to cut that sentence in half. Then confirm that
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
test("overlap claim: fixed-size with 15% overlap preserves a boundary sentence that 0% splits", async () => {
  const filler = "x".repeat(88);
  const key = "THE_KEY_SENTENCE_AT_BOUNDARY.";
  const tail = "y".repeat(80);
  const text = filler + key + tail;

  const zero = await chunkFixedSize(text, { size: 100, overlapPercent: 0 });
  const fifteen = await chunkFixedSize(text, { size: 100, overlapPercent: 15 });

  assert.ok(zero.length >= 2, "0% overlap should produce at least 2 chunks");
  assert.ok(
    !zero.some((c) => c.text.includes(key)),
    "at 0% overlap, the boundary sentence is cut and no chunk holds it whole",
  );
  assert.ok(
    fifteen.some((c) => c.text.includes(key)),
    "at 15% overlap, the full boundary sentence survives in at least one chunk",
  );
});

test("short document (shorter than one chunk) yields a single chunk with chunkIndex 0", async () => {
  for (const fn of [
    (t: string) => chunkFixedSize(t, { size: 500, overlapPercent: 15 }),
    (t: string) => chunkSemantic(t, { maxSize: 500 }),
    (t: string) => chunkRecursive(t, { maxSize: 500 }),
  ]) {
    const chunks = await fn("hello world");
    assert.equal(chunks.length, 1, "expected a single chunk");
    assert.equal(chunks[0].chunkIndex, 0);
    assert.equal(chunks[0].text, "hello world");
  }
});

test("long single paragraph with no natural break points: every strategy splits and respects maxSize", async () => {
  const runon = "word ".repeat(1000); // ~5000 chars, no \\n or headings
  const fixed = await chunkFixedSize(runon, { size: 500, overlapPercent: 15 });
  const semantic = await chunkSemantic(runon, { maxSize: 500 });
  const recursive = await chunkRecursive(runon, { maxSize: 500 });

  for (const [name, chunks] of [
    ["fixed", fixed],
    ["semantic", semantic],
    ["recursive", recursive],
  ] as const) {
    assert.ok(chunks.length > 1, `${name}: expected more than one chunk for a 5000-char run-on`);
    for (const c of chunks) {
      assert.ok(
        c.text.length <= 500 + 5,
        `${name}: chunk of length ${c.text.length} exceeds maxSize (slack 5)`,
      );
    }
    assert.ok(
      chunks.every((c, i) => c.chunkIndex === i),
      `${name}: chunkIndex must be sequential from 0`,
    );
  }
});

test("semantic respects markdown heading boundaries", async () => {
  const md =
    "# Title\n\nIntro.\n\n## Section A\n\n" +
    "a ".repeat(500) +
    "\n\n## Section B\n\nshort content.";
  const chunks = await chunkSemantic(md, { maxSize: 100 });
  // heading sections should appear as chunk prefixes; at minimum, "## Section B" must
  // start some chunk rather than being cut mid-heading.
  assert.ok(
    chunks.some((c) => c.text.startsWith("## Section B")),
    "## Section B should begin its own chunk",
  );
  assert.ok(
    chunks.some((c) => c.text.startsWith("# Title") || c.text.startsWith("Intro")),
    "title section is preserved as a distinct chunk",
  );
});

test("dispatcher routes to the requested strategy", async () => {
  const text = "a ".repeat(300);
  const viaDispatch = await chunkText(text, "recursive", { maxSize: 200 });
  const direct = await chunkRecursive(text, { maxSize: 200 });
  assert.deepEqual(
    viaDispatch.map((c) => c.text),
    direct.map((c) => c.text),
  );
});

test("dispatcher rejects an unknown strategy", async () => {
  await assert.rejects(
    // @ts-expect-error: intentionally passing an invalid strategy
    () => chunkText("hi", "bogus"),
    /Unknown chunk strategy/,
  );
});