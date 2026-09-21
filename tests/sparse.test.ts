import { describe, test, expect } from "vitest";
import { tokenize, hashTerm, sparseVectorFor } from "../src/retrieval/sparse.js";

describe("tokenize", () => {
  test("lowercases, strips punctuation, and drops stopwords", () => {
    const tokens = tokenize("The Quick-Brown Fox, jumps over THE lazy dog!");
    expect(tokens).not.toContain("the");
    expect(tokens).toContain("quick");
    expect(tokens).toContain("brown");
    expect(tokens).toContain("fox");
    expect(tokens).toContain("jumps");
    expect(tokens).toContain("lazy");
    expect(tokens).toContain("dog");
  });

  test("drops single-character tokens", () => {
    const tokens = tokenize("a b I go");
    expect(tokens).not.toContain("a");
    expect(tokens).not.toContain("b");
  });

  test("empty / whitespace-only text returns no tokens", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("hashTerm", () => {
  test("is deterministic for the same term", () => {
    expect(hashTerm("vacation")).toBe(hashTerm("vacation"));
  });

  test("different terms (usually) hash to different indices", () => {
    expect(hashTerm("vacation")).not.toBe(hashTerm("retirement"));
  });

  test("always returns a non-negative integer", () => {
    for (const term of ["a", "zzz", "401k", "hsa", "x".repeat(50)]) {
      const h = hashTerm(term);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("sparseVectorFor", () => {
  test("empty text produces an empty sparse vector", () => {
    const v = sparseVectorFor("", 50);
    expect(v.indices).toHaveLength(0);
    expect(v.values).toHaveLength(0);
  });

  test("stopword-only text produces an empty sparse vector", () => {
    const v = sparseVectorFor("the a an of to", 50);
    expect(v.indices).toHaveLength(0);
  });

  test("indices and values arrays are the same length, one entry per distinct term", () => {
    const v = sparseVectorFor("vacation days accrue vacation policy", 50);
    expect(v.indices.length).toBe(v.values.length);
    // 4 distinct content terms: vacation, days, accrue, policy
    expect(v.indices.length).toBe(4);
  });

  test("repeated terms get a higher (but sub-linear, saturating) weight than a single occurrence", () => {
    const once = sparseVectorFor("vacation policy", 50);
    const thrice = sparseVectorFor("vacation vacation vacation policy", 50);
    const onceIdx = once.indices.indexOf(hashTerm("vacation"));
    const thriceIdx = thrice.indices.indexOf(hashTerm("vacation"));
    expect(onceIdx).toBeGreaterThanOrEqual(0);
    expect(thriceIdx).toBeGreaterThanOrEqual(0);
    const onceValue = once.values[onceIdx];
    const thriceValue = thrice.values[thriceIdx];
    expect(thriceValue).toBeGreaterThan(onceValue);
    // BM25 saturation: tf=3 should score less than 3x a single occurrence would.
    expect(thriceValue).toBeLessThan(onceValue * 3);
  });

  test("longer documents get length-normalized down relative to the corpus average", () => {
    const avgDocLength = 10;
    const short = sparseVectorFor("vacation policy details here", avgDocLength); // 4 tokens
    const long = sparseVectorFor(
      "vacation policy details here plus a lot of extra padding words to inflate document length well past the corpus average length substantially",
      avgDocLength,
    );
    const shortIdx = short.indices.indexOf(hashTerm("vacation"));
    const longIdx = long.indices.indexOf(hashTerm("vacation"));
    expect(short.values[shortIdx]).toBeGreaterThan(long.values[longIdx]);
  });

  test("same text encoded twice with the same avgDocLength is identical (deterministic)", () => {
    const a = sparseVectorFor("remote work manager approval", 50);
    const b = sparseVectorFor("remote work manager approval", 50);
    expect(a).toEqual(b);
  });
});
