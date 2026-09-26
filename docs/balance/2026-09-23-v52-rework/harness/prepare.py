import collections,hashlib,json,shutil,subprocess
from pathlib import Path
repo=Path.cwd();old=repo/'docs/balance/2026-09-21-v51-deep';root=repo/'docs/balance/2026-09-23-v52-rework';h=root/'harness';source=h/'source'
source.mkdir(exist_ok=True);shutil.copytree(repo/'client/src/shared',source/'client/src/shared',dirs_exist_ok=True)
(source/'tests').mkdir(exist_ok=True)
for f in ['balance-v52.mjs','balance-v49.mjs','balance-v47.mjs','half-elf-v48.mjs','expansion-v50.mjs','quest-quick.mjs','trap-removal.mjs']:shutil.copy2(repo/'tests'/f,source/'tests'/f)
for f in ['entry.ts','run.mjs','clone.mjs','build-cached.py','resume-worker.mjs','analyze-deep.py','verify-study.py','check-cached.mjs','check-analysis.py','view.html','sensitivity-run.mjs','sensitivity-worker.mjs','aware-policy.mjs','analyze-supplement.py','peer-coverage.py','compare-versions.py','archive-raw.py']:
 shutil.copy2(old/'harness'/f,h/f)
for f in ['builds.json','build-labels.json','packages.json','schedule.json','methodology.md']:
 shutil.copy2(old/f,root/f)
(root/'superseded-jobs.json').write_text('{"ids":[]}\n')
superseded=set(json.loads((old/'superseded-jobs.json').read_text())['ids']);counts=collections.Counter();out={}
(root/'plans').mkdir(exist_ok=True)
try:
 for f in sorted((old/'plans').glob('*.jsonl')):
  group,shard=f.stem.rsplit('-',1);group='combos' if group=='correction' else group;key=f'{group}-{shard}'
  if key not in out:out[key]=(root/'plans'/f'{key}.jsonl').open('w')
  for line in f.open():
   job=json.loads(line)
   if job['id'] in superseded:continue
   job['id']=job['id'].replace('v51','v52');out[key].write(json.dumps(job,separators=(',',':'))+'\n');counts[group]+=1
finally:
 for f in out.values():f.close()
assert sum(counts.values())==773696
plan=json.loads((old/'experiment-plan.json').read_text());plan.update(version='v52',date='2026-09-23',counts=dict(counts),total=sum(counts.values()))
plan['combos']=[['M11','STABLE'] if c==['INFKNIGHT','STABLE'] else c for c in plan['combos']]
(root/'experiment-plan.json').write_text(json.dumps(plan,indent=2)+'\n')
for child in ['supplement','focused']:
 (root/child).mkdir(exist_ok=True)
 if child=='supplement':
  shutil.copytree(old/child/'plans',root/child/'plans',dirs_exist_ok=True)
  shutil.copy2(old/child/'plan.json',root/child/'plan.json')
 else:
  shutil.copy2(old/child/'gambler-plan.jsonl',root/child/'gambler-plan.jsonl');shutil.copy2(old/child/'plan.json',root/child/'plan.json')
manifest={'version':'v52','date':'2026-09-23','baseCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'source':str(source),'sourceHashes':{str(f.relative_to(source)):hashlib.sha256(f.read_bytes()).hexdigest() for f in source.rglob('*') if f.is_file()},'plannedGroups':dict(counts),'totalPlanned':sum(counts.values()),'totalRawPlanned':sum(counts.values()),'planHashes':{str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (root/'plans').glob('*.jsonl')}}
(root/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(counts)
