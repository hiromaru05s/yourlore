import collections as co,json,statistics as st,math
from pathlib import Path
C=json.load(open('catalog.json'))['cards'];G=co.defaultdict(dict);counts=co.Counter();builds=co.defaultdict(dict)
for f in Path('raw/baseline').glob('games-*.jsonl'):
 for line in f.open():
  try:r=json.loads(line)
  except ValueError:continue
  stage=r['stage']
  if stage not in ['starter','build']:continue
  score=.5 if r['winner'] is None else float(r['winner']==0)
  if stage=='starter':
   counts[r['card']]+=1
   if r['finished']:G[r['card'],r['rep']][r['arm'],r['starting']]=(score,r['sides'][0]['uses'].get(r['card'],0)>0)
  elif r['finished']:builds[tuple(r['builds']),r['rep']][r['starting']]=score
assert len(counts)==33 and all(n==4096 for n in counts.values()),(len(counts),min(counts.values()))
rows=[]
for id in counts:
 gs=[v for (c,rep),v in G.items() if c==id and len(v)==4];vs=[st.mean(v['treatment',s][0]-v['control',s][0] for s in [0,1]) for v in gs];m=st.mean(vs);se=st.stdev(vs)/math.sqrt(len(vs));use=st.mean(v['treatment',s][1] for v in gs for s in [0,1]);rows.append(dict(id=id,name=C[id]['nameJa'],delta=m,lo=m-1.96*se,hi=m+1.96*se,used=use,n=len(vs)))
rows.sort(key=lambda x:(x['used']>=.1,x['delta']),reverse=True)
for x in rows[:12]:print(x['name'],round(x['delta']*100,2),round(x['used']*100,1),x['n'])
assert next(x for x in rows if x['id']=='STARTER_TRASH')['delta']==0
scores=co.defaultdict(list)
for ((a,b),rep),v in builds.items():
 if len(v)==2:z=st.mean(v.values());scores[a].append(z);scores[b].append(1-z)
league={k:st.mean(v) for k,v in scores.items()};print('Normal build league:',league)
Path('starter-preview.json').write_text(json.dumps({'scope':'Completed starter and normal fixed-build trials. Full study ongoing.','rows':rows,'league':league},ensure_ascii=False,indent=2)+'\n')
