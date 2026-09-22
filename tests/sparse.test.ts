import { describe, test, expect } from "vitest";
import { tokenize, hashTerm, sparseVectorFor } from "../src/retrieval/sparse.js";

describe("tokenize", () => {
  test("lowercases, strips punctuation, and drops stopwords", () => {
    const tokens = tokenize("The Quick-Brown Fox, jumps over THE lazy dog!");
    expect(tokens).not.toContain("the");
    expect(tokens).toContain("quick");
    expect(tokens).toContain("brown");
    expect(tokens).toContain("fox");
    expect(tokens).toContain("jump"); // "jumps" -> "jump" via plural/suffix normalization
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

  test("strips parens so \"401(k)\" and \"401k\" tokenize identically", () => {
    expect(tokenize("the 401(k) retirement plan")).toEqual(tokenize("the 401k retirement plan"));
  });

  test("filters ordinary function words that a thin stopword list would miss", () => {
    // "any" specifically caused a real ranking regression when it wasn't filtered on a
    // small corpus (see the hybrid-search hardening plan) -- it must not survive as if
    // it were a content term. ("part" is a legitimate content noun in general English
    // and is deliberately NOT stopworded here -- its role in that regression was
    // small-corpus IDF noise, a separate documented limitation, not a stopword gap.)
    const tokens = tokenize("Without any advance warning, how are approvals handled after the fact?");
    expect(tokens).not.toContain("any");
    expect(tokens).not.toContain("after");
    expect(tokens).not.toContain("how");
  });

  test("plural forms normalize to the same token as their singular", () => {
    const singular = tokenize("I need my last paycheck");
    const plural = tokenize("Final paychecks are issued within three business days");
    const singularToken = singular.find((t) => t.includes("paycheck"));
    const pluralToken = plural.find((t) => t.includes("paycheck"));
    expect(singularToken).toBeDefined();
    expect(pluralToken).toBeDefined();
    expect(singularToken).toBe(pluralToken);
  });

  describe("negation tagging", () => {
    test("\"not eligible\" tags the negated word differently from plain \"eligible\"", () => {
      const negated = tokenize("Contractors are not eligible for the match");
      const plain = tokenize("Employees are eligible for the match");
      expect(negated).toContain("not_eligible");
      expect(negated).not.toContain("eligible");
      expect(plain).toContain("eligible");
      expect(plain).not.toContain("not_eligible");
    });

    test("negation cue words (not, no, never, without, cannot, neither, nor) are not emitted as their own token", () => {
      const tokens = tokenize("You cannot access this without approval, and there is no exception, never.");
      expect(tokens).not.toContain("not");
      expect(tokens).not.toContain("no");
      expect(tokens).not.toContain("never");
      expect(tokens).not.toContain("without");
      expect(tokens).not.toContain("cannot");
    });

    test("scope is exactly 1 word -- downstream topic nouns stay untagged and matchable", () => {
      const tokens = tokenize("Contractors are not eligible for the 401k match");
      expect(tokens).toContain("not_eligible");
      // "401k" and "match" must NOT be tagged, or a plain query about "401k match"
      // would stop matching this chunk via sparse retrieval entirely.
      expect(tokens).toContain("401k");
      expect(tokens).toContain("match");
      expect(tokens).not.toContain("not_401k");
      expect(tokens).not.toContain("not_match");
    });

    test("negation does not leak across a clause boundary", () => {
      const tokens = tokenize("Contractors are not eligible. Employees are eligible.");
      expect(tokens).toContain("not_eligible");
      // The second clause's "eligible" is unrelated to the first clause's negation.
      expect(tokens).toContain("eligible");
    });

    test("negative contractions are expanded and tagged the same as their long form", () => {
      const contracted = tokenize("Contractors aren't eligible for the match");
      const expanded = tokenize("Contractors are not eligible for the match");
      expect(contracted).toEqual(expanded);
    });
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
