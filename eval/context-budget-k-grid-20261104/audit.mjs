import fs from 'node:fs';
import crypto from 'node:crypto';
import { countTokens } from '../../src/generation/tokens.ts';
const base='eval/context-budget-k-grid-20261104';
const read=f=>JSON.parse(fs.readFileSync(f));
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const norm=x=>x.replace(/\s+/gu,' ').trim();
const summary=read(base+'/summary.json'),results=rows(base+'/case-results.jsonl');
const prompts=rows(base+'/assembled-prompts.jsonl'),tokens=rows(base+'/prompt-token-log.jsonl');
const priorPrompts=new Map(rows('eval/context-budget-2400-20261104/assembled-prompts.jsonl').filter(p=>p.cap===2400).map(p=>[p.caseId,p]));
if(results.length!==119||new Set(results.map(r=>r.caseId)).size!==119||prompts.length!==476||tokens.length!==476)throw Error('Wrong counts');
if(new Set(prompts.map(p=>p.caseId+':'+p.variant)).size!==476)throw Error('Duplicate case/variant');
for(const c of results){
 const baseline=c.arms.find(a=>a.id==='2400-k15');
 for(const arm of c.arms){
  const p=prompts.find(p=>p.caseId===c.caseId&&p.variant===arm.id),t=tokens.find(t=>t.caseId===c.caseId&&t.variant===arm.id);
  if(!p||!t||sha(p.prompt)!==arm.promptSha256)throw Error('Prompt mapping');
  const covered=arm.references.some(r=>r.items.length&&r.items.every(i=>p.passages.some(p=>norm(p.text).includes(norm(i.quote)))));
  if(covered!==arm.covered)throw Error('Coverage differs from final strings');
  const recomputed=countTokens(p.system)+countTokens(p.prompt)+32;
  if(t.totalPromptTokens!==recomputed||t.totalWithReserve!==recomputed+512||t.answerReserveTokens!==512)throw Error('Token reserve/count drift');
  if(t.effectivePerDocumentLimit!==Math.min(t.cap,t.availableContextTokens))throw Error('Global budget bypass');
  const change=baseline.covered===covered?(covered?'both-covered':'neither-covered'):(covered?'gained':'lost');
  if(c.changes.find(a=>a.variant===arm.id)?.change!==change)throw Error('Bad flip label');
  if(arm.id==='2400-k15'&&(p.prompt!==priorPrompts.get(c.caseId)?.prompt||JSON.stringify(p.passages)!==JSON.stringify(priorPrompts.get(c.caseId)?.passages)))throw Error('Prior baseline changed');
 }
}
for(const v of summary.variants){
 const covered=results.filter(r=>r.arms.find(a=>a.id===v.id).covered).length;
 const gained=results.filter(r=>r.changes.find(a=>a.variant===v.id).change==='gained').length;
 const lost=results.filter(r=>r.changes.find(a=>a.variant===v.id).change==='lost').length;
 if(covered!==v.covered||gained!==v.gained||lost!==v.lost||covered!==98+gained-lost)throw Error('Aggregate mismatch');
}
for(const h of read(base+'/manifest.json').inputHashes)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('Input/app changed');
for(const manifest of ['eval/reranker-dev-20261102-r1/submission/manifest.json','eval/reranker-dev-20261102-live-r2/manifest.json'])
 for(const h of read(manifest).files)if(sha(fs.readFileSync(h.file))!==h.sha256)throw Error('Prior application snapshot changed');
const audit={cases:119,variants:4,assembledPromptCoverageChecks:476,promptTokenRecounts:476,
 baselinePromptAndContextMatches:119,allFlipLabelsAndAggregatesVerified:true,
 inputsAndApplicationSnapshotsUnchanged:true,budgetViolations:tokens.filter(t=>!t.within4096WithReserve).length,
 retrievalCalls:0,generationCalls:0,networkCalls:0};
fs.writeFileSync(base+'/audit.json',JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
const files=fs.readdirSync(base).filter(f=>f!=='artifact-manifest.json').map(f=>({file:base+'/'+f,sha256:sha(fs.readFileSync(base+'/'+f)),bytes:fs.statSync(base+'/'+f).size}));
fs.writeFileSync(base+'/artifact-manifest.json',JSON.stringify({snapshot:'CONTEXT-CAP-K-GRID-20261104',files},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(audit,null,2));
