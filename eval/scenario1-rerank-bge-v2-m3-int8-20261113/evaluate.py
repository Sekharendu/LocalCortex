"""Compare search-only vs search + int8 bge-reranker-v2-m3 on the answerable dev questions.
Reranked list = candidates (gate-off dense/hybrid top-20 or top-50) sorted by reranker score.
Baseline = the same search with no reranker (gate-off top-k rows). Only questions with scores are counted.
Run from repo root:  python -X utf8 eval/scenario1-rerank-bge-v2-m3-int8-20261113/evaluate.py
"""
import json, statistics
from collections import defaultdict
from pathlib import Path
HERE = Path(__file__).parent; EVAL = HERE.parent
def jl(p): return [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]
cases = {c["caseId"]: c for c in jl(EVAL / "scenario1-top5-mrr-20261112/per-question.jsonl") if c["group"] == "answerable"}
lists = {}
for f in ("pdf", "docx"):
    for r in jl(EVAL / f"scenario1-gate-off-topk-20261113/{f}.results.jsonl"):
        lists[(r["caseId"], r["mode"], r["k"])] = [c["chunkIndex"] for c in r["top"]]
sc = {r["caseId"]: r for r in jl(HERE / "scores.jsonl")}
ids = [i for i in cases if i in sc]
FINAL = [3, 5, 10, 15]
def found(lst, cid, k):
    rel = set(cases[cid]["relevantChunks"])
    return next((i + 1 for i, x in enumerate(lst[:k]) if x in rel), None)
def reranked(cid, mode, n):
    s = sc[cid]["scores"]
    return sorted(lists[(cid, mode, n)], key=lambda x: -s[str(x)])
def search(cid, mode, k):
    return lists[(cid, mode, k)] if (cid, mode, k) in lists else lists[(cid, mode, 50)]
rows, out, summary = {}, [], {"questions": len(ids)}
for sub, sel in (("All", ids), ("DOCX", [i for i in ids if cases[i]["format"] == "docx"]), ("PDF", [i for i in ids if cases[i]["format"] == "pdf"])):
    N = len(sel)
    if not N: continue
    out.append(f"\n{sub} ({N} answerable questions) — right chunk within the final top k")
    out.append("mode   final k | search only    | rerank top-20  | rerank top-50")
    for mode in ("dense", "hybrid"):
        for k in FINAL:
            a = sum(1 for i in sel if found(search(i, mode, k), i, k))
            b = sum(1 for i in sel if found(reranked(i, mode, 20), i, k))
            c = sum(1 for i in sel if found(reranked(i, mode, 50), i, k))
            out.append(f"{mode:<6} {k:<7} | {a:>3} ({a/N:6.1%})  | {b:>3} ({b/N:6.1%})  | {c:>3} ({c/N:6.1%})")
            summary[f"{sub}_{mode}_k{k}"] = {"search": a, "rerank20": b, "rerank50": c, "n": N}
        mrr = lambda f: sum(1 / r for i in sel if (r := f(i))) / N
        out.append(f"{mode:<6} MRR@5   | {mrr(lambda i: found(search(i, mode, 5), i, 5)):.3f}          | {mrr(lambda i: found(reranked(i, mode, 20), i, 5)):.3f}          | {mrr(lambda i: found(reranked(i, mode, 50), i, 5)):.3f}")
out.append("\nTop-5 wins/losses vs search only (All):")
for mode in ("dense", "hybrid"):
    for n in (20, 50):
        w = sum(1 for i in ids if found(reranked(i, mode, n), i, 5) and not found(search(i, mode, 5), i, 5))
        l = sum(1 for i in ids if found(search(i, mode, 5), i, 5) and not found(reranked(i, mode, n), i, 5))
        out.append(f"  {mode} rerank top-{n}: gains {w}, loses {l}, net {w - l:+d}")
# latency on this CPU: per-pair time from each question's run, scaled to 20 / 50 candidates
pp = [sc[i]["seconds"] / sc[i]["pairs"] for i in ids]
for n in (20, 50):
    v = sorted(p * n for p in pp)
    out.append(f"Reranking time for {n} candidates: median {statistics.median(v):.1f}s, p95 {v[int(0.95 * (len(v) - 1))]:.1f}s")
    summary[f"latency{n}"] = {"median": round(statistics.median(v), 2), "p95": round(v[int(0.95 * (len(v) - 1))], 2)}
rep = "\n".join(out)
(HERE / "report.txt").write_text(rep + "\n", encoding="utf-8")
(HERE / "summary.json").write_text(json.dumps(summary, indent=1) + "\n", encoding="utf-8")
print(rep)
