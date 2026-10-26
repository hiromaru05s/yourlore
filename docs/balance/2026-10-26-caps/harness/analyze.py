import sys,json,gzip,hashlib,random,collections,pathlib,statistics
root=pathlib.Path(sys.argv[1]); dest=pathlib.Path(sys.argv[2]); dest.mkdir(parents=True,exist_ok=True)
plans=json.loads((root/'combined-plan.json').read_text()); expected={(r['plan'],r['job']) for r in plans};assert len(expected)==20304
rows={}
for ver,files in [('before',[root/f'before-{i}.jsonl' for i in range(2)]),('after',[root/f'after-final-{i}.jsonl' for i in range(4)])]:
 data=[json.loads(line) for f in files for line in f.read_text().splitlines() if line]
 assert len(data)==len(expected),(ver,len(data));assert {(r['plan'],r['job']) for r in data}==expected
 assert all(r['result'] is not None and r['invalid'] is None for r in data)
 assert all(not r['buys'] for r in data if r.get('noBuy'))
 rows[ver]=sorted(data,key=lambda r:(r['plan'],r['job']))
 with gzip.open(dest/f'{ver}-raw.jsonl.gz','wt') as out:
  for r in rows[ver]:out.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
 def group(key,subset):
  g=collections.defaultdict(list)
  for r in subset:g[key(r)].append(r)
  return {k:{'n':len(rs),'wins':sum(r['result']==1 for r in rs),'draws':sum(r['result']==.5 for r in rs),'winEquivalent':sum(r['result'] for r in rs),'rate':sum(r['result'] for r in rs)/len(rs),'meanTurns':statistics.mean(r['turn'] for r in rs),'deck':rs[0]['deck'],'gamesUsingCard':sum(r.get('cardId') in r['uses'] for r in rs)} for k,rs in g.items()}
 globals()[ver]={kind:group(lambda r:r.get('name',r.get('cardId')), [r for r in data if r['plan']==kind]) for kind in ['pure','holdout','starter','pair']}
 globals()[ver]['thin']=group(lambda r:r['name']+'/'+r['opponent'],[r for r in data if r['plan']=='thin'])
with gzip.open(dest/'combined-plan.json.gz','wt') as f:json.dump(plans,f,separators=(',',':'))
# Pair each seat, seed and opponent; cluster both seats when bootstrapping deltas.
rng=random.Random(641026)
def ci(groups,n=2000):
 vals=list(groups.values());est=[]
 for _ in range(n):
  picked=[rng.choice(vals) for i in vals];est.append(sum(sum(x) for x in picked)/sum(len(x) for x in picked))
 est.sort();return [est[int(.025*n)],est[int(.975*n)]]
changes={}
for kind in ['pure','thin','holdout']:
 grouped=collections.defaultdict(lambda:collections.defaultdict(list))
 for a,b in zip(rows['before'],rows['after']):
  assert (a['plan'],a['job'])==(b['plan'],b['job'])
  if a['plan']!=kind:continue
  key=a['name']+('/'+a['opponent'] if kind=='thin' else '')
  grouped[key][(a['seed'],a['opponent'])].append(b['result']-a['result'])
 changes[kind]={k:{'delta':sum(map(sum,g.values()))/sum(map(len,g.values())),'pairedBootstrap95':ci(g)} for k,g in grouped.items()}
starters={}
for ver in ['before','after']:
 rs=[r for r in rows[ver] if r['plan']=='starter'];control={(r['bg'],r['seed'],r['seat']):r for r in rs if r['cardId']=='STARTER_TRASH'}
 g=collections.defaultdict(lambda:collections.defaultdict(list))
 for r in rs:g[r['cardId']][(r['bg'],r['seed'])].append(r['result']-control[(r['bg'],r['seed'],r['seat'])]['result'])
 starters[ver]=sorted([{'id':k,'deltaVsCull':sum(map(sum,v.values()))/sum(map(len,v.values())),'pairedBootstrap95':ci(v),**globals()[ver]['starter'][k]} for k,v in g.items()],key=lambda r:-r['deltaVsCull'])
result={'attempts':40608,'completed':40608,'invalid':0,'unfinished':0,'perEngine':20304,'baselineCommit':(root/'before-sha.txt').read_text().strip(),'before':before,'after':after,'changes':changes,'starterMarginal':starters,'method':'Same decks/seeds/seats/policies on both rule versions. Both players use the respective rule version. Draw=0.5. No purchases allowed in pure. Pair screening 990 x 8 is exploratory; 44 starter slots x 192 each. CIs are paired seed/opponent-cluster bootstrap, exploratory and not corrected for multiple comparisons. BOT policy is not optimal human play.'}
(dest/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
for name in ['before.cjs','after-final.cjs']:
 with gzip.open(dest/(name+'.gz'),'wb') as f:f.write((root/name).read_bytes())
(dest/'engine-sha256.json').write_text(json.dumps({n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in ['before.cjs','after-final.cjs']},indent=2)+'\n')
print(json.dumps({'counts':40608,'pure':{k:[before['pure'][k]['rate'],v['rate']] for k,v in after['pure'].items()},'topStarter':[(r['id'],r['deltaVsCull']) for r in starters['after'][:10]],'topPairs':sorted([(k,v['rate']) for k,v in after['pair'].items()],key=lambda x:-x[1])[:30]},ensure_ascii=False,indent=2))
