// Centralized tunable defaults for the pipeline. Each knob is env-overridable so CI/ops
// can tune without code edits, but this file is the single source of truth for "what are
// the defaults." Add new categories here as new components grow knobs.

export const retrievalConfig = {
  topK: Number(process.env.RETRIEVE_TOP_K ?? 5),
  // Chosen by scripts/calibrate-threshold.ts: general-knowledge questions top out at
  // 0.567 and answerable ones start at 0.640, so 0.63 blocks the former and refuses none
  // of the latter (0.7 refused 9/113). Company-sounding questions the corpus can't answer
  // overlap answerable scores; those rely on the prompt's "context is insufficient" rule.
  scoreThreshold: Number(process.env.RETRIEVE_SCORE_THRESHOLD ?? 0.63),
  collection: process.env.QDRANT_COLLECTION ?? "rag",
  // Hybrid (dense+sparse RRF) is the default retrieval mode; set RETRIEVE_MODE=dense to
  // fall back to pure dense search (e.g. to reproduce a pre-hybrid baseline for A/B eval).
  mode: (process.env.RETRIEVE_MODE === "dense" ? "dense" : "hybrid") as "dense" | "hybrid",
  // Hybrid-mode fusion: "rrf" (rank-only) or "dbsf" (score-magnitude-aware).
  fusion: (process.env.RETRIEVE_FUSION === "dbsf" ? "dbsf" : "rrf") as "rrf" | "dbsf",
};

export const embedConfig = {
  dim: Number(process.env.OLLAMA_EMBED_DIM ?? 768),
  model: process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text",
  url: process.env.OLLAMA_URL ?? "http://localhost:11434",
  // nomic-embed-text expects "search_query: " / "search_document: " task prefixes; using
  // them lifted large-corpus R@1 from 47/55 to 50/55. Set OLLAMA_EMBED_PREFIXES=0 to
  // disable. Toggling this changes every vector: collections must be re-ingested.
  taskPrefixes: process.env.OLLAMA_EMBED_PREFIXES !== "0",
};