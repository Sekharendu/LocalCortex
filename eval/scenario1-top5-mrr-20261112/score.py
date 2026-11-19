# Scores Scenario 1 results: per-question MRR@5 (dense, hybrid) against answer-location labels.
import json, sys, os, collections, csv
P='../dev-set-preparation-20261103/'
inv={c['caseId']:c for c in map(json.loads,open(P+'inventory.jsonl'))}
auto={l['caseId']:l for l in map(json.loads,open('labels.auto.jsonl'))}
man=json.load(open('labels.manual.json'))['overrides']
clar={c['caseId']:c['group'] for c in map(json.loads,open('../dev-question-clarity-20261106/cases.jsonl'))}
CL={'standalone':'Standalone','topical_missing_context':'Topic given, context missing','generic_missing_context':'Too general'}
src=sys.argv[1:] or [f for f in ('pdf.results.jsonl','docx.results.jsonl') if os.path.exists(f)]
res=collections.defaultdict(dict)
for f in src:
    for r in map(json.loads,open(f)): res[r['caseId']][r['mode']]=r
def group(l):
    if l['caseId'] in man: return man[l['caseId']]['group']
    if l['allReferencesUnanswerable']: return 'unanswerable'
    if not l['relevantChunks']: return 'no-answer-passage'
    return 'answerable'
def kind(c):
    ks={r['original'].get('yes_no') is not None and 'yes/no' or (r['original'].get('unanswerable') and 'unanswerable') or (r['original'].get('extractive_spans') and 'extractive span') or 'free-form' for r in c['references']}
    ks.discard('unanswerable'); return ' + '.join(sorted(ks)) if ks else 'unanswerable'
rows=[]
for cid,c in inv.items():
    if cid not in res: continue
    l=auto[cid]; g=group(l); rel=set(man[cid]['relevantChunks'] if cid in man else l['relevantChunks'])
    row={'caseId':cid,'paperId':c['paperId'],'format':c['format'],'question':c['question'],'group':g,'answerKind':kind(c),
         'clarity':CL.get(clar.get(cid),'?'),'previousVerdict':c['verdict'],'relevantChunks':sorted(rel)}
    for m in ('dense','hybrid'):
        r=res[cid].get(m)
        if not r: row[m+'_rank']=row[m+'_rr']=None; continue
        top=[x['chunkIndex'] for x in r['top5']][:5]
        rank=next((i+1 for i,x in enumerate(top) if x in rel),None)
        row[m+'_gate']=r['gateRejected']; row[m+'_top5']=top; row[m+'_rank']=rank
        row[m+'_rr']=(1/rank if rank else 0.0) if g=='answerable' else None
        row[m+'_hits']=sum(x in rel for x in top)
    rows.append(row)
with open('per-question.jsonl','w') as f:
    for r in rows: f.write(json.dumps(r)+'\n')
with open('per-question.csv','w',newline='') as f:
    w=csv.writer(f); cols=['caseId','paperId','format','question','group','answerKind','clarity','previousVerdict','dense_rank','dense_rr','hybrid_rank','hybrid_rr','dense_gate','hybrid_gate','relevantChunks','dense_top5','hybrid_top5']
    w.writerow(cols); [w.writerow([r.get(k) for k in cols]) for r in rows]
A=[r for r in rows if r['group']=='answerable']
def summ(sub,m):
    s=[r for r in sub if r.get(m+'_rr') is not None]
    if not s: return '—'
    mrr=sum(r[m+'_rr'] for r in s)/len(s); h1=sum(r[m+'_rank']==1 for r in s); h5=sum(r[m+'_rank'] is not None for r in s); g=sum(bool(r.get(m+'_gate')) for r in s)
    return dict(n=len(s),mrr=round(mrr,3),at1=h1,in5=h5,gate=g)
out={'cases':len(rows),'groups':collections.Counter(r['group'] for r in rows)}
for name,key in (('all',None),('format','format'),('answerKind','answerKind'),('clarity','clarity'),('previousVerdict','previousVerdict')):
    if key is None: out['all']={m:summ(A,m) for m in ('dense','hybrid')}
    else: out[name]={v:{m:summ([r for r in A if r[key]==v],m) for m in ('dense','hybrid')} for v in sorted({r[key] for r in A})}
# rank distribution
out['rankDistribution']={m:collections.Counter(str(r[m+'_rank'] or ('gate' if r.get(m+'_gate') else 'not in top 5')) for r in A) for m in ('dense','hybrid')}
# per paper
pp=collections.defaultdict(list)
for r in A: pp[(r['format'],r['paperId'])].append(r)
out['papers']={f'{k[0]}/{k[1]}':{m:round(sum(r[m+'_rr'] for r in v if r[m+'_rr'] is not None)/len(v),3) for m in ('dense','hybrid')}|{'questions':len(v)} for k,v in sorted(pp.items())}
json.dump(out,open('summary.json','w'),indent=1,default=dict)
print(json.dumps({k:v for k,v in out.items() if k!='papers'},indent=1,default=dict))
