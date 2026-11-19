import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const base = 'eval/dev-set-preparation-20261103';
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const read = f => JSON.parse(fs.readFileSync(f));
const rows = f => fs.readFileSync(f, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const norm = s => s.replace(/\s+/gu, ' ').trim();
const summary = read(`${base}/summary.json`), inventory = rows(`${base}/inventory.jsonl`);
const ready = rows(`${base}/ready.jsonl`), review = rows(`${base}/review-and-controls.jsonl`);
const assets = new Map(rows(`${base}/source-chunks.jsonl`).map(a => [a.documentId, a]));
const split = read('eval/split.json');
if (inventory.length !== 610 || ready.length + review.length !== inventory.length) throw Error('Inventory count');
const ids = new Set();
for (const r of [...ready, ...review]) {
  if (ids.has(r.caseId) || !split.dev.includes(r.paperId) || split.test.includes(r.paperId)) throw Error('Identity/dev boundary');
  ids.add(r.caseId);
}
let quoteChunkLinks = 0;
for (const r of ready) {
  if (r.verdict === 'ambiguous' || !r.scoringReferenceIndices.length || r.answerType !== 'text') throw Error('Ineligible ready case');
  for (const ref of r.references.filter(a => r.scoringReferenceIndices.includes(a.referenceIndex))) {
    if (!ref.items.length || !ref.items.every(i => i.sourceMapped && i.chunkIndices.length)) throw Error('Incomplete reference');
    for (const item of ref.items) for (const index of item.chunkIndices) {
      const c = assets.get(r.documentId)?.chunks.find(c => c.chunkIndex === index);
      if (!c || !norm(c.text).includes(item.normalized)) throw Error('Bad whole-quote chunk link');
      quoteChunkLinks++;
    }
  }
}
for (const entry of read(`${base}/input-manifest.json`).inputs) {
  if (hash(fs.readFileSync(entry.file)) !== entry.sha256) throw Error('Input changed: ' + entry.file);
}
const strata = ['ready-long-quote-proxy', 'ready-short-quote-proxy'].map(status => ({ status,
  cases: ready.filter(r => r.status === status).length,
  previouslyFailed: ready.filter(r => r.status === status && r.verdict === 'failed').length,
  previouslyAcceptable: ready.filter(r => r.status === status && r.verdict === 'acceptable').length,
  savedPools: ['dense', 'hybrid'].map(mode => {
    const a = ready.filter(r => r.status === status && r.baselines[mode].status === 'saved-Q-k50-pool');
    return { mode, cases: a.length, allReferenceQuotesInFirst5: a.filter(r => r.baselines[mode].allQuotesOfAnEligibleReferenceInTop5).length,
      allReferenceQuotesWithin50: a.filter(r => r.baselines[mode].allQuotesOfAnEligibleReferenceInTop50).length };
  }) }));
// Inspectable examples chosen before looking at their ranks, with a fixed hash order.
const examples = ready.toSorted((a, b) => hash('dev42:' + a.caseId).localeCompare(hash('dev42:' + b.caseId))).slice(0, 10).map(r => {
  const ref = r.references.find(a => r.scoringReferenceIndices.includes(a.referenceIndex));
  return { caseId: r.caseId, question: r.question, status: r.status, referenceIndex: ref.referenceIndex,
    originalReference: ref.original, quotes: ref.items.map(i => ({ quote: i.text,
      chunkIndex: i.chunkIndices[0], chunkText: assets.get(r.documentId).chunks.find(c => c.chunkIndex === i.chunkIndices[0]).text })),
    semanticCompletenessReviewed: false };
});
const audit = { inventory: inventory.length, ready: ready.length, reviewOrControls: review.length,
  devOnly: true, uniqueAndPartitioned: true, exactQuoteChunkLinksChecked: quoteChunkLinks,
  inputHashesUnchanged: true, splitSha256: hash(fs.readFileSync('eval/split.json')),
  inferenceCalls: 0, retrievalCalls: 0, testPaperContentReads: 0 };
const report = `# Larger dev set prepared from the existing split

Step 1 is complete as an offline, reproducible quote-mapping preparation. The existing seed-42 split is unchanged: **140 dev papers, 610 dev cases**. No test-paper content was accessed. No retrieval, reranking, answer generation, or Cloudflare calls ran. The former 20-case reranker experiment was only a small sample from this same split; no replacement split was needed.

## Prepared cases

- **234 cases** qualify for strict literal-reference-quote coverage scoring: **137 previously failed and 97 previously acceptable**.
- **119 cases** have at least one fully eligible reference containing a quote of four or more words. Some references also contain shorter quotes; every quote in the chosen reference must be covered.
- **115 cases** have only short-quote eligible references. Keep them separate because names or terms can occur without a complete explanation.
- **223 of the 234** already have saved dense and hybrid Q candidate pools. The remaining **11** have gold/chunk mappings but no saved Q pool; preparing them made no new retrieval calls.
- **35 cases** have no fully eligible reference that fits into one chunk. They need at least two chunks to cover the literal reference quotes. There are **48 cases** with at least one multi-chunk alternative; the other 13 also have a one-chunk alternative. Greedy covers are upper bounds, never asserted minimum set sizes.

These are mechanically verified quote mappings, **not 234 human-certified complete-answer cases**. Every record explicitly sets humanSemanticCompletenessReviewed=false. The reference answer and original evidence are retained so semantic sufficiency can be checked without inventing new gold answers.

## All other dev cases remain visible

- 119 ambiguous diagnoses: separate review queue.
- 19 scope rejections: separate controls, excluded from recall.
- 22 unanswerable controls.
- 25 yes/no cases needing supporting-evidence assessment.
- 7 mixed reference-type disagreements needing review.
- 173 text cases without a fully source-mapped reference: mapping-review queue.
- 11 cases with a source-mapped reference that cannot be covered by whole quotes in individual chunks: chunk-boundary review queue.

These 376 cases plus the 234 quote-ready cases account for all 610. Status categories are exclusive, with ambiguous diagnoses and scope rejections taking precedence over answer type. All original reference answers remain in inventory.jsonl, including unmapped alternatives. A missing literal match is not automatically an ingestion defect or wrong answer.

## Scoring rule

Keep reference answers as **alternatives**, and require all unique literal quotes within at least one eligible alternative. Never combine incompatible alternatives or count only the mapped subset of an incomplete reference. Preserve exact text, punctuation and case; normalize whitespace only. No fuzzy repair, invented paraphrase, bibliography-ID replacement, or partial character overlap counts as whole-quote coverage.

For the longer-quote group, score only fully eligible alternatives containing at least one longer quote; a short alternative cannot silently make that group pass. A word such as CNN can still match MP-CNN under exact substring matching, so short-term matches remain a weaker proxy. Even all quotes present can be irrelevant occurrences: semantic completeness and final-answer correctness remain separate untested questions.

## Existing saved baseline, not a new experiment

The per-case baseline fields use only the previously saved Q search results (question without title wrapper, same paper selected). All reference quotes from at least one eligible alternative occur in the first five for **111/223 dense** and **108/223 hybrid** cases; within 50, **199/223 dense** and **201/223 hybrid**. These are stricter quote-coverage counts, not answer accuracy, and are not comparable to the previous any-one-quote percentages. The first five are a slice of a saved k50 pool, not a separate production-k5 query. Per-length denominators and counts are in strata.json. No reranker quality was measured here.

## Files and validation

- ready.jsonl: all 234 quote-ready cases with questions, original reference alternatives, selected scoring references, exact source ranges, chunk indices, and saved baseline ranks.
- inventory.jsonl: all 610 cases, including every reference and its mapping status.
- review-and-controls.jsonl: all 376 cases excluded from primary quote recall, with reasons.
- source-chunks.jsonl: saved text, point IDs, page numbers and chunk indices for the dev source assets; no new extraction.
- examples.json: ten deterministic ready-case examples with complete matching chunk text, for human inspection; not labelled as manually approved gold.
- input-manifest.json: input hashes and provenance; summary.json and strata.json: counts.
- prepare.mjs and finish.mjs: preparation and audit commands. Preparation refuses to overwrite its outputs.

Executed: node eval/dev-set-preparation-20261103/prepare.mjs, then node eval/dev-set-preparation-20261103/finish.mjs. Audit checked the 610-case unique dev-only partition, every selected reference's whole-quote chunk links, and unchanged input hashes including split.json. audit.json records exact counts. No existing application or evaluation files were edited.

Next: use the 119 longer-quote cases as the stronger primary proxy and the 115 short-only cases as a separate diagnostic group; retain all exclusions and review unresolved gold/evidence rather than silently calling them failures. Human semantic review is required before claiming this benchmark demonstrates complete-answer coverage. This task stops at preparation.
`;
function write(name, value) { fs.writeFileSync(path.join(base, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); }
write('strata.json', strata); write('examples.json', examples); write('audit.json', audit); write('REPORT.md', report);
console.log(JSON.stringify({ audit, strata }, null, 2));
