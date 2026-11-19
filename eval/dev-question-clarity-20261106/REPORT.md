# Dev question clarity review

Reviewed 6 November 2026. No search, embedding or generation API calls. Only new files in this results folder were created. Existing questions, split, application code/defaults and prior results were left unchanged.

## What was reviewed

All 610 dev case units in the existing frozen inventory, representing 496 original QASPER question IDs. PDF and DOCX copies of the same question were assigned together. Different QASPER question IDs with identical wording remain distinct annotations. Only original question text was used to assign groups. The review did not use reference answers, source excerpts, paper titles or retrieval outcomes. Paper IDs were checked only for dev membership and retained as identifiers.

The review is by the assistant, not an independent human panel. It is a provisional linguistic assessment. Question wording cannot establish that a phrase uniquely identifies a method throughout the corpus, that its premise is true, or that all valid answers must match the original paper. All original text, including typos, is preserved.

## Groups

| Group | Original question IDs | PDF/DOCX case units |
| --- | --- | --- |
| Can be searched on its own | 52/496 (10.5%) | 57/610 (9.3%) |
| Topic is useful, but intended study/system is missing | 199/496 (40.1%) | 243/610 (39.8%) |
| Too general to identify the intended subject | 245/496 (49.4%) | 310/610 (50.8%) |

### Can be searched on its own

The text identifies a named method/framework/dataset or a sufficiently specified conceptual question, without needing us to invent which unnamed study is intended. Searchable does not establish a unique source or a valid single-paper gold answer.

Expected app behaviour: Search the collection using the question; support the answer with clearly attributed sources. Ask about a version/setting if necessary.

- **45.** What is the GhostVLAD approach?
- **198.** What is active learning?
- **109.** What neural network modules are included in NeuronBlocks?
- **101.** Ngrams of which length are aligned using PARENT?
- **120.** What is a second order co-ocurrence matrix?
- **422.** How large are the improvements of the Attention-Sum Reader model when using the BookTest dataset?

### Topic is useful, but intended study/system is missing

Contains a substantive topic or methodological clue, but asks about the authors, a particular model, experiment, corpus or finding without identifying it. Plausible relevant passages can come from several studies.

Expected app behaviour: Use existing conversation if it resolves the reference. Otherwise ask a focused question about the topic/system/experiment or offer clearly distinguished source-specific findings.

- **14.** What is the performance of BERT on the task?
- **17.** What are the clinical datasets used in the paper?
- **122.** What embedding techniques are explored in the paper?
- **341.** How do they measure which words are under-translated by NMT models?
- **463.** LDA is an unsupervised method; is this paper introducing an unsupervised approach to spam detection?

### Too general to identify the intended subject

Asks about unnamed data, baselines, results, language, participants, settings or features with insufficient distinctive subject information. Explicit pronouns are not required: "What was the baseline?" also lacks its subject.

Expected app behaviour: Use prior conversation if available; otherwise ask what method, topic, experiment or result the user means. A document filename is not required.

- **19.** what was the baseline?
- **21.** what datasets did they use?
- **121.** How many humans participated?
- **127.** What results do they achieve using their proposed approach?
- **137.** what challenges are identified?

## Borderline cases and interpretation

39 question IDs (42 case units) have explicit borderline notes in borderline.jsonl. Some general concept questions could instead be asking for a paper-specific definition. Some named methods still lack an experimental setting, baseline, version or acronym expansion. These uncertain assignments must not be treated as hard labels.

Overall, 444/496 (89.5%) original question IDs need more context under this review. That does not mean the same percentage of retrieval failures is explained by vague wording: this analysis did not assign causes to failures or grade alternate-source answers.

No questions can be confirmed as actual follow-ups from this dataset: no preceding conversation accompanies them. The second and third groups could be answered after a suitable preceding turn or paper context, but we do not invent that history. Clarification can ask about a method/topic/experiment; it need not demand a filename.

Standalone/searchable does not mean a uniquely correct single-source answer. General questions can reasonably have several correct source-attributed answers. Future no-selection evaluation should score that behaviour rather than automatically penalize every non-original-paper result. The other groups should test conversation understanding or clarification, not forced recovery of an unknown original paper.

## Files

- questions.jsonl: every original question ID, group, reason, case membership, flags and borderline notes.
- cases.jsonl: the same assignments expanded to all 610 PDF/DOCX case units.
- standalone.jsonl, topical_missing_context.jsonl, generic_missing_context.jsonl: separate question lists.
- borderline.jsonl: all explicitly uncertain assignments.
- summary.json: counts, group definitions and input hashes.
- group.mjs: reproducible reviewed assignments and artifact builder.

No retrieval or answer-quality percentage was recalculated. These labels must be reviewed/frozen before any new evaluation that uses them for selection. The held-out test papers remain untouched.
