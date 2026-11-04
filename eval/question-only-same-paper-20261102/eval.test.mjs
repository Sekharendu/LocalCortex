import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BASE, read, lines, addBoundary } from './common.mjs';
import { scoreItems } from '../ap-query-form-20261102/metrics.mjs';

test('Q keeps P question text and A scope for every case, without editing gold', () => {
  const baseline = lines('eval/ap-query-form-20261102/case-plan.jsonl');
  const q = lines(BASE + '/case-plan.jsonl');
  assert.equal(q.length, 459);
  for (const c of q) {
    const old = baseline.find(x => x.caseId === c.caseId);
    assert.equal(c.variants.Q.question, old.variants.P.question);
    assert.equal(c.variants.Q.embeddingInput, old.variants.P.embeddingInput);
    assert.equal(c.variants.Q.keywordInput, old.variants.P.keywordInput);
    assert.deepEqual(c.variants.Q.scope, old.variants.A.scope);
    assert.deepEqual(c.items, old.items);
  }
});
test('19 missing paper identities are retained rather than replaced with annotation IDs', () => {
  const q = lines(BASE + '/case-plan.jsonl').filter(x => x.group === 'scope_rejection');
  assert.equal(q.length, 19); assert.ok(q.every(x => x.variants.Q.scope.documentIds.length === 0));
});
test('Q keeps a real per-paper filter plus the same dev boundary', () => {
  const body = { filter: { must: [{ key: 'documentId', match: { any: ['paper1'] } }] } };
  addBoundary(body, ['paper1', 'paper2'], ['paper1']);
  assert.deepEqual(body.filter.must[0].match.any, ['paper1']); assert.deepEqual(body.filter.must[1].match.any, ['paper1', 'paper2']);
});
test('item scoring still computes recall and reciprocal ranks per mapped quote', () => {
  const result = scoreItems([{ items: [{ mapping: 'mapped', rank: 1 }, { mapping: 'mapped', rank: 10 }, { mapping: 'mapped', rank: null }] }]);
  assert.equal(result.r5, 1 / 3); assert.equal(result.r10, 2 / 3); assert.equal(result.mrr, (1 + 1 / 10) / 3);
});
test('split is unchanged', () => {
  const p = read(BASE + '/preflight.json');
  assert.equal(read('eval/split.json').seed, 42); assert.ok(fs.existsSync(BASE + '/baseline-input-manifest.json')); assert.equal(p.splitSha256, '8b9d27fdca32d319355d92da0cce5f430b4725bb0cdc00faa7140b218da560c8');
});
