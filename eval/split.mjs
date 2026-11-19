import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DIAG, RUN, OUT, CANONICAL_HASH, sha, read, lines, write, answerability, splitPapers, counts, safeInput } from './shared.mjs';

const input = path.join(DIAG, 'all-871-diagnoses.jsonl');
if (sha(fs.readFileSync(input)) !== CANONICAL_HASH) throw Error('Canonical diagnosis hash changed');
const diagnoses = lines(input), metadata = [];
if (diagnoses.length !== 871 || new Set(diagnoses.map(d => d.caseId)).size !== 871) throw Error('Expected 871 unique cases');
for (const d of diagnoses) {
  const c = read(safeInput(DIAG, d.caseEvidenceBundle ?? d.evidenceBundle));
  if (c.caseId !== d.caseId) throw Error('Case identity mismatch');
  metadata.push({ row: d.row, caseId: d.caseId, paperId: c.paperId, format: c.format, verdict: d.verdict, primaryCause: d.primaryCause ?? null, answerability: answerability(c.allReferenceAnswers), evidenceBundle: d.caseEvidenceBundle ?? d.evidenceBundle, bundleSha256: sha(fs.readFileSync(safeInput(DIAG, d.caseEvidenceBundle ?? d.evidenceBundle))) });
}
const result = splitPapers(metadata), summary = { dev: counts(metadata, result.dev), test: counts(metadata, result.test) };
if (result.dev.length !== 140 || result.test.length !== 60 || result.dev.some(id => result.test.includes(id))) throw Error('Paper split invariant failed');
const frozen = read(path.join(RUN, 'run.json'));
const split = { version: 'EVAL-SPLIT-K-1', seed: 42, algorithm: 'sorted-paper-IDs; Mulberry32 Fisher-Yates; deterministic best-improvement pair swaps minimizing squared normalized format-by-answerability deviations; verdict not optimized', canonicalSha256: CANONICAL_HASH, sourcePaperCount: 200, sourceAssetCount: 250, ...result, summary };
write(path.join(ROOT, 'split.json'), split);
write(path.join(OUT, 'metadata.jsonl'), metadata.map(x => JSON.stringify(x)).join('\n') + '\n');
write(path.join(OUT, 'dev-metadata.jsonl'), metadata.filter(x => result.dev.includes(x.paperId)).map(x => JSON.stringify(x)).join('\n') + '\n');
write(path.join(OUT, 'dev-diagnoses.jsonl'), diagnoses.filter(x => result.dev.includes(metadata.find(m => m.caseId === x.caseId).paperId)).map(x => JSON.stringify(x)).join('\n') + '\n');
write(path.join(OUT, 'dev-sources.jsonl'), lines(path.join(DIAG, 'source-index.jsonl')).filter(x => result.dev.includes(x.paperId)).map(x => JSON.stringify(x)).join('\n') + '\n');
write(path.join(OUT, 'split-summary.json'), summary);
write(path.join(OUT, 'production-manifest.json'), { runId: frozen.id, settings: frozen.settings, collections: frozen.collections, sourceHashes: frozen.sourceHashes, runSha256: sha(fs.readFileSync(path.join(RUN, 'run.json'))), services: read(path.join(RUN, 'services.json')) });
console.table(summary);
