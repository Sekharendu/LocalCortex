import { appendFileSync, existsSync, readFileSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { C_REMINDER } from '../../src/generation/promptVariants.ts';
import { processAnswer, contextOf } from './calc.mts';

const folder = 'eval/calc-in-code-v3-20261120';
const output = `${folder}/qwen38-dev-9500.jsonl`;
const lock = `${folder}/qwen38-dev-9500.log`;
const lines = (file: string) => existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
const protocol = JSON.parse(readFileSync(`${folder}/protocol.json`, 'utf8'));
const model = '@cf/qwen/qwen3.8-27b';
const cap = 9500;
const maxTokens = 512;
const rows = lines(`${folder}/cohort.jsonl`).filter(row => row.set === 'targets' || row.set === 'guards');
const more = lines(`${folder}/qwen38-extra-dev-prompts.jsonl`);
const seen = new Set(rows.map(row => row.id));
for (const row of more) if (!seen.has(row.id)) { rows.push(row); seen.add(row.id); }
const fd = openSync(lock, 'wx');
try {
const history = lines(output);
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const responses = new Map(history.filter(row => row.kind === 'response').map(row => [row.key, row]));
const finalized = new Set(history.filter(row => row.kind === 'answer').map(row => row.id));
const unconfirmed = new Map(history.filter(row => row.kind === 'request' && !responses.has(row.key)).map(row => [row.key, row.reserve]));
let spent = [...responses.values()].reduce((sum, row) => sum + row.usage.neurons, 0);
let reserved = [...unconfirmed.values()].reduce((sum, neurons) => sum + neurons, 0);
let consecutiveTransportFailures = 0;
const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!account || !/^[a-f0-9]{32}$/i.test(account) || !token) throw new Error('Missing Cloudflare configuration');
const append = (record: object) => appendFileSync(output, JSON.stringify(record) + '\n');

async function call(key: string, prompt: string) {
  const messages = [{ role: 'system', content: protocol.prompts.v3 }, { role: 'user', content: prompt }];
  const hash = sha(JSON.stringify(messages));
  const existing = responses.get(key);
  if (existing) {
    if (existing.hash !== hash || existing.model !== model) throw new Error(`Prompt changed for ${key}`);
    return existing;
  }
  // Reserve one input token per UTF-8 byte plus template overhead, and the full output limit.
  const reserve = Math.ceil((Buffer.byteLength(JSON.stringify(messages)) + 512) * 0.040909 + maxTokens * 0.290909);
  if (unconfirmed.has(key) || spent + reserved + reserve > cap) return;
  append({ kind: 'request', key, model, hash, reserve, at: new Date().toISOString() });
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(45000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, stream: false, max_tokens: maxTokens, reasoning_effort: 'low' }),
  }).catch(error => {
    reserved += reserve;
    unconfirmed.set(key, reserve);
    const code = error.cause?.code ?? error.name;
    append({ kind: 'transport-error', key, code });
    console.warn(`Cloudflare transport ${code} for ${key}, reserved ${reserve} Neurons`);
    if (++consecutiveTransportFailures >= 3) throw new Error('Stopped after three consecutive transport failures');
    return undefined;
  });
  if (!response) return;
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Cloudflare HTTP ${response.status} for ${key}`); }
  const body = await response.json();
  const result = body.result ?? body;
  const raw = result.choices?.[0]?.message?.content ?? result.choices?.[0]?.text ?? result.response;
  const usage = result.usage;
  if (body.success === false || !Number.isFinite(usage?.neurons) || usage.neurons < 0) throw new Error(`Usage unavailable for ${key}`);
  const record = { kind: 'response', key, model, hash, usage, raw: typeof raw === 'string' ? raw : '', finish: result.choices?.[0]?.finish_reason };
  append(record);
  responses.set(key, record);
  spent += usage.neurons;
  consecutiveTransportFailures = 0;
  if (usage.neurons > reserve || spent + reserved > cap) throw new Error('Provider usage exceeded the reservation');
  return record;
}

  let skipped = 0;
  for (const row of rows) {
    if (finalized.has(row.id)) continue;
    if (sha(row.prompt) !== row.promptSha256) throw new Error(`Saved prompt changed for ${row.id}`);
    const prompt = row.prompt.replace(C_REMINDER, protocol.prompts.reminder);
    const context = contextOf(row.prompt, C_REMINDER);
    const initial = await call(row.id, prompt);
    if (!initial) { skipped++; continue; }
    let final = processAnswer(initial.raw, context, row.question);
    let retried = false;
    let retrySkipped = false;
    if (!final.produced && final.reason.startsWith('prose number not in context:')) {
      const second = await call(`${row.id}/retry`, `${prompt}\n\n${protocol.prompts.retry}`);
      if (second) {
        retried = true;
        const candidate = processAnswer(second.raw, context, row.question);
        if (candidate.status === 'computed' && candidate.placeholdersUsed > 0) final = candidate;
      } else retrySkipped = true;
    }
    append({ kind: 'answer', id: row.id, set: row.set, expected: row.reference, question: row.question, answer: final.final,
      status: final.status, reason: final.reason, finish: initial.finish, retried, retrySkipped });
    console.log(`${row.id} ${final.status}${retried ? ' retried' : ''} ${spent.toFixed(2)} Neurons`);
  }
  console.log(`Used ${spent.toFixed(2)} / ${cap} Neurons, with ${reserved} Neurons reserved for ${unconfirmed.size} unconfirmed requests. ${skipped} prepared questions were skipped.`);
} finally {
  closeSync(fd);
  unlinkSync(lock);
}
