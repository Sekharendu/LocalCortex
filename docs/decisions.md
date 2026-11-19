# Project decisions

## 2026-10-27 — Cloudflare generation (CF-1)

Status: approved for implementation; release not authorized. User approved plan CF-1.

Direction: use Cloudflare Workers AI `@cf/qwen/qwen3-30b-a3b-fp8` for answers and guarded follow-up rewriting, with backend-only credentials. Keep local nomic embeddings, Qdrant, document storage, retrieval gates, Postgres, prompt construction and citation contracts. Remove the mandatory local llama3 download.

Reason: remove the large local generation-model download and CPU generation dependency for V2.

Thinking: use Cloudflare's documented `raw: true` manual chat template support and Qwen's exact published no-thinking assistant prefix (an empty, closed think block). This combines documented capabilities; it is not an undocumented Cloudflare thinking flag or a live-verified guarantee. Sources: [model schema](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/), [raw prompting](https://developers.cloudflare.com/workers-ai/features/prompting/), [Qwen tokenizer template](https://huggingface.co/Qwen/Qwen3-30B-A3B-FP8/blob/main/tokenizer_config.json), checked 2026-10-27.

Limits: answers omit `max_tokens` and use Cloudflare's documented 2000-token default; rewrites explicitly use 48 output tokens and temperature 0. The existing 512-token context reserve is not an answer cap. Retained llama3 tokenizer/context accounting is an approximation for Qwen, not a provider window setting.

Alternatives: retain mandatory Ollama generation (rejected for this task); use an SDK (unnecessary dependency); pass undocumented thinking flags (rejected). Optional local mode, Groq fallback, quotas, authentication and model comparisons are excluded.

Privacy: questions, selected passages (possibly whole small documents), relevant conversation history and rewrite inputs are sent to Cloudflare. Local storage and embedding behavior remain unchanged. No provider retention/training guarantees are asserted here.

Validation: user deliberately limits validation to one short synthetic live inference call with a tiny output cap, only if credentials exist; otherwise report blocked. No suites, typechecks, builds, ingestion or evaluations. Static independent review follows. Streaming, cancellation, rewrite quality, refusals, memory/concurrency behavior and the complete application remain unverified at runtime.

Implementation smoke result: BLOCKED — both required Cloudflare variables were absent when the single smoke runner was invoked; no inference request was sent. No runtime behavior is established by this result.
