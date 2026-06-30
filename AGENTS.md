# AGENTS.md

Guidance for AI agents working on this repo.

## LangChain policy

- **`@langchain/community` is NOT used.** It was archived/sunsetted by the LangChain team on 2026-05-27 (see [issue #61](https://github.com/langchain-ai/langchainjs-community/issues/61)). Do not add it as a dependency.
- Use the scoped, actively maintained standalone packages only:
  - `@langchain/core` — `Document`, base abstractions, runnable types
  - `@langchain/textsplitters` — chunkers (direct successor to the deprecated community splitters)
  - `@langchain/ollama` — Ollama chat models / embeddings (when we reach the generation/retrieval steps)
  - `@langchain/qdrant` — Qdrant vector store (when we reach the retrieval step)
- Loaders are hand-rolled and return LangChain `Document<LoadedMetadata>` shapes so downstream components plug in cleanly. Sources of truth: `src/ingest/loader.ts`, `src/types.ts`.

## Commands

- `pnpm install` — install deps
- `pnpm dev` — start Express API with hot reload (tsx watch)
- `pnpm run typecheck` — `tsc --noEmit`
- `pnpm test` — Node's built-in test runner via tsx: `tests/loader.test.ts`
- `docker compose up -d` — start Qdrant (6333) + Ollama (11434)

## Conventions

- ESM (`"type": "module"`), `NodeNext` module resolution
- TypeScript strict mode
- Typed errors live in `src/errors.ts` (`UnsupportedFileTypeError`, `DocumentReadError`)
- Tests use `node:test` + `node:assert/strict` (no external runner dependency)
- Run `pnpm run typecheck` and `pnpm test` before declaring a component done

## Sample fixtures

- `data/sample.txt` — plain-text fixture
- `data/sample.pdf` — 2-page fixture, regenerable via `node scripts/gen-sample-pdf.mjs`