# Real request path and experiment variants

## Standalone request

1. src/server.ts: POST /query reads body.question unchanged. Request options allow collection/topK/scoreThreshold, not documentId.
2. src/rag.ts: retrieveForQuestion resolves document scope from original user text. With no history it passes that same question to retrieve().
3. src/retrieval/retriever.ts: expandAcronyms(question) becomes queryText.
4. src/retrieval/embedder.ts: embeds search_query: + queryText through local Ollama /api/embed.
5. Hybrid mode uses sparseVectorFor(queryText, frozen average length), with no search_query prefix. It first runs the unchanged dense relevance gate at0.63. Source default mode is dense, which does not run keyword search. Both comparison arms explicitly retain hybrid, so P is a production-query/scoping comparison, not a reproduction of the default search mode.

## Document selection

The collection is defaulted or supplied by the request. Explicit document references resolve against indexed header/source identities. Resolved references add documentId filters to dense and sparse searches. Missing/ambiguous references return no chunks. A standalone question without an explicit document reference searches the whole selected collection. The normal app has no implicit gold-paper selector. Conversation follow-ups can inherit document scope and can be rewritten; these standalone tests have no history and generate no rewrites.

## A vs P

A replays the current title wrapper and its recorded production scope. P uses the original question and the real unrestricted production scope rule. All459 original questions have no explicit document reference. Both search the same dev-only dataset partition (140PDF papers/33DOCX assets), enforced before network dispatch. P may retrieve any dev paper. Gold hits must belong to the gold paper; an identical short quote in a different paper is not credited.

This partition restriction protects held-out content but differs from a full collection run. The original collection's IDF and frozen sparse statistics remain in use. A/P changes both wording and document scope, so differences cannot be attributed solely to title length.

Exact per-case embedding and keyword inputs are in case-plan.jsonl. Example:

```json
{
  "A": {
    "question": "Regarding the paper \"Dice Loss for Data-imbalanced NLP Tasks\": How are weights dynamically adjusted?",
    "scope": {
      "status": "resolved",
      "references": [
        "Dice Loss for Data-imbalanced NLP Tasks"
      ],
      "documentIds": [
        "781f39d0-514a-4328-81d4-9d93eff47dfa"
      ]
    },
    "keywordInput": "Regarding the paper \"Dice Loss for Data-imbalanced NLP Tasks\": How are weights dynamically adjusted?",
    "embeddingInput": "search_query: Regarding the paper \"Dice Loss for Data-imbalanced NLP Tasks\": How are weights dynamically adjusted?"
  },
  "P": {
    "question": "How are weights dynamically adjusted?",
    "scope": {
      "status": "unrestricted",
      "references": []
    },
    "keywordInput": "How are weights dynamically adjusted?",
    "embeddingInput": "search_query: How are weights dynamically adjusted?"
  }
}
```
