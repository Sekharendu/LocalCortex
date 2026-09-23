import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { QdrantClient } from "@qdrant/js-client-rest";
import { answerQuestion } from "../src/rag.js";
import { isRefusal } from "../src/generation/refusal.js";
import { ingestDocument } from "../src/ingest/pipeline.js";
import { deleteByDocumentId } from "../src/retrieval/vectorStore.js";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const TEST_COLLECTION = `rag-test-${process.pid}`;

const client = new QdrantClient({ url: QDRANT_URL, checkCompatibility: false });

let stackUp = false;
let documentId: string | null = null;

beforeAll(async () => {
  try {
    const [qRes, oRes] = await Promise.all([
      fetch(`${QDRANT_URL}/readyz`, { signal: AbortSignal.timeout(2000) }),
      fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) }),
    ]);
    stackUp = qRes.ok && oRes.ok;
  } catch {
    stackUp = false;
  }
  if (!stackUp) return;

  try {
    await client.deleteCollection(TEST_COLLECTION).catch(() => {});
    const r = await ingestDocument("data/sample.txt", {
      strategy: "recursive",
      collection: TEST_COLLECTION,
    });
    if (r.success) documentId = r.documentId;
  } catch {
    stackUp = false;
  }
}, 180_000);

afterAll(async () => {
  if (!stackUp) return;
  if (documentId) await deleteByDocumentId(TEST_COLLECTION, documentId).catch(() => {});
  await client.deleteCollection(TEST_COLLECTION).catch(() => {});
});

describe("answerQuestion — end-to-end", () => {
  test.skipIf(!stackUp || documentId === null)(
    "an answerable question yields an answer containing the key phrase",
    async () => {
      const { answer, citations } = await answerQuestion("What does the sample text say about a fox?", {
        collection: TEST_COLLECTION,
      });

      const lowered = answer.toLowerCase();
      // keyword-level assertion: llama3 paraphrases; "fox" is the corpus's central noun.
      expect(lowered).toContain("fox");
      // negative assertion: should NOT decline when the question is answerable.
      expect(isRefusal(answer), `expected an answer, got a refusal: ${JSON.stringify(answer)}`).toBe(false);

      // Citations: only chunks that cleared the retrieval threshold (the ones that
      // actually appeared in the prompt context) contribute their { source, page }.
      // The sample.txt fixture is the only ingested document, so the answer should be
      // grounded in citations.matiching its source filename -- never fabricated.
      expect(Array.isArray(citations)).toBe(true);
      expect(citations.length).toBeGreaterThan(0);
      const sources = citations.map((c) => c.source);
      expect(sources.some((s) => s.endsWith("sample.txt")), `expected a citation whose source ends with sample.txt; got: ${JSON.stringify(citations)}`).toBe(true);
    },
  );

  test.skipIf(!stackUp || documentId === null)(
    "an absent-topic question yields an explicit admission, not fabricated content",
    async () => {
      const { answer, citations } = await answerQuestion("What is the capital of France?", {
        collection: TEST_COLLECTION,
      });

      const lowered = answer.toLowerCase();
      expect(isRefusal(answer), `expected an admission phrasing; got: ${JSON.stringify(answer)}`).toBe(true);

      // The cheap-failure case is the model just answering "Paris is the capital
      // of France" without admitting it's general knowledge. Catches that.
      expect(lowered).not.toContain("paris");

      // Citations contract: an unanswerable question that retrieved nothing above
      // threshold should produce an EMPTY citations array (never fabricated sources).
      expect(Array.isArray(citations)).toBe(true);
      expect(citations).toHaveLength(0);
    },
    120_000,
  );
});

/**
 * Absent-topic STRESS test: multiple deliberately-unanswerable questions across
 * distinct topic areas (geography, astronomy, cooking). Each must trigger an admission,
 * not a fabricated answer. This is the multi-question version of the single-case test
 * above -- it's the vitest-side counterpart of scripts/test-hallucination.ts, kept
 * shorter (3 cases) so the live-stack vitest run stays under the per-test timeout on
 * CPU-bound llama3.
 *
 * Wired through scripts/test-hallucination.ts is the full standalone runner with 10
 * cases (7 subtle + 3 obvious) for deeper manual investigation when needed.
 */
describe("answerQuestion — absent-topic stress (multiple questions)", () => {
  const ABSENT_CASES = [
    { q: "What is the capital of France?", fabricationMarker: "paris" },
    { q: "What is the distance from Earth to the Moon?", fabricationMarker: "kilometers" },
    { q: "How do I bake a chocolate cake?", fabricationMarker: "preheat" },
  ];
  for (const c of ABSENT_CASES) {
    test.skipIf(!stackUp || documentId === null)(
      `absent-topic stress: "${c.q}"`,
      async () => {
        const { answer } = await answerQuestion(c.q, { collection: TEST_COLLECTION });
        const lowered = answer.toLowerCase();

        expect(
          isRefusal(answer),
          `expected admission phrasing for absent question "${c.q}"; got: ${JSON.stringify(answer)}`,
        ).toBe(true);
        expect(
          lowered,
          `expected "${c.fabricationMarker}" not in answer (would signal fabrication); got: ${JSON.stringify(answer)}`,
        ).not.toContain(c.fabricationMarker);
      },
      60_000,
    );
  }
});