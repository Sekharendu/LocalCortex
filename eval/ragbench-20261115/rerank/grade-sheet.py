"""Build one grading sheet for the 100 questions of §28: question, reference answer, the chunk(s) holding the answer,
and the model's answer at blend top 10 and top 15. Read-only (Qdrant scroll for chunks not in the saved top 20).
Run (repo root): python -X utf8 eval/ragbench-20261115/rerank/grade-sheet.py  -> rerank/grade-sheet-100.md"""
import json, urllib.request
from pathlib import Path
HERE = Path("eval/ragbench-20261115")
jl = lambda p: [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]
Q = {r["id"]: r for r in jl(HERE / "dev.jsonl")}
C = {r["id"]: r for r in jl(HERE / "rerank/candidates.jsonl")}
A = {(r["id"], r["config"]): r for r in jl(HERE / "rerank/neurons-top10-vs-top15.jsonl") if r["rep"] == 1}
docId = {r["path"]: r["documentId"] for r in jl("X:/LocalCortex-ragbench/state/ingest-dev.jsonl") if r["ok"]}
order = json.load(open(HERE / "rerank/neurons-grades.json", encoding="utf-8"))
def fetch(doc, idxs):
    body = {"limit": 1000, "with_payload": ["chunkIndex", "text"], "with_vector": False,
            "filter": {"must": [{"key": "documentId", "match": {"value": doc}}, {"key": "chunkIndex", "match": {"any": idxs}}]}}
    req = urllib.request.Request("http://127.0.0.1:36333/collections/eval-ragbench-dev-20261115/points/scroll",
                                 data=json.dumps(body).encode(), headers={"content-type": "application/json"})
    return {p["payload"]["chunkIndex"]: p["payload"]["text"] for p in json.load(urllib.request.urlopen(req))["result"]["points"]}
out = ["# Grading sheet: 100 ordinary-PDF dev questions, blend top 10 vs top 15 (§28)", "",
       "Grade each answer: **C** correct, **P** partly correct, **W** wrong, **R** said insufficient / refused.",
       "Answer chunks = the chunks labelled as holding the answer (same labels as the search tests). "
       "Chunk text is as stored (raw PDF text, tables flattened). Claude's own grades are in `neurons-grades.json`, left out here so they don't bias you.", ""]
missing = 0
for g in order:
    i, q, c = g["id"], Q[g["id"]], C[g["id"]]
    rel = c["relevant"]
    texts = {int(k): v for k, v in c["texts"].items()}
    # show at most 5: answer chunks in search order (hybrid top 20) first, then the rest by chunk number
    shown = ([x for x in c["hybrid"] if x in rel] + [x for x in rel if x not in c["hybrid"]])[:5]
    need = [x for x in shown if x not in texts]
    if need: texts.update(fetch(docId[q["path"]], need))
    out += [f"---", "", f"## {g['n']}. `{i}` ({q['source']}, {q['doc']})", "", f"**Question:** {q['question']}", "",
            f"**Reference answer:** {q['answer']}", "", f"**Answer chunks:** {len(rel)} labelled" + (f", showing the {len(shown)} search ranked highest" if len(rel) > len(shown) else "") + ":", ""]
    for x in shown:
        t = texts.get(x)
        if t is None: missing += 1; t = "(text not found)"
        out += [f"<details><summary>chunk #{x}" + (f" (search rank {c['hybrid'].index(x) + 1})" if x in c["hybrid"] else " (not in search top 20)") + "</summary>", "", "```text", t.strip(), "```", "", "</details>", ""]
    for cfg in ("top10", "top15"):
        a = A[(i, cfg)]
        out += [f"**Model answer, {cfg.replace('top', 'top ')}:**", "", "> " + a["answer"].strip().replace("\n", "\n> "), "",
                f"Your grade ({cfg.replace('top', 'top ')}): ____", ""]
p = HERE / "rerank/grade-sheet-100.md"
p.write_text("\n".join(out), encoding="utf-8")
print(p, "questions", len(order), "missing chunk texts", missing)
