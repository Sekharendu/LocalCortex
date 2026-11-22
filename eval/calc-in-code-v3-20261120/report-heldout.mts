import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { isRefusal } from '../../src/generation/refusal.ts';

const folder='eval/calc-in-code-v3-20261120';
const read = (name: string) => readFileSync(`${folder}/${name}.jsonl`, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const cases = read('heldout-prompts');
const models = ['granite','glm'];
const caps = {granite:2500,glm:7000};
const initialId = (key: string) => key.split('/')[0];
const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[−–]/g,'-').replace(/(?<=\d),(?=\d{3}\b)/g,'').replace(/[^\p{L}\p{N}.%+-]+/gu,' ').trim();
const contains = (answer: string, reference: unknown) => {
  const refs = Array.isArray(reference) ? reference : [reference];
  const text = ' '+norm(answer).replace(/\.(?=\s|$)/g,'')+' ';
  return refs.length>0 && refs.every(value=>{
    if (value===null || value===undefined || String(value).trim()==='') return false;
    const key=norm(String(value)).replace(/\.(?=\s|$)/g,'');
    if (/^-?\d+(?:\.\d+)?$/.test(key)) {
      const values=[...text.matchAll(/(?<![\p{L}\p{N}.-])-?\d+(?:\.\d+)?(?![\p{L}\p{N}.])/gu)].map(match=>Number(match[0]));
      return values.some(n=>n===Number(key));
    }
    return text.includes(' '+key+' ');
  });
};
const classify = (q: any, a: any) => {
  if (!a) return 'No output';
  if (a.empty) return 'Empty draft';
  if (a.status==='fallback' || isRefusal(a.answer)) return 'Refused';
  return contains(a.answer,q.reference) ? 'Reference match' : 'Needs review';
};
const reports = models.map(model=>{
  const rows=existsSync(`${folder}/heldout-${model}.jsonl`)?read(`heldout-${model}`):[];
  const requests=rows.filter(row=>row.kind==='request');
  const responses=rows.filter(row=>row.kind==='response');
  const providerErrors=rows.filter(row=>row.kind==='provider-error');
  const providerErrorById=new Map(providerErrors.map(row=>[initialId(row.key),row]));
  const attemptedIds=new Set(requests.map(row=>initialId(row.key)));
  const responseIds=new Set(responses.map(row=>row.key));
  const answers=new Map(rows.filter(row=>row.kind==='answer').map(row=>[row.id,row]));
  const spent=responses.reduce((s,row)=>s+row.neurons,0);
  const reserved=requests.filter(row=>!responseIds.has(row.key)).reduce((s,row)=>s+row.reserve,0);
  const metric=(subset: any[])=>Object.fromEntries(['Reference match','Needs review','Refused','Empty draft','No output'].map(label=>[label,subset.filter(q=>classify(q,answers.get(q.id))===label).length]));
  return {model,requests,responses,answers,spent,reserved,metric,providerErrors,providerErrorById,attemptedIds};
});
const paired=cases.filter(q=>reports.every(r=>r.answers.has(q.id)&&!r.answers.get(q.id).empty));
const summary=reports.map(r=>({model:r.model,cap:caps[r.model],spent:r.spent,reserved:r.reserved,requests:r.requests.length,attempted:new Set(r.requests.filter(row=>!row.key.endsWith('/retry')).map(row=>initialId(row.key))).size,processed:r.answers.size,usable:[...r.answers.values()].filter(a=>!a.empty).length,retries:[...r.answers.values()].filter(a=>a.retried).length,retrySkipped:[...r.answers.values()].filter(a=>a.retrySkipped).length,length:[...r.answers.values()].filter(a=>a.finish==='length').length,computed:[...r.answers.values()].filter(a=>a.status==='computed').length,metrics:r.metric(cases),paired:r.metric(paired),input:r.responses.reduce((s,r)=>s+(r.usage.prompt_tokens??0),0),output:r.responses.reduce((s,r)=>s+(r.usage.completion_tokens??0),0)}));
const sources = [...new Set(cases.map(q=>q.source))].sort();
const bySource = sources.map(source=>{
  const subset=cases.filter(q=>q.source===source);
  return {source,total:subset.length,models:reports.map(r=>({model:r.model,...r.metric(subset)}))};
});
const glmPilot = reports[1].responses.filter(row=>!row.key.includes('/direct'));
const glmPilotEmpty = glmPilot.filter(row=>!row.raw.trim()).length;
const gradesFile = `${folder}/heldout-manual-grades.json`;
const labels = {C:'Correct',P:'Partial',W:'Wrong',R:'Refused',E:'No answer'};
type Grade = keyof typeof labels;
const grades: [string,Grade|null,Grade|null][] = existsSync(gradesFile) ? JSON.parse(readFileSync(gradesFile,'utf8')) : [];
const gradeById = new Map(grades.map(([id,...verdicts])=>[id,verdicts]));
if (gradeById.size!==grades.length || grades.some(([id,...verdicts])=>verdicts.some((grade,i)=>grade!==null && (!(grade in labels)||!reports[i].answers.has(id))))) throw new Error('Manual grades must refer to unique saved outputs');
const manualMetrics = (rows: typeof grades) => models.map((model,i)=>{
  const verdicts = rows.map(row=>row[i+1]).filter(grade=>grade!==null);
  return {model,questions:verdicts.length,...Object.fromEntries(Object.entries(labels).map(([key,label])=>[label,verdicts.filter(grade=>grade===key).length]))};
});
const manuallyGraded = manualMetrics(grades);
const pairedGrades = manualMetrics(grades.filter(([,a,b])=>a!==null && b!==null));
const financeGrades = manualMetrics(grades.filter(([id])=>id.startsWith('tat-') || id.startsWith('financebench-')));
const escape = (s: unknown) => String(s??'').replaceAll('|','\\|').replace(/\s*\r?\n\s*/g,' ⏎ ');
const quotaError = reports.some(r=>r.providerErrors.some(error=>error.category==='quota'));
const retryRejected = reports.every(r=>r.providerErrors.some(error=>error.endpoint==='v1/chat/completions' && error.http===429));
const quotaProbe = reports.flatMap(r=>r.providerErrors).filter(error=>error.allocationMessage).at(-1);
const out=['# Finance v3 on the held-out test set','','Both models received the same frozen prompts. The set has 240 questions. Saved hybrid and reranker rankings were blended for 234 questions. The remaining six used saved hybrid ranking.','','Reference match means the normalized reference text or numeric value appears in the answer. This screen can miss paraphrases, sign or unit conversions, and rounded values. It can also count an answer that mentions the expected number in the wrong role.','',
  ...(quotaError ? ['Both runs stopped on Cloudflare HTTP 429 / error 4006. The runner classified a subsequent Granite response as quota-related. The Cloudflare dashboard showed 4.76k of 10k Neurons used, leaving about 5.24k. Both model-specific caps had room. The cause of the discrepancy between the API rejection and the dashboard is unverified.',''] : []),
  ...(retryRejected ? ['Resume requests for both models were also rejected on the Workers AI inference and Chat Completions endpoints. Neither endpoint returned a new metered answer.',''] : []),
  ...(quotaProbe ? [`The diagnostic request at ${quotaProbe.at} reproduced the daily-allocation message directly from Workers AI. Cloudflare request ID: ${quotaProbe.requestId??'unavailable'}. Ray ID: ${quotaProbe.ray??'unavailable'}.`,'',
    'The configured inference token could run the benchmark, but Cloudflare denied account Analytics access. The earlier Qwen dev ledger records 8,002.06 Neurons on the prior UTC date, within 24 hours of the rejected requests. A usage window that includes prior-day spend could explain the discrepancy. The actual enforcement window and any account-side issue remain unverified. A similar mismatch is documented in [Cloudflare’s open issue #34137](https://github.com/cloudflare/cloudflare-docs/issues/34137).',''] : []),
  `GLM's initial default-reasoning pilot returned ${glmPilotEmpty} empty drafts in ${glmPilot.length} metered responses. The remaining run requested enable_thinking: false and re-attempted pilot questions that lacked text. Any pilot answer with text was kept. Confirmed pilot spending is included. Unmetered requests retain their full reservations.`,'',
  '| Model | Cap | Confirmed Neurons | Reserved | Attempted | Processed | Returned text | Reference matches | Refusals | Needs review | Empty draft | Format retries |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...summary.map(r=>`| ${r.model} | ${r.cap} | ${r.spent.toFixed(2)} | ${r.reserved} | ${r.attempted} | ${r.processed} | ${r.usable} | ${r.metrics['Reference match']} | ${r.metrics.Refused} | ${r.metrics['Needs review']} | ${r.metrics['Empty draft']} | ${r.retries} |`),'',
  `The common set contains ${paired.length} questions for which both models produced a nonempty draft.`,'',
  '| Model | Reference matches | Refusals | Needs review |','|---|---:|---:|---:|',...summary.map(r=>`| ${r.model} | ${r.paired['Reference match']} | ${r.paired.Refused} | ${r.paired['Needs review']} |`),'',
  '| Source | Questions | Granite returned text | Granite reference matches | GLM returned text | GLM reference matches |','|---|---:|---:|---:|---:|---:|',
  ...bySource.map(r=>`| ${r.source} | ${r.total} | ${r.total-r.models[0]['No output']-r.models[0]['Empty draft']} | ${r.models[0]['Reference match']} | ${r.total-r.models[1]['No output']-r.models[1]['Empty draft']} | ${r.models[1]['Reference match']} |`),'',
  `A single review scored ${manuallyGraded.reduce((total,row)=>total+row.questions,0)} saved outputs against their references, with source evidence resolving the rounded 3M PP&E reference. A correct answer resolves what the question asked. Material omissions, unsupported contradictions in otherwise useful answers, or rounding that loses the requested precision received partial credit. Refusal includes answers that say the information is unavailable.`,'',
  '| Sample | Model | Questions | Correct | Partial | Wrong | Refused | No answer |','|---|---|---:|---:|---:|---:|---:|---:|',
  ...[['All graded outputs',manuallyGraded],['Shared questions',pairedGrades],['FinanceBench and TAT-QA',financeGrades]].flatMap(([sample,rows])=>(rows as typeof manuallyGraded).map(r=>`| ${sample} | ${r.model} | ${r.questions} | ${Object.values(labels).map(label=>r[label]).join(' | ')} |`)),'',
  '| ID | Question | Reference | Granite output | GLM output |','|---|---|---|---|---|'];
for (const q of cases) {
  const outputs = reports.map((r,i)=>{
    const answer=r.answers.get(q.id);
    if (answer) {
      const grade=gradeById.get(q.id)?.[i] as keyof typeof labels | undefined;
      return `${grade?labels[grade]:classify(q,answer)} · ${escape(answer.answer)}`;
    }
    const error=r.providerErrorById.get(q.id);
    if (error) return `Cloudflare HTTP ${error.http} / ${error.code}`;
    return r.attemptedIds.has(q.id) ? 'No metered output' : 'Unattempted';
  });
  const reference=Array.isArray(q.reference)?q.reference.join(' / '):q.reference;
  out.push(`| ${q.id} | ${escape(q.question)} | ${escape(reference)} | ${outputs.join(' | ')} |`);
}
writeFileSync(`${folder}/HELDOUT-MODEL-COMPARISON.md`,out.join('\n')+'\n');
console.log(JSON.stringify({paired:paired.length,glmPilot:{metered:glmPilot.length,empty:glmPilotEmpty,spent:glmPilot.reduce((sum,row)=>sum+row.neurons,0)},models:summary,bySource,manuallyGraded,pairedGrades,financeGrades},null,2));
