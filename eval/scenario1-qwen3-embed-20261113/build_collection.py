"""Build a dev-only Qdrant test collection embedded with qwen3-embedding:0.6b.

For each dev chunk (from the frozen dev snapshot), copy the original point's payload and
sparse vector from the existing evaluation collection, and replace the dense vector with a
qwen3-embedding:0.6b vector of the exact text the app embeds ("section\n\ntext" or "text").
Documents get no instruction (Qwen3-Embedding guidance: instruction on queries only).
Only dev documentIds are read or written. Resumable: skips point ids already present.

Run:  python -X utf8 build_collection.py pdf   (then docx)
"""
import json
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
EVAL = HERE.parent
QDRANT = "http://127.0.0.1:36333"
OLLAMA = "http://127.0.0.1:11434"
MODEL = "qwen3-embedding:0.6b"
fmt = sys.argv[1]
assert fmt in ("pdf", "docx")
SRC = json.loads((EVAL / "runs/seed42/production-manifest.json").read_text(encoding="utf-8"))["collections"][fmt]
DST = f"eval-s1-qwen3emb-20261113-{fmt}"
PDF_SAMPLE = set(json.loads((HERE / "pdf-sample.json").read_text(encoding="utf-8"))["papers"])  # PDF limited to 10 papers

def call(url, body=None, method=None, timeout=600):
    req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(),
                                 headers={"content-type": "application/json"}, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)

split = json.loads((EVAL / "split.json").read_text(encoding="utf-8"))
dev_docs = {}
with open(EVAL / "dev-set-preparation-20261103/source-chunks.jsonl", encoding="utf-8") as f:
    for line in f:
        r = json.loads(line)
        if not r["asset"].startswith(fmt + "/"):
            continue
        paper = r["asset"].split("/", 1)[1]
        assert paper in split["dev"] and paper not in split["test"], "non-dev asset"
        if fmt == "pdf" and paper not in PDF_SAMPLE:
            continue
        dev_docs[r["documentId"]] = {c["chunkIndex"]: c["text"] for c in r["chunks"]}

# create collection if missing
existing = {c["name"] for c in call(f"{QDRANT}/collections")["result"]["collections"]}
if DST not in existing:
    call(f"{QDRANT}/collections/{DST}", {"vectors": {"dense": {"size": 1024, "distance": "Cosine"}},
                                        "sparse_vectors": {"sparse": {"modifier": "idf"}}}, "PUT")
    call(f"{QDRANT}/collections/{DST}/index", {"field_name": "documentId", "field_schema": "keyword"}, "PUT")

def existing_ids(doc_id):
    ids, offset = set(), None
    while True:
        body = {"limit": 1000, "with_payload": False, "with_vector": False,
                "filter": {"must": [{"key": "documentId", "match": {"value": doc_id}}]}}
        if offset is not None:
            body["offset"] = offset
        res = call(f"{QDRANT}/collections/{DST}/points/scroll", body)["result"]
        ids.update(p["id"] for p in res["points"])
        offset = res.get("next_page_offset")
        if offset is None:
            return ids

def source_points(doc_id):
    pts, offset = [], None
    while True:
        body = {"limit": 500, "with_payload": True, "with_vector": ["sparse"],
                "filter": {"must": [{"key": "documentId", "match": {"value": doc_id}}]}}
        if offset is not None:
            body["offset"] = offset
        res = call(f"{QDRANT}/collections/{SRC}/points/scroll", body)["result"]
        pts += res["points"]
        offset = res.get("next_page_offset")
        if offset is None:
            return pts

t0, done, total = time.time(), 0, sum(len(v) for v in dev_docs.values())
for i, (doc_id, snap) in enumerate(dev_docs.items(), 1):
    pts = source_points(doc_id)
    assert len(pts) == len(snap), f"{doc_id}: {len(pts)} points vs {len(snap)} snapshot chunks"
    have = existing_ids(doc_id)
    todo = [p for p in pts if p["id"] not in have]
    for p in pts:
        assert p["payload"]["documentId"] == doc_id and snap[p["payload"]["chunkIndex"]] == p["payload"]["text"], "snapshot mismatch"
    for b in range(0, len(todo), 32):
        batch = todo[b:b + 32]
        texts = [(f'{p["payload"]["section"]}\n\n{p["payload"]["text"]}' if p["payload"].get("section") else p["payload"]["text"]) for p in batch]
        vecs = call(f"{OLLAMA}/api/embed", {"model": MODEL, "input": texts})["embeddings"]
        assert len(vecs) == len(batch) and all(len(v) == 1024 for v in vecs)
        call(f"{QDRANT}/collections/{DST}/points?wait=true", {"points": [
            {"id": p["id"], "payload": p["payload"], "vector": {"dense": v, "sparse": p["vector"]["sparse"]}}
            for p, v in zip(batch, vecs)]}, "PUT")
    done += len(pts)
    if i % 10 == 0 or i == len(dev_docs):
        rate = done / (time.time() - t0)
        print(json.dumps({"fmt": fmt, "docs": i, "of": len(dev_docs), "chunks": done, "ofChunks": total,
                          "chunksPerSec": round(rate, 1)}), flush=True)

count = call(f"{QDRANT}/collections/{DST}/points/count", {"exact": True})["result"]["count"]
print(json.dumps({"fmt": fmt, "collection": DST, "points": count, "expected": total, "ok": count == total}))
