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
- Loaders are hand-rolled and return LangChain `Document<LoadedMetadata>` shapes so downstream components plug in cleanly. Sources of truth: `src/ingest/loader.ts`, `src/types.ts`.

## Generation

- `src/generation/llm.ts` exports `RAG_SYSTEM_PROMPT` (the universal baseline persona -- editable single source of truth for instruction wording) and `generate(prompt)` which calls Ollama's `/api/generate` with the local generation model (default `llama3`, env `OLLAMA_GEN_MODEL`), `system: RAG_SYSTEM_PROMPT`, `stream: false`. Throws `GenerationError` on any failure (network, non-2xx, malformed body, missing `response`, model error field).
- `src/generation/promptBuilder.ts` exports `buildPrompt(question, chunks)` and the situation-specific instruction constants `WITH_CONTEXT_INSTRUCTION` / `NO_CONTEXT_INSTRUCTION`. Empty chunks produce a distinct prompt variant that tells the model no relevant context was found and instructs it to say so -- it does NOT emit an empty "Context:" block. Non-empty chunks emit one passage per entry with light `[1] (source: file, page: N)` citation tags so the model can ground cited answers.
- `src/generation/llm.ts` also exports `generateStream(prompt): AsyncGenerator<string>` (stream:true) and `parseNdjsonStream(chunks): AsyncGenerator<GenerateResponse>` (exported for unit testing). The NJSON parser maintains a string buffer across reads, splits on `\n`, parses every complete line, and carries any trailing incomplete line over to be prepended to the next chunk -- a naive `JSON.parse(chunk)` implementation fails on objects split across chunks and on multiple objects concatenated in one chunk.
- `src/rag.ts` exports `retrieveForQuestion(question, opts): Promise<{ prompt, chunks }>` -- the shared orchestration helper so the API route's streaming and non-streaming branches don't duplicate retrieve+buildPrompt logic.

## API contract (`src/server.ts`)

- `GET /health` -> `{ ollama: boolean, qdrant: boolean, collection: string | null, chunkCount: number | null }` (probes `/api/tags` and `/readyz`; when Qdrant is reachable, additionally reports the configured collection name and live point count via `QdrantClient.count(..., { exact: true })`). `null` for unknown/unreachable; never `0` since `0` is a valid count distinct from "unknown".
- `POST /ingest` (multipart/form-data, field `file`, optional field `strategy` ∈ {fixed, semantic, recursive}; defaults `recursive`) -> `JSON { documentId, chunkCount }` on success. Uploads land in the OS temp dir and are auto-cleaned after ingest. `400` if no file attached; `413` if exceeds `MAX_INGEST_BYTES` (default 50MB, env-overridable); `502 { error: "Ingest failed at stage 'X': ..." }` on pipeline failure (names the stage so failures triage by root cause).
- `POST /query` body: `{ question: string, stream?: boolean, topK?: number, scoreThreshold?: number, collection?: string }`.
  - `stream` falsy (default): returns `JSON { answer, chunks: RetrievedChunk[] }`. `400` missing question; `503` infra failure.
  - `stream: true`: returns `text/plain; charset=utf-8` streamed token-by-token; retrieval+buildPrompt run EAGERLY so pre-stream infra failures return a normal `503` JSON envelope before any bytes are written. Once streaming begins the status is immutable -- a mid-stream generation error surfaces as a trailing `\n\n[generation error: msg]` footer.
- `GET /documents` -> `JSON { documents: DocumentRecord[] }` (sorted by `ingestedAt` desc). `500` on document-store read failure.
- `DELETE /documents/:id` -> `JSON { deleted: DocumentRecord }` on success. `404` if id not in store. **Sync guarantee**: deletes the document-store record first, then `deleteByDocumentId` from Qdrant; if the Qdrant delete fails the document-store record is RE-ADDED and the response is `502` with `"... record restored"`. The two stores never drift out of sync even on partial infra failure.
- All error paths return `JSON { error: string }` -- never Express's default HTML stack trace. 404 for unknown routes (`{ error: "route not found: METHOD /path" }`); 400 for malformed JSON body; 413 for oversized uploads; 500 catch-all for anything unhandled, server-side logged.

## curl recipes (manual smoke)

```bash
# 1. Health -- reports ollama/qdrant reachability + active collection name + chunk count
curl -s localhost:3000/health | jq

# 2. Ingest a file (chunking strategy defaults to recursive)
curl -s -X POST localhost:3000/ingest \
  -F "file=@data/sample.txt" \
  -F "strategy=recursive" | jq

# 3. Query (non-streaming) -- returns { answer, chunks }
curl -s -X POST localhost:3000/query \
  -H 'content-type: application/json' \
  -d '{"question":"What does the sample say about a fox?"}' | jq

# 4. Query (streaming) -- token-by-token text/plain sideways to terminal
curl -N -X POST localhost:3000/query \
  -H 'content-type: application/json' \
  -d '{"question":"What does the sample say about a fox?","stream":true}'

# 5. List ingested documents
curl -s localhost:3000/documents | jq

# 6. Delete a document (replace with a real documentId from /documents)
curl -s -X DELETE localhost:3000/documents/REPLACE-WITH-DOCUMENTID | jq
```

## Commands

- `pnpm install` — install deps
- `pnpm dev` — start Express API with hot reload (tsx watch)
- `pnpm run typecheck` — `tsc --noEmit`
- `pnpm test` — `vitest run` (one-shot). Live-stack tests in `tests/vectorStore.test.ts`, `tests/pipeline.test.ts`, `tests/retriever.test.ts`, `tests/rag.test.ts` skip cleanly when Qdrant / Ollama is not reachable via `test.skipIf`. Offline tests in `tests/loader.test.ts`, `tests/chunker.test.ts`, `tests/ndjson.test.ts` always run.
- `pnpm test:watch` — `vitest` (watch mode for dev iteration)
- `docker compose up -d` — start Qdrant (6333) + Ollama (11434)

## Standalone evaluation scripts

Retrieval quality (`scripts/evaluate-retrieval.ts`) — measures Recall@{1,3,5} and MRR against `data/eval-set.json` (20 entries). Starter-set generator: `scripts/gen-eval-set.ts` (uses `llama3` to author questions from each chunk). Run:
```bash
npx tsx scripts/evaluate-retrieval.ts                          # measures current run, writes data/eval-results-<ts>.json
npx tsx scripts/gen-eval-set.ts --doc data/eval-corpus.txt     # regenerate starter eval set via llama3
```
Low-score diagnosis: a wide Recall@1 → Recall@5 gap means ranking is mediocre but retrieval is happening (suspect embedding/prompt phrasing). Low Recall@5 means right chunk isn't in top-5 → start by re-tuning chunking strategy/size, NOT the embedding model (most retrieval failures are chunking failures in disguise).

Hallucination stress test (`scripts/test-hallucination.ts`) — directly tests "say so if context is insufficient" with 10 absent-topic questions (7 subtle + 3 obvious). Pre-flight refuses to run against an empty collection (which would test the wrong thing). Three-bucket classifier: PASS (admission pattern), FAIL (fabrication marker hits), AMBIGUOUS (flagged for manual judgment, never silently forced). On FAIL, prints suggested `RAG_SYSTEM_PROMPT` adjustments but **does not apply them** -- re-run with `--compare` after manual editing to see before/after:
```bash
npx tsx scripts/test-hallucination.ts                            # run
npx tsx scripts/test-hallucination.ts --compare data/halluc-results-<prev-ts>.json
```
Eval corpus: `data/eval-corpus.txt` (handwritten 15-section employee handbook — ingest with `curl -X POST localhost:3000/ingest -F "file=@data/eval-corpus.txt"` before running either script).

## Conventions

- ESM (`"type": "module"`), `NodeNext` module resolution
- TypeScript strict mode
- Typed errors live in `src/errors.ts` (`UnsupportedFileTypeError`, `DocumentReadError`, `EmbeddingError`, `CollectionError`, `GenerationError`)
- Tests use `vitest` 4.x (TS/ESM-native via Vite, no `tsx --import` loader needed); `test.skipIf` guards the live-stack tests so the suite stays green offline
- Run `pnpm run typecheck` and `pnpm test` before declaring a component done

## Sample fixtures

- `data/sample.txt` — plain-text fixture
- `data/sample.pdf` — 2-page fixture, regenerable via `node scripts/gen-sample-pdf.mjs`