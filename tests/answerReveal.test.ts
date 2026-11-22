import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnswerReveal } from "../web/src/lib/answerReveal.js";
import { splitErrorFooter, streamingAnswerText } from "../web/src/lib/format.js";

beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] }));
afterEach(() => vi.useRealTimers());

describe("paced answer display", () => {
  it("shows an initial prefix immediately and reveals a fast burst over multiple ticks", async () => {
    const frames: string[] = [];
    const reveal = createAnswerReveal((text) => frames.push(text));
    const answer = "A complete answer arrived in a single read.";
    reveal.update(answer);
    expect(frames).toEqual(["A "]);
    const drained = reveal.drain();

    await vi.advanceTimersByTimeAsync(160);
    expect(frames.length).toBeGreaterThan(2);
    expect(frames.at(-1)?.length).toBeLessThan(answer.length);

    await vi.advanceTimersByTimeAsync(1000);
    await drained;
    expect(frames.at(-1)).toBe(answer);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("catches up a long burst within the post-stream reveal window", async () => {
    const answer = "Detailed Markdown answer.\n\n".repeat(150);
    const publish = vi.fn<(text: string) => void>();
    const reveal = createAnswerReveal(publish);
    reveal.update(answer);
    const drained = reveal.drain();

    await vi.advanceTimersByTimeAsync(2520);
    await drained;
    expect(publish).toHaveBeenLastCalledWith(answer);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("handles gaps between chunks and keeps the final Markdown and emoji intact", async () => {
    const frames: string[] = [];
    const reveal = createAnswerReveal((text) => frames.push(text));
    reveal.update("A😀");
    expect(frames).toEqual(["A😀"]);
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(400);
    const answer = "A😀 and **Markdown**";
    reveal.update(answer);
    expect(frames.at(-1)).toBe("A😀");
    await vi.advanceTimersByTimeAsync(400);
    expect(frames.at(-1)).toBe(answer);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("can show the remaining answer immediately and settle the drain", async () => {
    const publish = vi.fn<(text: string) => void>();
    const reveal = createAnswerReveal(publish);
    const answer = "Show all of the answer now.";
    reveal.update(answer);
    const drained = reveal.drain();
    reveal.showAll();
    await drained;
    expect(publish).toHaveBeenLastCalledWith(answer);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels queued frames and settles the drain without publishing more text", async () => {
    const publish = vi.fn<(text: string) => void>();
    const reveal = createAnswerReveal(publish);
    reveal.update("The request was cancelled.");
    const drained = reveal.drain();
    reveal.cancel();
    await drained;
    await vi.advanceTimersByTimeAsync(3000);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("withholds a footer even when split across reads and preserves ordinary Markdown", () => {
    const answer = "The **partial** answer.";
    for (const fragment of ["\n", "\n\n[gen", "\n\n[generation error: ", "\n\n[generation error: interrupted]"]) {
      expect(streamingAnswerText(answer + fragment)).toBe(answer);
    }
    expect(streamingAnswerText(`${answer}\n\n[link](https://example.com)`)).toBe(`${answer}\n\n[link](https://example.com)`);
    expect(splitErrorFooter(`${answer}\n\n[generation error: interrupted]`)).toEqual({ text: answer, error: "interrupted" });
  });
});
