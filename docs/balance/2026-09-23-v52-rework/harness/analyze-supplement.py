import collections as co,gzip,hashlib,itertools,json,math,statistics as st
from pathlib import Path
root=Path('.').resolve();base=root/'supplement';plan=json.loads((base/'plan.json').read_text());groups=co.defaultdict(dict);seen=set();bad=co.Counter();files=[];tot=0
for f in sorted((base/'plans').glob('games-*.jsonl')):
 i=f.stem.rsplit('-',1)[1];out=base/'raw'/f.name
 if not out.exists():out=out.with_suffix('.jsonl.gz')
 assert json.loads((out.parent/f'worker-{i}.log').read_text().splitlines()[-1]).get('complete')
 with f.open() as pf,(gzip.open(out,'rt') if out.suffix=='.gz' else out.open()) as rf:
  for pl,rl in itertools.zip_longest(pf,rf):
   assert pl is not None and rl is not None
   p,r=json.loads(pl),json.loads(rl);assert r['id'] not in seen;seen.add(r['id']);tot+=1
   for k,v in p.items():assert r[k]==v,(r['id'],k)
   if not r['finished']:bad[r['reason']]+=1;continue
   score=.5 if r['winner'] is None else float(r['winner']==0)
   groups[r['kind'],r['variant'],r['opponent'],r['rep']][r['arm'],r['starting']]={'score':score,'turn':r['turn'],'uses':r['sides'][0]['uses'],'maxHp':r['sides'][0]['maxHp']}
 files.append({'file':str(out.relative_to(root)),'sha256':hashlib.file_digest(out.open('rb'),'sha256').hexdigest(),'bytes':out.stat().st_size})
assert tot==plan['count']==43264
assert not any(k.startswith('exception:') for k in bad),bad
manifest=json.loads((base/'manifest.json').read_text())
for f,h in manifest['hashes'].items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==h,f

def ci(v):
 m=st.mean(v);se=st.stdev(v)/math.sqrt(len(v)) if len(v)>1 else 0
 return {'n':len(v),'mean':m,'lo':m-1.96*se,'hi':m+1.96*se,'p':math.erfc(abs(m)/(se*math.sqrt(2))) if se else (0 if m else 1)}
rows=[]
for kind,variant in sorted({(k,v) for k,v,o,n in groups}):
 vs=[v for (k,b,o,n),v in groups.items() if (k,b)==(kind,variant) and len(v)==4]
 arms={a:[st.mean(v[a,s]['score'] for s in [0,1]) for v in vs] for a in ['control','candidate']}
 x={'kind':kind,'variant':variant,**ci([b-a for a,b in zip(arms['control'],arms['candidate'])]),'before':ci(arms['control']),'after':ci(arms['candidate']),'games':len(vs)*4,'byOpponent':{}}
 if kind=='card-policy':x['uses']={a:st.mean(v[a,s]['uses'].get(variant,0)>0 for v in vs for s in [0,1]) for a in ['control','candidate']}
 for op in sorted({o for k,b,o,n in groups if (k,b)==(kind,variant)}):
  vals=[v for (k,b,o,n),v in groups.items() if (k,b,o)==(kind,variant,op) and len(v)==4]
  if vals:x['byOpponent'][op]={a:ci([st.mean(v[a,s]['score'] for s in [0,1]) for v in vals]) for a in ['control','candidate']}
 rows.append(x)
for kind in {x['kind'] for x in rows}:
 xs=sorted([x for x in rows if x['kind']==kind],key=lambda x:x['p']);q=1
 for i in range(len(xs)-1,-1,-1):q=min(q,xs[i]['p']*len(xs)/(i+1));xs[i]['q']=q
result={'summary':{'attempted':tot,'finished':tot-sum(bad.values()),'unfinished':sum(bad.values()),'reasons':dict(bad),'adaptiveFollowup':True,'designOrigin':'Follow-up design selected in v51 and reused unchanged for this v52 study; not newly selected from v52 outcomes'},'rows':rows}
(base/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(base/'validation.json').write_text(json.dumps({'passed':True,'planEquality':True,'uniqueIds':True,'sourceHashesMatch':True,'counts':result['summary'],'files':files},indent=2)+'\n')
for x in rows:print(x['kind'],x['variant'],round(x['before']['mean']*100,2),'->',round(x['after']['mean']*100,2),'delta',round(x['mean']*100,2),'CI',round(x['lo']*100,2),round(x['hi']*100,2),'q',x['q'])
