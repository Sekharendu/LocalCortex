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

## 2026-10-28 — Native raw completion parsing (CF-2)

Status: simplified correction approved by the user. The reviewed CF-1 baseline was committed and pushed first as `724d812b8da5cd02981147299c383e7471919ff7`; this correction is a separate, uncommitted revision pending review.

Confirmed root cause: observed Cloudflare native raw responses put generated content in `choices[0].text`. CF-1 incorrectly read chat-style `message.content` and `delta.content`, so valid generated text was not extracted.

Direction: read only native `choices[0].text` for synchronous and streaming generation. Accept the observed usage metadata forms (empty choices with usage, or usage with no choices and an empty response). Do not append the top-level response field as a second text source. Preserve generation errors, completion/empty-output guards, cancellation and cleanup, prompts/citations, the 48-token rewrite limit and the provider-default answer cap.

Alternatives: broad chat/raw compatibility and top-level text fallbacks were deliberately excluded in favor of the observed endpoint's simpler shape. No unrelated refactoring.

Validation: static inspection against the observed response shapes only. No new inference calls, smoke reruns, tests, typechecks, builds or evaluations. Earlier CF-1's missing-credential smoke result remains a historical result; it does not validate this correction. End-to-end streaming/cancellation, follow-up and answer quality remain unverified.

## 2026-10-29 — QH-SCOPE-1: explicit document scope and separate hybrid evaluation

Status: implemented under approved QH-SCOPE-1; independently reviewed after four corrected findings; full 871-case hybrid execution and fixed 200-case reference assessment completed.

Direction: constrain dense and hybrid retrieval to uniquely resolved user-visible document/title/version references from live indexed headers. Missing/deleted/ambiguous identities fail closed. Keep the current persona, model, thresholds and chunking. Create an independent 871-case hybrid arm and a same-source local dense/hybrid retrieval comparison, preserving the old dense baseline.

Reason: global retrieval could substitute another document after an explicitly named source was deleted. An environment-only hybrid switch would also leave the existing evaluation runner's hardcoded dense mode unchanged and violate its source freeze.

Alternatives: API-only IDs would not cover natural-language document references; permissive fuzzy matching/latest-version selection could silently substitute identities; a second dense answer arm would require another 871 hosted answers. The approved bounded literal resolver and local mode-only comparison avoid these tradeoffs. See docs/evaluation/qasper-hybrid-scope.md. No model/prompt condition-binding fix is included.

QH-SCOPE-1 outcome: exact-case hybrid execution completed 871/871 with no errors or quota/auth stops and preserved dense evidence. Same-source local retrieval did not establish a general hybrid advantage; fixed-sample reference-complete cases changed 46 to 44 and answerable-annotation refusals 68 to 72. This does not justify claiming answer-quality improvement or changing retrieval defaults. Explicit scope enforcement remains the accepted safety direction; hybrid was evaluated as requested without prompt/model/chunking changes. Existing condition-transfer and broader retrieval/answer completeness problems remain outside this approved change.


## 2026-11-02 — RERANK-1: optional hosted cross-encoder reranking

Status: direction explicitly approved by the user ("yeah approved"); implementation pending independent review.

Direction: keep reranking disabled by default. When enabled, rerank up to 50 scoped candidates through the existing retrieval gates using the fixed Cloudflare native @cf/baai/bge-reranker-base model, select the requested final topK, and retain original relevance scores with a separate rerankScore. Preserve original query/rewrite policy, text, scope and citations; honor rerank priority during context selection.

Reason: assess whether a cross-encoder can improve candidate ordering without replacing relevance gates, silently widening scope, changing prompts, or installing a local model. Alternatives: unchanged ranking remains the default; local deployment and a new SDK/dependency were excluded; score replacement and silent provider fallback were rejected.

Failure/resource policy: typed fail-closed errors, 15-second deadline through body consumption, two in-flight calls per process with immediate saturation rejection, no retries, and bounded UTF-8 inputs preserved without truncation. Byte limits are resource bounds, not BGE token accounting; Cloudflare documents 512 input tokens but hosted truncation remains unverified. No custom pools, database change, persistent candidate cache or new query transformation.

Evaluation: frozen saved dev candidate pools and unchanged split/gold; sample fixed before outcomes. Live calls require verified free-only billing protection and remaining quota, at most four synthetic and forty dev calls serially with no retries. Token verification succeeded but billing/subscription reads returned 403, so no hosted inference ran and no reranker or answer-quality improvement is claimed.

## 2026-11-05 — Prompt C and expanded answer profile

Status: user authorized application defaults and dev-only end-to-end evaluation; no push/deployment authorized.

Direction: default to C,15hits,3200 long-document context,5000 total local budget and explicit512-token answer output. Preserve strict A/5/1200/4096 behind RAG_PROFILE=legacy and request-local answerProfile. Preserve shorter48-token rewrite limits. Keep retrieval mode/gates and reranker defaults unchanged; evaluation explicitly uses hybrid with reranking off.

Reason: fixed dev prompt experiment produced32/40adequate with C versus29/40strict, with3improvements and no regressions; C removed B's false extra caveats. Two wrong refusals remain. The larger stratified evaluation is required before claiming broader quality.

Alternatives: retain strict default; adopt B (rejected because it introduced false gap statements). Selection of a dev paper is passed as existing internal documentScope so evaluation never scans held-out document headers. No test-paper reads or changes.

## 2026-11-13 — Hybrid search default; nomic embeddings kept

Status: in the app (`RETRIEVE_MODE` defaults to hybrid).

Direction: hybrid (dense + sparse, RRF) is the default search mode, gate unchanged at 0.63. Keep nomic-embed-text.

Reason: on 570 answerable QASPER dev questions (own paper, top 15, gate on), hybrid put the answer chunk in the model's context for 455 vs 447 for dense; gate-off top 5 357 vs 340. qwen3-embedding 0.6B lost 4–6 points on 139 questions and is 2.3× bigger (639 MB vs 274 MB).

Alternatives: dense default (slightly worse); qwen3-embedding (dropped). Details: eval/ALL-TESTS-AND-RESULTS.md §11–§13, §16.

## 2026-11-14 to 2026-11-16 — Chunking, loader and header experiments not adopted

Status: dropped or not added; the app's loader, 500-character recursive chunks and automatic title header are unchanged.

- Dropping reference-list chunks: top 5 358 → 359 of 570. Dropped (§18).
- Improved PDF loader / section → paragraph chunks: +5 points hybrid top 5 on 116 questions, may be chance. Not added (§19).
- 1,200-character chunks: the gain disappeared when the same amount of text was sent (§20). Dropped.
- "First line › nearest heading" header: hybrid top 5 38 → 34 of 46. Dropped (§22).
- Header read from PDF formatting (v2): looked promising on 46 and 35 questions, but on all 541 ordinary-PDF dev questions hybrid top 5 went 408 → 397 (SEC filings 64 → 56). Dropped (§23–§26).

Reason: none improved search on the full dev sets. Vectors from these tests live only in evaluation collections; app data untouched.

## 2026-11-15 — Batched Qdrant upserts

Status: in the app (`src/retrieval/vectorStore.ts`, test in `tests/vectorStore.test.ts`).

Direction: save chunks to Qdrant in batches of 256, deleting the document's points if a batch fails.

Reason: three SEC filings with 3,178–3,505 chunks failed to ingest because one request exceeded Qdrant's 32 MB limit. All three ingest after the fix.

## 2026-11-17 — Chosen direction: local reranker blend, top 10 chunks to the answer model

Status: chosen by the user; **not implemented in the app**. Implementation still needs its own plan and approval.

Direction: hybrid search top 20 inside the scoped document(s) → local bge-reranker-v2-m3 (int8, 545 MB, CPU) scores the 20 → order by a 50/50 blend of search rank and reranker rank (each term 1/(60 + rank)) → send the top 10 to the answer model through the usual context assembly.

Reason:
- The blend helped on unseen questions: QASPER, 320 questions not used to pick the weight, top 10 239 → 261, top 5 201 → 215; ordinary PDFs, 541 questions, top 5 407 → 424, top 10 452 → 470.
- Top 10 vs top 15 with the blend, 100 real Cloudflare answers each: graded a tie (correct 66 vs 65), top 15 costs 11% more Neurons (16.6 vs 18.5 per call), about 600 vs 540 answers a day on a 10,000-Neuron allowance.
- Size: nomic (274 MB) + reranker (545 MB) ≈ 820 MB, within the user's 1 GB limit for shipped models.

Costs/limits: about 4–6 s extra per question on this laptop (CPU); one more local model to download and load. Answer quality was graded by Claude on 100 dev questions only; the user is grading the same answers.

Alternatives: reranker alone (similar top 10, less stable at top 5 on QASPER); answer model as reranker (best on 100 questions but one extra Cloudflare call per question, not confirmed on 541); Cloudflare bge-reranker-base (−8 points and request failures, kept off); top 15 (no quality gain, more Neurons).

## 2026-11-17 — One final held-out test run

Status: approved by the user ("Yes, final run now").

Direction: lift the dev-only rule once to measure retrieval only on the held-out test sets (60 QASPER test papers; ordinary-PDF test set, 240 questions), with the chosen setup only (hybrid top 20 → blend 50/50 → top 10), search-only baseline reported alongside. No Cloudflare calls. Test documents go into new evaluation collections; dev collections and app data are untouched.

Rule: nothing is tuned on the test results; they are reported as the final estimate.

## 2026-11-22 — Spaces, and a choice of three answer models

Status: approved by the user ("go ahead with the defaults"); implemented on 2026-11-22, not committed. Typechecks, web build and `pnpm test` pass. Checked in the browser: General migration, model dropdown, create Space, empty-Space refusal vs General answer, retry, sort/group menu, delete Space with counts, old `/c/:id` redirect.

Direction (Spaces):
- A **Space** holds files and any number of **Chats**. A Space must exist before a chat can start. A chat's questions only search that Space's files.
- One Qdrant collection (`QDRANT_COLLECTION`). Every chunk carries a `spaceId` payload field with a keyword index. Every search and document-catalog read filters on it when a Space is given. Existing points are tagged by `set_payload`, so nothing is re-ingested.
- Postgres `spaces` table (migration `002_spaces.sql`). `conversations.space_id` cascades on delete. The JSON document store stays and gains a `spaceId` field, because the evaluation scripts depend on `DOC_STORE_PATH`.
- Existing chats and files move into a **General** Space: chats in the migration, files and chunks at server start (idempotent). A fresh install gets no General Space until something needs one.
- A file belongs to one Space; chats can't move between Spaces. Sort (recent / created) and grouping (by date / flat) happen in the sidebar. Archiving is dropped.
- Deleting a Space deletes its chats, files and chunks after a confirmation that shows the counts. If the Qdrant delete fails, everything is restored.
- An empty Space still allows chatting, with a nudge to add files.
- The old routes (`/ingest`, `/query`, `/conversations`) keep working: `/query` without a `spaceId` searches unfiltered, as the evaluation scripts expect. Ingest and new chats without a Space go to General.

Reason: users group files by subject and expect a chat to answer only from the files they put together.

Direction (models): Qwen3-30B was retired on Cloudflare (HTTP 410). Users pick the answer model per message from a dropdown in the composer: Gemma 4 26B (default), GLM 4.7 Flash, Granite 4.0 Micro. All three use the `messages` API. GLM and Gemma run with `chat_template_kwargs.enable_thinking=false`. `reasoning_effort:"none"` gives HTTP 400 on GLM. Each assistant message records its model. Follow-up rewrites always use the default model.

Reason: in the 100-question comparison (`eval/model-swap-20261122/REPORT.md`), Gemma was correct on 70 vs Qwen's 66, with a 1.6 s median, at about 2× Qwen's Neurons. GLM got 62 with slow tail latency (p90 52 s), and Granite 54 at under a third of Qwen's Neurons.

Alternatives: one collection per Space (rejected: more collections to manage, and a Space's sparse-term statistics would live apart); Postgres document table (deferred: the evaluation scripts would need porting); a single fixed model (rejected by the user).

Known limit: hybrid search counts keyword rarity (IDF) over the whole collection, not per Space. The rank-based fusion (dense weighted 2:1) and the dense-only relevance check limit the effect.
