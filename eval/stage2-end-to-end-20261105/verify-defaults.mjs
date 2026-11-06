import fs from 'node:fs';
import crypto from 'node:crypto';
const legacy=process.argv.includes('--legacy');
process.env.RAG_PROFILE=legacy?'legacy':'new';
for(const key of ['RETRIEVE_TOP_K','CHUNKED_DOC_MAX_TOKENS','OLLAMA_NUM_CTX'])delete process.env[key];
const [{answerSettings,answerConfig},{buildPrompt},{RAG_SYSTEM_PROMPT,LEGACY_RAG_SYSTEM_PROMPT},{C_SYSTEM_PROMPT}]=await Promise.all([
 import('../../src/config.ts'),import('../../src/generation/promptBuilder.ts'),import('../../src/generation/llm.ts'),import('../../src/generation/promptVariants.ts')]);
const settings=answerSettings();
if(settings.topK!==(legacy?5:15)||settings.numCtx!==(legacy?4096:5000)||settings.chunkedDocMaxTokens!==(legacy?1200:3200)||answerConfig.maxOutputTokens!==512)throw Error('Wrong profile defaults');
if(RAG_SYSTEM_PROMPT!==(legacy?LEGACY_RAG_SYSTEM_PROMPT:C_SYSTEM_PROMPT))throw Error('Wrong default system');
const original=fs.readFileSync('eval/prompt-comparison-C-20261104/requests.jsonl','utf8').trim().split(/\r?\n/u).map(JSON.parse).filter(r=>r.id===(legacy?'A':'C'));
for(const r of original)if(buildPrompt(r.question,r.passages,[])!==r.prompt||RAG_SYSTEM_PROMPT!==r.system)throw Error('Historical profile prompt differs');
const result={profile:answerConfig.profile,settings,maxOutputTokens:answerConfig.maxOutputTokens,historicalPromptsExactlyReproduced:original.length,
 systemSha256:crypto.createHash('sha256').update(RAG_SYSTEM_PROMPT).digest('hex'),networkCalls:0};
fs.writeFileSync(`eval/stage2-end-to-end-20261105/defaults-${legacy?'legacy':'new'}.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
