import fs from 'node:fs';
import path from 'node:path';
import { BASE, OLD, read, lines, sha, devOnly, save } from './common.mjs';

const prior = path.resolve('eval/ap-query-form-20261102');
const manifest = read(path.join(prior, 'submission-manifest.json'));
for (const file of manifest.files) if (sha(fs.readFileSync(file.file)) !== file.sha256) throw Error('Saved A/P artifact changed: ' + file.file);
const frozen = read(path.join(OLD, 'production-manifest.json'));
for (const entry of frozen.sourceHashes) if (sha(fs.readFileSync(entry.file)) !== entry.sha256) throw Error('Production source changed: ' + entry.file);
const original = read(path.join(prior, 'preflight.json'));
const split = read('eval/split.json');
if (sha(fs.readFileSync('eval/split.json')) !== original.splitSha256) throw Error('Split changed');
const plans = lines(path.join(prior, 'case-plan.jsonl')).map(c => {
  devOnly(c.paperId, split);
  return { ...c, variants: { Q: { ...c.variants.P, scope: c.variants.A.scope } } };
});
const sources = lines(path.join(prior, 'dev-sources.jsonl')); sources.forEach(s => devOnly(s.paperId, split));
save('case-plan.jsonl', plans.map(c => JSON.stringify(c)).join('\n') + '\n');
save('dev-sources.jsonl', sources.map(s => JSON.stringify(s)).join('\n') + '\n');
save('preflight.json', { ...original, variant: 'Q', definition: 'Original question and its exact production acronym/prefix transformations, with the same immutable scope as A. No forced gold-document identity. Missing scope remains rejected.', baselineReuse: { directory: prior, manifestSha256: sha(fs.readFileSync(path.join(prior, 'submission-manifest.json'))), verifiedArtifacts: manifest.files.length, source: 'All saved A/P rankings and item scores are reused, not rerun.' }, baselineSparseStats: { pdf: read(path.join(prior, 'pdf.summary.json')).sparseStatsSha256, docx: read(path.join(prior, 'docx-resume.summary.json')).sparseStatsSha256 } });
let worker = fs.readFileSync(path.join(prior, 'worker.mjs'), 'utf8');
function replaceOnce(from, to) {
  if (!worker.includes(from)) throw Error('Expected worker construct missing: ' + from);
  worker = worker.replace(from, to);
}
replaceOnce("for (const variant of ['A', 'P'])", "for (const variant of ['Q'])");
replaceOnce("...(variant === 'A' ? { documentScope: active.scope } : {})", "...{ documentScope: active.scope }");
replaceOnce('expectedVariantRuns: cases.length * 2', 'expectedVariantRuns: cases.length');
replaceOnce('A/P case pairs complete', 'question-only/same-paper cases complete');
replaceOnce("const nativeFetch = globalThis.fetch, cache = new Map();", "if (sparseStatsSha256 !== preflight.baselineSparseStats[format]) throw Error('Sparse statistics differ from A/P baseline');\nconst nativeFetch = globalThis.fetch, cache = new Map();");
replaceOnce("// P executes the real resolver inside retrieve(); A replays its captured scope\n      // to avoid collection-wide held-out catalog reads. No gold filter is added.", "// Q uses the same immutable captured scope as A with P's original question.\n      // No title catalog reads, gold identity injection, or scope relaxation.");
save('worker.mjs', worker);
save('baseline-input-manifest.json', { priorManifestSha256: sha(fs.readFileSync(path.join(prior, 'submission-manifest.json'))), preservedFiles: manifest.files, productionSourceHashes: frozen.sourceHashes, splitSha256: original.splitSha256 });
console.log(JSON.stringify({ cases: plans.length, counts: original.counts, baselineArtifactsVerified: manifest.files.length, splitUnchanged: true }, null, 2));
