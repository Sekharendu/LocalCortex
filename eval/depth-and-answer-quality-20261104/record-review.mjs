import fs from 'node:fs';
import crypto from 'node:crypto';
const base='eval/depth-and-answer-quality-20261104';
const lines=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const requests=lines(base+'/requests.jsonl'),answers=lines(base+'/answers.jsonl');
const ids=[...new Set(requests.map(r=>r.caseId))].sort();
// Explicit case-by-case judgments after reading the review packs, source passages,
// and all original reference alternatives. These are not automatic quote grades.
const decisions=[
 [1,'incorrect','incorrect','Both attribute background methods to the target experiments; neither identifies Structural SVM/SVMhmm.'],
 [2,'correct','correct','Both explain the syntactic-function/dependency baseline. Unreadable INLINEFORM notation is retained, but the central baseline rule is answered.'],
 [3,'refused','correct','Five lacks the dataset identification;15 correctly names SemEval2010Task8.'],
 [4,'incorrect','correct','Five names the architecture but attributes subsequent synthetic-data finetuning to the baseline, contradicting the parallel-only baseline distinction. Fifteen accurately gives attentional encoder-decoder/dl4mt baseline description.'],
 [5,'incorrect','correct','Five substitutes the SPMRL related-work dataset. Fifteen identifies UD1.2 and its16 languages.'],
 [6,'correct','partial','Five enumerates all three preprocessing operations. Fifteen refers generically to three levels and describes an additional fourth without explaining the original three. BORDERLINE: a shorter reference only names Level1/2/3; a more permissive rubric could accept15.'],
 [7,'refused','correct','Five refuses despite a supplied passage listing the pooling options. Fifteen answers dynamic-average pooling and names f/fo/ifo alternatives; dynamic average is itself an original valid reference.'],
 [8,'correct','correct','Both describe depression versus no-depression annotation and symptom labels with supported binary coding.'],
 [9,'correct','correct','Both cover the original alternative low-coverage and cross-speaker clustering answer;15 adds supported clustering/OOV details.'],
 [10,'incorrect','partial','Five invents an INLINEFORM1 baseline label and omits B2. Fifteen gives the four labels S1/S2/B1/B2, but no explanation of their methods. BORDERLINE: labels may be accepted under a names-only rubric; strict complete informative-answer review retains partial.'],
 [11,'correct','refused','Five correctly describes topic descriptions, individual propositions and importance scoring. Fifteen wrongly refuses with the same supporting text still present.'],
 [12,'correct','correct','Both identify text classification and semantic matching.'],
 [13,'correct','correct','Both identify article comments/forums/blogs/newswire and manual Web collection. The Google detail in15 is explicitly supported by the supplied appendix passage. Literal quote scoring misses this semantically adequate paraphrase.'],
 [14,'partial','correct','Five restates identifying argument components without naming them. Fifteen lists claim, premise, backing, rebuttal and refutation.'],
 [15,'correct','correct','Both correctly identify hashtag prediction as established and cite prior works present in their passages.'],
 [16,'correct','correct','Both explain that human review found most unanswered questions answerable, showing headroom.'],
 [17,'correct','correct','Both list raw text, logical-structure cleaning and removal of keyphrase-sparse sections.'],
 [18,'correct','partial','Five explicitly covers wrong cluster assignments, same words split across clusters and low coverage. Fifteen describes low coverage and noisy cross-speaker clustering but omits the explicit split-word failure. BORDERLINE: a broad clustering-summary rubric could accept15.'],
 [19,'partial','correct','Five describes choosing important sentences but omits the AMR/subgraph extraction stage in the reference. Fifteen includes both selection and extraction of the key information/subgraph.'],
 [20,'correct','correct','Both name Yahoo News, The Guardian and The Washington Post from the actual supplied publisher passage.'],
 [21,'correct','correct','Both list PER, WER and WER100.'],
 [22,'correct','correct','Both explain attention to contextual information beyond translational alignment, especially verbs; valid reference alternatives allow POS-based examples.'],
 [23,'correct','correct','Both state that attention captures information beyond translational equivalents for verbs. Extra morphology/POS discussion in5 is supported by the cited-study passage, not fabricated.'],
 [24,'refused','correct','Five refuses even though the10K pairs statement is supplied. Fifteen correctly gives10K image-caption pairs.'],
 [25,'refused','refused','Neither answer identifies Facebook status updates. The selected contexts do not clearly supply that required platform; no successful answer at either depth.'],
 [26,'correct','correct','Both correctly explain random language alternation per minibatch.'],
 [27,'partial','partial','Both give WikiSmall train/test and WikiLarge training counts but omit WikiLarge development/test sizes that are present and required by the full reference.'],
 [28,'partial','partial','Five gives a1200-turn seed size rather than the source. Fifteen identifies nurse-patient conversations but omits the telephone/congestive-heart-failure source specification.'],
 [29,'partial','partial','Five mentions only pairwise ranking. Fifteen adds multitask learning but still does not identify the margin-ranking-loss component of the requested approach set.'],
 [30,'correct','correct','Both identify Wang etal tweets and CrowdFlower. Additional dataset sizes/model discussion are supported;15 is more focused.'],
 [31,'refused','refused','Neither gives33,663 keywords; the required number is absent from both selected prompt sets.'],
 [32,'refused','refused','Both refuse;5 already states gradient-based attribution and15 additionally provides the contribution matrix and sum/softmax mechanism. The input/output wording is imperfect, but original reference alternatives and supplied text support an answer.'],
 [33,'refused','refused','Both use the no-context refusal; the saved relevance gate returned zero chunks. These are upstream gate misses, not evidence that more passages caused generation failure.'],
 [34,'incorrect','correct','Five imports information-threat from related work as a target category. Fifteen correctly identifies the target indirect/sexual/physical categories.'],
 [35,'correct','correct','Both identify CSAT,20newsgroups and Fisher; full name Phase1 is not repeated, but the correct core dataset list is given.'],
 [36,'refused','correct','Five refuses. Fifteen identifies CyberAttack and PoliticianDeath; metric/dataset mentions in its actual passages support the named datasets even though full quote strings do not match.'],
 [37,'refused','correct','Five refuses despite the supplied2010i2b2/VA source statement. Fifteen correctly identifies the CE task source.'],
 [38,'correct','correct','Both correctly define GhostVLAD as NetVLAD plus ghost clusters;98.43F1 is supported for the paper language-ID experiment. Fifteen explicitly distinguishes the original face-recognition application.'],
 [39,'refused','refused','Both wrongly refuse; actual prompt says always answerYES in batches2/3 to obtain baseline performance.'],
 [40,'correct','correct','Both list KNN,RF,SVM andMLP with expanded names.'],
];
if(decisions.length!==40||answers.length!==80)throw Error('Incomplete review or answers');
const reviewed=decisions.map(([number,v5,v15,reason])=>{
 const caseId=ids[number-1],req=requests.find(r=>r.caseId===caseId);
 const matched=answers.filter(a=>a.caseId===caseId);
 if(!matched.some(a=>a.k===5)||!matched.some(a=>a.k===15))throw Error('Missing pair');
 return{number,caseId,question:req.question,previousVerdict:req.previousVerdict,
  assessments:[{k:5,verdict:v5},{k:15,verdict:v15}],reason,
  borderline15:reason.includes('BORDERLINE'),
  method:'AI-assisted semantic reading of answers, original references and actual supplied passages; not independent human certification',
  answerHashes:matched.map(a=>({k:a.k,sha256:crypto.createHash('sha256').update(a.answer).digest('hex')}))};
});
fs.writeFileSync(base+'/reviewed-cases.jsonl',reviewed.map(r=>JSON.stringify(r)).join('\n')+'\n',{flag:'wx'});
const categories=['correct','partial','incorrect','refused','ambiguous','service_error'];
const summary={sampleCases:40,uniqueOriginalQuestionIds:new Set(ids.map(id=>id.split('/')[2])).size,
 modes:['hybrid'],depths:[5,15],judgmentType:'AI-assisted review, not independent human-certified accuracy',
 counts:[5,15].map(k=>({k,...Object.fromEntries(categories.map(v=>[v,reviewed.filter(r=>r.assessments.find(a=>a.k===k).verdict===v).length]))})),
 improved:reviewed.filter(r=>r.assessments[0].verdict!=='correct'&&r.assessments[1].verdict==='correct').map(r=>r.number),
 regressed:reviewed.filter(r=>r.assessments[0].verdict==='correct'&&r.assessments[1].verdict!=='correct').map(r=>r.number),
 bothCorrect:reviewed.filter(r=>r.assessments.every(a=>a.verdict==='correct')).length,
 borderlineCases:reviewed.filter(r=>r.borderline15).map(r=>r.number),
 sensitivity:'Three15-chunk partial labels are borderline under a more permissive rubric; accepting all three changes15 correctness from27/40 to30/40. The strict labels and reasons remain available.'};
fs.writeFileSync(base+'/answer-review-summary.json',JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(summary,null,2));
