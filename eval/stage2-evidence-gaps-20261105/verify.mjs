import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const b='eval/stage2-evidence-gaps-20261105';
const json=f=>JSON.parse(fs.readFileSync(`${b}/${f}`,'utf8'));
const rows=f=>fs.readFileSync(`${b}/${f}`,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const cases=rows('cases.jsonl'),inputs=rows('inputs.jsonl'),computed=rows('computed-rankings.jsonl'),summary=json('summary.json');
const byId=new Map(inputs.map(r=>[r.blindId,r]));
assert.equal(cases.length,57);assert.equal(new Set(cases.map(r=>r.caseId)).size,57);
assert.equal(Object.values(summary.categories).reduce((a,b)=>a+b,0),57);
assert.equal(summary.categories.a??0,0);assert.equal(summary.categories.b,14);assert.equal(summary.categories.c,29);assert.equal(summary.categories['already-present'],3);assert.equal(summary.categories.unresolved,11);
for(const h of json('input-manifest.json').files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(h.file)).digest('hex'),h.sha256,h.file);
const dev=new Set(JSON.parse(fs.readFileSync('eval/split.json','utf8')).dev);
for(const r of cases){
 assert.ok(dev.has(r.paperId));assert.ok(r.offlineCounterfactuals.stage2ReplayExact);
 assert.equal(r.sources.classification,'computed now — offline witness/location comparison');
 if(r.category==='b')assert.ok(r.location.firstCompleteRank50>=16&&r.location.firstCompleteRank50<=50);
 if(r.gateRejected){const p=byId.get(r.blindId).preparation;assert.equal(p.chunks.length,0);assert.equal(p.trace.qdrantRequests.length,1);assert.equal(p.trace.qdrantRequests[0].limit,1);assert.ok(!p.trace.qdrantRequests[0].prefetch);assert.equal(r.subtype,'relevance-gate-short-circuit');}
 for(const u of r.neededEvidence.units)for(const a of u.alternatives){assert.ok(a.sourceChunk.text);assert.equal(a.sourceChunk.chunkIndex,a.index);}
}
assert.deepEqual(computed.map(r=>r.blindId),['R297','R464','R532','R546']);
assert.equal(json('network-audit.json').searchRequests,8);assert.equal(json('network-audit.json').embeddingRequests,4);assert.equal(json('network-audit.json').generationCalls,0);
for(const r of computed){const original=byId.get(r.blindId);assert.equal(r.question,original.question);assert.equal(r.documentId,original.documentId);assert.equal(r.trace.embeddingInputs[0],original.preparation.trace.embeddingInputs[0]);
 for(const q of r.trace.queries)for(const part of [q,...(q.prefetch??[])]){const f=part.filter.must.find(x=>x.key==='documentId');assert.deepEqual(f.match.any??[f.match.value],[original.documentId]);}
 for(const c of r.chunks){assert.equal(c.documentId,original.documentId);assert.equal(c.text,original.sourceAsset.chunks.find(x=>x.chunkIndex===c.chunkIndex).text);}
}
const report=fs.readFileSync(`${b}/REPORT.md`,'utf8');assert.equal((report.match(/^### R\d{3}:/gm)||[]).length,57);
for(const r of cases)assert.ok(report.includes(`### ${r.blindId}:`));
assert.equal(summary.blockedOfflineNetworkAttempts,0);assert.equal(summary.sourceIntegrity,true);
const audit={at:new Date().toISOString(),passed:true,cases:57,matchedActualStage2ContextReplays:57,newQueries:4,searchRequests:8,successfulEmbeddings:4,generationCalls:0,allProtectedFilesUnchanged:true,allFourLiveQueriesDevFilteredAndPayloadMatched:true,manualSourceAnchorsValidated:true,noHeldOutPayloadReads:true,notes:'Manual semantic targets and ambiguity flags remain reviewable judgments; assertions verify provenance, exposure and accounting, not independent human certification.'};
fs.writeFileSync(`${b}/verification.json`,JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit,null,2));
