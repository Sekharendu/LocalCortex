// The answer models users can pick (Cloudflare Workers AI, messages API). Compared on 100
// questions in eval/model-swap-20261122/REPORT.md; Gemma answered the most correctly.

export interface AnswerModel {
  /** Cloudflare model id. */
  id: string;
  /** Name shown in the composer's model menu. */
  label: string;
  /** Short line under the name in the menu. */
  description: string;
  /** Extra request fields. GLM and Gemma are reasoning models: without
   * enable_thinking=false GLM spent its whole output budget thinking.
   * (reasoning_effort "none" is rejected by GLM with HTTP 400.) */
  extra: Record<string, unknown>;
}

export const ANSWER_MODELS = {
  "gemma-4-26b": {
    id: "@cf/google/gemma-4-26b-a4b-it",
    label: "Gemma 4 26B",
    description: "Most accurate",
    extra: { chat_template_kwargs: { enable_thinking: false } },
  },
  "glm-4.7-flash": {
    id: "@cf/zai-org/glm-4.7-flash",
    label: "GLM 4.7 Flash",
    description: "Slower on long answers",
    extra: { chat_template_kwargs: { enable_thinking: false } },
  },
  "granite-4.0-micro": {
    id: "@cf/ibm-granite/granite-4.0-h-micro",
    label: "Granite 4.0 Micro",
    description: "Fastest, cheapest",
    extra: {},
  },
} as const satisfies Record<string, AnswerModel>;

export type ModelKey = keyof typeof ANSWER_MODELS;

export function isModelKey(value: unknown): value is ModelKey {
  return typeof value === "string" && Object.hasOwn(ANSWER_MODELS, value);
}

/** GENERATION_MODEL picks the default by key; Gemma otherwise. */
export const DEFAULT_MODEL: ModelKey = isModelKey(process.env.GENERATION_MODEL) ? process.env.GENERATION_MODEL : "gemma-4-26b";

export function answerModel(key: ModelKey = DEFAULT_MODEL): AnswerModel {
  return ANSWER_MODELS[key];
}
