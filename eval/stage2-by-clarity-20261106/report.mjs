import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const base='eval/stage2-by-clarity-20261106';
const files={judgments:'eval/stage2-end-to-end-20261105/judgments.jsonl',
 gates:'eval/stage2-end-to-end-20261105/gate-rejections.jsonl',
 gaps:'eval/stage2-evidence-gaps-20261105/cases.jsonl',
 clarity:'eval/dev-question-clarity-20261106/cases.jsonl',split:'eval/split.json'};
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const hashes=Object.values(files).map(file=>({file,sha256:sha(fs.readFileSync(file))}));
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const judgments=rows(files.judgments),gates=rows(files.gates),gaps=rows(files.gaps),clarity=rows(files.clarity);
const split=JSON.parse(fs.readFileSync(files.split,'utf8'));
const groups=['standalone','topical_missing_context','generic_missing_context'];
const labels={standalone:'Standalone',topical_missing_context:'Topic given; context missing',generic_missing_context:'Too general'};
const grades=['adequate','partial','wrong','refused'];
const byCase=new Map(clarity.map(c=>[c.caseId,c]));
assert.equal(byCase.size,610);
const gapByCase=new Map(gaps.map(g=>[g.caseId,g]));assert.equal(gapByCase.size,57);
const key=x=>`${x.caseId}:${x.arm}`;
const byCall=new Map(judgments.map(j=>[key(j),j]));assert.equal(byCall.size,judgments.length);
const gateKeys=new Set(gates.map(key));
assert.deepEqual([...gateKeys].sort(),judgments.filter(j=>j.gateRejected).map(key).sort());
const cohortRows=cohort=>judgments.filter(j=>j.cohort===cohort);
for(const j of [...cohortRows('dev200'),...cohortRows('earlier40')]){
 const c=byCase.get(j.caseId);assert(c);assert.equal(c.question,j.question);
 assert(split.dev.includes(c.paperId)&&!split.test.includes(c.paperId));
 assert(groups.includes(c.group));assert(grades.includes(j.grade));
}
const new200=cohortRows('dev200').filter(j=>j.arm==='new');
assert.equal(new200.length,200);
assert.deepEqual(gaps.map(g=>g.caseId).sort(),new200.filter(j=>['absent','partial'].includes(j.evidence)).map(j=>j.caseId).sort());
assert.equal(new200.filter(j=>j.gateRejected).length,25);
assert.equal(gaps.filter(g=>g.category==='b').length,14);
assert(gaps.every(g=>byCall.get(`${g.caseId}:new`).cohort==='dev200'));
assert.deepEqual(new200.filter(j=>j.gateRejected).map(j=>j.caseId).sort(),cohortRows('dev200').filter(j=>j.arm==='old'&&j.gateRejected).map(j=>j.caseId).sort());

function buildCohort(cohort){
 const values=cohortRows(cohort),result=[];
 for(const group of groups){
  const a=values.filter(j=>byCase.get(j.caseId).group===group);
  const old=a.filter(j=>j.arm==='old'),fresh=a.filter(j=>j.arm==='new');
  assert.deepEqual(old.map(j=>j.caseId).sort(),fresh.map(j=>j.caseId).sort());
  const count=arm=>Object.fromEntries(grades.map(g=>[g,a.filter(j=>j.arm===arm&&j.grade===g).length]));
  const relevantGaps=cohort==='dev200'?gaps.filter(g=>byCase.get(g.caseId).group===group):[];
  result.push({group,label:labels[group],caseUnits:old.length,uniqueQuestionIds:new Set(old.map(j=>byCase.get(j.caseId).questionId)).size,
   fewerThan20CaseUnits:old.length<20,old:count('old'),new:count('new'),
   gates:{old:old.filter(j=>j.gateRejected).length,new:fresh.filter(j=>j.gateRejected).length},
   missingEvidenceOf57:cohort==='dev200'?relevantGaps.length:null,
   ranks16to50Of14:cohort==='dev200'?relevantGaps.filter(g=>g.category==='b').length:null});
 }
 return result;
}
const dev200=buildCohort('dev200'),earlier40=buildCohort('earlier40');
for(const arm of ['old','new'])for(const grade of grades)assert.equal(dev200.reduce((n,g)=>n+g[arm][grade],0),new200.length&&cohortRows('dev200').filter(j=>j.arm===arm&&j.grade===grade).length);
assert.equal(dev200.reduce((n,g)=>n+g.caseUnits,0),200);
assert.equal(dev200.reduce((n,g)=>n+g.gates.new,0),25);
assert.equal(dev200.reduce((n,g)=>n+g.missingEvidenceOf57,0),57);
assert.equal(dev200.reduce((n,g)=>n+g.ranks16to50Of14,0),14);
const joined=new200.map(j=>{
 const c=byCase.get(j.caseId),old=byCall.get(`${j.caseId}:old`),gap=gapByCase.get(j.caseId);
 return {caseId:j.caseId,questionId:c.questionId,paperId:c.paperId,format:c.format,question:j.question,
  clarityGroup:c.group,clarityLabel:c.label,clarityBorderline:c.borderline,
  old:{grade:old.grade,evidence:old.evidence,gateRejected:old.gateRejected,blindId:old.blindId},
  new:{grade:j.grade,evidence:j.evidence,gateRejected:j.gateRejected,blindId:j.blindId},
  memberOfSaved57:!!gap,memberOfSaved14:gap?.category==='b',
  savedGapCategory:gap?.category??null,savedGapSubtype:gap?.subtype??null,
  savedRank:gap?.location?.firstCompleteRank50??null};
});
const totals=Object.fromEntries(['old','new'].map(arm=>[arm,Object.fromEntries(grades.map(g=>[g,dev200.reduce((n,x)=>n+x[arm][g],0)]))]));
const summary={cohort:'dev200',caseUnits:200,paperSelected:true,dev200,totals,earlier40Separate:earlier40,
 diagnosticTotals:{relevanceGateRejected:25,savedMissingEvidenceSet:57,foundRanks16to50:14},
 fewerThan20:{dev200:dev200.filter(g=>g.fewerThan20CaseUnits).map(g=>({group:g.group,cases:g.caseUnits})),
 earlier40:earlier40.filter(g=>g.fewerThan20CaseUnits).map(g=>({group:g.group,cases:g.caseUnits}))},
 preservedHistorical57Categories:Object.fromEntries([...new Set(gaps.map(g=>g.category))].map(k=>[k,gaps.filter(g=>g.category===k).length])),
 searches:0,embeddingCalls:0,generationCalls:0,heldOutPaperContentRead:false,hashes};
const write=(file,value)=>fs.writeFileSync(`${base}/${file}`,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});
write('summary.json',summary);write('joined-dev200.jsonl',joined.map(j=>JSON.stringify(j)).join('\n')+'\n');
const outcomes=values=>[
 '| Clarity group | Cases per arm | Settings | Adequate | Partial | Wrong | Refused |',
 '| --- | ---: | --- | ---: | ---: | ---: | ---: |',
 ...values.flatMap(g=>['old','new'].map(arm=>`| ${g.label}${g.fewerThan20CaseUnits?' **(under 20)**':''} | ${g.caseUnits} | ${arm} | ${grades.map(k=>g[arm][k]).join(' | ')} |`))];
const report=[
 '# Saved Stage 2 outcomes by question clarity', '',
 'Prepared 6 November 2026 by an offline case-ID join. No retrieval, embedding, generation calls, label edits, held-out paper content reads, application changes or changes to previous results. Counts are PDF/DOCX case units, not necessarily independent original question IDs.', '',
 '## Main sample: 200 dev cases', '',
 'The requested totals of 25 relevance-gate rejections, 57 missing/incomplete-evidence cases and 14 rank-16–50 cases all belong to the dev200 cohort. The earlier40 cohort and 39 off-topic controls are excluded from this table. Every case appears once per arm, with unchanged saved grades.', '',
 ...outcomes(dev200),
 ...['old','new'].map(arm=>`| **Total** | **200** | **${arm}** | ${grades.map(k=>`**${totals[arm][k]}**`).join(' | ')} |`), '',
 '## Diagnostic groups within the same 200 cases', '',
 '| Clarity group | Cases | Gate rejections (of 25) | Saved missing-evidence cases (of 57) | Found at ranks 16–50 (of 14) |',
 '| --- | ---: | ---: | ---: | ---: |',
 ...dev200.map(g=>`| ${g.label}${g.fewerThan20CaseUnits?' **(under 20)**':''} | ${g.caseUnits} | ${g.gates.new} | ${g.missingEvidenceOf57} | ${g.ranks16to50Of14} |`),
 '| **Total** | **200** | **25** | **57** | **14** |', '',
 'The same 25 case IDs were rejected by the relevance gate in both arms; they are counted once here. The 57 and 14 refer to the new arm only. The 14 are a subset of the 57. The 25 gate rejections are also contained in the 57. These columns overlap and must not be added.', '',
 'The historical 57-case membership is preserved exactly. The later saved audit classified 3 as already present and 11 as unresolved. They remain in the requested 57-case cross-tab; this report does not rejudge or relabel them. The ranks16–50 column uses the saved gap category b, without recomputing ranks.', '',
 '## Small groups', '',
 'Only the standalone group in the main sample has fewer than 20 cases: 13 case units. The other groups have 77 and 110. Small-group percentages would be unstable, so raw counts are shown. Question-level counts, including the number of distinct original IDs in each group, are in summary.json.', '',
 '## Earlier 40 cases, kept separate', '',
 ...outcomes(earlier40), '',
 'The standalone group (3) and topic/context-missing group (15) have fewer than 20 earlier40 case units. The generic group has 22. This cohort was used in earlier prompt selection and is not part of the requested 25/57/14 denominators.', '',
 '## Interpretation', '',
 'These Stage 2 answers used the original question with the correct paper selected, in both arms. They are not the subsequent no-selection test and do not measure no-selection answer quality. Selected-paper context already resolves much of a vague question\'s missing reference. Associations between clarity groups and failures do not prove that question wording caused those failures. The clarity labels are provisional assistant question-only judgments, including saved borderline flags, not new outcome labels.', '',
 'Old settings: 4096 total / 1200 per-document context / 5 hits / strict prompt. New settings: 5000 total / 3200 per-document context / 15 hits / prompt C. Both used Qwen, hybrid retrieval, reranking off, temperature 0 and explicit output max_tokens 512.', '',
 '## Artifacts and checks', '',
 '- joined-dev200.jsonl: every main-sample case, preserved clarity label, old/new grades, gate flags and diagnostic membership.',
 '- summary.json: group counts, separate earlier40 counts, small-group flags and input hashes.',
 '- verification.json: totals, subset checks and before/after hashes.',
 '- report.mjs: reproducible offline join and assertions.', '',
 'Saved inputs:', '',...Object.entries(files).map(([name,file])=>`- ${name}: ${file}`),
 ];
write('REPORT.md',report.join('\n')+'\n');
assert(hashes.every(h=>sha(fs.readFileSync(h.file))===h.sha256));
write('verification.json',{passed:true,matchedDevCaseUnits:200,matchedArms:400,earlier40CaseUnits:40,
  noUnmatchedClarityLabels:true,allGradesAndClarityLabelsPreserved:true,same25GateCaseIdsInBothArms:true,
  exact57MembershipMatchesSavedNewArmEvidenceLabels:true,rank16to50Count:14,
  diagnosticSetsOverlap:true,inputHashesUnchanged:true,searches:0,embeddingCalls:0,generationCalls:0,heldOutPaperContentRead:false});
console.log(JSON.stringify({dev200,totals,earlier40},null,2));
