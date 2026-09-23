# local-rag

A fully local Retrieval-Augmented Generation (RAG) pipeline: **Ollama** runs the embedding and LLM models on your machine, **Qdrant** stores and searches the vector index, **Postgres** keeps chat conversations, and a small Express API wires ingest → retrieve → generate together. Everything runs locally — no external API calls, no third-party keys, no data leaving your machine.

## Prerequisites

- **Docker** with Docker Compose v2 — for running the Qdrant, Ollama and Postgres containers
- **Node.js 26+** and **pnpm** — for the TypeScript API server
- **curl** + **jq** — for exercising the API manually (smoke step)

## First-time setup (clone → run, no guesswork)

```bash
git clone <your-repo-url> local-rag
cd local-rag

# Verify the required Node.js version
node --version       # must be v26 or newer
# If you use nvm, select the project version:
nvm use

# 1. Start the infrastructure containers (Qdrant + Ollama + Postgres)
docker compose up -d

# 2. Wait for the containers to be "healthy" before pulling models
docker compose ps
#   qdrant, ollama and postgres should show "(healthy)" in the STATUS column within ~30s.
#   Postgres is published on 127.0.0.1:5433 (not 5432) so it can't collide with
#   another local Postgres.

# 3. Pull the two models the pipeline depends on.
#    NOTE: Ollama models are NOT baked into the base image -- this is a one-time pull
#    persisted to the ollama_data volume so you don't repeat it on subsequent runs.
docker exec -it local-rag-ollama ollama pull nomic-embed-text   # embeddings (768-dim)
docker exec -it local-rag-ollama ollama pull llama3             # generation

# 4. Install Node dependencies
pnpm install

# 5. Create the conversation tables (safe to re-run: applied migrations are skipped)
pnpm db:migrate

# 6. Start the API (hot reload via tsx watch)
pnpm dev
# The API listens on http://localhost:3000
```

You can now open another terminal and run any of the curl examples below.

## Run the API

```bash
pnpm dev        # hot-reload dev server (tsx watch) -- recommended for development
# OR for a production-style run:
pnpm build && pnpm start   # compiles to dist/ and runs node directly
```

The API listens on `http://localhost:3000` (override with the `PORT` env var).

This project requires Node.js 26 or newer. The Qdrant REST client is kept on a
Node 26-compatible release; using an older client with Node 26 can fail with
`UND_ERR_INVALID_ARG: invalid onError method` during ingestion.

## Run the web UI

A ChatGPT-style chat app lives in `web/` (React + Vite). It talks to the API through Vite's dev proxy, so run both:

```bash
pnpm dev         # terminal 1: the API on :3000
pnpm dev:web     # terminal 2: the UI on http://localhost:5173
```

Chats are listed in the sidebar (grouped Today / Previous 7 days / Older) and each has its own URL (`/c/<id>`). Answers stream in with their sources shown as chips underneath, and **Stop** cancels generation. `pnpm build:web` produces a static build in `web/dist`; `pnpm typecheck:web` type-checks it.

## API surface

Every route returns JSON `{ error: string }` on failure — never Express's default HTML stack trace.

| Method | Path | Body | Response | Statuses |
|---|---|---|---|---|
| `GET` | `/health` | — | `{ ollama, qdrant, postgres }` | `200` |
| `POST` | `/ingest` | `multipart/form-data`: `file` (required), `strategy` ∈ {fixed, semantic, recursive} (default `recursive`) | `{ documentId, chunkCount }` | `200`, `400` (no file), `413` (too large), `502` (pipeline failed, names the stage) |
| `POST` | `/query` | `{ question: string, stream?: boolean, topK?: number, scoreThreshold?: number, collection?: string }` | non-stream: `{ answer, chunks, citations }`; stream: `text/plain; charset=utf-8` token-by-token + `X-Citations` response header (JSON array) | `200`, `400` (missing question), `503` (infra failure) |
| `GET` | `/documents` | — | `{ documents: DocumentRecord[] }` (newest first) | `200`, `500` (store read failure) |
| `DELETE` | `/documents/:id` | — | `{ deleted: DocumentRecord }` | `200`, `404` (id not in store), `502` (Qdrant delete failed — store record restored to keep drift-free) |
| `GET` | `/conversations` | — | `{ conversations: ConversationSummary[] }` (most recently active first) | `200`, `503` (Postgres down) |
| `POST` | `/conversations` | `{ title?: string }` | `{ conversation }` | `201` |
| `GET` | `/conversations/:id` | — | `{ conversation }` with `messages` in order | `200`, `404` |
| `PATCH` | `/conversations/:id` | `{ title: string }` | `{ conversation }` | `200`, `400` (blank title), `404` |
| `DELETE` | `/conversations/:id` | — | `{ deleted: id }` (messages go with it) | `200`, `404` |
| `POST` | `/conversations/:id/messages` | `{ content: string }` | streamed like `/query` with `stream: true` (`text/plain` + `X-Citations`); both turns are saved | `200`, `400` (blank content), `404`, `503` (infra failure before streaming) |

**Conversation memory.** A message sent to a conversation is answered with the earlier turns in mind, so follow-ups like "And after five years?" work:
- The prompt carries the last 6 messages (assistant replies trimmed to 800 characters), placed after the retrieved context. When nothing relevant is retrieved, the history is left out and the model refuses as usual.
- Retrieval embeds the previous question together with the new one, so a vague follow-up finds the right chunk.
- A follow-up gets context only if the combined query clears `RETRIEVE_SCORE_THRESHOLD` (0.63) **and** the new question on its own clears `RETRIEVE_FOLLOWUP_FLOOR` (0.57). The second check stops an off-topic follow-up ("What is the capital of France?") from borrowing the previous question's relevance. Measured with `scripts/evaluate-followups.ts`.
- New chats are titled from their first message. If the client disconnects mid-answer, generation is cancelled and the partial answer is saved with `status: "interrupted"`.

## curl examples (manual smoke of every route)

```bash
# 1. Health -- reports ollama/qdrant reachability
curl -s localhost:3000/health | jq

# 2. Ingest a file (chunking strategy defaults to recursive)
curl -s -X POST localhost:3000/ingest \
  -F "file=@data/sample.txt" \
  -F "strategy=recursive" | jq

# 3. Query (non-streaming) -- returns { answer, chunks, citations }
curl -s -X POST localhost:3000/query \
  -H 'content-type: application/json' \
  -d '{"question":"What does the sample say about a fox?"}' | jq

# 4. Query (streaming) -- token-by-token text/plain sideways to terminal.
#    Citations for the streamed answer arrive in the X-Citations response header
#    (JSON array of { source, page? } pairs -- only chunks that cleared the
#    retrieval threshold and went into the prompt context). Use curl -i to see it:
curl -i -N -X POST localhost:3000/query \
  -H 'content-type: application/json' \
  -d '{"question":"What does the sample say about a fox?","stream":true}'

# 5. List ingested documents
curl -s localhost:3000/documents | jq

# 6. Delete a document (replace with a real documentId from /documents)
curl -s -X DELETE localhost:3000/documents/REPLACE-WITH-DOCUMENTID | jq

# 7. Conversations: create a chat, ask, then ask a follow-up in the same chat
CID=$(curl -s -X POST localhost:3000/conversations -H 'content-type: application/json' -d '{}' | jq -r .conversation.id)
curl -N -X POST localhost:3000/conversations/$CID/messages \
  -H 'content-type: application/json' -d '{"content":"How many vacation days do I get per year?"}'
curl -N -X POST localhost:3000/conversations/$CID/messages \
  -H 'content-type: application/json' -d '{"content":"And after five years?"}'
curl -s localhost:3000/conversations/$CID | jq   # both turns, with citations
```

## Run the test suite

```bash
pnpm test         # vitest run, one-shot, CI-friendly
pnpm test:watch   # vitest watch mode for dev iteration
```

Tests live in `tests/`. Node-dependent unit tests (`loader`, `chunker`, `ndjson`) always run. Live-stack integration tests (`vectorStore`, `pipeline`, `retriever`, `rag`) auto-skip cleanly via `test.skipIf` when the Ollama / Qdrant stack isn't reachable (`conversationStore` skips when Postgres isn't) — so `pnpm test` stays green offline and exercises the full pipeline when the stack is up. The detailed list of which test file exercises what lives in `AGENTS.md`.

## Run the retrieval evaluation

The retrieval evaluator measures **Recall@{1,3,5}** and **Mean Reciprocal Rank (MRR)** against `data/eval-set.json` (58 categorized entries authored from `data/eval-corpus.txt`). It runs at threshold 0, so it measures ranking only; `scripts/calibrate-threshold.ts` measures where the production `RETRIEVE_SCORE_THRESHOLD` should sit (answerable vs off-topic scores from `data/offtopic-set.json`).

```bash
# 1. Ingest the eval corpus first (one time)
curl -s -X POST localhost:3000/ingest -F "file=@data/eval-corpus.txt" | jq

# 2. Measure retrieval quality
npx tsx scripts/evaluate-retrieval.ts
# Writes data/eval-results-<timestamp>.json with full per-question breakdown
# (which chunks were returned, at what score, whether it was a hit)

# 3. (Optional) Regenerate the starter eval-set with llama3 authoring questions
npx tsx scripts/gen-eval-set.ts --doc data/eval-corpus.txt
```

**Reading the scores** (general guidance, not hard thresholds):
- **MRR**: 1.0 = perfect (right chunk always ranked #1). ≥ 0.7 is good; 0.3–0.6 = ranking often right but not first; < 0.3 = retriever frequently missing or burying the right chunk.
- **Recall@K**: a wide gap between Recall@1 and Recall@5 (e.g. 0.3 → 0.9) means the right chunk is *in the index* but not ranked first — usually prompt or embedding model quality. A low Recall@5 means the right chunk isn't even in top-5.

**What to suspect first when scores are low**: the **chunking strategy and size**, not the embedding model. Most retrieval failures are chunking failures in disguise (a key sentence split across chunks, a chunk that mixes two topics, chunk size too small to carry enough context). The embedding model swap is the expensive knob — tune chunking first.

## Run the hallucination stress test

Tests whether the system honors "say so if context is insufficient" rather than assuming it does. 10 absent-topic questions (7 subtle topics an employee handbook *might* cover but doesn't, plus 3 obviously unrelated ones) are run through `answerQuestion`, classified into PASS / FAIL / AMBIGUOUS, and printed with a per-question results table.

```bash
# Pre-flight: ingest the eval corpus (reuses the same handbook as the retrieval evaluator)
curl -s -X POST localhost:3000/ingest -F "file=@data/eval-corpus.txt" | jq

# Baseline run
npx tsx scripts/test-hallucination.ts
# Writes data/halluc-results-<timestamp>.json

# After reviewing suggested RAG_SYSTEM_PROMPT adjustments and editing src/generation/llm.ts:19:
npx tsx scripts/test-hallucination.ts --compare data/halluc-results-<previous-timestamp>.json
# Prints a before/after diff table per question + the FAIL count delta
```

Three-bucket classifier:
- **PASS**: matches an admission phrasing (e.g. "no relevant context", "insufficient", "couldn't find"), no fabrication marker.
- **FAIL**: contains a fabrication marker (e.g. `"paris"` in an answer to a France question without an admission).
- **AMBIGUOUS**: neither matched — flagged for manual judgment, never silently forced into PASS or FAIL.

**The script does NOT auto-edit `RAG_SYSTEM_PROMPT`.** When FAILs appear, it prints context-chosen suggested adjustments (a partial-context-refusal rule if noise got retrieved; a no-hedging rule if hedging appeared). Apply the ones you agree with to `src/generation/llm.ts:19`, then re-run with `--compare` to see the before/after result. The prompt stays under your control.

## Run the end-to-end smoke test

The smoke test exercises the deployed API through every route end-to-end, with each step asserting loudly with a step-specific failure message (never a generic timeout).

```bash
# Prereq: stack up + models pulled + pnpm dev running on localhost:3000
npx tsx scripts/smoke-test.ts
```

Steps it verifies:
1. `GET /health` reports `ollama=true` and `qdrant=true`.
2. `POST /ingest` with `data/sample.txt` returns `{ documentId, chunkCount > 0 }`.
3. `POST /query` for an answerable question returns an answer referencing `"fox"` (sample.txt's central noun).
4. `DELETE /documents/:id` cleans up the just-ingested document — surfaces any DocumentStore↔Qdrant drift loudly.

If any step fails, the script prints a step-specific message with hints about which underlying component to check — *infra up? models pulled? pnpm dev running? RAG_SYSTEM_PROMPT wording?* — instead of a stack trace.

## Environment variables

All optional — sensible defaults work for the standard `docker compose up -d` setup. Set these to deviate from defaults.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API listen port |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama base URL |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant base URL |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Ollama model name for embeddings |
| `OLLAMA_EMBED_DIM` | `768` | Expected embedding dimension (cross-layer integrity gate — embedder ↔ vectorStore ↔ Qdrant collection must all agree) |
| `OLLAMA_GEN_MODEL` | `llama3` | Ollama model name for generation |
| `OLLAMA_GEN_TIMEOUT_MS` | `180000` | Generation request timeout (ms) — generous because CPU-based llama3 is slow |
| `QDRANT_COLLECTION` | `rag` | Default collection name used by ingest and retrieval |
| `RETRIEVE_TOP_K` | `5` | Default topK used by `retrieve()` |
| `RETRIEVE_SCORE_THRESHOLD` | `0.63` | Minimum cosine score for a question to get any context (in hybrid mode it gates results via a cheap dense probe, since fused scores aren't cosine similarities). Chosen with `scripts/calibrate-threshold.ts`; re-run it after changing the embedding model, prefixes or corpus |
| `RETRIEVE_MODE` | `dense` | `dense` or `hybrid` (dense + BM25 sparse, fused in Qdrant). They tie on the eval sets once task prefixes are on, so dense is the simpler default |
| `RETRIEVE_FUSION` | `rrf` | Hybrid fusion method: `rrf` (rank-based, dense weighted 2:1) or `dbsf` (score-based) |
| `OLLAMA_EMBED_PREFIXES` | on | Prepends nomic-embed-text's `search_query: ` / `search_document: ` task prefixes. Set `0` to disable |
| `SPARSE_STATS_PATH` | `./data/sparse-stats.json` | Corpus average chunk length used by the BM25 sparse encoder |
| `MAX_INGEST_BYTES` | `52428800` (50 MB) | Hard upload size cap on `POST /ingest` |
| `DOC_STORE_PATH` | `./data/documents.json` | Where the document-store JSON file lives |
| `DATABASE_URL` | `postgres://localcortex:localcortex@localhost:5433/localcortex` | Postgres holding conversations and messages (matches the compose service) |
| `RETRIEVE_FOLLOWUP_FLOOR` | `0.57` | Minimum score the new question must reach on its own for a follow-up to get context (just above the highest general-knowledge score in calibration, 0.567). `0` disables the check |

**Swapping the embedding model**: this is the one override that needs *two* env vars together — `OLLAMA_EMBED_MODEL=...` AND `OLLAMA_EMBED_DIM=...`. The dim mismatch guard will throw `EmbeddingError` with an actionable message if they disagree.

**Re-ingest after changing embeddings**: changing `OLLAMA_EMBED_MODEL` or `OLLAMA_EMBED_PREFIXES` changes every vector, so existing collections must be dropped and re-ingested (`curl -X DELETE localhost:6333/collections/rag`, then `POST /ingest` again). Collections created before hybrid search (single unnamed vector) also need re-ingesting.

## Project layout

```
local-rag/
├── src/
│   ├── ingest/
│   │   ├── loader.ts        # raw file → clean text (pdfjs-dist / mammoth / UTF-8)
│   │   ├── chunker.ts       # chunkFixedSize / chunkSemantic / chunkRecursive + dispatcher
│   │   └── pipeline.ts      # ingestDocument: load → chunk → embed → upsert → persist
│   ├── retrieval/
│   │   ├── embedder.ts      # Ollama /api/embed wrapper, bounded-concurrency batch
│   │   ├── vectorStore.ts   # @qdrant/js-client-rest: ensure/upsert/search/delete
│   │   └── retriever.ts     # retrieve(question) = embed + searchSimilar + defensive sort
│   ├── generation/
│   │   ├── promptBuilder.ts # buildPrompt(question, chunks, history?) -- with-context vs no-context variants, no citation tags
│   │   └── llm.ts           # RAG_SYSTEM_PROMPT + generate() + generateStream() + parseNdjsonStream()
│   ├── rag.ts               # answerQuestion / answerQuestionStream -- the one orchestrator
│   ├── server.ts            # Express API: /health, /ingest, /query, /documents, /conversations
│   ├── documentStore.ts     # JSON-file document records (Document Store leaf, separate from Qdrant)
│   ├── db.ts                # Postgres pool + withTransaction
│   ├── conversationStore.ts # conversations + messages in Postgres
│   ├── config.ts            # centralized tunable defaults (retrievalConfig)
│   ├── types.ts             # LoadedMetadata, Chunk, ChunkPayload, LoadedDocument
│   └── errors.ts            # UnsupportedFileTypeError, DocumentReadError, EmbeddingError, CollectionError, GenerationError
├── scripts/
│   ├── gen-sample-pdf.mjs   # regenerates data/sample.pdf
│   ├── probe-embedder.ts    # manual harness: embeds one string, prints first 5 dims + length
│   ├── probe-rag.ts         # manual harness: ingests sample.txt, asks answerable + absent questions, prints both
│   ├── evaluate-retrieval.ts# Recall@{1,3,5} + MRR evaluator against data/eval-set.json
│   ├── gen-eval-set.ts      # regenerates data/eval-set.json from a corpus using llama3
│   ├── test-hallucination.ts# 10 absent-topic PASS/FAIL/AMBIGUOUS stress test
│   ├── check-answer-style.ts# answers start with the answer: no "According to [1]…", no Source: lines
│   ├── evaluate-followups.ts# follow-up retrieval: alone vs combined vs combined + floor
│   ├── migrate.ts           # applies migrations/*.sql (pnpm db:migrate)
│   └── smoke-test.ts        # end-to-end API smoke (health → ingest → query → cleanup)
├── migrations/
│   └── 001_conversations.sql# conversations + messages tables
├── data/
│   ├── sample.txt           # plain-text fixture
│   ├── sample.pdf           # 2-page PDF fixture (regenerable via scripts/gen-sample-pdf.mjs)
│   ├── eval-corpus.txt      # 15-section handwritten employee handbook (eval + halluc corpus)
│   ├── eval-set.json        # 20 labeled (question, expectedSubstrings) entries
│   ├── followup-eval-set.json # 13 genuine + 6 off-topic two-turn follow-ups
│   ├── documents.json       # DocumentStore JSON — runtime artifact (gitignored)
│   ├── eval-results-*.json  # retrieval evaluator output (gitignored)
│   └── halluc-results-*.json# halluc stress output (gitignored)
├── tests/
│   ├── loader.test.ts       # loader unit tests (offline, always run)
│   ├── chunker.test.ts      # chunker unit tests (offline, always run)
│   ├── ndjson.test.ts       # NJSON parser buffered-handling tests (offline, always run)
│   ├── promptBuilder.test.ts# history block + trimming (offline, always run)
│   ├── conversationStore.test.ts # Postgres store round-trip (skipIf Postgres down)
│   ├── vectorStore.test.ts  # Qdrant round-trip tests (live-stack, skipIf-guarded)
│   ├── pipeline.test.ts    # ingestDocument end-to-end (live-stack, skipIf-guarded)
│   ├── retriever.test.ts    # retrieve() ranking/threshold/topK (live-stack, skipIf-guarded)
│   └── rag.test.ts          # answerQuestion end-to-end + absent-topic stress (live-stack, skipIf-guarded)
├── web/                     # chat UI (React + Vite), proxies /api/* to the API
│   └── src/
│       ├── api.ts           # typed client, incl. streaming sendMessage
│       ├── state/chat.tsx   # chats, loaded conversations, the one live stream
│       ├── components/      # Sidebar, ChatView, Message, Composer, Modal, Icons
│       └── styles.css       # the whole look, hand-written
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── docker-compose.yml
└── README.md
```

For deeper architectural notes (LangChain policy, error philosophy, API contract design decisions, evaluation interpretation), read `AGENTS.md` after this README — it documents the why behind the what.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `curl localhost:3000/health` returns "connection refused" | `pnpm dev` not running | `pnpm dev` in a separate terminal |
| `/health` reports `ollama: false` | Ollama container down or not yet healthy | `docker compose ps`; `docker compose up -d ollama` |
| `/health` reports `qdrant: false` | Qdrant container down or not yet healthy | `docker compose ps`; `docker compose up -d qdrant` |
| `/health` reports `postgres: false`, or `/conversations` returns `503 database unreachable` | Postgres container down | `docker compose up -d postgres` |
| `/conversations` returns `500 relation "conversations" does not exist` | Migrations not applied | `pnpm db:migrate` |
| `POST /ingest` returns `502 Ingest failed at stage 'embed': Failed to reach Ollama embed endpoint` | `nomic-embed-text` not pulled into the Ollama container | `docker exec -it local-rag-ollama ollama pull nomic-embed-text` |
| `POST /query` returns `503 Failed to answer question: Failed to reach Ollama generate endpoint` | `llama3` not pulled into the Ollama container | `docker exec -it local-rag-ollama ollama pull llama3` |
| `Embedding dimension mismatch: expected 768, got N` | `OLLAMA_EMBED_MODEL` swapped to a different-dim model without updating `OLLAMA_EMBED_DIM` | Set BOTH `OLLAMA_EMBED_MODEL=...` and `OLLAMA_EMBED_DIM=...` |
| Smoke test step 5 fails ("DocumentStore and Qdrant may be drifted") | A previous DELETE failed between the two stores | `curl localhost:3000/documents`, manually re-DELETE any orphaned records |
| `docker compose down -v` wiped the models and chunks | Volumes removed with `-v` flag | Re-pull models (`docker exec ... ollama pull ...`) and re-ingest documents |
