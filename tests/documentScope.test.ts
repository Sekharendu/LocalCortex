import { describe, test, expect, vi, beforeEach } from "vitest";
import type { ChunkPayload } from "../src/types.js";
const mocks = vi.hoisted(() => ({ query: vi.fn(), scroll: vi.fn(), embed: vi.fn() }));
vi.mock("@qdrant/js-client-rest", () => ({ QdrantClient: class { query = mocks.query; scroll = mocks.scroll; } }));
vi.mock("../src/retrieval/embedder.js", () => ({ embed: mocks.embed }));
vi.mock("../src/retrieval/sparseStats.js", () => ({ getAvgDocLength: async () => 100 }));
import { explicitReferences, resolveFromHeaders, scopeQuestion, resolveDocumentScope } from "../src/retrieval/documentScope.js";
import { searchSimilar, hybridSearch } from "../src/retrieval/vectorStore.js";
import { retrieve } from "../src/retrieval/retriever.js";
import { embedConfig } from "../src/config.js";
import { retrieveForQuestion } from "../src/rag.js";
const vector = Array(embedConfig.dim).fill(0.1) as number[];
const header = (id: string, text = "AsterLab Retention Bulletin\nEffective 2026-01-01\nRetention is 29 days."): ChunkPayload => ({ documentId: id, source: `${id}.pdf`, text, chunkIndex: 0 });
beforeEach(() => { vi.clearAllMocks(); mocks.query.mockResolvedValue({ points: [] }); mocks.scroll.mockResolvedValue({ points: [], next_page_offset: null }); mocks.embed.mockResolvedValue(vector); });
describe("literal document identity", () => {
 test("wrapped Unicode titles and filenames resolve from live metadata", () => {
  expect(resolveFromHeaders('Regarding the paper “Cross-lingual Translation”: results?', [header("a", "Cross-lingual\nTranslation\nAuthors")]).documentIds).toEqual(["a"]);
  expect(resolveFromHeaders("In a.pdf, how long?", [header("a")]).documentIds).toEqual(["a"]);
  expect(resolveFromHeaders('file "Annual Report.pdf": how long?', [{...header("a"),source:"Annual Report.pdf"}]).documentIds).toEqual(["a"]);
  expect(resolveFromHeaders('paper "Exploration Strategies": results?', [{...header("a", "EXPLO-\nRATION STRATEGIES\nAuthors"), section:"EXPLO-"}]).documentIds).toEqual(["a"]);
  expect(resolveFromHeaders('paper "Detecting"Smart"Spammers On Social Network": results?', [header("a", 'Detecting"Smart"Spammers On Social Network\nAuthors')]).documentIds).toEqual(["a"]);
  expect(resolveFromHeaders('paper "Deep LSTM": results?', [header("a", "arXiv:1703.07090v1 [cs.CL] 21 Mar 2017\nDeep LSTM\nAuthors")]).documentIds).toEqual(["a"]);
  expect(resolveFromHeaders('paper "Quasi Recurrent Networks": results?', [header("a", "Under review as a conference paper at ICLR 2017\nQuasi-Recurrent Networks\nAuthors")]).documentIds).toEqual(["a"]);
 });
 test("missing and duplicate identity fail closed without a latest-version default", () => {
  expect(resolveFromHeaders('paper "Missing"?', [header("a")]).status).toBe("missing");
  expect(resolveFromHeaders('document "AsterLab Retention Bulletin"?', [header("a"), header("b")]).documentIds).toEqual([]);
 });
 test("attached versions and effective dates select one identity; missing/conflicting fail closed", () => {
  const rows=[header("a", "AsterLab Retention Bulletin\nVersion 1\nEffective 2026-01-01"), header("b", "AsterLab Retention Bulletin\nVersion 2\nEffective 2026-02-01")];
  expect(resolveFromHeaders('document "AsterLab Retention Bulletin" version 2: how long?', rows).documentIds).toEqual(["b"]);
  expect(resolveFromHeaders('In the AsterLab Retention Bulletin effective 2026-01-01, how long?', rows).documentIds).toEqual(["a"]);
  expect(resolveFromHeaders('document "AsterLab Retention Bulletin" version 3?', rows).status).toBe("missing");
  expect(resolveFromHeaders('document "AsterLab Retention Bulletin" version 1 version 2?', rows).status).toBe("ambiguous");
 });
 test("ordinary topics and model versions do not acquire a document constraint", () => {
  expect(explicitReferences("What is BERT version 2?")).toEqual([]);
  expect(resolveFromHeaders('paper "AsterLab Retention Bulletin": does BERT version 2 help?', [header("a")]).documentIds).toEqual(["a"]);
 });
 test("body mentions of missing/deleted documents cannot become leading title identities", async () => {
  const other=header("other", "AsterLab Controlled Facts\nThis document supersedes AsterLab Retention Bulletin. Retention is 17 days.");
  expect(resolveFromHeaders('document "AsterLab Retention Bulletin": how long?', [other]).status).toBe("missing");
  for (const mode of ["dense", "hybrid"] as const) {
   mocks.scroll.mockResolvedValueOnce({points:[{payload:other}],next_page_offset:null});
   expect((await retrieveForQuestion('document "AsterLab Retention Bulletin": how long?',{mode})).chunks).toEqual([]);
  }
  expect(mocks.query).not.toHaveBeenCalled();expect(mocks.embed).not.toHaveBeenCalled();
 });
 test("only filename, actual title or standalone leading metadata can supply document revision", () => {
  const v1=header("v1", "AsterLab Retention Bulletin\nVersion 1\nEffective 2026-01-01\n29 days\nThe deployment uses model version 2.");
  expect(resolveFromHeaders('document "AsterLab Retention Bulletin" version 2: how long?', [v1]).status).toBe("missing");
  expect(resolveFromHeaders('document "AsterLab Retention Bulletin" version 1: how long?', [v1]).documentIds).toEqual(["v1"]);
  expect(resolveFromHeaders('document "AsterLab Retention Bulletin" version 2: how long?', [header("v2", "AsterLab Retention Bulletin v2\n29 days")]).documentIds).toEqual(["v2"]);
  expect(resolveFromHeaders('document "AsterLab Retention Bulletin" version 2: how long?', [{...header("x"),source:"retention-v2.pdf"}]).documentIds).toEqual(["x"]);
  expect(resolveFromHeaders('document "AsterLab Retention Bulletin" version 2: how long?', [header("x", "AsterLab Retention Bulletin\nVersion 1\nVersion 2\n29 days")]).documentIds).toEqual([]);
 });
 test.each(["And what does version 2 say?", "And effective 2026-02-01, how long?", "And what does it say in version 2?", "Does that change in version 2?", "And what does it say effective 2026-02-01?", "Does that change effective 2026-02-01?"])("original-user rag path rejects changed inherited qualifier: %s", async latest => {
  mocks.scroll.mockResolvedValue({points:[{payload:header("v1", "AsterLab Retention Bulletin\nVersion 1\nEffective 2026-01-01\n29 days")}],next_page_offset:null});
  const prior='document "AsterLab Retention Bulletin" version 1 effective 2026-01-01: how long?';
  const result=await retrieveForQuestion(latest,{history:[{role:"user",content:prior}]});
  expect(result.documentScope.documentIds).toEqual([]);expect(result.chunks).toEqual([]);
  expect(mocks.embed).not.toHaveBeenCalled();expect(mocks.query).not.toHaveBeenCalled();
 });
 test("exact filenames inspect wrapped actual title metadata independently of alias matching", () => {
  const conflicting={...header("v1", "AsterLab Retention\nBulletin\nVersion 2\n29 days"),source:"a-v1.pdf"};
  expect(resolveFromHeaders('file "a-v1.pdf" version 1: how long?', [conflicting]).documentIds).toEqual([]);
  expect(resolveFromHeaders('file "a-v1.pdf" version 1: how long?', [{...conflicting,text:"AsterLab Retention\nBulletin\nVersion 1\n29 days\nThe model uses version 2."}]).documentIds).toEqual(["v1"]);
  expect(resolveFromHeaders('file "a-v1.pdf" version 1: how long?', [{...conflicting,text:"AsterLab Retention\nBulletin\nEffective 2026-01-01\nEffective 2026-02-01\n29 days"}]).documentIds).toEqual([]);
 });
 test.each(["notes.txt", "notes.md"])("a unique exact plain filename %s needs no title unless revision selection is requested", source => {
  const notes={...header("notes","the retention period is 29 days."),source};
  expect(resolveFromHeaders(`In ${source}, what is the retention?`,[notes]).documentIds).toEqual(["notes"]);
  expect(resolveFromHeaders(`file "${source}" version 1: how long?`,[notes]).documentIds).toEqual([]);
  expect(resolveFromHeaders(`file "${source}" effective 2026-01-01: how long?`,[notes]).documentIds).toEqual([]);
  expect(resolveFromHeaders(`In ${source}, what is the retention?`,[notes,{...notes,documentId:"duplicate"}]).status).toBe("ambiguous");
  expect(resolveFromHeaders("In unknown.txt, how long?",[notes]).status).toBe("missing");
  expect(resolveFromHeaders('file "notes-v1.txt": how long?',[{...notes,source:"notes-v1.txt"}]).documentIds).toEqual([]);
 });
 test("a conflicting requested revision survives subsequent referring user turns", () => {
  const prior='document "AsterLab Retention Bulletin" version 1: how long?';
  const inherited=scopeQuestion("And how long is that?",[prior,"Does that change in version 2?"]);
  expect(resolveFromHeaders(inherited,[header("v1","AsterLab Retention Bulletin\nVersion 1\n29 days")]).documentIds).toEqual([]);
 });
 test("a generic model-version followup retains the old document rather than selecting that model's version", () => {
  const prior='document "AsterLab Retention Bulletin" version 1: how long?';
  const inherited=scopeQuestion("And what about model version 2?",[prior]);
  expect(resolveFromHeaders(inherited,[header("v1","AsterLab Retention Bulletin\nVersion 1\n29 days")]).documentIds).toEqual(["v1"]);
 });
 test("referring followups retain original identity; explicit new identity replaces it and standalone topics end inheritance", () => {
  const prior='paper "AsterLab Retention Bulletin" effective 2026-01-01: how long?';
  expect(scopeQuestion("And what about that?", [prior])).toContain(prior);
  expect(scopeQuestion('paper "Other": why?', [prior])).toBe('paper "Other": why?');
  expect(scopeQuestion("What is neural translation?", [prior])).toBe("What is neural translation?");
 });
 test("catalog errors propagate and no persistent identity cache survives deletion", async () => {
  mocks.scroll.mockRejectedValueOnce(new Error("offline"));
  await expect(resolveDocumentScope('paper "AsterLab Retention Bulletin"', "owned")).rejects.toThrow("catalog");
  mocks.scroll.mockResolvedValueOnce({points:[{payload:header("a")}], next_page_offset:null});
  expect((await resolveDocumentScope('paper "AsterLab Retention Bulletin"', "owned")).documentIds).toEqual(["a"]);
  expect((await resolveDocumentScope('paper "AsterLab Retention Bulletin"', "owned")).documentIds).toEqual([]);
 });
});
describe("scope on every candidate path", () => {
 test("hybrid filters dense and sparse prefetch and final fusion, including empty sparse", async () => {
  await hybridSearch("owned", vector, {indices:[1],values:[1]}, {documentIds:["a"]});
  const query=mocks.query.mock.calls[0]![1];
  expect(query.filter.must[0].match.any).toEqual(["a"]);
  expect(query.prefetch.every((p: {filter: unknown}) => JSON.stringify(p.filter)===JSON.stringify(query.filter))).toBe(true);
  await hybridSearch("owned", vector, {indices:[],values:[]}, {documentIds:[]});
  expect(mocks.query.mock.calls[1]![1].filter.must[0].match.any).toEqual([]);
 });
 test("same-document fill intersects the immutable allowlist", async () => {
  await searchSimilar("owned",vector,{documentId:"b",documentIds:["a"]});
  expect(mocks.query.mock.calls[0]![1].filter.must[0].match.any).toEqual([]);
 });
 test.each(["dense", "hybrid"] as const)("deletion between resolution and %s search never substitutes another document", async mode => {
  mocks.scroll.mockResolvedValueOnce({points:[{payload:header("a")}],next_page_offset:null});
  const scope=await resolveDocumentScope('paper "AsterLab Retention Bulletin"',"owned");
  // Deletion has now committed. A global query could return b; filtered query cannot.
  mocks.query.mockImplementation(async (_name, query) => ({points:query.filter ? [] : [{id:"b",score:0.9,payload:header("b") }]}));
  expect(await retrieve("How long?",{collection:"owned",mode,documentScope:scope,previousQuestion:"Earlier?"})).toEqual([]);
  expect(mocks.query.mock.calls.every(c=>c[1].filter.must[0].match.any[0]==="a")).toBe(true);
  expect(mocks.query.mock.calls[0]![1].score_threshold).toBe(0.57);
 });
 test("overlapping requests keep disjoint scope and the existing hybrid relevance gate", async () => {
  await Promise.all([retrieve("Alpha?",{mode:"hybrid",documentScope:{status:"resolved",references:["a"],documentIds:["a"]}}),retrieve("Beta?",{mode:"hybrid",documentScope:{status:"resolved",references:["b"],documentIds:["b"]}})]);
  expect(mocks.query.mock.calls.map(c=>c[1].filter.must[0].match.any)).toEqual([["a"],["b"]]);
  expect(mocks.query.mock.calls.every(c=>c[1].score_threshold===0.63)).toBe(true);
 });
 test("unavailable explicit scope short-circuits embedding and search", async () => {
  expect(await retrieve('paper "Missing"',{documentScope:{status:"missing",references:["Missing"],documentIds:[]}})).toEqual([]);
  expect(mocks.embed).not.toHaveBeenCalled();
 });
});
