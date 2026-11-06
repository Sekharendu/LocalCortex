# Stage 2 end-to-end old versus new defaults

Completed 5 November 2026. All 558 planned responses collected:400 for the new 200 dev cases,80 for the earlier 40 cases,78 for 39 off-topic questions. Five transient transport failures were retried successfully. No held-out research-document payloads were fetched. No push or deployment was performed.

The new configuration produced 33 more complete answers on the 200 newdev cases (83→116), but wrong answers rose 12→14. It improves usefulness and evidence delivery; it does not establish fully reliable answering. It also cost about twice as many Neurons per new-dev request.

## Setup and what this comparison establishes

| Setting | Old | New |
| --- | --- | --- |
| System/template | Strict production A | Concise partial-support C |
| Context allowance | 1200 builder tokens | 3200 builder tokens |
| Total budget | 4096 | 5000 |
| Retrieval hits | 5 | 15 |
| Output max_tokens | 512 explicit | 512 explicit |
| Generation model | Qwen3-30b-a3b-fp8 | Same |
| Temperature | 0 | 0 |
| Retrieval | Fresh hybrid RRF; reranking off | Same |
| Question/scope | Original question, selected dev paper | Same |

Both arms ran retrieveForQuestion followed by generate, the same shared preparation and generation functions used by the application orchestrator. This is a function-level end-to-end application-path test, not an HTTP/UI/load test. Each arm freshly embedded and retrieved each question, ran the 0.63 dense relevance probe, assembled its own context with the existing builder, built its own prompt, and generated an answer. Rankings were not replayed. The input was the original question with ordinary acronym expansion and nomic search_query prefix, with no title wrapper. The selected-paper scope is deliberate for this benchmark; these results do not measure automatic document selection across the entire corpus.

The sample was frozen before generation. Seed 42 stratification targets the 556 eligibledev units after excluding all earlier-question IDs:92 previously failed,65 acceptable,43 ambiguous;164 PDF,36 DOCX. The 200 case units contain 188 unique questions. Earlier 40 contain 38 unique questions, with no original-question overlap with the new sample. PDF/DOCX duplicates are not independent observations. The existing split stayed byte-identical. The 60 held-out papers/261 cases were not used for generation, grading, retrieval payloads or corpus inspection. Qdrant queries/scrolls and every prefetch carried the chosen dev document filter; server-side index/global-IDF internals are not claimed to be dev-only.

This tests the whole new package, not the isolated contribution of prompt C, hits 15 or the 3200 allowance. The builder uses the existing local tokenizer; observed API input tokens use the provider tokenizer and include instructions/question/template. Different token counts do not imply a changed builder.

## 1. Answer outcomes

### New 200 dev cases

| Outcome | Old (200) | New (200) |
| --- | --- | --- |
| adequate | 83 (41.5%) | 116 (58.0%) |
| partial | 25 (12.5%) | 23 (11.5%) |
| wrong | 12 (6.0%) | 14 (7.0%) |
| refused | 80 (40.0%) | 47 (23.5%) |

### Earlier 40 prompt-selection cases, reported separately

| Outcome | Old (40) | New (40) |
| --- | --- | --- |
| adequate | 26 (65.0%) | 32 (80.0%) |
| partial | 4 (10.0%) | 2 (5.0%) |
| wrong | 0 (0.0%) | 2 (5.0%) |
| refused | 10 (25.0%) | 4 (10.0%) |

Adequate means the core question is completely answered with supported material facts. Partial means useful correct content but a material part missing. Wrong includes materially unsupported additions or answering about a related-work system instead of the target. Refused means no substantive answer. Gate-zero cases count as refusals. Judgments are shuffled, arm-label-hidden AI semantic reading, not independent human certification or keyword-only scoring; focused source excerpts and full actual prompts/passages are retained. All 558 judgments were frozen and hashed before opening the decode key.

Reference caveat:170 of 200 cases have consistently answerable annotations,22 have mixed answerability, and 8 are labelled unanswerable by every annotator. Some of those labels contradict clearly supplied paper text. The primary semantic grade follows the question and actual source, accepts a complete legitimate reference alternative, and flags disagreements rather than forcing unsupported refusals. Therefore it is not a strict automated QASPER score. On the 170 consistently answerable cases alone:

| Outcome | Old /170 | New /170 |
| --- | --- | --- |
| adequate | 79 (46.5%) | 105 (61.8%) |
| partial | 22 (12.9%) | 21 (12.4%) |
| wrong | 10 (5.9%) | 11 (6.5%) |
| refused | 59 (34.7%) | 33 (19.4%) |

## 2. Paired changes

| Group | Improved | Worse | Same score | All category changes |
| --- | --- | --- | --- | --- |
| dev 200 | 49 | 7 | 144 | 61 |
| earlier 40 | 7 | 1 | 32 | 9 |

Frozen scoring is adequate 3,partial 2,wrong/refused 0. Consequently a refusal becoming wrong is a tied score, not a safety success: there are 5 such regressions in new 200 and 1 in earlier 40. Every category change, including these ties, appears below and in changed-cases.jsonl. All paired IDs including unchanged ones are in paired.jsonl.

### dev 200 changed cases

- `pdf/1909.03405/bc31a3d2f7c608df8c019a64d64cb0ccc5669210` **partial → adequate** (improved). What BERT model do they test? — Old: Names tested PN variants but misses requested BERTBase architecture; base explicit in passage. New: BERTBase and tested variants supported by results table.
- `pdf/1802.06024/bfc2dc913e7b78f3bd45e5449d71383d0aa4a890` **wrong → partial** (improved). What are the components of the general knowledge learning engine? — Old: Invents third/fourth Knowledge Store components; source stops after relation-entity matrix; incomplete alternative annotation also flagged. New: RL/prediction-model decomposition supported but omits Knowledge Store components requested by concrete reference; alternate scope borderline.
- `pdf/1912.13337/e97186c51d4af490dba6faaf833d269c8256426c` **refused → adequate** (improved). Are the automatically constructed datasets subject to quality control? — Old: BORDERLINE artifact-control methodology explicitly supplied despite negative reference; partial qualification about scale possible, pure refusal misses supported yes. New: BORDERLINE annotation says no, but source explicitly describes artifact control and distractor filtering; supported yes accepted.
- `pdf/2002.01664/75df70ce7aa714ec4c6456d0c51f82a16227f2cb` **adequate → partial** (worse). Which 7 Indian languages do they experiment with? — Old: All seven languages including Assamese in table. New: Lists six languages while claiming seven; Assamese visible in table but omitted.
- `pdf/1810.08699/1f085b9bb7bfd0d6c8cba1a9d73f08fcf2da7590` **refused → adequate** (improved). did they use a crowdsourcing platform for manual annotations? — Old: Manual annotation described but crowd-platform use not established. New: Manual dataset annotation stated; no crowd platform stated. No is qualified as lack of mention, not proof of non-use.
- `pdf/1603.01514/6568a31241167f618ef5ede939053feaa2fb0d7e` **refused → adequate** (improved). Do they add one latent variable for each language pair in their Bayesian model? — Old: Crosslingual variables described but one-per-language-pair detail not supplied. New: BORDERLINE negative gold conflict; per-aligned-argument CLVs and predicate-specific inventories support no to exactly one-per-language-pair.
- `pdf/1912.08960/50e80cfa84200717921840fddcf3b051a9216ad8` **refused → adequate** (improved). Are the images from a specific domain? — Old: ShapeWorld geometric shapes, colors and spatial variants establish a specific synthetic domain. New: Synthetic ShapeWorld domain supported.
- `pdf/1904.07904/38f58f13c7f23442d5952c8caf126073a477bac0` **refused → partial** (improved). What was the score of the proposed model? — Old: Table 2 explicitly gives GAN embedding EM 51.10/F1 63.11; false insufficiency. New: Gives performance gains but not actual EM 51.10/F1 63.11 score, which table supplies.
- `pdf/1910.12574/8748e8f64af57560d124c7b518b853bf2711c13e` **refused → adequate** (improved). Do they report results only on English data? — Old: English vernacular subset mentioned but English-only evaluation not fully established; mixed annotation. New: English datasets answer supported; conflicting unanswerable annotation flagged.
- `pdf/1706.01678/0767ca8ff1424f7a811222ca108a33b6411aaa8a` **refused → adequate** (improved). What is the performance of their method? — Old: All-unanswerable target method performance absent; evaluation metrics and baseline loss do not give requested method results. New: BORDERLINE all-unanswerable annotation contradicted by supplied comparative ROUGE results; source-supported answer accepted.
- `pdf/1802.00396/c88a846197b72d25e04ec55f00ee3e72f655504c` **refused → wrong** (same; unsafe_answer). Which dataset do they use? — Old: UN title/GD speech discussion present but identifying corpus description missing; partial clues only. New: Names downstream COW conflict-outcome dataset instead of primary UN speech corpus; primary description missing.
- `pdf/1806.05513/15cdd9ea4bae8891c1652da2ed34c87bbbd0edb8` **partial → adequate** (improved). Where did the texts in the corpus come from? — Old: Social media correct but does not identify Twitter or corpus domains. New: Twitter corpus and extraction domains/count supported.
- `pdf/1806.05513/dea9e7fe8e47da5e7f31d9b1a46ebe34e731a596` **partial → adequate** (improved). What type of system does the baseline classification use? — Old: Names two of four classifiers; random forest/naive Bayes visible but omitted. New: All four classifier families with RBF SVM supported.
- `pdf/1912.00667/67e9e147b2cab5ba43572ce8a17fc863690172f0` **wrong → adequate** (improved). How are the interpretability merits of the approach demonstrated? — Old: Uses accuracy/AUC to answer interpretability; human-understandable keyword explanations explicitly available. New: Human-understandable keyword explanations and transparency supported; post-hoc alternative need not be unioned.
- `pdf/1912.13337/5bb3c27606c59d73fd6944ba7382096de4fa58d8` **refused → adequate** (improved). Do they focus on Reading Comprehension or multiple choice question answering? — Old: Paper explicitly focuses on five-way multiple-choice QA; false insufficiency. New: Multiple-choice focus explicit throughout.
- `pdf/1710.07960/0ba3ea93eef5660a79ea3c26c6a270eac32dfa4c` **refused → wrong** (same; unsafe_answer). Did they use a crowdsourcing platform for annotations? — Old: Crowdsourcing use not established; conflicting reference labels flagged. New: BORDERLINE categorical did-not-use-crowdsourcing assertion unsupported by merely no mention; gold false/mixed does not prove source support.
- `pdf/1910.14599/af5730d82535464cedfa707a03415ac2e7a21295` **adequate → wrong** (worse). What data sources do they use for creating their dataset? — Old: All four source families correct; BORDERLINE minor erroneous MASC expansion (Multi-Sentence instead of Manually) flagged, core answer unchanged. New: Omits MASC/WikiHow and misattributes SNLI/MNLI model-training datasets as new dataset's context sources.
- `pdf/1810.12085/ceb767e33fde4b927e730f893db5ece947ffb0d8` **partial → adequate** (improved). what topics did they label? — Old: Only three example labels; requested full inventory unavailable in context. New: Full ten-label inventory supported by table.
- `pdf/1603.01514/747b847d687f703cc20a87877c5b138f26ff137d` **refused → adequate** (improved). Which parallel corpora are used? — Old: Only bibliography and German/English discussion; explicit paired evaluation-corpus identification missing. New: CoNLL 2009 and Europarl EN-DE stated.
- `pdf/1908.10084/e2db361ae9ad9dbaa9a85736c5593eb3a471983d` **partial → wrong** (worse). What other sentence embeddings methods are evaluated? — Old: InferSent/USE correct but omits GloVe/BERT/fastText and other evaluated baselines. New: Omits evaluated BERT variants and substitutes related-work Skip-Thought as evaluated method.
- `pdf/1908.10084/2e89ebd2e4008c67bb2413699589ee55f59c4f36` **partial → adequate** (improved). How are the siamese networks trained? — Old: Tied-weight fine-tuning/classification supported; omits regression/triplet details and conflates explicit InferSent MNLI attribution with SBERT; BORDERLINE. New: Fine-tuning siamese/triplet weights to meaningful cosine-comparable embeddings correctly described; mixed annotations.
- `pdf/1710.04203/c09a92e25e6a81369fcc4ae6045491f2690ccc10` **adequate → partial** (worse). How do they compare lexicons? — Old: Thousand term groups stratified by annotation count satisfies complete alternative; expert/crowd roles supported. New: Comparison outcomes correct but omits 1-to-5 validity rating procedure and stratified term-group sampling.
- `pdf/1910.09982/df5a4505edccc0ee11349ed6e7958cf6b84c9ed4` **refused → wrong** (same; unsafe_answer). What dataset was used? — Old: Free-text article task visible but dataset collection/type description missing; some partial inference possible. New: Core news corpus identified but reverses subset relation, calling shared-task corpus a subset of companion work.
- `pdf/1701.05574/49c32a2a64eb41381e5f12ccea4150cac9f3303d` **refused → adequate** (improved). What other evaluation metrics are looked at? — Old: F-score and Kappa explicitly stated; false insufficiency despite mixed annotation. New: F-score/Kappa explicit; mixed annotation flagged.
- `docx/1609.00425/b6ae8e10c6a0d34c834f18f66ab730b670fb528c` **wrong → adequate** (improved). what are the topics pulled from Reddit? — Old: Gives general Reddit topic examples instead of explicit sampled politics/business/science/AskReddit/frontpage topics. New: Core sampling topics and additional analyzed subreddits supported.
- `docx/1704.04452/d6191c4643201262a770947fc95a613f57bedb6b` **partial → adequate** (improved). Which collections of web documents are included in the corpus? — Old: Educational-topic collections described but omits DIP corpus name despite supplied source. New: DIP corpus and educational web genres correctly identified.
- `pdf/2003.13032/8df35c24af9efc3348d3b8d746df116480dfe661` **refused → wrong** (same; unsafe_answer). Do they experiment with other tasks? — Old: Main NER and supporting RE discussed; no explicit exhaustive other-task statement; gold negative ambiguous. New: Confuses tasks enabled by new corpus with experiments performed; relevance detection not actually evaluated.
- `pdf/1908.06941/6b9b9e5d154cb963f6d921093539490daa5ebbae` **partial → adequate** (improved). What novel PMI variants are introduced? — Old: NNEGPMI correct but clipped PMI definition absent despite CPMI references; omits second variant. New: CPMI and NNEGPMI both proposed.
- `pdf/1906.07662/fe2666ace293b4bfac3182db6d0c6f03ea799277` **partial → adequate** (improved). Why challenges does word segmentation in Vietnamese pose? — Old: Omits incremental-learning/feedback challenge, which is missing from supplied excerpt. New: All three Vietnamese processing challenges supported despite awkward question wording.
- `pdf/1705.04153/04bde1d2b445f971e97bb46ade2d0290981c7a32` **refused → partial** (improved). What is the meta knowledge specifically? — Old: All-unanswerable meta-knowledge definition not supplied. New: BORDERLINE all-unanswerable annotation; repeats generic shared metaknowledge without explaining its specific content.
- `pdf/1703.10344/61a9ea36ddc37c60d1a51dabcfff9445a2225725` **refused → adequate** (improved). What news article sources are used? — Old: Wikipedia/news-reference relationship partly supplied but target source selection detail missing; mixed annotations. New: Wikipedia external news references with counts supported; mixed annotation flagged.
- `pdf/1909.00326/6c91d44d5334a4ac80100eead4e105d34e99a284` **refused → adequate** (improved). Which model architectures do they test their word importance approach on? — Old: Architecture identities absent from passages. New: Transformer/RNN architectural families present; RNN-Search precision omitted but core pair correct.
- `pdf/1612.08205/3b77b4defc8a139992bd0b07b5cf718382cb1a5f` **partial → adequate** (improved). What model did they use for their system? — Old: Generic feature/ensemble classification description correct but omits AllWords multinomial NB. New: Multinomial NB identifies core model; word-frequency detail not necessary for identity question.
- `pdf/2001.02284/da55bd769721b878dd17f07f124a37a0a165db02` **partial → adequate** (improved). What kind of repetitive and time-consuming activities does their assistant handle? — Old: Restates task motivation without naming activities; mixed answerability and no activity evidence. New: All assistant information-gathering activities supplied; mixed annotation.
- `pdf/1912.01772/5cc2daca2a84ddccba9cdd9449e51bb3f64b3dde` **refused → partial** (improved). What are the models used for the baseline of the three NLP tasks? — Old: Task names supplied but actual baseline implementations absent apart from bibliography. New: Kaldi and transformer identified but speech Clustergen omitted; feed-forward/model-size wording ambiguous in clipped passage.
- `pdf/2002.03407/31735ec3d83c40b79d11df5c34154849aeb3fb47` **refused → adequate** (improved). Who were the human evaluators used? — Old: 20 evaluators from institution explicit; false insufficiency. New: Twenty institution-recruited evaluators stated.
- `pdf/1604.00727/7705dd04acedaefee30d8b2c9978537afb2040dc` **refused → partial** (improved). What word level and character level model baselines are used? — Old: Word/character comparison supplied but named MemNN baseline absent; references conflict with None. New: Character/word comparisons correct but omits MemNN baseline; baseline-role interpretation borderline and gold None conflicts.
- `pdf/1911.07555/c8541ff10c4e0c8e9eb37d9d7ea408d1914019a9` **wrong → adequate** (improved). Which datasets are employed for South African languages LID? — Old: Conflates contextual/related-work corpora with datasets actually employed, including academic corpus under development. New: Four gold datasets covered; WiLI cautiously described as mentioned relevant data, not necessarily experimental use; BORDERLINE scope.
- `pdf/1912.04961/99e78c390932594bd833be0f5c890af5c605d808` **adequate → partial** (worse). What is the baseline? — Old: Both baseline neural models and naive controls supplied. New: Two true naive baselines supplied but omits main QA-PGNet baselines.
- `pdf/1912.00667/bc730e4d964b6a66656078e2da130310142ab641` **refused → partial** (improved). What type of classifiers are used? — Old: Named classifier/probabilistic-model subsection missing. New: Generic discriminative classifier described, but named LR/MLP models absent; claim exact type not supplied is true for these passages.
- `pdf/1608.01084/1f07e837574519f2b696f3d6fa3230af0b931e5d` **refused → wrong** (same; unsafe_answer). Did they only experiment with one language pair? — Old: Evaluation/training settings all explicitly Chinese-English, supporting one-pair answer; exclusivity inference BORDERLINE. New: Says multiple pairs but supplies only Chinese-English; contradicts actual experimental setup.
- `pdf/1912.00667/a74190189a6ced2a2d5b781e445e36f4e527e82a` **wrong → adequate** (improved). How are the accuracy merits of the approach demonstrated? — Old: Accuracy gains correct but falsely attributes 7 th-9 th convergence to accuracy; source explicitly says AUC and faster accuracy convergence. New: Accuracy improvements and table values correctly reported.
- `pdf/1912.13337/8de9f14c7c4f37ab103bc8a639d6d80ade1bc27b` **adequate → partial** (worse). After how many hops does accuracy decrease? — Old: First additional hop and detailed degradation supported. New: Overall degradation correct but does not state requested first drop 1-to 2 hops despite available sentence.
- `pdf/2003.13032/dd6b378d89c05058e8f49e48fd48f5c458ea2ebc` **partial → adequate** (improved). What baseline systems are proposed? — Old: Only says four NER systems without naming them; several names present but full list clipped. New: All four NER systems supported by table.
- `pdf/1603.01514/50cc6c5f2dcf5fb87b56007f6a825fa7c90b64ed` **partial → wrong** (worse). What does an individual model consist of? — Old: Bayesian family correct but confuses individual and joint-model wording and omits specific Garg/Henderson base model. New: Confuses complete multilingual model with an individual monolingual Bayesian model.
- `pdf/1608.01884/662870a90890c620a964720b2ca122a1139410ea` **refused → adequate** (improved). What language do they explore? — Old: Full list of discussed languages including English/French/German supplied; false insufficiency. New: Contains complete English/French/German alternative; listed additional languages supported.
- `pdf/1911.07555/307e8ab37b67202fe22aedd9a98d9d06aaa169c5` **refused → adequate** (improved). Does the paper report the performance of a baseline model on South African languages LID? — Old: LID methodology and comparisons discussed but baseline performance results missing. New: Reported comparative evaluations establish baseline performance reporting.
- `pdf/1609.00425/b6ae8e10c6a0d34c834f18f66ab730b670fb528c` **wrong → partial** (improved). what are the topics pulled from Reddit? — Old: General Reddit topic examples substituted for sampled corpus topics despite correct sampling passage. New: Includes core politics/business/science but omits AskReddit/frontpage sampling and mixes general examples.
- `pdf/1906.01081/bf3b27a4f4be1f9ae31319877fd0c75c03126fd5` **refused → adequate** (improved). How many people participated in their evaluation study of table-to-text models? — Old: Comparison counts supplied but number of human workers missing; mixed annotation. New: Around 500 workers explicit; mixed annotation.
- `pdf/1705.01265/63bb2040fa107c5296351c2b5f0312336dad2863` **refused → adequate** (improved). How were the cluster extracted?  — Old: Cluster memberships/results present but kmeans extraction method missing. New: Kmeans extraction and initialization settings supported.
- `pdf/1703.07090/8060a773f6a136944f7b59758d08cc6f2a59693b` **partial → adequate** (improved). how small of a dataset did they train on? — Old: Correct relative training size but omits available 1000-hour absolute size. New: 1000-hour small-set alternative supported.
- `docx/1611.03599/6a31db1aca57a818f36bba9002561724655372a7` **refused → partial** (improved). What is the size of the Chinese data? — Old: User counts present but number of Chinese posts missing; absence claim true. New: True user statistics provide related size information but omit requested post count, which is missing.
- `pdf/1903.03530/73a7acf33b26f5e9475ee975ba00d14fd06f170f` **refused → partial** (improved). What labels do they create on their dataset? — Old: Some symptom/frequency/location placeholders available but full label inventory missing. New: General clinical-topic labels supported but symptom attributes/full requested label inventory missing.
- `pdf/1703.07090/1bb7eb5c3d029d95d1abf9f2892c1ec7b6eef306` **refused → partial** (improved). what was their character error rate? — Old: Absolute CER values absent; relative improvement insufficient. New: Relative CER reduction supplied but requested absolute error rate missing from answer/context.
- `pdf/1612.08205/cd2878c5a52542ddf080b20bec005d9a74f2d916` **refused → adequate** (improved). What are the industry classes defined in this paper? — Old: All industry class names present in figure labels; false insufficiency. New: All fourteen industry classes supplied.
- `docx/1611.02988/fa30a938b58fc05131c3854f12efe376cbad887f` **refused → partial** (improved). What was their performance on emotion detection? — Old: Emotion datasets/annotations supplied but performance values missing. New: Qualitative performance supported but requested dataset-specific F1 values absent.
- `docx/1612.08205/3b77b4defc8a139992bd0b07b5cf718382cb1a5f` **partial → adequate** (improved). What model did they use for their system? — Old: Generic classification approach but no multinomial NB identification in context. New: Multinomial NB core model identified.
- `pdf/1802.06024/585626d18a20d304ae7df228c2128da542d248ff` **refused → adequate** (improved). What metrics are used to establish that this makes chatbots more knowledgeable and better at learning and conversation?  — Old: Evaluation metric section missing. New: Coverage/MCC/positive F1 metrics supported.
- `pdf/1610.08815/fabf6fdcfb4c4c7affaa1e4336658c1e6635b1bf` **partial → adequate** (improved). Which benchmark datasets are used? — Old: Names only SemEval sentiment-training dataset and omits sarcasm benchmark sets. New: All sarcasm benchmarks plus sentiment training source correctly listed.
- `pdf/1910.10781/0810b43404686ddfe4ca84783477ae300fdd2ea4` **refused → adequate** (improved). On top of BERT does the RNN layer work better or the transformer layer? — Old: Architecture descriptions but no direct performance comparison supplied; absence claim true. New: Correct full dataset-wise RoBERT/ToBERT comparison; BORDERLINE false introductory no-direct-comparison caveat separately audited.
- `pdf/1707.05236/ab9b0bde6113ffef8eb1c39919d21e5913a05081` **partial → adequate** (improved). What are their results on both datasets? — Old: Best-method qualitative result correct but all three available F0.5 scores omitted. New: All requested F0.5 results and precision/recall table values correct.

### earlier 40 changed cases

- `pdf/1601.02403/eac9dae3492e17bc49c842fb566f464ff18c049b` **partial → adequate** (improved). What argument components do the ML methods aim to identify? — Old: General premises/conclusions supported but target five component inventory absent. New: All five argument components named.
- `pdf/1909.00326/93beae291b455e5d3ecea6ac73b83632a3ae7ec7` **refused → adequate** (improved). How do their models decide how much improtance to give to the output words? — Old: Gradient-based attribution available but full output/input aggregation method missing; partial answer possible. New: Integrated-gradient aggregation supported; unusual differentiability statement is in source, not outside correction.
- `docx/1611.01576/a130306c6662ff489df13fb3f8faa7cba8c52a21` **refused → adequate** (improved). What pooling function is used? — Old: Dynamic average pooling and f/fo/ifo pooling explicitly present; false insufficiency. New: Dynamic average/f/fo/ifo pooling supported.
- `docx/1601.02403/7697baf8d8d582c1f664a614f6332121061f87db` **refused → wrong** (same; unsafe_answer). Which machine learning methods are used in experiments? — Old: Target Structural SVM/SVMhmm method absent; exact-method absence claim true. New: Lists related-work classifiers instead of target Structural SVM/SVMhmm; target method passage absent.
- `pdf/1903.03530/2c85865a65acd429508f50b5e4db9674813d67f2` **refused → adequate** (improved). Which data do they use as a starting point for the dialogue dataset? — Old: Nurse-initiated symptom conversations supplied, but telephone/congestive-heart-failure seed details clipped; partial answer possible. New: Clinical seed telephone recordings explicit.
- `docx/1606.03676/3ddff6b707767c3dd54d7104fe88b628765cae58` **refused → adequate** (improved). which datasets did they experiment with? — Old: Results explicitly name models retrained on UD1.2 corpora; false insufficiency. New: UD1.2 and all languages explicit.
- `pdf/1710.03348/beac555c4aea76c88f19db7cc901fa638765c250` **adequate → wrong** (worse). What useful information does attention capture? — Old: Useful context beyond translational alignment supported without overclaim. New: Adds syntactic/morphological-attention attribution based on encoder related work, unsupported for attention itself; core-only alternate grade adequate is BORDERLINE.
- `pdf/1912.06262/4477bb513d56e57732fba126944073d414d1f75f` **refused → adequate** (improved). where did they obtain the annotated clinical notes from? — Old: 2010 i 2 b 2/VA source explicit; false insufficiency. New: 2010 i 2 b 2/VA clinical notes explicitly stated.
- `docx/1703.10344/2ee715c7c6289669f11a79743a6b2b696073805d` **partial → adequate** (improved). What baseline model is used? — Old: Only baseline labels B 1/B 2/S 1/S 2, no method explanations; useful but incomplete. New: All four baseline mechanisms correctly described.

## 3. Where unsuccessful answers broke

### dev 200

| Boundary | Old | New |
| --- | --- | --- |
| Needed evidence absent or incomplete; answer unsuccessful | 85 | 57 |
| Complete evidence, model refused | 13 | 7 |
| Complete evidence, answer wrong | 6 | 8 |
| Complete evidence, answer incomplete | 9 | 10 |
| Expected refusal for unsupported/unanswerable target | 4 | 2 |

### earlier 40

| Boundary | Old | New |
| --- | --- | --- |
| Needed evidence absent or incomplete; answer unsuccessful | 8 | 4 |
| Complete evidence, model refused | 4 | 2 |
| Complete evidence, answer wrong | 0 | 1 |
| Complete evidence, answer incomplete | 2 | 1 |
| Expected refusal for unsupported/unanswerable target | 0 | 0 |

These groups are disjoint and count unsuccessful answers, not all retrieved contexts. Missing evidence is measured in the final assembled prompt, so this category can include retrieval omission, context selection/truncation, or missing extraction; this experiment alone cannot split those earlier boundaries. Complete-evidence coverage in new 200 was 111/200(55.5%) old versus 141/200(70.5%) new. Earlier 40 was 32/40 versus 36/40. Semantic evidence availability is separate from exact-quote coverage. Mixed/uncertain annotation and exclusivity inferences are flagged in borderline.jsonl.

### Every refusal despite complete evidence

- **R029** `pdf/1912.08960/50e80cfa84200717921840fddcf3b051a9216ad8` — Are the images from a specific domain? (old;dev 200). ShapeWorld geometric shapes, colors and spatial variants establish a specific synthetic domain. Answer: "The provided context is insufficient to answer this question."
- **R035** `pdf/1904.07904/38f58f13c7f23442d5952c8caf126073a477bac0` — What was the score of the proposed model? (old;dev 200). Table 2 explicitly gives GAN embedding EM 51.10/F1 63.11; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R052** `docx/1703.04001/9af3142630b350c93875441e1e1767312df76d17` — Do the answered questions measure for the usefulness of the answer? (old;dev 200). Task explicitly predicts whether questions get any answer, not answer usefulness; refusal ignores available distinction. Answer: "The provided context is insufficient to answer this question."
- **R059** `docx/1611.01576/a130306c6662ff489df13fb3f8faa7cba8c52a21` — What pooling function is used? (old;earlier 40). Dynamic average pooling and f/fo/ifo pooling explicitly present; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R077** `pdf/2002.01984/ff338921e34c15baf1eae0074938bf79ee65fdd2` — What was the baseline model? (old;earlier 40). Always-YES baseline explicitly present; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R093** `pdf/1912.13337/5bb3c27606c59d73fd6944ba7382096de4fa58d8` — Do they focus on Reading Comprehension or multiple choice question answering? (old;dev 200). Paper explicitly focuses on five-way multiple-choice QA; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R134** `pdf/1701.05574/49c32a2a64eb41381e5f12ccea4150cac9f3303d` — What other evaluation metrics are looked at? (old;dev 200). F-score and Kappa explicitly stated; false insufficiency despite mixed annotation. Answer: "The provided context is insufficient to answer this question."
- **R185** `pdf/1612.08205/01a41c0a4a7365cd37d28690735114f2ff5229f2` — What social media platform did they look at? (old;dev 200). Blogger dataset table explicitly identifies platform; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R188** `pdf/1909.13104/392fb87564c4f45d0d8d491a9bb217c4fce87f03` — What baseline model is used? (new;dev 200). Table contains all three baseline names and prose discusses them; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R190** `docx/1612.08205/01a41c0a4a7365cd37d28690735114f2ff5229f2` — What social media platform did they look at? (new;dev 200). Blogger platform explicitly named; false absence claim. Answer: "The context does not specify a particular social media platform."
- **R208** `pdf/2002.01984/ff338921e34c15baf1eae0074938bf79ee65fdd2` — What was the baseline model? (new;earlier 40). Always-YES baseline explicit; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R213** `pdf/1608.01084/1f07e837574519f2b696f3d6fa3230af0b931e5d` — Did they only experiment with one language pair? (old;dev 200). Evaluation/training settings all explicitly Chinese-English, supporting one-pair answer; exclusivity inference BORDERLINE. Answer: "The provided context is insufficient to answer this question."
- **R218** `docx/1606.03676/3ddff6b707767c3dd54d7104fe88b628765cae58` — which datasets did they experiment with? (old;earlier 40). Results explicitly name models retrained on UD1.2 corpora; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R238** `docx/1701.05574/49c32a2a64eb41381e5f12ccea4150cac9f3303d` — What other evaluation metrics are looked at? (new;dev 200). F-score/Kappa explicit; false insufficiency despite mixed annotation. Answer: "The provided context is insufficient to answer this question."
- **R310** `docx/1604.00727/784ce5a983c5f2cc95a2c60ce66f2a8a50f3636f` — Do the authors also try the model on other datasets? (new;dev 200). Complete evaluation section describes only SimpleQuestions with FB 2 M/FB 5 M settings; reasonable no answer supported, exclusivity inference BORDERLINE. Answer: "The provided context is insufficient to answer this question."
- **R326** `docx/1705.01265/a4a1fcef760b133e9aa876ac28145ad98a609927` — Which other hyperparameters, other than number of clusters are typically evaluated in this type of research? (old;dev 200). Word-vector type comparisons and dimensions explicitly supplied; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R427** `pdf/1608.01884/662870a90890c620a964720b2ca122a1139410ea` — What language do they explore? (old;dev 200). Full list of discussed languages including English/French/German supplied; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R446** `pdf/1612.08205/cd2878c5a52542ddf080b20bec005d9a74f2d916` — What are the industry classes defined in this paper? (old;dev 200). All industry class names present in figure labels; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R447** `pdf/1908.04042/b4f881331b975e6e4cab1868267211ed729d782d` — how large is the vocabulary? (new;earlier 40). 33,663 distinct keywords explicit; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R461** `pdf/1912.13337/e97186c51d4af490dba6faaf833d269c8256426c` — Are the automatically constructed datasets subject to quality control? (old;dev 200). BORDERLINE artifact-control methodology explicitly supplied despite negative reference; partial qualification about scale possible, pure refusal misses supported yes. Answer: "The provided context is insufficient to answer this question."
- **R487** `pdf/1612.08205/01a41c0a4a7365cd37d28690735114f2ff5229f2` — What social media platform did they look at? (new;dev 200). Blogger dataset table names platform; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R491** `docx/1701.05574/49c32a2a64eb41381e5f12ccea4150cac9f3303d` — What other evaluation metrics are looked at? (old;dev 200). F-score/Kappa explicit; false insufficiency despite mixed annotation. Answer: "The provided context is insufficient to answer this question."
- **R505** `docx/1703.04001/9af3142630b350c93875441e1e1767312df76d17` — Do the answered questions measure for the usefulness of the answer? (new;dev 200). Study explicitly predicts answerability rather than usefulness; false insufficiency for supported no. Answer: "The provided context is insufficient to answer this question."
- **R520** `pdf/2002.03407/31735ec3d83c40b79d11df5c34154849aeb3fb47` — Who were the human evaluators used? (old;dev 200). 20 evaluators from institution explicit; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R530** `pdf/1912.06262/4477bb513d56e57732fba126944073d414d1f75f` — where did they obtain the annotated clinical notes from? (old;earlier 40). 2010 i 2 b 2/VA source explicit; false insufficiency. Answer: "The provided context is insufficient to answer this question."
- **R549** `docx/1705.01265/a4a1fcef760b133e9aa876ac28145ad98a609927` — Which other hyperparameters, other than number of clusters are typically evaluated in this type of research? (new;dev 200). Vector selection/dimensionality described; false insufficiency. Answer: "The provided context is insufficient to answer this question."

### Every old-refused → new-substantive answer, individually checked

- `pdf/1912.13337/e97186c51d4af490dba6faaf833d269c8256426c` **adequate / supported-substantive-content**. Are the automatically constructed datasets subject to quality control? — BORDERLINE annotation says no, but source explicitly describes artifact control and distractor filtering; supported yes accepted. New answer: "Yes, the automatically constructed datasets are subject to quality control. The text mentions that the methodology includes ways to carefully control for artifacts that may arise during the process. Additionally, the authors mention that they filtered certain distractors to improve the quality of the probe. For assessing human performance, they annotated a smaller gold-standard test set."
- `pdf/1810.08699/1f085b9bb7bfd0d6c8cba1a9d73f08fcf2da7590` **adequate / supported-substantive-content**. did they use a crowdsourcing platform for manual annotations? — Manual dataset annotation stated; no crowd platform stated. No is qualified as lack of mention, not proof of non-use. New answer: "No, the provided context does not mention the use of a crowdsourcing platform for manual annotations. Instead, it states that a named entities dataset was manually annotated, comprising 53453 tokens and 2566 sentences selected from over 250 news texts from ilur.am."
- `pdf/1603.01514/6568a31241167f618ef5ede939053feaa2fb0d7e` **adequate / supported-substantive-content**. Do they add one latent variable for each language pair in their Bayesian model? — BORDERLINE negative gold conflict; per-aligned-argument CLVs and predicate-specific inventories support no to exactly one-per-language-pair. New answer: "No, they do not add one latent variable for each language pair in their Bayesian model. Instead, they add additional crosslingual latent variables (CLVs) to couple the monolingual models, capturing crosslingual semantic role patterns. Every predicate-tuple has its own inventory of CLVs specific to that tuple. Each CLV z is a multi-valued variable where each value defines a distribution over role labels for each language."
- `pdf/1912.08960/50e80cfa84200717921840fddcf3b051a9216ad8` **adequate / supported-substantive-content**. Are the images from a specific domain? — Synthetic ShapeWorld domain supported. New answer: "The images are from a synthetic domain. The context mentions that the evaluation is conducted on synthetic data and describes the ShapeWorld framework, which generates images and captions."
- `pdf/1904.07904/38f58f13c7f23442d5952c8caf126073a477bac0` **partial / supported-substantive-content**. What was the score of the proposed model? — Gives performance gains but not actual EM 51.10/F1 63.11 score, which table supplies. New answer: "The proposed model achieved a 2% improvement in EM score and over 1.5% improvement in F1 score compared to the previous best model."
- `pdf/1910.12574/8748e8f64af57560d124c7b518b853bf2711c13e` **adequate / supported-substantive-content**. Do they report results only on English data? — English datasets answer supported; conflicting unanswerable annotation flagged. New answer: "Yes, they report results on English data. The study uses publicly available datasets annotated for racism, sexism, hate, or offensive content on Twitter. The pre-trained BERT model used in the study is learned on English Wikipedia and BookCorpus. The experiments are conducted on datasets such as Waseem and Hovy's, Davidson et al.'s, and Waseem et al.'s, which are all in English. The results are reported on these English datasets using metrics such as precision, recall, and F1-score."
- `pdf/1706.01678/0767ca8ff1424f7a811222ca108a33b6411aaa8a` **adequate / supported-substantive-content**. What is the performance of their method? — BORDERLINE all-unanswerable annotation contradicted by supplied comparative ROUGE results; source-supported answer accepted. New answer: "The performance of their method is that it out-performs Liu et al. (2015)’s method and obtains the best ROGUE-1 F1 scores using the first co-occurrence+first model for important sentences. This also out-performs their Lead-1-AMR baseline by 0.3 ROGUE-1 F1 points. In the CNN-Dailymail corpus, their method using the first-3 model shows improved ROGUE-1 precision and an overall improved ROGUE-1 F1 score."
- `pdf/1802.00396/c88a846197b72d25e04ec55f00ee3e72f655504c` **wrong / unsupported-or-misapplied-content**. Which dataset do they use? — Names downstream COW conflict-outcome dataset instead of primary UN speech corpus; primary description missing. New answer: "The dataset used is the Correlates of War (COW) project’s Militarized Interstate Dispute (MID) dataset (v4.1)."
- `pdf/1912.13337/5bb3c27606c59d73fd6944ba7382096de4fa58d8` **adequate / supported-substantive-content**. Do they focus on Reading Comprehension or multiple choice question answering? — Multiple-choice focus explicit throughout. New answer: "They focus on multiple choice question answering."
- `pdf/1710.07960/0ba3ea93eef5660a79ea3c26c6a270eac32dfa4c` **wrong / unsupported-or-misapplied-content**. Did they use a crowdsourcing platform for annotations? — BORDERLINE categorical did-not-use-crowdsourcing assertion unsupported by merely no mention; gold false/mixed does not prove source support. New answer: "No, they did not use a crowdsourcing platform for annotations. The text mentions that the annotation of a separate training corpus for every target word demands a considerable amount of human labour, but it does not mention the use of a crowdsourcing platform. Instead, it discusses the use of a large corpus of web documents and the use of monosemous relatives to build a training corpus."
- `pdf/1603.01514/747b847d687f703cc20a87877c5b138f26ff137d` **adequate / supported-substantive-content**. Which parallel corpora are used? — CoNLL 2009 and Europarl EN-DE stated. New answer: "The parallel corpora used are the English (EN) and German (DE) sections of the CoNLL 2009 corpus and the EN-DE section of the Europarl corpus."
- `pdf/1910.09982/df5a4505edccc0ee11349ed6e7958cf6b84c9ed4` **wrong / unsupported-or-misapplied-content**. What dataset was used? — Core news corpus identified but reverses subset relation, calling shared-task corpus a subset of companion work. New answer: "The dataset used is a corpus of news articles with 18 propaganda techniques annotated on the same set of articles. This corpus is described as a subset of the one used for the shared task and was published in parallel to this paper at EMNLP-IJCNLP 2019."
- `pdf/1701.05574/49c32a2a64eb41381e5f12ccea4150cac9f3303d` **adequate / supported-substantive-content**. What other evaluation metrics are looked at? — F-score/Kappa explicit; mixed annotation flagged. New answer: "The other evaluation metrics looked at are F-score and Kappa statistics."
- `pdf/2003.13032/8df35c24af9efc3348d3b8d746df116480dfe661` **wrong / unsupported-or-misapplied-content**. Do they experiment with other tasks? — Confuses tasks enabled by new corpus with experiments performed; relevance detection not actually evaluated. New answer: "Yes, they experiment with tasks like Named Entity Recognition, Relation Extraction and (sentence/paragraph) relevance detection. Additionally, they present a supporting task of Relation Extraction (RE)."
- `pdf/1705.04153/04bde1d2b445f971e97bb46ade2d0290981c7a32` **partial / supported-substantive-content**. What is the meta knowledge specifically? — BORDERLINE all-unanswerable annotation; repeats generic shared metaknowledge without explaining its specific content. New answer: "The meta knowledge is the shared metaknowledge across different compositional rules, which the meta network captures and formulates."
- `pdf/1703.10344/61a9ea36ddc37c60d1a51dabcfff9445a2225725` **adequate / supported-substantive-content**. What news article sources are used? — Wikipedia external news references with counts supported; mixed annotation flagged. New answer: "The news article sources used are online news sources. The work mentions that almost 20% of current citations in all entity pages are news articles. It also refers to news articles crawled from the news external references in Wikipedia from 73,734 entity pages."
- `pdf/1909.00326/6c91d44d5334a4ac80100eead4e105d34e99a284` **adequate / supported-substantive-content**. Which model architectures do they test their word importance approach on? — Transformer/RNN architectural families present; RNN-Search precision omitted but core pair correct. New answer: "They test their word importance approach on several model architectures, including Transformer and RNN."
- `pdf/1912.01772/5cc2daca2a84ddccba9cdd9449e51bb3f64b3dde` **partial / supported-substantive-content**. What are the models used for the baseline of the three NLP tasks? — Kaldi and transformer identified but speech Clustergen omitted; feed-forward/model-size wording ambiguous in clipped passage. New answer: "The models used for the baseline of the three NLP tasks include speech recognition models, speech synthesis models, and neural end-to-end machine translation systems between Mapudungun and Spanish. For speech recognition, the nnet training recipe from Kaldi was used. For speech synthesis, techniques addressing alignment and correctness issues were employed. For machine translation, neural end-to-end systems were built with a transformer architecture, using parameters such as a model size of 2048, eight attention heads, dropout with 0.4 probability, label smoothing set to 0.1, and the Adam optimizer."
- `pdf/2002.03407/31735ec3d83c40b79d11df5c34154849aeb3fb47` **adequate / supported-substantive-content**. Who were the human evaluators used? — Twenty institution-recruited evaluators stated. New answer: "The human evaluators were 20 evaluators recruited from the institution."
- `pdf/1604.00727/7705dd04acedaefee30d8b2c9978537afb2040dc` **partial / supported-substantive-content**. What word level and character level model baselines are used? — Character/word comparisons correct but omits MemNN baseline; baseline-role interpretation borderline and gold None conflicts. New answer: "The word-level model and the character-level model are used as baselines. The word-level model has 19.9M parameters and achieves a best SQ accuracy of 53.9%, while the character-level model has 1.2M parameters and achieves SQ accuracies of 70.9% and 70.3% on the FB2M and FB5M settings."
- `pdf/1912.00667/bc730e4d964b6a66656078e2da130310142ab641` **partial / supported-substantive-content**. What type of classifiers are used? — Generic discriminative classifier described, but named LR/MLP models absent; claim exact type not supplied is true for these passages. New answer: "The text mentions that a discriminative model, such as a deep neural network, is used for classifying the relevance of microposts to an event. It also refers to an improved version of the micropost classification model, denoted as pθ(t) (y|x), but does not specify the exact type of classifier beyond that."
- `pdf/1608.01084/1f07e837574519f2b696f3d6fa3230af0b931e5d` **wrong / unsupported-or-misapplied-content**. Did they only experiment with one language pair? — Says multiple pairs but supplies only Chinese-English; contradicts actual experimental setup. New answer: "No, they did not only experiment with one language pair. The paper discusses experiments on Chinese-to-English translation."
- `pdf/1608.01884/662870a90890c620a964720b2ca122a1139410ea` **adequate / supported-substantive-content**. What language do they explore? — Contains complete English/French/German alternative; listed additional languages supported. New answer: "The languages explored include French, Italian, Spanish, Hebrew, Arabic, German, and English."
- `pdf/1911.07555/307e8ab37b67202fe22aedd9a98d9d06aaa169c5` **adequate / supported-substantive-content**. Does the paper report the performance of a baseline model on South African languages LID? — Reported comparative evaluations establish baseline performance reporting. New answer: "Yes, the paper reports the performance of a baseline model on South African languages LID. The proposed algorithm was evaluated on three existing datasets and compared to the implementations of three public LID implementations as well as to reported results of four other algorithms. It performed well relative to the other methods beating their results."
- `pdf/1906.01081/bf3b27a4f4be1f9ae31319877fd0c75c03126fd5` **adequate / supported-substantive-content**. How many people participated in their evaluation study of table-to-text models? — Around 500 workers explicit; mixed annotation. New answer: "Around 500 different workers were involved in the annotation."
- `pdf/1705.01265/63bb2040fa107c5296351c2b5f0312336dad2863` **adequate / supported-substantive-content**. How were the cluster extracted?  — Kmeans extraction and initialization settings supported. New answer: "The clusters were extracted using k-Means. The k-means clusters are initialized using \"k-means++\" as proposed in (Arthur and Vassilvitskii, 2007), while the algorithm is run for 300 iterations. The researchers tried different values for k ∈ {100, 250, 500, 1000, 2000}. For each k, they repeated the clustering experiment with different seed initialization for 10 times and selected the clustering result that minimizes the cluster inertia."
- `docx/1611.03599/6a31db1aca57a818f36bba9002561724655372a7` **partial / supported-substantive-content**. What is the size of the Chinese data? — True user statistics provide related size information but omit requested post count, which is missing. New answer: "The Chinese data, referred to as the FBFans dataset, contains 2,496 authors, 505,137 likers, 33,686 commenters, and 505,412 unique users."
- `pdf/1903.03530/73a7acf33b26f5e9475ee975ba00d14fd06f170f` **partial / supported-substantive-content**. What labels do they create on their dataset? — General clinical-topic labels supported but symptom attributes/full requested label inventory missing. New answer: "The dataset includes labels for conversation topics and clinical symptoms, which are annotated and clinically validated by certified telehealth nurses."
- `pdf/1703.07090/1bb7eb5c3d029d95d1abf9f2892c1ec7b6eef306` **partial / supported-substantive-content**. what was their character error rate? — Relative CER reduction supplied but requested absolute error rate missing from answer/context. New answer: "The model trained with the proposed training framework reduces relative 14% character error rate, compared to original model which has the similar real-time capability."
- `pdf/1612.08205/cd2878c5a52542ddf080b20bec005d9a74f2d916` **adequate / supported-substantive-content**. What are the industry classes defined in this paper? — All fourteen industry classes supplied. New answer: "The industry classes defined in this paper include Technology, Religion, Fashion, Publishing, Sports, Real Estate, Law, Environment, Tourism, Construction, Museums, Banking, Security, and Automotive."
- `docx/1611.02988/fa30a938b58fc05131c3854f12efe376cbad887f` **partial / supported-substantive-content**. What was their performance on emotion detection? — Qualitative performance supported but requested dataset-specific F1 values absent. New answer: "The models achieved competitive or even state-of-the-art results for some of the emotion labels on existing, standard evaluation datasets."
- `pdf/1802.06024/585626d18a20d304ae7df228c2128da542d248ff` **adequate / supported-substantive-content**. What metrics are used to establish that this makes chatbots more knowledgeable and better at learning and conversation?  — Coverage/MCC/positive F1 metrics supported. New answer: "The metrics used to establish that this makes chatbots more knowledgeable and better at learning and conversation are Coverage(C), Avg. MCC, and avg. +ve F1 score."
- `pdf/1910.10781/0810b43404686ddfe4ca84783477ae300fdd2ea4` **adequate / supported-substantive-content**. On top of BERT does the RNN layer work better or the transformer layer? — Correct full dataset-wise RoBERT/ToBERT comparison; BORDERLINE false introductory no-direct-comparison caveat separately audited. New answer: "The provided context does not directly compare the performance of an RNN layer versus a transformer layer on top of BERT. However, it states that ToBERT, which uses a transformer layer on top of BERT, outperforms RoBERT, which uses an RNN (LSTM) layer, on the Fisher and 20newsgroups datasets. On the CSAT dataset, ToBERT performs slightly worse than RoBERT, but this difference is not statistically significant."
- `pdf/1909.00326/93beae291b455e5d3ecea6ac73b83632a3ae7ec7` **adequate / supported-substantive-content**. How do their models decide how much improtance to give to the output words? — Integrated-gradient aggregation supported; unusual differentiability statement is in source, not outside correction. New answer: "The models use the integrated gradients method to estimate the word importance in an input sentence. This method attributes the model predictions to input features by integrating first-order derivatives. The integrated gradients method is implementation invariant and does not require neural models to be differentiable or smooth. The method calculates the contribution of every input word to every output word, forming a contribution matrix of size M × N, where N is the output sentence length. For each input word, the contribution values to all output words are aggregated by the sum operation, and then all sums are normalized through the Softmax function to obtain the word importance of each input word to the entire output sentence."
- `docx/1611.01576/a130306c6662ff489df13fb3f8faa7cba8c52a21` **adequate / supported-substantive-content**. What pooling function is used? — Dynamic average/f/fo/ifo pooling supported. New answer: "The pooling function used is a minimalist recurrent pooling function that allows for parallel computation across channels. It can be one of the options termed f-pooling, fo-pooling, and ifo-pooling, which are constructed from the familiar elementwise gates of the traditional LSTM cell. The simplest option is termed \"dynamic average pooling,\" which uses only a forget gate."
- `docx/1601.02403/7697baf8d8d582c1f664a614f6332121061f87db` **wrong / unsupported-or-misapplied-content**. Which machine learning methods are used in experiments? — Lists related-work classifiers instead of target Structural SVM/SVMhmm; target method passage absent. New answer: "The article mentions the use of several machine learning methods in experiments, including multinomial Naive Bayes classifier, maximum entropy model, C4.5 decision classifier, convolution kernel methods, multi-class SVM, maximum entropy classifier, CRFs (Conditional Random Fields), and various other supervised and semi-supervised machine learning methods."
- `pdf/1903.03530/2c85865a65acd429508f50b5e4db9674813d67f2` **adequate / supported-substantive-content**. Which data do they use as a starting point for the dialogue dataset? — Clinical seed telephone recordings explicit. New answer: "They use recordings of nurse-initiated telephone conversations for congestive heart failure patients undergoing telemonitoring, post-discharge from the hospital, as a starting point for the dialogue dataset."
- `docx/1606.03676/3ddff6b707767c3dd54d7104fe88b628765cae58` **adequate / supported-substantive-content**. which datasets did they experiment with? — UD1.2 and all languages explicit. New answer: "The datasets they experimented with are the Universal Dependencies v1.2 treebanks (UD1.2), which include morphosyntactically annotated corpora for 16 languages: Bulgarian, Croatian, Czech, Danish, English, French, German, Indonesian, Italian, Norwegian, Persian, Polish, Portuguese, Slovenian, Spanish, and Swedish."
- `pdf/1912.06262/4477bb513d56e57732fba126944073d414d1f75f` **adequate / supported-substantive-content**. where did they obtain the annotated clinical notes from? — 2010 i 2 b 2/VA clinical notes explicitly stated. New answer: "The annotated clinical notes were obtained from the CE task in 2010 i2b2/VA."

## 4. Every new-arm absence/insufficiency claim

Audited 95 sentences across 95 answers, including all canonical refusals and the 39 off-topic rejections. Verdict counts: {"true":80,"borderline":2,"false":10,"true-for-completeness-only":3}. A true-for-completeness-only refusal means a full answer is unsupported but useful partial evidence was withheld, contrary to C’s partial-answer instruction. There are 10 false claims under the primary evidence judgments, including 9 pure refusals and 1 false caveat in an otherwise correct answer; one of those refusals relies on an explicitly flagged exclusivity inference. Two further claims are borderline. This is not zero false missing-information claims.

- **R003 / true** (earlier 40) `pdf/1809.01202/a4d115220438c0ded06a91ad62337061389a6747`: "The provided context is insufficient to answer this question." — Facebook data-collection passage missing; related-work tweets do not identify target dataset.
- **R011 / true** (dev 200) `docx/1608.01884/9a7ba5ed1779c664d2cac92494a43517d3e87c96`: "The provided context is insufficient to answer this question." — Relevance gate returned no passages.
- **R016 / true** (dev 200) `pdf/2001.03131/a778b8204a415b295f73b93623d09599f242f202`: "The provided context is insufficient to answer this question." — Relevance gate returned no passages.
- **R027 / true** (dev 200) `pdf/1810.08699/1f085b9bb7bfd0d6c8cba1a9d73f08fcf2da7590`: "No, the provided context does not mention the use of a crowdsourcing platform for manual annotations." — No crowd platform is mentioned. This establishes lack of mention, not proof that no platform was used; the answer qualifies its opening no.
- **R030 / true** (dev 200) `pdf/1608.06757/c2b8ee872b99f698b3d2082d57f9408a91e1b4c1`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R033 / true** (offtopic) `offtopic/04`: "The provided context is insufficient to answer this question." — Customer identities absent; gate rejected.
- **R037 / borderline** (dev 200) `pdf/1802.07862/7cd22ca9e107d2b13a7cc94252aaa9007976b338`: "The passages do not explicitly state whether the model was inspected to see if it learned to associate image parts with words related to entities." — Qualitative modality-attention examples are present, but the narrower image-region/word inspection is not explicit. A qualified partial answer was possible.
- **R042 / true** (offtopic) `offtopic/21`: "The provided context is insufficient to answer this question." — Hosting region absent; gate rejected.
- **R050 / true** (dev 200) `pdf/1909.03405/7b4fb6da74e6bd1baea556788a02969134cf0800`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R056 / true** (dev 200) `docx/1704.04452/8e44c02c2d9fa56fb74ace35ee70a5add50b52ae`: "The provided context is insufficient to answer this question." — Corpus language not specified in supplied passages; conflicting references flagged.
- **R058 / true** (dev 200) `pdf/1909.00326/384bf1f55c34b36cb03f916f50bbefade6c86a75`: "The provided context is insufficient to answer this question." — Perturbation-performance results do not answer effect of incorporating importance.
- **R062 / true** (offtopic) `offtopic/26`: "I could not find any relevant information in the knowledge base to answer this question." — Meal per-diem absent; gate rejected.
- **R072 / true** (dev 200) `pdf/1701.05574/bbb77f2d6685c9257763ca38afaaef29044b4018`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R078 / true** (dev 200) `pdf/1907.04433/5f2bade0881c719ab026bc2e2962e2ada96cdb25`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R089 / true** (dev 200) `pdf/1910.05603/53f74250948015c394e7b8438a2041fdeb330911`: "The provided context is insufficient to answer this question." — Gate rejected; mixed answerability flagged.
- **R099 / true** (dev 200) `pdf/1703.10344/77c34f1033702278f7f044806c1eba0c6ecb8b04`: "The provided context is insufficient to answer this question." — English-only evaluation not established by supplied news-entity passages.
- **R105 / true** (earlier 40) `pdf/1909.06200/5c3e98e3cebaecd5d3e75ec2c9fc3dd267ac3c83`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R106 / true** (dev 200) `docx/1701.08229/00c57e45ac6afbdfa67350a57e81b4fad0ed2885`: "The provided context is insufficient to answer this question." — English-only evaluation not established.
- **R107 / true** (dev 200) `docx/1701.05574/22732cb9476e521452bf0538f3fdb94cf3867651`: "The stylistic features obtained are not explicitly listed in the provided context." — The target stylistic-feature inventory is not listed.
- **R124 / true** (offtopic) `offtopic/13`: "The provided context is insufficient to answer this question." — Hotel cap absent.
- **R127 / true** (offtopic) `offtopic/33`: "The provided context is insufficient to answer this question." — Literature fact absent; gate rejected.
- **R132 / true** (dev 200) `pdf/1608.01884/1dc2da5078a7e5ea82ccd1c90d81999a922bc9bf`: "The provided context is insufficient to answer this question." — Gate rejected; contradictory yes/no references flagged.
- **R142 / true** (offtopic) `offtopic/02`: "The provided context is insufficient to answer this question." — Ticker absent; gate rejected.
- **R149 / true** (offtopic) `offtopic/06`: "The provided context is insufficient to answer this question." — Salary bands absent; gate rejected.
- **R154 / true** (offtopic) `offtopic/34`: "The provided context is insufficient to answer this question." — Boiling point absent; gate rejected.
- **R174 / true** (dev 200) `pdf/1806.05504/ef7212075e80bf35b7889dc8dd52fcbae0d1400a`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R183 / true** (offtopic) `offtopic/12`: "The provided context is insufficient to answer this question." — Paid-holiday count absent.
- **R188 / false** (dev 200) `pdf/1909.13104/392fb87564c4f45d0d8d491a9bb217c4fce87f03`: "The provided context is insufficient to answer this question." — Table contains all three baseline names and prose discusses them; false insufficiency.
- **R190 / false** (dev 200) `docx/1612.08205/01a41c0a4a7365cd37d28690735114f2ff5229f2`: "The context does not specify a particular social media platform." — Blogger platform explicitly named; false absence claim.
- **R195 / true** (dev 200) `pdf/2002.02070/6bf93968110c6e3e3640360440607744007a5228`: "However, it is not clear exactly which attributes the term \"fast\" refers to." — The passage itself says the exact physical attribute meant by fast is unknown.
- **R201 / true** (dev 200) `docx/1611.08661/2e37e681942e28b5b05639baaff4cd5129adb5fb`: "The provided context is insufficient to answer this question." — All-unanswerable description-length question; length absent.
- **R208 / false** (earlier 40) `pdf/2002.01984/ff338921e34c15baf1eae0074938bf79ee65fdd2`: "The provided context is insufficient to answer this question." — Always-YES baseline explicit; false insufficiency.
- **R233 / true** (offtopic) `offtopic/23`: "The provided context is insufficient to answer this question." — Probation duration absent.
- **R238 / false** (dev 200) `docx/1701.05574/49c32a2a64eb41381e5f12ccea4150cac9f3303d`: "The provided context is insufficient to answer this question." — F-score/Kappa explicit; false insufficiency despite mixed annotation.
- **R244 / true** (dev 200) `pdf/1604.08504/a1645d0ba50e4c29f0feb806521093e7b1459081`: "I could not find any relevant information in the knowledge base to answer this question." — Gate rejected; quality references conflict.
- **R246 / true** (offtopic) `offtopic/10`: "The provided context is insufficient to answer this question." — Free-lunch count absent; gate rejected.
- **R249 / true** (dev 200) `pdf/1909.03405/bdc91d1283a82226aeeb7a2f79dbbc57d3e84a1a`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R258 / true** (dev 200) `pdf/1801.05147/ef4dba073d24042f24886580ae77add5326f2130`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R267 / true** (offtopic) `offtopic/14`: "The provided context is insufficient to answer this question." — Laptop brand absent.
- **R272 / true** (offtopic) `offtopic/19`: "The provided context is insufficient to answer this question." — Employee count absent; gate rejected.
- **R274 / true** (offtopic) `offtopic/29`: "The provided context is insufficient to answer this question." — Press approval absent.
- **R275 / true** (offtopic) `offtopic/37`: "The provided context is insufficient to answer this question." — Photosynthesis absent; gate rejected.
- **R277 / true** (offtopic) `offtopic/20`: "The provided context is insufficient to answer this question." — Help-desk number absent; gate rejected.
- **R279 / true** (offtopic) `offtopic/09`: "The provided context is insufficient to answer this question." — Pet policy absent; gate rejected.
- **R280 / true** (offtopic) `offtopic/27`: "The provided context is insufficient to answer this question." — Carryover policy does not establish cashout; refusal appropriate.
- **R283 / true** (dev 200) `pdf/1912.00667/bc730e4d964b6a66656078e2da130310142ab641`: "It also refers to an improved version of the micropost classification model, denoted as pθ(t) (y|x), but does not specify the exact type of classifier beyond that." — The supplied text gives a generic discriminative/probabilistic model, not the named LR/MLP experimental classifier list.
- **R287 / true** (dev 200) `docx/1603.01987/6a633811019e9323dc8549ad540550d27aa6d972`: "The provided context is insufficient to answer this question." — Medical-domain vocabulary analysis does not establish proposed bad-article premise; mixed annotation.
- **R310 / false** (dev 200) `docx/1604.00727/784ce5a983c5f2cc95a2c60ce66f2a8a50f3636f`: "The provided context is insufficient to answer this question." — Complete evaluation section describes only SimpleQuestions with FB 2 M/FB 5 M settings; reasonable no answer supported, exclusivity inference BORDERLINE.
- **R311 / true** (offtopic) `offtopic/30`: "The provided context is insufficient to answer this question." — Capital absent; gate rejected.
- **R317 / true** (dev 200) `docx/1609.00559/4dcf67b5e7bd1422e7e70c657f6eacccd8de06d3`: "I could not find any relevant information in the knowledge base to answer this question." — Gate rejected; mixed annotation.
- **R320 / true** (offtopic) `offtopic/36`: "The provided context is insufficient to answer this question." — Mountain fact absent; gate rejected.
- **R325 / true** (offtopic) `offtopic/15`: "The provided context is insufficient to answer this question." — Internet stipend absent.
- **R328 / true** (dev 200) `pdf/1907.09369/6b6d498546f856ac20958f666fc3fd55811347e2`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R331 / true** (dev 200) `pdf/1610.08815/3a6e843c6c81244c14730295cfb8b865cd7ede46`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R335 / true** (offtopic) `offtopic/38`: "The provided context is insufficient to answer this question." — Football result absent; gate rejected.
- **R336 / true-for-completeness-only** (dev 200) `pdf/1808.09111/5eabfc6cc8aa8a99e6e42514ef9584569cb75dec`: "The provided context is insufficient to answer this question." — A full answer is not supported, but some relevant evidence is present. Variant C should give the supported part rather than a pure refusal. WSJ/English bibliography gives language clues but English-only scope not explicitly established; mixed annotation.
- **R343 / true** (offtopic) `offtopic/35`: "The provided context is insufficient to answer this question." — Tire instructions absent; gate rejected.
- **R353 / true** (offtopic) `offtopic/08`: "The provided context is insufficient to answer this question." — Gym subsidy absent; gate rejected.
- **R355 / true** (offtopic) `offtopic/17`: "The provided context is insufficient to answer this question." — HR identity absent; gate rejected.
- **R356 / true** (offtopic) `offtopic/28`: "The provided context is insufficient to answer this question." — Carbon target absent; gate rejected.
- **R357 / true** (dev 200) `pdf/1912.00667/4ac2c3c259024d7cd8e449600b499f93332dab60`: "The provided context is insufficient to answer this question." — Gate rejected; mixed annotation.
- **R367 / true** (dev 200) `docx/1610.09225/3611a72f754de1e256fbd25b012197e1c24e8470`: "The provided context is insufficient to answer this question." — Gate rejected; mixed annotation.
- **R375 / true** (offtopic) `offtopic/01`: "The provided context is insufficient to answer this question." — CEO identity absent; gate rejected.
- **R379 / true** (offtopic) `offtopic/32`: "I could not find any relevant information in the knowledge base to answer this question." — Cake recipe absent; gate rejected.
- **R383 / true** (dev 200) `pdf/1608.01884/9a7ba5ed1779c664d2cac92494a43517d3e87c96`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R392 / true** (offtopic) `offtopic/18`: "The provided context is insufficient to answer this question." — Mission absent; gate rejected.
- **R394 / true** (dev 200) `pdf/1910.06592/e35c2fa99d5c84d8cb5d83fca2b434dcd83f3851`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R412 / true** (dev 200) `pdf/1611.03599/6a31db1aca57a818f36bba9002561724655372a7`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R413 / true** (offtopic) `offtopic/16`: "The provided context is insufficient to answer this question." — Second-job policy absent.
- **R421 / true** (offtopic) `offtopic/25`: "The provided context is insufficient to answer this question." — Visa sponsorship absent; gate rejected.
- **R447 / false** (earlier 40) `pdf/1908.04042/b4f881331b975e6e4cab1868267211ed729d782d`: "The provided context is insufficient to answer this question." — 33,663 distinct keywords explicit; false insufficiency.
- **R462 / true** (offtopic) `offtopic/39`: "I could not find any relevant information in the knowledge base to answer this question." — Novel recommendations absent; gate rejected.
- **R464 / true-for-completeness-only** (dev 200) `pdf/1801.05147/2df4a045a9cd7b44874340b6fdf9308d3c55327a`: "The provided context is insufficient to answer this question." — A full answer is not supported, but some relevant evidence is present. Variant C should give the supported part rather than a pure refusal. Student annotators supplied but platform-use decision not explicit; mixed annotation.
- **R466 / true** (dev 200) `docx/1703.10344/77c34f1033702278f7f044806c1eba0c6ecb8b04`: "The provided context is insufficient to answer this question." — English-only scope not supplied.
- **R467 / true-for-completeness-only** (dev 200) `pdf/1611.03599/518dae6f936882152c162058895db4eca815e649`: "The provided context is insufficient to answer this question." — A full answer is not supported, but some relevant evidence is present. Variant C should give the supported part rather than a pure refusal. Layer details present but no explicit total-eight enumeration.
- **R478 / true** (dev 200) `pdf/1912.04961/861187338c5ad445b9acddba8f2c7688785667b1`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R483 / true** (dev 200) `pdf/1804.11346/7793805982354947ea9fc742411bec314a6998f6`: "The provided context is insufficient to answer this question." — Gate rejected.
- **R487 / false** (dev 200) `pdf/1612.08205/01a41c0a4a7365cd37d28690735114f2ff5229f2`: "The provided context is insufficient to answer this question." — Blogger dataset table names platform; false insufficiency.
- **R489 / true** (dev 200) `pdf/1707.05236/cd32a38e0f33b137ab590e1677e8fb073724df7f`: "The provided context is insufficient to answer this question." — English language not identified in supplied FCE-only material; acronym needs outside knowledge.
- **R490 / false** (dev 200) `pdf/1910.10781/0810b43404686ddfe4ca84783477ae300fdd2ea4`: "The provided context does not directly compare the performance of an RNN layer versus a transformer layer on top of BERT." — Table 3 and the accompanying paragraph directly compare RoBERT and ToBERT; the rest of this very answer reports that comparison correctly.
- **R505 / false** (dev 200) `docx/1703.04001/9af3142630b350c93875441e1e1767312df76d17`: "The provided context is insufficient to answer this question." — Study explicitly predicts answerability rather than usefulness; false insufficiency for supported no.
- **R510 / true** (offtopic) `offtopic/03`: "The provided context is insufficient to answer this question." — Revenue absent; gate rejected.
- **R515 / true** (offtopic) `offtopic/24`: "The provided context is insufficient to answer this question." — Severance amount absent.
- **R516 / true** (offtopic) `offtopic/11`: "The provided context is insufficient to answer this question." — Stock grants absent; gate rejected.
- **R517 / true** (offtopic) `offtopic/31`: "I could not find any relevant information in the knowledge base to answer this question." — Moon distance absent; gate rejected.
- **R519 / true** (offtopic) `offtopic/22`: "The provided context is insufficient to answer this question." — Guest password absent; gate rejected.
- **R531 / borderline** (dev 200) `pdf/1810.04428/2c6b50877133a499502feb79a682f4023ddab63e`: "The paper does not explicitly state the language it focuses on." — English/Simple-English resource discussion provides a useful clue, but the supplied passage does not explicitly label the target corpus language. Paper-wide absence cannot be established from retrieved excerpts.
- **R532 / true** (dev 200) `pdf/1906.01081/28067da818e3f61f8b5152c0d42a531bf0f987d4`: "The passages do not specify the exact length of n-grams aligned using PARENT." — The requested PARENT ngram orders are absent from these passages.
- **R536 / true** (offtopic) `offtopic/05`: "The provided context is insufficient to answer this question." — Dress-code policy absent.
- **R545 / true** (dev 200) `pdf/1710.07960/0ba3ea93eef5660a79ea3c26c6a270eac32dfa4c`: "The text mentions that the annotation of a separate training corpus for every target word demands a considerable amount of human labour, but it does not mention the use of a crowdsourcing platform." — There is no crowd-platform mention. The separate categorical assertion that no platform was used is unsupported and was graded wrong.
- **R547 / true** (dev 200) `pdf/2001.09215/f641f561ad2ea2794a52e4e4bdd62e1f353ab797`: "The provided context is insufficient to answer this question." — Gate rejected; mixed annotation.
- **R549 / false** (dev 200) `docx/1705.01265/a4a1fcef760b133e9aa876ac28145ad98a609927`: "The provided context is insufficient to answer this question." — Vector selection/dimensionality described; false insufficiency.
- **R553 / true** (offtopic) `offtopic/07`: "The provided context is insufficient to answer this question." — Parking reimbursement absent.
- **R554 / true** (dev 200) `docx/1608.01884/1dc2da5078a7e5ea82ccd1c90d81999a922bc9bf`: "The provided context is insufficient to answer this question." — Gate rejected; contradictory yes/no annotation.
- **R557 / true** (dev 200) `pdf/1904.03288/2ddb51b03163d309434ee403fef42d6b9aecc458`: "The provided context is insufficient to answer this question." — Gate rejected; mixed annotation.

Full text and supporting excerpts are in absence-claims.jsonl. R490’s answer correctly compares the two models but opens by falsely saying no direct comparison is supplied. It remains adequate for task-answer completeness, with a separately flagged false caveat; a stricter no-false-caveat rubric would demote this case. R545’s lack-of-mention statement is true, but its categorical no-use assertion is unsupported and graded wrong.

## 5. Relevance-gate rejections

| Group | Old | New |
| --- | --- | --- |
| dev 200 | 25 | 25 |
| earlier 40 | 1 | 1 |
| offtopic | 28 | 28 |

Gate results were identical per paired case. These are included in the refusal totals, not added to them. Every rejected call is in gate-rejections.jsonl; IDs below list each rejected case once.

### dev 200

- `pdf/2001.09215/f641f561ad2ea2794a52e4e4bdd62e1f353ab797`: What language is explored in this paper?
- `pdf/1611.03599/6a31db1aca57a818f36bba9002561724655372a7`: What is the size of the Chinese data?
- `pdf/1909.03405/bdc91d1283a82226aeeb7a2f79dbbc57d3e84a1a`: How much is performance improved on NLI?
- `docx/1609.00559/4dcf67b5e7bd1422e7e70c657f6eacccd8de06d3`: How many humans participated?
- `pdf/1912.04961/861187338c5ad445b9acddba8f2c7688785667b1`: Is the data de-identified?
- `pdf/1910.06592/e35c2fa99d5c84d8cb5d83fca2b434dcd83f3851`: How did they obtain the dataset?
- `pdf/1608.06757/c2b8ee872b99f698b3d2082d57f9408a91e1b4c1`: what is the state of the art?
- `pdf/1910.05603/53f74250948015c394e7b8438a2041fdeb330911`: What are the deep learning architectures used in the task?
- `pdf/2001.03131/a778b8204a415b295f73b93623d09599f242f202`: What is the Random Kitchen Sink approach?
- `pdf/1804.11346/7793805982354947ea9fc742411bec314a6998f6`: Are the annotations automatic or manually created?
- `pdf/1608.01884/9a7ba5ed1779c664d2cac92494a43517d3e87c96`: What data do they look at?
- `pdf/1909.03405/7b4fb6da74e6bd1baea556788a02969134cf0800`: Do they train their model starting from a checkpoint?
- `docx/1608.01884/9a7ba5ed1779c664d2cac92494a43517d3e87c96`: What data do they look at?
- `pdf/1912.00667/4ac2c3c259024d7cd8e449600b499f93332dab60`: Do they report results only on English data?
- `pdf/1806.05504/ef7212075e80bf35b7889dc8dd52fcbae0d1400a`: Why are current ELS's not sufficiently effective?
- `docx/1608.01884/1dc2da5078a7e5ea82ccd1c90d81999a922bc9bf`: Do the authors conduct experiments on the tasks mentioned?
- `pdf/1907.04433/5f2bade0881c719ab026bc2e2962e2ada96cdb25`: Do they experiment with the toolkits?
- `pdf/1604.08504/a1645d0ba50e4c29f0feb806521093e7b1459081`: What is the benchmark dataset and is its quality high?
- `pdf/1608.01884/1dc2da5078a7e5ea82ccd1c90d81999a922bc9bf`: Do the authors conduct experiments on the tasks mentioned?
- `pdf/1907.09369/6b6d498546f856ac20958f666fc3fd55811347e2`: What are the hyperparameters of the bi-GRU?
- `pdf/1801.05147/ef4dba073d24042f24886580ae77add5326f2130`: What accuracy does the proposed system achieve?
- `pdf/1701.05574/bbb77f2d6685c9257763ca38afaaef29044b4018`: What is the best reported system?
- `pdf/1610.08815/3a6e843c6c81244c14730295cfb8b865cd7ede46`: What are the state of the art models?
- `docx/1610.09225/3611a72f754de1e256fbd25b012197e1c24e8470`: Do they remove seasonality from the time series?
- `pdf/1904.03288/2ddb51b03163d309434ee403fef42d6b9aecc458`: what were the baselines?

### earlier 40

- `pdf/1909.06200/5c3e98e3cebaecd5d3e75ec2c9fc3dd267ac3c83`: What experiments are conducted?

### offtopic

- `offtopic/28`: What is the company's carbon reduction target?
- `offtopic/37`: Explain how photosynthesis works.
- `offtopic/03`: What was the company's annual revenue last year?
- `offtopic/11`: How many stock options do new hires receive?
- `offtopic/19`: How many employees does the company have?
- `offtopic/38`: Who won the 2018 FIFA World Cup?
- `offtopic/30`: What is the capital of France?
- `offtopic/22`: What is the guest Wi-Fi password?
- `offtopic/06`: What are the salary bands for the Senior Engineer role?
- `offtopic/32`: How do I bake a chocolate cake?
- `offtopic/25`: Does the company sponsor work visas for new hires?
- `offtopic/26`: What is the daily meal per diem while traveling?
- `offtopic/04`: Who are the company's top three customers?
- `offtopic/35`: How do I change a flat tire?
- `offtopic/33`: Who wrote Romeo and Juliet?
- `offtopic/09`: Can I bring my dog to the office?
- `offtopic/18`: What is the company's mission statement?
- `offtopic/02`: What is the company's stock ticker symbol?
- `offtopic/20`: What is the phone number for the IT help desk?
- `offtopic/01`: Who is the current CEO of the company?
- `offtopic/31`: What is the distance from Earth to the Moon?
- `offtopic/34`: What is the boiling point of water in Fahrenheit?
- `offtopic/10`: How many free lunches are provided each week?
- `offtopic/08`: Does the company offer a gym membership subsidy?
- `offtopic/36`: What is the tallest mountain in the world?
- `offtopic/39`: Recommend a good science fiction novel.
- `offtopic/17`: Who is the head of the HR department?
- `offtopic/21`: Which AWS region hosts our production environment?

## 6. Off-topic questions through real retrieval

Old 39/39 rejected(100%);new 39/39 rejected(100%). No off-topic question received a substantive answer. In each arm 28 were rejected by the retrieval gate;11 passed the gate and were refused by generation. This used an isolated, freshly ingested 20-chunk employee-handbook collection and the 39 existing negative controls; it did not search held-out research papers or force the whole handbook into every prompt. It measures this negative-control corpus, not universal off-topic safety.

## 7. Tokens, latency and Neurons

### dev 200 successful calls (200 per arm); values are mean / maximum

| Metric | Old | New |
| --- | --- | --- |
| Input tokens | 1395.4 / 1745 | 3005.2 / 4044 |
| Output tokens | 30.2 / 113 | 44.2 / 257 |
| Generation seconds | 1.28 / 12.88 | 1.73 / 30.33 |
| Retrieval seconds | 0.80 / 47.85 | 0.98 / 3.74 |
| End-to-end seconds | 2.10 / 50.48 | 2.74 / 31.43 |
| Neurons | 7.37 / 10.67 | 15.25 / 23.07 |

### earlier 40 successful calls (40 per arm); values are mean / maximum

| Metric | Old | New |
| --- | --- | --- |
| Input tokens | 1471.9 / 1633 | 3205.4 / 3721 |
| Output tokens | 40.2 / 92 | 55.8 / 150 |
| Generation seconds | 0.93 / 1.69 | 2.57 / 13.31 |
| Retrieval seconds | 0.56 / 1.15 | 1.05 / 2.84 |
| End-to-end seconds | 1.51 / 2.30 | 3.65 / 14.70 |
| Neurons | 8.03 / 10.19 | 16.52 / 20.24 |

### offtopic successful calls (39 per arm); values are mean / maximum

| Metric | Old | New |
| --- | --- | --- |
| Input tokens | 533.1 / 1197 | 632.9 / 1461 |
| Output tokens | 14.1 / 17 | 11.6 / 17 |
| Generation seconds | 1.22 / 12.72 | 0.59 / 1.06 |
| Retrieval seconds | 0.22 / 1.11 | 0.21 / 0.41 |
| End-to-end seconds | 1.44 / 12.92 | 0.81 / 1.38 |
| Neurons | 2.89 / 5.87 | 3.28 / 7.09 |

### all successful calls (279 per arm); values are mean / maximum

| Metric | Old | New |
| --- | --- | --- |
| Input tokens | 1285.8 / 1745 | 2702.3 / 4044 |
| Output tokens | 29.4 / 113 | 41.3 / 257 |
| Generation seconds | 1.22 / 12.88 | 1.69 / 30.33 |
| Retrieval seconds | 0.69 / 47.85 | 0.88 / 3.74 |
| End-to-end seconds | 1.93 / 50.48 | 2.60 / 31.43 |
| Neurons | 6.84 / 10.67 | 13.76 / 23.07 |

Total reported usage:5747.05 Neurons across 558 successful calls, split over allowance windows. Five failed transport attempts returned no usage; their billing is unknown and is excluded from this known total, not assumed free. The 50 Neuron unknown-attempt reserve used by the worker was a budget-control estimate, not a measured bill. Dashboard balance could not be read. Request/response IDs, sizes, usage, finish reasons and wire prompts are retained in results.jsonl; individual timings include real local retrieval/network variability. Means/maxima above include successful calls only; failed attempt timings remain in results.jsonl.

All 558 finish reasons were stop; maximum observed output 257 tokens, below 512. No successful prompt was within 5%of its total budget after reserving 512 answer tokens; none exceeded it. Largest new input 4044+512=4556<5000;largest old 1745+512=2257<4096. Every request was guarded for max_tokens 512,temperature 0,raw/nonstreaming Qwen. Budgets include no conversation history in this test.

## 8. Checks and failures

- Application tests:199 passed,28 skipped,0 failed. Live model/database probes were disabled for the offline run; localhost HTTP tests enabled. Skips are not passes.
- Application and test TypeScript checks passed; Docker Compose configuration validation and affected-file whitespace diff check passed.
- New and legacy profile smoke checks each reproduced 79 historical prompt/system pairs byte-for-byte.
- No frozen source/input hash changed during generation. Fresh embedding count 563 includes five retry preparations. Network filter violations 0;embedding-count violations 0;returned-context scope violations 0.
- No retrieval-errors artifact; five generation transport failures, all recovered with successful final calls. No output-length finishes.
- This was not a deployment, Docker rebuild, UI test, concurrency/load test or held-out test evaluation.

## 9. Borderline judgments and limitations

- **R014** `pdf/1912.13337/e97186c51d4af490dba6faaf833d269c8256426c` — Are the automatically constructed datasets subject to quality control? (new;adequate;evidence complete). BORDERLINE annotation says no, but source explicitly describes artifact control and distractor filtering; supported yes accepted.
- **R037** `pdf/1802.07862/7cd22ca9e107d2b13a7cc94252aaa9007976b338` — Do they inspect their model to see if their model learned to associate image parts with words related to entities? (new;refused;evidence partial). BORDERLINE qualitative modality-attention examples present, but image-part/word inspection not explicit; partial evidence.
- **R041** `pdf/1809.01541/c9b8d3858c112859eabee54248b874331c48f71b` — What type of inflections are considered? (old;partial;evidence partial). BORDERLINE all references unanswerable; broad morphological-task description supported but no specific inflection types supplied.
- **R055** `pdf/1702.03856/72755c2d79210857cfff60bfbcb55f83c71ada51` — what is the size of the speech corpus? (new;partial;evidence complete). Audio duration correct but omits 104 calls and all token counts; completeness borderline for generic size wording.
- **R060** `pdf/1706.01678/0767ca8ff1424f7a811222ca108a33b6411aaa8a` — What is the performance of their method? (new;adequate;evidence complete). BORDERLINE all-unanswerable annotation contradicted by supplied comparative ROUGE results; source-supported answer accepted.
- **R080** `pdf/1910.14599/af5730d82535464cedfa707a03415ac2e7a21295` — What data sources do they use for creating their dataset? (old;adequate;evidence complete). All four source families correct; BORDERLINE minor erroneous MASC expansion (Multi-Sentence instead of Manually) flagged, core answer unchanged.
- **R108** `pdf/1908.10084/2e89ebd2e4008c67bb2413699589ee55f59c4f36` — How are the siamese networks trained? (old;partial;evidence partial). Tied-weight fine-tuning/classification supported; omits regression/triplet details and conflates explicit InferSent MNLI attribution with SBERT; BORDERLINE.
- **R109** `pdf/1802.07862/7cd22ca9e107d2b13a7cc94252aaa9007976b338` — Do they inspect their model to see if their model learned to associate image parts with words related to entities? (old;refused;evidence partial). Modality error analysis supplied, but precise image-region/word inspection not explicit; BORDERLINE.
- **R110** `pdf/1912.00667/43f074bacabd0a355b4e0f91a1afd538c0a6244f` — How is the keyword specific expectation elicited from the crowd? (new;adequate;evidence complete). BORDERLINE reference describes keyword discovery, while actual expectation-elicitation subsection supports crowd labels plus probabilistic inference; task-wording grade follows source.
- **R114** `docx/1603.01514/6568a31241167f618ef5ede939053feaa2fb0d7e` — Do they add one latent variable for each language pair in their Bayesian model? (new;adequate;evidence complete). BORDERLINE gold says yes, but CLVs per aligned argument and scalable multilingual construction support qualified no to one-per-language-pair.
- **R122** `pdf/1910.05603/ceb4bac1f6c506b5dab37607354530faee02ccac` — What is the performance reported for the best models in the VLSP 2018 and VLSP 2019 challenges? (old;adequate;evidence complete). BORDERLINE unanswerable annotation contradicted by explicit best-system WER results; supported answer accepted.
- **R144** `pdf/1912.00667/43f074bacabd0a355b4e0f91a1afd538c0a6244f` — How is the keyword specific expectation elicited from the crowd? (old;adequate;evidence complete). BORDERLINE reference describes discovery instead of expectation; crowd-label elicitation correctly follows source.
- **R175** `pdf/1802.06024/bfc2dc913e7b78f3bd45e5449d71383d0aa4a890` — What are the components of the general knowledge learning engine? (new;partial;evidence complete). RL/prediction-model decomposition supported but omits Knowledge Store components requested by concrete reference; alternate scope borderline.
- **R192** `pdf/1802.00396/003d6f9722ddc2ee13e879fefafc315fb8e87cb9` — What does a node in the network approach repesent? (old;adequate;evidence complete). BORDERLINE all-unanswerable label conflicts with network description of states as vertices; supported semantic answer.
- **R203** `pdf/1911.07555/c8541ff10c4e0c8e9eb37d9d7ea408d1914019a9` — Which datasets are employed for South African languages LID? (new;adequate;evidence complete). Four gold datasets covered; WiLI cautiously described as mentioned relevant data, not necessarily experimental use; BORDERLINE scope.
- **R213** `pdf/1608.01084/1f07e837574519f2b696f3d6fa3230af0b931e5d` — Did they only experiment with one language pair? (old;refused;evidence complete). Evaluation/training settings all explicitly Chinese-English, supporting one-pair answer; exclusivity inference BORDERLINE.
- **R235** `pdf/1802.00396/003d6f9722ddc2ee13e879fefafc315fb8e87cb9` — What does a node in the network approach repesent? (new;adequate;evidence complete). BORDERLINE unanswerable annotation contradicted by explicit state-as-network-vertex description.
- **R270** `pdf/1702.03856/72755c2d79210857cfff60bfbcb55f83c71ada51` — what is the size of the speech corpus? (old;partial;evidence complete). Correct duration but omits call count/reference sizes; completeness borderline.
- **R297** `pdf/1604.00727/7705dd04acedaefee30d8b2c9978537afb2040dc` — What word level and character level model baselines are used? (new;partial;evidence partial). Character/word comparisons correct but omits MemNN baseline; baseline-role interpretation borderline and gold None conflicts.
- **R310** `docx/1604.00727/784ce5a983c5f2cc95a2c60ce66f2a8a50f3636f` — Do the authors also try the model on other datasets? (new;refused;evidence complete). Complete evaluation section describes only SimpleQuestions with FB 2 M/FB 5 M settings; reasonable no answer supported, exclusivity inference BORDERLINE.
- **R316** `pdf/1909.09587/55569d0a4586d20c01268a80a7e31a17a18198e2` — what does the model learn in zero-shot setting? (new;wrong;evidence complete). BORDERLINE turns investigated language-independent pattern-matching hypothesis into established conclusion; conclusion says token matching insufficient. Reference itself answers training method instead.
- **R364** `pdf/1910.05603/ceb4bac1f6c506b5dab37607354530faee02ccac` — What is the performance reported for the best models in the VLSP 2018 and VLSP 2019 challenges? (new;adequate;evidence complete). BORDERLINE all-unanswerable annotation conflicts with explicit best WER 4.85/15.09 figures.
- **R388** `pdf/1710.03348/beac555c4aea76c88f19db7cc901fa638765c250` — What useful information does attention capture? (new;wrong;evidence complete). Adds syntactic/morphological-attention attribution based on encoder related work, unsupported for attention itself; core-only alternate grade adequate is BORDERLINE.
- **R389** `pdf/1904.01548/7d2f812cb345bb3ab91eb8cbbdeefd4b58f65569` — Which two pairs of ERPs from the literature benefit from joint training? (old;wrong;evidence partial). Lists seven novel pair links instead of two literature-established pairs; reference annotation itself misidentifies target data, BORDERLINE.
- **R402** `pdf/1705.04153/04bde1d2b445f971e97bb46ade2d0290981c7a32` — What is the meta knowledge specifically? (new;partial;evidence partial). BORDERLINE all-unanswerable annotation; repeats generic shared metaknowledge without explaining its specific content.
- **R461** `pdf/1912.13337/e97186c51d4af490dba6faaf833d269c8256426c` — Are the automatically constructed datasets subject to quality control? (old;refused;evidence complete). BORDERLINE artifact-control methodology explicitly supplied despite negative reference; partial qualification about scale possible, pure refusal misses supported yes.
- **R479** `pdf/1909.09587/55569d0a4586d20c01268a80a7e31a17a18198e2` — what does the model learn in zero-shot setting? (old;wrong;evidence partial). Turns explicitly posed pattern-matching hypothesis into established finding; reference answers a different training-method question, BORDERLINE.
- **R490** `pdf/1910.10781/0810b43404686ddfe4ca84783477ae300fdd2ea4` — On top of BERT does the RNN layer work better or the transformer layer? (new;adequate;evidence complete). Correct full dataset-wise RoBERT/ToBERT comparison; BORDERLINE false introductory no-direct-comparison caveat separately audited.
- **R522** `pdf/1603.01514/6568a31241167f618ef5ede939053feaa2fb0d7e` — Do they add one latent variable for each language pair in their Bayesian model? (new;adequate;evidence complete). BORDERLINE negative gold conflict; per-aligned-argument CLVs and predicate-specific inventories support no to exactly one-per-language-pair.
- **R531** `pdf/1810.04428/2c6b50877133a499502feb79a682f4023ddab63e` — what language does this paper focus on? (new;refused;evidence partial). English/Simple-English resource discussion present but target corpus-language section missing; refusal ignores useful clue, absence wording borderline.
- **R535** `docx/1603.01514/6568a31241167f618ef5ede939053feaa2fb0d7e` — Do they add one latent variable for each language pair in their Bayesian model? (old;adequate;evidence complete). BORDERLINE gold conflict; multilingual aligned-argument CLVs support qualified no rather than one per pair; symbolic N/M preserve source placeholders.
- **R545** `pdf/1710.07960/0ba3ea93eef5660a79ea3c26c6a270eac32dfa4c` — Did they use a crowdsourcing platform for annotations? (new;wrong;evidence absent). BORDERLINE categorical did-not-use-crowdsourcing assertion unsupported by merely no mention; gold false/mixed does not prove source support.
- **R546** `pdf/1904.01548/7d2f812cb345bb3ab91eb8cbbdeefd4b58f65569` — Which two pairs of ERPs from the literature benefit from joint training? (new;wrong;evidence partial). Two true jointly benefiting links selected but not identified as the two literature-established pairs; missing discriminator and inconsistent reference flagged BORDERLINE.

All 22 mixed-answerability case units per arm and other source/reference disagreements are also preserved in borderline.jsonl. Examples include negative annotations versus explicit artifact controls, one-variable-per-language-pair wording versus aligned-argument CLVs, corpus-language exclusivity, acronym-only identifiers, broad versus specific inflection/metaknowledge questions, missing table/formula placeholders, and references that answer a different question. Do not treat these as independent human-validated labels. No held-out cases were opened to resolve them.

The combined new defaults are more useful on this dev sample, but unsafe transitions and remaining unsupported answers mean reliability is not solved. The clearest next diagnostic targets are mistaken attribution to related work, list completeness, and refusal despite available tables/figures. Evidence gaps still dominate the remaining unsuccessful new-dev answers(57 cases). Keep the held-out set untouched while addressing these dev failures.

## Saved artifacts

- sample.json / sample-manifest.json / sample-audit.json: frozen case IDs, references, strata and overlap checks.
- preparations.jsonl: every actual system/user prompt, retrieved chunks, assembled passages, query/filter traces and budget estimates.
- results.jsonl: every successful answer and failed attempt with provider metadata, usage, wire prompts and timings.
- blind-review.jsonl / blind-contexts.jsonl / blind-judgments.jsonl / grading-freeze.json: shuffled review inputs and frozen blind grades.
- judgments.jsonl: decoded grades, evidence status, source excerpts, reference alternatives and reasons.
- paired.jsonl / changed-cases.jsonl: all comparisons and every category transition.
- absence-claims.jsonl / refused-to-answered-audit.jsonl / refusal-with-complete-evidence.jsonl: detailed reliability audits.
- gate-rejections.jsonl / borderline.jsonl / summary.json: gate cases, disputed judgments and machine-readable totals.
- prompt-examples/old.json / new.json: exact real example prompts plus settings for each arm.
- validation.json / implementation-snapshot/ / implementation-manifest.json: implementation checks and frozen source revision.

