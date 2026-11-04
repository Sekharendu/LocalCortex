import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openRemaining } from './remaining-guard-2.mjs';
function setup(count) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'remaining-rerank-'));
  const prior = path.join(root, 'prior.jsonl');
  fs.writeFileSync(prior, Array.from({ length: count }, (_, i) => JSON.stringify({ event: 'reserved', attempt: i + 1, caseId: 'old' + i, mode: 'dense' })).join('\n'));
  return { dir: path.join(root, 'new'), prior };
}
test('inherits budget, reserves before dispatch, refuses duplicate and restart', async () => {
  const { dir, prior } = setup(467), run = openRemaining(dir, prior);
  await assert.rejects(run.attempt({ caseId: 'old0', mode: 'dense' }, () => assert.fail('duplicate')));
  await run.attempt({ caseId: 'new', mode: 'dense' }, async () => {
    assert.equal(run.count, 468); assert.match(fs.readFileSync(path.join(dir, 'attempts.jsonl'), 'utf8'), /reserved/);
  });
  await assert.rejects(run.attempt({ caseId: 'extra', mode: 'dense' }, () => assert.fail('over budget')));
  run.close(); assert.throws(() => openRemaining(dir, prior));
});
test('timeout is never retried; quota failure stops future calls', async () => {
  const { dir, prior } = setup(19), run = openRemaining(dir, prior);
  await assert.rejects(run.attempt({ caseId: 'timeout', mode: 'dense' }, async () => { throw Error('Reranking cancelled or timed out'); }));
  await assert.rejects(run.attempt({ caseId: 'timeout', mode: 'dense' }, () => assert.fail('retry')));
  await run.attempt({ caseId: 'other', mode: 'dense' }, async () => []);
  await assert.rejects(run.attempt({ caseId: 'quota', mode: 'dense' }, async () => { throw Error('Cloudflare reranking HTTP 429'); }));
  await assert.rejects(run.attempt({ caseId: 'later', mode: 'dense' }, () => assert.fail('continued after quota'))); run.close();
});
test('lock and dispatch concurrency are exclusive', async () => {
  const { dir, prior } = setup(1), run = openRemaining(dir, prior); assert.throws(() => openRemaining(dir, prior));
  let release; const p = run.attempt({ caseId: 'a', mode: 'dense' }, () => new Promise(r => { release = r; }));
  await assert.rejects(run.attempt({ caseId: 'b', mode: 'dense' }, () => assert.fail('overlap')));
  release(); await p; run.close();
});

test('transient fetch failure records failure without retry; malformed JSON stops', async () => {
 const {dir,prior}=setup(49), run=openRemaining(dir,prior);
 await assert.rejects(run.attempt({caseId:'network',mode:'dense'}, async()=>{throw new Error('Cloudflare reranking failed',{cause:new TypeError('fetch failed')});}));
 await assert.rejects(run.attempt({caseId:'network',mode:'dense'},()=>assert.fail('retry')));
 await run.attempt({caseId:'next',mode:'dense'},async()=>[]);
 await assert.rejects(run.attempt({caseId:'json',mode:'dense'},async()=>{throw new Error('Cloudflare reranking failed',{cause:new SyntaxError('invalid')});}));
 await assert.rejects(run.attempt({caseId:'extra',mode:'dense'},()=>assert.fail('continued after contract failure')));run.close();
});
