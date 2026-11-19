import fs from 'node:fs';
import crypto from 'node:crypto';
import { openRemaining } from './remaining-guard.mjs';
import { rerank, RERANK_MODEL } from '../../src/retrieval/reranker.ts';
const parent = 'eval/dev-rerank-20261103';
const base = parent + '/continuation';
for (const h of JSON.parse(fs.readFileSync(parent + '/manifest.json')).inputHashes) if (crypto.createHash('sha256').update(fs.readFileSync(h.file)).digest('hex') !== h.sha256) throw Error('Initial inputs changed');
const retrieval = 'eval/dev-retrieval-20261103';
const prepared = 'eval/dev-set-preparation-20261103';
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const read = f => JSON.parse(fs.readFileSync(f));
const lines = f => fs.readFileSync(f, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const save = (f, value) => fs.writeFileSync(`${base}/${f}`, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const append = (f, value) => fs.appendFileSync(`${base}/${f}`, JSON.stringify(value) + '\n');
const ready = lines(`${prepared}/ready.jsonl`), split = read('eval/split.json');
if (ready.length !== 234 || hash(fs.readFileSync('eval/split.json')) !== read(`${prepared}/summary.json`).splitSha256) throw Error('Prepared split/count changed');
const rows = ['pdf', 'docx'].flatMap(format => {
  const execution = read(`${retrieval}/${format}.execution.json`);
  if (execution.status !== 'complete' || execution.changedInputs.length) throw Error('Retrieval incomplete');
  for (const h of read(`${retrieval}/${format}.manifest.json`).hashes) if (hash(fs.readFileSync(h.file)) !== h.sha256) throw Error('Retrieval input changed');
  return lines(`${retrieval}/${format}.results.jsonl`).filter(r => r.requestedK === 50);
});
if (rows.length !== 468 || new Set(rows.map(r => r.mode + ':' + r.caseId)).size !== 468) throw Error('Unexpected pools');
for (const r of rows) {
  const c = ready.find(c => c.caseId === r.caseId);
  if (!c || c.question !== r.question || !split.dev.includes(c.paperId) || split.test.includes(c.paperId)) throw Error('Dev identity mismatch');
  if (r.chunks.length > 50 || Buffer.byteLength(r.question) > 2048 || r.chunks.some(x => x.documentId !== c.documentId || Buffer.byteLength(x.text) > 8192)) throw Error('Payload scope/size violation');
}
const r1 = read('eval/reranker-dev-20261102-r1/submission/manifest.json');
for (const h of r1.files) if (hash(fs.readFileSync(h.file)) !== h.sha256) throw Error('Reviewed application changed');
const inputHashes = ['eval/split.json', `${prepared}/ready.jsonl`, ...['pdf', 'docx'].map(f => `${retrieval}/${f}.results.jsonl`),
  'src/retrieval/reranker.ts'].map(file => ({ file, sha256: hash(fs.readFileSync(file)) }));
// Do not print secrets or use generation credentials for any other endpoint.
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/u)) {
  const m = /^(?:export\s+)?(CLOUDFLARE_ACCOUNT_ID|CLOUDFLARE_API_TOKEN)\s*=\s*(.*)$/u.exec(line.trim());
  if (m) { let value = m[2].trim(); if (/^(['"]).*\1$/u.test(value)) value = value.slice(1, -1); process.env[m[1]] = value; }
}
if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) throw Error('Credentials unavailable');
const nativeFetch = globalThis.fetch;
const run = openRemaining(base, parent + '/attempts.jsonl');
const priorSkips = new Set(lines(parent + '/skips.jsonl').map(r => r.caseId + ':' + r.mode));
let active = false;
globalThis.fetch = async (url, init) => {
  if (!active || String(url) !== `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID.trim()}/ai/run/${RERANK_MODEL}`) throw Error('Unapproved request denied');
  const response = await nativeFetch(url, init);
  append('http.jsonl', { attempt: run.count, status: response.status });
  if (!response.body) return response;
  const decoder = new TextDecoder(); let text = '', bytes = 0;
  const body = response.body.pipeThrough(new TransformStream({
    transform(chunk, controller) { bytes += chunk.byteLength; if (bytes <= 65536) text += decoder.decode(chunk, { stream: true }); controller.enqueue(chunk); },
    flush() {
      if (bytes > 65536) return;
      try { const json = JSON.parse(text + decoder.decode()); const raw = json.usage ?? json.result?.usage;
        const usage = raw && typeof raw === 'object' ? Object.fromEntries(Object.entries(raw).filter(([k,v]) => /^[a-zA-Z0-9_]{1,80}$/u.test(k) && typeof v === 'number' && Number.isFinite(v))) : null;
        append('usage.jsonl', { attempt: run.count, usage });
      } catch { /* The reviewed client validates malformed responses. */ }
    },
  }));
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
};
let status = 'complete', failure = null, completedPools = 0, skippedPools = 0, timeouts = 0, consecutiveTimeouts = 0;
try {
  save('manifest.json', { clientDate: '2026-11-03', authorization: 'User selected: Test the larger 234-case set, after being told maximum468 new reranker calls.',
    maximumAttempts: 468, previousAttempts: 19, model: RERANK_MODEL, serial: true, retries: 0, inputHashes,
    continuationPolicy: 'Retain original timeout, never retry attempted pools, inherit global468 cap. Record further timeouts and continue only unattempted pools; stop on other errors or three consecutive timeouts.',
    accountPlanEvidence: 'User previously reported Free plan; no account plan or current daily usage API verification. Nov2 zero-usage report is not treated as Nov3 balance.',
    unknowns: 'Current shared account usage and BGE token truncation unverified. Stop on first failure, including quota/rate/auth.',
    inputPools: rows.length, nonemptyPools: rows.filter(r => r.chunks.length).length,
    generationCalls: 0, retrievalCalls: 0, queryRewriteCalls: 0 });
  for (const row of rows) {
    if (run.attempted(row.caseId, row.mode) || priorSkips.has(row.caseId + ':' + row.mode)) continue;
    if (!row.chunks.length) { append('skips.jsonl', { caseId: row.caseId, mode: row.mode, reason: 'Empty upstream retrieval; counted as miss, no hosted call' }); skippedPools++; continue; }
    active = true;
    let ranked;
    try {
      ranked = await run.attempt({ caseId: row.caseId, mode: row.mode, candidates: row.chunks.length,
        requestSha256: hash(JSON.stringify({ query: row.question, contexts: row.chunks.map(c => ({ text: c.text })), top_k: row.chunks.length })) },
      () => rerank(row.question, row.chunks, row.chunks.length));
      consecutiveTimeouts = 0;
    } catch (e) {
      if (e.message !== 'Reranking cancelled or timed out') throw e;
      timeouts++; consecutiveTimeouts++;
      append('timeouts.jsonl', { caseId: row.caseId, mode: row.mode, attempt: run.count, error: e.message, retried: false });
      console.log(JSON.stringify({ timeoutRecorded: true, attempts: run.count, timeouts }));
      if (consecutiveTimeouts >= 3) throw Error('Three consecutive timeouts; stopping');
      continue;
    } finally { active = false; }
    const key = c => JSON.stringify([c.documentId, c.chunkIndex, c.page, c.text, c.score]);
    const indices = new Map(row.chunks.map((c, i) => [key(c), i]));
    const order = ranked.map(c => indices.get(key(c)));
    if (indices.size !== row.chunks.length || order.some(i => i === undefined) || new Set(order).size !== order.length) throw Error('Incomplete or cross-case permutation');
    append('results.jsonl', { caseId: row.caseId, mode: row.mode, indices: order, scores: ranked.map(c => c.rerankScore) });
    completedPools++;
    if (completedPools % 20 === 0) console.log(JSON.stringify({ completedPools, skippedPools, attempts: run.count, expectedNonempty: rows.filter(r => r.chunks.length).length }));
  }
} catch (e) { status = 'stopped'; failure = `${e.name}: ${e.message}`; }
finally {
  globalThis.fetch = nativeFetch; run.close();
  const changedInputs = inputHashes.filter(h => hash(fs.readFileSync(h.file)) !== h.sha256);
  const usage = fs.existsSync(`${base}/usage.jsonl`) ? lines(`${base}/usage.jsonl`) : [];
  save('execution.json', { status, failure, attempts: run.count, previousAttempts: 19, completedPools, skippedPools, timeouts, expectedPools: 468,
    reportedRunNeurons: usage.reduce((n, r) => n + (r.usage?.neurons ?? 0), 0), usageRecords: usage.length,
    changedInputs, generationCalls: 0, newRetrievalCalls: 0, heldOutContentRead: false });
  console.log(JSON.stringify({ status, failure, attempts: run.count, completedPools, skippedPools, changedInputs }));
  if (changedInputs.length) throw Error('Inputs changed');
}
if (status !== 'complete') process.exitCode = 2;
