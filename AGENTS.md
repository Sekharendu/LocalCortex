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

## Generation

- `src/generation/llm.ts` exports `RAG_SYSTEM_PROMPT` (the universal baseline persona -- editable single source of truth for instruction wording) and `generate(prompt)` which calls Ollama's `/api/generate` with the local generation model (default `llama3`, env `OLLAMA_GEN_MODEL`), `system: RAG_SYSTEM_PROMPT`, `stream: false`. Throws `GenerationError` on any failure (network, non-2xx, malformed body, missing `response`, model error field).
- `src/generation/promptBuilder.ts` exports `buildPrompt(question, chunks)` and the situation-specific instruction constants `WITH_CONTEXT_INSTRUCTION` / `NO_CONTEXT_INSTRUCTION`. Empty chunks produce a distinct prompt variant that tells the model no relevant context was found and instructs it to say so -- it does NOT emit an empty "Context:" block. Non-empty chunks emit one passage per entry with light `[1] (source: file, page: N)` citation tags so the model can ground cited answers.
- `src/generation/llm.ts` also exports `generateStream(prompt): AsyncGenerator<string>` (stream:true) and `parseNdjsonStream(chunks): AsyncGenerator<GenerateResponse>` (exported for unit testing). The NJSON parser maintains a string buffer across reads, splits on `\n`, parses every complete line, and carries any trailing incomplete line over to be prepended to the next chunk -- a naive `JSON.parse(chunk)` implementation fails on objects split across chunks and on multiple objects concatenated in one chunk.
- `src/rag.ts` exports `retrieveForQuestion(question, opts): Promise<{ prompt, chunks }>` (the shared prep helper), `answerQuestion(question, opts): Promise<{ answer, chunks, citations }>` (non-streaming orchestrator) and `answerQuestionStream(question, opts): Promise<{ tokens, citations }>` (streaming). `buildCitations(chunks)` dedupes the chunks that cleared threshold into the returned `{ source, page? }` digest -- only sources that actually went into the prompt context are surfaced.

## API contract (`src/server.ts`)

- `GET /health` -> `{ ollama: boolean, qdrant: boolean }` (probes `/api/tags` and `/readyz` — connection-only).
- `POST /ingest` (multipart/form-data, field `file`, optional field `strategy` ∈ {fixed, semantic, recursive}; defaults `recursive`) -> `JSON { documentId, chunkCount }` on success. Uploads land in the OS temp dir and are auto-cleaned after ingest. `400` if no file attached; `413` if exceeds `MAX_INGEST_BYTES` (default 50MB, env-overridable); `502 { error: "Ingest failed at stage 'X': ..." }` on pipeline failure (names the stage so failures triage by root cause).
- `POST /query` body: `{ question: string, stream?: boolean, topK?: number, scoreThreshold?: number, collection?: string }`.
  - `stream` falsy (default): returns `JSON { answer, chunks: RetrievedChunk[], citations: Citation[] }`. `citations` is the deduped `{ source, page? }` pairs from chunks that actually cleared the retrieval threshold and went into the prompt context -- never fabricated. `400` missing question; `503` infra failure.
  - `stream: true`: returns `text/plain; charset=utf-8` streamed token-by-token; citations are emitted as an `X-Citations` response header (JSON array) set before the stream starts so body-only clients keep working unchanged and citation-metadata clients read the side channel. retrieval+buildPrompt+citations setup run EAGERLY so pre-stream infra failures return a normal `503` JSON envelope before any bytes are written. Once streaming begins the status is immutable -- a mid-stream generation error surfaces as a trailing `\n\n[generation error: msg]` footer.
- `GET /documents` -> `JSON { documents: DocumentRecord[] }` (sorted by `ingestedAt` desc). `500` on document-store read failure.
- `DELETE /documents/:id` -> `JSON { deleted: DocumentRecord }` on success. `404` if id not in store. **Sync guarantee**: deletes the document-store record first, then `deleteByDocumentId` from Qdrant; if the Qdrant delete fails the document-store record is RE-ADDED and the response is `502` with `"... record restored"`. The two stores never drift out of sync even on partial infra failure.
- All error paths return `JSON { error: string }` -- never Express's default HTML stack trace. 404 for unknown routes (`{ error: "route not found: METHOD /path" }`); 400 for malformed JSON body; 413 for oversized uploads; 500 catch-all for anything unhandled, server-side logged.

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
```

## Commands

- `pnpm install` — install deps
- `pnpm dev` — start Express API with hot reload (tsx watch)
- `pnpm run typecheck` — `tsc --noEmit`
- `pnpm test` — `vitest run` (one-shot). Live-stack tests in `tests/vectorStore.test.ts`, `tests/pipeline.test.ts`, `tests/retriever.test.ts`, `tests/rag.test.ts` skip cleanly when Qdrant / Ollama is not reachable via `test.skipIf`. Offline tests in `tests/loader.test.ts`, `tests/chunker.test.ts`, `tests/ndjson.test.ts`, `tests/sparse.test.ts`, `tests/refusal.test.ts` always run. Refusal detection (`src/generation/refusal.ts`) is shared by `tests/rag.test.ts` and `scripts/test-hallucination.ts`; keep its patterns in sync with the refusal sentences in `RAG_SYSTEM_PROMPT` / `promptBuilder.ts`.
- `pnpm test:watch` — `vitest` (watch mode for dev iteration)
- `docker compose up -d` — start Qdrant (6333) + Ollama (11434)

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
- `tests/rag.test.ts` — `answerQuestion` answerable + absent-topic (single) + **absent-topic STRESS (3 cases)** end-to-end; the stress test is the multi-question vitest-side counterpart of `scripts/test-hallucination.ts` (kept short to stay under the vitest per-test timeout on CPU llama3)
- All four use `test.skipIf` to skip cleanly when Qdrant / Ollama is not reachable