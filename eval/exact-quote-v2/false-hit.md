# Previous false hit

Case: pdf/1911.02855/20e38438471266ce021817c6364f6a46d01564f2

Question: How are weights dynamically adjusted?

## Entire retrieved chunk 3

```text
associate training examples with dynamically
adjusted weights to deemphasize easy-negative
examples. Experimental results show that this
strategy narrows down the gap between the F1
score in evaluation and the dice loss in training.
With the proposed training objective, we ob-
serve significant performance boosts over a
wide range of data imbalanced NLP tasks.
Notably, we are able to achieve SOTA re-
sults on CTB5, CTB6 and UD1.4 for the part
of speech tagging task, and competitive or
```

## Entire gold answer quote

```text
associates each training example with a weight in proportion to $(1-p)$, and this weight dynamically changes as training proceeds
```

The old rule accepted any cited diagnostic chunk identity. This chunk mentions dynamic weighting but does not contain the answer's weight formula. The new exact-quote test rejects it. The LaTeX annotation is also not literally locatable in the rendered PDF using whitespace normalization alone; it must remain unmapped rather than receive an invented range.
