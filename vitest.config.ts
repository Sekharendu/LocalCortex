import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Ingests hit a CPU-bound local embedding model; generation hits a local LLM.
    // Allow generous time so tests don't flake on slow hardware.
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});