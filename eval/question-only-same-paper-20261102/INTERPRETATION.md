# What the Q experiment means

Q is the proposed search form: keep the same document selected as A, but search using the actual question without the evaluation's paper-title wrapper. This was implemented in a new test script. The running application was not changed.

For gold quotes with four or more words, Q found 49.32% of the checkable answer items in its first five results on the earlier omission cases, compared with A's 4.05% and P's 15.54%. On previously acceptable cases, the corresponding rates were Q 59.22%, A 44.66%, and P 31.07%. These percentages describe retrieved answer-text items, not correct or complete generated answers.

The controlled A/Q comparison supports removing the title wrapper from search text after document selection. It does not establish exactly whether dense embeddings or keyword encoding contributed more, because both use the changed text. It also does not establish final answer quality.

## Gains and losses must both be counted

At the first-five cutoff, among cases with checkable gold:

| Cases | Q gains a mapped answer item that A missed | Q loses all mapped answer items that A found |
|---|---:|---:|
| Prior omissions | 85 | 3 |
| Previously acceptable | 19 | 12 |

Finding one item is not the same as covering the complete answer. The raw results preserve every item and all mapped-item coverage comparisons.

## The relevance gate is a separate remaining problem

The existing dense similarity threshold was kept at 0.63. Q's changed question text caused 27 omission-case queries and 16 acceptable-case queries to fail that gate. The 19 document-scope rejections remain separate and unchanged.

At the top-50 cutoff, Q lost all mapped-item hits on 12 omission cases that A covered; 11 of those losses were caused by the gate. It also lost all mapped-item hits on seven acceptable cases; six of those losses were caused by the gate. Thus 17 of the 19 observed A-to-Q case losses at that cutoff occurred before hybrid candidate retrieval. See gate-regressions.json.

This is evidence that a query-text change also changes the gate's behavior. No threshold was lowered, no safety checks were removed, and no additional tuning was performed. A later gate-calibration experiment would need to test answerable and absent-topic questions together before recommending a production change.

## Limits

- All cases came from dev papers; split.json was preserved.
- Gold quotes that could not be located exactly remain excluded and separately counted.
- The permitted same-paper character-range overlap rule is inherited from the prior experiment.
- The first-five figures are cutoffs of one top-50 search, as previously requested. The application uses a k-dependent hybrid prefetch, so this is not yet a direct production-k=5 result.
- A and P are verified saved baselines; only Q was newly run.
- No answers were generated, no existing RAG code was changed, and nothing was pushed to GitHub.
