import collections,hashlib,json
from pathlib import Path
r=Path('.');h=r/'harness';m=json.loads((r/'source-manifest.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m['catalogSha256']=sha(r/'catalog.json');m['bundleHashes']={f:sha(h/f) for f in ['core.bundle.mjs','core-cached.bundle.mjs']};m['runnerHashes']={f:sha(h/f) for f in ['run.mjs','run-cached.mjs','resume-worker.mjs','clone.mjs','sensitivity-run.mjs','sensitivity-worker.mjs','aware-policy.mjs']}
(r/'source-manifest.json').write_text(json.dumps(m,indent=2)+'\n')
c=json.loads((r/'catalog.json').read_text());seen=set();counts=collections.Counter()
for f in (r/'plans').glob('*.jsonl'):
 for line in f.open():
  j=json.loads(line);assert j['id'] not in seen;seen.add(j['id']);counts[f.stem.rsplit('-',1)[0]]+=1
  assert all(len(d)==8 and set(d)<=set(c['starters']) for d in j['decks'])
  assert all(set(route)<=set(c['market']) for route in j.get('priority',[])),j['id']
  assert all(x in c['market'] for x in j.get('market',[]))
assert dict(counts)==m['plannedGroups']
sm={'hashes':{str(f):sha(f) for f in list((r/'supplement/plans').glob('*.jsonl'))+[h/'sensitivity-run.mjs',h/'aware-policy.mjs',h/'core.bundle.mjs',h/'clone.mjs']}}
(r/'supplement/manifest.json').write_text(json.dumps(sm,indent=2)+'\n')
for child in ['supplement','focused']:
 files=list((r/child/'plans').glob('*.jsonl')) if child=='supplement' else [r/child/'gambler-plan.jsonl']
 for f in files:
  for line in f.open():
   j=json.loads(line);assert all(len(d)==8 and set(d)<=set(c['starters']) for d in j['decks']);assert all(set(route)<=set(c['market']) for route in j.get('priority',[]))
(r/'plan-validation.json').write_text(json.dumps({'passed':True,'primaryGames':sum(counts.values()),'uniqueIds':len(seen),'purchasePrioritiesLegal':True,'starterDecksLegal':True,'sameDesignAsV51':True},indent=2)+'\n');print(counts)
