// Single end-to-end smoke test against the running local-rag stack.
//
// Verifies, in order, that:
//   1. /health reports both ollama and qdrant reachable
//   2. POST /ingest accepts a sample file and returns { documentId, chunkCount > 0 }
//   3. The ingested chunks are searchable (Qdrant chunk count > 0 via extended /health)
//   4. POST /query for an answerable question returns an answer referencing the corpus
//   5. DELETE /documents/:id cleans up the ingested document (no DocumentStore drift)
//
// Each step asserts loudly with a CLEAR step-specific message at whichever point it
// breaks -- never a generic timeout or a Node stack trace. Fail fast, report next-step.
//
// Run: npx tsx scripts/smoke-test.ts
// Prereq: `docker compose up -d && docker exec -it local-rag-ollama ollama pull nomic-embed-text && ollama pull llama3`,
//         and `pnpm dev` running on localhost:3000.

const API = process.env.SMOKE_API ?? "http://localhost:3000";

function fail(step: string, msg: string): never {
  console.error(`\n✗ SMOKE TEST FAILED at step ${step}`);
  console.error(`  ${msg}`);
  console.error(`\n  Stack-debug hints:`);
  console.error(`    - docker compose ps         (both containers healthy?)`);
  console.error(`    - docker exec -it local-rag-ollama ollama list   (both models pulled?)`);
  console.error(`    - curl -s localhost:3000/health`);
  console.error(`    - pnpm dev running?`);
  process.exit(1);
}

function assert(cond: boolean, step: string, msg: string): void {
  if (!cond) fail(step, msg);
}

interface HealthResponse {
  ollama: boolean;
  qdrant: boolean;
  collection: string | null;
  chunkCount: number | null;
}

interface IngestResponse {
  documentId: string;
  chunkCount: number;
}

interface QueryResponse {
  answer: string;
  chunks: Array<{ text: string; source: string; page?: number; score: number }>;
  citations: Array<{ source: string; page?: number }>;
}

interface DeleteResponse {
  deleted: { id: string; source: string; ingestedAt: string; chunkCount: number };
}

interface ErrorResponse {
  error: string;
}

async function probeStack(): Promise<void> {
  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) {
      fail("preflight", `GET /health returned HTTP ${res.status}. Is pnpm dev running on ${API}?`);
    }
  } catch (e) {
    fail(
      "preflight",
      `Cannot reach API at ${API}/health: ${e instanceof Error ? e.message : String(e)}.\n` +
        `  Start the API with: pnpm dev`,
    );
  }
}

async function main(): Promise<void> {
  console.log("local-rag smoke test");
  console.log("===================");
  console.log(`API: ${API}\n`);

  await probeStack();

  // --- Step 1: /health green
  console.log("Step 1: GET /health ...");
  let health: HealthResponse;
  {
    const res = await fetch(`${API}/health`);
    const body = (await res.json()) as HealthResponse | ErrorResponse;
    if ("error" in body) fail("1", `/health returned error: ${body.error}`);
    health = body;
  }
  assert(
    health.ollama === true && health.qdrant === true,
    "1",
    `/health reports ollama=${health.ollama}, qdrant=${health.qdrant}.\n` +
      `  Bring up the stack: docker compose up -d\n` +
      `  Then pull models: docker exec -it local-rag-ollama ollama pull nomic-embed-text llama3`,
  );
  console.log(`  ✓ ollama=true qdrant=true (collection=${health.collection}, chunks=${health.chunkCount})`);

  // --- Step 2: ingest sample.txt
  console.log("\nStep 2: POST /ingest data/sample.txt ...");
  let ingest: IngestResponse;
  {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const samplePath = path.resolve(import.meta.dirname, "..", "data", "sample.txt");
    if (!fs.existsSync(samplePath)) {
      fail("2", `Sample fixture not found at ${samplePath}. The repo must ship with data/sample.txt.`);
    }
    const form = new FormData();
    const file = new Blob([fs.readFileSync(samplePath)], { type: "text/plain" });
    form.append("file", file, "sample.txt");
    form.append("strategy", "recursive");
    const res = await fetch(`${API}/ingest`, { method: "POST", body: form });
    const body = await res.json();
    if (res.status !== 200) {
      fail(
        "2",
        `POST /ingest returned HTTP ${res.status}: ${(body as ErrorResponse).error ?? JSON.stringify(body)}.\n` +
          `  If stage 'embed' failed with 'Failed to reach Ollama embed endpoint' ->\n` +
          `    docker exec -it local-rag-ollama ollama pull nomic-embed-text`,
      );
    }
    ingest = body as IngestResponse;
  }
  assert(
    typeof ingest.documentId === "string" && ingest.documentId.length > 0,
    "2",
    `POST /ingest returned 200 but no documentId: ${JSON.stringify(ingest)}`,
  );
  assert(
    ingest.chunkCount > 0,
    "2",
    `POST /ingest returned chunkCount=${ingest.chunkCount}; expected > 0. The chunker may be misconfigured or sample.txt empty.`,
  );
  console.log(`  ✓ ingested documentId=${ingest.documentId} chunkCount=${ingest.chunkCount}`);

  // --- Step 3: confirm chunks are searchable via extended /health
  console.log("\nStep 3: confirm chunks searchable via /health chunkCount ...");
  {
    const res = await fetch(`${API}/health`);
    const body = (await res.json()) as HealthResponse;
    assert(
      body.chunkCount !== null && body.chunkCount >= ingest.chunkCount,
      "3",
      `/health chunkCount=${body.chunkCount}; expected >= ${ingest.chunkCount}.\n` +
        `  This indicates Qdrant's wait:true upsert contract is broken -- chunks reported\n` +
        `  as ingested but not yet searchable. Check qdrant logs: docker compose logs qdrant`,
    );
    console.log(`  ✓ Qdrant confirms ${body.chunkCount} searchable chunks (collection=${body.collection})`);
  }

  // --- Step 4: query answerable from sample.txt
  console.log("\nStep 4: POST /query \"What does the sample say about a fox?\" ...");
  let query: QueryResponse;
  {
    const res = await fetch(`${API}/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "What does the sample say about a fox?" }),
    });
    const body = await res.json();
    if (res.status !== 200) {
      fail(
        "4",
        `POST /query returned HTTP ${res.status}: ${(body as ErrorResponse).error ?? JSON.stringify(body)}.\n` +
          `  If 'Failed to answer question: Failed to reach Ollama generate endpoint' ->\n` +
          `    docker exec -it local-rag-ollama ollama pull llama3`,
      );
    }
    query = body as QueryResponse;
  }
  assert(
    typeof query.answer === "string" && query.answer.length > 0,
    "4",
    `POST /query returned 200 but empty answer: ${JSON.stringify(query)}`,
  );
  assert(
    query.answer.toLowerCase().includes("fox"),
    "4",
    `Answer doesn't reference the corpus content.\n` +
      `  Expected: answer containing "fox" (sample.txt's central noun).\n` +
      `  Got: ${JSON.stringify(query.answer)}\n` +
      `  Suspect: retrieval missed the relevant chunk (check scoreThreshold), OR\n` +
      `           llama3 didn't ground on context (tighten RAG_SYSTEM_PROMPT in src/generation/llm.ts)`,
  );
  // Citations contract: answerable question grounded in sample.txt should produce a
  // citations array containing at least one entry whose source is "sample.txt".
  assert(
    Array.isArray(query.citations) && query.citations.length > 0,
    "4",
    `POST /query returned 200 but missing/empty citations array: ${JSON.stringify(query.citations)}.\n` +
      `  Expected: non-empty citations computed from chunks that cleared the threshold.\n` +
      `  Suspect: buildCitations in src/rag.ts regressed OR the response is dropping it.`,
  );
  assert(
    query.citations.some((c) => c.source.endsWith("sample.txt")),
    "4",
    `Citations array doesn't include sample.txt: ${JSON.stringify(query.citations)}.\n` +
      `  Expected: source ending in "sample.txt" (the only ingested document).`,
  );
  console.log(
    `  ✓ answer references "fox" (chunks: ${query.chunks.length}, citations: ${query.citations.length})`,
  );

  // --- Step 5: cleanup DELETE the ingested document
  console.log("\nStep 5: DELETE /documents/:id (cleanup) ...");
  {
    const res = await fetch(`${API}/documents/${ingest.documentId}`, { method: "DELETE" });
    const body = await res.json();
    if (res.status !== 200) {
      fail(
        "5",
        `DELETE /documents/${ingest.documentId} returned HTTP ${res.status}: ${(body as ErrorResponse).error ?? JSON.stringify(body)}.\n` +
          `  The just-ingested doc is now an ORPHAN -- the DocumentStore and Qdrant may be drifted.\n` +
          `  Check GET /documents for leftover records and call the DELETE again.`,
      );
    }
    const del = body as DeleteResponse;
    assert(
      del.deleted.id === ingest.documentId,
      "5",
      `DELETE returned 200 but deleted.id mismatch: expected ${ingest.documentId}, got ${del.deleted.id}`,
    );
    console.log(`  ✓ deleted document (id=${del.deleted.id}, chunkCount=${del.deleted.chunkCount})`);
  }

  console.log("\n✓ SMOKE TEST PASSED — all 5 steps green.\n");
  console.log("  The full stack is wired correctly end-to-end:");
  console.log("    infra up + models pulled → API health → ingest → query → sandwich-cleanup.");
}

main().catch((e) => {
  fail("unhandled", `Unexpected exception: ${e instanceof Error ? e.message : String(e)}`);
});