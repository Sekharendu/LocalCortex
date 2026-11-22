import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { evaluate, processAnswer, REFUSAL } from './calc.mts';

const root = process.cwd();
const folder = path.resolve('eval/calc-in-code-v3-20261120');
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const report: { name: string; passed: boolean; error?: string }[] = [];
function test(name: string, check: () => void) {
  try { check(); report.push({ name, passed: true }); }
  catch (error) { report.push({ name, passed: false, error: String(error) }); }
}

test('power precedence and right association', () => {
  assert.equal(evaluate('2 ^ 3 ^ 2').value, 512);
  assert.equal(evaluate('-2 ^ 2').value, -4);
  assert.equal(evaluate('(-2) ^ 2').value, 4);
  assert.equal(evaluate('2 ^ -2').value, 0.25);
});
test('power domain and finite result checks', () => {
  for (const expression of ['(-2) ^ (1 / 2)', '0 ^ -1', '1000 ^ 1000', '2 ^', '2 ** 3']) assert.throws(() => evaluate(expression));
});
test('CAGR with real historical inputs', () => {
  const result = processAnswer('CALC: rate = ((65,984 / 65,398) ^ (1 / 2) - 1) * 100\nThe CAGR was {rate}%.', 'Net sales: 2022 65,984; 2020 65,398.', 'CAGR in percent, round to one decimal place');
  assert.equal(result.status, 'computed');
  assert.match(result.final, /0\.4%/);
});
test('missing power input refused', () => {
  assert.equal(processAnswer('CALC: x = 242 ^ (1 / 2)\nIt was {x}.', 'Revenue was 200.', 'What was the value?').final, REFUSAL);
});
test('question-only number cannot authorize calculation literal', () => {
  assert.equal(processAnswer('CALC: x = 999 / 2\nIt was {x}.', 'Revenue 200.', 'Was revenue 999?').final, REFUSAL);
});
test('calculation lines and placeholders are removed', () => {
  const result = processAnswer('CALC: x = 200 / 2\nThe value is {x}.', 'Revenue 200.', 'What was the value?');
  assert.equal(result.final, 'The value is 100.');
  assert.doesNotMatch(result.final, /CALC|[{}]/);
});

const promptModule = await import('../../src/generation/promptVariants.ts');
const context = 'Revenue was 200. Prior revenue was 160.';
const prompt = `Context passages:\n${context}\n\n${promptModule.C_REMINDER}\n\nQuestion: What is the revenue increase?\nAnswer:`;
const scenarios = [
  { name: 'valid calculation uses one v3 call', first: 'CALC: change = 200 - 160\nRevenue increased by {change}.', calls: 3, status: 'computed', answer: /40/ },
  { name: 'format retry accepted once', first: 'Revenue increased by 40.', second: 'CALC: change = 200 - 160\nRevenue increased by {change}.', calls: 4, status: 'computed', answer: /40/ },
  { name: 'retry with missing literal rejected', first: 'Revenue increased by 40.', second: 'CALC: change = 999 - 160\nRevenue increased by {change}.', calls: 4, status: 'fallback', answer: /^The provided context is insufficient/ },
  { name: 'retry without a calculation rejected without a third v3 call', first: 'Revenue increased by 40.', second: 'Revenue increased by 40.', calls: 4, status: 'fallback', answer: /^The provided context is insufficient/ },
  { name: 'retry with unused CALC rejected', first: 'Revenue increased by 40.', second: 'CALC: revenue = 200\nRevenue was 200.', calls: 4, status: 'fallback', answer: /^The provided context is insufficient/ },
  { name: 'direct lookup has no format retry', first: 'Revenue was 200.', calls: 3, status: 'no-calc', answer: /^Revenue was 200/ },
  { name: 'explicit refusal has no retry', first: REFUSAL, calls: 3, status: 'no-calc', answer: /^The provided context is insufficient/ },
  { name: 'missing calculation input has no retry', first: 'CALC: change = 999 - 160\nRevenue increased by {change}.', calls: 3, status: 'fallback', answer: /^The provided context is insufficient/ },
  { name: 'mixed prose and CALC retains known false refusal', first: 'Revenue increased by 40.\nCALC: change = 200 - 160\nRevenue increased by {change}.', calls: 3, status: 'fallback', answer: /^The provided context is insufficient/ },
  { name: 'provider HTTP failure stops with no retry', first: '', failure: 'http', calls: 3 },
  { name: 'provider transport failure stops with no retry', first: '', failure: 'transport', calls: 3 },
  { name: 'missing usage stops for reconciliation', first: '', failure: 'usage', calls: 3 },
];

for (const scenario of scenarios) {
  test(scenario.name, () => {
    const work = mkdtempSync(path.join(tmpdir(), 'finance-v3-validation-'));
    const output = path.join(work, 'run');
    // The actual experiment runner is executed against isolated files and an in-process provider mock.
    // Only import locations and the output directory change.
    const forward = output.replaceAll('\\', '/');
    const moduleUrl = (file: string) => pathToFileURL(path.join(root, file)).href;
    const original = readFileSync(path.join(folder, 'run.mts'), 'utf8');
    const runner = original.replace("const dir = 'eval/calc-in-code-v3-20261120';", `const dir = ${JSON.stringify(forward)};`)
      .replace("'./calc.mts'", JSON.stringify(moduleUrl('eval/calc-in-code-v3-20261120/calc.mts')))
      .replace("'../calc-in-code-v2-20261119/calc.mts'", JSON.stringify(moduleUrl('eval/calc-in-code-v2-20261119/calc.mts')))
      .replace("'../../src/generation/promptVariants.ts'", JSON.stringify(moduleUrl('src/generation/promptVariants.ts')));
    const cohort = [{ id: 'fixture', set: 'targets', question: 'What is the revenue increase?', prompt, promptSha256: sha(prompt) }];
    mkdirSync(output);
    writeFileSync(path.join(output, 'run.mts'), runner);
    copyFileSync(path.join(folder, 'calc.mts'), path.join(output, 'calc.mts'));
    writeFileSync(path.join(output, 'cohort.jsonl'), cohort.map(row => JSON.stringify(row)).join('\n') + '\n');
    writeFileSync(path.join(work, 'mock.mjs'), `
      import fs from 'node:fs';
      const scenario=${JSON.stringify(scenario)};
      let calls=0;
      globalThis.fetch=async (url,options)=>{
        if(!String(url).startsWith('https://api.cloudflare.com/client/v4/accounts/'+ 'a'.repeat(32) + '/ai/run/'))throw Error('Unexpected URL');
        const body=JSON.parse(options.body);
        if(body.max_tokens!==512 || body.stream!==false)throw Error('Unexpected request contract');
        calls++;
        fs.appendFileSync(${JSON.stringify(path.join(work, 'calls.jsonl'))},JSON.stringify({calls,prompt:body.prompt})+'\\n');
        if(calls===3 && scenario.failure==='transport')throw new Error('Mock connection failure');
        if(calls===3 && scenario.failure==='http')return new Response('quota',{status:429});
        const text=calls<3?'Revenue was 200.':calls===3?scenario.first:scenario.second;
        if(!text && !(calls===3 && scenario.failure==='usage'))throw Error('Unexpected extra call');
        const usage=calls===3 && scenario.failure==='usage'?null:{neurons:1};
        return Response.json({success:true,result:{choices:[{text:text||'Revenue was 200.',finish_reason:'stop'}],usage}});
      };
    `);
    try {
      const loader = pathToFileURL(path.join(root, 'node_modules/tsx/dist/loader.mjs')).href;
      const child = spawnSync(process.execPath, ['--import', loader, '--import', pathToFileURL(path.join(work, 'mock.mjs')).href, path.join(output, 'run.mts')], {
        cwd: root, encoding: 'utf8', timeout: 30000,
        env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_TOKEN: 'test-only-placeholder' },
      });
      assert.ok(existsSync(path.join(work, 'calls.jsonl')), `${child.error ?? ''} ${child.stderr}`);
      const calls = readFileSync(path.join(work, 'calls.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
      assert.equal(calls.length, scenario.calls, child.stderr);
      if (scenario.failure) {
        assert.notEqual(child.status, 0);
        const again = spawnSync(process.execPath, ['--import', loader, '--import', pathToFileURL(path.join(work, 'mock.mjs')).href, path.join(output, 'run.mts')], { cwd: root, encoding: 'utf8', timeout: 30000, env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_TOKEN: 'test-only-placeholder' } });
        assert.notEqual(again.status, 0);
        assert.match(again.stderr, /lacks confirmed usage/);
        assert.equal(readFileSync(path.join(work, 'calls.jsonl'), 'utf8').trim().split('\n').length, calls.length);
      } else {
        assert.equal(child.status, 0, child.stderr);
        const results = readFileSync(path.join(output, 'results.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
        const v3 = results.find(row => row.arm === 'v3');
        assert.equal(v3.final.status, scenario.status);
        assert.match(v3.answer, scenario.answer!);
        assert.doesNotMatch(v3.answer, /CALC|[{}]/);
        if (scenario.calls === 4) {
          assert.ok(calls[3].prompt.includes(context));
          assert.ok(calls[3].prompt.includes('Format check:'));
        }
      }
    } finally {
      // This is a freshly allocated test directory with no user files.
      assert.ok(path.resolve(work).startsWith(path.resolve(tmpdir()) + path.sep));
      rmSync(work, { recursive: true });
    }
  });
}

writeFileSync(path.join(folder, 'validation-20261121.json'), JSON.stringify({ at: new Date().toISOString(), tests: report, passed: report.filter(row => row.passed).length, failed: report.filter(row => !row.passed).length, provider: 'mock only' }, null, 2));
for (const row of report) console.log(row.passed ? 'PASS' : 'FAIL', row.name, row.error ?? '');
process.exitCode = report.some(row => !row.passed) ? 1 : 0;
