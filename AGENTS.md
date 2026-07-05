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

## Commands

- `pnpm install` — install deps
- `pnpm dev` — start Express API with hot reload (tsx watch)
- `pnpm run typecheck` — `tsc --noEmit`
- `pnpm test` — Node's built-in test runner via tsx: `tests/loader.test.ts`, `tests/chunker.test.ts`, `tests/vectorStore.test.ts`, `tests/pipeline.test.ts`, `tests/retriever.test.ts` (the latter three skip cleanly when Qdrant / Ollama is not reachable)
- `docker compose up -d` — start Qdrant (6333) + Ollama (11434)

## Conventions

- ESM (`"type": "module"`), `NodeNext` module resolution
- TypeScript strict mode
- Typed errors live in `src/errors.ts` (`UnsupportedFileTypeError`, `DocumentReadError`, `EmbeddingError`, `CollectionError`, `GenerationError`)
- Tests use `node:test` + `node:assert/strict` (no external runner dependency)
- Run `pnpm run typecheck` and `pnpm test` before declaring a component done

## Sample fixtures

- `data/sample.txt` — plain-text fixture
- `data/sample.pdf` — 2-page fixture, regenerable via `node scripts/gen-sample-pdf.mjs`