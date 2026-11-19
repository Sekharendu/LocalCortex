import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const base='eval/dev-question-clarity-20261106';
const input='eval/dev-set-preparation-20261103/inventory.jsonl';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const rows=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const split=JSON.parse(fs.readFileSync('eval/split.json','utf8'));
const hashes=[input,'eval/split.json'].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
const inventory=rows(input);
const unique=new Map();
for(const q of inventory){
 assert(split.dev.includes(q.paperId)&&!split.test.includes(q.paperId));
 const id=q.caseId.split('/').at(-1);
 if(!unique.has(id))unique.set(id,{ordinal:unique.size+1,questionId:id,question:q.question,cases:[]});
 const entry=unique.get(id);assert.equal(entry.question,q.question);
 entry.cases.push({caseId:q.caseId,paperId:q.paperId,format:q.format});
}
assert.equal(unique.size,496);assert.equal(inventory.length,610);

// Assistant question-only linguistic review of every numbered question, in frozen
// inventory order. These are explicit reviewed assignments, not keyword-derived
// labels or classifications inferred from retrieval/answer successes.
const standalone=[18,27,45,63,66,68,84,85,86,90,101,103,109,120,130,131,134,135,146,165,
 190,198,202,203,215,216,217,218,221,223,231,232,246,247,248,249,250,251,290,297,
 322,357,369,392,393,394,395,402,407,411,422,449];
const topical=[1,2,5,6,7,8,11,12,13,14,16,17,22,24,25,26,28,29,36,37,38,41,42,43,44,46,
 49,50,54,55,56,57,58,64,69,70,71,72,76,77,80,81,82,83,88,92,97,98,99,102,104,105,106,
 110,113,114,116,117,122,124,128,132,133,138,139,143,144,149,156,157,158,167,168,170,
 174,175,176,178,179,180,181,182,185,188,189,192,194,196,200,201,204,206,210,212,
 222,224,228,229,233,235,238,239,243,245,254,255,256,257,270,271,273,279,291,292,293,
 294,296,298,299,303,304,306,308,309,311,314,316,317,320,321,325,326,327,328,329,332,
 340,341,342,343,345,347,348,350,351,353,364,367,370,375,377,380,384,385,386,387,389,
 390,398,400,401,403,405,409,410,412,414,417,425,428,429,431,433,434,441,443,444,445,
 446,447,448,450,451,456,459,460,462,463,465,468,469,472,479,480,481,491,494,495,496];
const A=new Set(standalone),B=new Set(topical);
assert.equal(A.size,standalone.length);assert.equal(B.size,topical.length);
assert(standalone.every(n=>!B.has(n)));
assert([...standalone,...topical].every(n=>n>=1&&n<=496));

const definitions={
 standalone:{label:'Can be searched on its own',
  rule:'The text identifies a named method/framework/dataset or a sufficiently specified conceptual question, without needing us to invent which unnamed study is intended. Searchable does not establish a unique source or a valid single-paper gold answer.',
  expectedBehaviour:'Search the collection using the question; support the answer with clearly attributed sources. Ask about a version/setting if necessary.'},
 topical_missing_context:{label:'Topic is useful, but intended study/system is missing',
  rule:'Contains a substantive topic or methodological clue, but asks about the authors, a particular model, experiment, corpus or finding without identifying it. Plausible relevant passages can come from several studies.',
  expectedBehaviour:'Use existing conversation if it resolves the reference. Otherwise ask a focused question about the topic/system/experiment or offer clearly distinguished source-specific findings.'},
 generic_missing_context:{label:'Too general to identify the intended subject',
  rule:'Asks about unnamed data, baselines, results, language, participants, settings or features with insufficient distinctive subject information. Explicit pronouns are not required: "What was the baseline?" also lacks its subject.',
  expectedBehaviour:'Use prior conversation if available; otherwise ask what method, topic, experiment or result the user means. A document filename is not required.'}
};
const broadConcepts=new Set([18,27,86,90,120,130,131,134,135,165,198,202,232,248,290,297,392,393,394,395,402,407,411]);
const settingDependent=new Set([66,85,101,103,146,190,203,215,216,217,218,221,223,231,246,249,250,251,322,357,422,449]);
const borderlineNotes={
 18:'Can be a general question about compactness measures, but the original study may use one particular definition.',
 27:'The methodological topic is specified; the premise about prior methods may need qualification across sources.',
 42:'IPA is not expanded; an acronym alone does not clearly identify the intended assistant here.',
 63:'MSD is an unexpanded acronym. Kept as a named-concept definition question, with possible acronym ambiguity.',
 66:'LiLi names the subject, but the baseline and evaluation setting are not specified.',
 86:'Names a pretraining objective, although its implementation can differ across studies.',
 90:'A useful general conceptual comparison; a particular paper may frame the relationship differently.',
 103:'PARENT is identified, but the comparison metrics and dataset can change the numeric answer.',
 117:'The count of 18 helps identify a taxonomy, but does not name which taxonomy or source.',
 130:'Can ask generally about detecting non-standard pronunciation; no unique experimental procedure is specified.',
 131:'The topic and claim are explicit, but "bad" and the premise need interpretation.',
 135:'A general claim about finite-sample statistics, not a uniquely identified study or universally true proposition.',
 146:'LAMA and the negation focus identify a useful subject; which extension/version is not explicit.',
 190:'The two named challenge years identify the intended result family, but a metric/track may still be needed.',
 200:'Could be a general question, but the type of segmentation is not specified.',
 202:'A self-contained feasibility question, with several possible supported methods/answers.',
 203:'OSG is a dataset name/acronym without an expansion; its identity may need clarification.',
 206:'ELS is not expanded and the systems being criticized are not identified.',
 215:'Car-speak names a specific representation, but exact terminology may vary.',
 231:'SBERT identifies a method, but hardware depends on the training run, variant and source.',
 232:'Can ask generally about siamese-network training, while the original reference may describe one SBERT procedure.',
 246:'Macaw and CIS identify the likely subject despite the phrase "the paper"; which publication/version is not explicit.',
 249:'Macaw is named, but "currently" is relative to the paper date/software version.',
 290:'A meaningful broad question about Arabic offensive language; findings need not be universal or unique to one source.',
 297:'The irony-modelling problem is understandable independently, but "the ironic pattern" could refer to a specific formulation.',
 322:'DSL names a dataset family; its languages depend on the edition.',
 348:'SemEval is named, but no year/task is given and "the hashtag" dataset is unidentified.',
 357:'s2sL names the model but is an unexpanded abbreviation; its identity is provisional.',
 370:'A potentially general term, but "closed test" has domain-specific meanings not specified here.',
 392:'A standalone overview question; multiple Vietnamese segmentation studies can supply valid limitations.',
 393:'A standalone task-level question despite its grammatical typo; sources can describe different challenges.',
 394:'A broad task-level effectiveness question; datasets, dates and metrics determine the detailed answer.',
 395:'A standalone overview question with multiple valid source-dependent answers.',
 400:'ELMo is named but "the authors" and the particular lemmatization study are not identified.',
 402:'A self-contained linguistic question, but the premise that lemmatization is unnecessary needs qualification.',
 407:'A named attention concept, but related terminology or implementations could differ.',
 411:'A standalone task/method relationship question; a single-paper reference is not an exhaustive answer.',
 449:'ARAML is named, but the improvement depends on the baseline, dataset and metric.',
 481:'Concept maps are a clear topic, but the question explicitly asks for particular unnamed authors\' definition.'
};
const explicitReferencePattern=/\b(they|their|them|this|these|those|it|its|authors?|paper|our|here)\b/giu;
const questionRows=[...unique.values()].map(q=>{
 const group=A.has(q.ordinal)?'standalone':B.has(q.ordinal)?'topical_missing_context':'generic_missing_context';
 const notes=[];
 if(broadConcepts.has(q.ordinal))notes.push('A broader conceptual answer may be valid; the original paper reference is not necessarily the only correct answer.');
 if(settingDependent.has(q.ordinal))notes.push('The named subject helps search, but numeric results, version or experimental details may still require clarification.');
 if(q.ordinal===63||q.ordinal===203||q.ordinal===357)notes.push('Unexpanded acronym/name; identity not verified from papers in this question-only review.');
 if(group!=='standalone')notes.push('No prior conversation was supplied. Do not count this as a proven real follow-up or assume that rewriting can recover its intended subject.');
 const reason=group==='standalone'
  ? (broadConcepts.has(q.ordinal)?'The text states a concrete conceptual or task-level question that can be searched without guessing an unnamed study.':'The text names the principal method, framework, challenge or dataset, giving search a usable subject.')
  :group==='topical_missing_context'
  ?'There is a useful topic or methodological clue, but the particular study, system, dataset or comparison being asked about is not identified.'
  :'The intended experiment, method, dataset or result is unspecified; the question alone gives too little subject information to choose the original source.';
 return {...q,group,label:definitions[group].label,reason,explicitReferenceWords:[...new Set([...q.question.matchAll(explicitReferencePattern)].map(m=>m[0].toLowerCase()))],
  flags:notes,borderline:!!borderlineNotes[q.ordinal],borderlineReason:borderlineNotes[q.ordinal]??null,
  classificationMethod:'assistant question-only linguistic review; no answer text, paper title, source passage or retrieval outcome used'};
});
const caseRows=questionRows.flatMap(q=>q.cases.map(c=>({...c,questionId:q.questionId,ordinal:q.ordinal,question:q.question,
 group:q.group,label:q.label,reason:q.reason,flags:q.flags,borderline:q.borderline,borderlineReason:q.borderlineReason})));
const summary={date:'2026-11-06',devCaseUnits:caseRows.length,originalQuestionIds:questionRows.length,
 distinctQuestionWordings:new Set(questionRows.map(q=>q.question.trim().toLowerCase())).size,
 groups:Object.fromEntries(Object.keys(definitions).map(g=>[g,{...definitions[g],questionIds:questionRows.filter(q=>q.group===g).length,
  caseUnits:caseRows.filter(q=>q.group===g).length,byFormat:Object.fromEntries(['pdf','docx'].map(f=>[f,caseRows.filter(q=>q.group===g&&q.format===f).length]))}])),
 borderlineQuestionIds:questionRows.filter(q=>q.borderline).length,
 borderlineCaseUnits:caseRows.filter(q=>q.borderline).length,
 paperOrConversationContextMissing:{questionIds:questionRows.filter(q=>q.group!=='standalone').length,caseUnits:caseRows.filter(q=>q.group!=='standalone').length},
 definitions,hashes,heldOutPaperContentRead:false,embeddingCalls:0,searchCalls:0,generationCalls:0,
 limitation:'Provisional assistant linguistic review, not independent human labels or ground truth. Groups describe standalone clarity, not answerability, retrieval correctness, answer correctness, or the causal reason for a miss. No observed failure was relabelled as acceptable.'};
const write=(name,content)=>fs.writeFileSync(`${base}/${name}`,typeof content==='string'?content:JSON.stringify(content,null,2)+'\n',{flag:'wx'});
write('questions.jsonl',questionRows.map(q=>JSON.stringify(q)).join('\n')+'\n');
write('cases.jsonl',caseRows.map(q=>JSON.stringify(q)).join('\n')+'\n');
for(const group of Object.keys(definitions))write(`${group}.jsonl`,questionRows.filter(q=>q.group===group).map(q=>JSON.stringify(q)).join('\n')+'\n');
write('borderline.jsonl',questionRows.filter(q=>q.borderline).map(q=>JSON.stringify(q)).join('\n')+'\n');
write('summary.json',summary);
const percent=(n,d)=>(100*n/d).toFixed(1)+'%';
const exampleOrdinals={standalone:[45,198,109,101,120,422],topical_missing_context:[14,17,122,146,341,463],generic_missing_context:[19,21,121,127,149,137]};
// Remove examples not assigned to a group; the frozen per-question record is authoritative.
const report=[
 '# Dev question clarity review', '',
 'Reviewed 6 November 2026. No search, embedding or generation API calls. Only new files in this results folder were created. Existing questions, split, application code/defaults and prior results were left unchanged.', '',
 '## What was reviewed', '',
 'All 610 dev case units in the existing frozen inventory, representing 496 original QASPER question IDs. PDF and DOCX copies of the same question were assigned together. Different QASPER question IDs with identical wording remain distinct annotations. Only original question text was used to assign groups. The review did not use reference answers, source excerpts, paper titles or retrieval outcomes. Paper IDs were checked only for dev membership and retained as identifiers.', '',
 'The review is by the assistant, not an independent human panel. It is a provisional linguistic assessment. Question wording cannot establish that a phrase uniquely identifies a method throughout the corpus, that its premise is true, or that all valid answers must match the original paper. All original text, including typos, is preserved.', '',
 '## Groups', '',
 '| Group | Original question IDs | PDF/DOCX case units |', '| --- | --- | --- |',
 ...Object.entries(summary.groups).map(([g,s])=>`| ${s.label} | ${s.questionIds}/496 (${percent(s.questionIds,496)}) | ${s.caseUnits}/610 (${percent(s.caseUnits,610)}) |`), '',
 ...Object.entries(definitions).flatMap(([g,d])=>[
 `### ${d.label}`, '',d.rule,'',`Expected app behaviour: ${d.expectedBehaviour}`,'',
 ...exampleOrdinals[g].filter(n=>questionRows[n-1].group===g).map(n=>`- **${n}.** ${questionRows[n-1].question}`),''
 ]),
 '## Borderline cases and interpretation', '',
 `${summary.borderlineQuestionIds} question IDs (${summary.borderlineCaseUnits} case units) have explicit borderline notes in borderline.jsonl. Some general concept questions could instead be asking for a paper-specific definition. Some named methods still lack an experimental setting, baseline, version or acronym expansion. These uncertain assignments must not be treated as hard labels.`, '',
 `Overall, ${summary.paperOrConversationContextMissing.questionIds}/496 (${percent(summary.paperOrConversationContextMissing.questionIds,496)}) original question IDs need more context under this review. That does not mean the same percentage of retrieval failures is explained by vague wording: this analysis did not assign causes to failures or grade alternate-source answers.`, '',
 'No questions can be confirmed as actual follow-ups from this dataset: no preceding conversation accompanies them. The second and third groups could be answered after a suitable preceding turn or paper context, but we do not invent that history. Clarification can ask about a method/topic/experiment; it need not demand a filename.', '',
 'Standalone/searchable does not mean a uniquely correct single-source answer. General questions can reasonably have several correct source-attributed answers. Future no-selection evaluation should score that behaviour rather than automatically penalize every non-original-paper result. The other groups should test conversation understanding or clarification, not forced recovery of an unknown original paper.', '',
 '## Files', '',
 '- questions.jsonl: every original question ID, group, reason, case membership, flags and borderline notes.',
 '- cases.jsonl: the same assignments expanded to all 610 PDF/DOCX case units.',
 '- standalone.jsonl, topical_missing_context.jsonl, generic_missing_context.jsonl: separate question lists.',
 '- borderline.jsonl: all explicitly uncertain assignments.',
 '- summary.json: counts, group definitions and input hashes.',
 '- group.mjs: reproducible reviewed assignments and artifact builder.', '',
 'No retrieval or answer-quality percentage was recalculated. These labels must be reviewed/frozen before any new evaluation that uses them for selection. The held-out test papers remain untouched.',
 ];
write('REPORT.md',report.join('\n')+'\n');
assert(hashes.every(h=>sha(fs.readFileSync(h.file))===h.sha256));
assert.equal(new Set(caseRows.map(q=>q.caseId)).size,610);
console.log(JSON.stringify({groups:summary.groups,borderlineQuestionIds:summary.borderlineQuestionIds,needsContext:summary.paperOrConversationContextMissing},null,2));
