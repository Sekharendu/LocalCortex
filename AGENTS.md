# AGENTS.md

Guidance for AI agents working on this repo.

## LangChain policy

- **`@langchain/community` is NOT used.** It was archived/sunsetted by the LangChain team on 2026-05-27 (see [issue #61](https://github.com/langchain-ai/langchainjs-community/issues/61)). Do not add it as a dependency.
- Use the scoped, actively maintained standalone packages only:
  - `@langchain/core` — `Document`, base abstractions, runnable types
  - `@langchain/textsplitters` — chunkers (direct successor to the deprecated community splitters)
  - `@langchain/ollama` — Ollama chat models / embeddings (when we reach the generation/retrieval steps)
- **Vector store:** wrapped over **`@qdrant/js-client-rest`** (official Qdrant SDK, not the
  LangChain `@langchain/qdrant` integration, which depends on the archived community
  package transitively). Source of truth: `src/retrieval/vectorStore.ts`.
- **Document store:** a leaf separate from the vector store, JSON-file backed on disk
  (`data/documents.json` by default, configurable via `DOC_STORE_PATH`). Source of truth:
  `src/documentStore.ts`. Tracks ingested document records (id, source, ingestedAt,
  chunkCount) so the upcoming DELETE route can hydrate the response.
- **Conversation store:** Postgres (compose service `postgres`, host port **5433** because 5432 is
  commonly taken by other local Postgres instances; env `DATABASE_URL`). Pool + `withTransaction`
  in `src/db.ts`; queries in `src/conversationStore.ts`. Schema lives in `migrations/*.sql`,
  applied in order by `pnpm db:migrate` (`scripts/migrate.ts`, tracked in `schema_migrations`).
  Add a new numbered file for schema changes; never edit an applied one.
- Loaders are hand-rolled and return LangChain `Document<LoadedMetadata>` shapes so downstream components plug in cleanly. Sources of truth: `src/ingest/loader.ts`, `src/types.ts`.

## Chunking

- `chunkFixedSize(text, { size, overlapPercent })` — naive character-based cut with configurable overlap. Uses `RecursiveCharacterTextSplitter` with word/char separators (no structural awareness). Zero embedding calls — cheap, fast, offline-safe.
- `chunkRecursive(text, { maxSize })` — structural separator cascade (heading → paragraph → line → sentence → word → char). Also zero embedding calls, always offline-safe. The recommended default for mixed corpora.
- `chunkSemantic(text, { similarityThreshold })` — embedding-based topic-boundary detection. Calls `embedBatch()` to embed every sentence, then splits where cosine similarity between consecutive sentences drops below `similarityThreshold` (default 0.75). **Requires Ollama to be reachable** — this is the only chunker strategy that makes network calls. Tests that exercise it use `test.skipIf(!ollamaUp)` to skip cleanly when the stack is down. Significantly more expensive than fixed/recursive; prefer `recursive` for general use.

## Retrieval (dense + hybrid)

- Every Qdrant point has two **named vectors**: `dense` (nomic-embed-text, Cosine) and `sparse` (BM25-style TF from `src/retrieval/sparse.ts`, with Qdrant's `idf` modifier applying IDF server-side). Collections created before this schema must be dropped and re-ingested.
- `retrieve()` (`src/retrieval/retriever.ts`) takes `mode: "dense" | "hybrid"` (default `dense`, env `RETRIEVE_MODE`; they tie on the eval sets once task prefixes are on). Hybrid calls `hybridSearch()` — one Qdrant query that prefetches dense + sparse and fuses them (`RETRIEVE_FUSION`: `rrf` weighted dense 2:1, or `dbsf`).
- **Safety invariant:** fused scores aren't cosine similarities, so hybrid mode first runs a `limit: 1` dense probe with the normal `scoreThreshold`; if nothing clears it, `retrieve()` returns `[]`. This preserves the "off-topic question → no context → refusal" behaviour. Don't remove it.
- Queries pass through `expandAcronyms()` (`src/retrieval/acronyms.ts`) before embedding/encoding — sparse retrieval can't match abbreviations that never appear in the corpus.
- Relevance threshold (`RETRIEVE_SCORE_THRESHOLD`, default 0.63) was chosen with `scripts/calibrate-threshold.ts` + `data/offtopic-set.json`: general-knowledge questions top out at 0.567, answerable ones start at 0.640. Company-sounding questions the corpus can't answer overlap answerable scores and rely on the prompt's "context is insufficient" rule (all 29 near-miss questions were refused at 0.63). Re-run the calibration after changing the embedding model, prefixes, or corpus.
- The embedder adds nomic-embed-text's `search_query: ` / `search_document: ` task prefixes (env `OLLAMA_EMBED_PREFIXES`, default on). Toggling it changes every vector, so collections must be re-ingested.
- Measured result (`data/eval-set.json` + `data/large-eval-set.json`, 113 questions): prefixes were the biggest gain; with prefixes, dense and hybrid tie overall (105/113 each).

## Conversation memory

- `buildPrompt(question, chunks, history?)` adds a "Conversation so far" block (last `HISTORY_MAX_MESSAGES` = 6, assistant replies trimmed to `HISTORY_MAX_ASSISTANT_CHARS` = 800) after the Context and before the Question. On the no-context path history is deliberately dropped, so an off-topic follow-up still gets the plain refusal prompt.
- `retrieveForQuestion` passes the latest earlier user message as `previousQuestion` to `retrieve()`, which embeds `previous + "\n" + current` for the search (no LLM rewrite call).
- **Two gates for follow-ups:** the combined query must clear `RETRIEVE_SCORE_THRESHOLD` (0.63) as usual, and the current question on its own must clear `RETRIEVE_FOLLOWUP_FLOOR` (0.57, just above the 0.567 general-knowledge max from calibration). Without the floor an off-topic follow-up borrows the previous question's relevance (capital of France: 0.479 alone, 0.682 combined). Don't remove it.
- Measured with `scripts/evaluate-followups.ts` over `data/followup-eval-set.json` (13 genuine + 6 off-topic follow-ups). Small corpus: alone 4/13 rank-1, combined 12/13 but 6/6 off-topic leaked, combined + floor 10/13 with 0 leaked. Large corpus (`rag-large`): combined + floor 12/13, 0 leaked. The two small-corpus misses are very vague follow-ups ("Can I carry over what I don't use?") that score below some off-topic questions on their own; fixing them needs an LLM query rewrite, which was judged not worth the latency.
- Only messages with `status = null` feed history; `interrupted` / `error` turns are stored and shown but never sent back to the model.

## Generation

- **Answer style:** answers start with the answer in full sentences, keep the conditions/limits from the context, and never mention the context, passages or file names (no "According to…", no "Source:" line). Measured with `scripts/check-answer-style.ts` (16 answers incl. follow-ups): style leaks 14 → 0, wrongly refused 3 → 0; hallucination test still 10/10. Re-run it after any prompt change.
- `src/generation/llm.ts` exports `RAG_SYSTEM_PROMPT` (the universal baseline persona -- editable single source of truth for instruction wording) and `generate(prompt)` which calls Ollama's `/api/generate` with the local generation model (default `llama3`, env `OLLAMA_GEN_MODEL`), `system: RAG_SYSTEM_PROMPT`, `stream: false`. Throws `GenerationError` on any failure (network, non-2xx, malformed body, missing `response`, model error field).
- `src/generation/promptBuilder.ts` exports `buildPrompt(question, chunks)` and the situation-specific instruction constants `WITH_CONTEXT_INSTRUCTION` / `NO_CONTEXT_INSTRUCTION`. Empty chunks produce a distinct prompt variant that tells the model no relevant context was found and instructs it to say so -- it does NOT emit an empty "Context:" block. Non-empty chunks emit the passages separated by `---`, with **no** `[n]` / `(source: …)` tags: with tags llama3 opened every answer with "According to [1] (source: …)" and appended its own, sometimes misspelled, "Source:" line. Sources reach users only from retrieval (`buildCitations`, shown by the UI as chips).
- `src/generation/llm.ts` also exports `generateStream(prompt, signal?): AsyncGenerator<string>` (stream:true; aborting `signal` drops the Ollama connection, which cancels generation) and `parseNdjsonStream(chunks): AsyncGenerator<GenerateResponse>` (exported for unit testing). The NJSON parser maintains a string buffer across reads, splits on `\n`, parses every complete line, and carries any trailing incomplete line over to be prepended to the next chunk -- a naive `JSON.parse(chunk)` implementation fails on objects split across chunks and on multiple objects concatenated in one chunk.
- `src/rag.ts` exports `retrieveForQuestion(question, opts): Promise<{ prompt, chunks }>` (the shared prep helper), `answerQuestion(question, opts): Promise<{ answer, chunks, citations }>` (non-streaming orchestrator) and `answerQuestionStream(question, opts): Promise<{ tokens, citations }>` (streaming). `buildCitations(chunks)` dedupes the chunks that cleared threshold into the returned `{ source, page? }` digest -- only sources that actually went into the prompt context are surfaced.

## API contract (`src/server.ts`)

- `GET /health` -> `{ ollama: boolean, qdrant: boolean, postgres: boolean }` (probes `/api/tags`, `/readyz` and `SELECT 1` — connection-only).
- `POST /ingest` (multipart/form-data, field `file`, optional field `strategy` ∈ {fixed, semantic, recursive}; defaults `recursive`) -> `JSON { documentId, chunkCount }` on success. Uploads land in the OS temp dir and are auto-cleaned after ingest. `400` if no file attached; `413` if exceeds `MAX_INGEST_BYTES` (default 50MB, env-overridable); `502 { error: "Ingest failed at stage 'X': ..." }` on pipeline failure (names the stage so failures triage by root cause).
- `POST /query` body: `{ question: string, stream?: boolean, topK?: number, scoreThreshold?: number, collection?: string }`.
  - `stream` falsy (default): returns `JSON { answer, chunks: RetrievedChunk[], citations: Citation[] }`. `citations` is the deduped `{ source, page? }` pairs from chunks that actually cleared the retrieval threshold and went into the prompt context -- never fabricated. `400` missing question; `503` infra failure.
  - `stream: true`: returns `text/plain; charset=utf-8` streamed token-by-token; citations are emitted as an `X-Citations` response header (JSON array) set before the stream starts so body-only clients keep working unchanged and citation-metadata clients read the side channel. retrieval+buildPrompt+citations setup run EAGERLY so pre-stream infra failures return a normal `503` JSON envelope before any bytes are written. Once streaming begins the status is immutable -- a mid-stream generation error surfaces as a trailing `\n\n[generation error: msg]` footer.
- `GET /documents` -> `JSON { documents: DocumentRecord[] }` (sorted by `ingestedAt` desc). `500` on document-store read failure.
- `DELETE /documents/:id` -> `JSON { deleted: DocumentRecord }` on success. `404` if id not in store. **Sync guarantee**: deletes the document-store record first, then `deleteByDocumentId` from Qdrant; if the Qdrant delete fails the document-store record is RE-ADDED and the response is `502` with `"... record restored"`. The two stores never drift out of sync even on partial infra failure.
- Conversations (Postgres; ids are UUIDs, a malformed id is a 404 not a 500):
  - `GET /conversations` -> `{ conversations: { id, title, createdAt, updatedAt }[] }`, most recently active first.
  - `POST /conversations { title? }` -> `201 { conversation }` (title defaults to `"New chat"`).
  - `GET /conversations/:id` -> `{ conversation }` including `messages: { id, role, content, citations, status, createdAt }[]` in order. `404` if unknown.
  - `PATCH /conversations/:id { title }` -> `{ conversation }`. `400` blank title, `404` unknown.
  - `DELETE /conversations/:id` -> `{ deleted: id }` (messages cascade). `404` unknown.
  - `POST /conversations/:id/messages { content }` -> streams exactly like `/query` with `stream: true` (text/plain, `X-Citations` header, eager setup so infra failures are a `503` JSON before any bytes). The user message is saved first; the assistant message is saved when the stream ends, with citations and `status` null / `"interrupted"` (client disconnected -> generation aborted, partial answer kept) / `"error"`. A chat still titled `"New chat"` is renamed from its first message (60 chars). `400` blank content, `404` unknown.
  - Postgres refusing connections -> `503 { error: "database unreachable ..." }` from the error middleware. Handlers are wrapped in `route()` so async rejections reach it (Express 4 doesn't forward them).
- All error paths return `JSON { error: string }` -- never Express's default HTML stack trace. 404 for unknown routes (`{ error: "route not found: METHOD /path" }`); 400 for malformed JSON body; 413 for oversized uploads; 500 catch-all for anything unhandled, server-side logged.

## Web UI (`web/`)

- A pnpm workspace package (`pnpm-workspace.yaml` lists `web`): React 19 + Vite + TypeScript, `react-markdown` + `remark-gfm`. No UI kit, no icon library (inline SVG), no web fonts (system stack, so it works fully offline). Hand-written CSS with custom properties in `web/src/styles.css`; dark only.
- The UI calls `/api/*`; Vite's dev proxy strips `/api` and forwards to `API_URL` (default `http://localhost:3000`). Same origin, so `X-Citations` is readable with no CORS on the server. Verified that streams pass through unbuffered and that a client abort still reaches the API (Ollama logs `cancel task`).
- Routing is two paths, `/` (new chat) and `/c/:id`, via the history API (`web/src/lib/route.ts`). A chat is only created when its first message is sent.
- `web/src/state/chat.tsx` owns the chat list, loaded conversations and **the one live stream**. The stream lives there, not in the view, so switching chats mid-answer doesn't cancel it; only one runs at a time (Ollama answers one request at a time), and other chats' composers say "Answering in another chat…". After a stream ends the conversation is refetched so ids/statuses match the server; after Stop the partial answer is added locally as `interrupted` instead of racing the server's save.
- Saved `error` messages with `citations === null` are pre-stream failures (content is the error text); with citations they're partial answers that failed mid-stream.
- Commands: `pnpm dev:web`, `pnpm build:web`, `pnpm typecheck:web`.

## curl recipes (manual smoke)

```bash
# 1. Health -- reports ollama/qdrant reachability
curl -s localhost:3000/health | jq

# 2. Ingest a file (chunking strategy defaults to recursive)
curl -s -X POST localhost:3000/ingest \
  -F "file=@data/sample.txt" \
  -F "strategy=recursive" | jq

# 3. Query (non-streaming) -- returns { answer, chunks }
curl -s -X POST localhost:3000/query \
  -H 'content-type: application/json' \
  -d '{"question":"What does the sample say about a fox?"}' | jq

# 4. Query (streaming) -- token-by-token text/plain sideways to terminal.
#    Citations arrive in the X-Citations response header (JSON array of
#    { source, page? } pairs from chunks that cleared threshold). Use -i to see it:
curl -i -N -X POST localhost:3000/query \
  -H 'content-type: application/json' \
  -d '{"question":"What does the sample say about a fox?","stream":true}'

# 5. List ingested documents
curl -s localhost:3000/documents | jq

# 6. Delete a document (replace with a real documentId from /documents)
curl -s -X DELETE localhost:3000/documents/REPLACE-WITH-DOCUMENTID | jq

# 7. Conversation: create, ask, follow up, reload
CID=$(curl -s -X POST localhost:3000/conversations -H 'content-type: application/json' -d '{}' | jq -r .conversation.id)
curl -N -X POST localhost:3000/conversations/$CID/messages -H 'content-type: application/json' -d '{"content":"How many vacation days do I get per year?"}'
curl -N -X POST localhost:3000/conversations/$CID/messages -H 'content-type: application/json' -d '{"content":"And after five years?"}'
curl -s localhost:3000/conversations/$CID | jq
```

## Commands

- `pnpm install` — install deps
- `pnpm dev` — start Express API with hot reload (tsx watch)
- `pnpm run typecheck` — `tsc --noEmit`
- `pnpm test` — `vitest run` (one-shot). Live-stack tests in `tests/vectorStore.test.ts`, `tests/pipeline.test.ts`, `tests/retriever.test.ts`, `tests/rag.test.ts` skip cleanly when Qdrant / Ollama is not reachable via `test.skipIf`; `tests/conversationStore.test.ts` skips when Postgres is not. Offline tests in `tests/loader.test.ts`, `tests/chunker.test.ts`, `tests/ndjson.test.ts`, `tests/sparse.test.ts`, `tests/refusal.test.ts`, `tests/promptBuilder.test.ts` always run. Refusal detection (`src/generation/refusal.ts`) is shared by `tests/rag.test.ts` and `scripts/test-hallucination.ts`; keep its patterns in sync with the refusal sentences in `RAG_SYSTEM_PROMPT` / `promptBuilder.ts`.
- `pnpm test:watch` — `vitest` (watch mode for dev iteration)
- `docker compose up -d` — start Qdrant (6333) + Ollama (11434) + Postgres (5433)
- `pnpm db:migrate` — apply pending `migrations/*.sql` (idempotent)
- `pnpm dev:web` / `pnpm build:web` / `pnpm typecheck:web` — the chat UI in `web/` (dev server on :5173, needs `pnpm dev` running)

## Standalone evaluation scripts

Retrieval quality (`scripts/evaluate-retrieval.ts`) — measures Recall@{1,3,5}, MRR, avg rank/score of the correct hit, overall and per question `category`, against `data/eval-set.json` (58 hand-curated entries). Flags: `--mode dense|hybrid`, `--collection`, `--eval-set`; the output JSON records mode, fusion and prefix settings. Starter-set generator: `scripts/gen-eval-set.ts` (uses `llama3` to author questions from each chunk). Run:
```bash
npx tsx scripts/evaluate-retrieval.ts --mode dense             # writes data/eval-results-<ts>.json
npx tsx scripts/gen-eval-set.ts --doc data/eval-corpus.txt     # regenerate starter eval set via llama3
```

Larger multi-document benchmark: `data/large-corpus/` (4 LLM-generated policy documents, ~208 chunks) with `data/large-eval-set.json` (55 entries). Built by `scripts/gen-corpus.ts` (resumable) and `scripts/gen-large-eval-set.ts`; ingest into its own collection with `scripts/ingest-large-corpus.ts` (`--file` ingests a single file), then:
```bash
npx tsx scripts/ingest-large-corpus.ts --collection rag-large
npx tsx scripts/evaluate-retrieval.ts --collection rag-large --eval-set data/large-eval-set.json --mode dense
```
Low-score diagnosis: a wide Recall@1 → Recall@5 gap means ranking is mediocre but retrieval is happening (suspect embedding/prompt phrasing). Low Recall@5 means right chunk isn't in top-5 → start by re-tuning chunking strategy/size, NOT the embedding model (most retrieval failures are chunking failures in disguise).

Hallucination stress test (`scripts/test-hallucination.ts`) — directly tests "say so if context is insufficient" with 10 absent-topic questions (7 subtle + 3 obvious). Pre-flight refuses to run against an empty collection (which would test the wrong thing). Three-bucket classifier: PASS (admission pattern), FAIL (fabrication marker hits), AMBIGUOUS (flagged for manual judgment, never silently forced). On FAIL, prints suggested `RAG_SYSTEM_PROMPT` adjustments but **does not apply them** -- re-run with `--compare` after manual editing to see before/after:
```bash
npx tsx scripts/test-hallucination.ts                            # run
npx tsx scripts/test-hallucination.ts --compare data/halluc-results-<prev-ts>.json
```
Eval corpus: `data/eval-corpus.txt` (handwritten 20-section employee handbook, including 5 near-duplicate distractor sections — ingest with `curl -X POST localhost:3000/ingest -F "file=@data/eval-corpus.txt"` before running either script).

Answer style (`scripts/check-answer-style.ts`) — asks 10 answerable questions (2 per category) + 3 two-turn follow-ups through `answerQuestion` and flags style leaks ("According to"/"Based on" openers, `[n]` tags, "Source:" lines, file names, talk about "the provided context" outside refusals) and wrongly refused answers; prints each answer's start for a human read and writes `data/answer-style-<ts>.json`.
```bash
npx tsx scripts/check-answer-style.ts
```

**Long runs on this laptop:** if Windows sleeps mid-run, Docker's clock pauses but Node's timers don't, so on wake the generation timeout fires on a request Ollama only saw for ~20s (`AbortError`, Ollama logs a 500 + `cancel task`). Keep the PC awake for evaluation runs.

End-to-end API smoke (`scripts/smoke-test.ts`) — exercises every route against a running `pnpm dev` server: `/health` green → `/ingest data/sample.txt` → `/query` for an answerable question asserts the answer references "fox" → `DELETE /documents/:id` cleanup asserts no DocumentStore↔Qdrant drift. Each step fails loudly with a step-specific message (never a generic timeout) and a hint about which component to check.
```bash
npx tsx scripts/smoke-test.ts
# Prereq: docker compose up -d + models pulled + pnpm dev running on localhost:3000
```

## Conventions

- ESM (`"type": "module"`), `NodeNext` module resolution
- TypeScript strict mode
- Typed errors live in `src/errors.ts` (`UnsupportedFileTypeError`, `DocumentReadError`, `EmbeddingError`, `CollectionError`, `GenerationError`)
- Tests use `vitest` 4.x (TS/ESM-native via Vite, no `tsx --import` loader needed); `test.skipIf` guards the live-stack tests so the suite stays green offline
- Run `pnpm run typecheck` and `pnpm test` before declaring a component done

## Sample fixtures

- `data/sample.txt` — plain-text fixture
- `data/sample.pdf` — 2-page fixture, regenerable via `node scripts/gen-sample-pdf.mjs`
- `data/eval-corpus.txt` — 15-section handwritten employee handbook; corpus for both `evaluate-retrieval.ts` and `test-hallucination.ts`
- `data/eval-set.json` — 20 labeled (question, expectedSubstrings) entries; regenerable starter set via `scripts/gen-eval-set.ts`

## Live-stack test files

- `tests/vectorStore.test.ts` — Qdrant round-trip (upsert/search/delete/dimension gate)
- `tests/pipeline.test.ts` — `ingestDocument` end-to-end against the real stack + a missing-file local test
- `tests/retriever.test.ts` — `retrieve()` clear-match / absent-at-default-threshold / topK-count tests
- `tests/rag.test.ts` — `answerQuestion` answerable + absent-topic (single) + **absent-topic STRESS (3 cases)** + follow-ups with history (vague follow-up answered, off-topic follow-up refused) end-to-end; the stress test is the multi-question vitest-side counterpart of `scripts/test-hallucination.ts` (kept short to stay under the vitest per-test timeout on CPU llama3)
- `tests/conversationStore.test.ts` — Postgres store round-trip (ordering, citations/status, list order, rename, cascade delete, malformed ids); creates and deletes its own conversations
- All use `test.skipIf` to skip cleanly when their dependency (Qdrant / Ollama / Postgres) is not reachable