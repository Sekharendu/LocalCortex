import { Router } from "express";
import { z } from "zod";
import { retrieve } from "./retrieval/retriever.js";

const searchInput = z.object({
  question: z.string().trim().min(1),
  topK: z.number().int().min(1).max(20).optional(),
  scoreThreshold: z.number().min(0).max(1).optional(),
  mode: z.enum(["dense", "hybrid"]).optional(),
});

/** Retrieval only: MCP clients can use their own model to answer from these passages. */
export const searchRouter: Router = Router();
searchRouter.post("/search", async (req, res) => {
  const input = searchInput.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: `Invalid search request: ${input.error.message}` });
    return;
  }
  const { question, ...options } = input.data;
  try {
    res.json({ chunks: await retrieve(question, options) });
  } catch (error) {
    res.status(503).json({
      error: `Failed to search documents: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});
