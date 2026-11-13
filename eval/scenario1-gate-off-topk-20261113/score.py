"""Score gate-off top-k results: how often a labelled answer chunk is within the top k.
Uses the Scenario 1 labels (per-question.jsonl relevantChunks, answerable group only = 570).
Run from this folder:  python -X utf8 score.py
"""
import json
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
S1 = HERE.parent / "scenario1-top5-mrr-20261112"
KS = [5, 10, 15, 20, 50]

def jsonl(p):
    with open(p, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]

cases = [c for c in jsonl(S1 / "per-question.jsonl") if c["group"] == "answerable"]
res = {}
for fmt in ("pdf", "docx"):
    p = HERE / f"{fmt}.results.jsonl"
    if p.exists():
        for r in jsonl(p):
            res[(r["caseId"], r["mode"], r["k"])] = [c["chunkIndex"] for c in r["top"]]

rows, missing = [], 0
for c in cases:
    row = {k: c[k] for k in ("caseId", "paperId", "format", "question", "answerKind", "clarity", "previousVerdict", "relevantChunks")}
    rel = set(c["relevantChunks"])
    for mode in ("dense", "hybrid"):
        for k in KS:
            top = res.get((c["caseId"], mode, k))
            if top is None:
                missing += 1
                continue
            rank = next((i + 1 for i, x in enumerate(top) if x in rel), None)
            row[f"{mode}_k{k}_rank"] = rank
            row[f"{mode}_k{k}_returned"] = len(top)
    rows.append(row)

def table(subset, title):
    n = len(subset)
    out = [f"\n{title} ({n} questions)", "k    | dense found      | hybrid found     | either"]
    for k in KS:
        d = sum(1 for r in subset if r.get(f"dense_k{k}_rank"))
        h = sum(1 for r in subset if r.get(f"hybrid_k{k}_rank"))
        e = sum(1 for r in subset if r.get(f"dense_k{k}_rank") or r.get(f"hybrid_k{k}_rank"))
        out.append(f"{k:<4} | {d:>3} ({d/n:6.1%})   | {h:>3} ({h/n:6.1%})   | {e:>3} ({e/n:6.1%})")
    return "\n".join(out)

summary = {"questions": len(rows), "missingResults": missing, "byK": {}}
for k in KS:
    summary["byK"][k] = {m: sum(1 for r in rows if r.get(f"{m}_k{k}_rank")) for m in ("dense", "hybrid")}
    # MRR within k
    summary["byK"][k].update({f"{m}_mrr": round(sum(1 / r[f"{m}_k{k}_rank"] for r in rows if r.get(f"{m}_k{k}_rank")) / len(rows), 3) for m in ("dense", "hybrid")})

text = [f"Missing result rows: {missing}", table(rows, "All answerable")]
for key in ("format", "answerKind", "clarity", "previousVerdict"):
    groups = defaultdict(list)
    for r in rows:
        groups[r[key]].append(r)
    for g, sub in sorted(groups.items()):
        if len(sub) >= 5:
            text.append(table(sub, f"{key} = {g}"))
report = "\n".join(text)
(HERE / "report.txt").write_text(report + "\n", encoding="utf-8")
(HERE / "summary.json").write_text(json.dumps(summary, indent=1) + "\n", encoding="utf-8")
with open(HERE / "per-question.jsonl", "w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
print(report)
