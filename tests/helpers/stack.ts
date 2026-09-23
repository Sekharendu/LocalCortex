// Probes the live stack once, when a test file imports this module. vitest evaluates
// `test.skipIf(cond)` while collecting tests, before any beforeAll runs, so a flag set
// inside beforeAll is always still false at that point and the live tests silently
// never run. A top-level await here resolves before the importing file's tests are
// defined.
const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

async function reachable(url: string): Promise<boolean> {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
}

export const qdrantUp = await reachable(`${QDRANT_URL}/readyz`);
export const ollamaUp = await reachable(`${OLLAMA_URL}/api/tags`);
export const stackUp = qdrantUp && ollamaUp;
