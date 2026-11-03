# Experimental partial-answer prompt

The default remains the legacy prompt. The new prompt is explicitly selected per request; no environment defaults, endpoint contract, retrieval settings, context selection rules, history handling or generation limits are changed.

```ts
await answerQuestion(question, { promptVariant: "partial" });
const stream = await answerQuestionStream(question, { promptVariant: "partial" });
```

`retrieveForQuestion(question, { promptVariant: "partial" })` returns both `prompt` and `systemPrompt`. A caller generating separately must pass `system: prepared.systemPrompt`. The selected instructions are included in context-budget accounting. The variant flag is removed before retrieval options are passed on. There is no shared mutable switch and no new HTTP request field.

For saved-passage evaluation without retrieval:

```ts
import { buildPrompt } from "../../src/generation/promptBuilder.js";
import { generate, PARTIAL_ANSWER_SYSTEM_PROMPT } from "../../src/generation/llm.js";

const prompt = buildPrompt(question, passages, history, "partial");
const answer = await generate(prompt, {
  system: PARTIAL_ANSWER_SYSTEM_PROMPT,
  maxTokens: 512,
  temperature: 0,
});
```

The 512 output cap above is an explicit evaluation option, not a changed application default. Budget 3200/5000 and k15 remain separate evaluation settings.

The experimental system text and reminder are in `src/generation/promptVariants.ts` (system also re-exported from `llm.ts`). Its user template begins with `Context passages:` and has no legacy pre-passage instruction. The no-context user prompt is unchanged. Source labels and multisource answer instructions are outside this experiment.

This implements the supplied wording; it does not establish improved answer quality. Before adoption, compare the legacy and partial variants using identical frozen assembled passages, model parameters and sampled dev questions. Include answerable, partially answerable, irrelevant, related-but-insufficient and zero-context cases; inspect unsupported claims as well as refusals. Arm-blind grading and actual usage should be recorded separately. No inference is required to validate the wiring.
