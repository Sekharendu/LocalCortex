import fs from 'node:fs';
import path from 'node:path';
export { OLD, DIAG, RUN, read, lines, sha, normalize, inside, devOnly, match, addBoundary, itemRank } from '../ap-query-form-20261102/common.mjs';
export const BASE = path.resolve('eval/question-only-same-paper-20261102');
export function save(relative, value) {
  const file = path.resolve(BASE, relative);
  if (!file.startsWith(BASE + path.sep)) throw Error('Output escapes new evaluation folder');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
