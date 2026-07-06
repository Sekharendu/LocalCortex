import { describe, test, expect } from "vitest";
import { parseNdjsonStream } from "../src/generation/llm.js";
import { GenerationError } from "../src/errors.js";

async function* toBytes(parts: string[]): AsyncGenerator<Uint8Array> {
  for (const p of parts) yield new TextEncoder().encode(p);
}

async function collectResponses(chunks: AsyncGenerator<Uint8Array>): Promise<string[]> {
  const out: string[] = [];
  for await (const obj of parseNdjsonStream(chunks)) {
    if (typeof obj.response === "string") out.push(obj.response);
  }
  return out;
}

describe("parseNdjsonStream", () => {
  test("split: a single JSON object split across two byte chunks is parsed as ONE token", async () => {
    // Chunk 1 ends mid-value: {"response":"Hel
    // Chunk 2 completes:         lo"}\n
    // A naive JSON.parse(chunk) would throw on chunk 1 (incomplete JSON) and throw on
    // chunk 2 too (not valid JSON in isolation: `lo"}\n`). The buffered parser must
    // accumulate, split on \n, and yield a single object.
    const chunks = toBytes(['{"response":"Hel', 'lo"}\n']);
    const got = await collectResponses(chunks);
    expect(got).toEqual(["Hello"]);
  });

  test("concatenated: two complete JSON objects in ONE byte chunk yield TWO tokens", async () => {
    // A single chunk contains two newline-terminated JSON objects.
    // A naive JSON.parse(chunk) throws because the string is `{"response":"A"}\n{"response":"B"}\n`,
    // which is not a single JSON value. The buffered parser must split on \n and yield
    // each line's object.
    const chunks = toBytes(['{"response":"A"}\n{"response":"B"}\n']);
    const got = await collectResponses(chunks);
    expect(got).toEqual(["A", "B"]);
  });

  test("mixed: split-and-then-concatenated across many chunks yields the right token sequence", async () => {
    // A realistic mix: first object split across chunks 1+2, third object arrives as
    // part of chunk 3 alongside the tail of the second, plus a final object without a
    // trailing newline (simulating EOF).
    const parts = [
      '{"response":"o', // line 1 starts, response value not yet closed
      'ne"}\n{"response":"tw', // line 1 ends, line 2 starts
      'o"}\n{"response":"three"}\n{"response":"four"}', // line 2 ends, line 3 ends, line 4 complete-without-trailing-newline
    ];
    const got = await collectResponses(toBytes(parts));
    expect(got).toEqual(["one", "two", "three", "four"]);
  });

  test("empty lines are skipped, not yielded as empty tokens", async () => {
    // Some servers emit blank keepalive lines between objects.
    const got = await collectResponses(toBytes(['{"response":"x"}\n\n{"response":"y"}\n']));
    expect(got).toEqual(["x", "y"]);
  });

  test("a malformed complete line throws GenerationError", async () => {
    // Line 1 is valid, line 2 is malformed but newline-terminated -- per project
    // philosophy, a corrupt complete line surfaces loudly rather than being swallowed.
    const chunks = toBytes(['{"response":"ok"}\n{not valid json}\n']);
    await expect(
      (async () => {
        for await (const _ of parseNdjsonStream(chunks)) {
          // drain
        }
      })(),
    ).rejects.toSatisfy((err: unknown) => {
      return err instanceof GenerationError && /malformed JSON line/.test((err as Error).message);
    });
  });
});