"""FINAL TEST (approved one-off run, Nov 17): answer-location labels for the 261 QASPER TEST cases.
Same rules as eval/scenario1-top5-mrr-20261112/label.py (5-gram match of highlighted evidence, fallback evidence paragraph,
plus whole extractive spans of 4+ words; any reference counts). No manual fixes: unplaced cases are reported as unscored.
Chunk text is read (read-only) from the existing collections eval-qasper-full2-20261028-primary-r3-{pdf,docx}.
Run (repo root): python -X utf8 eval/final-test-20261117/qasper-labels.py -> eval/final-test-20261117/qasper-labels.jsonl"""
import json, re, unicodedata, collections, urllib.request
D = "C:/Users/hp/.codex/visualizations/2026/10/29/01a1861e-e89a-7d02-8dd1-60d661cf470a/full-failure-diagnosis/"
split = json.load(open("eval/split.json", encoding="utf-8"))
TEST = set(split["test"])
src = {(s["paperId"], s["format"]): s for s in map(json.loads, open(D + "source-index.jsonl", encoding="utf-8")) if s["paperId"] in TEST}
diag = [json.loads(l) for l in open(D + "all-871-diagnoses.jsonl", encoding="utf-8")]

def scroll(coll, doc):
    out, off = {}, None
    while True:
        body = {"limit": 1000, "with_payload": ["chunkIndex", "text", "documentId"], "with_vector": False,
                "filter": {"must": [{"key": "documentId", "match": {"value": doc}}]}}
        if off is not None: body["offset"] = off
        req = urllib.request.Request(f"http://127.0.0.1:36333/collections/{coll}/points/scroll", data=json.dumps(body).encode(), headers={"content-type": "application/json"})
        r = json.load(urllib.request.urlopen(req))["result"]
        for p in r["points"]: out[p["payload"]["chunkIndex"]] = p["payload"]["text"]
        off = r.get("next_page_offset")
        if off is None: return out

# ---- label.py rules, unchanged ----
PH = re.compile(r'\b(?:BIBREF|TABREF|FIGREF|SECREF|EQREF|INLINEFORM|DISPLAYFORM)\d*\b')
def toks(s):
    s = unicodedata.normalize('NFKC', s).replace('\u00ad', '')
    s = re.sub(r'-\s*\n\s*', '', s)
    return re.findall(r'[a-z0-9]+', s.lower())
def segments(text):
    text = re.sub(r'^FLOAT SELECTED:\s*', '', text.strip())
    text = re.sub(r'<[^>]+>', ' | ', text)
    out = []
    for part in PH.split(text):
        for sent in re.split(r'(?<=[.!?;:])\s+|\s\|\s', part):
            t = toks(sent)
            if t: out.append(t)
    return out
N = 5
def grams(t, n=N): return {tuple(t[i:i + n]) for i in range(len(t) - n + 1)}
def match(seg, cg):
    if len(seg) >= N:
        g = grams(seg); hit = len(g & cg)
        return hit >= max(1, min(len(g), 4)) and hit / len(g) >= 0.5 or hit >= 5
    return False

cache, labels = {}, []
for d in diag:
    c = json.load(open(D + (d.get("caseEvidenceBundle") or d["evidenceBundle"]), encoding="utf-8"))
    if c["paperId"] not in TEST: continue
    assert c["paperId"] not in split["dev"]
    s = src[(c["paperId"], c["format"])]
    coll = f"eval-qasper-full2-20261028-primary-r3-{c['format']}"
    if s["documentId"] not in cache:
        cache[s["documentId"]] = scroll(coll, s["documentId"])
        assert len(cache[s["documentId"]]) == s["chunkCount"], (c["paperId"], len(cache[s["documentId"]]), s["chunkCount"])
    chunks = cache[s["documentId"]]
    ch = [(i, toks(chunks[i])) for i in sorted(chunks)]
    cg = {i: grams(t) for i, t in ch}; cj = {i: ' ' + ' '.join(t) + ' ' for i, t in ch}
    refs = []
    for ri, o in enumerate(c["allReferenceAnswers"]):
        kind = 'unanswerable' if o.get('unanswerable') else ('yes-no' if o.get('yes_no') is not None else ('extractive' if o.get('extractive_spans') else 'free-form'))
        rel = set(); tier = None
        for name, pool in (('highlighted', o.get('highlighted_evidence') or []), ('paragraph', o.get('evidence') or [])):
            for e in pool:
                for seg in segments(e):
                    for i, _ in ch:
                        if match(seg, cg[i]): rel.add(i)
            if rel: tier = name; break
        for sp in o.get('extractive_spans') or []:
            t = toks(PH.sub(' ', sp))
            if len(t) >= 4:
                for i, _ in ch:
                    if ' ' + ' '.join(t) + ' ' in cj[i]: rel.add(i); tier = tier or 'span'
        refs.append({'referenceIndex': ri, 'kind': kind, 'relevantChunks': sorted(rel), 'tier': tier})
    allUn = all(r['kind'] == 'unanswerable' for r in refs)
    rel = sorted(set().union(*[set(r['relevantChunks']) for r in refs]))
    group = 'unanswerable' if allUn else ('no-answer-passage' if not rel else 'answerable')  # score.py group(), no manual overrides
    labels.append({'caseId': c['caseId'], 'paperId': c['paperId'], 'format': c['format'], 'documentId': s['documentId'], 'collection': coll,
                   'question': c['originalQuestion'], 'group': group, 'references': refs, 'relevantChunks': rel, 'chunkCount': len(ch)})
with open("eval/final-test-20261117/qasper-labels.jsonl", "w", encoding="utf-8") as f:
    for l in labels: f.write(json.dumps(l) + "\n")
print(len(labels), collections.Counter(l['group'] for l in labels), collections.Counter((l['format'], l['group']) for l in labels))
