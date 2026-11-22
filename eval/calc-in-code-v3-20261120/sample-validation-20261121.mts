import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { processAnswer, contextOf } from './calc.mts';
import { C_REMINDER } from '../../src/generation/promptVariants.ts';

const folder = 'eval/calc-in-code-v3-20261120';
const output = `${folder}/sample-validation-20261121.jsonl`;
const lines = (file: string) => existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const protocol = JSON.parse(readFileSync(`${folder}/protocol.json`, 'utf8'));
const prompts = lines('eval/calc-in-code-v2-20261119/prompts.jsonl');
const prior = lines('eval/calc-in-code-v2-20261119/results.jsonl');
const cohort = JSON.parse(readFileSync('eval/calc-in-code-v2-20261119/frozen.json', 'utf8')).selection.targets;
const plan = ['tat-0751', 'financebench-0102'].map(id => {
  const row = cohort.find(row => row.id === id);
  const saved = prompts.find(row => row.id === id);
  if (sha(saved.prompt) !== row.promptSha256) throw new Error(`Historical prompt changed ${id}`);
  const isRetry = id !== 'financebench-0102';
  const original = prior.find(row => row.id === id && row.variant === 'v2' && row.kind === 'answer');
  const context = contextOf(saved.prompt, C_REMINDER);
  const first = processAnswer(original.raw, context, row.question);
  if (isRetry && (first.produced || !first.reason.startsWith('prose number not in context:'))) throw new Error('Case no longer qualifies for retry');
  const prompt = saved.prompt.replace(C_REMINDER, protocol.prompts.reminder) + (isRetry ? `\n\n${protocol.prompts.retry}` : '');
  return { id, question: row.question, reference: row.reference, context, prompt, isRetry };
});
const manifest = JSON.stringify({ cap: 300, maxCalls: 2, ids: plan.map(row => row.id), promptHashes: plan.map(row => sha(row.prompt)), evaluatorHash: sha(readFileSync(`${folder}/calc.mts`, 'utf8')), runnerHash: sha(readFileSync(`${folder}/sample-validation-20261121.mts`, 'utf8')) }, null, 2);
const manifestPath = `${folder}/sample-validation-20261121-protocol.json`;
if (existsSync(manifestPath)) {
  if (readFileSync(manifestPath, 'utf8') !== manifest) throw new Error('Live validation changed');
} else writeFileSync(manifestPath, manifest, { flag: 'wx' });
const history = lines(output);
if (history.some(row => row.kind === 'request' && !history.some(other => other.id === row.id && other.kind === 'response'))) throw new Error('Unconfirmed call, reconcile before resuming');
let spent = history.filter(row => row.kind === 'response').reduce((total, row) => total + row.usage.neurons, 0);
const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!account || !/^[a-f0-9]{32}$/i.test(account) || !token) throw new Error('Missing provider configuration');
for (const row of plan) {
  if (history.some(saved => saved.id === row.id && saved.kind === 'response')) continue;
  if (spent + 100 > 300) throw new Error('Run budget reached');
  const prompt = `<|im_start|>system\n${protocol.prompts.v3}<|im_end|>\n<|im_start|>user\n${row.prompt}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`;
  if (Buffer.byteLength(prompt) > 18000) throw new Error('Input exceeds reservation');
  appendFileSync(output, JSON.stringify({ kind: 'request', id: row.id, at: new Date().toISOString(), reserved: 100 }) + '\n');
  let response: Response;
  try {
    response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${protocol.model}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(90000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prompt, raw: true, stream: false, max_tokens: 512 }),
    });
  } catch { throw new Error(`Provider transport failed for ${row.id}`); }
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Provider HTTP ${response.status}`); }
  const envelope = await response.json();
  const body = envelope.result ?? envelope;
  const raw = body.choices?.[0]?.text?.trim();
  if (envelope.success === false || !raw || !Number.isFinite(body.usage?.neurons) || body.usage.neurons < 0) throw new Error('Invalid provider answer or usage');
  const calculated = processAnswer(raw, row.context, row.question);
  const retryAccepted = !row.isRetry || calculated.status === 'computed' && calculated.placeholdersUsed > 0;
  const record = { kind: 'response', id: row.id, question: row.question, reference: row.reference, raw, calculated, retryAccepted, usage: body.usage, finish: body.choices[0].finish_reason };
  appendFileSync(output, JSON.stringify(record) + '\n');
  spent += body.usage.neurons;
  console.log(row.id, calculated.status, 'retry accepted:', retryAccepted, calculated.final, 'Neurons:', body.usage.neurons);
}
console.log('Total Neurons:', spent);

