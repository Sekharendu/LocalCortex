// Were the missing gold items in the prompt the model read? Rebuilds the prompt (no generation). One format per run.
import fs from 'node:fs';
const fmt = process.argv[2];
const rows = f => fs.readFileSync(f, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const manifest = JSON.parse(fs.readFileSync('eval/runs/seed42/production-manifest.json', 'utf8'));
const inv = new Map(rows('eval/dev-set-preparation-20261103/inventory.jsonl').map(q => [q.caseId, q]));
const CHECK = { 'Which hyperparameters were varied in the experiments on the four tasks?': ['seed', 'window', 'dimension'],
  'Which datasets are employed for South African languages LID?': ['JW300', 'NCHLT'],
  'What dataset do they use?': ['newscrawl', 'English-German', 'Turkish', 'CNN-DailyMail'],
  'How does the IPA label data after interacting with users?': ['sequence label', 'next action', 'Next Action', 'triples', 'Triples'] };
for (const k of ['RETRIEVE_MODE', 'RETRIEVE_SCORE_THRESHOLD', 'RETRIEVE_TOP_K', 'RAG_PROFILE']) delete process.env[k];
Object.assign(process.env, { QDRANT_URL: 'http://127.0.0.1:36333', OLLAMA_URL: 'http://127.0.0.1:11434', OLLAMA_EMBED_MODEL: 'nomic-embed-text',
  OLLAMA_EMBED_DIM: '768', OLLAMA_EMBED_PREFIXES: '1', RETRIEVE_FUSION: 'rrf', RERANK_ENABLED: '0', QDRANT_COLLECTION: manifest.collections[fmt],
  SPARSE_STATS_PATH: `C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/qasper-scoped-hybrid-r4/${fmt}/sparse-stats.json` });
const { retrieveForQuestion } = await import('../../src/rag.ts');
for (const r of rows('eval/human-review-20261114/answers.jsonl').filter(r => r.format === fmt && CHECK[r.question])) {
  const { prompt } = await retrieveForQuestion(r.question, { collection: manifest.collections[fmt],
    documentScope: { status: 'resolved', references: [], documentIds: [inv.get(r.caseId).documentId] } });
  const flat = prompt.replace(/-\s*\n\s*/g, '').replace(/\s+/g, ' ');
  console.log(r.question, '|', CHECK[r.question].map(t => `${t}: ${flat.includes(t) ? 'IN context' : 'not in context'}`).join(', '));
}
