# Prompt C comparison — 2026-11-04

New A/C calls: same fixed 40 dev cases (22 previously failed, 18 acceptable), identical frozen saved-hybrid passages and context builder, 3200 context / 5000 total / k15 / max_tokens 512 / temperature 0 / reranking off / no history. Same model and no-thinking raw template. All 158 fresh calls succeeded with no truncations. B is the saved prior run, copied into reference-B.jsonl with original prompts, answers, judgments, timestamps and usage; no new B inference or regrading. All application/input hashes unchanged.

## Preflight and exact prompts

C system/reminder instructions contain neither `enough information` nor the word `fully`. The literal requirement for the entire final prompt could not be met while keeping source context unchanged:13 occurrences remain in 11 dev cases, all from paper text, such as `fully connected layer` and `does not convey enough information`. We disclosed this before inference and preserved source text. This is a documented exception, not a clean full-prompt exclusion result. See preflight-collisions.json and variant-verification.json.

prompt-example-A.txt and prompt-example-C.txt show exact complete examples. exact-wire-prompts.jsonl stores all 158 actual system/user/raw-wire prompts. variants.mjs is the only evaluation selector: A/B use unchanged application templates; C changes system and reminder only. A/B selectors reproduce all 158 prior saved system/user prompts exactly. Both fresh contexts match all 79 prior A/B pairs byte-for-byte. No production setting or application source change.

## 1. Outcome counts and percentages

| Outcome | A fresh | B saved | C fresh |
|---|---:|---:|---:|
| adequate | 29/40 (72.5%) | 28/40 (70.0%) | 32/40 (80.0%) |
| partial | 3/40 (7.5%) | 2/40 (5.0%) | 2/40 (5.0%) |
| wrong | 2/40 (5.0%) | 6/40 (15.0%) | 2/40 (5.0%) |
| refused | 6/40 (15.0%) | 4/40 (10.0%) | 4/40 (10.0%) |
| Wrong refusals with complete evidence | 4 | 2 | 2 |

Evidence is common to all arms:36 complete, 2 partial, 2 absent, recorded case-by-case. Literal quote proxy coverage 36/40 is separate from answer grading. All fresh answers were read individually in randomized order with arm/pair labels hidden; judgments were frozen before decoding. This is AI reading, not independent human-certified grading; wording can suggest the variant.

## 2. A versus C paired list

**3 improved, 0 worse, 37 same.** Same scoring as before: adequate=3, partial=2, wrong/refused=0.

| Changed question | A | C | Reason |
|---|---|---|---|
| How were crowd workers instructed to identify important elements in large document collections? | refused | adequate | Explains topic descriptions, individual propositions, 5-point importance scoring and no document reading; all explicitly supplied. |
| How is the data in the new corpus come sourced? | partial | adequate | Gives collection process and all four corpus source types; all facts supported. |
| where did they obtain the annotated clinical notes from? | refused | adequate | Correctly identifies the 2010 i2b2/VA CE task source. |

### All 40 paired cases

| Case ID | Question | Evidence | A | B saved | C | A→C |
|---|---|---|---|---|---|---|
| docx/1601.02403/7697baf8d8d582c1f664a614f6332121061f87db | Which machine learning methods are used in experiments? | partial | wrong | wrong | wrong | same |
| docx/1603.01514/6bf5620f295b5243230bc97b340fae6e92304595 | What baseline model is used? | complete | adequate | adequate | adequate | same |
| docx/1605.07333/30eacb4595014c9c0e5ee9669103d003cfdfe1e5 | Which dataset do they train their models on? | complete | adequate | adequate | adequate | same |
| docx/1606.02891/642e8cf1d39faa1cd985d16750cdc6696c52db2f | what are the baseline systems? | complete | adequate | adequate | adequate | same |
| docx/1606.03676/3ddff6b707767c3dd54d7104fe88b628765cae58 | which datasets did they experiment with? | complete | adequate | adequate | adequate | same |
| docx/1610.07809/06eb9f2320451df83e27362c22eb02f4a426a018 | what levels of document preprocessing are looked at? | complete | adequate | adequate | adequate | same |
| docx/1611.01576/a130306c6662ff489df13fb3f8faa7cba8c52a21 | What pooling function is used? | complete | adequate | adequate | adequate | same |
| docx/1701.08229/82642d3111287abf736b781043d49536fe48c350 | How is the dataset annotated? | complete | adequate | adequate | adequate | same |
| docx/1702.03856/53aa07cc4cc4e7107789ae637dbda8c9f6c1e6aa | what challenges are identified? | complete | adequate | adequate | adequate | same |
| docx/1703.10344/2ee715c7c6289669f11a79743a6b2b696073805d | What baseline model is used? | complete | adequate | adequate | adequate | same |
| docx/1704.04452/e9cfbfdf30e48cffdeca58d4ac6fdd66a8b27d7a | How were crowd workers instructed to identify important elements in large document collections? | complete | refused | adequate | adequate | improved |
| docx/1705.04153/ef396a34436072cb3c40b0c9bc9179fee4a168ae | What tasks do they experiment with? | complete | adequate | adequate | adequate | same |
| pdf/1601.02403/1cb100182508cf55b3509283c0e2bbcd527d625e | How is the data in the new corpus come sourced? | complete | partial | adequate | adequate | improved |
| pdf/1601.02403/eac9dae3492e17bc49c842fb566f464ff18c049b | What argument components do the ML methods aim to identify? | complete | adequate | adequate | adequate | same |
| pdf/1605.03481/792f6d76d2befba2af07198584aac1b189583ae4 | Is this hashtag prediction task an established task, or something new? | complete | adequate | wrong | adequate | same |
| pdf/1610.00956/e5bc73974c79d96eee2b688e578a9de1d0eb38fd | How do they show there is space for further improvement? | complete | adequate | adequate | adequate | same |
| pdf/1610.07809/06eb9f2320451df83e27362c22eb02f4a426a018 | what levels of document preprocessing are looked at? | complete | adequate | adequate | adequate | same |
| pdf/1702.03856/53aa07cc4cc4e7107789ae637dbda8c9f6c1e6aa | what challenges are identified? | complete | adequate | wrong | adequate | same |
| pdf/1706.01678/b65a83a24fc66728451bb063cf6ec50134c8bfb0 | How are sentences selected from the summary graph? | complete | adequate | wrong | adequate | same |
| pdf/1707.06806/ddb23a71113cbc092cbc158066d891cae261e2c6 | What is the source of the news articles? | complete | adequate | adequate | adequate | same |
| pdf/1708.01464/55c8f7acbfd4f5cde634aaecd775b3bb32e9ffa3 | what evaluation metrics were used? | complete | adequate | adequate | adequate | same |
| pdf/1710.03348/044f922604b4b3f42ae381419fd5cd5624fa0637 | In what cases is attention different from alignment? | complete | adequate | adequate | adequate | same |
| pdf/1710.03348/beac555c4aea76c88f19db7cc901fa638765c250 | What useful information does attention capture? | complete | wrong | wrong | wrong | same |
| pdf/1802.07862/1591068b747c94f45b948e12edafe74b5e721047 | How large is their MNER SnapCaptions dataset? | complete | adequate | adequate | adequate | same |
| pdf/1809.01202/a4d115220438c0ded06a91ad62337061389a6747 | What types of social media did they consider? | absent | refused | refused | refused | same |
| pdf/1809.01541/5cb610d3d5d7d447b4cd5736d6a7d8262140af58 | How do they perform multilingual training? | complete | adequate | adequate | adequate | same |
| pdf/1810.04428/ebf0d9f9260ed61cbfd79b962df3899d05f9ebfb | what are the sizes of both datasets? | complete | partial | partial | partial | same |
| pdf/1903.03530/2c85865a65acd429508f50b5e4db9674813d67f2 | Which data do they use as a starting point for the dialogue dataset? | complete | adequate | adequate | adequate | same |
| pdf/1906.00790/4aa9b60c0ccd379c6fb089c84a6c7b872ee9ec4f | What set of approaches to hashtag segmentation are proposed? | partial | partial | partial | partial | same |
| pdf/1907.09369/132f752169adf6dc5ade3e4ca773c11044985da4 | What data is used in experiments? | complete | adequate | adequate | adequate | same |
| pdf/1908.04042/b4f881331b975e6e4cab1868267211ed729d782d | how large is the vocabulary? | complete | refused | refused | refused | same |
| pdf/1909.00326/93beae291b455e5d3ecea6ac73b83632a3ae7ec7 | How do their models decide how much improtance to give to the output words? | complete | adequate | adequate | adequate | same |
| pdf/1909.06200/5c3e98e3cebaecd5d3e75ec2c9fc3dd267ac3c83 | What experiments are conducted? | absent | refused | refused | refused | same |
| pdf/1909.13104/f0b2289cb887740f9255909018f400f028b1ef26 | What types of online harassment are studied? | complete | adequate | wrong | adequate | same |
| pdf/1910.10781/12c50dea84f9a8845795fa8b8c1679328bd66246 | What datasets did they use for evaluation? | complete | adequate | adequate | adequate | same |
| pdf/1912.00667/3941401a182a3d6234894a5c8a75d48c6116c45c | Which real-world datasets are used? | complete | adequate | adequate | adequate | same |
| pdf/1912.06262/4477bb513d56e57732fba126944073d414d1f75f | where did they obtain the annotated clinical notes from? | complete | refused | adequate | adequate | improved |
| pdf/2002.01664/4bc2784be43d599000cb71d31928908250d4cef3 | What is the GhostVLAD approach? | complete | adequate | adequate | adequate | same |
| pdf/2002.01984/ff338921e34c15baf1eae0074938bf79ee65fdd2 | What was the baseline model? | complete | refused | refused | refused | same |
| pdf/2002.02070/29f2954098f055fb19d9502572f085862d75bf61 | What classifiers have been trained? | complete | adequate | adequate | adequate | same |

## 3. Every current A refusal despite complete evidence

### How were crowd workers instructed to identify important elements in large document collections?

docx/1704.04452/e9cfbfdf30e48cffdeca58d4ac6fdd66a8b27d7a

**A:** The provided context is insufficient to answer this question.

**C (adequate):** Crowd workers were instructed to identify important elements in large document collections by being provided with a description of the document cluster's topic along with propositions. They were not shown the documents themselves, but instead were asked to score each proposition's importance using a 5-point Likert-scale. This approach allowed them to determine important elements without requiring them to read all documents in a cluster.

### how large is the vocabulary?

pdf/1908.04042/b4f881331b975e6e4cab1868267211ed729d782d

**A:** The provided context is insufficient to answer this question.

**C (refused):** The provided context is insufficient to answer this question.

### where did they obtain the annotated clinical notes from?

pdf/1912.06262/4477bb513d56e57732fba126944073d414d1f75f

**A:** The provided context is insufficient to answer this question.

**C (adequate):** The annotated clinical notes were obtained from the CE task in 2010 i2b2/VA.

### What was the baseline model?

pdf/2002.01984/ff338921e34c15baf1eae0074938bf79ee65fdd2

**A:** The provided context is insufficient to answer this question.

**C (refused):** The provided context is insufficient to answer this question.

## 4. Every C claim that information is missing or not stated

No substantive answer added a missing-information caveat. However, a refusal is also an insufficiency claim and must be checked. C has 43 such claims: 39 negative controls plus 4 dev refusals. 41 are justified and 2 are false: vocabulary count and always-YES baseline. Thus the goal of zero false claims is NOT met. Statements about domain behavior (such as workers not seeing documents) are not claims that the supplied prompt is missing information.

| Cohort | Question | Exact sentence | Truth | Reason |
|---|---|---|---|---|
| offtopic | Who is the current CEO of the company? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What is the company's stock ticker symbol? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What was the company's annual revenue last year? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Who are the company's top three customers? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What is the dress code in the office? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What are the salary bands for the Senior Engineer role? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Is there parking reimbursement for employees? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Does the company offer a gym membership subsidy? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Can I bring my dog to the office? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | How many free lunches are provided each week? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | How many stock options do new hires receive? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | How many paid public holidays does the company observe each year? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What is the maximum nightly hotel rate allowed on business trips? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What laptop brand do engineers get? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | How much is the monthly internet stipend for remote employees? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Am I allowed to have a second job outside the company? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Who is the head of the HR department? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What is the company's mission statement? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | How many employees does the company have? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What is the phone number for the IT help desk? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Which AWS region hosts our production environment? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What is the guest Wi-Fi password? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | How long is the probation period for new hires? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | How much severance pay do laid-off employees receive? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Does the company sponsor work visas for new hires? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What is the daily meal per diem while traveling? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Can unused sick days be cashed out at the end of the year? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What is the company's carbon reduction target? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Who approves marketing press releases before publication? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What is the capital of France? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What is the distance from Earth to the Moon? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | How do I bake a chocolate cake? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Who wrote Romeo and Juliet? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What is the boiling point of water in Fahrenheit? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | How do I change a flat tire? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | What is the tallest mountain in the world? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Explain how photosynthesis works. | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Who won the 2018 FIFA World Cup? | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| offtopic | Recommend a good science fiction novel. | The provided context is insufficient to answer this question. | true | Pure rejection; supplied full handbook lacks the requested target fact. |
| dev | What types of social media did they consider? | The provided context is insufficient to answer this question. | true | Facebook status-update source identification is absent from supplied passages. |
| dev | how large is the vocabulary? | The provided context is insufficient to answer this question. | false | Wrong refusal: supplied text explicitly states 33,663 distinct review keywords. |
| dev | What experiments are conducted? | I could not find any relevant information in the knowledge base to answer this question. | true | No passages supplied because saved relevance gate returned no context. |
| dev | What was the baseline model? | The provided context is insufficient to answer this question. | false | Wrong refusal: actual supplied text says always YES in batches2/3 to obtain baseline performance. |

## 5. Every refused-to-answered transition, individually checked

### How were crowd workers instructed to identify important elements in large document collections?

**A:** The provided context is insufficient to answer this question.

**C:** Crowd workers were instructed to identify important elements in large document collections by being provided with a description of the document cluster's topic along with propositions. They were not shown the documents themselves, but instead were asked to score each proposition's importance using a 5-point Likert-scale. This approach allowed them to determine important elements without requiring them to read all documents in a cluster.

Individually read against actual final context: all new facts are supported by the supplied task-design or clinical-source statement. **Unsupported additions: none found.**

### where did they obtain the annotated clinical notes from?

**A:** The provided context is insufficient to answer this question.

**C:** The annotated clinical notes were obtained from the CE task in 2010 i2b2/VA.

Individually read against actual final context: all new facts are supported by the supplied task-design or clinical-source statement. **Unsupported additions: none found.**

## 6. Off-topic rejection

Same 39-question original rejection set against its intended full employee handbook, directly supplied identically to A/C. No retrieval or relevance gate. The fixture has one available passage, with 15 as maximum requested hit count. Do not interpret this as production retrieval rejection performance.

| Arm | Pure rejections | Rate | Unsupported answers |
|---|---:|---:|---:|
| A | 39/39 | 100.00% | 0 |
| B (saved) | 38/39 | 97.44% | 0 |
| C | 39/39 | 100.00% | 0 |

A and C rejected 29/29 near-misses and 10/10 unrelated questions. C answered no off-topic question. Historical B's one non-rejection was supported sick-leave accrual/carryover information plus an accurate cash-out gap admission; it did not invent a cash-out policy.

## 7. Actual usage and timings

### Dev: 40 per arm

| Measurement | A fresh | B saved reference | C fresh |
|---|---:|---:|---:|
| Mean input tokens | 3281.47 | 3197.30 | 3205.43 |
| Max input tokens | 3799.00 | 3713.00 | 3721.00 |
| Mean output tokens | 53.00 | 62.23 | 56.42 |
| Max output tokens | 141.00 | 164.00 | 150.00 |
| Mean combined tokens | 3334.47 | 3259.53 | 3261.85 |
| Max combined tokens | 3858.00 | 3808.00 | 3764.00 |
| Mean Neurons/call | 16.79 | 16.68 | 16.54 |
| Max Neurons/call | 19.90 | 20.85 | 20.24 |
| Total Neurons | 671.62 | 667.30 | 661.73 |
| mean generation time (s) | 1.459 | 1.475 | 1.594 |
| median generation time (s) | 1.112 | 1.108 | 1.121 |
| p95 generation time (s) | 2.743 | 2.222 | 1.926 |
| max generation time (s) | 12.379 | 11.164 | 11.554 |

### Rejection: 39 per arm

| Measurement | A fresh | B saved reference | C fresh |
|---|---:|---:|---:|
| Mean input tokens | 1533.33 | 1447.33 | 1455.33 |
| Max input tokens | 1539.00 | 1453.00 | 1461.00 |
| Mean output tokens | 11.00 | 12.38 | 11.00 |
| Max output tokens | 11.00 | 65.00 | 11.00 |
| Mean combined tokens | 1544.33 | 1459.72 | 1466.33 |
| Max combined tokens | 1550.00 | 1518.00 | 1472.00 |
| Mean Neurons/call | 7.43 | 7.07 | 7.07 |
| Max Neurons/call | 7.45 | 8.70 | 7.09 |
| Total Neurons | 289.62 | 275.76 | 275.56 |
| mean generation time (s) | 1.030 | 1.388 | 0.968 |
| median generation time (s) | 0.690 | 0.720 | 0.719 |
| p95 generation time (s) | 2.880 | 10.476 | 1.273 |
| max generation time (s) | 10.695 | 12.149 | 10.437 |

Fresh A/C total reported usage: **1898.54 Neurons**. Historical B usage is shown only for reference and is not added to this run. Actual provider prompt tokens+512fit5000on every fresh call. Latency includes HTTP roundtrip and complete body reading/parsing, excludes retrieval/rewrite, and is not streaming first-token timing. No current daily account balance was verified. Single sequential paired run; do not infer speed superiority from small timing differences.

## 8. Borderline judgments

- A: How is the data in the new corpus come sourced? (pdf/1601.02403/1cb100182508cf55b3509283c0e2bbcd527d625e): partial; alternative adequate. Question may be interpreted as collection process rather than an exhaustive list of source types.
- A: what levels of document preprocessing are looked at? (pdf/1610.07809/06eb9f2320451df83e27362c22eb02f4a426a018): adequate; alternative adequate. Fourth is informal numbering for a supported additional summarization experiment.
- A: How are sentences selected from the summary graph? (pdf/1706.01678/b65a83a24fc66728451bb063cf6ec50134c8bfb0): adequate; alternative adequate. Same alternative-reference interpretation, no need to require the union of both gold alternatives.
- C: How are sentences selected from the summary graph? (pdf/1706.01678/b65a83a24fc66728451bb063cf6ec50134c8bfb0): adequate; alternative adequate. Question wording mixes sentence selection and graph extraction; a complete alternative reference covers sentence-selection methods.
- A: What useful information does attention capture? (pdf/1710.03348/beac555c4aea76c88f19db7cc901fa638765c250): wrong; alternative adequate. Same core-versus-unsupported-syntactic-extension ambiguity.
- C: What useful information does attention capture? (pdf/1710.03348/beac555c4aea76c88f19db7cc901fa638765c250): wrong; alternative adequate. Core verb finding is correct; strict grade penalizes unsupported syntax extension.
- A: what are the sizes of both datasets? (pdf/1810.04428/ebf0d9f9260ed61cbfd79b962df3899d05f9ebfb): partial; alternative adequate. Training-size-only interpretation possible; gold totals conflict.
- C: what are the sizes of both datasets? (pdf/1810.04428/ebf0d9f9260ed61cbfd79b962df3899d05f9ebfb): partial; alternative adequate. Training-size-only interpretation possible; gold totals conflict.

If corpus sourcing is interpreted as collection procedure alone, its frozen A alternative is adequate: A=30/40, C=32/40; paired result2improved,0worse,38same. Thus two refusal fixes are robust to that interpretation; the third improvement depends on requiring all source types. Attention and size ambiguities affect both arms rather than creating a C-only gain.

## Interpretation

C is the strongest candidate on this fixed dev sample: it preserves the two refusal fixes, completes the corpus-source answer, removes B's extra false caveats, and preserves all39rejections. It still wrongly refuses two questions with complete support and still produces two wrong research answers (related-work method attribution and syntactic-attention overclaim). Two answers remain partial. Zero false claims is not achieved when wrong refusals are included. This is not proof of general reliability or authorization to change production. No application defaults were changed.

{
  "allInputAndApplicationHashesUnchanged": true,
  "allContextPairsIdentical": true,
  "all158CallsHTTP200": true,
  "allFinishedStop": true,
  "explicitOutputLimit512": true,
  "allActualPromptPlus512Within5000": true,
  "noRetrievalCalls": true,
  "noRerankerCalls": true,
  "noRewriteCalls": true,
  "noGraderModelCalls": true,
  "noHeldOutTestContentRead": true,
  "applicationCodeChanges": []
}
