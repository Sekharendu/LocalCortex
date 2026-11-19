import fs from 'node:fs';
const base='eval/stage2-end-to-end-20261105';
if(fs.existsSync(`${base}/handbook.json`)){console.log('Handbook fixture already prepared');process.exit(0);}
Object.assign(process.env,{QDRANT_URL:'http://127.0.0.1:36333',OLLAMA_URL:'http://127.0.0.1:11434',
 DOC_STORE_PATH:`${base}/handbook-documents.json`,SPARSE_STATS_PATH:`${base}/handbook-sparse-stats.json`});
const {ingestDocument}=await import('../../src/ingest/pipeline.ts');
const collection='eval-stage2-offtopic-20261105';
const result=await ingestDocument('data/eval-corpus.txt',{collection,strategy:'recursive',maxSize:500});
if(!result.success)throw Error(JSON.stringify(result));
fs.writeFileSync(`${base}/handbook.json`,JSON.stringify({collection,...result},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
