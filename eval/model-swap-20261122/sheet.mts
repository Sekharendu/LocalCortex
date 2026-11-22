// Print a compact grading view (question, reference, the four answers) for questions n in [from, to].
// Run (repo root): npx tsx eval/model-swap-20261122/sheet.mts 1 25
import fs from "node:fs";
const HERE = "eval/model-swap-20261122";
const jl = (p: string) => fs.existsSync(p) ? fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const [from, to] = [Number(process.argv[2] ?? 1), Number(process.argv[3] ?? 100)];
const qwen = new Map(jl("eval/ragbench-20261115/rerank/neurons-top10-vs-top15.jsonl").filter((r) => r.config === "top10" && r.rep === 1).map((r) => [r.id, r]));
const res = Object.fromEntries(["glm", "gemma", "granite"].map((m) => [m, new Map(jl(`${HERE}/results-${m}.jsonl`).filter((r) => !r.error).map((r) => [r.id, r]))]));
const one = (s: string) => String(s ?? "—").replace(/\s+/g, " ").trim().slice(0, 600);
for (const p of jl(`${HERE}/prompts.jsonl`)) {
  if (p.n < from || p.n > to) continue;
  console.log(`\n## ${p.n} ${p.id} [${p.kind}]\nQ: ${one(p.question)}\nREF: ${one(p.reference)}`);
  console.log(`qwen${p.kind === "gold-added" ? "(old prompt)" : ""}: ${one(qwen.get(p.id)?.answer)}`);
  for (const m of ["glm", "gemma", "granite"]) console.log(`${m}: ${one(res[m].get(p.id)?.answer)}`);
}
