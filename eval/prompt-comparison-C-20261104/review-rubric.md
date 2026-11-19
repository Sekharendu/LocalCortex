# Frozen rubric before answer review

Review the question, all gold reference alternatives, annotated evidence, and supplied passages when checking support. Read answers individually in random order with arm, case identity, paired answer, token usage and latency hidden. Do not consult the decode key until all 80 judgments are saved.

- adequate: Answers the core question with material facts and necessary conditions. Accept meaning-preserving paraphrases and any complete legitimate reference alternative. No material contradiction or unsupported addition.
- partial: Useful correct information, but a material requested element or explanation is absent. Names without explanation can be partial where the question needs an explanation.
- wrong: Wrong task, material wrong fact, unsupported claim or confusion of related work with the target paper.
- refused: Explicit refusal or no substantive answer. Separately determine whether sufficient information for a reasonable substantive answer is actually in the supplied passages. Gold annotations alone do not establish prompt availability.

For each answer, record a reason and any ambiguity. QASPER references are alternatives, not a mandatory union. Missing mathematical/table placeholders must not be filled from outside knowledge. Literal quote coverage is a diagnostic, not the semantic answer grade.

Paired comparison: adequate=3, partial=2, wrong=0, refused=0 for task-answer quality. A higher/lower score is improved/worse; equal is same. Wrong versus refused is separately visible, since an appropriate refusal is safer but is not a successfully answered question. Also report adequate-only transitions to avoid hiding the distinction between partial progress and a complete answer.

This is an arm-blinded, shuffled AI reading, not an independent human evaluation. Dataset cases include PDF/DOCX duplicates, so the 40 units are not 40 independent questions. Do not infer statistical certainty or unconditional production superiority.

For negative-control questions, separately classify pure rejection, supported related-information plus correctly stated gap, unsupported answer, or ambiguous. A partial related answer is not counted as pure rejection. Do not count a refusal phrase embedded in a substantive answer as a pure refusal. Record any unsupported claim even if the answer also admits a gap. The reference handbook and off-topic set define missing target facts.

For each dev case, separately record complete/partial/absent needed evidence in the common assembled passages. Exact-quote coverage is retained as a distinct proxy. For C gap sentences and refused-to-answered changes, inspect actual supplied text before deciding whether the gap is real or the answer is supported.

For this C experiment, audit every missing/not-stated/insufficiency claim, including pure refusals. A canonical refusal with complete needed evidence is a false insufficiency claim even if no separate caveat was added. Report extra caveats separately from refusal claims; do not report zero false claims merely because boilerplate caveats disappeared.
