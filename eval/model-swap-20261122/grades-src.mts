// Hand grades (C correct / P partial / W wrong / R refused) for the three new models; Qwen grades come from
// eval/ragbench-20261115/rerank/neurons-grades.json (top10). Writes grades.json.
// Run (repo root): npx tsx eval/model-swap-20261122/grades-src.mts
import fs from "node:fs";
const HERE = "eval/model-swap-20261122";
// n: "glm gemma granite | note"
const G: Record<number, string> = {
  1: "C P W | gemma gives both totals but not the difference; granite wrong numbers",
  2: "R R R", 3: "W C C | glm says Mahone plays Mahone", 4: "C C C", 5: "C C C", 6: "C C W",
  7: "C P W | gemma says four but lists five; granite says eight",
  8: "W C W | glm/granite give Napoli goals, not Italy goals", 9: "C C C", 10: "C C C", 11: "C C W", 12: "C C P",
  13: "C C C", 14: "C C C", 15: "C C C", 16: "P P W | reference ($23.5M) ambiguous", 17: "C C C",
  18: "C C C | reference (Valencia) wrong; document says Riviera, graded against document",
  19: "W R W", 20: "W C P | granite states 57.7% but its working shows 65.4%", 21: "C C C", 22: "R C C",
  23: "C C C", 24: "C C C | granite quotes the passage verbatim", 25: "C C C", 26: "C C C",
  27: "W R P | reference wrong (19 Nov 2016 is a test match, not Six Nations); granite matched the flawed reference",
  28: "W R R", 29: "P P W", 30: "C C C", 31: "C C C", 32: "W C P", 33: "C C W", 34: "R C C",
  35: "W C W | glm/granite answer Indrani Rehman", 36: "W W W | no model gave the reference role", 37: "C C C",
  38: "C C C", 39: "P C C", 40: "C C C", 41: "C C C", 42: "C C P", 43: "C C C", 44: "C C W",
  45: "P P W | granite says increased", 46: "W P P", 47: "C C C", 48: "C C C", 49: "C C C", 50: "C C C",
  51: "W C C | glm gives gross margin 60.3% instead of 39.7%", 52: "C C C", 53: "C C C", 54: "C C C", 55: "C C C",
  56: "R R R", 57: "P P W | reference (25) doubtful", 58: "C C W | granite says Yes (material legal battles)",
  59: "P W R | glm contradictory but gives -$1,560M; gemma says positive while citing 1,250 vs 2,811",
  60: "W C C | glm irrelevant sentence", 61: "W R W | granite 101.0%: its own numbers give 101.5%, arithmetic wrong",
  62: "C C C", 63: "C C C",
  64: "? W C | gemma 2017", 65: "? C C", 66: "? C W | granite truncated/wrong", 67: "? P W | gemma gives both values, no change",
  68: "? C C", 69: "? R C | granite 73,100 (rounding)", 70: "? C C", 71: "? C C", 72: "? C W", 73: "? R R",
  74: "? P W | gemma segment list truncated; granite only '200 countries'", 75: "? C C",
  76: "? C W | granite $76.4M", 77: "? C C", 78: "? W C | gemma 4%; granite flat", 79: "? C C",
  80: "? W W | both wrong figures (reference is a % change, -138.54)",
  81: "? P P | both truncated at 512 tokens; gemma 2 of 3 FY2023 acquisitions, granite 1", 82: "? R W | granite 12.6%",
  83: "? C W | granite Stipe Miocic", 84: "? R R", 85: "? C C", 86: "? C W | granite names Virginia C. Drosos",
  87: "? C C", 88: "? R W | granite 707 (as of 2016)", 89: "? C C", 90: "? C C", 91: "? C C",
  92: "? C P | granite says 1 touchdown (0)", 93: "? C W | granite invents 1957/1962 crowds", 94: "? C C",
  95: "? R W | granite -80.7% from wrong numbers", 96: "? W W | gemma $700M, granite $25M",
  97: "? C W | granite: Ross sixth, no partners, no 'known for'",
  98: "? W W | reference T.R. Zeliang; document says Neiphiu Rio since 8 Mar 2018; graded W like Qwen for consistency",
  99: "? C C", 100: "? R R",
};
const glmLate: Record<number, string> = JSON.parse(fs.existsSync(`${HERE}/grades-glm-late.json`) ? fs.readFileSync(`${HERE}/grades-glm-late.json`, "utf8") : "{}");
const jl = (p: string) => fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const qg = JSON.parse(fs.readFileSync("eval/ragbench-20261115/rerank/neurons-grades.json", "utf8"));
const qwenOf = (id: string, n: number) => {
  const arr = Array.isArray(qg) ? qg : qg.grades ?? Object.values(qg);
  const r = arr.find((x: any) => x.id === id) ?? arr.find((x: any) => x.n === n);
  return r?.top10 ?? null;
};
const out = jl(`${HERE}/prompts.jsonl`).map((p) => {
  const [g, note = ""] = G[p.n].split("|").map((s) => s.trim());
  let [glm, gemma, granite] = g.split(/\s+/);
  let n2 = note;
  if (glm === "?") { const v = glmLate[p.n] ?? "?"; const [gg, nn = ""] = v.split("|").map((s) => s.trim()); glm = gg; if (nn) n2 = [note, `glm: ${nn}`].filter(Boolean).join("; "); }
  return { n: p.n, id: p.id, source: p.source, kind: p.kind, qwen: qwenOf(p.id, p.n), glm, gemma, granite, note: n2 };
});
fs.writeFileSync(`${HERE}/grades.json`, JSON.stringify(out, null, 1) + "\n");
console.log("pending glm:", out.filter((r) => r.glm === "?").length, "qwen missing:", out.filter((r) => !r.qwen).length);
