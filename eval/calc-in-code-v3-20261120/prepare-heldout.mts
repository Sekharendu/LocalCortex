import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildPrompt } from '../../src/generation/promptBuilder.ts';
import { countTokens } from '../../src/generation/tokens.ts';
import { C_REMINDER } from '../../src/generation/promptVariants.ts';
import type { ChunkPayload } from '../../src/types.ts';

const folder = 'eval/calc-in-code-v3-20261120';
const read = (file: string) => readFileSync(file, 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const protocol = JSON.parse(readFileSync(`${folder}/protocol.json`, 'utf8'));
process.env.QDRANT_URL = 'http://127.0.0.1:36333';
const { selectPassages } = await import('../../src/retrieval/context.ts');
const candidates = new Map(read('eval/final-test-20261117/candidates-ragbench.jsonl').map(row => [row.id, row]));
const scores = new Map(read('eval/final-test-20261117/scores-ragbench.jsonl').map(row => [row.id, row.scores]));
const questions = read('eval/ragbench-20261115/test.jsonl');
if (questions.length !== 240 || new Set(questions.map(row => row.id)).size !== 240) throw new Error('Unexpected test set');
const documents = new Map<string, ChunkPayload[]>();
async function loadPage(offset: string | number | undefined) {
  for (let attempt=0; ; attempt++) {
    try {
      const response=await fetch('http://127.0.0.1:36333/collections/eval-ragbench-test-20261117/points/scroll',{
        method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),
        body:JSON.stringify({limit:1000,offset,with_payload:true,with_vector:false}),
      });
      if (!response.ok) { await response.body?.cancel(); throw new Error(`Index HTTP ${response.status}`); }
      return (await response.json()).result;
    }
    catch (error) {
      if (attempt>=3) throw error;
      await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
    }
  }
}
let next: string | number | undefined;
do {
  const page=await loadPage(next);
  for(const point of page.points) {
    const chunk=point.payload as ChunkPayload;
    const chunks=documents.get(chunk.documentId);
    if(chunks) chunks.push(chunk);
    else documents.set(chunk.documentId,[chunk]);
  }
  next=page.next_page_offset??undefined;
} while (next!==undefined);
for(const chunks of documents.values()) chunks.sort((a,b)=>a.chunkIndex-b.chunkIndex);
const prepared = [];
for (const q of questions) {
  const c = candidates.get(q.id);
  if (!c || q.question !== c.question || !q.path.includes('/docs/test/')) throw new Error(`Invalid held-out candidate ${q.id}`);
  const rank: number[] = c.hybrid;
  const rerank = scores.get(q.id);
  if (rerank && rank.some(i => !Number.isFinite(rerank[i]))) throw new Error(`Incomplete scores ${q.id}`);
  const ordered = rerank ? [...rank].sort((a,b) => rerank[b]-rerank[a]) : rank;
  const blend = (index: number) => .5/(60+rank.indexOf(index)+1)+.5/(60+ordered.indexOf(index)+1);
  const top = [...rank].sort((a,b) => blend(b)-blend(a)).slice(0,10);
  const chunks = documents.get(c.documentId);
  if (!chunks) throw new Error(`Missing indexed document ${q.id}`);
  const hits = top.map(i => {
    const chunk = chunks.find(x => x.chunkIndex === i);
    if (!chunk || chunk.text !== c.texts[i]) throw new Error(`Candidate text mismatch ${q.id}/${i}`);
    return { ...chunk, score: blend(i) };
  });
  const overhead = protocol.prompts.v3 + '\n' + buildPrompt(q.question, [{text:'',source:'',score:0}], [], 'concise').replace(C_REMINDER, protocol.prompts.reminder);
  const passages = selectPassages([{chunks,hits}], {budgetTokens:5000-512-32-countTokens(overhead),wholeMaxTokens:1000,chunkedMaxTokens:3200,titleChunk:true});
  const prompt = buildPrompt(q.question, passages, [], 'concise').replace(C_REMINDER, protocol.prompts.reminder);
  prepared.push({id:q.id,source:q.source,question:q.question,reference:q.answer,answerType:q.meta?.answerType,prompt,context:passages.map(p=>p.text).join('\n\n'),promptSha256:sha(prompt),retrieval:rerank?'blend':'hybrid'});
  if (prepared.length%40===0) console.log(`Prepared ${prepared.length}/240 prompts`);
}
prepared.sort((a,b)=>sha('model-comparison:'+a.id).localeCompare(sha('model-comparison:'+b.id)));
writeFileSync(`${folder}/heldout-prompts.jsonl`, prepared.map(row=>JSON.stringify(row)).join('\n')+'\n',{flag:'wx'});
console.log(`Prepared ${prepared.length} held-out prompts from ${documents.size} documents`);
