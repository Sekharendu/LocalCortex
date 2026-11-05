# Fifteen hits:1200 versus 2400 context tokens

Offline replay using the exact existing selectPassages() and contextBudget() functions. Every case receives the same first 15 hits from its saved hybrid top 50 ranking, same question, same source chunks, no history, same ordering/merging/title/neighbour logic. Only chunkedMaxTokens changes from 1200 to 2400. No application default, source file or saved input was edited.

## Final assembled-context coverage

| Per-long-document context cap | Covered cases | Coverage |
|---|---:|---:|
|1200|87/119|73.1%|
|2400|98/119|82.4%|

Gained:11. Lost:0. Both covered:87. Neither:21. The 1200 arm reproduces the previous 119 case results exactly. Empty retrievals remain misses.

This is the same complete eligible answer-quote coverage rule as the earlier tests, applied after context selection/merging. It is not a generated-answer quality measurement or full QASPER evidence-paragraph recall.

## Gained cases

- pdf/1909.11687/d087539e6a38c42f0a521ff2173ef42c0733878e: Why are prior knowledge distillation techniques models are ineffective in producing student models with vocabularies different from the original teacher models?  
- pdf/1802.06024/8f16dc7d7be0d284069841e456ebb2c69575b32b: What baseline is used in the experiments?
- pdf/1710.03348/044f922604b4b3f42ae381419fd5cd5624fa0637: In what cases is attention different from alignment?
- pdf/1909.13104/f0b2289cb887740f9255909018f400f028b1ef26: What types of online harassment are studied?
- pdf/1912.00667/3941401a182a3d6234894a5c8a75d48c6116c45c: Which real-world datasets are used?
- pdf/1910.06592/d3ff2986ca8cb85a9a5cec039c266df756947b43: Based on this paper, what is the more predictive set of features to detect fake news?
- pdf/1908.09246/15e481e668114e4afe0c78eefb716ffe1646b494: What alternative to Gibbs sampling is used?
- pdf/1601.02403/1cb100182508cf55b3509283c0e2bbcd527d625e: How is the data in the new corpus come sourced?
- pdf/2001.01269/0d34c0812f1e69ea33f76ca8c24c23b0415ebc8d: Which hand-crafted features are combined with word 2 vec?
- pdf/1705.01265/a4a1fcef760b133e9aa876ac28145ad98a609927: Which other hyperparameters, other than number of clusters are typically evaluated in this type of research?
- docx/1610.08815/fabf6fdcfb4c4c7affaa1e4336658c1e6635b1bf: Which benchmark datasets are used?

## Lost cases

None.

## Prompt-token accounting

All 238 assembled requests were logged; a 20-request sample covers 10 cases including the largest 2400-token-arm prompt. TotalPromptTokens includes the system instructions plus the complete built user prompt (context, instructions/reminder, question and history) plus the unchanged 32-token template estimate. History is 0 for these standalone dataset questions. The 512-token answer reserve is then added for the 4096 check. Component counts are descriptive because tokenizer boundary effects are not additive.

- Cap 1200: total prompt tokens 333–1604; with 512 reserve 845–2116; every request strictly under 4096:true.
- Cap 2400: total prompt tokens 333–2819; with 512 reserve 845–3331; every request strictly under 4096:true.

These checks use the existing llama 3-tokenizer-js accounting and template estimate. They confirm the application budget, not exact hosted Qwen token counts. No provider calls were made to certify provider tokens.

| Sample case | Cap | System | User prompt | History | Template | Total prompt | Answer reserve | Total plus reserve | Spare within 4096 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|pdf/1911.02855/72f7ef55e150e16dcf97fe443aff9971a32414ef|1200|259|1302|0|32|1593|512|2105|1991|
|pdf/1911.02855/72f7ef55e150e16dcf97fe443aff9971a32414ef|2400|259|2528|0|32|2819|512|3331|765|
|pdf/1912.06262/4477bb513d56e57732fba126944073d414d1f75f|1200|259|1303|0|32|1594|512|2106|1990|
|pdf/1912.06262/4477bb513d56e57732fba126944073d414d1f75f|2400|259|2499|0|32|2790|512|3302|794|
|docx/1606.03676/3ddff6b707767c3dd54d7104fe88b628765cae58|1200|259|1295|0|32|1586|512|2098|1998|
|docx/1606.03676/3ddff6b707767c3dd54d7104fe88b628765cae58|2400|259|2400|0|32|2691|512|3203|893|
|docx/1609.00559/88e62ea7a4d1d2921624b8480b5c6b50cfa5ad42|1200|259|1269|0|32|1560|512|2072|2024|
|docx/1609.00559/88e62ea7a4d1d2921624b8480b5c6b50cfa5ad42|2400|259|2184|0|32|2475|512|2987|1109|
|pdf/1707.05236/ea56148a8356a1918bedcf0a99ae667c27792cfe|1200|259|1296|0|32|1587|512|2099|1997|
|pdf/1707.05236/ea56148a8356a1918bedcf0a99ae667c27792cfe|2400|259|2483|0|32|2774|512|3286|810|
|pdf/1909.08089/b66c9a4021b6c8529cac1a2b54dacd8ec79afa5f|1200|259|1304|0|32|1595|512|2107|1989|
|pdf/1909.08089/b66c9a4021b6c8529cac1a2b54dacd8ec79afa5f|2400|259|2496|0|32|2787|512|3299|797|
|pdf/1710.03348/beac555c4aea76c88f19db7cc901fa638765c250|1200|259|1302|0|32|1593|512|2105|1991|
|pdf/1710.03348/beac555c4aea76c88f19db7cc901fa638765c250|2400|259|2463|0|32|2754|512|3266|830|
|pdf/1601.02403/eac9dae3492e17bc49c842fb566f464ff18c049b|1200|259|1298|0|32|1589|512|2101|1995|
|pdf/1601.02403/eac9dae3492e17bc49c842fb566f464ff18c049b|2400|259|2491|0|32|2782|512|3294|802|
|pdf/1906.07662/d3ca5f1814860a88ff30761fec3d860d35e39167|1200|259|1305|0|32|1596|512|2108|1988|
|pdf/1906.07662/d3ca5f1814860a88ff30761fec3d860d35e39167|2400|259|2487|0|32|2778|512|3290|806|
|docx/1701.08229/82642d3111287abf736b781043d49536fe48c350|1200|259|1298|0|32|1589|512|2101|1995|
|docx/1701.08229/82642d3111287abf736b781043d49536fe48c350|2400|259|2359|0|32|2650|512|3162|934|

Full strings and passages:assembled-prompts.jsonl. Per-case retained/missing quotes:case-results.jsonl. Full token log:prompt-token-log.jsonl. Gains/losses:gained-cases.json,lost-cases.json. Sample component details:prompt-token-sample.json.

The overall 4096 budget,512 reserve,1000 whole-document threshold, title chunk,15 hit count, scoring, builder and selected-paper setting remain unchanged. Source hashes and split are verified unchanged. No new searches, generation, reranking, ingestion, held-out content or app configuration changes.
