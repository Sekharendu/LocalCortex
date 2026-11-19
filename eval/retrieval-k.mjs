import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { OUT, read, lines, write } from './shared.mjs';

const metadata = lines(path.join(OUT, 'dev-metadata.jsonl'));
const groupCounts = { chunk_omission: metadata.filter(x => x.primaryCause === 'retrieval_answer_bearing_chunk_omitted').length, scope_rejection: metadata.filter(x => x.primaryCause === 'retrieval_document_scope_rejection').length, acceptable: metadata.filter(x => x.verdict === 'acceptable').length };
let status = 'complete', reason = null;
for (const phase of ['sanity', 'remaining']) {
  for (const format of ['pdf', 'docx']) {
    const output = path.join(OUT, `${phase}-${format}.json`);
    if (!fs.existsSync(output)) {
      const child = spawnSync(process.execPath, ['--import', 'tsx', 'eval/retrieval-worker.mjs', format, phase], { stdio: 'inherit', timeout: 60 * 60 * 1000, env: process.env });
      if (child.error) { status = 'blocked'; reason = child.error.message; break; }
    }
    const result = read(output);
    if (result.status !== 'complete') { status = result.status; reason = result.stoppedReason; break; }
  }
  if (status !== 'complete') break;
}
const artifacts = ['sanity-pdf', 'sanity-docx', 'remaining-pdf', 'remaining-docx'].map(n => path.join(OUT, n + '.json')).filter(fs.existsSync).map(read);
const rows = artifacts.flatMap(a => a.rows), table = [];
for (const group of ['chunk_omission', 'acceptable', 'scope_rejection']) {
  const row = { group, devCases: groupCounts[group] };
  for (const k of [5, 10, 20, 50]) {
    const run = rows.filter(x => x.group === group && x.k === k), eligible = run.filter(x => x.eligible), hit = eligible.filter(x => x.found).length;
    row[`k${k}`] = !run.length ? 'NOT RUN' : group === 'scope_rejection' ? `${run.filter(x => !x.result.length).length}/${run.length} rejected (excluded)` : `${hit}/${eligible.length} (${eligible.length ? (100 * hit / eligible.length).toFixed(1) : 'N/A'}%); ${run.length}/${groupCounts[group]} run`;
  }
  table.push(row);
}
const investigationPath = path.join(OUT, 'sanity-investigation.json');
if (fs.existsSync(investigationPath)) {
  status = 'invalid_ground_truth_sanity_stopped';
  reason = 'Recorded supporting anchors include facts already retrieved without the missing answer mechanism. Raw anchor hits are not verified answer recall. See sanity-investigation.json. No further retrieval is permitted in this run.';
  table[0].k5 = 'INVALID answer recall: 1/40 raw anchor hits; stopped';
}
const report = { status, reason, metric: 'Raw diagnostic-anchor recovery only; not verified complete-answer recall. Recorded supporting anchors are not a certified answer-chunk gold set.', groupCounts, table };
write(path.join(OUT, 'retrieval-summary.json'), report);
console.table(table);
console.log(JSON.stringify({ status, reason }));
