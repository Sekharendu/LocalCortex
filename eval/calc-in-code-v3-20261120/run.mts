import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { processAnswer as v3Process, contextOf } from './calc.mts';
import { processAnswer as v2Process } from '../calc-in-code-v2-20261119/calc.mts';
import { C_SYSTEM_PROMPT, C_REMINDER } from '../../src/generation/promptVariants.ts';

const dir = 'eval/calc-in-code-v3-20261120';
const cohort = `${dir}/cohort.jsonl`;
const ledgerPath = `${dir}/meter.jsonl`;
const resultsPath = `${dir}/results.jsonl`;
const model = '@cf/qwen/qwen3-30b-a3b-fp8';
const cap = 3900;
const reservation = 110;
const sha = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');
const lines = (path: string) => existsSync(path) ? readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
const write = (file: string, value: object) => appendFileSync(file, JSON.stringify(value) + '\n');
const prior = JSON.parse(readFileSync('eval/calc-in-code-v2-20261119/frozen.json', 'utf8'));
const { system: v2, reminder } = prior.v2Prompt;
const v3 = v2.replace('+ - * / and parentheses', '+ - * / ^ and parentheses').replace('  Examples:', '  Use ^ for powers, for example (ending / beginning) ^ (1 / years) for the growth factor.\n  Examples:');
if (v3 === v2) throw new Error('V3 power instruction missing');
const retry = 'Format check: your previous answer included a computed value in the prose without a CALC line. Try once more using only the original evidence. Begin with CALC: name = expression and use {name} for the result in prose. If a required input is absent, say which one. Do not guess.';
const frozen = {
  cohortSha256: sha(readFileSync(cohort)), runnerSha256: sha(readFileSync(`${dir}/run.mts`)),
  v3EvaluatorSha256: sha(readFileSync(`${dir}/calc.mts`)), v2EvaluatorSha256: sha(readFileSync('eval/calc-in-code-v2-20261119/calc.mts')),
  model, cap, reservation, maxTokens: 512, maxRetry: 1, prompts: { current: C_SYSTEM_PROMPT, v2, v3, reminder, retry },
  targetBars: 'At least ceil(5*n/30) more correct than current, no more refusals or invented numbers than current. Compare directly with v2. Guard: at most 2/20 regress from correct to wrong/refused. Off-topic: 10/10 refuse. Absent inputs: at least 8/10 refuse or identify missing input, zero invented values.',
  grading: 'Blind each answer against reference and prompt evidence. C correct, P partly correct, W wrong, R refused. Ignore incidental extra detail unless it changes the answer. Keep reference disputes distinct.',
};
const manifestPath = `${dir}/protocol.json`;
const manifest = JSON.stringify(frozen, null, 2) + '\n';
if (existsSync(manifestPath)) {
  if (readFileSync(manifestPath, 'utf8') !== manifest) throw new Error('Frozen experiment changed');
} else writeFileSync(manifestPath, manifest, { flag: 'wx' });
const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const key = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!key || !account || !/^[a-f0-9]{32}$/i.test(account)) throw new Error('Missing configured Cloudflare credentials');

const rows = lines(ledgerPath);
const priorCalls = new Map<string, any>();
const started = new Set<string>();
for (const row of rows) {
  if (row.kind === 'request') started.add(row.key);
  if (row.kind === 'response') priorCalls.set(row.key, row);
}
if ([...started].some(key => !priorCalls.has(key))) throw new Error('A previous request lacks confirmed usage. Stop for reconciliation.');
let spent = [...priorCalls.values()].reduce((total, row) => total + row.usage.neurons, 0);
async function call(id: string, system: string, prompt: string) {
  const existing = priorCalls.get(id);
  if (existing) {
    if (existing.promptSha256 !== sha(system + '\0' + prompt)) throw new Error('Cached answer has different prompt');
    return existing;
  }
  if (spent + reservation > cap) throw new Error(`Run budget reached (${spent.toFixed(1)} Neurons)`);
  const text = `<|im_start|>system\n${system}<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`;
  if (Buffer.byteLength(text) > 19000) throw new Error('Prompt exceeds reserved input budget');
  write(ledgerPath, { kind: 'request', key: id, at: new Date().toISOString(), reserved: reservation });
  let response: Response;
  try {
    response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(90000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ prompt: text, raw: true, stream: false, max_tokens: 512 }),
    });
  } catch { throw new Error(`Provider transport failed for ${id}`); }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Provider HTTP ${response.status} for ${id}`);
  }
  const body = await response.json();
  const result = body.result ?? body;
  const raw = result.choices?.[0]?.text?.trim();
  const usage = result.usage;
  if (body.success === false || !raw || !Number.isFinite(usage?.neurons) || usage.neurons < 0) throw new Error(`Provider answer or usage unavailable for ${id}`);
  const record = { kind: 'response', key: id, raw, usage, promptSha256: sha(system + '\0' + prompt), finish: result.choices[0].finish_reason };
  write(ledgerPath, record);
  priorCalls.set(id, record);
  spent += usage.neurons;
  return record;
}

const completed = new Set(lines(resultsPath).map(row => `${row.set}/${row.id}/${row.arm}`));
const arms = ['current', 'v2', 'v3'] as const;
for (const [i, row] of lines(cohort).entries()) {
  if (sha(row.prompt) !== row.promptSha256) throw new Error('Cohort prompt hash mismatch');
  const sequence = row.set === 'targets' || row.set === 'guards' ? arms.map((_, j) => arms[(i + j) % arms.length]) : ['v3'] as const;
  for (const arm of sequence) {
    const id = `${row.set}/${row.id}/${arm}`;
    if (completed.has(id)) continue;
    const system = arm === 'current' ? C_SYSTEM_PROMPT : arm === 'v2' ? v2 : v3;
    const prompt = arm === 'current' ? row.prompt : row.prompt.replace(C_REMINDER, reminder);
    const context = contextOf(row.prompt, C_REMINDER);
    const initial = await call(id, system, prompt);
    const process = arm === 'v2' ? v2Process : v3Process;
    const first = arm === 'current' ? null : process(initial.raw, context, row.question);
    let final = first;
    let second;
    if (arm === 'v3' && first && !first.produced && first.reason.startsWith('prose number not in context:')) {
      second = await call(`${id}/format-retry`, system, `${prompt}\n\n${retry}`);
      const candidate = process(second.raw, context, row.question);
      // Only accept a format retry when it actually computed and displayed a result.
      if (candidate.status === 'computed' && candidate.placeholdersUsed > 0) final = candidate;
    }
    write(resultsPath, { set: row.set, id: row.id, arm, answer: final?.final ?? initial.raw, first, final, retried: !!second,
      neurons: initial.usage.neurons + (second?.usage.neurons ?? 0), usedPower: !!final?.calcs.some(calc => calc.expr.includes('^')), finished: second?.finish ?? initial.finish });
    console.log(id, final?.status ?? 'plain', second ? 'retried' : '', spent.toFixed(1));
  }
}
console.log(`Completed. Total ${spent.toFixed(2)} Neurons.`);
