"""Build the "normal documents" RAG benchmark: 800+ questions over real PDFs, split by document.

Sources (downloaded to X:/LocalCortex-ragbench, nothing on C:):
  financebench  FinanceBench open-source set: 150 questions over 84 SEC filings (10-K/10-Q/8-K/earnings), CC BY-NC 4.0
  nq            UDA-QA "nq": Natural Questions over Wikipedia pages saved as PDF, CC BY-SA 4.0
  feta          UDA-QA "feta": FeTaQA, Wikipedia pages as PDF, answer comes from a table, CC BY-SA 4.0
  tat           UDA-QA "tat": TAT-QA over company annual reports (PDF), text + tables, CC BY-SA 4.0
UDA's paper_* subsets are skipped: they are QASPER, which we already use.

Split: per source, by document (all questions of a document go to the same side), seed 42,
~70% of documents to dev, ~30% to test. Test PDFs are copied to a separate folder.
Run: python eval/ragbench-20261115/build_sets.py
"""
import json, os, random, shutil, zipfile, collections

ROOT = "X:/LocalCortex-ragbench"
HERE = os.path.dirname(os.path.abspath(__file__))
SEED = 42
TEST_FRACTION = 0.30
N_NQ_DOCS, NQ_PER_DOC = 150, 2
N_FETA_DOCS = 230
N_TAT_DOCS, TAT_PER_DOC = 25, 8

rng = random.Random(SEED)
items = []  # unified question records

# ---- FinanceBench: all 150 ----
for l in open(f"{ROOT}/financebench/financebench_open_source.jsonl", encoding="utf-8"):
    r = json.loads(l)
    items.append({
        "source": "financebench", "doc": r["doc_name"], "docFile": f"financebench/pdfs/{r['doc_name']}.pdf",
        "question": r["question"], "answer": r["answer"],
        "evidence": [e["evidence_text"] for e in r["evidence"]],
        "evidencePages0": [e["evidence_page_num"] for e in r["evidence"]],
        "meta": {"id": r["financebench_id"], "type": r["question_type"], "reasoning": r["question_reasoning"], "justification": r["justification"]},
    })

# ---- NQ: 150 random docs, up to 2 questions with a short answer each ----
nq = json.load(open(f"{ROOT}/uda/nq_qa.json", encoding="utf-8"))
docs = sorted(d for d, qs in nq.items() if any(q["answers"].get("short_answer") for q in qs))
for d in sorted(rng.sample(docs, N_NQ_DOCS)):
    qs = [q for q in nq[d] if q["answers"].get("short_answer")]
    for q in rng.sample(qs, min(NQ_PER_DOC, len(qs))):
        items.append({
            "source": "nq", "doc": d, "docFile": f"wiki_nq_docs/pdfs/{d}.pdf",
            "question": q["question"], "answer": q["answers"]["short_answer"],
            "evidence": [q["answers"]["long_answer"]], "meta": {"id": str(q["q_uid"])},
        })

# ---- FeTaQA: 230 random docs, 1 question each; evidence = highlighted table cells ----
feta = json.load(open(f"{ROOT}/uda/feta_qa.json", encoding="utf-8"))
for d in sorted(rng.sample(sorted(feta), N_FETA_DOCS)):
    q = rng.choice(feta[d])
    tbl = q["evidence"]["table_array"]
    cells = [tbl[r][c] for r, c in q["evidence"]["highlighted_cell_ids"] if r < len(tbl) and c < len(tbl[r])]
    items.append({
        "source": "feta", "doc": d, "docFile": f"wiki_feta_docs/pdfs/{d}.pdf",
        "question": q["question"], "answer": q["answers"],
        "evidence": cells, "meta": {"id": str(q["q_uid"]), "answerFromTable": True},
    })

# ---- TAT-QA: 25 random reports, 8 random questions each ----
tat = json.load(open(f"{ROOT}/uda/tat_qa.json", encoding="utf-8"))
for d in sorted(rng.sample(sorted(tat), N_TAT_DOCS)):
    for q in rng.sample(tat[d], min(TAT_PER_DOC, len(tat[d]))):
        a = q["answers"]
        items.append({
            "source": "tat", "doc": d, "docFile": f"tat_docs/{d}.pdf",
            "question": q["question"], "answer": a["answer"],
            "evidence": [str(f) for f in q["facts"]],
            "meta": {"id": q["q_uid"], "answerType": a["answer_type"], "scale": a["scale"], "derivation": q["derivation"], "pageUid": q["doc_page_uid"]},
        })

# ---- de-duplicate identical (doc, question) ----
seen, uniq = set(), []
for it in items:
    k = (it["source"], it["doc"], it["question"].strip().lower())
    if k not in seen and it["question"].strip():
        seen.add(k); uniq.append(it)
items = uniq

# ---- split by document, per source ----
# The same Wikipedia article can appear in both nq and feta, so a document's side is decided by its
# title (case-insensitive) once, globally: an article never sits in dev for one source and test for another.
split_docs = {}
side = {}
for src in ["financebench", "nq", "feta", "tat"]:
    ds = sorted({it["doc"] for it in items if it["source"] == src})
    fixed = [d for d in ds if d.lower() in side]
    free = [d for d in ds if d.lower() not in side]
    random.Random(f"{SEED}-{src}").shuffle(free)
    n_test = max(0, round(len(ds) * TEST_FRACTION) - sum(side[d.lower()] == "test" for d in fixed))
    for k, d in enumerate(free): side[d.lower()] = "test" if k < n_test else "dev"
    split_docs[src] = {sp: sorted(d for d in ds if side[d.lower()] == sp) for sp in ["dev", "test"]}
for i, it in enumerate(items):
    it["split"] = "test" if it["doc"] in split_docs[it["source"]]["test"] else "dev"
    it["id"] = f"{it['source']}-{i:04d}"

# ---- copy PDFs into docs/dev and docs/test ----
zips = {p: zipfile.ZipFile(f"{ROOT}/uda/{p}.zip") for p in ["wiki_nq_docs", "wiki_feta_docs", "tat_docs"]}
for it in items:
    safe = "".join("_" if ch in '<>:"\\|?*' else ch for ch in os.path.basename(it["docFile"]))
    dst = f"{ROOT}/docs/{it['split']}/{it['source']}/{safe}"
    it["path"] = dst
    if os.path.exists(dst):
        continue
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if it["source"] == "financebench":
        shutil.copyfile(f"{ROOT}/{it['docFile']}", dst)
    else:
        z = it["docFile"].split("/")[0]
        with zips[z].open(it["docFile"]) as s, open(dst, "wb") as o:
            shutil.copyfileobj(s, o)

# ---- write ----
os.makedirs(f"{ROOT}/sets", exist_ok=True)
for sp in ["dev", "test"]:
    rows = [it for it in items if it["split"] == sp]
    for out in [f"{ROOT}/sets/{sp}.jsonl", f"{HERE}/{sp}.jsonl"]:
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            for it in rows: f.write(json.dumps(it, ensure_ascii=False) + "\n")
json.dump({"seed": SEED, "testFraction": TEST_FRACTION, "docs": split_docs}, open(f"{HERE}/split.json", "w", encoding="utf-8"), indent=1)

c = collections.Counter((it["source"], it["split"]) for it in items)
d = {(s, sp): len(v) for s, x in split_docs.items() for sp, v in x.items()}
print("source        dev q (docs)   test q (docs)")
for s in ["financebench", "nq", "feta", "tat"]:
    print(f"{s:12}  {c[(s,'dev')]:5} ({d[(s,'dev')]:3})    {c[(s,'test')]:5} ({d[(s,'test')]:3})")
print(f"total         {sum(v for (s,sp),v in c.items() if sp=='dev'):5}          {sum(v for (s,sp),v in c.items() if sp=='test'):5}   all {len(items)}")
