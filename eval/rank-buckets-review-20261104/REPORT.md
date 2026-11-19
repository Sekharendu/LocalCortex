# Where complete reference coverage first appears: saved-data review

No new retrieval, generation, inference, ingestion or application changes. This combines saved rankings with previously inspected cases; the bucket calculation and synthesis are new offline summaries of existing records.

## All 119 cases

For each valid reference alternative, take the largest first-hit rank among its required quotes; choose the earliest complete alternative. These are raw top 50 ranking cutoffs, not generated-answer quality or validated evidence-paragraph coverage.

| Earliest complete reference-quote coverage | Dense | Hybrid |
|---|---:|---:|
| 1-5 | 62 | 62 |
| 6-15 | 28 | 30 |
| 16-50 | 18 | 18 |
| not-within 50 | 11 | 9 |

In hybrid,57 cases are not complete in the first 5:30 become complete by 15,18 more by 50,and 9 do not complete within 50. Two of the 9 are existing relevance-gate rejections; the other 7 lack a complete mapped quote set in the 50 results. Never means not within the saved 50, not absent from the paper or unanswerable.

##15 previously inspected cases:10 from ranks 6–15 and 5 from 16–50

Primary visible patterns:5 fragmentation/list coverage,5 topic statements above specific facts,4 wording/task-link mismatch,1 clear literal-metric limitation. Labels overlap and are hypotheses about what a fix should address, not proof of the neural ranker cause. This purposeful sample does not estimate how common each cause is in all 119.

### 1. What datasets did they use for evaluation?

Case: pdf/1910.10781/12c50dea84f9a8845795fa8b8c1679328bd66246; complete quote coverage at rank 10.

**Observed:** Three evaluation datasets appear in different chunks; the full Fisher Phase 1 name is on a continued bullet list. The first result discusses ASR training and dataset construction, a related but different role.

**Candidate fix to test:** Preserve dataset-list continuations; distinguish evaluation data from ASR training data.

**Caveat:** The previous five-chunk answer named all three datasets without reproducing the full Phase 1 phrase; literal quote completion can be conservative.

**First result:**

> low 4.5 as dissatisfied. Quantization of ratings also helped us to create a balanced dataset. This dataset contains 4331 calls and we split them into 3 sets for our experiments: 2866 calls for training, 362 calls for validation and, finally, 1103 calls for testing. We obtained the transcripts by employing an ASR sys- tem. The ASR system uses TDNN-LSTM acoustic model trained on Fisher and Switchboard datasets with lattice-free maximum mutual information criterion [19]. The word er-

**The chunk completing the reference:**

> ken transcripts (automatic via ASR). • 20 newsgroups for topic identification task, consisting of written text; • Fisher Phase 1 corpus for topic identification task, con- sisting of spoken transcripts (manual); 4.1. CSAT CSAT dataset consists of US English telephone speech from call centers. For each call in this dataset, customers partici- pated in that call gave a rating on his experience with agent. Originally, this dataset has labels rated on a scale 1-9 with 9 1401 182 180 147 26 4 30 127

### 2. In what cases is attention different from alignment?

Case: pdf/1710.03348/044f922604b4b3f42ae381419fd5cd5624fa0637; complete quote coverage at rank 16.

**Observed:** The top result already explains nouns versus verbs and captures information beyond alignment. The rank 16 quote describes attention distribution more generally.

**Candidate fix to test:** Repair semantic/evidence scoring before calling this a retrieval failure.

**Caveat:** Five- and 15-chunk answers were both judged correct earlier despite the selected long quote not appearing by 15.

**First result:**

> Our analysis shows that attention models tradi- tional alignment in some cases more closely while it captures information beyond alignment in oth- ers. For instance, attention agrees with traditional alignments to a high degree in the case of nouns. However, it captures other information rather than only the translational equivalent in the case of verbs. This paper makes the following contributions: 1) We provide a detailed comparison of attention in NMT and word alignment. 2) We show that

**The chunk completing the reference:**

> we look into the attention concentration. While most word alignments only involve one or a few words, attention can be distributed more freely. We measure the concentration of attention by computing the entropy of the attention distribu- tion: EAt(yt) = − |x| ∑ i=1 At(xi, yt) log(At(xi, yt)) (11) 5 Empirical Analysis of Attention Behaviour We conduct our analysis using the two different attention models described in Section 3. Our first attention model is the global model without input-

### 3. what challenges are identified?

Case: pdf/1702.03856/53aa07cc4cc4e7107789ae637dbda8c9f6c1e6aa; complete quote coverage at rank 8.

**Observed:** The first hit introduces challenges without enumerating them; separate subsection chunks describe wrong assignments, split words and low coverage at ranks 8,4,7.

**Candidate fix to test:** Keep the relevant subsection cluster or pack a coherent challenges section.

**Caveat:** A useful summary can be present before every exact subsection-heading quote.

**First result:**

> and test data. Although the utterance-level split is optimistic, it allows us to investigate how multiple speakers affect system performance. In either case, the oracle has about 38 k Spanish tokens to train on. 4 Analysis of challenges from UTD Our system relies on the pseudotext produced by ZRTools (the only freely available UTD system we are aware of), which presents several challenges for MT. We used the default ZRTools parameters, and it might be possible to tune them to our task,

**The chunk completing the reference:**

> but we leave this to future work. 4.1 Assigning wrong words to a cluster Since UTD is unsupervised, the discovered clusters are noisy. Fig. 1 shows an example of an incorrect match between the acoustically similar “qu´e tal vas con” and “te trabajo y” in utterances B and C, leading to a common assignment to c 2. Such incon- sistencies in turn affect the translation distribution conditioned on c 2. Many of these errors are due to cross-speaker matches, which are known to be more challenging

### 4. What types of online harassment are studied?

Case: pdf/1909.13104/f0b2289cb887740f9255909018f400f028b1ef26; complete quote coverage at rank 12.

**Observed:** The target three-class list begins with tweets are divided, separated from the preceding dataset explanation. Earlier passages discuss the general topic and related-work categories.

**Candidate fix to test:** Preserve the dataset paragraph across the chunk boundary and retain it when increasing k.

**Caveat:** The old first 5 assembled-context replay already recovers it;15-hit assembly loses it under the unchanged cap.

**First result:**

> olent or hostile sexism [1], which undermines other types of online harassment. However, there is no much study focusing on different types online harassment alone attracting natural language processing techniques. In this paper we present our work, which is a part of the SociaL Media And Harassment Competition of the ECML PKDD 2019 Conference. The topic of the competition is the classification of different types of harassment and it is

**The chunk completing the reference:**

> tweets are divided into three sub-categories which are indirect harassment, sexual and physical harassment. We can see in Table 1 the class distribution of our dataset. One important issue here is that the categories of indirect and physical

### 5. Which real-world datasets are used?

Case: pdf/1912.00667/3941401a182a3d6234894a5c8a75d48c6116c45c; complete quote coverage at rank 38.

**Observed:** The two event categories are split across adjacent chunks 47 and 48. Rank 1 contains PoliticianDeath; its preceding chunk 47 contains CyberAttack but ranks 38.

**Candidate fix to test:** Prioritize the adjacent paragraph continuation instead of independently ranking its halves.

**Caveat:** The 15-raw-chunk answer already named both datasets using other mentions; rank 38 is strict full-quote coverage, not proof the answer was unavailable until 38.

**First result:**

> death of politicians (PoliticianDeath). These event cate- gories are chosen as they are representative of important event types that are of interest to many governments and companies. The need to create our own dataset was mo- tivated by the lack of public datasets for event detection on microposts. The few available datasets do not suit our requirements. For example, the publicly available Events- 2012 Twitter dataset (McMinn, Moshfeghi, and Jose 2013)

**The chunk completing the reference:**

> compare to existing keyword expansion methods? • Q 3: How effective is our approach using crowdsourcing at obtaining new keywords compared with an approach labelling microposts for model training under the same cost? • Q 4: How much benefit does our unified probabilistic model bring compared to methods that do not take crowd reliability into account? Experimental Setup Datasets. We perform our experiments with two predeter- mined event categories: cyber security (CyberAttack) and

### 6. How do their models decide how much improtance to give to the output words?

Case: pdf/1909.00326/93beae291b455e5d3ecea6ac73b83632a3ae7ec7; complete quote coverage at rank 6.

**Observed:** The question says importance of output words; the mechanism passage discusses importance of input words using contributions, aggregation and softmax. The first hit is background about input-output interpretation.

**Candidate fix to test:** Test intent-preserving query variants and mechanism-oriented passages; flag the input/output wording mismatch.

**Caveat:** Question/reference wording is imperfect, so do not infer one latent model cause.

**First result:**

> representations may depend on the model imple- mentation, which potentially limit the applicabil- ity of these methods to a broader range of model architectures. Accordingly, we focus on under- standing the input-output behaviors, and validate on different architectures to demonstrate the uni- versality of our findings. Concerning interpreting the input-output behav- ior, previous work generally treats Seq 2 Seq mod- els as black-boxes (Li et al., 2016; Alvarez-Melis

**The chunk completing the reference:**

> M × N , where N is the output sentence length. Given the contribution matrix, we can obtain the word importance of each input word to the entire output sentence. To this end, for each input word, we first aggregate its contribution values to all out- put words by the sum operation, and then normal- ize all sums through the Softmax function. Fig- ure 1 illustrates an example of the calculated word importance and the contribution matrix, where an English sentence is translated into a French sen-

### 7. Which data do they use as a starting point for the dialogue dataset?

Case: pdf/1903.03530/2c85865a65acd429508f50b5e4db9674813d67f2; complete quote coverage at rank 26.

**Observed:** Starting point and dialogue dataset match the seed-data analysis paragraph strongly. The source passage instead says nurse-initiated telephone recordings for heart-failure patients.

**Candidate fix to test:** Distinguish data origin from seed-sample size; test source/corpus-oriented query variants.

**Caveat:** The source passage is understandable and has a Data Preparation heading; it is not simply absent or garbled.

**First result:**

> telehealth nurses. 3.2 Linguistic Characterization on Seed Data To analyze the linguistic structure of the inquiry- response pairs in the entire 41-hour dataset, we randomly sampled a seed dataset consisting of 1,200 turns and manually categorized them to different types, which are summarized in Ta- ble 1 along with the corresponding occurrence fre- quency statistics. Note that each given utterance could be categorized to more than one type. We elaborate on each utterance type below.

**The chunk completing the reference:**

> sion from human-machine interviews (Al Hanai et al., 2018). However, few studies have examined human-human spoken conversations in healthcare settings. 3 Real-World Data Analysis 3.1 Data Preparation We used recordings of nurse-initiated telephone conversations for congestive heart failure patients undergoing telemonitoring, post-discharge from the hospital. The clinical data was acquired by the Health Management Unit at Changi General Hospital. This research study was approved by

### 8. how large is the vocabulary?

Case: pdf/1908.04042/b4f881331b975e6e4cab1868267211ed729d782d; complete quote coverage at rank 28.

**Observed:** The question says vocabulary size; the answer says 33,663 distinct review keywords. Earlier passages repeat vocabulary while discussing a vocabulary mismatch, not its size.

**Candidate fix to test:** Test vocabulary/lexicon/keyword terminology and keep the count with its dataset description.

**Caveat:** The answer chunk starts as a sentence continuation; wording and context are overlapping issues.

**First result:**

> vocabulary of users (e.g., when searching and reviewing e-books) is an essential task [22]. Problem and aim of this work. Annotating e-books with suitable tags is, however, a complex task as users’ vocabulary may differ from the one of editors. Such a vocabulary mismatch yet hinders effective organization and retrieval [21] of e-books. For example, while editors mostly annotate e-books with descriptive tags that reflect the book’s content, Amazon users often search for parts of

**The chunk completing the reference:**

> e-books (publishers: Kiwi, Rowohlt, Fischer, and Droemer), which leads to 33,663 distinct review keywords and on average 30 keyword assignments per e-book. 2.2 Tag Recommendation Approaches We implement three types of tag recommendation approaches, i.e., (i) popularity-based, (ii) similarity-based (i.e., using content infor- mation), and (iii) hybrid approaches. Due to the lack of personalized tags (i.e., we do not know which user has assigned a tag), we do not

### 9. What argument components do the ML methods aim to identify?

Case: pdf/1601.02403/eac9dae3492e17bc49c842fb566f464ff18c049b; complete quote coverage at rank 6.

**Observed:** The first hit says MLmethods identify argument components but does not name them. The answer is in the definition of the modified Toulmin model in a different section.

**Candidate fix to test:** Connect task descriptions to model-definition evidence; avoid preferring a question restatement.

**Caveat:** The answer chunk itself explicitly lists all five components.

**First result:**

> of our approach, we train the system on five domains and test on the remaining one for all six domains (which we report as cross-domain validation). 5.1 Identification of argument components In the following experiment, we focus on automatic identification of arguments in the discourse. Our approach is based on supervised and semi-supervised machine learning methods on the gold data Toulmin dataset introduced in section 4.4.

**The chunk completing the reference:**

> removing backing (would be only considered “weaker”). 4.4.3 Model definition. We call the model as a modified Toulmin’s model. It contains five argument components, namely claim, premise, backing, rebuttal, and refutation. When annotating a document, any arbitrary token span can be labeled with an argument component; the components do not overlap. The spans are not known in advance and the annotator thus chooses the span and the component type at the same time. All

### 10. which datasets did they experiment with?

Case: docx/1606.03676/3ddff6b707767c3dd54d7104fe88b628765cae58; complete quote coverage at rank 7.

**Observed:** The first result reports performance on 16 datasets without naming the collection. The Corpora paragraph names Universal Dependencies and treebanks.

**Candidate fix to test:** Prefer experimental-dataset statements over results summaries for dataset questions.

**Caveat:** Dataset versus corpora/treebanks wording may also matter; the needed paragraph is already coherent.

**First result:**

> These results show that Plank et al.'s (2016) bi-LSTM performs extremely well, surpassed by MarMoT on only 3 out of 16 datasets (Czech, French and Italian), and by MElt only once (Indonesian).

**The chunk completing the reference:**

> # Corpora We carried out our experiments on the Universal Dependencies v 1.2 treebanks BIBREF 21 , hereafter UD 1.2, from which morphosyntactically annotated corpora can be trivially extracted. All UD 1.2 corpora use a common tag set, the 17 universal PoS tags, which is an extension of the tagset proposed by BIBREF 43 .

### 11. What baseline model is used?

Case: docx/1703.10344/2ee715c7c6289669f11a79743a6b2b696073805d; complete quote coverage at rank 6.

**Observed:** Four baseline definitions span distant sections; B 1 is rank 4, B 2 rank 6, and S 1/S 2 rank 3. The first result merely announces comparison with baselines.

**Candidate fix to test:** Collect complete baseline definitions and join B 1/B 2 adjacent passages before dropping one at a cutoff.

**Caveat:** INLINEFORM placeholders are a separate readability limitation, not evidence that ranking caused their creation.

**First result:**

> The following results measure the effectiveness of our approach in three main aspects: (i) overall performance of INLINEFORM 0 and comparison to baselines, (ii) robustness across the years, and (iii) optimal model for the AEP placement task.

**The chunk completing the reference:**

> B 2. The second baseline assigns the value relevant to a pair INLINEFORM 0 , if and only if INLINEFORM 1 appears in the title of INLINEFORM 2 .

### 12. Which machine learning methods are used in experiments?

Case: docx/1601.02403/7697baf8d8d582c1f664a614f6332121061f87db; complete quote coverage at rank 28.

**Observed:** The first hit repeats experiment with various machine learning methods. The concrete We chose SVMhmm/Structural Support Vector Machines statement ranks 28.

**Candidate fix to test:** Prefer specific method-identification statements over generic experiment summaries; test structural method context.

**Caveat:** Terminology mismatch is secondary; the answer-bearing chunk is readable and explicit.

**First result:**

> From the computational perspective, we experiment on the annotated data using various machine learning methods in order to extract argument structure from documents. We propose several novel feature sets and identify configurations that run best in in-domain and cross-domain scenarios. To foster research in the community, we provide the annotated data as well as all the experimental software under free license.

**The chunk completing the reference:**

> Table TABREF 114 shows the distribution of the classes in the gold data Toulmin, where the labeling was already mapped to the sentences. The little presence of rebuttal and refutation (4 classes account only for 3.4% of the data) makes this dataset very unbalanced. We chose SVMhmm BIBREF 111 implementation of Structural Support Vector Machines for sequence labeling. Each sentence ( INLINEFORM 0 ) is represented as a vector of real-valued features. We defined the following feature sets:

### 13. Which dataset do they train their models on?

Case: docx/1605.07333/30eacb4595014c9c0e5ee9669103d003cfdfe1e5; complete quote coverage at rank 15.

**Observed:** The first hit is about training models, learning rates and epochs. The preceding Experiments and Results chunk identifies SemEval 2010 Task 8 and train/test sizes, but ranks 15.

**Candidate fix to test:** Retain the dataset paragraph next to training details; distinguish data identity from optimization settings.

**Caveat:** Existing 5-hit neighbour expansion already recovers the strict quote.

**First result:**

> RNN and CNN models were implemented with theano BIBREF 12 , BIBREF 13 . For all our models, we use L 2 regularization with a weight of 0.0001. For CNN training, we use mini batches of 25 training examples while we perform stochastic gradient descent for the RNN. The initial learning rates are 0.2 for the CNN and 0.01 for the RNN. We train the models for 10 (CNN) and 50 (RNN) epochs without early stopping. As activation function, we apply tanh for the CNN and capped ReLU for the RNN

**The chunk completing the reference:**

> # Experiments and Results We used the relation classification dataset of the SemEval 2010 task 8 BIBREF 8 . It consists of sentences which have been manually labeled with 19 relations (9 directed relations and one artificial class Other). 8,000 sentences have been distributed as training set and 2,717 sentences served as test set. For evaluation, we applied the official scoring script and report the macro F 1 score which also served as the official result of the shared task.

### 14. Why are prior knowledge distillation techniques models are ineffective in producing student models with vocabularies different from the original teacher models?  

Case: pdf/1909.11687/d087539e6a38c42f0a521ff2173ef42c0733878e; complete quote coverage at rank 15.

**Observed:** The first hit repeats that prior distillation cannot change vocabulary. The because explanation about shared vocabulary/output space is embedded after parameter-count text at rank 15.

**Candidate fix to test:** Keep the full explanatory paragraph and prefer mechanism evidence for why questions.

**Caveat:** The earlier reranker improved this particular explanation, although it worsened the larger test overall.

**First result:**

> number of scenarios, especially on mobile and edge devices. In particular, the input word embedding matrix accounts for a significant proportion of the model’s memory footprint, due to the large input vocabulary and embedding dimensions. Knowledge distillation techniques have had success at compressing large neural network models, but they are ineffective at yielding student models with vocabu- laries different from the original teacher models. We introduce a novel knowledge

**The chunk completing the reference:**

> of all model parameters. For instance, the embedding table of the BERTBASE model, comprising over 30 K WordPiece tokens (Wu et al., 2016 b), accounts for over 21% of the model size. While there has been existing work on reducing NLP model vocabulary sizes (Sennrich et al., 2016), distillation techniques cannot utilize these, since they require the student and teacher models to share the same vocabulary and output space. This profoundly limits their potential to further reduce model sizes. 1

### 15. Which parallel corpora are used?

Case: docx/1603.01514/747b847d687f703cc20a87877c5b138f26ff137d; complete quote coverage at rank 11.

**Observed:** The first hit discusses the usefulness of parallel corpora. The Data paragraph names CoNLL 2009 and Europarl with language pairs at rank 11.

**Candidate fix to test:** Prefer the experimental-data paragraph for which-corpus questions; avoid thematic discussion taking all slots.

**Caveat:** The Data paragraph is intact, headed and directly answer-bearing; this is not a missing-text case.

**First result:**

> . This difficulty in showing the usefulness of parallel corpora for SRI may be due to the current assumptions about role alignments, which mean that only a small percentage of roles are aligned. Further analyses reveals that annotating small amounts of data can easily outperform the performance gains obtained by adding large unlabeled dataset as well as adding parallel corpora.

**The chunk completing the reference:**

> # Data  Following titovcrosslingual, we run our experiments on the English (EN) and German (DE) sections of the CoNLL 2009 corpus BIBREF 13 , and EN-DE section of the Europarl corpus BIBREF 14 . We get about 40 k EN and 36 k DE sentences from the CoNLL 2009 training set, and about 1.5 M parallel EN-DE sentences from Europarl. For appropriate comparison, we keep the same setting as in BIBREF 6 for automatic parses and argument identification, which we briefly describe here

## What the history supports

1. Keep the tested 15-chunk direction as a candidate, but inspect the final prompt. Existing neighbour expansion already recovers the complete quote set for 4 of these 15 cases. Under the same 1200-token cap,15-hit assembly loses it for 2 of those 4. These are not new neighbour features to implement; priority and budget are the relevant things to test.
2. For list/paragraph cases, test preserving coherent paragraph/list continuations and all requested items, not merely independently ranked sentence fragments.
3. For thematic versus factual passages, test question-intent-aware selection and structural experiment/data/method context, without using gold answers to rewrite the query.
4. For terminology mismatches, test bounded meaning-preserving query variants. Do not conclude a new embedding model is necessary from these observations.
5. Repair gold evidence/semantic scoring: attention is already answered usefully at rank 1 in one example, and the event-dataset names can be answered before the exact long quote at 38. Late literal coverage is not automatically a failure.

The existing direct 5-versus 15 answer test found 20/40 versus 27/40 adequately complete supported answers under strict AI-assisted review, with 3 borderline 15 labels. It did not establish that changing only the production k setting fixes these cases. No fixes are applied in this report.
