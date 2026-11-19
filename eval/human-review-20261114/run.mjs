// 20 random answerable dev questions (seed 20261114) answered by the app's real path:
// answerQuestion() with defaults (hybrid, gate 0.63, top 15, concise prompt, Cloudflare generation),
// scoped to the question's own dev paper. Writes answers.jsonl + review.md for a human grader.
// Run from repo root (twice: one format per process): npx tsx --env-file=.env eval/human-review-20261114/run.mjs
import fs from 'node:fs';
const base = 'eval/human-review-20261114';
const rows = f => fs.readFileSync(f, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const split = JSON.parse(fs.readFileSync('eval/split.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('eval/runs/seed42/production-manifest.json', 'utf8'));
const inv = new Map(rows('eval/dev-set-preparation-20261103/inventory.jsonl').map(q => [q.caseId, q]));
const chunksOf = new Map(rows('eval/dev-set-preparation-20261103/source-chunks.jsonl').map(a => [a.asset, new Map(a.chunks.map(c => [c.chunkIndex, c.text]))]));
const labelled = rows('eval/scenario1-top5-mrr-20261112/per-question.jsonl').filter(c => c.group === 'answerable');
let s = 20261114; const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const pool = [...labelled]; const pick = [];
while (pick.length < 20) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
for (const c of pick) if (!split.dev.includes(c.paperId) || split.test.includes(c.paperId)) throw Error('non-dev');
for (const k of ['RETRIEVE_MODE', 'RETRIEVE_SCORE_THRESHOLD', 'RETRIEVE_TOP_K', 'RAG_PROFILE']) delete process.env[k];
Object.assign(process.env, { QDRANT_URL: 'http://127.0.0.1:36333', OLLAMA_URL: 'http://127.0.0.1:11434', OLLAMA_EMBED_MODEL: 'nomic-embed-text',
  OLLAMA_EMBED_DIM: '768', OLLAMA_EMBED_PREFIXES: '1', RETRIEVE_FUSION: 'rrf', RERANK_ENABLED: '0' });
const out = `${base}/answers.jsonl`;
const done = new Set(fs.existsSync(out) ? rows(out).map(r => r.caseId) : []);
for (const fmt of ['pdf', 'docx']) {
  const todo = pick.filter(c => c.format === fmt && !done.has(c.caseId));
  if (!todo.length) continue;
  process.env.QDRANT_COLLECTION = manifest.collections[fmt];
  process.env.SPARSE_STATS_PATH = `C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-scoped-hybrid-r4/${fmt}/sparse-stats.json`;
  const { answerQuestion } = await import(`../../src/rag.ts?${fmt}`);
  for (const c of todo) {
    const q = inv.get(c.caseId), t = performance.now();
    let answer, chunks = [], error = null;
    try { ({ answer, chunks } = await answerQuestion(c.question, { collection: manifest.collections[fmt],
      documentScope: { status: 'resolved', references: [], documentIds: [q.documentId] } })); }
    catch (e) { error = `${e.name}: ${e.message}`; }
    fs.appendFileSync(out, JSON.stringify({ caseId: c.caseId, format: fmt, paperId: c.paperId, question: c.question, answer, error,
      gateRejected: !error && chunks.length === 0, retrievedChunks: chunks.map(x => x.chunkIndex), relevantChunks: c.relevantChunks,
      seconds: Math.round((performance.now() - t) / 100) / 10 }) + '\n');
    console.log(JSON.stringify({ done: rows(out).length, of: 20, error }));
  }
  // sparseStats reads SPARSE_STATS_PATH once per process: one format per run, then run again.
  if (rows(out).length < 20) { console.log("run again for the other format"); process.exit(0); }
}
// review.md
const ans = new Map(rows(out).map(r => [r.caseId, r]));
const gold = ref => { const o = ref.original; return o.yes_no !== null && o.yes_no !== undefined ? (o.yes_no ? 'Yes' : 'No')
  : o.free_form_answer || (o.extractive_spans ?? []).join(' | ') || '(unanswerable per this annotator)'; };
const md = ['# Human review: 20 random QASPER dev questions', '',
  'App answer = production path (hybrid search, gate 0.63, top 15, assembled context, Cloudflare qwen3-30b), scoped to the question\'s own paper.',
  'Grade each: **Correct / Partly correct / Wrong / Refused (wrongly) / Refused (fair)**.', ''];
pick.forEach((c, i) => {
  const q = inv.get(c.caseId), r = ans.get(c.caseId), ch = chunksOf.get(`${c.format}/${c.paperId}`);
  md.push(`---`, '', `## ${i + 1}. ${c.question}`, '', `Paper: ${c.paperId} (${c.format})`, '', '**QASPER gold answer(s):**', '');
  q.references.forEach((ref, j) => md.push(`- Annotator ${j + 1}: ${gold(ref)}`));
  const ev = [...new Set(q.references.flatMap(ref => ref.original.evidence ?? []))];
  md.push('', '**QASPER evidence (from the paper):**', '', ...ev.map(e => `> ${e.replace(/\s+/g, ' ')}\n`));
  md.push(`**Labelled answer chunk(s) in our index:** ${c.relevantChunks.join(', ')}`, '');
  for (const k of c.relevantChunks) md.push('```text', (ch.get(k) ?? '(missing)').trim(), '```', '');
  const inCtx = r.retrievedChunks.some(k => c.relevantChunks.includes(k));
  md.push(`**App answer** (${r.gateRejected ? 'gate refused, no context sent' : `labelled chunk ${inCtx ? 'was' : 'was NOT'} among the retrieved hits`}; ${r.seconds}s):`, '',
    r.error ? `ERROR: ${r.error}` : r.answer.trim().split('\n').map(l => `> ${l}`).join('\n'), '', '**Verdict:** ________', '');
});
fs.writeFileSync(`${base}/review.md`, md.join('\n'));
console.log('wrote review.md');
