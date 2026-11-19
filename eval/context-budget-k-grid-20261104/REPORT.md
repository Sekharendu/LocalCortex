# Context budget × retained hits: saved hybrid replay

Same 119 longer-quote dev cases, same selected paper, existing builder logic, scoring,4096 overall estimate and 512 answer reserve. Only the requested caps 2400/3200 and hit counts 15/20 differ. No searches, generation, hosted calls, ingestion or application changes. The saved k 50 ranking is sliced; this is not a fresh independent retrieve(k 15/k 20) run.

## Coverage and flips versus 2400/k 15

| Context cap | k | Covered | Coverage | Gained | Lost | Net |
|---|---:|---:|---:|---:|---:|---:|
|2400|15|98/119|82.4%|0|0|+0|
|2400|20|98/119|82.4%|4|4|+0|
|3200|15|104/119|87.4%|6|0|+6|
|3200|20|106/119|89.1%|8|0|+8|

The 2400/k 15 baseline reproduces all 119 previous assembled contexts and prompt strings exactly, including 98 covered cases. Coverage requires every literal quote of one eligible reference answer in the assembled passages; it does not grade generated answers.

## 2400-k 15: case flips

**Gained:**

None.

**Lost:**

None.

## 2400-k 20: case flips

**Gained:**

- pdf/1912.00667/43f074bacabd0a355b4e0f91a1afd538c0a6244f: How is the keyword specific expectation elicited from the crowd?
- pdf/1909.06200/62f27fe08ddb67f16857fab2a8a721926ecbb6fb: Who judged the irony accuracy, sentiment preservation and content preservation?
- pdf/1612.08205/935d6a6187e6a0c9c0da8e53a42697f853f5c248: What do they mean by a person's industry?
- docx/1703.10344/fb1227b3681c69f60eb0539e16c5a8cd784177a7: What features are used to represent the salience and relative authority of entities?

**Lost:**

- pdf/1912.00667/3941401a182a3d6234894a5c8a75d48c6116c45c: Which real-world datasets are used?
- pdf/1908.09246/15e481e668114e4afe0c78eefb716ffe1646b494: What alternative to Gibbs sampling is used?
- pdf/1601.02403/1cb100182508cf55b3509283c0e2bbcd527d625e: How is the data in the new corpus come sourced?
- docx/1610.08815/fabf6fdcfb4c4c7affaa1e4336658c1e6635b1bf: Which benchmark datasets are used?

## 3200-k 15: case flips

**Gained:**

- pdf/1810.08699/18c5d366b1da8447b5404eab71f4cc658ba12e6f: what ner models were evaluated?
- pdf/1802.06024/585626d18a20d304ae7df228c2128da542d248ff: What metrics are used to establish that this makes chatbots more knowledgeable and better at learning and conversation? 
- pdf/1612.08205/935d6a6187e6a0c9c0da8e53a42697f853f5c248: What do they mean by a person's industry?
- pdf/1903.03530/2c85865a65acd429508f50b5e4db9674813d67f2: Which data do they use as a starting point for the dialogue dataset?
- pdf/1908.04042/b4f881331b975e6e4cab1868267211ed729d782d: how large is the vocabulary?
- pdf/1705.01265/12159f04e0427fe33fa05af6ba8c950f1a5ce5ea: Which hyperparameters were varied in the experiments on the four tasks?

**Lost:**

None.

## 3200-k 20: case flips

**Gained:**

- pdf/1810.08699/18c5d366b1da8447b5404eab71f4cc658ba12e6f: what ner models were evaluated?
- pdf/1912.00667/43f074bacabd0a355b4e0f91a1afd538c0a6244f: How is the keyword specific expectation elicited from the crowd?
- pdf/1909.06200/62f27fe08ddb67f16857fab2a8a721926ecbb6fb: Who judged the irony accuracy, sentiment preservation and content preservation?
- pdf/1612.08205/935d6a6187e6a0c9c0da8e53a42697f853f5c248: What do they mean by a person's industry?
- pdf/1903.03530/2c85865a65acd429508f50b5e4db9674813d67f2: Which data do they use as a starting point for the dialogue dataset?
- pdf/1908.04042/b4f881331b975e6e4cab1868267211ed729d782d: how large is the vocabulary?
- pdf/1705.01265/12159f04e0427fe33fa05af6ba8c950f1a5ce5ea: Which hyperparameters were varied in the experiments on the four tasks?
- docx/1703.10344/fb1227b3681c69f60eb0539e16c5a8cd784177a7: What features are used to represent the salience and relative authority of entities?

**Lost:**

None.

## Prompt budget checks

All 476 assembled prompts were logged. Total prompt includes system, complete built user prompt(instructions/context/question/history), plus the existing 32 template-token estimate. Each check then adds the unchanged 512 answer reserve. History is 0 for these standalone questions.

| Variant | Largest total prompt | Largest prompt plus reserve | Minimum spare below 4096 | Violations |
|---|---:|---:|---:|---:|
|2400-k 15|2819|3331|765|0|
|2400-k 20|2819|3331|765|0|
|3200-k 15|3568|4080|16|0|
|3200-k 20|3567|4079|17|0|

A 3200 per-document cap is still limited by the existing overall contextBudget(). Effective limits are recorded per request; raising the cap does not raise 4096 or reduce the answer reserve. These are the existing application estimates, not exact Qwen provider counts. No answers were generated to test noise or quality.

All per-case retained/missing quotes and passage hashes are in case-results.jsonl; flips.json contains the exact gained/lost cases and all arms; assembled-prompts.jsonl stores the final passages/prompts; prompt-token-log.jsonl contains every token count. Application defaults and prior results remain unchanged.
