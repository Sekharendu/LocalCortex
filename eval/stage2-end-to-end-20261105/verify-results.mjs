import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const base='eval/stage2-end-to-end-20261105';
const json=f=>JSON.parse(fs.readFileSync(`${base}/${f}`,'utf8'));
const rows=f=>fs.readFileSync(`${base}/${f}`,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const summary=json('summary.json'),sample=json('sample.json'),preps=rows('preparations.jsonl'),attempts=rows('results.jsonl'),results=attempts.filter(r=>r.success),grades=rows('judgments.jsonl'),pairs=rows('paired.jsonl');
assert.equal(sample.length,240);assert.equal(results.length,558);assert.equal(new Set(results.map(r=>r.callId)).size,558);
assert.equal(attempts.length,563);assert.equal(grades.length,558);assert.equal(pairs.length,279);
for(const h of json('grading-freeze.json').files)assert.equal(sha(fs.readFileSync(`${base}/${h.file}`)),h.sha256,h.file);
for(const r of results){
 const p=preps.findLast(p=>p.callId===r.callId&&p.promptSha256===r.promptSha256);
 assert.ok(p);assert.equal(sha(p.prompt),r.promptSha256);
 assert.equal(p.trace.embeddingCalls,1);assert.ok(r.usage.prompt_tokens+512<r.totalBudget*.95);
 assert.equal(r.finishReason,'stop');assert.ok(r.usage.completion_tokens<=512);
 assert.ok(r.wirePrompt.includes(p.system));assert.ok(r.wirePrompt.includes(p.prompt));
 for(const c of p.passages)assert.ok(p.prompt.includes(c.text));
 const expected=r.arm==='old'?{total:4096,context:1200,k:5}:{total:5000,context:3200,k:15};
 assert.deepEqual(p.settings,expected);
 assert.equal(p.trace.qdrantRequests.filter(q=>q.path.endsWith('/query')&&q.limit===1).length,1);
 if(!p.gateRejected)assert.ok(p.trace.qdrantRequests.some(q=>q.path.endsWith('/query')&&q.limit===expected.k));
}
for(const a of attempts.filter(r=>!r.success))assert.ok(results.some(r=>r.callId===a.callId));
for(const p of pairs){for(const arm of ['old','new'])assert.equal(grades.filter(g=>g.caseId===p.caseId&&g.arm===arm).length,1);}
for(const cohort of ['dev200','earlier40','offtopic'])for(const arm of ['old','new']){
 const rs=grades.filter(r=>r.cohort===cohort&&r.arm===arm),s=summary.cohorts[cohort][arm];
 assert.equal(rs.length,s.n);assert.equal(Object.values(s.outcomes).reduce((n,g)=>n+g.count,0),s.n);
 for(const grade of ['adequate','partial','wrong','refused'])assert.equal(rs.filter(r=>r.grade===grade).length,s.outcomes[grade].count);
}
assert.equal(summary.audit.frozenHashesUnchanged,true);
assert.equal(summary.audit.networkFilterViolations,0);assert.equal(summary.audit.contextViolations,0);assert.equal(summary.audit.embeddingViolations,0);
assert.equal(summary.audit.newPromptForbiddenPhrase.length,0);
assert.equal(rows('absence-claims.jsonl').length,95);
assert.equal(rows('refused-to-answered-audit.jsonl').length,39);
assert.equal(summary.offtopic.old.refused,39);assert.equal(summary.offtopic.new.refused,39);
const report=fs.readFileSync(`${base}/REPORT.md`,'utf8');for(let i=1;i<=9;i++)assert.ok(report.includes(`## ${i}.`));
for(const s of sample){assert.equal(pairs.filter(p=>p.caseId===s.caseId).length,1);assert.ok(s.cohort==='dev200'||s.cohort==='earlier40');}
const audit={at:new Date().toISOString(),passed:true,plannedCases:279,successfulAnswers:558,blindedGrades:558,changedCategories:rows('changed-cases.jsonl').length,absenceClaims:95,freezeUnchanged:true,promptUsageScopesAndPairCountsVerified:true,executionLocksRemain:['execution.lock','supervisor.lock'].filter(f=>fs.existsSync(`${base}/${f}`))};
fs.writeFileSync(`${base}/final-artifact-audit.json`,JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit,null,2));
