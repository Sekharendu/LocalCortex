// Writes queries.json: caseId -> expandAcronyms(question), exactly as rag.ts passes to rerank().
import { readFileSync, writeFileSync } from "node:fs";
import { expandAcronyms } from "../../src/retrieval/acronyms.ts";
const here = new URL(".", import.meta.url);
const rows = readFileSync(new URL("../scenario1-top5-mrr-20261112/per-question.jsonl", here), "utf8").split("\n").filter(Boolean).map(JSON.parse);
const out = {};
for (const r of rows) if (r.group === "answerable") out[r.caseId] = expandAcronyms(r.question);
writeFileSync(new URL("queries.json", here), JSON.stringify(out, null, 1));
console.log(Object.keys(out).length, "queries;", rows.filter(r => r.group === "answerable" && expandAcronyms(r.question) !== r.question).length, "changed by expansion");
