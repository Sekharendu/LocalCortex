import fs from 'node:fs';
import path from 'node:path';
import { BASE, OLD, DIAG, read, lines, save, sha, normalize, inside, devOnly, goldFromReferences, mappingStatus } from './common.mjs';

const splitFile = path.resolve('eval/split.json'), splitBytes = fs.readFileSync(splitFile), split = JSON.parse(splitBytes);
const metadata = lines(path.join(OLD, 'dev-metadata.jsonl'));
metadata.forEach(m => devOnly(m.paperId, split));
const diagnoses = lines(path.join(OLD, 'dev-diagnoses.jsonl'));
diagnoses.forEach(d => { const m = metadata.find(x => x.caseId === d.caseId); if (!m) throw Error('Non-dev diagnosis'); devOnly(m.paperId, split); });
const sources = lines(path.join(OLD, 'dev-sources.jsonl'));
sources.forEach(s => devOnly(s.paperId, split));
const selected = diagnoses.filter(d => d.primaryCause === 'retrieval_answer_bearing_chunk_omitted' || d.primaryCause === 'retrieval_document_scope_rejection' || d.verdict === 'acceptable');
const rows = [], counts = {};
let cachedId, source;
for (const d of selected) {
  const m = metadata.find(x => x.caseId === d.caseId);
  const bundleBytes = fs.readFileSync(inside(DIAG, m.evidenceBundle));
  if (sha(bundleBytes) !== m.bundleSha256) throw Error('Dev bundle hash mismatch');
  const c = JSON.parse(bundleBytes);
  if (c.paperId !== m.paperId || c.caseId !== m.caseId) throw Error('Bundle identity mismatch');
  const s = sources.find(x => x.documentId === c.sourcePointers.documentId);
  if (!s || s.paperId !== m.paperId) throw Error('Dev source mismatch');
  if (cachedId !== s.documentId) {
    const bytes = fs.readFileSync(inside(DIAG, s.fullTextPath));
    if (sha(bytes) !== s.extractedTextSha256) throw Error('Source extraction hash mismatch');
    source = normalize(bytes.toString('utf8')); cachedId = s.documentId;
  }
  const gold = goldFromReferences(c.allReferenceAnswers, source), mapping = mappingStatus(gold, c.allReferenceAnswers);
  const group = d.primaryCause === 'retrieval_answer_bearing_chunk_omitted' ? 'chunk_omission' : d.primaryCause === 'retrieval_document_scope_rejection' ? 'scope_rejection' : 'acceptable';
  counts[group] ??= {}; counts[group][mapping] = (counts[group][mapping] ?? 0) + 1;
  rows.push({ caseId: c.caseId, paperId: c.paperId, format: c.format, group, mapping, gold, evidenceBundle: m.evidenceBundle, bundleSha256: m.bundleSha256, source: s });
}
save('gold-mapping.jsonl', rows.map(r => JSON.stringify(r)).join('\n') + '\n');
save('preflight.json', { version: 'EXACT-QUOTE-V2', splitSha256: sha(splitBytes), normalization: 'whitespace only: replace whitespace runs with one space and trim; preserve case, punctuation, Unicode and LaTeX', ranges: 'half-open JavaScript UTF-16 offsets in the same whitespace-normalized extracted paper; positive overlap counts exactly as requested', nearZeroMaxRate: 0.01, acceptableHighMinRate: 0.70, goldPolicy: 'Use entire literal extractive answer spans and literal free-form answers from saved references. Never use generic sourceEvidence or background evidence as answer gold. Alternative reference quotes are OR alternatives. Unanswerable, yes/no without literal answer quotes, and unmappable quotes are reported separately, never silently counted as misses.', counts, sourceHashes: read(path.join(OLD, 'production-manifest.json')).sourceHashes });

const investigation = read(path.join(OLD, 'sanity-investigation.json'));
const m = metadata.find(x => x.caseId === investigation.triggerCaseId);
const c = read(inside(DIAG, m.evidenceBundle));
const chunk = c.topRetrievedChunks.find(x => x.chunkIndex === 3);
const quote = c.allReferenceAnswers[1].extractive_spans[0];
save('false-hit.json', { caseId: c.caseId, question: c.originalQuestion, retrievedChunk: chunk, goldQuote: quote, normalizedGoldContained: normalize(chunk.text).includes(normalize(quote)), oldRule: 'Matched a retrieved chunk ID/index/text hash to any diagnostic supporting anchor. It never required the gold answer quote. This sourceEvidence anchor only mentions dynamic weights; it does not give the (1-p) mechanism.', sourceRenderingCaveat: 'The annotation uses LaTeX $(1-p)$ while the PDF extraction uses (1 − p). Whitespace-only normalization cannot equate these. No fabricated gold coordinate or automatic math conversion is used.' });
save('false-hit.md', `# Previous false hit\n\nCase: ${c.caseId}\n\nQuestion: ${c.originalQuestion}\n\n## Entire retrieved chunk 3\n\n\`\`\`text\n${chunk.text}\n\`\`\`\n\n## Entire gold answer quote\n\n\`\`\`text\n${quote}\n\`\`\`\n\nThe old rule accepted any cited diagnostic chunk identity. This chunk mentions dynamic weighting but does not contain the answer's weight formula. The new exact-quote test rejects it. The LaTeX annotation is also not literally locatable in the rendered PDF using whitespace normalization alone; it must remain unmapped rather than receive an invented range.\n`);
console.log(JSON.stringify({ prepared: rows.length, counts, splitSha256: sha(splitBytes) }, null, 2));
