// Offline wiring test: answerQuestion / answerQuestionStream route summary requests to
// the summary path (Qdrant and generation mocked), and leave normal questions alone.
import { describe, test, expect, vi, beforeEach } from "vitest";
import type { ChunkPayload } from "../src/types.js";

const mocks = vi.hoisted(() => ({ scroll: vi.fn(), query: vi.fn(), generate: vi.fn(), generateStream: vi.fn(), embed: vi.fn() }));
vi.mock("@qdrant/js-client-rest", () => ({ QdrantClient: class { scroll = mocks.scroll; query = mocks.query; } }));
vi.mock("../src/retrieval/embedder.js", () => ({ embed: mocks.embed }));
vi.mock("../src/retrieval/sparseStats.js", () => ({ getAvgDocLength: async () => 100 }));
vi.mock("../src/generation/llm.js", async (orig) => ({
  ...(await orig<typeof import("../src/generation/llm.js")>()),
  generate: mocks.generate,
  generateStream: mocks.generateStream,
}));
import { answerQuestion, answerQuestionStream } from "../src/rag.js";
import { WHICH_ONE_LINE, SUMMARY_SYSTEM_PROMPT } from "../src/summarise.js";
import { embedConfig } from "../src/config.js";

const chunk = (documentId: string, source: string, chunkIndex: number, text: string): ChunkPayload => ({ documentId, source, chunkIndex, text });
const store: ChunkPayload[] = [
  chunk("h", "eval-corpus.txt", 0, "# Employee Handbook (Sample)\n\n## Vacation Policy\n15 days."),
  chunk("h", "eval-corpus.txt", 1, "## Remote Work\nThree days per week."),
  chunk("s", "sample.txt", 0, "# Sample Text Document\n\nThe quick brown fox."),
  chunk("d", "eval-corpus.docx", 0, "Employee Handbook (Sample)\n15 days."),
];
type Filter = { must: { key: string; match: { value: unknown } }[] };
async function* tokens(...ts: string[]) { yield* ts; }

beforeEach(() => {
  vi.clearAllMocks();
  mocks.scroll.mockImplementation(async (_c: string, { filter }: { filter: Filter }) => {
    const cond = filter.must[0]!;
    const points = store.filter((p) => (p as unknown as Record<string, unknown>)[cond.key] === cond.match.value).map((payload) => ({ payload }));
    return { points, next_page_offset: null };
  });
  mocks.query.mockResolvedValue({ points: [] });
  mocks.embed.mockResolvedValue(Array(embedConfig.dim).fill(0.1));
  mocks.generate.mockResolvedValue("SUMMARY TEXT");
  mocks.generateStream.mockImplementation(() => tokens("STREAMED ", "SUMMARY"));
});

describe("summary wiring in rag.ts", () => {
  test("clear match: one whole-document call, citation is the document, no retrieval", async () => {
    const r = await answerQuestion("summarise sample.txt", { collection: "c" });
    expect(r).toEqual({ answer: "SUMMARY TEXT", chunks: [], citations: [{ source: "sample.txt" }] });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    const [prompt, opts] = mocks.generate.mock.calls[0]!;
    expect(prompt).toContain("The quick brown fox.");
    expect(opts.system).toBe(SUMMARY_SYSTEM_PROMPT);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.embed).not.toHaveBeenCalled();
  });

  test("streaming: ambiguous asks which one; the reply produces the streamed summary", async () => {
    const ask = await answerQuestionStream("summarise the eval corpus", { collection: "c" });
    let text = "";
    for await (const t of ask.tokens) text += t;
    expect(text).toContain(WHICH_ONE_LINE);
    expect(text).toContain("1. eval-corpus.docx\n2. eval-corpus.txt");
    expect(ask.citations).toEqual([]);
    expect(mocks.generate).not.toHaveBeenCalled();

    const history = [{ role: "user" as const, content: "summarise the eval corpus" }, { role: "assistant" as const, content: text }];
    const reply = await answerQuestionStream("the second one", { collection: "c", history });
    expect(reply.citations).toEqual([{ source: "eval-corpus.txt" }]);
    let out = "";
    for await (const t of reply.tokens) out += t;
    expect(out).toBe("STREAMED SUMMARY");
    expect(mocks.generateStream.mock.calls[0]![0]).toContain("Three days per week.");
  });

  test("no documents: plain message", async () => {
    mocks.scroll.mockResolvedValue({ points: [], next_page_offset: null });
    const r = await answerQuestion("summarise the handbook", { collection: "c" });
    expect(r.answer).toMatch(/no documents to summarise/);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  test("normal questions never list documents", async () => {
    await answerQuestion("How many vacation days do I get?", { collection: "c" });
    expect(mocks.scroll).not.toHaveBeenCalled();
    expect(mocks.embed).toHaveBeenCalled();
  });
});
