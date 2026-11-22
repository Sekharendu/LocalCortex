import { appendFileSync, closeSync, existsSync, openSync, readFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { processAnswer } from './calc.mts';

const configs = {
  granite: { model: '@cf/ibm-granite/granite-4.0-h-micro', cap: 2500, input: .001542, output: .010158 },
  glm: { model: '@cf/zai-org/glm-4.7-flash', cap: 7000, input: .0055, output: .0364 },
};
const variant = process.argv[2] as keyof typeof configs;
const config = configs[variant];
if (!config) throw new Error('Use granite or glm');
const disableThinking = variant === 'glm' && process.argv.includes('--disable-thinking');
const keyFor = (id: string) => disableThinking ? `${id}/direct` : id;
const retryTimedOut = process.argv.includes('--retry-timed-out');
const folder = 'eval/calc-in-code-v3-20261120';
const ledger = `${folder}/heldout-${variant}.jsonl`;
const lock = `${folder}/heldout-${variant}.log`;
const read = (file: string) => existsSync(file) ? readFileSync(file, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)) : [];
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const protocol = JSON.parse(readFileSync(`${folder}/protocol.json`, 'utf8'));
const cases = read(`${folder}/heldout-prompts.jsonl`);
if (cases.length !== 240 || cases.some(row => sha(row.prompt) !== row.promptSha256)) throw new Error('Invalid prepared cases');
const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!account || !/^[a-f0-9]{32}$/i.test(account) || !token) throw new Error('Missing Cloudflare configuration');
const chatEndpoint = process.argv.includes('--chat-endpoint');
const endpoint = chatEndpoint ? 'v1/chat/completions' : `run/${config.model}`;
const fd = openSync(lock, 'wx');
try {
  const history = read(ledger);
  const responses = new Map(history.filter(row => row.kind === 'response').map(row => [row.key,row]));
  const done = new Set(history.filter(row => row.kind === 'answer' && !row.empty).map(row => row.id));
  const processed = new Set(history.filter(row => row.kind === 'answer').map(row => row.id));
  const pending = new Map(history.filter(row => row.kind === 'request' && !responses.has(row.key)).map(row => [row.key,row.reserve]));
  const rejected = new Set(history.filter(row => row.kind==='provider-error' && row.http===429).map(row => row.key));
  let spent = [...responses.values()].reduce((sum,row)=>sum+row.neurons,0);
  let reserved = [...pending.values()].reduce((sum,value)=>sum+value,0);
  let stop: string | undefined;
  let transportFailures = 0;
  let index = 0;
  const maxTokens = 512;
  const write = (row: object) => appendFileSync(ledger, JSON.stringify(row)+'\n');
  const requestKeyFor = (id: string) => {
    const key = keyFor(id);
    if (process.argv.includes('--resume-rejected') && rejected.has(key)) {
      let n = 1;
      while (rejected.has(`${key}/resumed-${n}`)) n++;
      return `${key}/resumed-${n}`;
    }
    const recovery = `${key}/recovery`;
    if (retryTimedOut && (pending.has(key) || responses.get(key)?.raw==='')) return recovery;
    return key;
  };

  async function call(key: string, prompt: string) {
    const messages = [{role:'system',content:protocol.prompts.v3},{role:'user',content:prompt}];
    const options = disableThinking ? { chat_template_kwargs: { enable_thinking: false } } : {};
    const hash = sha(JSON.stringify(disableThinking ? { messages, ...options } : messages));
    const saved = responses.get(key);
    if (saved) {
      if (saved.hash !== hash || saved.model !== config.model) throw new Error(`Configuration changed for ${key}`);
      return saved;
    }
    const reserve = Math.ceil((messages.reduce((n,m)=>n+Buffer.byteLength(m.content),0)+512)*config.input + maxTokens*config.output);
    if (stop || pending.has(key) || spent+reserved+reserve>config.cap) return;
    write({kind:'request',key,hash,model:config.model,reserve,endpoint,at:new Date().toISOString()});
    pending.set(key,reserve);
    reserved+=reserve;
    const start = performance.now();
    let response: Response;
    let body: any;
    try {
      response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/${endpoint}`, {
        method:'POST',redirect:'error',signal:AbortSignal.timeout(variant==='glm'?90000:45000),
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({messages,stream:false,max_tokens:maxTokens,...options,...(chatEndpoint ? {model:config.model} : {})}),
      });
      body = await response.json();
    } catch (error) {
      write({kind:'transport-error',key,error:(error as Error).name});
      if (++transportFailures>=3) stop='Three transport failures without an intervening success';
      return;
    }
    const result = body.result??body;
    const usage = result.usage;
    if (!response.ok || body.success===false || !Number.isFinite(usage?.neurons) || usage.neurons<0) {
      const error = body.errors?.[0] ?? body.error;
      const message = typeof error?.message==='string' ? error.message : '';
      const allocationMessage = message.match(/you have used up your daily free allocation of [0-9,]+ neurons/i)?.[0];
      const category = /daily free allocation|neuron limit|quota exceeded/i.test(message) ? 'quota'
        : /capacity|temporarily unavailable/i.test(message) ? 'capacity' : 'unclassified';
      stop=`HTTP ${response.status}, provider code ${error?.code??'unknown'}, ${category}`;
      write({kind:'provider-error',key,http:response.status,code:error?.code,category,endpoint,
        allocationMessage,retryAfter:response.headers.get('retry-after'),ray:response.headers.get('cf-ray'),
        requestId:response.headers.get('cf-ai-req-id'),at:new Date().toISOString()});
      return;
    }
    const raw = result.choices?.[0]?.message?.content??result.choices?.[0]?.text??result.response;
    const record = {kind:'response',key,model:config.model,hash,raw:typeof raw==='string'?raw:'',usage,neurons:usage.neurons,
      finish:result.choices?.[0]?.finish_reason??result.finish_reason,elapsedMs:Math.round(performance.now()-start)};
    write(record);
    responses.set(key,record);
    pending.delete(key);
    reserved-=reserve;
    spent+=record.neurons;
    transportFailures=0;
    if (record.neurons>reserve || spent+reserved>config.cap) stop='Usage exceeded the reservation';
    return record;
  }

  async function worker() {
    while (!stop && index<cases.length) {
      const row = cases[index++];
      if (done.has(row.id)) continue;
      const requestKey = requestKeyFor(row.id);
      const initial = await call(requestKey,row.prompt);
      if (!initial) continue;
      let final = processAnswer(initial.raw,row.context,row.question);
      let retried = false;
      let retrySkipped = false;
      if (initial.raw && !final.produced && final.reason.startsWith('prose number not in context:')) {
        const retry = await call(`${requestKey}/retry`,`${row.prompt}\n\n${protocol.prompts.retry}`);
        if (retry) {
          retried=true;
          const candidate = processAnswer(retry.raw,row.context,row.question);
          if (candidate.status==='computed' && candidate.placeholdersUsed>0) final=candidate;
        } else retrySkipped=true;
      }
      write({kind:'answer',id:row.id,answer:final.final,status:final.status,reason:final.reason,retried,retrySkipped,empty:!initial.raw.trim(),finish:initial.finish,disableThinking});
      if (initial.raw.trim()) done.add(row.id);
      processed.add(row.id);
      if (processed.size%10===0) console.log(`${variant} ${processed.size}/240 · ${spent.toFixed(1)} Neurons confirmed`);
    }
  }
  // Verify the provider response shape and usage on the first case before filling the request queue.
  if (!history.length || process.argv.includes('--probe') || (disableThinking && !history.some(row=>row.key?.endsWith('/direct')))) {
    const firstCase = cases.find(row=>!done.has(row.id) && !pending.has(requestKeyFor(row.id)));
    const first = firstCase && await call(requestKeyFor(firstCase.id),firstCase.prompt);
    if (!first) stop ??='The first request returned no metered response';
    if (disableThinking && first && !first.raw.trim()) stop='Direct GLM request returned no answer text';
  }
  await Promise.all(Array.from({length:variant==='glm'?3:4},()=>worker()));
  console.log(JSON.stringify({variant,completed:processed.size,withText:done.size,spent,reserved,cap:config.cap,stop:stop??(processed.size===240?'complete':'budget or unconfirmed requests')}));
} finally { closeSync(fd); unlinkSync(lock); }
