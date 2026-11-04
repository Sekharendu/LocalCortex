import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE, read, lines, denseStage } from './common.mjs';

const body = threshold => ({ using: 'dense', query: [0.1], limit: 50, score_threshold: threshold });
test('dense starts with the unchanged thresholded top50 search', () => {
  assert.equal(denseStage(body(0.63), { denseSearchCalls: 0 }), 'initial');
  assert.throws(() => denseStage(body(0.5), { denseSearchCalls: 0 }));
});
test('same-document fill requires a successful initial search and fewer than50hits', () => {
  assert.equal(denseStage(body(0), { denseSearchCalls: 1, denseGatePassed: true, returnedAboveThreshold: 3 }), 'expansion');
  assert.throws(() => denseStage(body(0), { denseSearchCalls: 0 }));
  assert.throws(() => denseStage(body(0), { denseSearchCalls: 1, denseGatePassed: false, returnedAboveThreshold: 0 }));
  assert.throws(() => denseStage(body(0), { denseSearchCalls: 1, denseGatePassed: true, returnedAboveThreshold: 50 }));
});
test('hybrid prefetch and changed limits are rejected', () => {
  assert.throws(() => denseStage({ ...body(0.63), prefetch: [] }, { denseSearchCalls: 0 }));
  assert.throws(() => denseStage({ ...body(0.63), limit: 5 }, { denseSearchCalls: 0 }));
});
test('all dense questions/scopes/gold equal the Q hybrid baseline', () => {
  const old = lines('eval/question-only-same-paper-20261102/case-plan.jsonl');
  const current = lines(BASE + '/case-plan.jsonl'); assert.deepEqual(current, old); assert.equal(current.length, 459);
});
test('split seed and19scope rejections remain unchanged', () => {
  assert.equal(read('eval/split.json').seed, 42);
  assert.equal(lines(BASE + '/case-plan.jsonl').filter(x => x.variants.Q.scope.documentIds?.length === 0).length, 19);
});
