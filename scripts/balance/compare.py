"""Before/after summaries and paired main-plan deltas; no p-value cherry picking."""
import json,sys,gzip,glob,collections,statistics,math
from pathlib import Path
root=Path(sys.argv[1]);oldroot=Path(sys.argv[2]);old=json.loads((root/'baseline-v46.json').read_text());new=json.loads((root/'results.json').read_text())
def rows(key):
 prior={x.get('id',x.get('build',x.get('combo'))):x for x in old[key]};out=[]
 for rank,x in enumerate(new[key],1):
  k=x.get('id',x.get('build',x.get('combo')));a=prior[k];out.append({'key':k,'name':x.get('name',k),'before':a['mean'],'after':x['mean'],'change':x['mean']-a['mean'] if x['mean'] is not None and a['mean'] is not None else None,'beforeRank':next(i for i,t in enumerate(old[key],1) if t.get('id',t.get('build',t.get('combo')))==k),'afterRank':rank})
 return out
result={k:rows(k) for k in ['market','starters','builds']}
def read(folder):
 for path in sorted(glob.glob(str(folder/'games-*.jsonl'))+glob.glob(str(folder/'games-*.jsonl.gz'))):
  for line in (gzip.open(path,'rt') if path.endswith('.gz') else open(path)):
   yield json.loads(line)
def score(r):return .5 if r['winner'] is None else float(r['winner']==0)
prior={r['id']:r for r in read(oldroot/'raw/main') if r['stage'] in ['market','starter']}
groups=collections.defaultdict(dict)
for r in read(root/'raw/main'):
 if r['stage'] not in ['market','starter']:continue
 a=prior[r['id']]
 for key in ['stage','seed','decks','starting','card','rep']:assert a[key]==r[key],(r['id'],key)
 if a['finished'] and r['finished']:groups[(r['stage'],r['card'],r['rep'])][(r.get('arm'),r['starting'])]=score(r)-score(a)
values=collections.defaultdict(list)
for (stage,card,rep),v in groups.items():
 expected=2 if stage=='market' else 4
 if len(v)!=expected:continue
 d=statistics.mean(v.values()) if stage=='market' else statistics.mean(v['treatment',s]-v['control',s] for s in [0,1])
 values[stage,card].append(d)
result['paired']={}
for (stage,card),v in values.items():
 m=statistics.mean(v);se=statistics.stdev(v)/math.sqrt(len(v)) if len(v)>1 else 0
 result['paired'][stage+':'+card]={'n':len(v),'mean':m,'lo':m-1.96*se,'hi':m+1.96*se}
(root/'comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('Wrote paired comparison.json')
