"""Compare qwen3-embedding:0.6b vs nomic (gate off) on the same answerable questions."""
import json
from pathlib import Path
HERE = Path(__file__).parent
S1 = HERE.parent / "scenario1-top5-mrr-20261112"
NOMIC = HERE.parent / "scenario1-gate-off-topk-20261113"
KS = [5, 10, 15, 20, 50]
def jsonl(p):
    with open(p, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]
cases = {c["caseId"]: c for c in jsonl(S1 / "per-question.jsonl") if c["group"] == "answerable"}
def load(d):
    res = {}
    for fmt in ("pdf", "docx"):
        p = d / f"{fmt}.results.jsonl"
        if p.exists():
            for r in jsonl(p):
                res[(r["caseId"], r["mode"], r["k"])] = [c["chunkIndex"] for c in r["top"]]
    return res
q, n = load(HERE), load(NOMIC)
ids = sorted({cid for (cid, _, _) in q if cid in cases})
def rank(res, cid, mode, k):
    top = res.get((cid, mode, k)); rel = set(cases[cid]["relevantChunks"])
    return next((i + 1 for i, x in enumerate(top) if x in rel), None)
out, summary = [], {}
for sub, sel in (("All", ids), ("DOCX", [i for i in ids if cases[i]["format"] == "docx"]), ("PDF", [i for i in ids if cases[i]["format"] == "pdf"])):
    N = len(sel); out.append(f"\n{sub} ({N} answerable questions)")
    out.append("mode   k  | nomic         | qwen          | margin")
    for mode in ("dense", "hybrid"):
        for k in KS:
            a = sum(1 for i in sel if rank(n, i, mode, k)); b = sum(1 for i in sel if rank(q, i, mode, k))
            out.append(f"{mode:<6} {k:<2} | {a:>3} ({a/N:6.1%}) | {b:>3} ({b/N:6.1%}) | {b-a:+d} ({(b-a)/N:+.1%})")
            summary[f"{sub}_{mode}_k{k}"] = {"nomic": a, "qwen": b, "n": N}
        mn = sum(1/r for i in sel if (r := rank(n, i, mode, 5))) / N; mq = sum(1/r for i in sel if (r := rank(q, i, mode, 5))) / N
        out.append(f"{mode:<6} MRR@5 nomic {mn:.3f} qwen {mq:.3f}")
# win/loss at dense/hybrid k5
for mode in ("dense", "hybrid"):
    w = sum(1 for i in ids if rank(q, i, mode, 5) and not rank(n, i, mode, 5))
    l = sum(1 for i in ids if rank(n, i, mode, 5) and not rank(q, i, mode, 5))
    out.append(f"\n{mode} top-5: qwen finds {w} that nomic misses; nomic finds {l} that qwen misses")
rep = "\n".join(out)
(HERE / "comparison.txt").write_text(rep + "\n", encoding="utf-8")
(HERE / "comparison.json").write_text(json.dumps(summary, indent=1) + "\n", encoding="utf-8")
print(rep)
