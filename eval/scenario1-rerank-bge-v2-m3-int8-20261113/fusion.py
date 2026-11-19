"""Free follow-up: blend search rank with reranker rank (weighted RRF) instead of replacing the order.
fused = w/(60+rerank_rank) + (1-w)/(60+search_rank). Uses stored scores; no model calls.
Run from repo root: python -X utf8 eval/scenario1-rerank-bge-v2-m3-int8-20261113/fusion.py"""
import json
from pathlib import Path
HERE = Path(__file__).parent; EVAL = HERE.parent
jl = lambda p: [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]
cases = {c["caseId"]: c for c in jl(EVAL / "scenario1-top5-mrr-20261112/per-question.jsonl") if c["group"] == "answerable"}
lists = {}
for f in ("pdf", "docx"):
    for r in jl(EVAL / f"scenario1-gate-off-topk-20261113/{f}.results.jsonl"):
        lists[(r["caseId"], r["mode"], r["k"])] = [c["chunkIndex"] for c in r["top"]]
sc = {r["caseId"]: r["scores"] for r in jl(HERE / "scores.jsonl")}
ids = [i for i in cases if i in sc]
def hit(lst, cid, k): return any(x in set(cases[cid]["relevantChunks"]) for x in lst[:k])
for mode in ("dense", "hybrid"):
    for n in (20, 50):
        line = []
        for w in (0.0, 0.3, 0.5, 0.7, 1.0):
            tot = {}
            for cid in ids:
                cand = lists[(cid, mode, n)]
                rr = {x: i for i, x in enumerate(sorted(cand, key=lambda x: -sc[cid][str(x)]))}
                fused = sorted(cand, key=lambda x: -(w / (60 + rr[x]) + (1 - w) / (60 + cand.index(x))))
                for k in (3, 5): tot[k] = tot.get(k, 0) + hit(fused, cid, k)
            line.append(f"w={w}: top3 {tot[3]}, top5 {tot[5]}")
        print(f"{mode} top-{n} candidates | " + " | ".join(line))
print(f"({len(ids)} questions; w=0 is search only, w=1 is reranker only)")
