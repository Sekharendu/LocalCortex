import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const BASE = path.resolve('eval/exact-quote-v2');
export const OLD = path.resolve('eval/runs/seed42');
export const DIAG = 'C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/full-failure-diagnosis';
export const RUN = 'C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-scoped-hybrid-r4';
export const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
export const lines = f => fs.readFileSync(f, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
export const sha = x => crypto.createHash('sha256').update(x).digest('hex');
export const normalize = value => String(value ?? '').replace(/\s+/gu, ' ').trim();
export function save(relative, value) {
  const file = path.resolve(BASE, relative);
  if (!file.startsWith(BASE + path.sep)) throw Error('Output escapes new evaluation folder');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
export function inside(root, relative) {
  const resolvedRoot = fs.realpathSync(root), file = fs.realpathSync(path.resolve(root, relative));
  if (!file.startsWith(resolvedRoot + path.sep)) throw Error('Input path escapes evidence root');
  return file;
}
export function devOnly(paperId, split) {
  if (!split.dev.includes(paperId) || split.test.includes(paperId)) throw Error('Held-out paper denied');
}
export function occurrences(text, quote) {
  if (!quote) return [];
  const ranges = [];
  for (let from = 0; from <= text.length - quote.length;) {
    const start = text.indexOf(quote, from);
    if (start < 0) break;
    ranges.push({ start, end: start + quote.length });
    from = start + 1;
  }
  return ranges;
}
export const intersects = (a, b) => a.start < b.end && b.start < a.end;
export function goldFromReferences(answers, source) {
  const quotes = [];
  for (const [referenceIndex, answer] of answers.entries()) {
    if (answer.unanswerable) continue;
    for (const [spanIndex, text] of (answer.extractive_spans ?? []).entries()) {
      if (normalize(text)) quotes.push({ text, referenceIndex, spanIndex, kind: 'annotated-extractive-answer' });
    }
    // A free-form answer is retained literally, never paraphrased into a source quote.
    if (!(answer.extractive_spans ?? []).length && normalize(answer.free_form_answer)) {
      quotes.push({ text: answer.free_form_answer, referenceIndex, kind: 'literal-free-form-answer' });
    }
  }
  const unique = [...new Map(quotes.map(q => [normalize(q.text), q])).values()];
  return unique.map(q => ({ ...q, normalized: normalize(q.text), ranges: occurrences(source, normalize(q.text)) }));
}
export function chunkLocation(chunk, source) {
  const normalized = normalize(chunk.text ?? chunk.payload?.text);
  const ranges = occurrences(source, normalized);
  // Repeated text has no unique coordinate. Exact quote containment can still count.
  return { normalized, ranges: ranges.length === 1 ? ranges : [], ambiguousLocation: ranges.length > 1 };
}
export function match(chunk, gold, source) {
  const location = chunkLocation(chunk, source);
  for (const [goldIndex, quote] of gold.entries()) {
    if (!quote.normalized) continue;
    if (location.normalized.includes(quote.normalized)) return { goldIndex, kind: 'exact-quote', quote: quote.text };
    for (const a of location.ranges) for (const b of quote.ranges) {
      if (intersects(a, b)) return { goldIndex, kind: 'source-range-overlap', quote: quote.text, chunkRange: a, goldRange: b, overlapCharacters: Math.min(a.end, b.end) - Math.max(a.start, b.start) };
    }
  }
  return null;
}
export function mappingStatus(gold, answers) {
  if (answers.length && answers.every(a => a.unanswerable)) return 'unanswerable';
  if (!gold.length) return 'no-literal-answer-quote';
  return gold.some(q => q.ranges.length) ? 'mapped' : 'quote-not-found-in-extracted-paper';
}
export function randomSample(rows, count, seed = 42) {
  let a = seed >>> 0;
  const random = () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const copy = [...rows].sort((x, y) => x.caseId.localeCompare(y.caseId));
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy.slice(0, count);
}
