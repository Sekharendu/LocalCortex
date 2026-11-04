import fs from 'node:fs';
const base = 'eval/dev-retrieval-20261103';
const rows = file => fs.readFileSync(file, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const all = ['pdf', 'docx'].flatMap(f => rows(`${base}/${f}.results.jsonl`));
if (all.length !== 936 || new Set(all.map(r => `${r.caseId}:${r.mode}:${r.requestedK}`)).size !== 936) throw Error('Incomplete retrieval');
const cohorts = [];
for (const group of ['ready-long-quote-proxy', 'ready-short-quote-proxy']) for (const mode of ['dense', 'hybrid']) {
  const k5 = all.filter(r => r.status === group && r.mode === mode && r.requestedK === 5);
  const k50 = all.filter(r => r.status === group && r.mode === mode && r.requestedK === 50);
  const passes = (r, k) => r.references.some(a => a.items.length && a.items.every(i => i.rank !== null && i.rank <= k));
  const identity = r => r.chunks.slice(0, 5).map(c => `${c.documentId}:${c.chunkIndex}`);
  cohorts.push({ group, mode, questions: k5.length,
    independentFirst5: k5.filter(r => passes(r, 5)).length,
    first5OfK50: k50.filter(r => passes(r, 5)).length,
    within10OfK50: k50.filter(r => passes(r, 10)).length,
    within20OfK50: k50.filter(r => passes(r, 20)).length,
    within50: k50.filter(r => passes(r, 50)).length,
    gateRejected: k5.filter(r => !r.chunks.length).length,
    k5OrderDiffersFromK50: k5.filter(r => JSON.stringify(identity(r)) !== JSON.stringify(identity(k50.find(s => s.caseId === r.caseId)))).length });
}
const summary = { cases: 234, liveRetrieveCalls: all.length, actualLocalEmbeddings: 234,
  embeddingResponsesReused: 702, qdrantQueries: 1602, cohorts, rerankCalls: 0, answerGenerationCalls: 0,
  settings: { threshold: 0.63, prefixes: true, fusion: 'rrf', selectedPaper: true, titleWrapper: false },
  note: 'Every literal quote of one eligible reference must be covered; reference alternatives remain separate. Quote coverage is not semantic completeness or answer accuracy.' };
const pct = (n,d) => (100*n/d).toFixed(1)+'%';
let report = '# Fresh dev retrieval test: reranking off\n\nCompleted all234 prepared dev questions:170PDF and64DOCX cases. Called unchanged retrieve() independently at k5 and k50 in dense and hybrid modes, with the original question, selected paper, relevance threshold0.63, task prefixes on and hybrid RRF fusion. No answer generation, reranking, held-out paper content or application edits.\n\n';
for (const group of ['ready-long-quote-proxy', 'ready-short-quote-proxy']) {
  report += `## ${group === 'ready-long-quote-proxy' ? 'Longer-quote group:119 questions' : 'Short-term group:115 questions, weaker evidence'}\n\n`;
  for (const c of cohorts.filter(c => c.group === group)) report += `- ${c.mode}: **${c.independentFirst5}/${c.questions} (${pct(c.independentFirst5,c.questions)})** had all selected reference quotes in the independently retrieved first5. Within50: **${c.within50}/${c.questions} (${pct(c.within50,c.questions)})**. Gate rejected${c.gateRejected}. k5 order differed from the first5 of k50 for${c.k5OrderDiffersFromK50} cases.\n`;
}
report += '\nA pass is exact whole-quote coverage after whitespace normalization of every quote within at least one eligible reference alternative. It does not prove enough semantic evidence for an answer. Short names can occur in unrelated passages; longer quotes remain a proxy too. All cases are retained in denominators, including relevance-gate misses. The19 scope controls remain separate in the prepared dataset and were not run here. Context assembly and generation are outside this test.\n\n936 live retrieve() invocations;234 actual local embedding requests, reused across each case’s four comparisons;1602 Qdrant query requests. Returned payloads were checked against frozen dev chunk text and every dense/hybrid prefetch filter was checked for the selected dev document ID before dispatch. All input hashes remained unchanged.\n\nThe subsequent reranking comparison is in ../dev-rerank-20261103/REPORT.md.\n';
fs.writeFileSync(`${base}/summary.json`, JSON.stringify(summary, null, 2)+'\n', { flag:'wx' });
fs.writeFileSync(`${base}/REPORT.md`, report, { flag:'wx' });
console.log(JSON.stringify(summary, null, 2));
