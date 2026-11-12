"""Build review-data.json for the Scenario 1 review page.

Joins per-question.jsonl (ranks), the two results files (scores/pages),
inventory.jsonl (reference answers and evidence), labels.manual.json (why notes)
and source-chunks.jsonl (chunk text). Keeps only chunk text that appears in a
top 5 or is labelled relevant. Dev-set files only.

Run from this folder:  python -X utf8 build_review.py
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
PREP = HERE.parent / "dev-set-preparation-20261103"

def jsonl(p):
    with open(p, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]

perq = jsonl(HERE / "per-question.jsonl")
inv = {r["caseId"]: r for r in jsonl(PREP / "inventory.jsonl")}
manual = json.loads((HERE / "labels.manual.json").read_text(encoding="utf-8"))["overrides"]
auto = {r["caseId"]: r for r in jsonl(HERE / "labels.auto.jsonl")}
scores = {}
for fmt in ("pdf", "docx"):
    for r in jsonl(HERE / f"{fmt}.results.jsonl"):
        scores[(r["caseId"], r["mode"])] = r

need = {}  # docKey -> set(chunkIndex)
cases = []
for q in perq:
    cid = q["caseId"]
    doc = f'{q["format"]}/{q["paperId"]}'
    refs = []
    for ref in inv[cid]["references"]:
        o = ref["original"]
        refs.append({
            "unans": o.get("unanswerable", False),
            "ex": o.get("extractive_spans") or [],
            "ff": o.get("free_form_answer") or "",
            "yn": o.get("yes_no"),
            "hl": [h for h in (o.get("highlighted_evidence") or []) if h.strip()],
            "ev": [e for e in (o.get("evidence") or []) if e.strip()],
        })
    modes = {}
    for mode, key in (("dense", "d"), ("hybrid", "h")):
        res = scores.get((cid, mode))
        top = [[c["chunkIndex"], round(c["score"], 3), c.get("page")] for c in (res["top5"] if res else [])]
        modes[key] = {"gate": q[f"{mode}_gate"], "top": top, "rank": q[f"{mode}_rank"], "rr": q[f"{mode}_rr"]}
        need.setdefault(doc, set()).update(c[0] for c in top)
    rel = q.get("relevantChunks") or []
    need.setdefault(doc, set()).update(rel)
    m = manual.get(cid)
    cases.append({
        "id": cid, "paper": q["paperId"], "fmt": q["format"], "doc": doc,
        "q": q["question"], "group": q["group"], "kind": q["answerKind"],
        "clarity": q["clarity"], "verdict": q["previousVerdict"], "rel": rel,
        "labelSource": "manual" if m else auto.get(cid, {}).get("labelSource", "auto"),
        "why": m["why"] if m else "", "refs": refs, **modes,
    })

chunks = {}
pages = {}
with open(PREP / "source-chunks.jsonl", encoding="utf-8") as f:
    for line in f:
        r = json.loads(line)
        if r["asset"] not in need:
            continue
        want = need[r["asset"]]
        chunks[r["asset"]] = {c["chunkIndex"]: c["text"] for c in r["chunks"] if c["chunkIndex"] in want}
        pages[r["asset"]] = {c["chunkIndex"]: c.get("page") for c in r["chunks"] if c["chunkIndex"] in want}

missing = [d for d in need if d not in chunks]
assert not missing, f"no chunk text for {missing[:5]}"
out = {"cases": cases, "chunks": chunks, "pages": pages}
p = HERE / "review-data.json"
p.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(len(cases), "cases,", sum(len(v) for v in chunks.values()), "chunks,", round(p.stat().st_size / 1e6, 2), "MB")
