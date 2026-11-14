// Retrieval quality on the 570 answerable dev questions: is a labelled answer chunk in the top 5 / top 15?
// Gate off = eval/scenario1-gate-off-topk-20261113; gate on (0.63) = this folder. Writes retrieval-quality.txt + per-question.csv.
import fs from 'node:fs';
const here = 'eval/scenario1-hybrid-default-20261113';
const jl = p => fs.readFileSync(p, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const cases = jl('eval/scenario1-top5-mrr-20261112/per-question.jsonl').filter(c => c.group === 'answerable');
const lists = new Map();
for (const f of ['pdf', 'docx']) {
  for (const r of jl(`eval/scenario1-gate-off-topk-20261113/${f}.results.jsonl`)) if (r.k === 5 || r.k === 15) lists.set(`${r.caseId}|off|${r.mode}|${r.k}`, r);
  for (const [k, file] of [[15, `${f}.results.jsonl`], [5, `${f}.top5.results.jsonl`]])
    for (const r of jl(`${here}/${file}`)) lists.set(`${r.caseId}|on|${r.label === 'default' ? 'hybrid' : 'dense'}|${k}`, r);
}
const SETUPS = [];
for (const gate of ['off', 'on']) for (const mode of ['dense', 'hybrid']) for (const k of [5, 15]) SETUPS.push({ gate, mode, k });
const res = c => SETUPS.map(s => { const r = lists.get(`${c.caseId}|${s.gate}|${s.mode}|${s.k}`);
  if (!r) throw Error('missing ' + c.caseId + JSON.stringify(s));
  if (r.gateRejected) return 'refused';
  const ranks = r.top.map((t, i) => c.relevantChunks.includes(t.chunkIndex) ? i + 1 : 0).filter(Boolean);
  return ranks.length ? ranks[0] : 'missed'; });
const all = cases.map(c => ({ c, r: res(c) }));
const out = [];
for (const [label, sel] of [['ALL', all], ['PDF', all.filter(x => x.c.format === 'pdf')], ['DOCX', all.filter(x => x.c.format === 'docx')]]) {
  const N = sel.length;
  out.push('', `${label}: ${N} answerable questions (found = at least one labelled answer chunk retrieved)`,
    'gate  mode    top-k | found at rank 1 | found in top-k  | missed        | refused by gate');
  SETUPS.forEach((s, i) => {
    const n = v => sel.filter(x => v(x.r[i])).length, p = v => `${String(v).padStart(3)} (${(100 * v / N).toFixed(1).padStart(5)}%)`;
    out.push(`${s.gate.padEnd(5)} ${s.mode.padEnd(7)} ${String(s.k).padStart(5)} | ${p(n(v => v === 1))}   | ${p(n(v => typeof v === 'number'))}   | ${p(n(v => v === 'missed'))} | ${p(n(v => v === 'refused'))}`);
  });
}
const rep = out.join('\n'); console.log(rep); fs.writeFileSync(`${here}/retrieval-quality.txt`, rep.trim() + '\n');
const q = s => `"${String(s).replace(/"/g, '""')}"`;
fs.writeFileSync(`${here}/retrieval-per-question.csv`, ['caseId,format,question,labelledChunks,' + SETUPS.map(s => `gate-${s.gate} ${s.mode} top${s.k}`).join(',')]
  .concat(all.map(({ c, r }) => [q(c.caseId), c.format, q(c.question), q(c.relevantChunks.join(' ')), ...r.map(v => typeof v === 'number' ? `rank ${v}` : v)].join(','))).join('\n') + '\n');
