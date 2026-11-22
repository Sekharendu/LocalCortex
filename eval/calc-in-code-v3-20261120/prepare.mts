import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

process.env.QDRANT_URL = 'http://127.0.0.1:36333';
const collection = 'eval-ragbench-dev-20261115';
const here = 'eval/calc-in-code-v3-20261120';
const v2 = 'eval/calc-in-code-v2-20261119';
const testA = 'eval/test-a-calc-rule-20261118';
const rb = 'eval/ragbench-20261115';
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const lines = (path: string) => readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const { selectPassages } = await import('../../src/retrieval/context.ts');
const { chunksByDocumentId } = await import('../../src/retrieval/vectorStore.ts');
const { contextBudget } = await import('../../src/rag.ts');
const { buildPrompt } = await import('../../src/generation/promptBuilder.ts');
const { C_REMINDER } = await import('../../src/generation/promptVariants.ts');
const { indexNumbers, contextOf } = await import(`../calc-in-code-v2-20261119/calc.mts`);

const byId = (items: any[]) => new Map(items.map(item => [item.id, item]));
const dev = byId(lines(`${rb}/dev.jsonl`));
const ranked = byId(lines(`${rb}/rerank/candidates.jsonl`));
const scores = byId(lines(`${rb}/rerank/scores.jsonl`));
const documents = new Map(lines('X:/LocalCortex-ragbench/state/ingest-dev.jsonl').filter(row => row.ok).map(row => [row.path, row.documentId]));
const prior = json(`${v2}/frozen.json`).selection;
const pool = json(`${v2}/pool.json`);
const used = new Set([...pool.excluded, ...prior.targets.map(x => x.id), ...prior.guards.map(x => x.id)]);
const order = (items: any[]) => items.filter(row => !used.has(row.id)).sort((a, b) => sha(`calcv3:${a.id}`).localeCompare(sha(`calcv3:${b.id}`)));

async function prepare(pool: any[], count: number, set: string) {
  const selected = [];
  let previous: { id: string; chunks: Awaited<ReturnType<typeof chunksByDocumentId>> } | undefined;
  for (const item of order(pool)) {
    const doc = dev.get(item.id);
    const candidates = ranked.get(item.id);
    const rerank = scores.get(item.id)?.scores;
    const id = documents.get(doc?.path);
    if (!id || !candidates?.hybrid?.length || !rerank) continue;
    const search: number[] = candidates.hybrid;
    if (search.some(i => !Number.isFinite(rerank[i]))) continue;
    const reranked = [...search].sort((a, b) => rerank[b] - rerank[a]);
    const fused = (i: number) => 0.5 / (60 + search.indexOf(i)) + 0.5 / (60 + reranked.indexOf(i));
    const top = [...search].sort((a, b) => fused(b) - fused(a)).slice(0, 10);
    if (previous?.id !== id) previous = { id, chunks: await chunksByDocumentId(collection, id) };
    const chunks = previous.chunks;
    const hits = top.map(i => {
      const chunk = chunks.find(c => c.chunkIndex === i);
      if (!chunk || chunk.text !== candidates.texts[i]) throw new Error(`Stored candidate mismatch ${item.id} chunk ${i}`);
      return { ...chunk, score: fused(i) };
    });
    const passages = selectPassages([{ chunks, hits }], { budgetTokens: contextBudget(item.question, [], 'concise', 5000), wholeMaxTokens: 1000, chunkedMaxTokens: 3200, titleChunk: true });
    const prompt = buildPrompt(item.question, passages, [], 'concise');
    const context = contextOf(prompt, C_REMINDER);
    const numbers = new Set(indexNumbers(context).values);
    const normal = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
    const eligible = (value: string) => {
      const plain = value.replace(/[$%,()\s]/g, '');
      return /^-?(?:\d+\.?\d*|\.\d+)$/.test(plain) ? numbers.has(Math.abs(Number(plain))) : normal(context).includes(normal(value));
    };
    if (!(set === 'targets' ? item.needles : item.spans).every(eligible)) continue;
    selected.push({ ...item, set, top, prompt, promptSha256: sha(prompt) });
    console.log(set, selected.length, item.id);
    if (selected.length === count) break;
  }
  return selected;
}

const targets = await prepare(pool.targets, 30, 'targets');
const guards = await prepare(pool.guards, 20, 'guards');
if (!targets.length || guards.length !== 20) throw new Error('Insufficient evidence-qualified cases');
const absent = lines(`${testA}/absent-prompts.jsonl`).map(({ id, question, prompt }) => ({ id, question, prompt, set: 'absent', promptSha256: sha(prompt) }));
const offTopic = json(`${testA}/frozen.json`).sets.A3_hallucination.questions.map(({ id, question }) => {
  const prompt = buildPrompt(question, [], [], 'concise');
  return { id: `offtopic-${id}`, question, prompt, set: 'offtopic', promptSha256: sha(prompt) };
});
writeFileSync(`${here}/cohort.jsonl`, [...targets, ...guards, ...absent, ...offTopic].map(row => JSON.stringify(row)).join('\n') + '\n', { flag: 'wx' });
console.log({ targets: targets.length, guards: guards.length, absent: absent.length, offTopic: offTopic.length });
