import llama3Tokenizer from "llama3-tokenizer-js";

/** llama3 token count of `text` (the exact Llama 3 BPE, offline; no BOS/EOS). Matches
 * Ollama's prompt_eval_count for a raw prompt minus its BOS token. */
export function countTokens(text: string): number {
  return llama3Tokenizer.encode(text, { bos: false, eos: false }).length;
}
