// Centralized tunable defaults for the pipeline. Each knob is env-overridable so CI/ops
// can tune without code edits, but this file is the single source of truth for "what are
// the defaults." Add new categories here as new components grow knobs.

export const retrievalConfig = {
  topK: Number(process.env.RETRIEVE_TOP_K ?? 5),
  scoreThreshold: Number(process.env.RETRIEVE_SCORE_THRESHOLD ?? 0.7),
  collection: process.env.QDRANT_COLLECTION ?? "rag",
  // Hybrid (dense+sparse RRF) is the default retrieval mode; set RETRIEVE_MODE=dense to
  // fall back to pure dense search (e.g. to reproduce a pre-hybrid baseline for A/B eval).
  mode: (process.env.RETRIEVE_MODE === "dense" ? "dense" : "hybrid") as "dense" | "hybrid",
};

export const embedConfig = {
  dim: Number(process.env.OLLAMA_EMBED_DIM ?? 768),
  model: process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text",
  url: process.env.OLLAMA_URL ?? "http://localhost:11434",
};