# Strict versus revised partial-answer prompt — 2026-11-04

Both arms: 3200 context cap / 5000 local total budget / maximum15 saved hybrid hits / explicit max_tokens512 / temperature0 / Qwen3-30B-A3B-FP8 / reranking off. Context assembled once with the unchanged builder and strict budget; passages, ordering, separators and history are byte-identical within each pair. Only the specified system/user instruction wording and context label differ. All40strict prompts reproduce the previous3200/5000 arm exactly. All79revised final wire prompts are free of the forbidden all-or-nothing phrase, checked after whitespace normalization. No application code/defaults changed.

Exact texts: prompt-example-A.txt and prompt-example-B.txt give complete examples; exact-wire-prompts.jsonl stores every actual system, user and raw Qwen template. requests.jsonl stores all passages/references and hashes. API request bodies were checked against those saved wire prompts at dispatch.

## 1. Answer quality on the fixed40dev cases

| Outcome | A: strict | B: revised |
|---|---:|---:|
| adequate | 29/40 (72.5%) | 28/40 (70.0%) |
| partial | 3/40 (7.5%) | 2/40 (5.0%) |
| wrong | 2/40 (5.0%) | 6/40 (15.0%) |
| refused | 6/40 (15.0%) | 4/40 (10.0%) |

Wrong refusals with complete evidence: A=4, B=2. Needed-evidence status shared by both arms:36complete,2partial,2absent. Literal quote coverage is36/40in both arms and is NOT the generated-answer grade. The evidence statuses are in case-evidence.json.

## 2. Paired changes

**3 improved, 4 worse, 33 same.** Score order matches the prior rubric: adequate3, partial2, wrong/refused0. All category changes are listed even if tied under that score. False statements that required information is absent count against factual correctness.

| Question | A | B | Change | Reason |
|---|---|---|---|---|
| How were crowd workers instructed to identify important elements in large document collections? | refused | adequate | improved | Explains topic description, individual propositions and 5-point importance scoring without reading all documents; supplied text supports each claim. |
| How is the data in the new corpus come sourced? | partial | adequate | improved | Gives all four source types and supported manual/automatic collection process; 5444 documents and 694110 tokens are supplied. |
| Is this hashtag prediction task an established task, or something new? | adequate | wrong | worse | Starts with established task, then falsely says passages do not indicate whether the task is new; the explicit earlier-work statement answers exactly that question. |
| what challenges are identified? | adequate | wrong | worse | Correctly describes challenges but falsely claims passages contain no specific solutions; conclusion explicitly proposes multispeaker speech features, speaker normalization and joint learning. |
| How are sentences selected from the summary graph? | adequate | wrong | worse | Correctly mentions sentence-selection methods, but falsely claims entity-selection criteria and closest-verb procedure are not covered; the actual passage defines frequency and first verb on the path to root. |
| What types of online harassment are studied? | adequate | wrong | worse | Correctly identifies three studied categories but falsely says passages cover no other harassment types; related-work text explicitly includes information threat and others. |
| where did they obtain the annotated clinical notes from? | refused | adequate | improved | Correctly identifies 2010 i2b2/VA CE task as source of clinical notes. |

### Complete paired list

| Case ID | Question | A | B | Change |
|---|---|---|---|---|
| docx/1601.02403/7697baf8d8d582c1f664a614f6332121061f87db | Which machine learning methods are used in experiments? | wrong | wrong | same |
| docx/1603.01514/6bf5620f295b5243230bc97b340fae6e92304595 | What baseline model is used? | adequate | adequate | same |
| docx/1605.07333/30eacb4595014c9c0e5ee9669103d003cfdfe1e5 | Which dataset do they train their models on? | adequate | adequate | same |
| docx/1606.02891/642e8cf1d39faa1cd985d16750cdc6696c52db2f | what are the baseline systems? | adequate | adequate | same |
| docx/1606.03676/3ddff6b707767c3dd54d7104fe88b628765cae58 | which datasets did they experiment with? | adequate | adequate | same |
| docx/1610.07809/06eb9f2320451df83e27362c22eb02f4a426a018 | what levels of document preprocessing are looked at? | adequate | adequate | same |
| docx/1611.01576/a130306c6662ff489df13fb3f8faa7cba8c52a21 | What pooling function is used? | adequate | adequate | same |
| docx/1701.08229/82642d3111287abf736b781043d49536fe48c350 | How is the dataset annotated? | adequate | adequate | same |
| docx/1702.03856/53aa07cc4cc4e7107789ae637dbda8c9f6c1e6aa | what challenges are identified? | adequate | adequate | same |
| docx/1703.10344/2ee715c7c6289669f11a79743a6b2b696073805d | What baseline model is used? | adequate | adequate | same |
| docx/1704.04452/e9cfbfdf30e48cffdeca58d4ac6fdd66a8b27d7a | How were crowd workers instructed to identify important elements in large document collections? | refused | adequate | improved |
| docx/1705.04153/ef396a34436072cb3c40b0c9bc9179fee4a168ae | What tasks do they experiment with? | adequate | adequate | same |
| pdf/1601.02403/1cb100182508cf55b3509283c0e2bbcd527d625e | How is the data in the new corpus come sourced? | partial | adequate | improved |
| pdf/1601.02403/eac9dae3492e17bc49c842fb566f464ff18c049b | What argument components do the ML methods aim to identify? | adequate | adequate | same |
| pdf/1605.03481/792f6d76d2befba2af07198584aac1b189583ae4 | Is this hashtag prediction task an established task, or something new? | adequate | wrong | worse |
| pdf/1610.00956/e5bc73974c79d96eee2b688e578a9de1d0eb38fd | How do they show there is space for further improvement? | adequate | adequate | same |
| pdf/1610.07809/06eb9f2320451df83e27362c22eb02f4a426a018 | what levels of document preprocessing are looked at? | adequate | adequate | same |
| pdf/1702.03856/53aa07cc4cc4e7107789ae637dbda8c9f6c1e6aa | what challenges are identified? | adequate | wrong | worse |
| pdf/1706.01678/b65a83a24fc66728451bb063cf6ec50134c8bfb0 | How are sentences selected from the summary graph? | adequate | wrong | worse |
| pdf/1707.06806/ddb23a71113cbc092cbc158066d891cae261e2c6 | What is the source of the news articles? | adequate | adequate | same |
| pdf/1708.01464/55c8f7acbfd4f5cde634aaecd775b3bb32e9ffa3 | what evaluation metrics were used? | adequate | adequate | same |
| pdf/1710.03348/044f922604b4b3f42ae381419fd5cd5624fa0637 | In what cases is attention different from alignment? | adequate | adequate | same |
| pdf/1710.03348/beac555c4aea76c88f19db7cc901fa638765c250 | What useful information does attention capture? | wrong | wrong | same |
| pdf/1802.07862/1591068b747c94f45b948e12edafe74b5e721047 | How large is their MNER SnapCaptions dataset? | adequate | adequate | same |
| pdf/1809.01202/a4d115220438c0ded06a91ad62337061389a6747 | What types of social media did they consider? | refused | refused | same |
| pdf/1809.01541/5cb610d3d5d7d447b4cd5736d6a7d8262140af58 | How do they perform multilingual training? | adequate | adequate | same |
| pdf/1810.04428/ebf0d9f9260ed61cbfd79b962df3899d05f9ebfb | what are the sizes of both datasets? | partial | partial | same |
| pdf/1903.03530/2c85865a65acd429508f50b5e4db9674813d67f2 | Which data do they use as a starting point for the dialogue dataset? | adequate | adequate | same |
| pdf/1906.00790/4aa9b60c0ccd379c6fb089c84a6c7b872ee9ec4f | What set of approaches to hashtag segmentation are proposed? | partial | partial | same |
| pdf/1907.09369/132f752169adf6dc5ade3e4ca773c11044985da4 | What data is used in experiments? | adequate | adequate | same |
| pdf/1908.04042/b4f881331b975e6e4cab1868267211ed729d782d | how large is the vocabulary? | refused | refused | same |
| pdf/1909.00326/93beae291b455e5d3ecea6ac73b83632a3ae7ec7 | How do their models decide how much improtance to give to the output words? | adequate | adequate | same |
| pdf/1909.06200/5c3e98e3cebaecd5d3e75ec2c9fc3dd267ac3c83 | What experiments are conducted? | refused | refused | same |
| pdf/1909.13104/f0b2289cb887740f9255909018f400f028b1ef26 | What types of online harassment are studied? | adequate | wrong | worse |
| pdf/1910.10781/12c50dea84f9a8845795fa8b8c1679328bd66246 | What datasets did they use for evaluation? | adequate | adequate | same |
| pdf/1912.00667/3941401a182a3d6234894a5c8a75d48c6116c45c | Which real-world datasets are used? | adequate | adequate | same |
| pdf/1912.06262/4477bb513d56e57732fba126944073d414d1f75f | where did they obtain the annotated clinical notes from? | refused | adequate | improved |
| pdf/2002.01664/4bc2784be43d599000cb71d31928908250d4cef3 | What is the GhostVLAD approach? | adequate | adequate | same |
| pdf/2002.01984/ff338921e34c15baf1eae0074938bf79ee65fdd2 | What was the baseline model? | refused | refused | same |
| pdf/2002.02070/29f2954098f055fb19d9502572f085862d75bf61 | What classifiers have been trained? | adequate | adequate | same |

## 3. Five historical refusal-with-evidence cases: complete answers

### How were crowd workers instructed to identify important elements in large document collections?

docx/1704.04452/e9cfbfdf30e48cffdeca58d4ac6fdd66a8b27d7a

Evidence: complete.

**A (refused):** The provided context is insufficient to answer this question.

**B (adequate):** Crowd workers were instructed to identify important elements in large document collections by being provided with a description of the document cluster's topic along with individual propositions. They were asked to score each proposition's importance using a 5-point Likert-scale, without needing to read all the documents in the cluster. This approach, called low-context importance annotation, allowed them to efficiently determine important elements by focusing on single propositions rather than entire documents.

### how large is the vocabulary?

pdf/1908.04042/b4f881331b975e6e4cab1868267211ed729d782d

Evidence: complete.

**A (refused):** The provided context is insufficient to answer this question.

**B (refused):** The provided context is insufficient to answer this question.

### How do their models decide how much improtance to give to the output words?

pdf/1909.00326/93beae291b455e5d3ecea6ac73b83632a3ae7ec7

Evidence: complete.

**A (adequate):** The models use the integrated gradients method to estimate the word importance in an input sentence. This method integrates first-order derivatives to attribute the model predictions to input features, allowing the calculation of the contribution of every input word to every output word, forming a contribution matrix. The word importance of each input word to the entire output sentence is then determined by aggregating its contribution values to all output words and normalizing them through the Softmax function.

**B (adequate):** The models use the integrated gradients method to estimate the word importance in an input sentence. This method integrates first-order derivatives to attribute the model predictions to input features, allowing the calculation of the contribution of every input word to every output word, forming a contribution matrix. The word importance of each input word to the entire output sentence is then obtained by aggregating the contribution values to all output words and normalizing them through the Softmax function.

### where did they obtain the annotated clinical notes from?

pdf/1912.06262/4477bb513d56e57732fba126944073d414d1f75f

Evidence: complete.

**A (refused):** The provided context is insufficient to answer this question.

**B (adequate):** The annotated clinical notes were obtained from the 2010 i2b2/VA CE task.

### What was the baseline model?

pdf/2002.01984/ff338921e34c15baf1eae0074938bf79ee65fdd2

Evidence: complete.

**A (refused):** The provided context is insufficient to answer this question.

**B (refused):** The baseline model is not explicitly mentioned in the provided context.

## 4. Every refused-to-answered transition, individually checked

### How were crowd workers instructed to identify important elements in large document collections? (dev)

**A:** The provided context is insufficient to answer this question.

**B:** Crowd workers were instructed to identify important elements in large document collections by being provided with a description of the document cluster's topic along with individual propositions. They were asked to score each proposition's importance using a 5-point Likert-scale, without needing to read all the documents in the cluster. This approach, called low-context importance annotation, allowed them to efficiently determine important elements by focusing on single propositions rather than entire documents.

Individually checked: every new factual claim is supported by the supplied task-design or clinical-data passage. **Unsupported additions found: none.**

### Can unused sick days be cashed out at the end of the year? (offtopic)

**A:** The provided context is insufficient to answer this question.

**B:** Full-time employees accrue 8 days of paid sick leave per year, credited at the start of each calendar year. Unused sick leave carries over up to a maximum of 10 days into the following year. The passages do not specify whether unused sick days can be cashed out at the end of the year.

Individually checked against full handbook: 8 days accrual and 10-day carryover cap are supported; cash-out is explicitly left unanswered. **Unsupported additions found: none.**

### where did they obtain the annotated clinical notes from? (dev)

**A:** The provided context is insufficient to answer this question.

**B:** The annotated clinical notes were obtained from the 2010 i2b2/VA CE task.

Individually checked: every new factual claim is supported by the supplied task-design or clinical-data passage. **Unsupported additions found: none.**

## 5. Every B answer with a missing-information sentence

This includes answers graded adequate or wrong as well as partial, so extra caveats are not hidden by outcome classification. There are13dev answers and1negative-control answer.

### Which machine learning methods are used in experiments? (dev, wrong)

docx/1601.02403/7697baf8d8d582c1f664a614f6332121061f87db

**Full B answer:** The experiments used several machine learning methods, including multinomial Naive Bayes classifier, maximum entropy model, C4.5 decision classifier, convolution kernel methods, multi-class SVM, and CRFs. Additionally, the study experimented with supervised and semi-supervised machine learning methods. The passages do not specify all the exact methods used in the current study's experiments.

**Gap claim:** The passages do not specify all the exact methods used in the current study's experiments.

**Assessment: correct.** Exact Structural SVM/SVMhmm experiment identity is absent; gap admission is correct, preceding related-work attribution is not.

### How is the dataset annotated? (dev, adequate)

docx/1701.08229/82642d3111287abf736b781043d49536fe48c350

**Full B answer:** The dataset is annotated such that each tweet is labeled as no evidence of depression (e.g., “Citizens fear an economic depression”) or evidence of depression (e.g., “depressed over disappointment”). If a tweet is annotated as evidence of depression, it is further annotated with one or more depressive symptoms, such as depressed mood (e.g., “feeling down in the dumps”), disturbed sleep (e.g., “another restless night”), or fatigue or loss of energy (e.g., “the fatigue is unbearable”). For each class, every annotation is binarized as the positive class (e.g., depressed mood=1) or negative class (e.g., not depressed mood=0). The passages do not specify how the annotations were validated or the criteria used for determining the presence of depressive symptoms.

**Gap claim:** The passages do not specify how the annotations were validated or the criteria used for determining the presence of depressive symptoms.

**Assessment: correct.** Detailed human-label validation/operational symptom criteria are not supplied. Five-fold validation concerns the classifier, not human annotations.

### what challenges are identified? (dev, adequate)

docx/1702.03856/53aa07cc4cc4e7107789ae637dbda8c9f6c1e6aa

**Full B answer:** The challenges identified include low recall due to the difficulty of cross-speaker unsupervised term discovery (UTD), low coverage of audio leading to sparse pseudotext, and fragmentation of words across different clusters. Additionally, the system struggles with assigning wrong words to clusters and has issues with out-of-vocabulary (OOV) words, especially in the call-level split. The passages do not cover the specific technical solutions proposed to address these challenges.

**Gap claim:** The passages do not cover the specific technical solutions proposed to address these challenges.

**Assessment: partly_correct.** No detailed new technical solution is supplied in this DOCX context, but tuning default ZRTools parameters is mentioned as future work; categorical absence is overbroad.

### Can unused sick days be cashed out at the end of the year? (offtopic, partial)

offtopic/27

**Full B answer:** Full-time employees accrue 8 days of paid sick leave per year, credited at the start of each calendar year. Unused sick leave carries over up to a maximum of 10 days into the following year. The passages do not specify whether unused sick days can be cashed out at the end of the year.

**Gap claim:** The passages do not specify whether unused sick days can be cashed out at the end of the year.

**Assessment: correct.** Handbook covers sick-leave accrual/carryover but never cash-out; all stated related facts are supported.

### How is the data in the new corpus come sourced? (dev, adequate)

pdf/1601.02403/1cb100182508cf55b3509283c0e2bbcd527d625e

**Full B answer:** The data in the new corpus is sourced from various websites with relevant comments to articles and discussion forums, identified manually using a Google search engine. The data was extracted automatically, with some minimal data pre-selection and cleaning. The sources include comments to articles, discussion forum posts, blog posts, and professional newswire articles. The corpus includes 5,444 documents with 694,110 tokens. The passages do not specify the exact websites or platforms used for sourcing the data.

**Gap claim:** The passages do not specify the exact websites or platforms used for sourcing the data.

**Assessment: correct.** Actual website/platform names are not given in supplied corpus-collection passages; Google describes discovery method, not data-source domains. Unrequested extra specificity.

### Is this hashtag prediction task an established task, or something new? (dev, wrong)

pdf/1605.03481/792f6d76d2befba2af07198584aac1b189583ae4

**Full B answer:** The hashtag prediction task is an established task, as it has been addressed earlier in previous works, such as in (Weston et al., 2014; Godin et al., 2013). However, the specific approach described in the context, which uses a character-based model called tweet2vec, is presented as a novel method. The passages do not provide information on whether the task itself is new or not, only that it has been previously addressed.

**Gap claim:** The passages do not provide information on whether the task itself is new or not, only that it has been previously addressed.

**Assessment: incorrect.** Explicit statement that prediction was addressed earlier establishes task novelty status; final caveat contradicts opening answer.

### what challenges are identified? (dev, wrong)

pdf/1702.03856/53aa07cc4cc4e7107789ae637dbda8c9f6c1e6aa

**Full B answer:** The challenges identified include low recall due to the difficulty of cross-speaker unsupervised term discovery (UTD), low coverage of audio leading to sparse pseudotext, and the fragmentation of words across clusters which makes pseudoterms hard to translate. Additionally, the system struggles with cross-speaker matches and the simplicity of the machine translation model affects precision. The passages do not cover specific solutions to these challenges.

**Gap claim:** The passages do not cover specific solutions to these challenges.

**Assessment: incorrect.** Supplied PDF conclusion explicitly proposes multispeaker speech features, speaker normalization and joint learning.

### How are sentences selected from the summary graph? (dev, wrong)

pdf/1706.01678/b65a83a24fc66728451bb063cf6ec50134c8bfb0

**Full B answer:** The sentences are selected by identifying the important sentences from the story, which contain most of the important information. The algorithm is based on the idea that only a few sentences are important from the point of view of summary. To test this, for each summary sentence, the sentence from the story that contains maximum information of this summary sentence is found. ROGUE-1 Recall scores are used as the metric for the information contained in the story sentence. Additionally, methods such as first-n and first co-occurrence+first based sentence selection are used to select the important sentences. The passages do not cover the specific criteria or algorithms used for determining the "most referred entity" or the exact process of finding the closest verb in the AMR graph.

**Gap claim:** The passages do not cover the specific criteria or algorithms used for determining the "most referred entity" or the exact process of finding the closest verb in the AMR graph.

**Assessment: incorrect.** Both claimed gaps are explicitly answered: most-referred entity is most frequent; closest verb is first on entity-to-root path.

### In what cases is attention different from alignment? (dev, adequate)

pdf/1710.03348/044f922604b4b3f42ae381419fd5cd5624fa0637

**Full B answer:** Attention is different from alignment in some cases, particularly when capturing information beyond translational equivalents. For instance, attention agrees with traditional alignments to a high degree in the case of nouns, but it captures other information rather than only the translational equivalent in the case of verbs. Additionally, attention does not always comply with alignment, as it can attend to context words influencing the current word translation. The passages do not cover specific examples of other cases where attention differs from alignment.

**Gap claim:** The passages do not cover specific examples of other cases where attention differs from alignment.

**Assessment: ambiguous.** Specific other cases is underspecified. Other mechanisms/roles occur, but detailed POS analysis centers on nouns and verbs; do not count as a proven false gap.

### What useful information does attention capture? (dev, wrong)

pdf/1710.03348/beac555c4aea76c88f19db7cc901fa638765c250

**Full B answer:** Attention captures useful information other than alignments. For instance, while attention agrees with traditional alignments to a high degree in the case of nouns, it captures other information rather than only the translational equivalent in the case of verbs. Additionally, attention does not always comply with alignment and can focus on different parts of the source sentence, which is necessary for translating verbs. The paper also indicates that attention can learn and encode various types of information, including syntactic and morphological information, depending on the context and the type of words being processed. However, the passages do not specify the exact nature of this additional information beyond the examples given.

**Gap claim:** However, the passages do not specify the exact nature of this additional information beyond the examples given.

**Assessment: qualified_correct.** No exact account beyond examples is supplied; vague extra caveat, while syntactic claim remains unsupported.

### What set of approaches to hashtag segmentation are proposed? (dev, partial)

pdf/1906.00790/4aa9b60c0ccd379c6fb089c84a6c7b872ee9ec4f

**Full B answer:** The paper proposes a set of approaches for hashtag segmentation by framing it as a pairwise ranking problem between candidate segmentations. It also introduces a multi-task learning approach which jointly learns segment ranking and single- vs. multi-token hashtag classification. Additionally, it presents a pairwise neural ranking method that uses a beam search algorithm to extract top k segmentations and re-ranks them. The approaches include neural architectures that use corpus-based, linguistic, and thesaurus-based features. The passages do not cover specific details about the implementation of these approaches.

**Gap claim:** The passages do not cover specific details about the implementation of these approaches.

**Assessment: partly_correct.** Neural implementation/loss section is absent, but supplied text gives candidate generator beam search and n-gram scoring implementation details.

### What data is used in experiments? (dev, adequate)

pdf/1907.09369/132f752169adf6dc5ade3e4ca773c11044985da4

**Full B answer:** The data used in experiments includes a tweet dataset created by Wang et al., which consists of over 2 million tweets labeled using emotional hashtags. Additionally, the CrowdFlower dataset was used for assessing model performance on a totally unseen data. The specific details of the dataset include emotions such as joy, sadness, anger, love, fear, thankfulness, and surprise with corresponding numbers of tweets. The data was pre-processed and split into test, development test, and training data. The provided context does not specify any other datasets used in the experiments.

**Gap claim:** The provided context does not specify any other datasets used in the experiments.

**Assessment: correct.** The supplied experiment description identifies Wang/CrowdFlower; no extra experimental dataset is specified.

### What types of online harassment are studied? (dev, wrong)

pdf/1909.13104/f0b2289cb887740f9255909018f400f028b1ef26

**Full B answer:** The types of online harassment studied include indirect harassment, sexual harassment, and physical harassment. The passages do not cover other potential types of online harassment beyond these.

**Gap claim:** The passages do not cover other potential types of online harassment beyond these.

**Assessment: incorrect.** Other harassment types are discussed in related work, including information threat. Only target study has three categories.

### What classifiers have been trained? (dev, adequate)

pdf/2002.02070/29f2954098f055fb19d9502572f085862d75bf61

**Full B answer:** The classifiers that have been trained are K Nearest Neighbors (KNN), Random Forest (RF), Support Vector Machine (SVM), and Multi-layer Perceptron (MLP). The passages do not mention any other classifiers.

**Gap claim:** The passages do not mention any other classifiers.

**Assessment: correct.** Only KNN/RF/SVM/MLP classifier identities are supplied; caveat is unnecessary but true.

## 6. Off-topic rejection control

Existing data/offtopic-set.json:29near-miss and10unrelated questions. Full original sample handbook is supplied to both arms in the same single passage using the existing builder. No retrieval or gate, no test-paper content. This is intentionally a generation stress test; do not interpret its rejection rate as the full app's retrieval rejection rate.

| Measurement | A | B |
|---|---:|---:|
| Pure rejections | 39/39 | 38/39 |
| Supported related answers with real gap | 0/39 | 1/39 |
| Unsupported answers found | 0/39 | 0/39 |
| Pure rejection rate | 100.00% | 97.44% |

near-miss: A 29/29, B 28/29.

unrelated: A 10/10, B 10/10.

**Can unused sick days be cashed out at the end of the year?**

A: The provided context is insufficient to answer this question.

B: Full-time employees accrue 8 days of paid sick leave per year, credited at the start of each calendar year. Unused sick leave carries over up to a maximum of 10 days into the following year. The passages do not specify whether unused sick days can be cashed out at the end of the year.

B supplies only supported related leave facts and correctly withholds a cash-out policy; it does not fabricate a yes/no answer.

## 7. Actual usage and generation timing

### Dev40per arm

| Measurement | A: strict | B: revised |
|---|---:|---:|
| Mean input tokens | 3281.47 | 3197.30 |
| Max input tokens | 3799.00 | 3713.00 |
| Mean output tokens | 51.75 | 62.23 |
| Max output tokens | 120.00 | 164.00 |
| Mean combined tokens | 3333.22 | 3259.53 |
| Max combined tokens | 3884.00 | 3808.00 |
| Mean Neurons/call | 16.75 | 16.68 |
| Max Neurons/call | 20.57 | 20.85 |
| Total Neurons | 670.10 | 667.30 |
| mean generation time (seconds) | 1.725 | 1.475 |
| median generation time (seconds) | 1.113 | 1.108 |
| p95 generation time (seconds) | 2.194 | 2.222 |
| max generation time (seconds) | 13.081 | 11.164 |

### Rejection39per arm

| Measurement | A: strict | B: revised |
|---|---:|---:|
| Mean input tokens | 1533.33 | 1447.33 |
| Max input tokens | 1539.00 | 1453.00 |
| Mean output tokens | 11.00 | 12.38 |
| Max output tokens | 11.00 | 65.00 |
| Mean combined tokens | 1544.33 | 1459.72 |
| Max combined tokens | 1550.00 | 1518.00 |
| Mean Neurons/call | 7.43 | 7.07 |
| Max Neurons/call | 7.45 | 8.70 |
| Total Neurons | 289.62 | 275.76 |
| mean generation time (seconds) | 1.749 | 1.388 |
| median generation time (seconds) | 0.683 | 0.720 |
| p95 generation time (seconds) | 10.379 | 10.476 |
| max generation time (seconds) | 10.641 | 12.149 |

All158calls returned HTTP200, finish_reason=stop. No512-output truncations. Allactual provider prompt counts+512fit5000. Total reported usage across both cohorts: 1902.78 Neurons. No current daily balance was verified. Timings include HTTP roundtrip/body reading/parsing, exclude retrieval/rewrite, and are not a streaming first-token measurement or a latency guarantee.

## 8. Borderline judgments and sensitivity

- A, pdf/1601.02403/1cb100182508cf55b3509283c0e2bbcd527d625e: **partial**, alternative **adequate**. Question can be read as collection procedure rather than exhaustive source types.
- A, pdf/1610.07809/06eb9f2320451df83e27362c22eb02f4a426a018: **adequate**, alternative **adequate**. Calling additional summarization fourth level is informal; underlying operations are supported.
- B, pdf/1702.03856/53aa07cc4cc4e7107789ae637dbda8c9f6c1e6aa: **wrong**, alternative **adequate**. Core challenges are correct; strict grade penalizes false unrequested solutions caveat.
- B, pdf/1706.01678/b65a83a24fc66728451bb063cf6ec50134c8bfb0: **wrong**, alternative **partial**. Core selection summary has useful information; a lenient rubric could treat the false graph-procedure caveat as secondary.
- B, pdf/1710.03348/044f922604b4b3f42ae381419fd5cd5624fa0637: **adequate**, alternative **adequate**. Other cases is vague; source has other attention mechanisms/roles but primarily noun/verb analysis.
- A, pdf/1710.03348/beac555c4aea76c88f19db7cc901fa638765c250: **wrong**, alternative **adequate**. Core verb finding correct; strict grade penalizes unsupported syntactic extension.
- B, pdf/1710.03348/beac555c4aea76c88f19db7cc901fa638765c250: **wrong**, alternative **adequate**. Core verb finding correct; strict grade penalizes unsupported syntactic extension.
- A, pdf/1810.04428/ebf0d9f9260ed61cbfd79b962df3899d05f9ebfb: **partial**, alternative **adequate**. Training-size-only interpretation possible; conflicting reference totals.
- B, pdf/1810.04428/ebf0d9f9260ed61cbfd79b962df3899d05f9ebfb: **partial**, alternative **adequate**. A training-size-only reading is possible; gold alternatives conflict on totals.
- B, pdf/1906.00790/4aa9b60c0ccd379c6fb089c84a6c7b872ee9ec4f: **partial**, alternative **partial**. Implementation details gap is broad; neural implementation missing while baseline beam search is described.
- B, pdf/1909.13104/f0b2289cb887740f9255909018f400f028b1ef26: **wrong**, alternative **adequate**. If other types means other target experimental categories rather than any passage content, core answer is adequate.

If only the three secondary false-gap penalties use their alternatives frozen during blind review, B has30/40adequate rather than28/40; paired changes are3improved,2worse,35same. The established-task self-contradiction remains wrong. The corpus-source interpretation and attention/size ambiguities are separately visible and are not silently regraded. Conclusion is sensitive to how false caveats are penalized; do not claim a robust accuracy win.

## Recommendation

Keep the revised variant experimental. It fixes two unsupported refusals and adds a complete corpus-source answer, but it also generates false or overbroad claims about what the supplied text lacks. Do not enable it by default on the strength of fewer refusals. A next prompt experiment should constrain missing-information sentences to genuinely unanswered parts of the user's question, avoiding invented gaps about unrequested detail; that experiment has not been implemented or run. No default, source-code, retrieval, context-builder or model changes were made.

{
  "appAndInputHashesUnchanged": true,
  "devCases40": 40,
  "previousSampleReproduced": true,
  "allPairedContextsIdentical": true,
  "all158CallsSucceeded": true,
  "allCallsExplicitMax512": true,
  "all79ArmBWirePromptsFreeOfForbiddenPhrase": true,
  "allActualPromptPlus512Within5000": true,
  "grading": {
    "method": "All 158 answers individually read in randomized order, arm labels/paired counterparts hidden until grades saved. AI review, not independent human certification. Wording may reveal likely variant.",
    "gradeSha256": "41a6225577c252c1e97f151c3f150ee256e4fc4d711be0f7e97f2ccf4f5f95ad",
    "devCounts": {
      "adequate": 57,
      "partial": 5,
      "wrong": 8,
      "refused": 10
    },
    "gapAudits": 14
  },
  "noRetrievalCalls": true,
  "noRerankerCalls": true,
  "noRewriteCalls": true,
  "noGraderModelCalls": true,
  "noHeldOutTestContentRead": true,
  "negatives": "Full intended employee handbook supplied identically to both prompts, bypassing retrieval. This is a generation rejection stress test, not production app retrieval/rejection rate. 15 is requested maximum; fixture has one available passage.",
  "tokenAccounting": "Provider-reported actual prompt/output tokens; context-only token estimates use existing llama3 tokenizer. Same context is frozen using strict budget to avoid instruction-overhead changes affecting selection.",
  "accountUsage": "Per-call reported Neurons only; current account allowance/billing balance could not be verified with existing token.",
  "samples": "40 dev case units =38 unique original question IDs across35 papers; PDF/DOCX duplicates retained. Single response per arm; no claim of statistical certainty.",
  "timestamps": "ISO UTC in per-call logs; user-facing experiment date 2026-11-04 Asia/Calcutta."
}
