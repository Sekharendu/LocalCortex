"""Score every (question, candidate chunk) pair with int8 bge-reranker-v2-m3 (onnxruntime CPU).
Candidates = union of the gate-off dense/hybrid top-20 and top-50 lists (scenario1-gate-off-topk-20261113),
answerable dev questions only (570). Chunk text = payload text from the frozen dev snapshot (what rag.ts reranks).
Resumable: appends one line per question to scores.jsonl and skips caseIds already there.
Run from repo root:  X:/LocalCortex-rerank-test/venv/Scripts/python.exe -X utf8 eval/scenario1-rerank-bge-v2-m3-int8-20261113/score_pairs.py
"""
import json, sys, time
from pathlib import Path
sys.path.insert(0, r"X:\LocalCortex-rerank-test\scripts")
from rr import Reranker
HERE = Path(__file__).parent; EVAL = HERE.parent
def jl(p): return [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]
split = json.loads((EVAL / "split.json").read_text(encoding="utf-8"))
queries = json.loads((HERE / "queries.json").read_text(encoding="utf-8"))
cases = [c for c in jl(EVAL / "scenario1-top5-mrr-20261112/per-question.jsonl") if c["group"] == "answerable"]
# Sample (~250, whole papers only): every DOCX question + PDF questions in file order up to
# the 146th, finishing that question's paper.
pdf = [c for c in cases if c["format"] == "pdf"]
last = (pdf[145]["format"], pdf[145]["paperId"])
cut = max(i for i, c in enumerate(pdf) if (c["format"], c["paperId"]) == last) + 1
ALL = "--all" in sys.argv  # Nov 17: score the remaining 320 too, hybrid top-20 candidates only (what the tables use)
if not ALL: cases = pdf[:cut] + [c for c in cases if c["format"] == "docx"]
print(json.dumps({"sample": len(cases), "pdf": cut, "docx": len(cases) - cut}), flush=True)
cand = {}
for f in ("pdf", "docx"):
    for r in jl(EVAL / f"scenario1-gate-off-topk-20261113/{f}.results.jsonl"):
        if r["k"] in (20, 50):
            cand.setdefault(r["caseId"], []).extend(c["chunkIndex"] for c in r["top"])
        if r["mode"] == "hybrid" and r["k"] in (20, 50):
            cand.setdefault(("h", r["caseId"]), []).extend(c["chunkIndex"] for c in r["top"][:20])
texts = {}
for r in jl(EVAL / "dev-set-preparation-20261103/source-chunks.jsonl"):
    paper = r["asset"].split("/", 1)[1]
    assert paper in split["dev"] and paper not in split["test"]
    texts[r["asset"]] = {c["chunkIndex"]: c["text"] for c in r["chunks"]}
out = HERE / "scores.jsonl"
done = {r["caseId"] for r in jl(out)} if out.exists() else set()
rr = Reranker()
t0, n0 = time.time(), len(done)
with open(out, "a", encoding="utf-8") as fo:
    for i, c in enumerate(cases, 1):
        if c["caseId"] in done: continue
        idx = list(dict.fromkeys(cand[("h", c["caseId"]) if ALL else c["caseId"]]))
        asset = f'{c["format"]}/{c["paperId"]}'
        t = time.time()
        s = rr.score(queries[c["caseId"]], [texts[asset][k] for k in idx])
        fo.write(json.dumps({"caseId": c["caseId"], "scores": dict(zip(map(str, idx), s)), "pairs": len(idx), "seconds": round(time.time() - t, 2)}) + "\n"); fo.flush()
        if i % 25 == 0:
            el = time.time() - t0; k = i - n0
            print(json.dumps({"done": i, "of": len(cases), "secPerQ": round(el / max(k, 1), 1), "etaMin": round(el / max(k, 1) * (len(cases) - i) / 60)}), flush=True)
print(json.dumps({"finished": len(jl(out)), "of": len(cases)}))
