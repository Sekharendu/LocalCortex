// Step 3: let the answer model (Cloudflare qwen3-30b, thinking off) pick the best 5 of today's hybrid top 15.
// Final order = the model's picks, then the rest in search order (so top 15 is unchanged, only the order moves).
// 100 dev questions, fixed sample (sha1 of id), resumable. One Cloudflare call per question.
// Run (repo root): npx tsx eval/ragbench-20261115/rerank/llm-rerank.mts [--n 100]
import fs from "node:fs";
import crypto from "node:crypto";
for (const l of fs.readFileSync(".env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { GENERATION_MODEL } = await import("../../../src/generation/llm.ts");
async function call(p: string, system: string) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${GENERATION_MODEL}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
    body: JSON.stringify({ prompt: `<|im_start|>system
${system}<|im_end|>
<|im_start|>user
${p}<|im_end|>
<|im_start|>assistant
<think>

</think>

`, raw: true, stream: false, max_tokens: 40, temperature: 0 }) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j: any = await r.json(); const res = j.result ?? j;
  return { text: String(res.choices?.[0]?.text ?? res.response ?? "").trim(), usage: res.usage ?? null };
}
const HERE = "eval/ragbench-20261115/rerank";
const N = Number(process.argv[process.argv.indexOf("--n") + 1]) || 100;
const rows = fs.readFileSync(`${HERE}/candidates.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const h = (s: string) => crypto.createHash("sha1").update("llm-rerank:" + s).digest("hex");
const sample = [...rows].sort((a, b) => h(a.id).localeCompare(h(b.id))).slice(0, N);
const outPath = `${HERE}/llm-rerank-usage.jsonl`;
const done = new Set(fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).id) : []);

const SYSTEM = "You rank text passages for a search engine. You judge only which passages contain the information needed to answer the question. You never answer the question yourself.";
function prompt(question: string, passages: string[]): string {
  return `Question: ${question}\n\nPassages:\n\n` + passages.map((t, i) => `[${i + 1}] ${t.replace(/\s+/g, " ").slice(0, 1500)}`).join("\n\n") +
    `\n\nWhich passages contain the information needed to answer the question? List the numbers of the 5 most useful passages, most useful first, as a JSON array such as [4, 1, 9, 2, 12]. Output only the array.`;
}
const rank = (lst: number[], rel: number[]) => { const i = lst.findIndex((c) => rel.includes(c)); return i < 0 ? null : i + 1; };

let n = 0;
for (const r of sample) {
  n++;
  if (done.has(r.id)) continue;
  const cand: number[] = r.hybrid.slice(0, 15);
  const p = prompt(r.query, cand.map((c) => r.texts[c]));
  let raw = "", err = "", ms = 0, usage: any = null;
  for (let attempt = 1; attempt <= 3 && !raw; attempt++) {
    const t = Date.now();
    try { const o = await call(p, SYSTEM); raw = o.text; usage = o.usage; }
    catch (e) { err = String(e).slice(0, 160); await new Promise((res) => setTimeout(res, 3000 * attempt)); }
    ms = Date.now() - t;
  }
  const picks: number[] = [];
  const m = raw.match(/\[[^\]]*\]/);
  if (m) for (const x of m[0].match(/\d+/g) ?? []) { const k = Number(x); if (k >= 1 && k <= cand.length && !picks.includes(k)) picks.push(k); }
  const parsed = picks.length > 0;
  const order = [...picks.map((k) => cand[k - 1]), ...cand.filter((c) => !picks.some((k) => cand[k - 1] === c))];
  const rec = { usage, id: r.id, source: r.source, area: r.area, raw, parsed, error: raw ? "" : err, ms, promptChars: p.length,
    search: rank(cand, r.relevant), llm: rank(order, r.relevant) };
  fs.appendFileSync(outPath, JSON.stringify(rec) + "\n");
  if (n % 10 === 0) console.log(JSON.stringify({ n: `${n}/${sample.length}`, last: rec }));
}
console.log(JSON.stringify({ finished: true }));
