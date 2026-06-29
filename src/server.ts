import express, { type Express } from "express";

const PORT = Number(process.env.PORT ?? 3000);
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";

const app: Express = express();

async function probe(url: string, timeoutMs = 2000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

app.get("/health", async (_req, res) => {
  const [ollama, qdrant] = await Promise.all([
    probe(`${OLLAMA_URL}/api/tags`),
    probe(`${QDRANT_URL}/readyz`),
  ]);
  res.json({ ollama, qdrant });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`local-rag API listening on http://localhost:${PORT}`);
});

export { app };