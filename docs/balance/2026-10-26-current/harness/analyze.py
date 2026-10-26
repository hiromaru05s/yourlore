import json,glob,statistics,random,collections,pathlib,gzip,hashlib
root=pathlib.Path('/tmp/lore-card-audit-20261026');out=pathlib.Path('docs/balance/2026-10-26-current');out.mkdir(exist_ok=True)
def read(exp):return [json.loads(l) for f in sorted(root.glob(exp+'-*.jsonl')) for l in f.open()]
def ci(values):
 if not values:return [0,0]
 rng=random.Random(626);n=len(values);v=sorted(statistics.mean(rng.choices(values,k=n)) for _ in range(2000));return [v[50]*100,v[1949]*100]
def pairci(pairs):
 by=collections.defaultdict(list)
 for key,v in pairs:by[key].append(v)
 return ci([statistics.mean(x) for x in by.values()])
res={'experiments':{}}
for exp,n in [('starter',8448),('deck',1152),('market',29088),('pair',7920),('holdout',2688),('counter',576),('pure',960),('thin',288)]:
 rows=read(exp);assert len(rows)==n,(exp,len(rows));assert len({r['job'] for r in rows})==n
 assert all(r['result'] is not None and not r['invalid'] for r in rows),exp
 res['experiments'][exp]={'games':n,'invalid':0,'turnCap':sum(r['end']=='cap' for r in rows),'draws':sum(r['result']==.5 for r in rows)}
 if exp=='starter':
  key=lambda r:(r['bg'],r['seed'],r['seat']);base={key(r):r for r in rows if r['cardId']=='STARTER_TRASH'};g=collections.defaultdict(list)
  for r in rows:g[r['cardId']].append(r)
  res['starters']=[]
  for id,rr in g.items():
   vals=[r['result']-base[key(r)]['result'] for r in rr];use=sum(bool(r['uses'].get(id)) for r in rr)/len(rr)
   res['starters'].append({'id':id,'n':len(rr),'delta':statistics.mean(vals)*100,'ci':pairci([((r['bg'],r['seed']),v) for r,v in zip(rr,vals)]),'win':statistics.mean(r['result'] for r in rr)*100,'use':use*100,'lowUsage':use<.1})
  res['starters'].sort(key=lambda r:(r['lowUsage'],-r['delta'],r['id']))
 if exp=='market':
  g=collections.defaultdict(dict)
  for r in rows:g[r['card']][(r['seed'],r['seat'],r['priority'])]=r
  res['market']=[]
  for id,d in g.items():
   pp=[(r,d[(seed,seat,False)]) for(seed,seat,pri),r in d.items() if pri];assert len(pp)==48
   quick=id.startswith('QUICK_');vals=[a['result']-b['result'] for a,b in pp];bought=sum(bool(a['buys'].get(id)) for a,b in pp);use=sum(bool(a['uses'].get(id) or quick and a['buys'].get(id)) for a,b in pp)
   res['market'].append({'id':id,'n':48,'delta':statistics.mean(vals)*100,'ci':pairci([(a['seed'],v) for(a,b),v in zip(pp,vals)]),'win':statistics.mean(a['result'] for a,b in pp)*100,'bought':bought,'used':use,'lowUsage':use<10,'offered':sum(a['offered'] for a,b in pp),'priorityFired':sum(a['scheduled'] for a,b in pp)})
  res['market'].sort(key=lambda x:(x['lowUsage'],-x['delta'],x['id']))
 if exp in ['holdout','counter','deck','pure','thin']:
  g=collections.defaultdict(list)
  for r in rows:g[(r['name'],r.get('noBuy',False))].append(r)
  res[exp]=[]
  for (name,noBuy),rr in g.items():
   by=collections.defaultdict(list)
   for r in rr:by[r.get('defender',r['market'])].append(r['result'])
   res[exp].append({'name':name,'noBuy':noBuy,'deck':rr[0]['deck'],'n':len(rr),'score':sum(r['result'] for r in rr),'win':statistics.mean(r['result'] for r in rr)*100,'ci':pairci([((r['seed'],r.get('opponent',r.get('defender'))),r['result']) for r in rr]),'medianTurn':statistics.median(r['turn'] for r in rr),'groups':{k:statistics.mean(v)*100 for k,v in by.items()}})
  res[exp].sort(key=lambda x:-x['win'])
 with gzip.open(out/(exp+'-raw.jsonl.gz'),'wt') as f:
  for r in sorted(rows,key=lambda r:r['job']):f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
combo=[json.loads(l) for l in (root/'combo.jsonl').open()];assert len(combo)==384;assert all(not r['bad'] for r in combo)
res['experiments']['combo']={'games':len(combo),'invalid':0,'unfinished':sum(r['result'] is None for r in combo)};g=collections.defaultdict(list)
for r in combo:g[(r['name'],r['counter'])].append(r)
res['combo']=[{'name':k[0],'counter':k[1],'n':len(v),'completed':sum(r['result'] is not None for r in v),'win':statistics.mean(r['result'] for r in v if r['result'] is not None)*100,'loopGames':sum(r['loop']>15 for r in v)}for k,v in g.items()]
with gzip.open(out/'combo-raw.jsonl.gz','wt') as f:
 for r in combo:f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
res['totalGames']=sum(x['games'] for x in res['experiments'].values());res['completedGames']=res['totalGames']-sum(x.get('unfinished',0) for x in res['experiments'].values());(out/'results.json').write_text(json.dumps(res,ensure_ascii=False,indent=2))
print('verified',res['totalGames'],'games; market low-use',sum(x['lowUsage'] for x in res['market']),'starter low-use',sum(x['lowUsage'] for x in res['starters']))
