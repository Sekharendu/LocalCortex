import fs from 'node:fs';
import crypto from 'node:crypto';
import { openRun } from './guard.mjs';
import { rerank, RERANK_MODEL } from '../../src/retrieval/reranker.ts';
const base = 'eval/reranker-dev-20261102-live-r2';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const r1 = read('eval/reranker-dev-20261102-r1/submission/manifest.json');
for (const f of r1.files) if (sha(fs.readFileSync(f.file)) !== f.sha256) throw Error('Reviewed r1 file changed: ' + f.file);
const sampleFile = 'eval/reranker-dev-20261102-r1/sample-manifest.json';
const sample = read(sampleFile), requestsFile = 'eval/reranker-dev-20261102-r1/requests.jsonl';
const rows = fs.readFileSync(requestsFile, 'utf8').trim().split('\n').map(JSON.parse);
for (const f of sample.inputs) if (sha(fs.readFileSync(f.file)) !== f.sha256) throw Error('Frozen input changed');
if (rows.length !== 40 || new Set(rows.map(r => r.caseId)).size !== 20) throw Error('Unexpected sample size');
const split = read('eval/split.json');
for (const row of rows) {
  if (!split.dev.includes(row.paperId) || split.test.includes(row.paperId)) throw Error('Non-dev case');
  if (!sample.sampleIds.some(c => c.caseId === row.caseId && c.group === row.group)) throw Error('Case outside frozen sample');
}
// Read backend credentials internally; never print the file, account ID or token.
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = /^(?:export\s+)?(CLOUDFLARE_ACCOUNT_ID|CLOUDFLARE_API_TOKEN)\s*=\s*(.*)$/.exec(line.trim());
  if (m) { let value = m[2].trim(); if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1); process.env[m[1]] = value; }
}
if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) throw Error('Backend credentials unavailable');
const run = openRun(base);
const append = (file, row) => fs.appendFileSync(`${base}/${file}`, JSON.stringify(row) + '\n');
const save = (file, value) => fs.writeFileSync(`${base}/${file}`, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const nativeFetch = globalThis.fetch;
let active = null;
// Observe only sanitized status/request identifiers and numeric usage. No body text is logged.
globalThis.fetch = async (url, init) => {
  if (!active || String(url) !== `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID.trim()}/ai/run/${RERANK_MODEL}`) throw Error('Unapproved endpoint');
  const response = await nativeFetch(url, init);
  const requestId = response.headers.get('cf-ray') ?? response.headers.get('x-request-id');
  append('http-observations.jsonl', { attempt: run.count, status: response.status, requestId: requestId && /^[A-Za-z0-9_-]{1,160}$/.test(requestId) ? requestId : null });
  if (!response.body) return response;
  const decoder = new TextDecoder(); let text = '', bytes = 0;
  const body = response.body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      bytes += chunk.byteLength;
      if (bytes <= 65536) text += decoder.decode(chunk, { stream: true });
      controller.enqueue(chunk);
    },
    flush() {
      if (bytes > 65536) return;
      try {
        const json = JSON.parse(text + decoder.decode());
        const raw = json.usage ?? json.result?.usage;
        const usage = raw && typeof raw === 'object' ? Object.fromEntries(Object.entries(raw).filter(([k, v]) => /^[a-zA-Z0-9_]{1,80}$/.test(k) && typeof v === 'number' && Number.isFinite(v))) : null;
        append('usage-observations.jsonl', { attempt: run.count, usage, evidence: usage ? 'numeric provider response usage' : 'No provider usage object present' });
      } catch { /* The reviewed client validates and fails closed on malformed bodies. */ }
    },
  }));
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
};
const chunk = (text, i) => ({ text, source: 'synthetic', documentId: 'synthetic', chunkIndex: i, score: 1 - i / 100 });
const smokes = [
  { id: 'smoke-animal', query: 'Which animal barks?', texts: ['A cat meows.', 'A dog barks.', 'A fish swims.'], expectedFirst: 1 },
  { id: 'smoke-location', query: 'Where is the Eiffel Tower?', texts: ['The Eiffel Tower is in Paris, France.', 'Coffee contains caffeine.'], expectedFirst: 0 },
  { id: 'smoke-fifty', query: 'Which passage describes photosynthesis?', texts: Array.from({ length: 50 }, (_, i) => i === 37 ? 'Photosynthesis converts light energy into chemical energy in plants.' : `Inventory entry ${i} records shipping cartons and warehouse shelving.`), expectedFirst: 37 },
  { id: 'smoke-long', query: 'What procedure checks a backup?', texts: ['Backup verification restores files to a temporary folder and compares checksums. '.repeat(8), 'The garden has roses and tulips beside a winding gravel path. '.repeat(10)], expectedFirst: 0 },
];
let status = 'complete', failure = null;
try {
  save('authorization.json', { plan: 'RERANK-1', userReportedAtClientDate: '2026-11-02', userReported: 'Free plan, and 0 neurons used as of today', evidenceType: 'USER-REPORTED dashboard confirmation, not API verified', apiEvidence: 'Token active; subscription and billable-usage reads HTTP403/code10000', maxAttempts: 44, maxSynthetic: 4, maxDev: 40, serial: true, retries: 0, providerUsage: 'Captured only when present; no inferred neuron totals', r1ManifestSha256: sha(fs.readFileSync('eval/reranker-dev-20261102-r1/submission/manifest.json')), sampleSha256: sha(fs.readFileSync(sampleFile)), requestsSha256: sha(fs.readFileSync(requestsFile)) });
  async function execute(metadata, query, candidates) {
    if (!candidates.length) { append('skips.jsonl', { ...metadata, reason: 'empty upstream retrieval', providerCalls: 0 }); return []; }
    active = metadata;
    try {
      return await run.attempt({ ...metadata, model: RERANK_MODEL, queryBytes: Buffer.byteLength(query), candidateCount: candidates.length,
        candidateBytes: candidates.map(c => Buffer.byteLength(c.text)), payloadBytes: Buffer.byteLength(JSON.stringify({ query, contexts: candidates.map(c => ({ text: c.text })), top_k: candidates.length })),
        payloadSha256: sha(JSON.stringify({ query, candidates })) }, () => rerank(query, candidates, candidates.length));
    } finally { active = null; }
  }
  for (const smoke of smokes) {
    const candidates = smoke.texts.map(chunk), ranked = await execute({ kind: 'synthetic', id: smoke.id }, smoke.query, candidates);
    append('smoke-results.jsonl', { id: smoke.id, indices: ranked.map(c => c.chunkIndex), scores: ranked.map(c => c.rerankScore), expectedFirst: smoke.expectedFirst, coarseOrderingPass: ranked[0].chunkIndex === smoke.expectedFirst });
  }
  for (const row of rows) {
    const ranked = await execute({ kind: 'dev', caseId: row.caseId, mode: row.mode }, row.query, row.candidates);
    const key = c => JSON.stringify([c.documentId, c.chunkIndex, c.source, c.page, c.text, c.score]);
    const byKey = new Map(row.candidates.map((c, i) => [key(c), i]));
    const indices = ranked.map(c => byKey.get(key(c)));
    if (byKey.size !== row.candidates.length || indices.some(i => i === undefined) || new Set(indices).size !== indices.length) throw Error('Cross-case or ambiguous candidate mapping');
    append('reranked-results.jsonl', { caseId: row.caseId, mode: row.mode, indices, scores: ranked.map(c => c.rerankScore) });
    console.log(JSON.stringify({ completedDevPools: fs.readFileSync(`${base}/reranked-results.jsonl`, 'utf8').trim().split('\n').length, attempts: run.count }));
  }
} catch (error) { status = 'stopped'; failure = error.name + ': ' + error.message; }
finally {
  globalThis.fetch = nativeFetch; run.close();
  const changedR1 = r1.files.filter(f => sha(fs.readFileSync(f.file)) !== f.sha256).map(f => f.file);
  save('execution.json', { status, failure, attempts: run.count, maximum: 44, answerGenerationCalls: 0, rewriteCalls: 0, newRetrievalCalls: 0, changedR1, completedAt: new Date().toISOString() });
}
console.log(JSON.stringify({ status, failure, attempts: run.count }));
if (status !== 'complete') process.exitCode = 2;
