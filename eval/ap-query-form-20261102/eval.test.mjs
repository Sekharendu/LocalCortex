import test from 'node:test';
import assert from 'node:assert/strict';
import { addBoundary, lengthGroup, itemRank, match } from './common.mjs';
import { scoreItems, caseChanges } from './metrics.mjs';

test('production P stays per-question unrestricted; common dev boundary covers every prefetch', () => {
  const body = { prefetch: [{ using: 'dense' }, { using: 'sparse' }], limit: 50 };
  addBoundary(body, ['dev1', 'dev2'], undefined);
  for (const b of [body, ...body.prefetch]) assert.deepEqual(b.filter.must[0].match.any, ['dev1', 'dev2']);
  assert.throws(() => addBoundary({ filter: { must: [{ key: 'documentId', match: { any: ['gold'] } }] } }, ['dev1'], undefined));
});
test('scope A is preserved and cannot access a held-out document', () => {
  const body = { filter: { must: [{ key: 'documentId', match: { any: ['dev1'] } }] } };
  addBoundary(body, ['dev1', 'dev2'], ['dev1']); assert.equal(body.filter.must.length, 2);
  assert.throws(() => addBoundary({ filter: { must: [{ key: 'documentId', match: { any: ['test'] } }] } }, ['dev1'], ['test']));
  assert.throws(() => addBoundary({}, ['dev1'], []));
});
test('an exact short quote in another paper is not a gold hit', () => {
  const item = { text: 'BERT', normalized: 'BERT', ranges: [{ start: 0, end: 4 }] };
  const chunks = [{ text: 'BERT', documentId: 'other' }, { text: 'BERT', documentId: 'target' }];
  assert.equal(itemRank(item, chunks, 'BERT', 'target', match).rank, 2);
});
test('word buckets preserve literal quote and use whitespace-delimited word counts', () => {
  assert.equal(lengthGroup('a b c'), 'under 4 words'); assert.equal(lengthGroup('a\nb c d'), '4+ words');
  assert.equal(lengthGroup('F-score'), 'under 4 words');
});
test('item recall and MRR score every mapped item, not any-hit cases', () => {
  const r = [{ items: [{ mapping: 'mapped', rank: 2 }, { mapping: 'mapped', rank: 20 }, { mapping: 'mapped', rank: null }, { mapping: 'unmapped', rank: null }] }];
  const m = scoreItems(r); assert.equal(m.mappedItems, 3); assert.equal(m.r5, 1 / 3); assert.equal(m.r20, 2 / 3); assert.equal(m.mrr, (1 / 2 + 1 / 20) / 3);
});
test('paired case pass changes distinguish A-only and P-only', () => {
  const item = (itemId, rank) => ({ itemId, rank, mapping: 'mapped' });
  const r = [{ caseId: 'a', group: 'g', variant: 'A', items: [item('a/0', 1)] }, { caseId: 'a', group: 'g', variant: 'P', items: [item('a/0', null)] }, { caseId: 'b', group: 'g', variant: 'A', items: [item('b/0', null)] }, { caseId: 'b', group: 'g', variant: 'P', items: [item('b/0', 5)] }];
  const d = caseChanges(r, 5, 'g'); assert.equal(d.Aonly, 1); assert.equal(d.Ponly, 1); assert.equal(d.different, 2);
});
