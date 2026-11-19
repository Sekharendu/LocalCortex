import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = path.resolve('eval');
export const ARTIFACTS = 'C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a';
export const DIAG = path.join(ARTIFACTS, 'full-failure-diagnosis');
export const RUN = path.join(ARTIFACTS, 'qasper-scoped-hybrid-r4');
export const OUT = path.join(ROOT, 'runs/seed42');
export const CANONICAL_HASH = 'e63b950f3f0ce225ea51b6a2c8914716b3547368dfa7dcea5fcfc6bf44096cca';
export const sha = x => crypto.createHash('sha256').update(x).digest('hex');
export const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
export const lines = f => fs.readFileSync(f, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
export function write(file, value) {
  const resolved = path.resolve(file);
  if (!resolved.startsWith(ROOT + path.sep)) throw Error('Output outside eval/');
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
export const norm = x => String(x ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
export function assertDev(paperId, split) {
  if (!split.dev.includes(paperId) || split.test.includes(paperId)) throw Error('Held-out input denied');
}
export function safeInput(base, relative) {
  const root = fs.realpathSync(base), target = fs.realpathSync(path.resolve(root, relative));
  if (!target.startsWith(root + path.sep)) throw Error('Input escapes evidence root');
  return target;
}
export function answerability(answers) {
  const labels = answers.map(a => a.unanswerable);
  if (!labels.length || labels.some(x => typeof x !== 'boolean')) return 'unknown';
  return labels.every(Boolean) ? 'unanswerable' : labels.every(x => !x) ? 'answerable' : 'mixed';
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function splitPapers(metadata, seed = 42) {
  const ids = [...new Set(metadata.map(c => c.paperId))].sort();
  const strata = [...new Set(metadata.map(c => `${c.format}/${c.answerability}`))].sort();
  const totals = strata.map(s => metadata.filter(c => `${c.format}/${c.answerability}` === s).length);
  const vectors = new Map(ids.map(id => [id, strata.map(s => metadata.filter(c => c.paperId === id && `${c.format}/${c.answerability}` === s).length)]));
  const random = rng(seed), shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const selected = new Set(shuffled.slice(0, Math.round(ids.length * .7)));
  let counts = totals.map((_, i) => [...selected].reduce((n, id) => n + vectors.get(id)[i], 0));
  const score = v => v.reduce((n, x, i) => n + ((x - .7 * totals[i]) / Math.max(1, totals[i])) ** 2, 0);
  let current = score(counts);
  for (;;) {
    let best = current, swap;
    for (const a of ids.filter(id => selected.has(id))) for (const b of ids.filter(id => !selected.has(id))) {
      const v = counts.map((x, i) => x - vectors.get(a)[i] + vectors.get(b)[i]), s = score(v);
      if (s < best - 1e-12) { best = s; swap = [a, b, v]; }
    }
    if (!swap) break;
    selected.delete(swap[0]); selected.add(swap[1]); counts = swap[2]; current = best;
  }
  return { dev: ids.filter(id => selected.has(id)), test: ids.filter(id => !selected.has(id)), strata, totals, devStrataCounts: counts, balanceObjective: current };
}
export function counts(metadata, ids) {
  const rows = metadata.filter(c => ids.includes(c.paperId));
  return { papers: ids.length, assets: new Set(rows.map(c => `${c.format}/${c.paperId}`)).size, cases: rows.length,
    ...Object.fromEntries(['pdf', 'docx', 'failed', 'acceptable', 'ambiguous', 'answerable', 'unanswerable', 'mixed', 'unknown'].map(k => [k, rows.filter(c => c.format === k || c.verdict === k || c.answerability === k).length])) };
}
export function anchorsFromDiagnosis(d, chunks) {
  const byId = new Map(chunks.map(c => [String(c.pointId), c]));
  const found = new Map();
  for (const e of d.sourceEvidence ?? []) {
    const ids = [e.pointId, ...(e.chunkIds ?? [])].filter(Boolean);
    for (const id of ids) {
      const c = byId.get(String(id));
      if (!c || c.documentId !== d.sourcePointers.documentId) throw Error('Invalid diagnostic evidence identity');
      if (e.quote && !norm(c.payload.text).includes(norm(e.quote))) {
        // A multi-chunk quote may span a boundary. Require this point's text to
        // occur in that recorded quote rather than accepting an unrelated ID.
        if (!norm(e.quote).includes(norm(c.payload.text))) continue;
      }
      found.set(c.pointId, { pointId: c.pointId, documentId: c.documentId, chunkIndex: c.chunkIndex, textSha256: sha(c.payload.text), kind: 'diagnostic' });
    }
  }
  return [...found.values()];
}
export function evidenceHit(chunks, anchors) {
  return anchors.filter(a => chunks.some(c => c.documentId === a.documentId && c.chunkIndex === a.chunkIndex && sha(c.text) === a.textSha256));
}
