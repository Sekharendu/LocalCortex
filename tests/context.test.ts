import { describe, test, expect } from "vitest";
import { mergeChunkTexts, selectPassages, type DocumentHits } from "../src/retrieval/context.js";
import { contextBudget } from "../src/rag.js";
import { countTokens } from "../src/generation/tokens.js";
import type { ChunkPayload } from "../src/types.js";
import { ollamaUp } from "./helpers/stack.js";
import type { RetrievedChunk } from "../src/retrieval/retriever.js";

// Chunks the way the recursive chunker makes them: each repeats the tail of the previous.
function makeDoc(documentId: string, sections: string[], overlap = 30): ChunkPayload[] {
  return sections.map((s, i) => ({
    text: i === 0 ? s : `${sections[i - 1].slice(-overlap)}${s}`,
    source: `${documentId}.txt`,
    chunkIndex: i,
    documentId,
  }));
}

function hit(doc: ChunkPayload[], i: number, score: number): RetrievedChunk {
  const c = doc[i];
  return { text: c.text, source: c.source, score, documentId: c.documentId, chunkIndex: c.chunkIndex };
}

const section = (n: number) => `Section ${n}. Employees follow rule number ${n}. `.repeat(6);
const small = makeDoc("small", [0, 1, 2].map(section));
const large = makeDoc("large", Array.from({ length: 10 }, (_, i) => section(i)));
const indexes = (ps: RetrievedChunk[]) => ps.map((p) => p.chunkIndex);

describe("mergeChunkTexts", () => {
  test("drops the overlap the chunker repeats", () => {
    expect(mergeChunkTexts(small.map((c) => c.text))).toBe([0, 1, 2].map(section).join(""));
  });

  test("joins with a newline when the chunks don't overlap", () => {
    expect(mergeChunkTexts(["The end of one part.", "An unrelated start."])).toBe(
      "The end of one part.\nAn unrelated start.",
    );
  });
});

describe("selectPassages", () => {
  const roomy = { budgetTokens: 3000, wholeMaxTokens: 1500 };

  test("a small document goes in whole, as one passage in reading order", () => {
    const docs: DocumentHits[] = [{ chunks: small, hits: [hit(small, 2, 0.7)] }];
    const out = selectPassages(docs, roomy);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe(mergeChunkTexts(small.map((c) => c.text)));
    expect(out[0].score).toBe(0.7);
  });

  test("a large document gives its hits plus one neighbour each side, merged when touching", () => {
    const docs: DocumentHits[] = [{ chunks: large, hits: [hit(large, 7, 0.8), hit(large, 2, 0.7), hit(large, 3, 0.65)] }];
    const out = selectPassages(docs, { budgetTokens: 3000, wholeMaxTokens: 100 });
    // 1..4 (hits 2,3 + neighbours) and 6..8 (hit 7 + neighbours) are two runs, in
    // reading order although 7 scored best.
    expect(indexes(out)).toEqual([1, 6]);
    expect(out[0].text).toBe(mergeChunkTexts([1, 2, 3, 4].map((i) => large[i].text)));
    expect(out[1].text).toBe(mergeChunkTexts([6, 7, 8].map((i) => large[i].text)));
    expect(out[1].score).toBe(0.8);
  });

  test("documents go in rank order; one that no longer fits is left out", () => {
    const docs: DocumentHits[] = [
      { chunks: large, hits: [hit(large, 5, 0.8)] },
      { chunks: small, hits: [hit(small, 0, 0.66)] },
    ];
    const first = selectPassages([docs[0]], { budgetTokens: 3000, wholeMaxTokens: 100 });
    const firstCost = first.reduce((s, p) => s + countTokens(p.text) + 4, 0);
    const out = selectPassages(docs, { budgetTokens: firstCost + 10, wholeMaxTokens: 100 });
    expect(out.map((p) => p.documentId)).toEqual(["large"]);
  });

  test("a small document that doesn't fit whole falls back to hits plus neighbours", () => {
    const docs: DocumentHits[] = [{ chunks: large, hits: [hit(large, 0, 0.8)] }];
    const wholeCost = countTokens(mergeChunkTexts(large.map((c) => c.text)));
    const out = selectPassages(docs, { budgetTokens: wholeCost - 50, wholeMaxTokens: 5000 });
    expect(indexes(out)).toEqual([0]);
    expect(out[0].text).toBe(mergeChunkTexts([large[0].text, large[1].text]));
  });

  test("the best document keeps at least its best chunk even over budget", () => {
    const docs: DocumentHits[] = [{ chunks: large, hits: [hit(large, 3, 0.7), hit(large, 8, 0.9)] }];
    const out = selectPassages(docs, { budgetTokens: 1, wholeMaxTokens: 100 });
    expect(indexes(out)).toEqual([8]);
  });

  test("titleChunk adds a chunked document's first chunk, first in reading order", () => {
    const docs: DocumentHits[] = [{ chunks: large, hits: [hit(large, 7, 0.8)] }];
    const out = selectPassages(docs, { budgetTokens: 3000, wholeMaxTokens: 100, titleChunk: true });
    expect(indexes(out)).toEqual([0, 6]);
    expect(out[0].text).toBe(large[0].text);
    // Without the option, only the hit and its neighbours.
    expect(indexes(selectPassages(docs, { budgetTokens: 3000, wholeMaxTokens: 100 }))).toEqual([6]);
  });

  test("titleChunk leaves a whole document alone", () => {
    const docs: DocumentHits[] = [{ chunks: small, hits: [hit(small, 2, 0.7)] }];
    const out = selectPassages(docs, { ...roomy, titleChunk: true });
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe(mergeChunkTexts(small.map((c) => c.text)));
  });

  test("chunkedMaxTokens keeps hits and the title before neighbours", () => {
    const docs: DocumentHits[] = [{ chunks: large, hits: [hit(large, 7, 0.8), hit(large, 4, 0.7)] }];
    const chunkCost = countTokens(large[4].text) + 4;
    // Room for about three chunks: hits 7 and 4, then the title; no neighbours.
    const out = selectPassages(docs, {
      budgetTokens: 3000,
      wholeMaxTokens: 100,
      titleChunk: true,
      chunkedMaxTokens: chunkCost * 3 + 10,
    });
    expect(indexes(out)).toEqual([0, 4, 7]);
  });
});

describe("countTokens", () => {
  // The budget is only right if our count matches what llama3 actually reads.
  test.skipIf(!ollamaUp)("agrees with Ollama's prompt_eval_count", async () => {
    // A fresh prompt each run, so Ollama can't reuse a cached prefix and under-report.
    const text = `Run ${Date.now()}: Full-time employees accrue 15 days of paid vacation per year; after five years of service this rises to 20 days. Unused days (up to 5) carry over.`;
    const res = await fetch(`${process.env.OLLAMA_URL ?? "http://localhost:11434"}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OLLAMA_GEN_MODEL ?? "llama3", prompt: text, raw: true, stream: false, options: { num_predict: 1 } }),
    });
    const { prompt_eval_count } = (await res.json()) as { prompt_eval_count: number };
    // raw mode adds only the BOS token.
    expect(Math.abs(prompt_eval_count - (countTokens(text) + 1))).toBeLessThanOrEqual(2);
  }, 120_000);
});

describe("contextBudget", () => {
  test("history shrinks the budget by its own size", () => {
    const history = [
      { role: "user" as const, content: "How many vacation days do I get per year?" },
      { role: "assistant" as const, content: "Full-time employees get 15 days of paid vacation per year. ".repeat(10) },
    ];
    const without = contextBudget("And after five years?", []);
    const withHistory = contextBudget("And after five years?", history);
    expect(without).toBeGreaterThan(3000);
    expect(without - withHistory).toBeGreaterThan(150);
  });
});
