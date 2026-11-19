import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Offline preparation only. No app imports, network, inference, or test content.
const OUT = path.resolve('eval/dev-set-preparation-20261103');
const ROOT = 'C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/full-failure-diagnosis';
const SPLIT_HASH = '8b9d27fdca32d319355d92da0cce5f430b4725bb0cdc00faa7140b218da560c8';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const norm = value => String(value ?? '').replace(/\s+/gu, ' ').trim();
const inputs = new Map();
function bytes(file) {
  const value = fs.readFileSync(file);
  inputs.set(path.resolve(file), { file: path.resolve(file), sha256: hash(value), bytes: value.length });
  return value;
}
const json = file => JSON.parse(bytes(file));
const lines = file => bytes(file).toString('utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const split = json('eval/split.json');
if (inputs.get(path.resolve('eval/split.json')).sha256 !== SPLIT_HASH) throw Error('Split changed');
const dev = new Set(split.dev), heldOut = new Set(split.test);
const allow = paper => { if (!dev.has(paper) || heldOut.has(paper)) throw Error('Non-dev paper denied'); };
function evidencePath(relative) {
  const file = fs.realpathSync(path.resolve(ROOT, relative));
  if (!file.startsWith(fs.realpathSync(ROOT) + path.sep)) throw Error('Evidence path escaped root');
  return file;
}
function occurrences(source, quote) {
  const found = [];
  for (let from = 0; quote && from <= source.length - quote.length;) {
    const start = source.indexOf(quote, from);
    if (start < 0) break;
    found.push({ start, end: start + quote.length }); from = start + 1;
  }
  return found;
}
const diagnoses = lines('eval/runs/seed42/dev-diagnoses.jsonl');
if (diagnoses.length !== 610 || new Set(diagnoses.map(d => d.caseId)).size !== 610) throw Error('Unexpected dev inventory');
for (const d of diagnoses) allow(d.caseId.split('/')[1]);
const pools = new Map();
for (const [mode, dir] of [['dense', 'q-dense-vs-hybrid-20261102'], ['hybrid', 'question-only-same-paper-20261102']]) {
  for (const format of ['pdf', 'docx']) for (const row of lines(`eval/${dir}/${format}.results.jsonl`)) {
    allow(row.paperId);
    const key = `${mode}:${row.caseId}`;
    if (pools.has(key)) throw Error('Duplicate saved pool');
    if (row.retrieved.some(c => c.documentId !== row.targetDocumentId)) throw Error('Saved scope mismatch');
    pools.set(key, row);
  }
}
const sources = new Map();
function sourceFor(bundle) {
  const p = bundle.sourcePointers;
  const key = `${bundle.format}/${bundle.paperId}`;
  if (!sources.has(key)) {
    allow(bundle.paperId);
    const source = norm(bytes(evidencePath(p.fullTextPath)).toString('utf8'));
    const raw = lines(evidencePath(p.allChunksPath));
    if (raw.some(c => c.paperId !== bundle.paperId || c.documentId !== p.documentId)) throw Error('Source chunk identity mismatch');
    const chunks = raw.map(c => ({ pointId: c.pointId, chunkIndex: c.chunkIndex, page: c.payload.page,
      text: c.payload.text, normalized: norm(c.payload.text), ranges: occurrences(source, norm(c.payload.text)) }));
    sources.set(key, { documentId: p.documentId, source, chunks, sourceHash: hash(source) });
  }
  const s = sources.get(key);
  if (s.documentId !== p.documentId) throw Error('Document identity changed');
  return s;
}
function quoteRecord(text, kind, source) {
  const normalized = norm(text), ranges = occurrences(source.source, normalized);
  const chunks = source.chunks.filter(c => c.normalized.includes(normalized));
  const overlapOnly = source.chunks.filter(c => !c.normalized.includes(normalized) && c.ranges.length === 1 &&
    ranges.some(r => c.ranges[0].start < r.end && r.start < c.ranges[0].end));
  return { text, kind, normalized, words: normalized.split(/\s+/u).length, ranges,
    sourceMapped: ranges.length > 0,
    chunkIndices: chunks.map(c => c.chunkIndex), overlapOnlyChunkIndices: overlapOnly.map(c => c.chunkIndex) };
}
function greedyCover(quoteItems, candidateChunks) {
  const remaining = new Set(quoteItems.map((_, i) => i)), selected = [];
  while (remaining.size) {
    let best = null, coverage = [];
    for (const c of candidateChunks) {
      const covers = [...remaining].filter(i => norm(c.text).includes(quoteItems[i].normalized));
      if (covers.length > coverage.length) { best = c; coverage = covers; }
    }
    if (!best) return null;
    selected.push(best.chunkIndex); coverage.forEach(i => remaining.delete(i));
  }
  return selected;
}
const inventory = [];
for (const d of diagnoses) {
  const paperId = d.caseId.split('/')[1]; allow(paperId);
  const bundlePath = d.evidenceBundle ?? d.caseEvidenceBundle;
  const bundle = json(evidencePath(bundlePath));
  if (bundle.caseId !== d.caseId || bundle.paperId !== paperId) throw Error('Bundle identity mismatch');
  const s = sourceFor(bundle), answers = bundle.allReferenceAnswers;
  const types = answers.map(a => a.unanswerable ? 'unanswerable' : typeof a.yes_no === 'boolean' ? 'yes-no' : 'text');
  const typeSet = new Set(types);
  const answerType = typeSet.size === 1 ? types[0] : 'mixed-reference-types';
  const references = answers.map((a, referenceIndex) => {
    const quoteTexts = a.extractive_spans?.filter(t => norm(t)) ?? [];
    const literal = quoteTexts.length ? quoteTexts : norm(a.free_form_answer) ? [a.free_form_answer] : [];
    const unique = [...new Map(literal.map(t => [norm(t), t])).values()];
    const items = unique.map(t => quoteRecord(t, quoteTexts.length ? 'extractive' : 'literal-free-form', s));
    const allMapped = items.length > 0 && items.every(i => i.sourceMapped);
    const wholeChunkCoverable = allMapped && items.every(i => i.chunkIndices.length > 0);
    const singleChunk = wholeChunkCoverable && s.chunks.some(c => items.every(i => c.normalized.includes(i.normalized)));
    return { referenceIndex, original: a, type: types[referenceIndex], items,
      allQuotesSourceMapped: allMapped, allQuotesWholeChunkCoverable: wholeChunkCoverable,
      shortQuoteOnly: items.length > 0 && items.every(i => i.words < 4),
      quoteCoverageNeedsMultipleChunks: wholeChunkCoverable ? !singleChunk : null,
      greedyChunkCover: wholeChunkCoverable ? greedyCover(items, s.chunks) : null,
      coverageNote: 'Whole-quote coverage only. Alternatives remain separate. A greedy cover is an upper bound, not a minimum or a semantic completeness judgment.' };
  });
  const exactRefs = references.filter(r => r.type === 'text' && r.allQuotesSourceMapped && r.allQuotesWholeChunkCoverable);
  const strongerRefs = exactRefs.filter(r => !r.shortQuoteOnly);
  let status;
  if (d.verdict === 'ambiguous') status = 'ambiguous-review';
  else if (d.primaryCause === 'retrieval_document_scope_rejection') status = 'scope-rejection-control';
  else if (answerType === 'mixed-reference-types') status = 'reference-disagreement-review';
  else if (answerType === 'unanswerable') status = 'unanswerable-control';
  else if (answerType === 'yes-no') status = 'yes-no-evidence-review';
  else if (strongerRefs.length) status = 'ready-long-quote-proxy';
  else if (exactRefs.length) status = 'ready-short-quote-proxy';
  else if (references.some(r => r.allQuotesSourceMapped)) status = 'chunk-boundary-review';
  else status = 'gold-source-mapping-review';
  const scoringRefs = status === 'ready-long-quote-proxy' ? strongerRefs : exactRefs;
  const baselines = {};
  for (const mode of ['dense', 'hybrid']) {
    const row = pools.get(`${mode}:${d.caseId}`);
    if (!row) { baselines[mode] = { status: 'no-saved-Q-pool' }; continue; }
    if (row.targetDocumentId !== s.documentId) throw Error('Pool/source identity mismatch');
    const scoredRefs = scoringRefs.map(r => ({ referenceIndex: r.referenceIndex,
      itemRanks: r.items.map(i => { const n = row.retrieved.findIndex(c => norm(c.text).includes(i.normalized)); return n < 0 ? null : n + 1; }) }));
    baselines[mode] = { status: 'saved-Q-k50-pool', poolSize: row.retrieved.length,
      candidateKeys: row.retrieved.map(c => ({ documentId: c.documentId, chunkIndex: c.chunkIndex })),
      references: scoredRefs,
      allQuotesOfAnEligibleReferenceInTop5: scoringRefs.length ? scoredRefs.some(r => r.itemRanks.every(n => n !== null && n <= 5)) : null,
      allQuotesOfAnEligibleReferenceInTop50: scoringRefs.length ? scoredRefs.some(r => r.itemRanks.every(n => n !== null && n <= 50)) : null };
  }
  inventory.push({ caseId: d.caseId, paperId, format: bundle.format, question: bundle.originalQuestion,
    verdict: d.verdict, primaryCause: d.primaryCause, originalDiagnosisRequiredFacts: d.requiredFacts,
    answerType, status, documentId: s.documentId, evidenceBundle: bundlePath,
    normalizedSourceSha256: s.sourceHash, references,
    eligibleReferenceIndices: exactRefs.map(r => r.referenceIndex),
    longQuoteReferenceIndices: strongerRefs.map(r => r.referenceIndex), scoringReferenceIndices: scoringRefs.map(r => r.referenceIndex), baselines,
    humanSemanticCompletenessReviewed: false });
}
const countBy = key => Object.fromEntries([...new Set(inventory.map(r => r[key]))].sort().map(k => [k, inventory.filter(r => r[key] === k).length]));
const ready = inventory.filter(r => r.status.startsWith('ready-'));
const groups = [...new Set(ready.map(r => r.verdict))];
const summary = { splitSha256: SPLIT_HASH, devPapers: split.dev.length, inventoryPapers: new Set(inventory.map(r => r.paperId)).size,
  inventoryCases: inventory.length, verdicts: countBy('verdict'), statuses: countBy('status'),
  answerTypes: countBy('answerType'), readyCases: ready.length,
  readyCasesWithBothSavedPools: ready.filter(r => Object.values(r.baselines).every(b => b.status === 'saved-Q-k50-pool')).length,
  readyByVerdict: Object.fromEntries(groups.map(g => [g, ready.filter(r => r.verdict === g).length])),
  readyWithNoSingleChunkAlternative: ready.filter(r => r.references.filter(ref => r.eligibleReferenceIndices.includes(ref.referenceIndex)).every(ref => ref.quoteCoverageNeedsMultipleChunks)).length,
  readyWithSomeMultiChunkAlternative: ready.filter(r => r.references.some(ref => r.eligibleReferenceIndices.includes(ref.referenceIndex) && ref.quoteCoverageNeedsMultipleChunks)).length,
  calls: { retrieval: 0, inference: 0, generation: 0 },
  rules: ['Exact whole quotes after whitespace normalization only; no fuzzy repairs or range-overlap success.',
    'At least one fully source-mapped, whole-chunk-coverable reference alternative required. Never count only the mapped subset of a reference.',
    'Short-only references separate; mixed answer types, ambiguous diagnoses, scope rejections and yes/no/unanswerable controls separate.',
    'All-reference-quote coverage is a proxy, not established sufficient evidence or complete answer accuracy.',
    'Baselines reuse Q saved top50 pools; their first5 slice is not an independent production k5 run.'],
  baselineQuoteCoverage: ['dense', 'hybrid'].map(mode => { const rows = ready.filter(r => r.baselines[mode].status === 'saved-Q-k50-pool'); return { mode, cases: rows.length,
    allReferenceQuotesInFirst5: rows.filter(r => r.baselines[mode].allQuotesOfAnEligibleReferenceInTop5).length,
    allReferenceQuotesWithin50: rows.filter(r => r.baselines[mode].allQuotesOfAnEligibleReferenceInTop50).length }; }) };
if (hash(fs.readFileSync('eval/split.json')) !== SPLIT_HASH) throw Error('Split changed during preparation');
for (const entry of inputs.values()) if (hash(fs.readFileSync(entry.file)) !== entry.sha256) throw Error('Input changed during preparation');
function write(file, value) { fs.writeFileSync(path.join(OUT, file), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); }
const jsonl = rows => rows.map(r => JSON.stringify(r)).join('\n') + '\n';
write('inventory.jsonl', jsonl(inventory));
write('ready.jsonl', jsonl(ready));
write('review-and-controls.jsonl', jsonl(inventory.filter(r => !r.status.startsWith('ready-'))));
write('summary.json', summary);
write('source-chunks.jsonl', jsonl([...sources].map(([asset, s]) => ({ asset, documentId: s.documentId,
  normalizedSourceSha256: s.sourceHash, chunks: s.chunks.map(({ normalized, ranges, ...c }) => c) }))));
write('input-manifest.json', { createdAt: new Date().toISOString(), scriptSha256: hash(fs.readFileSync(import.meta.filename)),
  inputs: [...inputs.values()], testContentRead: false, networkCalls: 0 });
console.log(JSON.stringify(summary, null, 2));
