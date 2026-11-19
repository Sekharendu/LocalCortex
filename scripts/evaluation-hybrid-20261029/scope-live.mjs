/** Isolated deterministic-vector integration test; never touches baseline collections. */
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
process.env.QDRANT_URL='http://127.0.0.1:36333';
const {app}=await import('./bootstrap.mjs');
const {ensureCollection,upsertChunks,searchSimilar,hybridSearch,deleteByDocumentId}=await app('src/retrieval/vectorStore.ts');
const {resolveDocumentScope}=await app('src/retrieval/documentScope.ts');
const {embedConfig}=await app('src/config.ts');
const collection='eval-qh-scope-'+process.pid+'-'+Date.now();
const vector=Array(embedConfig.dim).fill(0);vector[0]=1;
const sparse={indices:[17],values:[1]};
let created=false;
try {
 await ensureCollection(collection);created=true;
 await upsertChunks(collection,['a','b'].map(id=>({id:randomUUID(),denseVector:vector,sparseVector:sparse,payload:{documentId:id,source:id+'.pdf',chunkIndex:0,text:id==='a'?'AsterLab Retention Bulletin\nEffective 2026-01-01\n29 days':'Other Retention Bulletin\n17 days'}})));
 const scope=await resolveDocumentScope('document "AsterLab Retention Bulletin" effective 2026-01-01: how long?',collection);
 assert.deepEqual(scope.documentIds,['a']);
 for(const hits of [await searchSimilar(collection,vector,{documentIds:scope.documentIds,scoreThreshold:0.63}),await hybridSearch(collection,vector,sparse,{documentIds:scope.documentIds})])assert.ok(hits.length===1&&hits[0].payload.documentId==='a');
 assert.deepEqual(await searchSimilar(collection,vector,{documentIds:[]}),[]);
 assert.deepEqual(await hybridSearch(collection,vector,sparse,{documentIds:[]}),[]);
 // Deterministic interleaving: commit deletion after resolution, before either search.
 await deleteByDocumentId(collection,'a');
 assert.deepEqual(await searchSimilar(collection,vector,{documentIds:scope.documentIds,scoreThreshold:0.63}),[]);
 assert.deepEqual(await hybridSearch(collection,vector,sparse,{documentIds:scope.documentIds}),[]);
 assert.equal((await searchSimilar(collection,vector,{scoreThreshold:0.63}))[0].payload.documentId,'b');
 assert.equal((await resolveDocumentScope('document "AsterLab Retention Bulletin"',collection)).status,'missing');
 console.log(JSON.stringify({passed:true,collection,deterministicDeletionInterleaving:true,providerCalls:0,baselineCollectionsMutated:false}));
} finally {
 if(created){const response=await fetch(process.env.QDRANT_URL+'/collections/'+collection,{method:'DELETE',signal:AbortSignal.timeout(10000)});await response.text();if(!response.ok)throw Error('Isolated scope test collection cleanup failed');}
}
