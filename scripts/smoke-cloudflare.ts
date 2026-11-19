import { generate, GENERATION_MODEL } from "../src/generation/llm.js";

// One synthetic inference request, no retries, documents, retrieval or stored chats.
if (!process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || !process.env.CLOUDFLARE_API_TOKEN?.trim()) {
  console.log(JSON.stringify({ model: GENERATION_MODEL, status: "blocked", reason: "backend Cloudflare credentials unavailable" }));
  process.exitCode = 1;
} else {
  try {
    const text = await generate("Reply with just: OK", {
      system: "Follow the user's short instruction.", maxTokens: 8, temperature: 0,
    });
    if (!text.trim()) throw new Error("empty text");
    console.log(JSON.stringify({ model: GENERATION_MODEL, status: "success", nonEmptyText: true }));
  } catch {
    // Do not print raw errors or provider content, even in a diagnostic runner.
    console.log(JSON.stringify({ model: GENERATION_MODEL, status: "failure", reason: "inference did not return non-empty generated text" }));
    process.exitCode = 1;
  }
}
