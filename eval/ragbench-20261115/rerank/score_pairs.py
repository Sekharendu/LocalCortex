"""Step 2: score every (question, candidate) pair from candidates.jsonl with int8 bge-reranker-v2-m3 (CPU, X: drive).
Query = expandAcronyms(question), as rag.ts passes to rerank(). Resumable: skips ids already in scores.jsonl.
Run (repo root): X:/LocalCortex-rerank-test/venv/Scripts/python.exe -X utf8 eval/ragbench-20261115/rerank/score_pairs.py
"""
import json, sys, time
from pathlib import Path
sys.path.insert(0, r"X:\LocalCortex-rerank-test\scripts")
from rr import Reranker
HERE = Path(__file__).parent
rows = [json.loads(l) for l in open(HERE / "candidates.jsonl", encoding="utf-8") if l.strip()]
out = HERE / "scores.jsonl"
done = {json.loads(l)["id"] for l in open(out, encoding="utf-8")} if out.exists() else set()
rr = Reranker()
t0, k = time.time(), 0
with open(out, "a", encoding="utf-8") as fo:
    for i, r in enumerate(rows, 1):
        if r["id"] in done: continue
        idx = list(r["texts"].keys())
        t = time.time()
        s = rr.score(r["query"], [r["texts"][x] for x in idx])
        fo.write(json.dumps({"id": r["id"], "scores": dict(zip(idx, s)), "seconds": round(time.time() - t, 2)}) + "\n"); fo.flush()
        k += 1
        if i % 50 == 0:
            el = time.time() - t0
            print(json.dumps({"done": i, "of": len(rows), "secPerQ": round(el / k, 1), "etaMin": round(el / k * (len(rows) - i) / 60)}), flush=True)
print(json.dumps({"finished": True}))
