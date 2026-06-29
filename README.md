# local-rag

A fully local Retrieval-Augmented Generation (RAG) pipeline built with **Ollama** (local embedding + LLM) and **Qdrant** (vector store). No external API calls — everything runs on your machine.

## Prerequisites

- **Docker** (with Docker Compose v2) — for running Qdrant and Ollama containers
- **Node.js 18+** — for the TypeScript API server
- **Ollama CLI** — only needed on first setup to pull the models into the Ollama volume (see below)

## First-time setup

### 1. Start the infrastructure containers

```bash
docker compose up -d
```

This starts:
- **Qdrant** on `http://localhost:6333` (UI + REST API)
- **Ollama** on `http://localhost:11434` (generation + embedding API)

Persisted via the named volumes `qdrant_data` and `ollama_data` so data survives restarts.

### 2. Pull the models into the running Ollama container

If you have the native `ollama` CLI installed and pointed at the same host:

```bash
ollama pull nomic-embed-text
ollama pull llama3
```

Alternatively, exec into the container to pull:

```bash
docker exec -it local-rag-ollama ollama pull nomic-embed-text
docker exec -it local-rag-ollama ollama pull llama3
```

> `nomic-embed-text` powers the embedding step; `llama3` powers the generation step.

## Run the dev server

```bash
pnpm install
pnpm dev
```

The API starts on `http://localhost:3000` with hot reload via `tsx watch`.

## Health check

Once the containers and dev server are up:

```bash
curl localhost:3000/health
```

Expected response once both services are reachable:

```json
{ "ollama": true, "qdrant": true }
```

## Project layout

```
├── src/
│   ├── ingest/        # loader, chunker, ingest pipeline
│   ├── retrieval/     # embedder, Qdrant vector store, retriever
│   ├── generation/    # prompt builder, LLM client
│   ├── rag.ts         # ties retrieval + generation together
│   ├── server.ts      # Express API (health route)
│   └── types.ts       # shared types
├── data/              # documents to ingest
├── tests/
├── package.json
├── tsconfig.json
└── docker-compose.yml
```

Each module under `src/` is currently a stub with a one-line responsibility comment — logic is filled in incrementally.

## Useful commands

| Command | Description |
|---|---|
| `docker compose up -d` | Start Qdrant + Ollama in the background |
| `docker compose down` | Stop containers (volumes preserved) |
| `docker compose down -v` | Stop and **delete** all stored data |
| `pnpm dev` | Start the API with hot reload |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm typecheck` | Type-check without emitting |

## Environment variables (optional)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API listen port |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama base URL |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant base URL |