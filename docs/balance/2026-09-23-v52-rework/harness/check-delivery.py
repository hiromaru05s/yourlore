import hashlib,json,re
from pathlib import Path
root=Path('.').resolve();r=json.load(open('results.json'));s=json.load(open('supplement/results.json'));f=json.load(open('focused/results.json'));v=json.load(open('study-validation.json'));a=json.load(open('analysis-validation.json'))
assert v['passed'] and a['passed'] and f['passed'];assert json.load(open('supplement/validation.json'))['passed']
assert v['rawGames']+s['summary']['attempted']+f['attempted']==819648 and v['superseded']==0
assert r['summary']['completeDataset'];assert r['summary']['attempted']+s['summary']['attempted']+f['attempted']==819648
counts={'market-ranking.md':282,'starter-ranking.md':33,'generated-cards.md':29,'combos.md':64}
for file,n in counts.items():
 lines=[l for l in Path(file).read_text().splitlines() if l.startswith('|')];assert len(lines)==n+2,(file,len(lines),n)
files=[p for p in root.glob('*.md') if p.name not in ['TASK_STATE.md','findings-draft.md']]
for p in files:
 text=p.read_text();assert not any(x in text for x in ['{{VERSION}}','nan%','None%']),p.name
 for link in re.findall(r'\]\(([^)]+)\)',text):
  if '://' in link or link.startswith('#'):continue
  target=(p.parent/link.split('#',1)[0]).resolve();assert target.exists(),(p.name,link)
report=Path('REPORT.md').read_text();assert '819,648' in report and 'v52' in report
assert '復元' not in Path('generated-cards.md').read_text()
for scope in ['baseline','coverage']:
 for kind in ['market','starters']:
  for x in r['rankings'][scope][kind]:
   if x['usedRate']<.1:assert x['rank'] is None,(scope,kind,x['id'])
manifest={str(p.relative_to(root)):{'bytes':p.stat().st_size,'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest()} for p in sorted(root.glob('*')) if p.is_file() and p.suffix in ['.md','.json','.html'] and not p.name.endswith('-preview.json') and not p.name.startswith('version-comparison.packages.') and p.name not in ['delivery-manifest.json','delivery-validation.json','progress.json','TASK_STATE.md','results.partial.json','invalid-games.partial.json','findings-draft.md']}
Path('delivery-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
Path('delivery-validation.json').write_text(json.dumps({'passed':True,'selectedPlanAttempts':819648,'studyAttempts':819648,'superseded':0,'tableRows':counts,'localLinksChecked':True,'heldCardsUnranked':True,'reportVersion':'v52'},indent=2)+'\n');print('PASS: final artifact counts, local links, version, held rankings, totals and manifest')
