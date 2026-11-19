"""Step 2b: blend search rank with reranker rank, fused = w/(60+rerank_rank) + (1-w)/(60+search_rank).
w = 0.5 is fixed in advance (chosen on the QASPER papers, §14); other weights are printed for information only.
Uses stored scores, no model calls. Run (repo root): python -X utf8 eval/ragbench-20261115/rerank/fusion.py
"""
import json
from pathlib import Path
HERE = Path(__file__).parent
rows = {r["id"]: r for r in (json.loads(l) for l in open(HERE / "candidates.jsonl", encoding="utf-8") if l.strip())}
sc = {r["id"]: r["scores"] for r in (json.loads(l) for l in open(HERE / "scores.jsonl", encoding="utf-8") if l.strip())}
ids = [i for i in rows if i in sc]

def order(r, mode, n, w):
    cand = [str(c) for c in r[mode][:n]]
    rr = {x: i for i, x in enumerate(sorted(cand, key=lambda x: -sc[r["id"]][x]))}
    return [int(x) for x in sorted(cand, key=lambda x: -(w / (60 + rr[x]) + (1 - w) / (60 + cand.index(x))))]

def rank(lst, rel):
    for i, c in enumerate(lst):
        if c in rel: return i + 1
    return None

per = {}
for i in ids:
    r = rows[i]
    per[i] = {"source": r["source"], "area": r["area"]}
    for mode in ("hybrid", "dense"):
        per[i][f"{mode}_search"] = rank(r[mode][:20], r["relevant"])
        per[i][f"{mode}_blend"] = rank(order(r, mode, 20, 0.5), r["relevant"])
        per[i][f"{mode}_rerank"] = rank(order(r, mode, 20, 1.0), r["relevant"])
json.dump(per, open(HERE / "fusion-per-question.json", "w", encoding="utf-8"))

def line(rs, mode, v):
    top = lambda k, x: sum(1 for p in rs if p[f"{mode}_{x}"] and p[f"{mode}_{x}"] <= k)
    fixed = lambda k: sum(1 for p in rs if (p[f"{mode}_{v}"] or 99) <= k < (p[f"{mode}_search"] or 99))
    broke = lambda k: sum(1 for p in rs if (p[f"{mode}_search"] or 99) <= k < (p[f"{mode}_{v}"] or 99))
    mrr = lambda x: sum(1 / p[f"{mode}_{x}"] for p in rs if p[f"{mode}_{x}"]) / len(rs)
    return {f"top{k}": f"{top(k,'search')} -> {top(k,v)} (fixed {fixed(k)}, broke {broke(k)})" for k in (1, 5, 15)} | {"mrr": f"{mrr('search'):.3f} -> {mrr(v):.3f}"}

summary = {"questions": len(ids), "candidates": 20, "groups": {}}
groups = [("all", lambda p: True), ("financebench", lambda p: p["source"] == "financebench"), ("tat", lambda p: p["source"] == "tat"),
          ("nq", lambda p: p["source"] == "nq"), ("feta", lambda p: p["source"] == "feta")]
for g, f in groups:
    rs = [p for p in per.values() if f(p)]
    summary["groups"][g] = {"questions": len(rs)} | {f"{m}_{v}": line(rs, m, v) for m in ("hybrid", "dense") for v in ("blend", "rerank")}
grid = {}
for mode in ("hybrid", "dense"):
    for w in (0.0, 0.3, 0.5, 0.7, 1.0):
        grid[f"{mode} w={w}"] = sum(1 for i in ids if (rank(order(rows[i], mode, 20, w), rows[i]["relevant"]) or 99) <= 5)
summary["top5_by_weight_info_only"] = grid
secs = [json.loads(l)["seconds"] for l in open(HERE / "scores.jsonl", encoding="utf-8") if l.strip()]
summary["reranker_seconds_per_question"] = {"median": sorted(secs)[len(secs) // 2], "mean": round(sum(secs) / len(secs), 2)}
json.dump(summary, open(HERE / "fusion-summary.json", "w", encoding="utf-8"), indent=1)
print(json.dumps(summary, indent=1))
