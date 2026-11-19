# Paired answer review

Review method: AI-assisted case-by-case reading of the question, both generated answers, original reference alternatives and the actual supplied passages when needed. This is not an independent human-certified or official QASPER score. Assess meaning and support; exact answer-string repetition is not the grading rule.

- correct: answers the core question adequately and preserves necessary facts/conditions; no material unsupported or contradictory claim in the supplied prompt.
- partial: contains useful correct information but leaves out material components or gives labels without the explanation necessary to answer the question.
- incorrect: answers the wrong task, attributes related work to the target paper, includes a materially wrong fact, or makes material unsupported claims.
- refused: does not answer; record separately whether available passages supported an answer. A justified refusal is safe behavior but is not a successfully answered dataset question.
- ambiguous: annotations, question or source do not permit a firm judgment; keep visible and do not silently force a pass/fail.
- service_error: no usable answer returned; keep separate from semantic judgments.

Reference answers are alternatives, not a mandatory union. Read all retained original reference alternatives for semantic review, even if an alternative was excluded from strict quote scoring because it did not match extracted text. Table/bibliography/math placeholders in the source are not silently repaired. Meaning-preserving paraphrases may be correct even without an exact reference-string match.

The same rubric applies to both depths. Reasons and unresolved details are recorded per case. A paired change is an improvement only if a previously non-correct answer becomes correct; damage is a correct answer becoming non-correct. Partial-to-partial changes are described but are not counted as successful complete answers.
