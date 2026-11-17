"""FINAL TEST (approved one-off run, Nov 17): score every (question, top-20 candidate) pair with the local int8
bge-reranker-v2-m3 (CPU, X: drive), exactly as eval/ragbench-20261115/rerank/score_pairs.py does.
Query = expandAcronyms(question) (saved in candidates as "query"). Resumable: skips ids already in the output.
Only questions with a labelled answer chunk are scored (the others are not in the tables anyway).
Run (repo root): X:/LocalCortex-rerank-test/venv/Scripts/python.exe -X utf8 eval/final-test-20261117/score_pairs.py ragbench|qasper-pdf|qasper-docx
"""
import json, sys, time
from pathlib import Path
sys.path.insert(0, r"X:\LocalCortex-rerank-test\scripts")
from rr import Reranker
HERE = Path(__file__).parent
name = sys.argv[1]
rows = [json.loads(l) for l in open(HERE / f"candidates-{name}.jsonl", encoding="utf-8") if l.strip()]
rows = [r for r in rows if r["group"] == "answerable"]
out = HERE / f"scores-{name}.jsonl"
done = {json.loads(l)["id"] for l in open(out, encoding="utf-8")} if out.exists() else set()
rr = Reranker()
t0, k = time.time(), 0
with open(out, "a", encoding="utf-8") as fo:
    for i, r in enumerate(rows, 1):
        if r["id"] in done: continue
        idx = list(r["texts"].keys())
        t = time.time()
        s = rr.score(r["query"], [r["texts"][x] for x in idx])
        fo.write(json.dumps({"id": r["id"], "scores": dict(zip(idx, [float(v) for v in s])), "seconds": round(time.time() - t, 2)}) + "\n"); fo.flush()
        k += 1
        if i % 25 == 0:
            el = time.time() - t0
            print(json.dumps({"set": name, "done": i, "of": len(rows), "secPerQ": round(el / k, 1), "etaMin": round(el / k * (len(rows) - i) / 60)}), flush=True)
print(json.dumps({"finished": True, "set": name, "scoredThisRun": k}))
