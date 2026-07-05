// One-off sanity script: confirm the embedder wrapper is hitting Ollama correctly.
// Run with: npx tsx scripts/probe-embedder.ts
// Requires: docker compose up -d && docker exec -it local-rag-ollama ollama pull nomic-embed-text
import { embed } from "../src/retrieval/embedder.ts";

const QUERY = "What is the company vacation policy?";

try {
  const vec = await embed(QUERY);
  console.log("query:", QUERY);
  console.log("length:", vec.length);
  console.log("first5:", vec.slice(0, 5));
  console.log("model:", process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text");
  console.log("dim:", process.env.OLLAMA_EMBED_DIM ?? 768);
} catch (e) {
  if (e instanceof Error && e.name === "EmbeddingError") {
    console.error("EmbeddingError:", e.message);
    process.exit(1);
  }
  throw e;
}