# Human review: 20 random QASPER dev questions

App answer = production path (hybrid search, gate 0.63, top 15, assembled context, Cloudflare qwen3-30b), scoped to the question's own paper.
Grade each: **Correct / Partly correct / Wrong / Refused (wrongly) / Refused (fair)**.

---

## 1. Which Facebook pages did they look at?

Paper: 1611.02988 (pdf)

**QASPER gold answer(s):**

- Annotator 1: FoxNews, CNN, ESPN, New York Times, Time magazine, Huffington Post Weird News, The Guardian, Cartoon Network, Cooking Light, Home Cooking Adventure, Justin Bieber, Nickelodeon, Spongebob, Disney
- Annotator 2: FoxNews, CNN, ESPN, New York Times, Time magazine, Huffington Post Weird News, The Guardian, Cartoon Network, Cooking Light, Home Cooking Adventure, Justin Bieber, Nickelodeon, Spongebob, Disney.

**QASPER evidence (from the paper):**

> We collected Facebook posts and their corresponding reactions from public pages using the Facebook API, which we accessed via the Facebook-sdk python library. We chose different pages (and therefore domains and stances), aiming at a balanced and varied dataset, but we did so mainly based on intuition (see Section SECREF4 ) and with an eye to the nature of the datasets available for evaluation (see Section SECREF5 ). The choice of which pages to select posts from is far from trivial, and we believe this is actually an interesting aspect of our approach, as by using different Facebook pages one can intrinsically tackle the domain-adaptation problem (See Section SECREF6 for further discussion on this). The final collection of Facebook pages for the experiments described in this paper is as follows: FoxNews, CNN, ESPN, New York Times, Time magazine, Huffington Post Weird News, The Guardian, Cartoon Network, Cooking Light, Home Cooking Adventure, Justin Bieber, Nickelodeon, Spongebob, Disney.

**Labelled answer chunk(s) in our index:** 13, 14

```text
Section 5). The choice of which pages to select posts from is far from trivial, and we believe this is
actually an interesting aspect of our approach, as by using different Facebook pages one can intrinsi-
cally tackle the domain-adaptation problem (See Section 6 for further discussion on this). The final
collection of Facebook pages for the experiments described in this paper is as follows: FoxNews,
CNN, ESPN, New York Times, Time magazine, Huffington Post Weird News, The
```

```text
Guardian, Cartoon Network, Cooking Light, Home Cooking Adventure, Justin
Bieber, Nickelodeon, Spongebob, Disney.
[
{
"created_time": "2016-06-19T01:40:00+0000",
"message": "Walt Disney World representatives said
they plan to put up fencing and signs at all resorts
and waterways.",
"reactions": [5073, 4483, 60, 22, 54, 284, 170, 0]
}
],
[
{
"created_time": "2016-06-19T01:00:00+0000",
"message": "Charlene and Joseph Handrik face more
than 550 counts of animal cruelty.",
```

**App answer** (labelled chunk was among the retrieved hits; 4.2s):

> The Facebook pages they looked at include FoxNews, CNN, ESPN, New York Times, Time magazine, Huffington Post Weird News, The Guardian, Cartoon Network, Cooking Light, Home Cooking Adventure, Justin Bieber, Nickelodeon, Spongebob, and Disney.

**Verdict:** ________good

---

## 2. What embedding techniques are explored in the paper?

Paper: 1609.00559 (docx)

**QASPER gold answer(s):**

- Annotator 1: Skip–gram | CBOW
- Annotator 2: integrated vector-res | vector-faith | Skip–gram | CBOW

**QASPER evidence (from the paper):**

> muneeb2015evalutating trained both the Skip–gram and CBOW models over the PubMed Central Open Access (PMC) corpus of approximately 1.25 million articles. They evaluated the models on a subset of the UMNSRS data, removing word pairs that did not occur in their training corpus more than ten times. chiu2016how evaluated both the the Skip–gram and CBOW models over the PMC corpus and PubMed. They also evaluated the models on a subset of the UMNSRS ignoring those words that did not appear in their training corpus. Pakhomov2016corpus trained CBOW model over three different types of corpora: clinical (clinical notes from the Fairview Health System), biomedical (PMC corpus), and general English (Wikipedia). They evaluated their method using a subset of the UMNSRS restricting to single word term pairs and removing those not found within their training corpus. sajad2015domain trained the Skip–gram model over CUIs identified by MetaMap on the OHSUMED corpus, a collection of 348,566 biomedical research articles. They evaluated the method on the complete UMNSRS, MiniMayoSRS and the MayoSRS datasets; any subset information about the dataset was not explicitly stated therefore we believe a direct comparison may be possible.

> FLOAT SELECTED: Table 4: Comparison with Previous Work

> Table TABREF31 shows a comparison to the top correlation scores reported by each of these works on the respective datasets (or subsets) they evaluated their methods on. N refers to the number of term pairs in the dataset the authors report they evaluated their method. The table also includes our top scoring results: the integrated vector-res and vector-faith. The results show that integrating semantic similarity measures into second–order co–occurrence vectors obtains a higher or on–par correlation with human judgments as the previous works reported results with the exception of the UMNSRS rel dataset. The results reported by Pakhomov2016corpus and chiu2016how obtain a higher correlation although the results can not be directly compared because both works used different subsets of the term pairs from the UMNSRS dataset.

**Labelled answer chunk(s) in our index:** 70, 71, 75

```text
muneeb2015evalutating trained both the Skip–gram and CBOW models over the PubMed Central Open Access (PMC) corpus of approximately 1.25 million articles. They evaluated the models on a subset of the UMNSRS data, removing word pairs that did not occur in their training corpus more than ten times. chiu2016how evaluated both the the Skip–gram and CBOW models over the PMC corpus and PubMed
```

```text
. They also evaluated the models on a subset of the UMNSRS ignoring those words that did not appear in their training corpus. Pakhomov2016corpus trained CBOW model over three different types of corpora: clinical (clinical notes from the Fairview Health System), biomedical (PMC corpus), and general English (Wikipedia). They evaluated their method using a subset of the UMNSRS restricting to single word term pairs and removing those not found within their training corpus
```

```text
Table TABREF31 shows a comparison to the top correlation scores reported by each of these works on the respective datasets (or subsets) they evaluated their methods on. N refers to the number of term pairs in the dataset the authors report they evaluated their method. The table also includes our top scoring results: the integrated vector-res and vector-faith
```

**App answer** (labelled chunk was NOT among the retrieved hits; 2.1s):

> The paper explores word embedding techniques such as word2vec, including the Skip-gram and CBOW approaches. It also discusses integrating semantic similarity measures into second-order co-occurrence vectors. Additionally, it mentions retrofitting vector methods that incorporate ontological information.

**Verdict:** ________

---

## 3. Which machine learning methods are used in experiments?

Paper: 1601.02403 (docx)

**QASPER gold answer(s):**

- Annotator 1: Structural Support Vector Machine
- Annotator 2: SVMhmm

**QASPER evidence (from the paper):**

> We chose SVMhmm BIBREF111 implementation of Structural Support Vector Machines for sequence labeling. Each sentence ( INLINEFORM0 ) is represented as a vector of real-valued features.

**Labelled answer chunk(s) in our index:** 245

```text
Table TABREF114 shows the distribution of the classes in the gold data Toulmin, where the labeling was already mapped to the sentences. The little presence of rebuttal and refutation (4 classes account only for 3.4% of the data) makes this dataset very unbalanced.
We chose SVMhmm BIBREF111 implementation of Structural Support Vector Machines for sequence labeling. Each sentence ( INLINEFORM0 ) is represented as a vector of real-valued features.
We defined the following feature sets:
```

**App answer** (labelled chunk was NOT among the retrieved hits; 1.5s):

> The article mentions the use of several machine learning methods in experiments, including multinomial Naive Bayes classifier, maximum entropy model, C4.5 decision classifier, convolution kernel methods, multi-class SVM, and CRFs (Conditional Random Fields). Additionally, the experiments involved supervised and semi-supervised machine learning methods on the gold data Toulmin dataset.

**Verdict:** ________no mention of these 2 ''

- Annotator 1: Structural Support Vector Machine
- Annotator 2: SVMhmm

---

## 4. what is the domain of the corpus?

Paper: 1702.03856 (docx)

**QASPER gold answer(s):**

- Annotator 1: (unanswerable per this annotator)
- Annotator 2: telephone calls

**QASPER evidence (from the paper):**

> Our simple system (§ SECREF2 ) builds on unsupervised speech processing BIBREF5 , BIBREF6 , BIBREF7 , and in particular on unsupervised term discovery (UTD), which creates hard clusters of repeated word-like units in raw speech BIBREF8 , BIBREF9 . The clusters do not account for all of the audio, but we can use them to simulate a partial, noisy transcription, or pseudotext, which we pair with translations to learn a bag-of-words translation model. We test our system on the CALLHOME Spanish-English speech translation corpus BIBREF10 , a noisy multi-speaker corpus of telephone calls in a variety of Spanish dialects (§ SECREF3 ). Using the Spanish speech as the source and English text translations as the target, we identify several challenges in the use of UTD, including low coverage of audio and difficulty in cross-speaker clustering (§ SECREF4 ). Despite these difficulties, we demonstrate that the system learns to translate some content words (§ SECREF5 ).

**Labelled answer chunk(s) in our index:** 10

```text
. We test our system on the CALLHOME Spanish-English speech translation corpus BIBREF10 , a noisy multi-speaker corpus of telephone calls in a variety of Spanish dialects (§ SECREF3 ). Using the Spanish speech as the source and English text translations as the target, we identify several challenges in the use of UTD, including low coverage of audio and difficulty in cross-speaker clustering (§ SECREF4 )
```

**App answer** (labelled chunk was among the retrieved hits; 0.8s):

> The domain of the corpus is telephone calls.

**Verdict:** ________

---

## 5. Which hyperparameters were varied in the experiments on the four tasks?

Paper: 1705.01265 (pdf)

**QASPER gold answer(s):**

- Annotator 1: number of clusters, seed value in clustering, selection of word vectors, window size and dimension of embedding
- Annotator 2: different number of clusters | different embeddings

**QASPER evidence (from the paper):**

> We cluster the embeddings with INLINEFORM0 -Means. The k-means clusters are initialized using “k-means++” as proposed in BIBREF9 , while the algorithm is run for 300 iterations. We try different values for INLINEFORM1 . For each INLINEFORM2 , we repeat the clustering experiment with different seed initialization for 10 times and we select the clustering result that minimizes the cluster inertia.

> FLOAT SELECTED: Table 1: Scores on F1-measure for named entities segmentation for the different word embeddings across different number of clusters. For each embedding type, we show its dimension and window size. For instance, glove40,w5 is 40-dimensional glove embeddings with window size 5.

> FLOAT SELECTED: Table 2: Results in terms of F1-score for named entities classification for the different word clusters across different number of clusters.

> FLOAT SELECTED: Table 3: MAEM scores (lower is better) for sentiment classification across different types of word embeddings and number of clusters.

> FLOAT SELECTED: Table 5: Earth Movers Distance for fine-grained sentiment quantification across different types of word embeddings and number of clusters. The score in brackets denotes the best performance achieved in the challenge.

> Tables TABREF6 and TABREF7 present the results for the different number of clusters across the three vector models used to induce the clusters. For all the experiments we keep the same parametrization for the learning algorithm and we present the performance of each run on the official test set.

> Note, also, that using the clusters produced by the out-of-domain embeddings trained on wikipedia that were released as part of BIBREF8 performs surprisingly well. One might have expected their addition to hurt the performance. However, their value probably stems from the sheer amount of data used for their training as well as the relatively simple type of words (like awesome, terrible) which are discriminative for this task. Lastly, note that in each of the settings, the best results are achieved when the number of clusters is within INLINEFORM0 as in the NER tasks. Comparing the performance across the different embeddings, one cannot claim that a particular embedding performs better. It is evident though that augmenting the feature space with feature derived using the proposed method, preferably with in-domain data, helps the classification performance and reduces MAE INLINEFORM1 .

**Labelled answer chunk(s) in our index:** 14, 15, 21, 25, 26, 35, 36, 37, 46

```text
we used the default parameters.
pus we collected, we use GloVe vectors trained on
Wikipedia articles in order to investigate the impact
of out-of-domain word-vectors.2
We cluster the embeddings with k-Means. The
k-means clusters are initialized using “k-means++”
as proposed in (Arthur and Vassilvitskii, 2007), while
the algorithm is run for 300 iterations. We try differ-
ent values for k ∈ {100, 250, 500, 1000, 2000}. For
each k, we repeat the clustering experiment with dif-
```

```text
ferent seed initialization for 10 times and we select the
clustering result that minimizes the cluster inertia.
3 Experimental Evaluation
We evaluate the proposed approach for augmenting
the feature space in four tasks: (i) NER segmenta-
tion, (ii) NER classification, (iii) fine-grained sen-
timent classification and (iv) fine-grained sentiment
quantification. The next sections present the evalua-
tion settings we used. For each of the tasks, we use
```

```text
number of clusters across the three vector models used
to induce the clusters. For all the experiments we keep
the same parametrization for the learning algorithm
and we present the performance of each run on the
official test set.
Regarding the segmentation task we notice that
adding word clusters as features improve the perfor-
mance of the best model up to 1.1 F-score points while
it boosts performance in the majority of cases. In only
one case, for glove40 vectors, there is a drop across
```

```text
mentation for the different word embeddings across
different number of clusters. For each embedding
type, we show its dimension and window size. For
instance, glove40,w5 is 40-dimensional glove embed-
dings with window size 5.
100 250 500 1000 2000
No clusters 40.10
skipgram40,w5 40.07 39.29 39.98 40.15 40.70
skipgram100,w5 40.03 39.63 39.42 40.25 40.06
skipgram100,w10 41.19 39.92 40.04 40.29 38.54
cbow40,w5 40.20 40.63 39.71 40.00 39.32
cbow100,w5 40.53 40.21 39.22 40.61 40.15
```

```text
cbow100,w5 40.53 40.21 39.22 40.61 40.15
cbow100,w10 40.02 40.80 39.55 40.40 39.71
glove40,w5 39.09 40.06 38.73 39.35 38.23
glove100,w5 39.63 39.40 39.23 39.20 41.42
glove100,w10 39.55 39.98 39.99 39.53 40.67
glove50,wiki 40.40 41.09 40.82 40.84 41.24
glove100,wiki 39.52 39.78 41.04 41.73 40.39
Table 2: Results in terms of F1-score for named enti-
ties classification for the different word clusters across
different number of clusters.
one for the non-entity type and two classes for each
```

```text
glove50,wiki 0.712 0.678 0.710 0.711 0.694
glove100,wiki 0.699 0.701 0.699 0.689 0.714
Table 3: MAEM scores (lower is better) for sentiment
classification across different types of word embed-
dings and number of clusters.
sentiment classification task.
Note, also, that using the clusters produced by the
out-of-domain embeddings trained on wikipedia that
were released as part of (Pennington et al., 2014) per-
forms surprisingly well. One might have expected
```

```text
forms surprisingly well. One might have expected
their addition to hurt the performance. However, their
value probably stems from the sheer amount of data
used for their training as well as the relatively sim-
ple type of words (like awesome, terrible) which are
discriminative for this task. Lastly, note that in each
of the settings, the best results are achieved when the
number of clusters is within {500, 1000, 2000} as in
the NER tasks. Comparing the performance across the
```

```text
different embeddings, one cannot claim that a particu-
lar embedding performs better. It is evident though
that augmenting the feature space with feature de-
rived using the proposed method, preferably with in-
domain data, helps the classification performance and
reduces MAEM .
From the results of Table 3 it is clear that the addi-
tion of the cluster membership features improves the
sentiment classification performance. To better un-
derstand though why these clusters help, we manu-
```

```text
cbow100,w10 0.226 0.226 0.231 0.224 0.224
glove40,w5 0.222 0.222 0.220 0.221 0.222
glove100,w5 0.223 0.221 0.221 0.220 0.221
glove100,w10 0.220 0.222 0.224 0.224 0.223
glove50,wiki 0.222 0.221 0.219 0.220 0.221
glove100,wiki 0.221 0.221 0.222 0.220 0.222
Table 5: Earth Movers Distance for fine-grained senti-
ment quantification across different types of word em-
beddings and number of clusters. The score in brack-
ets denotes the best performance achieved in the chal-
lenge.
```

**App answer** (labelled chunk was among the retrieved hits; 1.3s):

> The hyperparameters varied in the experiments on the four tasks included the number of clusters (k ∈ {100, 250, 500, 1000, 2000}) and the type of word embeddings used.

**Verdict:** ________no mentioed of any anootators,seems to be a poor chunk retrived

---

## 6. What data do they look at?

Paper: 1608.01884 (docx)

**QASPER gold answer(s):**

- Annotator 1: WSC collection

**QASPER evidence (from the paper):**

> Care must be taken to avoid relying on, or seeming to rely on, objectionable stereotypes about men and women. One mechanism that can sometimes be used is to include a potentially problematic sentence in both directions. For instance, schema 23 from the WSC collection can be translated into both “The girls were bullying the boys so we [punished/rescued] them” and “The boys were bullying the girls, so we [punished/rescued] them,” thus avoiding any presupposition of whether girls are more likely to bully boys or vice versa.

**Labelled answer chunk(s) in our index:** 19

```text
. For instance, schema 23 from the WSC collection can be translated into both “The girls were bullying the boys so we [punished/rescued] them” and “The boys were bullying the girls, so we [punished/rescued] them,” thus avoiding any presupposition of whether girls are more likely to bully boys or vice versa.
```

**App answer** (gate refused, no context sent; 0.5s):

> The provided context is insufficient to answer this question.

**Verdict:** ________ the current chunk was retrived but it didnot go to the llm,

---

## 7. Which datasets are employed for South African languages LID?

Paper: 1911.07555 (pdf)

**QASPER gold answer(s):**

- Annotator 1: DSL 2015 | DSL 2017 | JW300 parallel corpus  | NCHLT text corpora

**QASPER evidence (from the paper):**

> The focus of this section is on recently published datasets and LID research applicable to the South African context. An in depth survey of algorithms, features, datasets, shared tasks and evaluation methods may be found in BIBREF0.

> The datasets for the DSL 2015 & DSL 2017 shared tasks BIBREF1 are often used in LID benchmarks and also available on Kaggle . The DSL datasets, like other LID datasets, consists of text sentences labelled by language. The 2017 dataset, for example, contains 14 languages over 6 language groups with 18000 training samples and 1000 testing samples per language.

> The recently published JW300 parallel corpus BIBREF2 covers over 300 languages with around 100 thousand parallel sentences per language pair on average. In South Africa, a multilingual corpus of academic texts produced by university students with different mother tongues is being developed BIBREF3. The WiLI-2018 benchmark dataset BIBREF4 for monolingual written natural language identification includes around 1000 paragraphs of 235 languages. A possibly useful link can also be made BIBREF5 between Native Language Identification (NLI) (determining the native language of the author of a text) and Language Variety Identification (LVI) (classification of different varieties of a single language) which opens up more datasets. The Leipzig Corpora Collection BIBREF6, the Universal Declaration of Human Rights and Tatoeba are also often used sources of data.

> The NCHLT text corpora BIBREF7 is likely a good starting point for a shared LID task dataset for the South African languages BIBREF8. The NCHLT text corpora contains enough data to have 3500 training samples and 600 testing samples of 300+ character sentences per language. Researchers have recently started applying existing algorithms for tasks like neural machine translation in earnest to such South African language datasets BIBREF9.

**Labelled answer chunk(s) in our index:** 7, 8, 9, 10

```text
Table 1: Percentage of South Africans by First Language
Language (ISO 639) Percentage Language (ISO 639) Percentage
IsiZulu (zul) 23% isiNdebele (nbl) 2.1%
IsiXhosa (xho) 16% siSwati (ssw) 2.5%
Afrikaans (afr) 14% English (eng) 9.6%
Sepedi (nso) 9.1% Setswana (tsn) 8.0%
Sesotho (sot) 7.6%
Xitsonga (tso) 4.5% Tshivenda (ven) 2.4%
2 Related Works
The focus of this section is on recently published datasets and LID research applicable to the South
```

```text
African context. An in depth survey of algorithms, features, datasets, shared tasks and evaluation
methods may be found in [1].
The datasets for the DSL 2015 & DSL 2017 shared tasks [2] are often used in LID benchmarks and
also available on Kaggle 2. The DSL datasets, like other LID datasets, consists of text sentences
labelled by language. The 2017 dataset, for example, contains 14 languages over 6 language groups
with 18000 training samples and 1000 testing samples per language.
```

```text
The recently published JW300 parallel corpus [3] covers over 300 languages with around 100 thou-
sand parallel sentences per language pair on average. In South Africa, a multilingual corpus of
academic texts produced by university students with different mother tongues is being developed
[4]. The WiLI-2018 benchmark dataset [5] for monolingual written natural language identification
includes around 1000 paragraphs of 235 languages. A possibly useful link can also be made [6] be-
```

```text
tween Native Language Identification (NLI) (determining the native language of the author of a text)
and Language Variety Identification (LVI) (classification of different varieties of a single language)
which opens up more datasets. The Leipzig Corpora Collection [7], the Universal Declaration of
Human Rights 3 and Tatoeba 4 are also often used sources of data.
The NCHLT text corpora [8] is likely a good starting point for a shared LID task dataset for the
```

**App answer** (labelled chunk was among the retrieved hits; 2.4s):

> The datasets employed for South African languages LID include the Discriminating between Similar Languages (DSL) 2015 and 2017 shared tasks' datasets, as well as existing test sets from previous works on South African languages. Additionally, the NCHLT text corpora is mentioned as a possible starting point for a shared LID task dataset for the South African languages.

**Verdict:** ________JW300 parallel corpus is not  there isn the answer

---

## 8. Does the model have attention?

Paper: 1809.01541 (pdf)

**QASPER gold answer(s):**

- Annotator 1: Yes
- Annotator 2: Yes

**QASPER evidence (from the paper):**

> The system is an encoder-decoder on character sequences. It takes a lemma as input and generates a word form. The process is conditioned on the context of the lemma [...] The baseline treats the lemma, word form and MSD of the previous and following word as context in track 1. In track 2, the baseline only considers the word forms of the previous and next word. [...] The baseline system concatenates embeddings for context word forms, lemmas and MSDs into a context vector. The baseline then computes character embeddings for each character in the input lemma. Each of these is concatenated with a copy of the context vector. The resulting sequence of vectors is encoded using an LSTM encoder. Subsequently, an LSTM decoder generates the characters in the output word form using encoder states and an attention mechanism.

> The baseline provided by the shared task organisers is a seq2seq model with attention (similar to the winning system for reinflection in CoNLL–SIGMORPHON 2016, BIBREF1 ), which receives information about context through an embedding of the two words immediately adjacent to the target form. We use this baseline implementation as a starting point and achieve the best overall accuracy of 49.87 on Task 2 by introducing three augmentations to the provided baseline system: (1) We use an LSTM to encode the entire available context; (2) We employ a multi-task learning approach with the auxiliary objective of MSD prediction; and (3) We train the auxiliary component in a multilingual fashion, over sets of two to three languages.

**Labelled answer chunk(s) in our index:** 5, 6, 11

```text
The baseline provided by the shared task organ-
isers is a seq2seq model with attention (similar
to the winning system for reinflection in CoNLL–
SIGMORPHON 2016, Kann and Sch¨utze (2016)),
which receives information about context through
an embedding of the two words immediately adja-
cent to the target form. We use this baseline im-
plementation as a starting point and achieve the
best overall accuracy of 49.87 on Task 2 by intro-
ducing three augmentations to the provided base-
```

```text
ducing three augmentations to the provided base-
line system: (1) We use an LSTM to encode the
entire available context; (2) We employ a multi-
task learning approach with the auxiliary objective
of MSD prediction; and (3) We train the auxiliary
component in a multilingual fashion, over sets of
two to three languages.
In analysing the performance of our system, we
found that encoding the full context improves per-
formance considerably for all languages: 11.15
```

```text
The baseline system concatenates em-
beddings for context word forms, lem-
mas and MSDs into a context vector.
The baseline then computes character
embeddings for each character in the in-
put lemma. Each of these is concate-
nated with a copy of the context vector.
The resulting sequence of vectors is en-
coded using an LSTM encoder. Subse-
quently, an LSTM decoder generates the
characters in the output word form using
encoder states and an attention mecha-
nism.
```

**App answer** (labelled chunk was among the retrieved hits; 1.2s):

> Yes, the model has attention. The baseline system uses an attention mechanism in the LSTM decoder to generate the characters in the output word form using encoder states and an attention mechanism.

**Verdict:** ________ good

---

## 9. How do they deal with unknown distribution senses?

Paper: 1710.07960 (pdf)

**QASPER gold answer(s):**

- Annotator 1: The Näive-Bayes classifier is corrected so it is not biased to most frequent classes
- Annotator 2: Bayesian classifier has been modified, removing the bias towards frequent labels in the training data

**QASPER evidence (from the paper):**

> Monosemous relatives have been employed multiple times (see Section 2), but results remain unsatisfactory. The aim of my study is to explore the limitations of this technique by implementing and evaluating such a tool for Polish. Firstly, the method is expanded by waiving the requirement of monosemy and proposing several new sources of relatives. These previously unexplored sources are based on wordnet data and help gather many training cases from the corpus. Secondly, a well-known problem of uneven yet unknown distribution of word senses is alleviated by modifying a naïve Bayesian classifier. Thanks to this correction, the classifier is no longer biased towards senses that have more training data. Finally, a very large corpus (600 million documents), gathered from the web by a Polish search engine NEKST, is used to build models based on training corpora of different sizes. Those experiments show what amount of data is sufficient for such a task. The proposed solution is compared to baselines that use wordnet structure only, with no training corpora.

> The algorithm works as follows. First, a set of relatives is obtained for each sense of a target word using the Polish wordnet: plWordNet BIBREF18 . Some of the replacements may have multiple senses, however usually one of them covers most cases. Secondly, a set of context features is extracted from occurrences of relatives in the NEKST corpus. Finally, the aggregated feature values corresponding to target word senses are used to build a naïve Bayesian classifier adjusted to a situation of unknown a priori probabilities.

> Which could be rewritten as: INLINEFORM0

> The expression has been formulated as a product of two factors: INLINEFORM0 , independent from observed features and corresponding to empty word context, and INLINEFORM1 that depends on observed context. To weaken the influence of improper distribution of training cases, we omit INLINEFORM2 , so that when no context features are observed, every word sense is considered equally probable.

> In this paper the limitations and improvements of unsupervised word sense disambiguation have been investigated. The main problem – insufficient number and quality of replacements has been tackled by adding new rich sources of replacements. The quality of the models has indeed improved, especially thanks to replacements based on sense ordering in plWordNet. To deal with the problem of unknown sense distribution, the Bayesian classifier has been modified, removing the bias towards frequent labels in the training data. Finally, the experiments with very large corpus have shown the sufficient amount of training data for this task, which is only 6 million documents.

**Labelled answer chunk(s) in our index:** 6, 7, 21, 35, 36, 66, 67

```text
satisfactory. The aim of my study is to explore
the limitations of this technique by implementing
and evaluating such a tool for Polish. Firstly, the
method is expanded by waiving the requirement of
monosemy and proposing several new sources of
relatives. These previously unexplored sources are
based on wordnet data and help gather many train-
ing cases from the corpus. Secondly, a well-known
problem of uneven yet unknown distribution of word
senses is alleviated by modifying a naïve Bayesian
```

```text
classifier. Thanks to this correction, the classifier
is no longer biased towards senses that have more
training data. Finally, a very large corpus (600 mil-
lion documents), gathered from the web by a Pol-
arXiv:1710.07960v1 [cs.CL] 22 Oct 2017
```

```text
responding to target word senses are used to build
a naïve Bayesian classifier adjusted to a situation of
unknown a priori probabilities.
3.1 Relatives
In order to obtain training cases from unannotated
corpora, we aim to select relatives2 which are se-
mantically similar to a given sense of a target word.
An example of this process, concerning the word
j˛ezyk (tongue) in one of its meanings (human or
animal organ) is shown in Figure 1. This study
takes into account only synonyms, hypernyms and
```

```text
the target word sense. To bypass this problem, we
modify the Bayesian model in this study. The basic
classifier chooses the class that maximises the fol-
lowing probability:
P (Y |X) ∝ P (Y )
p∏
i=1
P (Xi|Y )
In the case of binary features, which represent the
occurrence of a certain word in context, we have
xi ∈ {0, 1} and:
P (Y |X = x) ∝
P (Y )
p∏
i=1
[
P (Xi = 1|Y )xi P (Xi = 0|Y )(1−xi)]
Which could be rewritten as:
P (Y |X = x) ∝
P (Y )
p∏
i=1
P (Xi = 0|Y )
︸ ︷︷ ︸
A(Y )
× ∏
i : xi=1
```

```text
p∏
i=1
P (Xi = 0|Y )
︸ ︷︷ ︸
A(Y )
× ∏
i : xi=1
P (Xi = 1|Y )
P (Xi = 0|Y )
︸ ︷︷ ︸
B(Y,x)
The expression has been formulated as a product
of two factors: A(Y ), independent from observed
features and corresponding to empty word context,
and B(Y, x) that depends on observed context. To
weaken the influence of improper distribution of
training cases, we omit A(Y ), so that when no con-
text features are observed, every word sense is con-
sidered equally probable.
```

```text
In this paper the limitations and improvements of
unsupervised word sense disambiguation have been
investigated. The main problem – insufficient num-
ber and quality of replacements has been tackled by
adding new rich sources of replacements. The qual-
ity of the models has indeed improved, especially
thanks to replacements based on sense ordering in
plWordNet. To deal with the problem of unknown
sense distribution, the Bayesian classifier has been
```

```text
modified, removing the bias towards frequent labels
in the training data. Finally, the experiments with
very large corpus have shown the sufficient amount
of training data for this task, which is only 6 million
documents.
Acknowledgements
This study was conducted at Institute of Computer
Science, Polish Academy of Sciences, and sup-
ported by a research fellowship within "Information
technologies: research and their interdisciplinary
applications" agreement number POKL.04.01.01-
```

**App answer** (labelled chunk was among the retrieved hits; 1.1s):

> They modify the Bayesian classifier to remove the bias towards frequent labels in the training data.

**Verdict:** ________

---

## 10. Where did the texts in the corpus come from?

Paper: 1806.05513 (pdf)

**QASPER gold answer(s):**

- Annotator 1: tweets from the past two years from domains like `sports', `politics', `entertainment'
- Annotator 2: twitter

**QASPER evidence (from the paper):**

> Python package twitterscraper is used to scrap tweets from twitter. 10,478 tweets from the past two years from domains like `sports', `politics', `entertainment' were extracted. Among those tweets, we manually removed the tweets which were written either in English or Hindi entirely. There were 4161 tweets written in English and 2774 written in Hindi. Finally, a total of 3543 English-Hindi code-mixed tweets were collected. Table 1 describes the number of tweets and words in each category.

**Labelled answer chunk(s) in our index:** 14, 15

```text
Figure 1: Example Annotations.
character and word level features. In the last section, we
conclude the paper followed by future work and references.
2. Corpus Creation and Annotation
In this section, we explain the techniques used in the cre-
ation and annotation of the corpus.
2.1. Data Collection
Python package twitterscraper1 is used to scrap tweets from
twitter. 10,478 tweets from the past two years from do-
mains like ‘sports’, ‘politics’, ‘entertainment’ were ex-
```

```text
tracted. Among those tweets, we manually removed the
tweets which were written either in English or Hindi en-
tirely. There were 4161 tweets written in English and 2774
written in Hindi. Finally, a total of 3543 English-Hindi
code-mixed tweets were collected. Table 1 describes the
number of tweets and words in each category.
Category #Tweets #Total Words
Humorous (H) 1755 26951
Non-humorous (N) 1698 21952
Table 1: Description of the corpus.
```

**App answer** (labelled chunk was among the retrieved hits; 1.6s):

> The texts in the corpus came from Twitter. Specifically, they were scraped from Twitter using the Python package twitterscraper, and included tweets from domains like 'sports', 'politics', and 'entertainment'.

**Verdict:** ________ excellent

---

## 11. What dataset do they use?

Paper: 1903.09722 (pdf)

**QASPER gold answer(s):**

- Annotator 1: German newscrawl distributed by WMT'18  | English newscrawl data | WMT'18 English-German (en-de) news translation task  | WMT'18 English-Turkish (en-tr) news task
- Annotator 2: German newscrawl | English newscrawl | WMT'18 English-German (en-de) news | WMT'18 English-Turkish (en-tr) news task | WMT'18 English-German (en-de) news translation task and we validate our findings on the WMT'18 English-Turkish (en-tr) news task

**QASPER evidence (from the paper):**

> We train language models on two languages: One model is estimated on the German newscrawl distributed by WMT'18 comprising 260M sentences or 6B tokens. Another model is trained on the English newscrawl data comprising 193M sentences or 5B tokens. We learn a joint Byte-Pair-Encoding (BPE; Sennrich et al., 2016) vocabulary of 37K types on the German and English newscrawl and train the language models with this vocabulary.

> We consider two benchmarks: Most experiments are run on the WMT'18 English-German (en-de) news translation task and we validate our findings on the WMT'18 English-Turkish (en-tr) news task. For WMT'18 English-German, the training corpus consists of all available bitext excluding the ParaCrawl corpus and we remove sentences longer than 250 tokens as well as sentence-pairs with a source/target length ratio exceeding 1.5. This results in 5.18M sentence pairs. We tokenize all data with the Moses tokenizer BIBREF8 and apply the BPE vocabulary learned on the monolingual corpora.

> For WMT'18 English-Turkish, we use all of the available bitext comprising 208K sentence-pairs without any filtering. We develop on newstest2017 and test on newstest2018. For en-tr we only experiment with adding representations to the encoder and therefore apply the language model vocabulary to the source side. For the target vocabulary we learn a BPE code with 32K merge operations on the Turkish side of the bitext. Both datasets are evaluated in terms of case-sensitive de-tokenized BLEU BIBREF9 , BIBREF10 .

> We consider the abstractive document summarization task comprising over 280K news articles paired with multi-sentence summaries. is a widely used dataset for abstractive text summarization. Following BIBREF11 , we report results on the non-anonymized version of rather than the entity-anonymized version BIBREF12 , BIBREF13 because the language model was trained on full text. Articles are truncated to 400 tokens BIBREF11 and we use a BPE vocabulary of 32K types BIBREF14 . We evaluate in terms of F1-Rouge, that is Rouge-1, Rouge-2 and Rouge-L BIBREF15 .

**Labelled answer chunk(s) in our index:** 12, 13, 14, 15, 16, 33

```text
3 Experimental setup
3.1 Datasets
Pre-training. We train language models on two
languages: One model is estimated on the Ger-
man newscrawl distributed by WMT’18 compris-
ing 260M sentences or 6B tokens. Another model
is trained on the English newscrawl data compris-
ing 193M sentences or 5B tokens. We learn a joint
Byte-Pair-Encoding (BPE; Sennrich et al., 2016)
vocabulary of 37K types on the German and En-
glish newscrawl and train the language models
with this vocabulary.
```

```text
with this vocabulary.
Machine translation. We consider two bench-
marks: Most experiments are run on the WMT’18
English-German (en-de) news translation task and
we validate our findings on the WMT’18 English-
Turkish (en-tr) news task. For WMT’18 English-
German, the training corpus consists of all avail-
able bitext excluding the ParaCrawl corpus and we
remove sentences longer than 250 tokens as well
as sentence-pairs with a source/target length ra-
```

```text
as sentence-pairs with a source/target length ra-
tio exceeding 1.5. This results in 5.18M sentence
pairs. We tokenize all data with the Moses tok-
enizer (Koehn et al., 2007) and apply the BPE vo-
cabulary learned on the monolingual corpora.
For WMT’18 English-Turkish, we use all of the
available bitext comprising 208K sentence-pairs
without any filtering. We develop on newstest2017
and test on newstest2018. For en-tr we only exper-
iment with adding representations to the encoder
```

```text
iment with adding representations to the encoder
and therefore apply the language model vocabu-
lary to the source side. For the target vocabulary
we learn a BPE code with 32K merge operations
on the Turkish side of the bitext. Both datasets are
evaluated in terms of case-sensitive de-tokenized
BLEU (Papineni et al., 2002; Post, 2018).2
Summarization. We consider the CNN-
DailyMail abstractive document summarization
task comprising over 280K news articles paired
```

```text
task comprising over 280K news articles paired
with multi-sentence summaries. CNN-DailyMail
is a widely used dataset for abstractive text
summarization. Following (See et al., 2017),
we report results on the non-anonymized
version of CNN-DailyMail rather than the
entity-anonymized version (Hermann et al., 2015;
Nallapati et al., 2016) because the language model
was trained on full text. Articles are truncated to
400 tokens (See et al., 2017) and we use a BPE
```

```text
better performance than a joint BPE code learned
on the bitext as is usual.
Next, we validate our findings on the WMT’18
English-Turkish task for which the bitext is truly
limited (208K sentence-pairs). We use the lan-
guage model vocab for the the English side of the
bitext and a BPE vocabulary learned on the Turk-
ish side. Table 2 shows that ELMo embeddings for
the encoder improve English-Turkish translation.
4.2 Abstractive summarization
Following See et al. (2017), we experiment on
```

**App answer** (labelled chunk was among the retrieved hits; 1.1s):

> They use the CNN-DailyMail dataset for abstractive text summarization.

**Verdict:** ________insufficient info int eh llm response

---

## 12. what are the topics pulled from Reddit?

Paper: 1609.00425 (docx)

**QASPER gold answer(s):**

- Annotator 1: politics, business, science, and AskReddit, and 1000 additional posts from the Reddit frontpage.
- Annotator 2: training data has posts from politics, business, science and other popular topics; the trained model is applied to millions of unannotated posts on all of Reddit

**QASPER evidence (from the paper):**

> Data collection. Subreddits are sub-communities on Reddit oriented around specific interests or topics, such as technology or politics. Sampling from Reddit as a whole would bias the model towards the most commonly discussed content. But by sampling posts from individual subreddits, we can control the kinds of posts we use to train our model. To collect a diverse training dataset, we have randomly sampled 1000 posts each from the subreddits politics, business, science, and AskReddit, and 1000 additional posts from the Reddit frontpage. All posts in our sample appeared between January 2007 and March 2015, and to control for length effects, contain between 300 and 400 characters. This results in a total training dataset of 5000 posts.

> We now apply our dogmatism classifier to a larger dataset of posts, examining how dogmatic language shapes the Reddit community. Concretely, we apply the BOW+LING model trained on the full Reddit dataset to millions of new unannotated posts, labeling these posts with a probability of dogmatism according to the classifier (0=non-dogmatic, 1=dogmatic). We then use these dogmatism annotations to address four research questions.

**Labelled answer chunk(s) in our index:** 15, 51

```text
. To collect a diverse training dataset, we have randomly sampled 1000 posts each from the subreddits politics, business, science, and AskReddit, and 1000 additional posts from the Reddit frontpage. All posts in our sample appeared between January 2007 and March 2015, and to control for length effects, contain between 300 and 400 characters. This results in a total training dataset of 5000 posts.
```

```text
# Dogmatism in the Reddit Community
We now apply our dogmatism classifier to a larger dataset of posts, examining how dogmatic language shapes the Reddit community. Concretely, we apply the BOW+LING model trained on the full Reddit dataset to millions of new unannotated posts, labeling these posts with a probability of dogmatism according to the classifier (0=non-dogmatic, 1=dogmatic). We then use these dogmatism annotations to address four research questions.
```

**App answer** (labelled chunk was among the retrieved hits; 2s):

> The topics pulled from Reddit include politics, business, science, AskReddit, and the Reddit frontpage. Additionally, the analysis mentions subreddits related to religion, abortion, climate change, cooking, hobbies, photography, homebrewing, cringepics, and SubredditDrama. Other specific topics mentioned include Libertarianism, Anarcho_Capitalism, ronpaul, ukpolitics, guns, economy, Bitcoin, socialism, technology, UpliftingNews, photoshopbattles, firstworldanarchist, millionairemakers, science, technology, IAmA, and AskReddit.

**Verdict:** ________hmm good

---

## 13. How does their ensemble method work?

Paper: 1610.00956 (docx)

**QASPER gold answer(s):**

- Annotator 1: simply averaging the predictions from the constituent single models

**QASPER evidence (from the paper):**

> The ensembles were formed by simply averaging the predictions from the constituent single models. These single models were selected using the following algorithm.

**Labelled answer chunk(s) in our index:** 79

```text
The ensembles were formed by simply averaging the predictions from the constituent single models. These single models were selected using the following algorithm.
```

**App answer** (labelled chunk was among the retrieved hits; 2.2s):

> The ensembles were formed by simply averaging the predictions from the constituent single models. These single models were selected using the following algorithm. We started with the best performing model according to validation performance. Then in each step we tried adding the best performing model that had not been previously tried. We kept it in the ensemble if it did improve its validation performance and discarded it otherwise. This way we gradually tried each model once. We call the resulting model a greedy ensemble.

**Verdict:** ________wow good

---

## 14. Do they use active learning to create their dataset?

Paper: 1910.14599 (pdf)

**QASPER gold answer(s):**

- Annotator 1: Yes
- Annotator 2: No

**QASPER evidence (from the paper):**

> In our setup, our starting point is a base model, trained on NLI data. Rather than employing automated adversarial methods, here the model's “adversary” is a human annotator. Given a context (also often called a “premise” in NLI), and a desired target label, we ask the human writer to provide a hypothesis that fools the model into misclassifying the label. One can think of the writer as a “white hat” hacker, trying to identify vulnerabilities in the system. For each human-generated example that is misclassified, we also ask the writer to provide a reason why they believe it was misclassified.

**Labelled answer chunk(s) in our index:** 14, 15, 16

```text
procedure we introduce here can pose a dynamic
challenge that allows for never-ending learning.
2.1 HAMLET
To paraphrase the great bard (Shakespeare, 1603),
there is something rotten in the state of the art. We
propose Human-And-Model-in-the-Loop Enabled
Training (HAMLET), a training procedure to au-
tomatically mitigate problems with current dataset
collection procedures (see Figure 1).
In our setup, our starting point is a base model,
trained on NLI data. Rather than employing auto-
```

```text
trained on NLI data. Rather than employing auto-
mated adversarial methods, here the model’s “ad-
versary” is a human annotator. Given a context
(also often called a “premise” in NLI), and a desired
target label, we ask the human writer to provide a
hypothesis that fools the model into misclassifying
the label. One can think of the writer as a “white
hat” hacker, trying to identify vulnerabilities in the
system. For each human-generated example that is
```

```text
system. For each human-generated example that is
misclassified, we also ask the writer to provide a
reason why they believe it was misclassified.
For examples that the model misclassified, it is
necessary to verify that they are actually correct
—i.e., that the given context-hypothesis pairs gen-
uinely have their specified target label. The best
way to do this is to have them checked by another
human. Hence, we provide the example to human
verifiers. If two human verifiers agree with the
```

**App answer** (labelled chunk was among the retrieved hits; 1.4s):

> No, they do not use active learning to create their dataset. Instead, they use an iterative, adversarial human-and-model-in-the-loop solution for NLU dataset collection.

**Verdict:** ________i think its good

---

## 15. What are the different modules in Macaw?

Paper: 1912.08904 (pdf)

**QASPER gold answer(s):**

- Annotator 1: Co-Reference Resolution | Query Generation | Retrieval Model | Result Generation
- Annotator 2: Co-Reference Resolution | Query Generation | Retrieval Model | Result Generation

**QASPER evidence (from the paper):**

> The overview of retrieval and question answering actions in Macaw is shown in FIGREF17. These actions consist of the following components:

> [leftmargin=*]

> Co-Reference Resolution: To support multi-turn interactions, it is sometimes necessary to use co-reference resolution techniques for effective retrieval. In Macaw, we identify all the co-references from the last request of user to the conversation history. The same co-reference resolution outputs can be used for different query generation components. This can be a generic or action-specific component.

> Query Generation: This component generates a query based on the past user-system interactions. The query generation component may take advantage of co-reference resolution for query expansion or re-writing.

> Retrieval Model: This is the core ranking component that retrieves documents or passages from a large collection. Macaw can retrieve documents from an arbitrary document collection using the Indri python interface BIBREF9, BIBREF10. We also provide the support for web search using the Bing Web Search API. Macaw also allows multi-stage document re-ranking.

> Result Generation: The retrieved documents can be too long to be presented using some interfaces. Result generation is basically a post-processing step ran on the retrieved result list. In case of question answering, it can employ answer selection or generation techniques, such as machine reading comprehension models. For example, Macaw features the DrQA model BIBREF11 for question answering.

> Macaw has a modular design, with the goal of making it easy to configure and add new modules such as a different user interface or different retrieval module. The overall setup also follows a Model-View-Controller (MVC) like architecture. The design decisions have been made to smooth the Macaw's adoptions and extensions. Macaw is implemented in Python, thus machine learning models implemented using PyTorch, Scikit-learn, or TensorFlow can be easily integrated into Macaw. The high-level overview of Macaw is depicted in FIGREF8. The user interacts with the interface and the interface produces a Message object from the current interaction of user. The interaction can be in multi-modal form, such as text, speech, image, and click. Macaw stores all interactions in an “Interaction Database”. For every interaction, Macaw looks for most recent user-system interactions (including the system's responses) to create a list of Messages, called the conversation list. It is then dispatched to multiple information seeking (and related) actions. The actions run in parallel, and each should respond within a pre-defined time interval. The output selection component selects from (or potentially combines) the outputs generated by different actions and creates a Message object as the system's response. This message is logged into the interaction database and is sent to the interface to be presented to the user. Again, the response message can be multi-modal and include text, speech, link, list of options, etc.

**Labelled answer chunk(s) in our index:** 13, 18, 19, 20, 21

```text
wizard of oz.
• Preparing quick demonstration for a developed CIS model.
2 MACAW ARCHITECTURE
Macaw has a modular design, with the goal of making it easy
to configure and add new modules such as a different user inter-
face or different retrieval module. The overall setup also follows a
Model-View-Controller (MVC) like architecture. The design deci-
sions have been made to smooth the Macaw’s adoptions and ex-
tensions. Macaw is implemented in Python, thus machine learning
```

```text
users for CIS research.
3 RETRIEVAL AND QUESTION ANSWERING
IN MACAW
The overview of retrieval and question answering actions in Macaw
is shown in Figure 4. These actions consist of the following compo-
nents:
• Co-Reference Resolution: To support multi-turn interactions,
it is sometimes necessary to use co-reference resolution tech-
niques for effective retrieval. In Macaw, we identify all the co-
references from the last request of user to the conversation his-
```

```text
tory. The same co-reference resolution outputs can be used for
different query generation components. This can be a generic or
action-specific component.
• Query Generation: This component generates a query based
on the past user-system interactions. The query generation com-
ponent may take advantage of co-reference resolution for query
expansion or re-writing.
• Retrieval Model: This is the core ranking component that re-
trieves documents or passages from a large collection. Macaw
```

```text
can retrieve documents from an arbitrary document collection
using the Indri python interface [6, 12].7 We also provide the
support for web search using the Bing Web Search API.8 Macaw
also allows multi-stage document re-ranking.
• Result Generation: The retrieved documents can be too long to
be presented using some interfaces. Result generation is basically
a post-processing step ran on the retrieved result list. In case of
question answering, it can employ answer selection or generation
```

```text
techniques, such as machine reading comprehension models.
For example, Macaw features the DrQA model [2] for question
answering.
These components are implemented in a generic form, so re-
searchers can easily replace them with their own favorite algo-
rithms.
7Indri [12] is an open-source search engine originally implemented to support language
models in information retrieval as part of the Lemur Project (http://lemurproject.
```

**App answer** (labelled chunk was among the retrieved hits; 3.1s):

> The different modules in Macaw include actions such as search and question answering, which can be seen as individual modules. Each action is a module that can satisfy the information needs of users for some requests. Additionally, the framework includes components such as Co-Reference Resolution, Query Generation, Retrieval Model, and Document Collection. Macaw also supports different user interfaces, such as File IO, Standard IO, and Telegram.

**Verdict:** ________key words are present but the framing is bad. its still a good

---

## 16. Which variation provides the best results on this dataset?

Paper: 1909.13104 (pdf)

**QASPER gold answer(s):**

- Annotator 1: the model with multi-attention mechanism and a projected layer
- Annotator 2: Projected Layer

**QASPER evidence (from the paper):**

> We have evaluated our models considering the F1 Score, which is the harmonic mean of precision and recall. We have run ten times the experiment for each model and considered the average F1 Score. The results are mentioned in Table TABREF11. Considering F1 Macro the models that include the multi-attention mechanism outperform the others and particularly the one with the Projected Layer has the highest performance. In three out of four pairs of models, the ones with the Projected Layer achieved better performance, so in most cases the addition of the Projected Layer had a significant enhancement.

**Labelled answer chunk(s) in our index:** 43, 44

```text
Moreover, we introduce the MultiAttentionRNN model for the harassment lan-
guage detection, which instead of one attention, it includes four attentions, one
for each category.
We have evaluated our models considering the F1 Score, which is the har-
monic mean of precision and recall. We have run ten times the experiment for
each model and considered the average F1 Score. The results are mentioned
in Table 2. Considering F1 Macro the models that include the multi-attention
```

```text
mechanism outperform the others and particularly the one with the Projected
Layer has the highest performance. In three out of four pairs of models, the
ones with the Projected Layer achieved better performance, so in most cases the
addition of the Projected Layer had a significant enhancement.
6 Conclusion - Future work
We present an attention-based approach for the detection of harassment language
in tweets and the detection of different types of harassment as well. Our approach
```

**App answer** (labelled chunk was among the retrieved hits; 2.9s):

> The variation that provides the best results on this dataset is the multi-attention method having a projected layer.

**Verdict:** ________great

---

## 17. How did the authors find ironic data on twitter?

Paper: 1909.06200 (pdf)

**QASPER gold answer(s):**

- Annotator 1: They developed a classifier to find ironic sentences in twitter data
- Annotator 2: by crawling

**QASPER evidence (from the paper):**

> As neural networks are proved effective in irony detection, we decide to implement a neural classifier in order to classify the sentences into ironic and non-ironic sentences. However, the only high-quality irony dataset we can obtain is the dataset of Semeval-2018 Task 3 and the dataset is pretty small, which will cause overfitting to complex models. Therefore, we just implement a simple one-layer RNN with LSTM cell to classify pre-processed sentences into ironic sentences and non-ironic sentences because LSTM networks are widely used in irony detection. We train the model with the dataset of Semeval-2018 Task 3. After classification, we get 262,755 ironic sentences and 399,775 non-ironic sentences. According to our observation, not all non-ironic sentences are suitable to be transferred into ironic sentences. For example, “just hanging out . watching . is it monday yet" is hard to transfer because it does not have an explicit sentiment polarity. So we remove all interrogative sentences from the non-ironic sentences and only obtain the sentences which have words expressing strong sentiments. We evaluate the sentiment polarity of each word with TextBlob and we view those words with sentiment scores greater than 0.5 or less than -0.5 as words expressing strong sentiments. Finally, we build our irony dataset with 262,755 ironic sentences and 102,330 non-ironic sentences.

> In this paper, in order to address the lack of irony data, we first crawl over 2M tweets from twitter to build a dataset with 262,755 ironic and 112,330 non-ironic tweets. Then, due to the lack of parallel data, we propose a novel model to transfer non-ironic sentences to ironic sentences in an unsupervised way. As ironic style is hard to model and describe, we implement our model with the control of classifiers and reinforcement learning. Different from other studies in style transfer, the transformation from non-ironic to ironic sentences has to preserve sentiment polarity as mentioned above. Therefore, we not only design an irony reward to control the irony accuracy and implement denoising auto-encoder and back-translation to control content preservation but also design a sentiment reward to control sentiment preservation.

**Labelled answer chunk(s) in our index:** 11, 14, 25, 26

```text
to generate ironies based on seq2seq framework as far as we know. Inspired by methods for style transfer, we decide to
implement a specifically designed model based on unsupervised style transfer to explore irony generation.
In this paper, in order to address the lack of irony data, we first crawl over 2M tweets from twitter to build a dataset
with 262,755 ironic and 112,330 non-ironic tweets. Then, due to the lack of parallel data, we propose a novel model to
```

```text
sentences via seq2seq neural network.
• We build the first large-scale irony dataset with 262,755 ironic and 112,330 non-ironic tweets.
• We implement well-designed rewards for irony accuracy and sentiment preservation which are different from
those in previous work on style transfer
• Our approach yields substantial results on generating ironic sentences with high irony accuracy and well-
preserved content and sentiment.
2 Related Work
```

```text
As neural networks are proved effective in irony detection, we decide to implement a neural classifier in order to
classify the sentences into ironic and non-ironic sentences. However, the only high-quality irony dataset we can obtain
is the dataset of Semeval-2018 Task 3 and the dataset is pretty small, which will cause overfitting to complex models.
Therefore, we just implement a simple one-layer RNN with LSTM cell to classify pre-processed sentences into ironic
```

```text
sentences and non-ironic sentences because LSTM networks are widely used in irony detection. We train the model
with the dataset of Semeval-2018 Task 3. After classification, we get 262,755 ironic sentences and 399,775 non-ironic
sentences. According to our observation, not all non-ironic sentences are suitable to be transferred into ironic sentences.
For example, “just hanging out . watching . is it monday yet" is hard to transfer because it does not have an explicit
```

**App answer** (labelled chunk was among the retrieved hits; 1.3s):

> The authors crawled over 2M tweets from Twitter to build a dataset with 262,755 ironic and 112,330 non-ironic tweets.

**Verdict:** ________excellent

---

## 18. What are the difficulties in modelling the ironic pattern?

Paper: 1909.06200 (pdf)

**QASPER gold answer(s):**

- Annotator 1: obscure and hard to understand |  lack of previous work and baselines on irony generation
- Annotator 2: ironies are often obscure and hard to understand

**QASPER evidence (from the paper):**

> Although some previous studies focus on irony detection, little attention is paid to irony generation. As ironies can strengthen sentiments and express stronger emotions, we mainly focus on generating ironic sentences. Given a non-ironic sentence, we implement a neural network to transfer it to an ironic sentence and constrain the sentiment polarity of the two sentences to be the same. For example, the input is “I hate it when my plans get ruined" which is negative in sentiment polarity and the output should be ironic and negative in sentiment as well, such as “I like it when my plans get ruined". The speaker uses “like" to be ironic and express his or her negative sentiment. At the same time, our model can preserve contents which are irrelevant to sentiment polarity and irony. According to the categories mentioned in BIBREF5 , irony can be classified into 3 classes: verbal irony by means of a polarity contrast, the sentences containing expression whose polarity is inverted between the intended and the literal evaluation; other types of verbal irony, the sentences that show no polarity contrast between the literal and intended meaning but are still ironic; and situational irony, the sentences that describe situations that fail to meet some expectations. As ironies in the latter two categories are obscure and hard to understand, we decide to only focus on ironies in the first category in this work. For example, our work can be specifically described as: given a sentence “I hate to be ignored", we train our model to generate an ironic sentence such as “I love to be ignored". Although there is “love" in the generated sentence, the speaker still expresses his or her negative sentiment by irony. We also make some explorations in the transformation from ironic sentences to non-ironic sentences at the end of our work. Because of the lack of previous work and baselines on irony generation, we implement our model based on style transfer. Our work will not only provide the first large-scale irony dataset but also make our model as a benchmark for the irony generation.

**Labelled answer chunk(s) in our index:** 4, 5, 7

```text
is negative in sentiment polarity and the output should be ironic and negative in sentiment as well, such as “I like it
when my plans get ruined". The speaker uses “like" to be ironic and express his or her negative sentiment. At the
same time, our model can preserve contents which are irrelevant to sentiment polarity and irony. According to the
categories mentioned in [6], irony can be classified into 3 classes: verbal irony by means of a polarity contrast, the
```

```text
sentences containing expression whose polarity is inverted between the intended and the literal evaluation; other types
of verbal irony, the sentences that show no polarity contrast between the literal and intended meaning but are still
ironic; and situational irony, the sentences that describe situations that fail to meet some expectations. As ironies in
the latter two categories are obscure and hard to understand, we decide to only focus on ironies in the first category in
```

```text
work and baselines on irony generation, we implement our model based on style transfer. Our work will not only
provide the first large-scale irony dataset but also make our model as a benchmark for the irony generation.
Recently, unsupervised style transfer becomes a very popular topic. Many state-of-the-art studies try to solve the task
with sequence-to-sequence (seq2seq) framework. There are three main ways to build up models. The first is to learn
```

**App answer** (labelled chunk was NOT among the retrieved hits; 1.7s):

> The difficulties in modelling the ironic pattern include the lack of large-scale irony dataset and the challenges in capturing the complex nature of irony, which involves a clash between the intended meaning of a sentence and its literal meaning. Additionally, the ironic style is hard to model and describe, making it challenging to develop effective models for irony generation.

**Verdict:** ________good

---

## 19. How does the IPA label data after interacting with users?

Paper: 2001.02284 (pdf)

**QASPER gold answer(s):**

- Annotator 1: It defined a sequence labeling task to extract custom entities from user input and label the next action (out of 13  custom actions defined).
- Annotator 2: Plain dialogues with unique dialogue indexes | Plain Information Dictionary information (e.g., extracted entities) collected for the whole dialogue | Pairs of questions (i.e., user requests) and responses (i.e., bot responses) | Triples in the form of (User Request, Next Action, Response)

**QASPER evidence (from the paper):**

> Named Entity Recognition: We defined a sequence labeling task to extract custom entities from user input. We assumed seven (7) possible entities (see Table TABREF43) to be recognized by the model: topic, subtopic, examination mode and level, question number, intent, as well as the entity other for remaining words in the utterance. Since the data obtained from the rule-based system already contains information on the entities extracted from each user query (i.e., by means of Elasticsearch), we could use it to train a domain-specific NER unit. However, since the user-input was informal, the same information could be provided in different writing styles. That means that a single entity could have different surface forms (e.g., synonyms, writing styles) (although entities that we extracted from the rule-based system were all converted to a universal standard, e.g., official chapter names). To consider all of the variable entity forms while post-labeling the original dataset, we defined generic entity names (e.g., chapter, question nr.) and mapped variations of entities from the user input (e.g., Chapter = [Elementary Calculus, Chapter $I$, ...]) to them.

> Next Action Prediction: We defined a classification problem to predict the system's next action according to the given user input. We assumed 13 custom actions (see Table TABREF42) that we considered being our labels. In the conversational dataset, each input was automatically labeled by the rule-based system with the corresponding next action and the dialogue-id. Thus, no additional post-labeling was required. We investigated two settings:

> Plain dialogues with unique dialogue indexes;

> Plain Information Dictionary information (e.g., extracted entities) collected for the whole dialogue;

> Pairs of questions (i.e., user requests) and responses (i.e., bot responses) with the unique dialogue- and turn-indexes;

> Triples in the form of (User Request, Next Action, Response). Information on the next system's action could be employed to train a Dialogue Manager unit with (deep-) machine learning algorithms;

**Labelled answer chunk(s) in our index:** 53, 62, 63, 65, 66

```text
dialogues have the following format:
• Plain dialogues with unique dialogue indexes;
• Plain Information Dictionary information (e.g., extracted
entities) collected for the whole dialogue;
• Pairs of questions (i.e., user requests) and responses
(i.e., bot responses) with the unique dialogue- and turn-
indexes;
• Triples in the form of (User Request, Next Action, Re-
sponse). Information on the next system’s action could be
employed to train a Dialogue Manager unit with (deep-)
```

```text
umn “Count” denotes the number of occurrences of each ac-
tion in the entire dataset.
Named Entity Recognition: We defined a sequence la-
beling task to extract custom entities from user input. We
```

```text
Entity Count
Question Nr. 317
Chapter 311
Examination 303
Subtopic 198
Level 80
Intent 70
Table 3: Detailed statistics on possible named entities. Col-
umn “Count” denotes the number of occurrences of each en-
tity in the entire dataset.
assumed seven (7) possible entities (see Table 3) to be recog-
nized by the model: topic, subtopic, examination mode and
level, question number, intent, as well as the entity other
for remaining words in the utterance. Since the data ob-
```

```text
were all converted to a universal standard, e.g., official chap-
ter names). To consider all of the variable entity forms while
post-labeling the original dataset, we defined generic entity
names (e.g., chapter, question nr.) and mapped variations of
entities from the user input (e.g., Chapter = [Elementary Cal-
culus, Chapter I, ...]) to them.
Next Action Prediction: We defined a classification
problem to predict the system’s next action according to the
```

```text
given user input. We assumed 13 custom actions (see Ta-
ble 2) that we considered being our labels. In the conversa-
tional dataset, each input was automatically labeled by the
rule-based system with the corresponding next action and
the dialogue-id. Thus, no additional post-labeling was re-
quired. We investigated two settings:
• Default Setting: Using only a user input and the corre-
sponding label (i.e., next action) without additional con-
```

**App answer** (labelled chunk was among the retrieved hits; 1.3s):

> The IPA system augments the resources with structured and to some extent labeled training data by interacting with users. The system accumulates labeled dialogues in the background and stores them in a structured form.

**Verdict:** ________

---

## 20. How do they obtain the lexicon?

Paper: 1911.07555 (pdf)

**QASPER gold answer(s):**

- Annotator 1: (unanswerable per this annotator)
- Annotator 2: built over all the data and therefore includes the vocabulary from both the training and testing sets

**QASPER evidence (from the paper):**

> The lexicon based classifier is then used to predict the specific language within a language group. For the South African languages this is done for the Nguni and Sotho groups. If the lexicon prediction of the specific language has high confidence then its result is used as the final label else the naive Bayesian classifier's specific language prediction is used as the final result. The lexicon is built over all the data and therefore includes the vocabulary from both the training and testing sets.

**Labelled answer chunk(s) in our index:** 20

```text
Bayesian classifier’s specific language prediction is used as the final result. The lexicon is built over
all the data and therefore includes the vocabulary from both the training and testing sets.
The lexicon based classifier is designed to trade higher precision for lower recall. The proposed
implementation is considered confident if the number of words from the winning language is at least
one more than the number of words considered to be from the language scored in second place.
```

**App answer** (labelled chunk was among the retrieved hits; 1.5s):

> The lexicon is built over all the data and therefore includes the vocabulary from both the training and testing sets.

**Verdict:** ________good
