# Graded comparison: 2400/4096 versus 3200/5000

Arm A: 2400-token per-long-document context cap, 4096-token total budget. Arm B: 3200 context cap, 5000 total budget. Both: same 15 saved hybrid hits, existing context builder, explicit max_tokens=512, temperature=0, no history. Exact fixed 40-case sample from the earlier 5-vs-15 experiment: 22 previously failed and 18 acceptable, representing 38 unique original question IDs. Saved relevance-gate misses retained. All 80 calls really executed; no reused answers.

## Graded answer quality

| Measurement | A: 2400 / 4096 | B: 3200 / 5000 |
|---|---:|---:|
| adequate | 27/40 | 29/40 |
| partial | 4/40 | 3/40 |
| wrong | 2/40 | 2/40 |
| refused | 7/40 | 6/40 |
| Refused despite sufficient evidence in prompt | 4 | 4 |
| Exact-quote coverage in final passages (not answer accuracy) | 34/40 | 36/40 |

Paired result: **2 improved, 0 worse, 38 same**. Both improvements reach adequate. Answers were individually reviewed in randomized order without arm labels or paired answers; grades were frozen before decoding. This is an AI reading, not human certification. See review-rubric.md and blind-grades.jsonl for every rationale.

## Measured usage and latency

| Measurement | A: 2400 / 4096 | B: 3200 / 5000 |
|---|---:|---:|
| Mean actual input tokens | 2726.32 | 3281.47 |
| Max actual input tokens | 2951.00 | 3799.00 |
| Mean actual output tokens | 48.73 | 50.52 |
| Max actual output tokens | 133.00 | 120.00 |
| Mean actual total tokens | 2775.05 | 3332.00 |
| Max actual total tokens | 3049.00 | 3855.00 |
| Mean Neurons/call | 14.09 | 16.72 |
| Max Neurons/call | 17.54 | 19.90 |
| Total Neurons for 40 calls | 563.72 | 668.61 |
| Mean context tokens (local estimate) | 2240.30 | 2770.43 |
| Max context tokens (local estimate) | 2377.00 | 3179.00 |
| mean generation latency (seconds) | 1.339 | 1.230 |
| median generation latency (seconds) | 1.015 | 0.957 |
| p95 generation latency (seconds) | 1.873 | 1.513 |
| max generation latency (seconds) | 12.693 | 11.121 |
| Successful HTTP 200 calls | 40 | 40 |
| Output length truncations | 0 | 0 |
| Largest actual prompt + 512 output allowance | 3463 | 4311 |

B used **18.6% more Neurons**, not twice as much. Total run usage: **1232.33 Neurons**. The observed small timing differences are not evidence that a larger context is intrinsically faster. Mean/maximum input, output, combined tokens, context estimates, latency and Neurons are shown separately. No streaming first-token latency was measured.

## Complete paired list

| Case | Question | A | B | Change |
|---|---|---|---|---|
| 1 | Which machine learning methods are used in experiments? | wrong | wrong | same |
| 2 | What baseline model is used? | adequate | adequate | same |
| 3 | Which dataset do they train their models on? | adequate | adequate | same |
| 4 | what are the baseline systems? | adequate | adequate | same |
| 5 | which datasets did they experiment with? | adequate | adequate | same |
| 6 | what levels of document preprocessing are looked at? | adequate | adequate | same |
| 7 | What pooling function is used? | adequate | adequate | same |
| 8 | How is the dataset annotated? | adequate | adequate | same |
| 9 | what challenges are identified? | adequate | adequate | same |
| 10 | What baseline model is used? | adequate | adequate | same |
| 11 | How were crowd workers instructed to identify important elements in large document collections? | refused | refused | same |
| 12 | What tasks do they experiment with? | adequate | adequate | same |
| 13 | How is the data in the new corpus come sourced? | partial | partial | same |
| 14 | What argument components do the ML methods aim to identify? | adequate | adequate | same |
| 15 | Is this hashtag prediction task an established task, or something new? | adequate | adequate | same |
| 16 | How do they show there is space for further improvement? | adequate | adequate | same |
| 17 | what levels of document preprocessing are looked at? | adequate | adequate | same |
| 18 | what challenges are identified? | adequate | adequate | same |
| 19 | How are sentences selected from the summary graph? | adequate | adequate | same |
| 20 | What is the source of the news articles? | adequate | adequate | same |
| 21 | what evaluation metrics were used? | adequate | adequate | same |
| 22 | In what cases is attention different from alignment? | adequate | adequate | same |
| 23 | What useful information does attention capture? | wrong | wrong | same |
| 24 | How large is their MNER SnapCaptions dataset? | adequate | adequate | same |
| 25 | What types of social media did they consider? | refused | refused | same |
| 26 | How do they perform multilingual training? | adequate | adequate | same |
| 27 | what are the sizes of both datasets? | partial | partial | same |
| 28 | Which data do they use as a starting point for the dialogue dataset? | partial | adequate | improved |
| 29 | What set of approaches to hashtag segmentation are proposed? | partial | partial | same |
| 30 | What data is used in experiments? | adequate | adequate | same |
| 31 | how large is the vocabulary? | refused | refused | same |
| 32 | How do their models decide how much improtance to give to the output words? | refused | adequate | improved |
| 33 | What experiments are conducted? | refused | refused | same |
| 34 | What types of online harassment are studied? | adequate | adequate | same |
| 35 | What datasets did they use for evaluation? | adequate | adequate | same |
| 36 | Which real-world datasets are used? | adequate | adequate | same |
| 37 | where did they obtain the annotated clinical notes from? | refused | refused | same |
| 38 | What is the GhostVLAD approach? | adequate | adequate | same |
| 39 | What was the baseline model? | refused | refused | same |
| 40 | What classifiers have been trained? | adequate | adequate | same |

Full case IDs, grades, reasons, actual answers, usage and prompt hashes are in paired-results.jsonl.

## Every refusal despite available evidence

### Case 11, arm A: How were crowd workers instructed to identify important elements in large document collections?

Case ID: docx/1704.04452/e9cfbfdf30e48cffdeca58d4ac6fdd66a8b27d7a

Wrong refusal: supplied task-design paragraph states topic description plus propositions and importance scoring.

Answer: The provided context is insufficient to answer this question.

Passage 2:

> 31 . Most importantly, it is also much more efficient and scalable, as it does not require workers to read all documents in a cluster.
> # Task Design
> 
> We break down the task of importance annotation to the level of single propositions. The goal of our crowdsourcing scheme is to obtain a score for each proposition indicating its importance in a document cluster, such that a ranking according to the score would reveal what is most important and should be included in a summary. In contrast to other work, we do not show the documents to the workers at all, but provide only a description of the document cluster's topic along with the propositions
> . This ensures that tasks are small, simple and can be done quickly (see Figure FIGREF4 ).
> In preliminary tests, we found that this design, despite the minimal context, works reasonably on our focus

Passage 2:

> reveal what is most important and should be included in a summary. In contrast to other work, we do not show the documents to the workers at all, but provide only a description of the document cluster's topic along with the propositions
> . This ensures that tasks are small, simple and can be done quickly (see Figure FIGREF4 ).
> In preliminary tests, we found that this design, despite the minimal context, works reasonably on our focused clusters on common educational topics. For instance, consider Figure FIGREF4 : One can easily say that P1 is more important than P2 without reading the documents.
> We distinguish two task variants:
> Instead of enforcing binary importance decisions, we use a 5-point Likert-scale to allow more fine-grained annotations. The obtained labels are translated into scores (5..1) and the average o

### Case 11, arm B: How were crowd workers instructed to identify important elements in large document collections?

Case ID: docx/1704.04452/e9cfbfdf30e48cffdeca58d4ac6fdd66a8b27d7a

Wrong refusal: supplied task-design paragraph gives topic-only description, propositions and importance scoring.

Answer: The provided context is insufficient to answer this question.

Passage 2:

> 31 . Most importantly, it is also much more efficient and scalable, as it does not require workers to read all documents in a cluster.
> # Task Design
> 
> We break down the task of importance annotation to the level of single propositions. The goal of our crowdsourcing scheme is to obtain a score for each proposition indicating its importance in a document cluster, such that a ranking according to the score would reveal what is most important and should be included in a summary. In contrast to other work, we do not show the documents to the workers at all, but provide only a description of the document cluster's topic along with the propositions
> . This ensures that tasks are small, simple and can be done quickly (see Figure FIGREF4 ).
> In preliminary tests, we found that this design, despite the minimal context, works reasonably on our focus

Passage 2:

> reveal what is most important and should be included in a summary. In contrast to other work, we do not show the documents to the workers at all, but provide only a description of the document cluster's topic along with the propositions
> . This ensures that tasks are small, simple and can be done quickly (see Figure FIGREF4 ).
> In preliminary tests, we found that this design, despite the minimal context, works reasonably on our focused clusters on common educational topics. For instance, consider Figure FIGREF4 : One can easily say that P1 is more important than P2 without reading the documents.
> We distinguish two task variants:
> Instead of enforcing binary importance decisions, we use a 5-point Likert-scale to allow more fine-grained annotations. The obtained labels are translated into scores (5..1) and the average o

### Case 31, arm B: how large is the vocabulary?

Case ID: pdf/1908.04042/b4f881331b975e6e4cab1868267211ed729d782d

Wrong refusal: supplied passage explicitly says 33,663 distinct review keywords.

Answer: The provided context is insufficient to answer this question.

Passage 5:

> cabulary). As
> shown in Table 1, we collect Amazon review keywords for 2,896
> e-books (publishers: Kiwi, Rowohlt, Fischer, and Droemer), which
> leads to 33,663 distinct review keywords and on average 30 keyword
> assignments per e-book.
> 2.2 Tag Recommendation Approaches
> We implement three types of tag recommendation approaches, i.e.,
> (i) popularity-based, (ii) similarity-based (i.e., using content infor-
> mation), and (iii) hybrid approaches. Due to the lack of personalized
> tags (i.e., we do not know which user has assigned a tag), we do not

Passage 5:

> cabulary). As
> shown in Table 1, we collect Amazon review keywords for 2,896
> e-books (publishers: Kiwi, Rowohlt, Fischer, and Droemer), which
> leads to 33,663 distinct review keywords and on average 30 keyword
> assignments per e-book.
> 2.2 Tag Recommendation Approaches
> We implement three types of tag recommendation approaches, i.e.,
> (i) popularity-based, (ii) similarity-based (i.e., using content infor-
> mation), and (iii) hybrid approaches. Due to the lack of personalized
> tags (i.e., we do not know which user has assigned a tag), we do not

### Case 32, arm A: How do their models decide how much improtance to give to the output words?

Case ID: pdf/1909.00326/93beae291b455e5d3ecea6ac73b83632a3ae7ec7

Wrong refusal: supplied passages explain gradient attribution and the contribution-matrix sum/Softmax calculation.

Answer: The provided context is insufficient to answer this question.

Passage 6:

>  yielding fairly good performance.
> Following the formula, we can calculate the
> contribution of every input word makes to every
> output word, forming a contribution matrix of size
> M × N , where N is the output sentence length.
> Given the contribution matrix, we can obtain the
> word importance of each input word to the entire
> output sentence. To this end, for each input word,
> we first aggregate its contribution values to all out-
> put words by the sum operation, and then normal-
> ize all sums through the Softmax function. Fig-
> ure 1 illustrates an example of the calculated word
> importance and the contribution matrix, where an
> English sentence is translated into a French sen-
> tence using the Transformer model. A negative

Passage 6:

> ry
> output word, forming a contribution matrix of size
> M × N , where N is the output sentence length.
> Given the contribution matrix, we can obtain the
> word importance of each input word to the entire
> output sentence. To this end, for each input word,
> we first aggregate its contribution values to all out-
> put words by the sum operation, and then normal-
> ize all sums through the Softmax function. Fig-
> ure 1 illustrates an example of the calculated word
> importance and the contribution matrix, where an
> English sentence is translated into a French sen-
> tence using the Transformer model. A negative

### Case 37, arm A: where did they obtain the annotated clinical notes from?

Case ID: pdf/1912.06262/4477bb513d56e57732fba126944073d414d1f75f

Wrong refusal: supplied experiments/data text explicitly states clinical notes from CE task in 2010 i2b2/VA.

Answer: The provided context is insufficient to answer this question.

Passage 3:

>  the results.
> 4
> A PREPRINT - DECEMBER 25, 2019
> 4 Experiments
> 4.1 Data
> Despite the greater similarity between our task and the 2013 ShARe/CLEF Task 1, we use the clinical notes from
> the CE task in 2010 i2b2/VA on account of 1) the data from 2010 i2b2/VA being easier to access and parse, 2) 2013
> ShARe/CLEF containing disjoint entities and hence requiring more complicated tagging schemes. The synthesized user
> queries are generated using the aforementioned dermatology glossary. Tagged sentences are extracted from the clinical
> notes. Sentences with no clinical entity present are ignored. 22,489 tagged sentences are extracted from the clinical
> notes. We will refer to these tagged sentences interchangeably as the i2b2 data. The sentences are shuffled and split
> into train/dev/test set with a ratio of 7:2:1. The synthesized use

Passage 1:

> predefined entities of interest in clinical notes. These entity tagging tasks are also
> known as clinical Named Entity Recognition (NER). For example, the CE task in 2010 i2b2/VA defines three types of
> entities: “problem”, “treatment”, and “test”. The CE task in 2013 ShARe/CLEF defines various types of disorder such
> ∗Corresponding author.
> arXiv:1912.06262v2 [cs.IR] 23 Dec 2019

### Case 37, arm B: where did they obtain the annotated clinical notes from?

Case ID: pdf/1912.06262/4477bb513d56e57732fba126944073d414d1f75f

Wrong refusal: actual supplied experiments/data passage explicitly identifies clinical notes from CE task in 2010 i2b2/VA.

Answer: The provided context is insufficient to answer this question.

Passage 3:

>  the results.
> 4
> A PREPRINT - DECEMBER 25, 2019
> 4 Experiments
> 4.1 Data
> Despite the greater similarity between our task and the 2013 ShARe/CLEF Task 1, we use the clinical notes from
> the CE task in 2010 i2b2/VA on account of 1) the data from 2010 i2b2/VA being easier to access and parse, 2) 2013
> ShARe/CLEF containing disjoint entities and hence requiring more complicated tagging schemes. The synthesized user
> queries are generated using the aforementioned dermatology glossary. Tagged sentences are extracted from the clinical
> notes. Sentences with no clinical entity present are ignored. 22,489 tagged sentences are extracted from the clinical
> notes. We will refer to these tagged sentences interchangeably as the i2b2 data. The sentences are shuffled and split
> into train/dev/test set with a ratio of 7:2:1. The synthesized use

Passage 1:

> predefined entities of interest in clinical notes. These entity tagging tasks are also
> known as clinical Named Entity Recognition (NER). For example, the CE task in 2010 i2b2/VA defines three types of
> entities: “problem”, “treatment”, and “test”. The CE task in 2013 ShARe/CLEF defines various types of disorder such
> ∗Corresponding author.

### Case 39, arm A: What was the baseline model?

Case ID: pdf/2002.01984/ff338921e34c15baf1eae0074938bf79ee65fdd2

Wrong refusal: supplied text explicitly states the always-YES baseline.

Answer: The provided context is insufficient to answer this question.

Passage 8:

> used on Factoid questions. But we also have done experiments on
> List-type and Yes/No questions.
> 5.1 Entailment improves Yes/No accuracy
> We started by answering always YES (in batch 2 and 3) to get the baseline perfor-
> mance. For batch 4 we used entailment. Our algorithm was very simple: Given a
> question we iterate through the candidate sentences and try to find any candidate
> sentence is contradicting the question (with confidence over 50%), if so ’No’ is
> returned as answer, else ’Yes’ is returned. In batch 4 this strategy produced better
> 12
> than the BioAsq baseline performance, and compared to our other systems, the use
> of entailment increased the performance by about 13% (macro F1 score). We used
> ’AllenNlp’ [7] entailment library to find entailment of the candidate sentences with
> question.
> 5.2 For List-type 

Passage 8:

> ctoid questions. But we also have done experiments on
> List-type and Yes/No questions.
> 5.1 Entailment improves Yes/No accuracy
> We started by answering always YES (in batch 2 and 3) to get the baseline perfor-
> mance. For batch 4 we used entailment. Our algorithm was very simple: Given a
> question we iterate through the candidate sentences and try to find any candidate
> sentence is contradicting the question (with confidence over 50%), if so ’No’ is
> returned as answer, else ’Yes’ is returned. In batch 4 this strategy produced better
> 12
> than the BioAsq baseline performance, and compared to our other systems, the use
> of entailment increased the performance by about 13% (macro F1 score). We used
> ’AllenNlp’ [7] entailment library to find entailment of the candidate sentences with
> question.
> 5.2 For List-type 

### Case 39, arm B: What was the baseline model?

Case ID: pdf/2002.01984/ff338921e34c15baf1eae0074938bf79ee65fdd2

Wrong refusal: supplied text explicitly says always YES in batches 2 and 3 to get baseline performance.

Answer: The provided context is insufficient to answer this question.

Passage 8:

> used on Factoid questions. But we also have done experiments on
> List-type and Yes/No questions.
> 5.1 Entailment improves Yes/No accuracy
> We started by answering always YES (in batch 2 and 3) to get the baseline perfor-
> mance. For batch 4 we used entailment. Our algorithm was very simple: Given a
> question we iterate through the candidate sentences and try to find any candidate
> sentence is contradicting the question (with confidence over 50%), if so ’No’ is
> returned as answer, else ’Yes’ is returned. In batch 4 this strategy produced better
> 12
> than the BioAsq baseline performance, and compared to our other systems, the use
> of entailment increased the performance by about 13% (macro F1 score). We used
> ’AllenNlp’ [7] entailment library to find entailment of the candidate sentences with
> question.
> 5.2 For List-type 

Passage 8:

> ctoid questions. But we also have done experiments on
> List-type and Yes/No questions.
> 5.1 Entailment improves Yes/No accuracy
> We started by answering always YES (in batch 2 and 3) to get the baseline perfor-
> mance. For batch 4 we used entailment. Our algorithm was very simple: Given a
> question we iterate through the candidate sentences and try to find any candidate
> sentence is contradicting the question (with confidence over 50%), if so ’No’ is
> returned as answer, else ’Yes’ is returned. In batch 4 this strategy produced better
> 12
> than the BioAsq baseline performance, and compared to our other systems, the use
> of entailment increased the performance by about 13% (macro F1 score). We used
> ’AllenNlp’ [7] entailment library to find entailment of the candidate sentences with
> question.
> 5.2 For List-type 

## Refusals without sufficient supplied evidence

- Case 25, arm A: What types of social media did they consider? — No Facebook or status-update source identification is present in the supplied passages.
- Case 25, arm B: What types of social media did they consider? — No Facebook or status-update source identification is present in the supplied passages.
- Case 31, arm A: how large is the vocabulary? — The required 33,663 vocabulary count is absent from the supplied passages.
- Case 33, arm A: What experiments are conducted? — No passages were supplied because saved retrieval returned no context.
- Case 33, arm B: What experiments are conducted? — No passages were supplied because saved retrieval returned no context.

## Recommendation and limits

This dev sample supports choosing 3200 context / 5000 total / 15 hits / explicit 512 output: two additional adequate answers, no graded regression and an 18.6% usage increase. This is a configuration recommendation, not an application change or proof of general reliability. Wrong refusals persist. The vocabulary-count evidence newly enters B but is still refused; the gradient-method question improves although A already contained support. More context alone does not fix generation. The next targeted experiment is span merging with the same frozen sample and output cap; no span-merging implementation was done here.

Borderline judgments are visible: both attention answers overgeneralize syntactic findings from non-attentional related work; both corpus-sourcing answers omit blog types while correctly describing collection. Permissively accepting either pair raises A and B equally and leaves the two improvements and zero regressions unchanged. The preprocessing answers all identify the three levels; an additional summarization stage is supported even when informally called fourth. Dataset-size references contain inconsistent totals; partial labels reflect omitted eval splits.

{
  "sampleMatchesOriginal40": true,
  "previouslyFailed": 22,
  "previouslyAcceptable": 18,
  "uniqueOriginalQuestionIDs": 38,
  "uniquePapers": 35,
  "all80ActualCallsSucceeded": true,
  "explicitMaxTokens512": true,
  "all80FinishedNormally": true,
  "gradedBeforeArmDecode": true,
  "blindGradeSha256": "bf9003463cf38fe424bb12505c12af0779a6977692c36d017705d976dc586e20",
  "applicationAndInputsUnchanged": true,
  "heldOutTestContentRead": false,
  "retrievalCalls": 0,
  "rerankerCalls": 0,
  "rewriteCalls": 0,
  "graderModelCalls": 0,
  "grading": "AI semantic reading, shuffled and arm-hidden; not independent human-certified evaluation. Supplied context inspected for support/refusals. Gold annotations are alternatives.",
  "accountQuota": "No current balance verified; available token previously lacked billing/usage read permissions. All calls accepted. Reported Neurons are this experiment only, not account daily total.",
  "frozenConditions": "Same saved hybrid top50 sliced to15, selected paper, existing selectPassages, title chunk on, whole-doc cap1000, no history, temperature0, 180s timeout. Both budgets are process-local overrides.",
  "latency": "Nonstreaming generation HTTP roundtrip + body read/parse; excludes retrieval and rewrite. No TTFT benchmark. p95 nearest rank, median midpoint of central two.",
  "tokenCounting": "Actual tokens from provider usage; context-only counts from legacy llama3 tokenizer. No fabricated split between provider system/context tokens.",
  "caveats": "40 case units contain 38 unique original question IDs. Single output per arm. No uncertainty guarantee, production rollout or app setting changes.",
  "borderlineSensitivity": "R07/R44 syntax overclaim and R52/R74 omission of blog source types are flagged. Accepting either pair raises both arms equally, without changing improved/worse/same or the +2 adequate advantage."
}
