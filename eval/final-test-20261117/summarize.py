"""FINAL TEST (approved one-off run, Nov 17): search vs 50/50 blend vs reranker only on the held-out test sets.
Blend exactly as eval/ragbench-20261115/rerank/fusion.py: fused = 0.5/(60+rerank_rank) + 0.5/(60+search_rank), ranks from 0,
Python's stable sort keeps search order on ties. MRR is over the 20 candidates (as fusion.py). Gate shortcut as score.mts:
"refused" = best dense score < 0.63. Nothing here was tuned on these results (weight 0.5 fixed in advance from dev).
Run (repo root): python -X utf8 eval/final-test-20261117/summarize.py -> summary.json + printed tables
"""
import json, collections
from pathlib import Path
HERE = Path(__file__).parent
GATE, W, KS = 0.63, 0.5, (1, 5, 10, 15)
jl = lambda p: [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()] if p.exists() else []

def orders(r, sc):
    cand = r["hybrid"]
    s = {int(k): v for k, v in sc.items()}
    rr = {x: i for i, x in enumerate(sorted(cand, key=lambda x: -s[x]))}
    blend = sorted(cand, key=lambda x: -(W / (60 + rr[x]) + (1 - W) / (60 + cand.index(x))))
    return {"search": cand, "blend": blend, "reranker": sorted(cand, key=lambda x: -s[x])}

def rank(lst, rel):
    for i, x in enumerate(lst, 1):
        if x in rel: return i
    return None

def table(rows):
    out = {"scored": len(rows), "gateRefused": sum(1 for r in rows if (r["topDense"] or 0) < GATE)}
    for m in ("search", "blend", "reranker"):
        rk = [r["ranks"][m] for r in rows]
        for k in KS:
            out[f"{m}_top{k}"] = sum(1 for x in rk if x and x <= k)
            out[f"{m}_top{k}_gateOn"] = sum(1 for r in rows if r["ranks"][m] and r["ranks"][m] <= k and (r["topDense"] or 0) >= GATE)
        out[f"{m}_mrr"] = round(sum(1 / x for x in rk if x) / len(rows), 3) if rows else None
    for m in ("blend", "reranker"):
        for k in KS:
            out[f"{m}_top{k}_fixed"] = sum(1 for r in rows if (r["ranks"][m] or 99) <= k < (r["ranks"]["search"] or 99))
            out[f"{m}_top{k}_broke"] = sum(1 for r in rows if (r["ranks"]["search"] or 99) <= k < (r["ranks"][m] or 99))
    return out

summary = {"gate": GATE, "blendWeight": W, "sets": {}}
for name, files, groupKey in (("ragbench", ["ragbench"], "source"), ("qasper", ["qasper-pdf", "qasper-docx"], "format")):
    cands, scores = [], {}
    for f in files:
        cands += jl(HERE / f"candidates-{f}.jsonl")
        scores.update({s["id"]: s for s in jl(HERE / f"scores-{f}.jsonl")})
    if not cands: continue
    groups = collections.Counter(r["group"] for r in cands)
    ans = [r for r in cands if r["group"] == "answerable"]
    missing = [r["id"] for r in ans if r["id"] not in scores]
    rows = []
    for r in ans:
        if r["id"] not in scores: continue
        o = orders(r, scores[r["id"]]["scores"])
        rows.append({**r, "ranks": {m: rank(v, set(r["relevant"])) for m, v in o.items()}})
    secs = sorted(scores[r["id"]]["seconds"] for r in rows)
    s = {"questions": len(cands), "groups": dict(groups), "answerableNotYetScored": len(missing),
         "rerankerSecondsPerQuestion": {"median": secs[len(secs) // 2], "mean": round(sum(secs) / len(secs), 2)} if secs else None,
         "all": table(rows), "by": {g: table([r for r in rows if r[groupKey] == g]) for g in sorted({r[groupKey] for r in rows})}}
    summary["sets"][name] = s
    with open(HERE / f"per-question-{name}.jsonl", "w", encoding="utf-8") as fo:
        for r in rows:
            fo.write(json.dumps({k: r[k] for k in ("id", "source", "format", "question", "relevant", "topDense", "ranks")}) + "\n")
json.dump(summary, open(HERE / "summary.json", "w", encoding="utf-8"), indent=1)

pct = lambda a, b: f"{a} ({100 * a / b:.1f}%)" if b else "-"
for name, s in summary["sets"].items():
    print(f"\n=== {name}: {s['questions']} questions, groups {s['groups']}, not yet scored {s['answerableNotYetScored']}, reranker s/q {s['rerankerSecondsPerQuestion']}")
    for g, t in [("all", s["all"])] + list(s["by"].items()):
        d = t["scored"]
        print(f"-- {g}: scored {d}, gate would refuse {t['gateRefused']}")
        for k in KS:
            print(f"   top {k:>2}: search {pct(t[f'search_top{k}'], d)} | blend {pct(t[f'blend_top{k}'], d)} (fixed {t[f'blend_top{k}_fixed']}, broke {t[f'blend_top{k}_broke']})"
                  f" | reranker {pct(t[f'reranker_top{k}'], d)} | gate on: search {t[f'search_top{k}_gateOn']}, blend {t[f'blend_top{k}_gateOn']}")
        print(f"   MRR: search {t['search_mrr']} | blend {t['blend_mrr']} | reranker {t['reranker_mrr']}")
