<div align="center">

# LocalCortex

**Chat with your documents. Local retrieval, hosted answers.**

[![CI](https://github.com/Sekharendu/LocalCortex/actions/workflows/ci.yml/badge.svg)](https://github.com/Sekharendu/LocalCortex/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Upload PDFs, Word files, Markdown or plain text, then ask questions in a chat UI.<br>
Answers come with their sources, and when your documents don't cover a question, it says so.<br>
V2 uses Cloudflare Workers AI for answers and follow-up rewriting. Embeddings, document storage and chat persistence remain local in the standard setup. Open source under the MIT license.

![LocalCortex demo: upload a handbook, ask questions, get answers with sources, and a refusal for an off-topic question](media/localcortex-demo.gif)

<sub>Historical V1 demo: real answers from llama3 on a laptop CPU. The waits while it thinks are cut, and each caption shows the actual time taken.</sub>

</div>

---

## Why LocalCortex

- **Local storage, hosted inference.** Questions, selected document passages (possibly a whole small document), and relevant conversation/rewrite history are sent to Cloudflare. Embeddings, search and stored chats stay local in the standard setup.
- **Answers you can check.** Every answer shows the documents it came from as source chips.
- **Honest when it doesn't know.** If nothing relevant is found, it tells you instead of making something up.
- **Real conversations.** Follow-ups like *"And after five years?"* keep the thread. Chats are saved, titled and listed like any chat app.
- **No local answer model download.** Ollama runs nomic-embed-text for embeddings; Cloudflare generates answers over the internet.

## Measured, not promised

These are historical V1 measurements with local llama3, not validation of Cloudflare generation. V2 quality and latency have not been evaluated.

| What was tested | Result |
|---|---|
| Answer accuracy: 62 questions (a random sample from the eval sets plus user-style questions), each answer read by hand | **98%** correct (61 of 62) |
| Off-topic questions in that run | **100%** refused (14 of 14) |
| Hallucination stress test: questions the documents don't answer (`scripts/test-hallucination.ts`) | **10 of 10** refused |
| Answer time on a laptop CPU, no GPU | **~48 s** median |

The remaining misses are retrieval misses (exact terms such as "GPT-4.1", or slangy wording), not the model inventing answers. The full measurement history is in [`AGENTS.md`](AGENTS.md).

## How it works

```mermaid
flowchart LR
    subgraph machine["Your machine"]
        direction LR
        F["Your files<br/>.pdf .docx .md .txt"] --> C["Chunk<br/>by headings"]
        C --> E["Embed<br/>nomic-embed-text"]
        E --> Q[("Qdrant<br/>vector search")]
        U["Your question"] --> Q
        P[("Postgres<br/>chat history")]
    end
    Q --> L["Cloudflare Workers AI<br/>Qwen3 answers + rewriting"]
    P --> L
    L --> A["Answer + sources"]
```

1. **Ingest.** Files are turned into text (PDF line breaks and Word headings are kept), then split along their headings and paragraphs. Documents without headings, such as a resume, get a "Title › Section" header embedded with each chunk.
2. **Embed and store.** Each chunk is embedded by `nomic-embed-text` in Ollama and stored in Qdrant with both a dense vector and a BM25-style sparse vector.
3. **Retrieve.** A question is embedded and matched. A calibrated relevance threshold (0.63) decides whether *anything* relevant exists. If nothing clears it, the model is told so and refuses.
4. **Assemble the context.** A small matching document goes in whole. A long one contributes its best passages plus their neighbours, within the retained 4096-token prompt budget (estimated with the existing llama3 tokenizer).
5. **Answer.** Cloudflare Qwen3 answers in plain sentences, streamed token by token. Sources come from retrieval, never from the model, so they can't be made up.

Follow-ups that point back ("what about part-timers?") are first rewritten into standalone questions, so retrieval works on them like a first question.

## Quick start

**You need** Docker with Compose v2, internet access, and a Cloudflare account with a Workers AI API token. Only nomic-embed-text is downloaded (roughly 274 MB), plus application/infrastructure images.

Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` securely in the backend shell before starting Compose or `pnpm dev`. The API does not automatically load `.env` files. Compose can read a private `.env` file for substitution; never commit it or put these variables in frontend/Vite configuration. The token needs Workers AI access for the account. Optional `CLOUDFLARE_GEN_TIMEOUT_MS` defaults to `180000`.

```bash
git clone https://github.com/Sekharendu/LocalCortex.git
cd LocalCortex
docker compose --profile app up -d
```

Then open **http://localhost:8080**. The first `up` pulls `nomic-embed-text`, which is kept in a Docker volume. No llama3 download is needed. Click **Documents** in the sidebar, drop in a file and start asking.

The app listens on `127.0.0.1` only: it has no login, so it isn't exposed to your network. `docker compose --profile app down` stops it; your documents and chats stay in Docker volumes.

<details>
<summary><b>Run it for development</b> (hot reload, Node.js 26+ and pnpm)</summary>

```bash
# 1. Start Qdrant, Ollama and Postgres only
docker compose up -d

# 2. Pull the embedding model (one time; it persists in a Docker volume)
docker exec -it local-rag-ollama ollama pull nomic-embed-text

# 3. Install dependencies and create the chat tables
pnpm install
pnpm db:migrate

# 4. Run the API and the chat UI (two terminals)
pnpm dev        # API on http://localhost:3000
pnpm dev:web    # UI  on http://localhost:5173
```

Then open **http://localhost:5173**. The development API and the Docker app keep separate document lists and Qdrant collections (`rag` and `localcortex-app`), so they don't mix. Chats share one Postgres database.

</details>

> [!TIP]
> Try it with the sample handbook in `data/eval-corpus.docx`: ask *"How many vacation days do I get per year?"*, then *"And after five years?"*, then something it can't know, like *"What is the capital of France?"*

## Using it

### The chat UI

- Chats live in the sidebar, grouped by date, and each has its own URL. New chats are titled from their first message.
- Answers stream in with their sources as chips underneath. **Stop** cancels generation and keeps the partial answer.
- The **Documents** panel takes `.pdf`, `.docx`, `.md` and `.txt` by drag and drop. It shows indexing progress and lets you delete files.
- Fonts are bundled without a CDN. Answers and follow-up rewriting require internet access to Cloudflare.

### The API

Everything the UI does is available over a small JSON API: `localhost:3000` in development, `localhost:8080/api` in the Docker app (e.g. `localhost:8080/api/health`).

| Method | Path | What it does |
|---|---|---|
| `GET` | `/health` | Reports whether Ollama, Qdrant and Postgres are reachable |
| `POST` | `/ingest` | Upload a file (`multipart/form-data`, field `file`) |
| `POST` | `/query` | Ask a one-off question; `stream: true` streams the answer |
| `GET` | `/documents` | List indexed documents |
| `DELETE` | `/documents/:id` | Remove a document from both stores |
| `GET` `POST` | `/conversations` | List chats, or start one |
| `GET` `PATCH` `DELETE` | `/conversations/:id` | Read, rename or delete a chat |
| `POST` | `/conversations/:id/messages` | Send a message and stream the answer, with memory of the chat |

Streamed answers are `text/plain`, and their sources arrive in an `X-Citations` response header (a JSON array). Errors are always JSON `{ error }`.

<details>
<summary><b>Full API reference</b> (bodies, responses, status codes)</summary>

| Method | Path | Body | Response | Statuses |
|---|---|---|---|---|
| `GET` | `/health` | — | `{ ollama, qdrant, postgres }` | `200` |
| `POST` | `/ingest` | `multipart/form-data`: `file` (required; .txt, .md, .pdf, .docx), `strategy` ∈ {fixed, semantic, recursive} (default `recursive`) | `{ documentId, chunkCount }` | `200`, `400` (no file, or unsupported type), `413` (too large), `502` (pipeline failed, names the stage) |
| `POST` | `/query` | `{ question: string, stream?: boolean, topK?: number, scoreThreshold?: number, collection?: string }` | non-stream: `{ answer, chunks, citations }`; stream: `text/plain; charset=utf-8` + `X-Citations` header | `200`, `400` (missing question), `503` (infra failure) |
| `GET` | `/documents` | — | `{ documents: DocumentRecord[] }` (default collection, newest first) | `200`, `500` |
| `DELETE` | `/documents/:id` | — | `{ deleted: DocumentRecord }` | `200`, `404`, `502` (Qdrant delete failed; the record is restored so the stores never drift) |
| `GET` | `/conversations` | — | `{ conversations: ConversationSummary[] }` (most recently active first) | `200`, `503` (Postgres down) |
| `POST` | `/conversations` | `{ title?: string }` | `{ conversation }` | `201` |
| `GET` | `/conversations/:id` | — | `{ conversation }` with `messages` in order | `200`, `404` |
| `PATCH` | `/conversations/:id` | `{ title: string }` | `{ conversation }` | `200`, `400` (blank title), `404` |
| `DELETE` | `/conversations/:id` | — | `{ deleted: id }` (messages go with it) | `200`, `404` |
| `POST` | `/conversations/:id/messages` | `{ content: string }` | streamed like `/query` with `stream: true`; both turns are saved | `200`, `400`, `404`, `503` (infra failure before streaming) |

If the client disconnects mid-answer, generation is cancelled and the partial answer is saved with `status: "interrupted"`.

**curl examples**

```bash
# Health
curl -s localhost:3000/health | jq

# Ingest a file
curl -s -X POST localhost:3000/ingest -F "file=@data/sample.txt" | jq

# Ask (JSON answer with chunks and citations)
curl -s -X POST localhost:3000/query -H 'content-type: application/json' \
  -d '{"question":"What does the sample say about a fox?"}' | jq

# Ask (streamed; -i shows the X-Citations header)
curl -i -N -X POST localhost:3000/query -H 'content-type: application/json' \
  -d '{"question":"What does the sample say about a fox?","stream":true}'

# List and delete documents
curl -s localhost:3000/documents | jq
curl -s -X DELETE localhost:3000/documents/REPLACE-WITH-DOCUMENTID | jq

# A conversation with a follow-up
CID=$(curl -s -X POST localhost:3000/conversations -H 'content-type: application/json' -d '{}' | jq -r .conversation.id)
curl -N -X POST localhost:3000/conversations/$CID/messages -H 'content-type: application/json' \
  -d '{"content":"How many vacation days do I get per year?"}'
curl -N -X POST localhost:3000/conversations/$CID/messages -H 'content-type: application/json' \
  -d '{"content":"And after five years?"}'
curl -s localhost:3000/conversations/$CID | jq
```

</details>

## Use LocalCortex from an MCP client

LocalCortex includes a local **stdio MCP server**. An MCP client launches it as a
child process and can search your documents, ask the hosted generation model, list documents,
upload files, delete indexed documents, and check service health.

The MCP server connects to the existing HTTP API; it does not start Docker or the
API for you. This keeps the web UI and MCP clients on the same document index and
avoids multiple processes writing the JSON document store.

1. Start LocalCortex with `docker compose --profile app up -d`, or start the
   infrastructure and development API as described above.
2. Run `pnpm install` and `pnpm build` in this checkout.
3. Add the following server entry to a client that supports local stdio MCP
   servers. Replace the script path with the absolute path to your checkout:

```json
{
  "mcpServers": {
    "localcortex": {
      "command": "node",
      "args": ["C:/path/to/LocalCortex/dist/mcp.js"],
      "env": {
        "LOCALCORTEX_API_URL": "http://localhost:8080/api"
      }
    }
  }
}
```

For a development API, set `LOCALCORTEX_API_URL` to `http://localhost:3000`
(the default). The MCP process can run from any working directory; the API owns
the document-store paths. Restart/rebuild the API after adding MCP support, since
passage search uses the new `POST /search` endpoint. Rebuild the Docker app with
`docker compose --profile app up -d --build` if using an older image.

| Tool | Purpose |
|---|---|
| `localcortex_health` | Check Ollama, Qdrant and Postgres reachability |
| `localcortex_list_documents` | List indexed documents and their IDs |
| `localcortex_search` | Retrieve passages with source/page metadata; let the MCP client's own model answer |
| `localcortex_ask` | Have LocalCortex's Cloudflare Qwen3 model answer with citations |
| `localcortex_ingest` | Upload a local file using an absolute path on the MCP server's computer |
| `localcortex_delete_document` | Remove a document and its indexed passages by ID; original file is kept |

Try: *"Search my LocalCortex documents for the vacation policy and cite the
passages you find."* Search needs the embedding model and Qdrant, but does not
call the answer-generation model. Asking uses Cloudflare generation. Neither tool saves a
chat or requires Postgres; the health tool reports Postgres separately.

Uploads support `.pdf`, `.docx`, `.md`, and `.txt`, with `recursive` chunking by
default. Uploading the same file twice creates two records. Confirm deletions in
your MCP client before approving the destructive tool. There are no automatic
retries of writes.

The HTTP timeout defaults to 10 minutes for CPU generation/indexing; override it
with `MCP_API_TIMEOUT_MS`. For long operations, also increase your MCP client's
tool-call timeout where supported. The upload size check defaults to 50 MB;
set `MAX_INGEST_BYTES` in both the API and MCP environments to change it.

For development, `pnpm dev:mcp` launches the TypeScript entry point;
`pnpm start:mcp` launches the compiled server. These commands wait for an MCP
client on stdin; they do not open a browser. Configure clients to run `node`
directly as above so package-manager banners cannot pollute the protocol stream.
This is a local stdio integration, not a remotely hosted MCP endpoint. Connecting
it to a cloud assistant can send retrieved document passages to that assistant.

The retrieval-only HTTP endpoint is also available directly:

```bash
curl -s localhost:3000/search -H 'content-type: application/json' \
  -d '{"question":"What is the vacation policy?","topK":5,"mode":"dense"}'
```

It returns `{ chunks }` with the usual relevance checks and no generated answer.
Optional `topK` is an integer from 1–20, `scoreThreshold` is from 0–1, and `mode`
is `dense` or `hybrid`. It searches the default collection. Invalid input returns
400, and retrieval infrastructure errors return 503 with `{ error }`.

## Hosted generation and privacy

The fixed generation/rewrite model is `@cf/qwen/qwen3-30b-a3b-fp8`. Cloudflare's [model schema](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/) documents a **2000-token default output limit**; answer requests omit `max_tokens` and use that default. Rewrites explicitly request **48 output tokens** with temperature 0. The existing **512-token answer reserve is context accounting, not a generation cap**. The llama3 tokenizer and 4096-token context budget are retained estimates, not Qwen's tokenizer or hosted window configuration.

Thinking is disabled by rendering [Qwen's published no-thinking template](https://huggingface.co/Qwen/Qwen3-30B-A3B-FP8/blob/main/tokenizer_config.json) with a closed empty thinking block, using Cloudflare's documented [raw prompt mode](https://developers.cloudflare.com/workers-ai/features/prompting/). No unsupported `enable_thinking` parameter is sent. This combines documented capabilities and has not been verified end to end.

Selected passages, including whole small documents when context assembly selects them, questions, and relevant conversation/rewrite inputs leave the device for Cloudflare inference. This integration makes no new retention or training guarantees; review [Cloudflare's data policy](https://developers.cloudflare.com/workers-ai/platform/data-usage/). Provider credentials stay on the backend. Generation errors do not echo prompts, responses, credentials or raw provider error bodies. `GET /health` still probes only local Ollama, Qdrant and Postgres; it does not verify Cloudflare access.

The one-request synthetic runner is `pnpm exec tsx scripts/smoke-cloudflare.ts` after backend credentials are configured. It does not print generated content or credentials, and makes no request when credentials are missing.

This integration's validation is deliberately limited to one tiny synthetic live inference check if credentials exist, otherwise blocked. No suites, builds or quality evaluations are run for it. A successful check proves connectivity and basic inference only, not streaming, cancellation, rewrites, refusals or complete application behavior. Existing evaluation scripts and historical results are not Cloudflare validation.

## Configuration

Local infrastructure uses the defaults from `docker compose up -d`; generation additionally requires the backend Cloudflare credentials above. These are the main settings:

| Variable | Default | Purpose |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` | required | Backend account ID and Workers AI token |
| `OLLAMA_EMBED_MODEL` / `OLLAMA_EMBED_DIM` | `nomic-embed-text` / `768` | The embedding model and its dimension. Change both together, then re-ingest |
| `RETRIEVE_SCORE_THRESHOLD` | `0.63` | How relevant a passage must be before the model sees it. Re-calibrate with `scripts/calibrate-threshold.ts` after changing models |
| `RETRIEVE_MODE` | `dense` | `dense` or `hybrid` (dense + BM25, fused in Qdrant). They tie on the eval sets |
| `QUERY_REWRITE` | on | Rewrite referring follow-ups into standalone questions. `0` to disable |
| `MAX_INGEST_BYTES` | 50 MB | Upload size limit |

<details>
<summary><b>All environment variables</b></summary>

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API listen port |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama base URL |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant base URL |
| `DATABASE_URL` | `postgres://localcortex:localcortex@localhost:5433/localcortex` | Postgres for chats (port 5433 so it doesn't collide with a local Postgres) |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Embedding model |
| `OLLAMA_EMBED_DIM` | `768` | Expected embedding dimension; a mismatch fails loudly |
| `OLLAMA_EMBED_PREFIXES` | on | nomic-embed-text's `search_query: ` / `search_document: ` task prefixes. `0` to disable (re-ingest after changing) |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` | required | Backend credentials for fixed model `@cf/qwen/qwen3-30b-a3b-fp8` |
| `CLOUDFLARE_GEN_TIMEOUT_MS` | `180000` | Generation timeout covering response headers and body |
| `OLLAMA_NUM_CTX` | `4096` | Legacy context budget estimate, not a Cloudflare window setting |
| `QDRANT_COLLECTION` | `rag` | Default collection |
| `RETRIEVE_TOP_K` | `5` | Passages retrieved per question |
| `RETRIEVE_SCORE_THRESHOLD` | `0.63` | Minimum cosine score for a question to get any context |
| `RETRIEVE_MODE` | `dense` | `dense` or `hybrid` |
| `RETRIEVE_FUSION` | `rrf` | Hybrid fusion: `rrf` (dense weighted 2:1) or `dbsf` |
| `RETRIEVE_FOLLOWUP_FLOOR` | `0.57` | Minimum score a follow-up must reach on its own, so an off-topic follow-up can't borrow relevance from the previous question |
| `RETRIEVE_EXPAND_CONTEXT` | on | Whole small documents and neighbouring passages in the context. `0` for plain top chunks |
| `INGEST_CONTEXT_HEADERS` | `auto` | "Title › Section" headers on chunks of documents without headings. `1` always, `0` never |
| `QUERY_REWRITE` | on | LLM rewrite of referring follow-ups |
| `REWRITE_TIMEOUT_MS` | `60000` | Rewrite timeout; on timeout the fallback is used |
| `MAX_INGEST_BYTES` | `52428800` | Upload size limit |
| `DOC_STORE_PATH` | `./data/documents.json` | Document records file |
| `SPARSE_STATS_PATH` | `./data/sparse-stats.json` | Corpus stats for the BM25 encoder |

**Re-ingest after changing embeddings.** Changing the embedding model or prefixes changes every vector: drop the collection (`curl -X DELETE localhost:6333/collections/rag`) and upload your documents again.

</details>

## Development

```bash
pnpm test             # unit tests always run; live-stack tests skip if a service is down
pnpm run typecheck    # API
pnpm typecheck:web    # chat UI
pnpm build && pnpm start   # production-style API run from dist/
```

<details>
<summary><b>Evaluation scripts</b></summary>

Each script prints a summary and writes its full results to `data/`. Ingest the sample handbook first: `curl -X POST localhost:3000/ingest -F "file=@data/eval-corpus.txt"`.

| Script | Measures |
|---|---|
| `scripts/evaluate-retrieval.ts` | Recall@1/3/5 and MRR against `data/eval-set.json` (`--mode dense\|hybrid`, `--collection`, `--eval-set`) |
| `scripts/calibrate-threshold.ts` | Where the relevance threshold should sit, from answerable vs off-topic question scores |
| `scripts/test-hallucination.ts` | 10 questions the documents don't answer: PASS / FAIL / AMBIGUOUS. Suggests prompt changes but never applies them. `--compare` diffs two runs |
| `scripts/check-answers.ts` | Answer correctness, old vs new context assembly (resumable) |
| `scripts/check-answer-style.ts` | Answers start with the answer: no "According to…", no invented "Source:" lines |
| `scripts/evaluate-followups.ts` | Follow-up retrieval and off-topic leaks |
| `scripts/compare-chunking.ts` | Chunking strategies side by side |
| `scripts/smoke-test.ts` | Every API route end to end, against a running `pnpm dev` |

A larger benchmark (4 generated policy documents, 55 questions) lives in `data/large-corpus/`; ingest it with `npx tsx scripts/ingest-large-corpus.ts --collection rag-large`.

When retrieval scores are low, look at chunking before the embedding model: most retrieval failures are chunking failures in disguise.

</details>

<details>
<summary><b>Project layout</b></summary>

```
LocalCortex/
├── src/
│   ├── ingest/           # loader (pdf.js, mammoth, text) → chunker → pipeline
│   ├── retrieval/        # embedder, Qdrant vector store, sparse encoder, retriever, context assembly
│   ├── generation/       # system prompt, prompt builder, Cloudflare generation client, follow-up rewrite, refusal patterns
│   ├── rag.ts            # the orchestrator: retrieve → build prompt → generate
│   ├── server.ts         # Express API
│   ├── conversationStore.ts, db.ts   # chats in Postgres
│   └── documentStore.ts  # document records (JSON file)
├── web/                  # chat UI: React 19 + Vite, hand-written CSS
├── site/                 # documentation site (pnpm dev:site)
├── migrations/           # Postgres schema, applied by pnpm db:migrate
├── scripts/              # evaluation, calibration, maintenance and promo scripts
├── tests/                # vitest: offline unit tests + live-stack tests
├── data/                 # sample files, eval corpora and question sets
└── docker-compose.yml    # Qdrant, Ollama, Postgres
```

The reasoning behind each design decision, and what was measured and discarded, is in [`AGENTS.md`](AGENTS.md).

</details>

<details>
<summary><b>Troubleshooting</b></summary>

| Symptom | Likely cause | Fix |
|---|---|---|
| `localhost:3000/health` refuses the connection | API not running | `pnpm dev` |
| `docker compose --profile app up -d` sits at "Waiting" on the first start | It is downloading nomic-embed-text (~274 MB) before starting the API; application and infrastructure images are separate downloads | Watch it with `docker compose logs -f models` in another terminal |
| `/health` shows `ollama`, `qdrant` or `postgres` as `false` | That container is down or still starting | `docker compose ps`, then `docker compose up -d` |
| `/conversations` returns `relation "conversations" does not exist` | Migrations not applied | `pnpm db:migrate` |
| Ingest fails at stage `'embed'` | `nomic-embed-text` not pulled | `docker exec -it local-rag-ollama ollama pull nomic-embed-text` |
| Questions fail with a Cloudflare generation error | Missing credentials, permissions, connectivity or provider error | Set backend Cloudflare variables; check Workers AI permissions and internet access |
| `Embedding dimension mismatch` | Embedding model changed without its dimension | Set both `OLLAMA_EMBED_MODEL` and `OLLAMA_EMBED_DIM` |
| "model runner has unexpectedly stopped" on long runs | Docker's VM ran out of memory | Give Docker more RAM (on Windows, `memory=` in `.wslconfig`) |
| The Documents panel doesn't match what answers use | `data/documents.json` drifted from Qdrant | `npx tsx scripts/reconcile-documents.ts`, then `--apply` |
| Embedding model and documents gone after `docker compose down -v` | `-v` deletes the volumes | Pull nomic-embed-text again and re-upload |

</details>

---

<div align="center">
<sub>Built with Ollama, Qdrant, Postgres, LangChain text splitters, Express and React.</sub>
</div>
