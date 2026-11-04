import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openRun } from './guard.mjs';
const folder = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rerank-guard-'));
test('reserves before dispatch, enforces 44 attempts and cannot restart', async () => {
  const dir = folder(), run = openRun(dir);
  for (let i = 1; i <= 44; i++) await run.attempt({ kind: 'mock' }, async () => {
    const rows = fs.readFileSync(path.join(dir, 'attempts.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(rows.at(-1).event, 'reserved'); assert.equal(rows.at(-1).attempt, i);
  });
  await assert.rejects(run.attempt({}, () => assert.fail('45th dispatched')));
  run.close(); assert.throws(() => openRun(dir));
});
test('failure stops all future attempts without retry', async () => {
  const run = openRun(folder());
  await assert.rejects(run.attempt({}, async () => { throw Error('HTTP 429'); }));
  assert.equal(run.count, 1);
  await assert.rejects(run.attempt({}, () => assert.fail('retry dispatched'))); run.close();
});
test('one active worker and one active dispatch only', async () => {
  const dir = folder(), run = openRun(dir); assert.throws(() => openRun(dir));
  let release; const first = run.attempt({}, () => new Promise(resolve => { release = resolve; }));
  await assert.rejects(run.attempt({}, () => assert.fail('overlap dispatched')));
  release(); await first; run.close();
});
