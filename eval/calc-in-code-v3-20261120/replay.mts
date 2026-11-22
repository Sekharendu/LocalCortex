import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { processAnswer, contextOf } from './calc.mts';
import { processAnswer as previous } from '../calc-in-code-v2-20261119/calc.mts';
import { C_REMINDER } from '../../src/generation/promptVariants.ts';

const dir = 'eval/calc-in-code-v3-20261120';
const v2 = 'eval/calc-in-code-v2-20261119';
const offline = process.argv.includes('--offline');
const replayFile = `${dir}/${offline ? 'power-replay' : 'replay-results'}.jsonl`;
const lines = (path: string) => existsSync(path) ? readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const frozen = JSON.parse(readFileSync(`${v2}/frozen.json`, 'utf8'));
const prompts = new Map(lines(`${v2}/prompts.jsonl`).filter(row => row.qualified).map(row => [row.id, row]));
const hosted = new Map(lines(`${v2}/results.jsonl`).filter(row => row.kind === 'answer' && row.set === 'targets' && row.variant === 'v2' && !row.error).map(row => [row.id, row]));
const existing = new Set(lines(replayFile).map(row => row.id));
const { system, reminder } = frozen.v2Prompt;
const v3System = system.replace('+ - * / and parentheses', '+ - * / ^ and parentheses').replace('  Examples:', '  Use ^ for powers, for example (ending / beginning) ^ (1 / years) for the growth factor.\n  Examples:');
const retry = 'Format check: the previous answer included a computed value in prose without a CALC line. Try once more using only the original evidence. Begin with CALC: name = expression and use {name} for the result in prose. If a required input is absent, say which one. Do not guess.';

async function callLocal(prompt: string) {
  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(300000),
    body: JSON.stringify({ model: 'llama3:latest', prompt, system: v3System, stream: false, options: { num_ctx: 7000, num_predict: 400, temperature: 0 } }),
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Local model HTTP ${response.status}`); }
  const result = await response.json();
  if (typeof result.response !== 'string' || !result.response.trim()) throw new Error('Local model returned no text');
  return { text: result.response.trim(), seconds: result.total_duration / 1e9, reason: result.done_reason };
}

for (const item of frozen.selection.targets) {
  if (existing.has(item.id)) continue;
  const saved = prompts.get(item.id);
  const row = hosted.get(item.id);
  if (!saved || !row || sha(saved.prompt) !== item.promptSha256) throw new Error(`Missing historical evidence ${item.id}`);
  const prompt = saved.prompt.replace(C_REMINDER, reminder);
  if (sha(prompt) !== row.promptSha256) throw new Error(`Historical hosted prompt hash mismatch ${item.id}`);
  const context = contextOf(saved.prompt, C_REMINDER);
  const baseline = previous(row.raw, context, item.question);
  if (baseline.final !== row.answer) throw new Error(`Could not reproduce historical v2 answer for ${item.id}`);
  const first = processAnswer(row.raw, context, item.question);
  const eligible = !first.produced && first.reason.startsWith('prose number not in context:');
  const local = eligible && !offline ? await callLocal(`${prompt}\n\n${retry}`) : undefined;
  const retried = local ? processAnswer(local.text, context, item.question) : undefined;
  const accepted = retried?.status === 'computed' && retried.placeholdersUsed > 0;
  const final = accepted ? retried : first;
  appendFileSync(replayFile, JSON.stringify({ id: item.id, question: item.question, reference: item.reference, baseline, first, local, retried, final }) + '\n');
  console.log(item.id, local ? 'local retry' : 'cached replay', baseline.status, '->', final.status, local?.seconds?.toFixed(1) ?? '');
}
