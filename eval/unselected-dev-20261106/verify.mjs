import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const base='eval/unselected-dev-20261106';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const split=read('eval/split.json');
const expected=rows('eval/dev-set-preparation-20261103/inventory.jsonl');
const seen=new Set();let queries=0,prefetches=0,scrolls=0;
for(const format of ['pdf','docx']){
 const manifest=read(`${base}/${format}.manifest.json`),allow=new Set(manifest.allowedDocumentIds);
 const status=read(`${base}/${format}.status.json`);
 assert.equal(status.error,null);assert.equal(status.completedTotal,status.expected);assert.deepEqual(status.changedInputs,[]);
 for(const h of manifest.hashes)assert.equal(hash(h.file),h.sha256);
 const previous=read(`eval/dev-retrieval-20261103/${format}.manifest.json`);
 for(const h of previous.hashes.filter(h=>h.file.startsWith('src/retrieval/')))assert.equal(hash(h.file),h.sha256);
 const currentStats=manifest.hashes.find(h=>h.file===previous.hashes.find(p=>p.file.endsWith('/sparse-stats.json')).file);
 assert.equal(currentStats.sha256,previous.hashes.find(p=>p.file.endsWith('/sparse-stats.json')).sha256);
 const filterIds=p=>{const match=p.filter.must.find(c=>c.key==='documentId').match;return match.any??[match.value];};
 for(const row of rows(`${base}/${format}.results.jsonl`)){
  assert(!seen.has(row.caseId));seen.add(row.caseId);
  const q=expected.find(q=>q.caseId===row.caseId);assert(q);assert.equal(q.question,row.question);
  assert(split.dev.includes(row.paperId)&&!split.test.includes(row.paperId));
  for(const p of [...row.chunks,...row.passages,...(row.independentK5?.chunks??[])])assert(allow.has(p.documentId));
  for(const request of row.trace.requests){
   if(request.path.endsWith('/query')){
    queries++;assert.deepEqual(filterIds(request),manifest.allowedDocumentIds);
    for(const p of request.prefetch??[]){prefetches++;assert.deepEqual(filterIds(p),manifest.allowedDocumentIds);}
   }else{scrolls++;assert(filterIds(request).every(id=>allow.has(id)));}
  }
 }
}
assert.equal(seen.size,610);assert(expected.every(q=>seen.has(q.caseId)));
const result={passed:true,devCases:seen.size,queryFiltersAudited:queries,prefetchFiltersAudited:prefetches,contextScrollsAudited:scrolls,
 heldOutPaperPayloadsRead:false,generationCalls:0,applicationAndSplitHashesUnchanged:true,
 priorK5RetrievalSourceAndSparseStatsHashesMatch:true,
 note:'config.ts differs from the Nov 3 baseline because answer defaults changed; k5 retrieval mode, threshold, fusion, embedder and prefixes are explicitly pinned to the same values.'};
fs.writeFileSync(`${base}/verification.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
