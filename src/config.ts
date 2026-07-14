// Centralized tunable defaults for the pipeline. Each knob is env-overridable so CI/ops
// can tune without code edits, but this file is the single source of truth for "what are
// the defaults." Add new categories here as new components grow knobs.

export const retrievalConfig = {
  topK: Number(process.env.RETRIEVE_TOP_K ?? 5),
  scoreThreshold: Number(process.env.RETRIEVE_SCORE_THRESHOLD ?? 0.7),
  collection: process.env.QDRANT_COLLECTION ?? "rag",
};

export const embedConfig = {
  dim: Number(process.env.OLLAMA_EMBED_DIM ?? 768),
  model: process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text",
  url: process.env.OLLAMA_URL ?? "http://localhost:11434",
};