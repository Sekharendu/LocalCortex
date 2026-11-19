/** Original-PDF acquisition only: no application imports, ingestion or model calls. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const value=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1]};
const indexPath=value('--index'),out=value('--out');
if(!indexPath||!out)throw new Error('Required: --index paper-index.json --out owned-artifact-directory');
const deadline=Date.parse(value('--deadline','2026-10-28T18:30:00Z'));
const deps=value('--deps','C:/Users/hp/Desktop/My Products/LocalCortex');
const papers=JSON.parse(fs.readFileSync(indexPath,'utf8'));
const ua='LocalCortex-QASPER-Evaluation/1.0 (research preparation; https://github.com/Sekharendu/LocalCortex)';
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(out,'pdfs'),{recursive:true});fs.mkdirSync(path.join(out,'metadata'),{recursive:true});
const manifest=path.join(out,'download-manifest.jsonl');
const previous=fs.existsSync(manifest)?fs.readFileSync(manifest,'utf8').split('\n').filter(Boolean).map(JSON.parse):[];
const completed=new Set(previous.filter(r=>r.event==='result').map(r=>r.paperId));
const interrupted=new Set(previous.filter(r=>r.event==='attempt'&&!completed.has(r.paperId)).map(r=>r.paperId));
const append=row=>fs.appendFileSync(manifest,JSON.stringify({...row,at:new Date().toISOString()})+'\n');
const pdfjs=await import(pathToFileURL(path.join(deps,'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
pdfjs.GlobalWorkerOptions.workerSrc=pathToFileURL(path.join(deps,'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
const norm=s=>s.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,'');
let last=0,stopped=null,processed=0;
const abort=new AbortController();process.once('SIGINT',()=>abort.abort());process.once('SIGTERM',()=>abort.abort());
async function request(url){
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,3100-(Date.now()-last))));
 if(Date.now()>=deadline||abort.signal.aborted)throw new Error('Acquisition deadline/cancellation');
 try{
  const response=await fetch(url,{headers:{'User-Agent':ua,Connection:'close'},redirect:'manual',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(30000)])});
  const reader=response.body?.getReader(),chunks=[];let total=0;try{if(reader)for(;;){const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>64*1024*1024)throw new RangeError('Original PDF response exceeds64MiB evaluation bound');chunks.push(Buffer.from(part.value));}}finally{if(reader){await reader.cancel().catch(()=>{});reader.releaseLock();}}
  return {response,bytes:Buffer.concat(chunks,total)};
 }finally{last=Date.now();}
}
for(const paper of papers){
 if(completed.has(paper.paperId))continue;
 if(Date.now()>=deadline||abort.signal.aborted){stopped='deadline-or-cancel';break;}
 if(!/^\d{4}\.\d{4,5}(v\d+)?$/.test(paper.paperId)){append({event:'result',paperId:paper.paperId,status:'invalid-arxiv-id',title:paper.title});continue;}
 const file=path.join(out,'pdfs',paper.paperId+'.pdf');
 if(interrupted.has(paper.paperId)&&!fs.existsSync(file)){append({event:'result',paperId:paper.paperId,status:'interrupted-no-auto-retry',title:paper.title});continue;}
 append({event:'attempt',paperId:paper.paperId,sourceUrl:'https://arxiv.org/pdf/'+paper.paperId});
 let sourceUrl='https://arxiv.org/pdf/'+paper.paperId,bytes,headers={},cached=fs.existsSync(file),status=null;
 try{
  if(cached)bytes=fs.readFileSync(file);
  else{
   for(let redirects=0;redirects<4;redirects++){
    const response=await request(sourceUrl);status=response.response.status;
    headers={lastModified:response.response.headers.get('last-modified'),contentType:response.response.headers.get('content-type')};
    if([301,302,303,307,308].includes(status)){
     const next=new URL(response.response.headers.get('location'),sourceUrl);if(!['arxiv.org','export.arxiv.org'].includes(next.hostname)||next.protocol!=='https:')throw new Error('Unexpected redirect target');sourceUrl=next.href;continue;
    }
    bytes=response.bytes;break;
   }
   if([403,429].includes(status)){stopped='source-access-or-rate-limit';append({event:'result',paperId:paper.paperId,title:paper.title,status:'source-blocked',httpStatus:status,sourceUrl});break;}
   if(status!==200||!bytes?.subarray(0,5).equals(Buffer.from('%PDF-'))){append({event:'result',paperId:paper.paperId,title:paper.title,status:'unavailable-or-not-pdf',httpStatus:status,sourceUrl});continue;}
   fs.writeFileSync(file,bytes,{flag:'wx'});
  }
  if(!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw new Error('Cached bytes are not PDF');
  const task=pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true});let firstPage='',pages=0,info={};
  try{const doc=await task.promise;pages=doc.numPages;const page=await doc.getPage(1);firstPage=(await page.getTextContent()).items.filter(i=>'str'in i).map(i=>i.str).join(' ');info=(await doc.getMetadata()).info??{};}finally{await task.destroy();}
  const titleVerified=norm(firstPage).includes(norm(paper.title));
  const idPattern=new RegExp(paper.paperId.replace('.','\\.')+'v\\d+');const version=firstPage.match(idPattern)?.[0]??null;
  const record={event:'result',paperId:paper.paperId,rowIndex:paper.paperRowIndex,title:paper.title,status:titleVerified&&version?'verified':'identity-review-required',file,sourceUrl,httpStatus:status,cached,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),pages,titleVerified,idStampMatched:!!version,pdfVersion:version,pdfCreationDate:info.CreationDate??null,...headers,versionCorrespondence:'QASPER source revision unknown; do not assume equivalence',firstPageTextFile:path.join('metadata',paper.paperId+'-first-page.txt')};
  const textFile=path.join(out,record.firstPageTextFile);if(!fs.existsSync(textFile))fs.writeFileSync(textFile,firstPage,{flag:'wx'});
  append(record);processed++;console.log(JSON.stringify({event:'pdf',paperId:paper.paperId,status:record.status,processed,targets:papers.length}));
 }catch(error){append({event:'result',paperId:paper.paperId,title:paper.title,status:'download-or-extraction-error',errorType:error.name,sourceUrl,httpStatus:status,cached});if(abort.signal.aborted){stopped='cancel';break;}}
}
const rows=fs.readFileSync(manifest,'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.event==='result');
const accountedIds=new Set(rows.map(r=>r.paperId));const coverage=papers.map(p=>({paperId:p.paperId,status:rows.findLast(r=>r.paperId===p.paperId)?.status??'pending-unattempted',attempted:rows.some(r=>r.paperId===p.paperId)}));
const summary={at:new Date().toISOString(),pendingUnattemptedIds:papers.filter(p=>!accountedIds.has(p.paperId)).map(p=>p.paperId),coverage,targets:papers.length,accounted:rows.length,verified:rows.filter(r=>r.status==='verified').length,statusCounts:rows.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{}),stopped,manifest,ratePolicy:{singleActiveRequest:true,minGapAfterResponseMs:3100,userAgent:ua},noIngestion:true,noProviderCalls:true};
fs.writeFileSync(path.join(out,'acquisition-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({event:'acquisition-complete',...summary}));
