import { describe, test, expect } from "vitest";
import {
  detectSummaryIntent,
  matchDocuments,
  toAvailableDocuments,
  resolveClarificationReply,
  decideSummary,
  listedCandidates,
  clarificationMessage,
  groupChunks,
  planCalls,
  NO_DOCUMENTS_MESSAGE,
  WHICH_ONE_LINE,
  type AvailableDocument,
} from "../src/summarise.js";

const docs: AvailableDocument[] = toAvailableDocuments([
  { documentId: "p", source: "Pfizer_2023_10K.pdf", text: "UNITED STATES SECURITIES AND EXCHANGE COMMISSION\nForm 10-K" },
  { documentId: "h", source: "eval-corpus.txt", text: "# Employee Handbook (Sample)\n\n## Vacation Policy\n..." },
  { documentId: "s", source: "sample.txt", text: "# Sample Text Document\n\nThis is a plain-text fixture." },
  { documentId: "r", source: "resume.pdf", text: "Sekharendu Dey\nSoftware engineer" },
  { documentId: "sec", source: "it-security-policy.txt", text: "# IT Security Policy\n..." },
  { documentId: "eh", source: "employee-handbook.txt", text: "# Acme Employee Handbook\n..." },
  { documentId: "d1", source: "eval-corpus.docx", text: "Employee Handbook (Sample)\n..." },
]);
const byId = (id: string) => docs.find((d) => d.documentId === id)!;

describe("detectSummaryIntent", () => {
  test.each([
    "summarise the Pfizer report",
    "Summarize resume.pdf",
    "Can you summarise the handbook?",
    "please summarize the security policy in 3 bullet points",
    "give me an overview of the handbook",
    "Give me a short summary of the Pfizer 10-K",
    "I need a summary of the handbook",
    "Can I get a quick overview of sample.txt?",
    "tl;dr resume.pdf",
    "TLDR the handbook",
    "summary of the handbook",
    "Overview: Pfizer_2023_10K.pdf",
    "What's the summary of the security policy?",
    "sum up the employee handbook",
    "summarise",
  ])("strong: %s", (q) => expect(detectSummaryIntent(q)).toBe("strong"));

  test.each(["what is resume.pdf about?", "What's the Pfizer report about", "what does the handbook cover?"])(
    "weak: %s",
    (q) => expect(detectSummaryIntent(q)).toBe("weak"),
  );

  test.each([
    "what does the handbook say about vacation?",
    "How many vacation days do I get per year?",
    "What is the vacation policy about remote work?",
    "How do I write a summary report for my manager?",
    "Does the handbook give an overview of benefits?",
    "Is there a summary section in the Pfizer report?",
    "What are the key points of the security policy?",
    "Summarise what the handbook says about vacation",
    "Give me a summary of the handbook's rules about remote work",
    "Tell me about Sekharendu Dey",
    "What is the capital of France?",
    "Who wrote the summary?",
    "What was Pfizer's revenue in 2023?",
  ])("not a summary: %s", (q) => expect(detectSummaryIntent(q)).toBeNull());
});

describe("matchDocuments", () => {
  test("single clear matches", () => {
    expect(matchDocuments("summarise the Pfizer report", docs)).toMatchObject({ status: "resolved", doc: byId("p") });
    expect(matchDocuments("summarise PFIZER", docs)).toMatchObject({ status: "resolved", doc: byId("p") });
    expect(matchDocuments("what is resume.pdf about?", docs)).toMatchObject({ status: "resolved", doc: byId("r") });
    expect(matchDocuments("summarise the security policy", docs)).toMatchObject({ status: "resolved", doc: byId("sec") });
    // name match beats a title-only match ("Employee Handbook (Sample)")
    expect(matchDocuments("summarise the sample", docs)).toMatchObject({ status: "resolved", doc: byId("s") });
    expect(matchDocuments("summarise the employee handbook", docs)).toMatchObject({ status: "resolved", doc: byId("eh") });
    // the extension word breaks a tie between two copies of the same file
    expect(matchDocuments("summarise the eval corpus docx", docs)).toMatchObject({ status: "resolved", doc: byId("d1") });
  });
  test("ambiguous", () => {
    const m = matchDocuments("summarise the eval corpus", docs);
    expect(m.status).toBe("ambiguous");
    if (m.status === "ambiguous") expect(m.candidates.map((d) => d.documentId).sort()).toEqual(["d1", "h"]);
    expect(matchDocuments("summarise the handbook", docs).status).toBe("ambiguous");
  });
  test("none and partial", () => {
    expect(matchDocuments("summarise the Moderna filing", docs).status).toBe("none");
    expect(matchDocuments("summarise it", docs)).toMatchObject({ status: "none", terms: { specific: [] } });
    const m = matchDocuments("summarise the vacation policy", docs);
    expect(m.status).toBe("partial");
    if (m.status === "partial") expect(m.candidates[0]!.documentId).toBe("sec");
  });
  test("format words are not document words", () => {
    expect(matchDocuments("summarise resume in 3 bullet points", docs)).toMatchObject({ status: "resolved", doc: byId("r") });
  });
});

describe("toAvailableDocuments", () => {
  test("titles, sort order and duplicate names", () => {
    const list = toAvailableDocuments([
      { documentId: "b", source: "dir/B.docx", text: "Long first line that is clearly prose and not a title at all, it goes on and on for a while longer than a hundred chars" },
      { documentId: "a", source: "A.pdf", text: "x", section: "Annual Report › Intro" },
      { documentId: "a2", source: "A.pdf", text: "y" },
    ]);
    expect(list.map((d) => d.name)).toEqual(["A.pdf", "A.pdf (copy 2)", "B.docx"]);
    expect(list[0]!.title).toBe("Annual Report");
    expect(list[2]!.title.split(" ").length).toBe(8);
  });
});

describe("clarification reply", () => {
  const listed = ["eval-corpus.docx", "eval-corpus.txt", "sample.txt"];
  const history = [
    { role: "user" as const, content: "summarise the sample stuff" },
    { role: "assistant" as const, content: clarificationMessage(listed.map((n) => docs.find((d) => d.name === n)!)) },
  ];
  test("the clarification lists numbered names and is recognised", () => {
    expect(history[1]!.content).toContain(WHICH_ONE_LINE);
    expect(history[1]!.content).toContain("2. eval-corpus.txt");
    expect(listedCandidates(history)).toEqual(listed);
    expect(listedCandidates([...history, { role: "user", content: "x" }])).toBeNull();
    expect(listedCandidates([{ role: "assistant", content: "Fifteen days." }])).toBeNull();
  });
  test.each([
    ["the second one", "h"],
    ["2", "h"],
    ["#3", "s"],
    ["number 1", "d1"],
    ["first", "d1"],
    ["the last one", "s"],
    ["one", "d1"],
    ["sample.txt", "s"],
    ["the sample one", "s"],
    ["the word one", "d1"],
    ["Pfizer", "p"], // not listed, but a clear name among all documents
    ["summarise resume.pdf instead", "r"],
  ])("%s -> %s", (reply, id) => {
    const r = resolveClarificationReply(reply, listed, docs);
    expect(r).toMatchObject({ status: "resolved", doc: byId(id) });
  });
  test("ambiguous and non-replies", () => {
    expect(resolveClarificationReply("the eval corpus", listed, docs).status).toBe("ambiguous");
    expect(resolveClarificationReply("the txt", listed, docs).status).toBe("ambiguous");
    expect(resolveClarificationReply("How many vacation days do I get?", listed, docs).status).toBe("none");
    expect(resolveClarificationReply("7", listed, docs).status).toBe("none");
  });
  test("decideSummary uses the reply, and falls back to normal answering", () => {
    expect(decideSummary("the second one", history, docs)).toEqual({ kind: "summary", doc: byId("h") });
    expect(decideSummary("How many vacation days do I get?", history, docs)).toBeNull();
  });
});

describe("decideSummary", () => {
  test("clear match, ambiguous, no match, no documents", () => {
    expect(decideSummary("summarise the Pfizer report", [], docs)).toEqual({ kind: "summary", doc: byId("p") });
    const amb = decideSummary("summarise the handbook", [], docs);
    expect(amb?.kind).toBe("message");
    if (amb?.kind === "message") expect(amb.text).toMatch(/1\. .*handbook|eval-corpus/);
    const none = decideSummary("summarise the Moderna filing", [], docs);
    expect(none?.kind).toBe("message");
    if (none?.kind === "message") {
      expect(none.text).toContain('couldn\'t find a document called "moderna filing"');
      expect(none.text.match(/^\d+\. /gm)).toHaveLength(docs.length);
    }
    expect(decideSummary("summarise the handbook", [], [])).toEqual({ kind: "message", text: NO_DOCUMENTS_MESSAGE });
    expect(decideSummary("How many vacation days?", [], docs)).toBeNull();
  });
  test("weak intent only when a document is named", () => {
    expect(decideSummary("what is resume.pdf about?", [], docs)).toEqual({ kind: "summary", doc: byId("r") });
    expect(decideSummary("what is the vacation policy about?", [], docs)).toBeNull();
    expect(decideSummary("what is this about?", [], docs)).toBeNull();
    expect(decideSummary("what is resume.pdf about?", [], [])).toBeNull();
  });
  test("no target: one document is summarised, several are listed (capped at 10)", () => {
    expect(decideSummary("summarise it", [], [byId("r")])).toEqual({ kind: "summary", doc: byId("r") });
    const many = toAvailableDocuments(Array.from({ length: 14 }, (_, i) => ({ documentId: `x${i}`, source: `doc${String(i).padStart(2, "0")}.txt`, text: "t" })));
    const plan = decideSummary("summarise", [], many);
    expect(plan?.kind).toBe("message");
    if (plan?.kind === "message") {
      expect(plan.text.match(/^\d+\. /gm)).toHaveLength(10);
      expect(plan.text).toContain("4 more");
    }
  });
});

describe("splitting long documents", () => {
  const count = (t: string) => t.split(/\s+/).filter(Boolean).length; // 1 token per word
  const chunk = (i: number, page?: number) => ({ text: `w${i} `.repeat(10).trim(), ...(page ? { page } : {}) });

  test("groups are consecutive, in reading order, and fit the budget", () => {
    const chunks = Array.from({ length: 10 }, (_, i) => chunk(i, Math.floor(i / 3) + 1));
    const groups = groupChunks(chunks, 35, count);
    expect(groups.map((g) => g.indices)).toEqual([[0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]);
    expect(groups.flatMap((g) => g.indices)).toEqual([...Array(10).keys()]);
    for (const g of groups) expect(count(g.text)).toBeLessThanOrEqual(35);
    expect(groups[1]).toMatchObject({ firstPage: 2, lastPage: 2 });
    expect(groups[0]!.text.startsWith("w0")).toBe(true);
  });
  test("a chunk over budget forms its own group", () => {
    const groups = groupChunks([chunk(0), { text: "big ".repeat(50) }, chunk(2)], 20, count);
    expect(groups.map((g) => g.indices)).toEqual([[0], [1], [2]]);
  });
  test("short document: one whole call", () => {
    const plan = planCalls("a.txt", [chunk(0), chunk(1)], "summarise a.txt", 12, count, 5000);
    expect(plan).toMatchObject({ mode: "whole", used: 1 });
    expect(plan.coverageNote).toBeUndefined();
  });
  test("long document: two stages; capped at maxCalls with a coverage note", () => {
    const chunks = Array.from({ length: 800 }, (_, i) => ({ text: `w${i} `.repeat(100).trim(), page: i + 1 }));
    const plan = planCalls("big.pdf", chunks, "summarise big.pdf", 12, count, 5000);
    expect(plan.mode).toBe("two-stage");
    expect(plan.groups.length).toBeGreaterThan(11);
    expect(plan.used).toBe(11); // 11 partial calls + 1 combine = 12
    expect(plan.coverageNote).toMatch(/too long to summarise in full.*first \d+% of it \(up to page \d+\)/);
    const small = planCalls("mid.pdf", chunks.slice(0, 60), "summarise mid.pdf", 12, count, 5000);
    expect(small.mode).toBe("two-stage");
    expect(small.used).toBe(small.groups.length);
    expect(small.coverageNote).toBeUndefined();
  });
});
