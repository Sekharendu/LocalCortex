import test from 'node:test';
import assert from 'node:assert/strict';
import { splitPapers, answerability, assertDev, evidenceHit, anchorsFromDiagnosis, sha } from './shared.mjs';

test('seeded paper split preserves PDF/DOCX groups and is reproducible', () => {
  const metadata = Array.from({ length: 20 }, (_, i) => ['pdf', ...(i % 2 ? ['docx'] : [])].map(format => ({ paperId: String(i), format, answerability: i % 3 ? 'answerable' : 'unanswerable' }))).flat();
  const split = splitPapers(metadata);
  assert.deepEqual(split, splitPapers([...metadata].reverse()));
  assert.equal(split.dev.length, 14); assert.equal(split.test.length, 6);
  assert.equal(split.dev.filter(id => split.test.includes(id)).length, 0);
  assert.equal(new Set([...split.dev, ...split.test]).size, 20);
});
test('mixed answerability is preserved rather than forced into a binary label', () => {
  assert.equal(answerability([{ unanswerable: true }, { unanswerable: false }]), 'mixed');
  assert.equal(answerability([{ unanswerable: false }]), 'answerable');
  assert.equal(answerability([{ unanswerable: true }]), 'unanswerable');
  assert.equal(answerability([]), 'unknown');
});
test('held-out and unknown paper reads are denied', () => {
  assert.throws(() => assertDev('held', { dev: ['dev'], test: ['held'] }));
  assert.throws(() => assertDev('unknown', { dev: ['dev'], test: ['held'] }));
  assertDev('dev', { dev: ['dev'], test: ['held'] });
});
test('evidence needs matching document, chunk identity and exact text hash', () => {
  const anchors = [{ documentId: 'd', chunkIndex: 3, textSha256: sha('answer text') }];
  assert.equal(evidenceHit([{ documentId: 'd', chunkIndex: 3, text: 'answer text' }], anchors).length, 1);
  for (const c of [{ documentId: 'other', chunkIndex: 3, text: 'answer text' }, { documentId: 'd', chunkIndex: 2, text: 'answer text' }, { documentId: 'd', chunkIndex: 3, text: 'changed answer' }]) assert.equal(evidenceHit([c], anchors).length, 0);
});
test('invalid diagnostic point identities fail closed', () => {
  assert.throws(() => anchorsFromDiagnosis({ sourcePointers: { documentId: 'd' }, sourceEvidence: [{ pointId: 'missing' }] }, []));
});
