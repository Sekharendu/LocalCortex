import fs from 'node:fs';
import path from 'node:path';
export { OLD, DIAG, RUN, read, lines, sha, normalize, inside, devOnly, match, addBoundary, itemRank } from '../question-only-same-paper-20261102/common.mjs';
export const BASE = path.resolve('eval/q-dense-vs-hybrid-20261102');
export function save(relative, value) {
  const file = path.resolve(BASE, relative);
  if (!file.startsWith(BASE + path.sep)) throw Error('Output escapes new eval folder');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
export function denseStage(body, trace) {
  if (body.prefetch || body.using !== 'dense' || !Array.isArray(body.query) || body.limit !== 50) throw Error('Not the unchanged dense top50 path');
  if (body.score_threshold === 0.63 && trace.denseSearchCalls === 0) return 'initial';
  if (body.score_threshold === 0 && trace.denseSearchCalls === 1 && trace.denseGatePassed === true && trace.returnedAboveThreshold < 50) return 'expansion';
  throw Error('Unexpected dense gate/expansion request');
}
