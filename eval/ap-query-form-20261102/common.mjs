import fs from 'node:fs';
import path from 'node:path';
export { OLD, DIAG, RUN, read, lines, sha, normalize, inside, devOnly, match } from '../exact-quote-v2/common.mjs';
export const BASE = path.resolve('eval/ap-query-form-20261102');
export function save(relative, value) {
  const file = path.resolve(BASE, relative);
  if (!file.startsWith(BASE + path.sep)) throw Error('Output escapes new eval folder');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
export const lengthGroup = quote => quote.trim().split(/\s+/u).length >= 4 ? '4+ words' : 'under 4 words';
export function addBoundary(body, allowedDocs, productionDocs) {
  const must = body.filter?.must ?? [];
  const existing = must.filter(x => x.key === 'documentId');
  if (productionDocs !== undefined) {
    if (!productionDocs.length) throw Error('Rejected scope attempted network search');
    if (!existing.length) throw Error('Scoped production request lost its filter');
    for (const condition of existing) {
      const ids = condition.match?.any ?? (condition.match?.value ? [condition.match.value] : []);
      if (!ids.length || ids.some(id => !productionDocs.includes(id) || !allowedDocs.includes(id))) throw Error('Production scope escaped dev allowlist');
    }
  } else if (existing.length) throw Error('Unexpected per-paper filter on unrestricted production request');
  // This is a common dataset boundary, not a gold-paper selector. It is applied
  // to both variants and every dense/sparse prefetch, before the network request.
  body.filter = { ...(body.filter ?? {}), must: [...must, { key: 'documentId', match: { any: allowedDocs } }] };
  for (const child of body.prefetch ?? []) addBoundary(child, allowedDocs, productionDocs);
  return body;
}
export function itemRank(item, chunks, source, targetDocumentId, matcher) {
  if (!item.ranges.length) return { rank: null, mapping: 'unmapped', method: null };
  for (let index = 0; index < chunks.length; index++) {
    if (chunks[index].documentId !== targetDocumentId) continue;
    const result = matcher(chunks[index], [item], source);
    if (result) return { rank: index + 1, mapping: 'mapped', method: result.kind };
  }
  return { rank: null, mapping: 'mapped', method: null };
}
