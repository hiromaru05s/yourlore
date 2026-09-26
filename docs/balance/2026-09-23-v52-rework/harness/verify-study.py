"""Verify every saved plan against its raw result; never silently accept truncation."""
import collections,gzip,hashlib,itertools,json,sys
from pathlib import Path
root=Path('.');manifest=json.loads((root/'source-manifest.json').read_text());superseded=set(json.loads((root/'superseded-jobs.json').read_text())['ids'])
catalog=json.loads((root/'catalog.json').read_text());starters=set(catalog['starters']);market=set(catalog['market'])
assert hashlib.sha256((root/'catalog.json').read_bytes()).hexdigest()==manifest['catalogSha256']
seen=set();found_superseded=set();counts=collections.Counter();selected=collections.Counter();bad=collections.Counter();files=[]
for plan in sorted((root/'plans').glob('*.jsonl')):
 assert hashlib.sha256(plan.read_bytes()).hexdigest()==manifest['planHashes'][str(plan)],f'Plan changed: {plan}'
 group,shard=plan.stem.rsplit('-',1);out=root/'raw'/group/f'games-{shard}.jsonl'
 if not out.exists():out=out.with_suffix('.jsonl.gz')
 assert out.exists(),f'Missing {out}'
 log=json.loads((out.parent/f'worker-{shard}.log').read_text().splitlines()[-1]);assert log.get('complete'),f'Incomplete {group}-{shard}'
 n=0
 with plan.open() as pf,(gzip.open(out,'rt') if out.suffix=='.gz' else out.open()) as rf:
  for pl,rl in itertools.zip_longest(pf,rf):
   assert pl is not None and rl is not None,f'Length mismatch {out} line {n+1}'
   p,r=json.loads(pl),json.loads(rl);n+=1
   assert p['id'] not in seen,f'Duplicate {p["id"]}';seen.add(p['id'])
   for key,value in p.items():assert r.get(key)==value,f'Plan mismatch {p["id"]}: {key}'
   counts[group]+=1
   assert len(p['decks'])==2 and all(len(deck)==8 and set(deck)<=starters for deck in p['decks']),f'Illegal initial deck {p["id"]}'
   if p.get('priority') and p['id'] not in superseded:assert all(set(route)<=market for route in p['priority']),f'Illegal purchase priority {p["id"]}'
   assert isinstance(r['finished'],bool)
   assert r['winner'] in (None,0,1)
   if r['id'] in superseded:
    assert p.get('combo')=='INFKNIGHT|STABLE'
    found_superseded.add(r['id']);continue
   selected[group]+=1
   if not r['finished']:bad[r['reason']]+=1
 assert n==log['done'],f'Log count mismatch {out}'
 files.append({'path':str(out),'games':n,'bytes':out.stat().st_size,'sha256':hashlib.file_digest(out.open('rb'),'sha256').hexdigest()})
assert found_superseded==superseded
assert dict(counts)==manifest['plannedGroups'],(dict(counts),manifest['plannedGroups'])
assert sum(counts.values())==manifest['totalRawPlanned'];assert sum(selected.values())==manifest['totalPlanned']
for file,expected in manifest['sourceHashes'].items():assert hashlib.sha256((Path(manifest['source'])/file).read_bytes()).hexdigest()==expected,f'Source changed: {file}'
for file,expected in manifest['bundleHashes'].items():assert hashlib.sha256((root/'harness'/file).read_bytes()).hexdigest()==expected,f'Bundle changed: {file}'
for file,expected in manifest.get('runnerHashes',{}).items():assert hashlib.sha256((root/'harness'/file).read_bytes()).hexdigest()==expected,f'Runner changed: {file}'
result={'passed':True,'rawGames':sum(counts.values()),'selectedAttempts':sum(selected.values()),'superseded':len(found_superseded),'finished':sum(selected.values())-sum(bad.values()),'unfinished':sum(bad.values()),'reasons':dict(bad),'groups':dict(counts),'selectedGroups':dict(selected),'selectedPurchasePrioritiesLegal':True,'supersededAudit':None,'planEquality':True,'uniqueIds':True,'sourceUnchanged':True,'bundleHashesMatch':True,'rawFiles':files}
(root/'study-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='rawFiles'},ensure_ascii=False))
