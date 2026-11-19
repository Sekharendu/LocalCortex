// Live check for "summarise <document>" (src/summarise.ts) through the real HTTP routes.
// Throwaway collection + temp document store + temp sparse stats; deletes them afterwards.
// Meters every Cloudflare call (usage.neurons from JSON and SSE bodies) with a hard cap.
// Run from the repo root: npx tsx eval/summarise-feature-20261119/live-check.mts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HERE = "eval/summarise-feature-20261119";
const COLLECTION = "tmp-summarise-20261119";
const PORT = 3917;
const CAP = Number(process.env.NEURON_CAP ?? 1400);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "summarise-live-"));
process.env.QDRANT_COLLECTION = COLLECTION;
process.env.DOC_STORE_PATH = path.join(tmp, "documents.json");
process.env.SPARSE_STATS_PATH = path.join(tmp, "sparse-stats.json");
process.env.PORT = String(PORT);
// Credentials are read into the process only; never printed or written.
for (const l of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
}

// ---- neuron meter ----
const calls: { neurons: number | null; prompt_tokens?: number; completion_tokens?: number; stream: boolean }[] = [];
const used = () => calls.reduce((s, c) => s + (c.neurons ?? 0), 0);
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(typeof input === "string" ? input : input?.url ?? input);
  if (!url.includes("api.cloudflare.com")) return realFetch(input, init);
  if (used() + 60 > CAP) throw new Error(`neuron cap reached: ${used().toFixed(1)} of ${CAP}`);
  const res = await realFetch(input, init);
  const rec: (typeof calls)[number] = { neurons: null, stream: false };
  calls.push(rec);
  if (res.headers.get("content-type")?.includes("text/event-stream") && res.body) {
    rec.stream = true;
    const [a, b] = res.body.tee();
    (async () => {
      const text = await new Response(b).text();
      for (const line of text.split(/\r?\n/)) {
        if (!line.startsWith("data:")) continue;
        try {
          const j = JSON.parse(line.slice(5));
          const u = (j.result ?? j).usage;
          if (u) Object.assign(rec, { neurons: u.neurons ?? null, prompt_tokens: u.prompt_tokens, completion_tokens: u.completion_tokens });
        } catch { /* [DONE] */ }
      }
    })().catch(() => {});
    return new Response(a, { status: res.status, statusText: res.statusText, headers: res.headers });
  }
  try {
    const j: any = await res.clone().json();
    const u = (j.result ?? j).usage;
    if (u) Object.assign(rec, { neurons: u.neurons ?? null, prompt_tokens: u.prompt_tokens, completion_tokens: u.completion_tokens });
  } catch { /* not JSON */ }
  return res;
}) as typeof fetch;

const { ingestDocument } = await import("../../src/ingest/pipeline.js");
const { listCollections } = await import("../../src/retrieval/vectorStore.js");
const { QdrantClient } = await import("@qdrant/js-client-rest");
if ((await listCollections()).includes(COLLECTION)) throw new Error(`${COLLECTION} already exists; refusing to reuse it`);

// Long dev document: the four large-corpus policy files in one text file (~48k chars).
const combined = path.join(tmp, "large-corpus-all.txt");
fs.writeFileSync(combined, ["employee-handbook", "engineering-practices", "it-security-policy", "legal-compliance-manual"]
  .map((f) => fs.readFileSync(`data/large-corpus/${f}.txt`, "utf8")).join("\n\n"));

const log: string[] = [];
const out = (s: string) => { console.log(s); log.push(s); };
const results: any[] = [];
const BASE = `http://localhost:${PORT}`;
let conversationIds: string[] = [];

try {
  for (const [file, name] of [["data/eval-corpus.txt", "eval-corpus.txt"], ["data/eval-corpus.docx", "eval-corpus.docx"], [combined, "large-corpus-all.txt"]] as const) {
    const r = await ingestDocument(file, { collection: COLLECTION, originalName: name });
    if (!r.success) throw new Error(`ingest ${name} failed at ${r.stage}: ${r.error}`);
    out(`ingested ${name}: ${r.chunkCount} chunks`);
  }
  await import("../../src/server.js");
  await new Promise((r) => setTimeout(r, 500));

  async function step(label: string, fn: () => Promise<{ status: number; citations: unknown; text: string }>) {
    const before = calls.length, n0 = used(), t0 = Date.now();
    const r = await fn();
    await new Promise((res) => setTimeout(res, 300)); // let the SSE tee finish recording usage
    const rec = { label, status: r.status, citations: r.citations, ms: Date.now() - t0, cfCalls: calls.length - before, neurons: +(used() - n0).toFixed(2), text: r.text };
    results.push(rec);
    out(`\n=== ${label}\nHTTP ${r.status} | ${rec.cfCalls} Cloudflare calls | ${rec.neurons} neurons | ${(rec.ms / 1000).toFixed(1)} s | citations ${JSON.stringify(r.citations)}\n${r.text.slice(0, 300)}${r.text.length > 300 ? "…" : ""}`);
    return r;
  }
  const query = (question: string, stream = false) => async () => {
    const res = await fetch(`${BASE}/query`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, stream }) });
    if (stream) return { status: res.status, citations: JSON.parse(res.headers.get("x-citations") ?? "null"), text: await res.text() };
    const j: any = await res.json();
    return { status: res.status, citations: j.citations, text: j.answer ?? j.error };
  };
  const message = (cid: string, content: string) => async () => {
    const res = await fetch(`${BASE}/conversations/${cid}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }) });
    return { status: res.status, citations: JSON.parse(res.headers.get("x-citations") ?? "null"), text: await res.text() };
  };

  // 1. one clear match, long document -> two-stage (POST /query, non-streaming)
  await step("clear match, long doc (two-stage) | /query | Give me an overview of the large corpus", query("Give me an overview of the large corpus"));
  // 2. ambiguous request + reply, short doc -> whole (conversation route, streaming)
  const cid = ((await (await fetch(`${BASE}/conversations`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json()) as any).conversation.id;
  conversationIds.push(cid);
  await step("ambiguous | conversation | summarise the eval corpus", message(cid, "summarise the eval corpus"));
  await step("reply to which-one, short doc (whole) | conversation | the second one", message(cid, "the second one"));
  const saved: any = await (await fetch(`${BASE}/conversations/${cid}`)).json();
  out(`\nsaved conversation messages: ${saved.conversation.messages.map((m: any) => `${m.role}/${m.status ?? "ok"}/${(m.citations ?? []).length} cit`).join(", ")}`);
  // 3. no match (POST /query streaming)
  await step("no match | /query stream | summarise the Pfizer report", query("summarise the Pfizer report", true));
  // 4. normal questions and off-topic refusals (unchanged path)
  await step("normal | /query | How many vacation days do I get per year?", query("How many vacation days do I get per year?"));
  await step("normal | /query stream | How many days per week can I work remotely?", query("How many days per week can I work remotely?", true));
  await step("off-topic | /query | What is the capital of France?", query("What is the capital of France?"));
  await step("off-topic | /query stream | How do I bake a chocolate cake?", query("How do I bake a chocolate cake?", true));
} finally {
  out(`\nTOTAL neurons (from Cloudflare usage): ${used().toFixed(2)} over ${calls.length} calls; calls without usage: ${calls.filter((c) => c.neurons === null).length}`);
  fs.writeFileSync(`${HERE}/live-check.log`, log.join("\n") + "\n");
  fs.writeFileSync(`${HERE}/live-check.json`, JSON.stringify({ collection: COLLECTION, results, calls }, null, 2));
  // Cleanup: the throwaway collection, its temp records, and the test conversations only.
  for (const id of conversationIds) await realFetch(`${BASE}/conversations/${id}`, { method: "DELETE" }).catch(() => {});
  const qdrant = new QdrantClient({ url: process.env.QDRANT_URL ?? "http://localhost:6333", checkCompatibility: false });
  if (COLLECTION.startsWith("tmp-summarise-")) await qdrant.deleteCollection(COLLECTION).catch((e) => console.error("cleanup failed", e));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log("cleaned up", COLLECTION);
  process.exit(0);
}
