import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, occurrences, goldFromReferences, match, mappingStatus, randomSample } from './common.mjs';

test('whitespace only; preserve case, punctuation, Unicode and math', () => {
  assert.equal(normalize(' A\n\tB '), 'A B');
  for (const [a, b] of [['A', 'a'], ['(1-p)', '(1 − p)'], ['ﬁ', 'fi'], ['x-y', 'xy']]) assert.notEqual(normalize(a), normalize(b));
});
test('whole quote containment, never fuzzy, prefix or reversed containment', () => {
  const source = 'AAA the exact answer ZZZ';
  const gold = [{ text: 'the exact answer', normalized: 'the exact answer', ranges: [] }];
  assert.equal(match({ text: source }, gold, source).kind, 'exact-quote');
  assert.equal(match({ text: 'the exact' }, gold, 'unrelated source'), null);
  assert.equal(match({ text: 'the EXACT answer' }, gold, source), null);
});
test('true same-paper range overlap is allowed across chunk boundaries', () => {
  const source = 'prefix the exact answer suffix';
  const gold = [{ text: 'the exact answer', normalized: 'the exact answer', ranges: occurrences(source, 'the exact answer') }];
  const hit = match({ text: 'prefix the exact' }, gold, source);
  assert.equal(hit.kind, 'source-range-overlap'); assert.ok(hit.overlapCharacters > 0);
  assert.equal(match({ text: 'suffix' }, gold, source), null);
  assert.equal(match({ text: 'the exact' }, gold, 'different paper'), null);
});
test('repeated chunk text cannot invent a unique coordinate', () => {
  const source = 'x answer x answer';
  assert.equal(match({ text: 'x' }, [{ text: 'x answer', normalized: 'x answer', ranges: [{ start: 0, end: 8 }] }], source), null);
});
test('gold comes from answer quotes, never supporting evidence or keyword fragments', () => {
  const answers = [{ unanswerable: false, extractive_spans: ['the complete answer'], evidence: ['dynamic'], free_form_answer: '' }];
  const gold = goldFromReferences(answers, 'dynamic is not the complete answer');
  assert.equal(gold.length, 1); assert.equal(gold[0].text, 'the complete answer');
  assert.equal(match({ text: 'dynamic' }, gold, 'dynamic is not the complete answer'), null);
});
test('unmapped and yes/no/unanswerable cases retain explicit status', () => {
  assert.equal(mappingStatus(goldFromReferences([{ extractive_spans: ['$(1-p)$'] }], '(1 − p)'), []), 'quote-not-found-in-extracted-paper');
  assert.equal(mappingStatus([], [{ unanswerable: false, yes_no: true }]), 'no-literal-answer-quote');
  assert.equal(mappingStatus([], [{ unanswerable: true }]), 'unanswerable');
});
test('random samples reproduce with seed42', () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ caseId: String(i) }));
  assert.deepEqual(randomSample(rows, 10), randomSample(rows, 10));
  assert.equal(new Set(randomSample(rows, 10).map(x => x.caseId)).size, 10);
});
