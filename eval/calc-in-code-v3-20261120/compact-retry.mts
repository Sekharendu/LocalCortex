import { appendFileSync, readFileSync } from 'node:fs';
import { processAnswer } from './calc.mts';

const dir = 'eval/calc-in-code-v3-20261120';
const replay = readFileSync(`${dir}/power-replay.jsonl`, 'utf8').trim().split('\n').map(line => JSON.parse(line));
const rows = {
  'tat-0723': 'Net cash used in financing activities (thousand dollars) | FY2019: (3,471) | FY2018: (36,014)',
  'tat-0751': 'Gross profit (thousand dollars) | first quarter: 72,383 | second quarter: 70,636',
};
const system = 'Use only the provided table row. Your previous answer gave a calculated value without the required CALC line. Try once more: start with CALC: change = expression using only the table values. Parentheses around a table value indicate a negative number. On a new line write one sentence with {change} in place of the result; do not calculate it yourself. If an input is missing, say which one.';
for (const [id, context] of Object.entries(rows)) {
  const saved = replay.find(row => row.id === id);
  if (!saved || saved.first.produced || !saved.first.reason.startsWith('prose number not in context:')) throw new Error(`Invalid retry case: ${id}`);
  const start = performance.now();
  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(120000),
      body: JSON.stringify({ model: 'llama3:latest', system, prompt: `${context}\n\nQuestion: ${saved.question}`, stream: false,
        options: { num_ctx: 2048, num_predict: 90, temperature: 0 } }),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
    const body = await response.json();
    if (typeof body.response !== 'string' || !body.response.trim()) throw new Error('No local answer');
    const result = processAnswer(body.response, context, saved.question);
    appendFileSync(`${dir}/compact-retry-results.jsonl`, JSON.stringify({ id, context, raw: body.response, result, seconds: (performance.now() - start) / 1000, finish: body.done_reason }) + '\n');
    console.log(id, result.status, result.final, 'reference', saved.reference);
  } catch (error) {
    appendFileSync(`${dir}/compact-retry-results.jsonl`, JSON.stringify({ id, error: String(error), seconds: (performance.now() - start) / 1000 }) + '\n');
    console.log(id, String(error));
  }
}
