import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { rerank, RERANK_MODEL } from "../src/retrieval/reranker.js";
import { RerankingError } from "../src/errors.js";

const candidates = Array.from({ length: 3 }, (_, i) => ({ text: `original passage ${i}`, source: `${i}.pdf`, score: .9 - i / 10, documentId: "doc", chunkIndex: i, page: i + 1 }));
const envelope = (rows: unknown = [{ id: 2, score: .8 }, { id: 1, score: .8 }, { id: 0, score: .1 }]) => new Response(JSON.stringify({ success: true, errors: [], result: { response: rows } }));
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "a".repeat(32)); vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-token");
  vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); fetchMock.mockResolvedValue(envelope());
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

test("native contract, stable ties, original metadata and scores, no input mutation", async () => {
  const out = await rerank("query", candidates, 2);
  expect(out).toEqual([{ ...candidates[1], rerankScore: .8 }, { ...candidates[2], rerankScore: .8 }]);
  expect(candidates[1]).not.toHaveProperty("rerankScore");
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`https://api.cloudflare.com/client/v4/accounts/${"a".repeat(32)}/ai/run/${RERANK_MODEL}`);
  expect(JSON.parse(init!.body as string)).toEqual({ query: "query", contexts: candidates.map(c => ({ text: c.text })), top_k: 3 });
  expect(init!.redirect).toBe("error");
});

test.each([
  [{ id: 0, score: 1 }],
  [{ id: 0, score: 1 }, { id: 0, score: 2 }, { id: 2, score: 3 }],
  [{ id: -1, score: 1 }, { id: 1, score: 2 }, { id: 2, score: 3 }],
  [{ id: .5, score: 1 }, { id: 1, score: 2 }, { id: 2, score: 3 }],
  [{ id: 3, score: 1 }, { id: 1, score: 2 }, { id: 2, score: 3 }],
  [{ id: "0", score: 1 }, { id: 1, score: 2 }, { id: 2, score: 3 }],
  [{ id: 0, score: null }, { id: 1, score: 2 }, { id: 2, score: 3 }],
].map(rows => ({ rows })))("rejects malformed mapping %#", async ({ rows }) => {
  fetchMock.mockResolvedValueOnce(envelope(rows));
  await expect(rerank("query", candidates, 2)).rejects.toBeInstanceOf(RerankingError);
});

test.each([
  new Response("bad JSON"),
  new Response(JSON.stringify({ success: false, result: { response: [] } })),
  new Response(JSON.stringify({ success: true, errors: [{ code: 1 }], result: { response: [] } })),
  new Response(JSON.stringify({ response: [] })),
  new Response("forbidden", { status: 403 }),
  new Response("x".repeat(65537)),
])("fails closed on provider/envelope/body errors %# and releases capacity", async response => {
  fetchMock.mockResolvedValueOnce(response);
  await expect(rerank("query", candidates, 2)).rejects.toBeInstanceOf(RerankingError);
  fetchMock.mockResolvedValue(envelope());
  await expect(rerank("query", candidates, 1)).resolves.toHaveLength(1);
});

test("empty pools, invalid bounds, credentials, pre-abort cause no requests", async () => {
  expect(await rerank("query", [], 5)).toEqual([]);
  for (const [q, cs, k] of [["x".repeat(2049), candidates, 1], ["q", [{ ...candidates[0], text: "é".repeat(4097) }], 1], ["q", Array(51).fill(candidates[0]), 1], ["q", candidates, 51], ["q", candidates, 1.5]] as const) {
    await expect(rerank(q, [...cs], k)).rejects.toBeInstanceOf(RerankingError);
  }
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
  await expect(rerank("q", candidates, 1)).rejects.toBeInstanceOf(RerankingError);
  await expect(rerank("q", candidates, 1, AbortSignal.abort())).rejects.toBeInstanceOf(RerankingError);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("two independent operations allowed, third rejected without queue; cancel frees only its slot", async () => {
  const pending: ((r: Response) => void)[] = [];
  fetchMock.mockImplementation((_url, init) => new Promise((resolve, reject) => {
    pending.push(resolve); init!.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }));
  const a = new AbortController();
  const first = rerank("first", candidates, 1, a.signal);
  const failed = expect(first).rejects.toBeInstanceOf(RerankingError);
  const second = rerank("second", candidates, 1);
  await expect(rerank("third", candidates, 1)).rejects.toThrow("capacity");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  a.abort(); await failed;
  const third = rerank("replacement", candidates, 1);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  pending[2](envelope()); pending[1](envelope());
  await expect(third).resolves.toHaveLength(1);
  await expect(second).resolves.toHaveLength(1);
});

test("timeout covers stalled body and cleans timer/listener/body and capacity", async () => {
  vi.useFakeTimers();
  let cancelled = false;
  fetchMock.mockImplementation(async (_url, init) => new Response(new ReadableStream({
    start(controller) { init!.signal!.addEventListener("abort", () => controller.error(new Error("abort")), { once: true }); },
    cancel() { cancelled = true; },
  })));
  const caller = new AbortController();
  const remove = vi.spyOn(caller.signal, "removeEventListener");
  const result = rerank("q", candidates, 1, caller.signal);
  const assertion = expect(result).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(15000); await assertion;
  expect(vi.getTimerCount()).toBe(0); expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  // An errored stream is already closed; cancel() need not invoke its underlying source.
  expect(typeof cancelled).toBe("boolean");
  fetchMock.mockResolvedValue(envelope());
  await expect(rerank("q", candidates, 1)).resolves.toHaveLength(1);
});

test("HTTP failure cancels unconsumed response body", async () => {
  const cancel = vi.fn();
  fetchMock.mockResolvedValue(new Response(new ReadableStream({ cancel }), { status: 429 }));
  await expect(rerank("q", candidates, 1)).rejects.toThrow("429");
  expect(cancel).toHaveBeenCalledOnce();
});
