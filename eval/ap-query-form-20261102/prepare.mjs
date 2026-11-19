import fs from 'node:fs';
import path from 'node:path';
import { BASE, OLD, DIAG, read, lines, sha, normalize, inside, devOnly, save, lengthGroup } from './common.mjs';

const splitBytes = fs.readFileSync('eval/split.json'), split = JSON.parse(splitBytes);
const frozen = read(path.join(OLD, 'production-manifest.json'));
for (const entry of frozen.sourceHashes) if (sha(fs.readFileSync(entry.file)) !== entry.sha256) throw Error('Frozen production source changed');
const selected = lines('eval/exact-quote-v2/gold-mapping.jsonl');
const sources = lines(path.join(OLD, 'dev-sources.jsonl'));
selected.forEach(c => devOnly(c.paperId, split)); sources.forEach(s => devOnly(s.paperId, split));
const { explicitReferences, scopeQuestion } = await import('../../src/retrieval/documentScope.ts');
const { expandAcronyms } = await import('../../src/retrieval/acronyms.ts');
const plans = [], counts = {};
for (const row of selected) {
  const bytes = fs.readFileSync(inside(DIAG, row.evidenceBundle));
  if (sha(bytes) !== row.bundleSha256) throw Error('Dev case changed');
  const c = JSON.parse(bytes);
  if (c.paperId !== row.paperId || c.caseId !== row.caseId) throw Error('Case identity mismatch');
  if (explicitReferences(c.originalQuestion).length) throw Error('Original question has explicit reference: needs live dev-only catalog decision');
  if (scopeQuestion(c.originalQuestion, []) !== c.originalQuestion) throw Error('Standalone scope text differs');
  const items = row.gold.map((g, index) => ({ ...g, itemId: row.caseId + '/item-' + index, lengthGroup: lengthGroup(g.normalized), wordCount: g.normalized.split(/\s+/u).length, mapped: g.ranges.length > 0 }));
  const productionP = { status: 'unrestricted', references: [] };
  const variants = { A: { question: c.actualQuestion, scope: c.scope }, P: { question: c.originalQuestion, scope: productionP } };
  for (const v of Object.values(variants)) {
    v.keywordInput = expandAcronyms(v.question);
    v.embeddingInput = 'search_query: ' + v.keywordInput;
  }
  plans.push({ ...row, gold: undefined, items, variants });
  counts[row.group] ??= { cases: 0, mappedCases: 0, items: {} };
  counts[row.group].cases++; if (items.some(x => x.mapped)) counts[row.group].mappedCases++;
  for (const item of items) {
    counts[row.group].items[item.lengthGroup] ??= { mapped: 0, unmapped: 0 };
    counts[row.group].items[item.lengthGroup][item.mapped ? 'mapped' : 'unmapped']++;
  }
}
save('case-plan.jsonl', plans.map(x => JSON.stringify(x)).join('\n') + '\n');
save('dev-sources.jsonl', sources.map(x => JSON.stringify(x)).join('\n') + '\n');
save('preflight.json', { splitSha256: sha(splitBytes), frozenSourceHashes: frozen.sourceHashes, frozenRunSha256: frozen.runSha256, counts, totalCases: plans.length, P: 'original standalone question, no history, no title wrapper, real scope resolver returns unrestricted', A: 'saved actualQuestion and saved production document-scope decision, including rejected scope', searchMode: 'hybrid held constant for A/P; P reproduces query formation and document-scope rules, not the source default dense mode', normalization: 'whitespace only; exact full quote containment OR verified same-paper normalized character-range overlap, inherited from prior approved rule; no fuzzy matching', itemPolicy: 'one unique literal reference answer quote per case/item; deduplicated across references by whitespace-normalized text; retain every item, score only exact source-locatable items; no generic diagnostic evidence as gold', metrics: 'micro item recall at each cutoff and mean reciprocal first-hit rank per mapped item; missing in top50 contributes zero; case pass/fail means any mapped item hit, not final answer correctness', corpusBoundary: 'same dev-document allowlist on both variants and all Qdrant prefetches; no per-question gold-paper filter added to P; original collection-wide IDF and frozen sparse stats retained', testPaperContentRead: false, topK: 50, threshold: 0.63, fusion: 'rrf', scopeRejectionCases: plans.filter(c => c.group === 'scope_rejection').length });
const example = plans.find(x => x.caseId === 'pdf/1911.02855/20e38438471266ce021817c6364f6a46d01564f2');
save('request-path.json', { endpoint: 'POST /query, standalone; same retrieval form as first conversation message', endpointQuestion: 'body.question passed as received; validation checks trimmed nonempty but does not replace with trimmed text', retrieval: 'retrieveForQuestion -> scopeQuestion(question,[]) -> resolveDocumentScope -> retrieve(question). No rewrite with empty history.', embedding: 'search_query: + expandAcronyms(question); local Ollama /api/embed, nomic-embed-text,768dimensions', keyword: 'expandAcronyms(question), without search_query prefix; locally tokenized/lowercased/stopwords removed/light plural stemming/feature hashing; sparseVectorFor called only in hybrid mode after dense relevance probe passes', filtering: 'No body.documentId accepted. Collection chooses search collection. Literal filenames/quoted document titles/recognized named-document grammar resolve from indexed chunk0 headers to documentId allowlists; missing/ambiguous identity returns []; no explicit reference leaves documentIds undefined (collection-wide). Document scope is decided before follow-up rewrite; question text is not stripped of document reference.', defaultMode: 'src/config.ts defaults dense; no RETRIEVE_MODE assignment found in .env or docker-compose.yml. This experiment explicitly holds prior hybrid settings for both A and P.', example: example.variants });
save('REQUEST-PATH.md', `# Real request path and experiment variants\n\n## Standalone request\n\n1. src/server.ts: POST /query reads body.question unchanged. Request options allow collection/topK/scoreThreshold, not documentId.\n2. src/rag.ts: retrieveForQuestion resolves document scope from original user text. With no history it passes that same question to retrieve().\n3. src/retrieval/retriever.ts: expandAcronyms(question) becomes queryText.\n4. src/retrieval/embedder.ts: embeds search_query: + queryText through local Ollama /api/embed.\n5. Hybrid mode uses sparseVectorFor(queryText, frozen average length), with no search_query prefix. It first runs the unchanged dense relevance gate at0.63. Source default mode is dense, which does not run keyword search. Both comparison arms explicitly retain hybrid, so P is a production-query/scoping comparison, not a reproduction of the default search mode.\n\n## Document selection\n\nThe collection is defaulted or supplied by the request. Explicit document references resolve against indexed header/source identities. Resolved references add documentId filters to dense and sparse searches. Missing/ambiguous references return no chunks. A standalone question without an explicit document reference searches the whole selected collection. The normal app has no implicit gold-paper selector. Conversation follow-ups can inherit document scope and can be rewritten; these standalone tests have no history and generate no rewrites.\n\n## A vs P\n\nA replays the current title wrapper and its recorded production scope. P uses the original question and the real unrestricted production scope rule. All459 original questions have no explicit document reference. Both search the same dev-only dataset partition (140PDF papers/33DOCX assets), enforced before network dispatch. P may retrieve any dev paper. Gold hits must belong to the gold paper; an identical short quote in a different paper is not credited.\n\nThis partition restriction protects held-out content but differs from a full collection run. The original collection's IDF and frozen sparse statistics remain in use. A/P changes both wording and document scope, so differences cannot be attributed solely to title length.\n\nExact per-case embedding and keyword inputs are in case-plan.jsonl. Example:\n\n\`\`\`json\n${JSON.stringify(example.variants, null, 2)}\n\`\`\`\n`);
console.log(JSON.stringify({ total: plans.length, counts, splitSha256: sha(splitBytes) }, null, 2));
