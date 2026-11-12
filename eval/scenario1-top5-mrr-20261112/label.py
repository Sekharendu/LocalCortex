# Offline answer-location labels for all 610 dev cases. Reads only dev inventory + dev chunk snapshot.
import json, re, unicodedata, collections, sys
P='../dev-set-preparation-20261103/'
inv=[json.loads(l) for l in open(P+'inventory.jsonl')]
split=json.load(open('../split.json'))
assert all(c['paperId'] in split['dev'] and c['paperId'] not in split['test'] for c in inv)
assets={a['documentId']:a for a in map(json.loads,open(P+'source-chunks.jsonl'))}
PH=re.compile(r'\b(?:BIBREF|TABREF|FIGREF|SECREF|EQREF|INLINEFORM|DISPLAYFORM)\d*\b')
def toks(s):
    s=unicodedata.normalize('NFKC',s).replace('­','')
    s=re.sub(r'-\s*\n\s*','',s)
    return re.findall(r'[a-z0-9]+',s.lower())
def segments(text):
    # split evidence at placeholders / table markup into word segments
    text=re.sub(r'^FLOAT SELECTED:\s*','',text.strip())
    text=re.sub(r'<[^>]+>',' | ',text)
    out=[]
    for part in PH.split(text):
        for sent in re.split(r'(?<=[.!?;:])\s+|\s\|\s',part):
            t=toks(sent)
            if t: out.append(t)
    return out
N=5
def grams(t,n=N): return {tuple(t[i:i+n]) for i in range(len(t)-n+1)}
def match(seg,cg,cjoin):
    if len(seg)>=N:
        g=grams(seg); hit=len(g&cg)
        return hit>=max(1,min(len(g), 4)) and hit/len(g)>=0.5 or hit>=5
    return False
labels=[]
for c in inv:
    a=assets[c['documentId']]
    ch=[(x['chunkIndex'],toks(x['text'])) for x in a['chunks']]
    cg={i:grams(t) for i,t in ch}; cj={i:' '+' '.join(t)+' ' for i,t in ch}
    refs=[]
    for r in c['references']:
        o=r['original']
        kind='unanswerable' if o.get('unanswerable') else ('yes-no' if o.get('yes_no') is not None else ('extractive' if o.get('extractive_spans') else 'free-form'))
        ev=list(dict.fromkeys((o.get('highlighted_evidence') or [])+(o.get('evidence') or [])))
        rel=set(); tier=None
        for name,pool in (('highlighted',o.get('highlighted_evidence') or []),('paragraph',o.get('evidence') or [])):
            for e in pool:
                for seg in segments(e):
                    for i,_ in ch:
                        if match(seg,cg[i],cj[i]): rel.add(i)
            if rel: tier=name; break
        for s in o.get('extractive_spans') or []:
            t=toks(PH.sub(' ',s))
            if len(t)>=4:
                for i,_ in ch:
                    if ' '+' '.join(t)+' ' in cj[i]: rel.add(i); tier=tier or 'span'
        refs.append({'referenceIndex':r['referenceIndex'],'kind':kind,'evidenceCount':len(ev),'relevantChunks':sorted(rel),'tier':tier})
    allUn=all(r['kind']=='unanswerable' for r in refs)
    rel=sorted(set().union(*[set(r['relevantChunks']) for r in refs]))
    labels.append({'caseId':c['caseId'],'paperId':c['paperId'],'format':c['format'],'documentId':c['documentId'],
      'question':c['question'],'answerType':c['answerType'],'status':c['status'],'verdict':c['verdict'],
      'allReferencesUnanswerable':allUn,'references':refs,'relevantChunks':rel,'chunkCount':len(ch),'labelSource':'auto'})
with open('labels.auto.jsonl','w') as f:
    for l in labels: f.write(json.dumps(l)+'\n')
cnt=collections.Counter()
for l in labels:
    if l['allReferencesUnanswerable']: cnt['unanswerable']+=1
    elif l['relevantChunks']: cnt['located']+=1
    else: cnt['not located']+=1
print(cnt)
import statistics
print('median relevant chunks', statistics.median(len(l['relevantChunks']) for l in labels if l['relevantChunks']), 'max', max(len(l['relevantChunks']) for l in labels))
nl=[l for l in labels if not l['allReferencesUnanswerable'] and not l['relevantChunks']]
print(collections.Counter(l['answerType'] for l in nl), collections.Counter(tuple(r['kind'] for r in l['references']) for l in nl).most_common(8))
print(collections.Counter(sum(r['evidenceCount'] for r in l['references'])==0 for l in nl))
