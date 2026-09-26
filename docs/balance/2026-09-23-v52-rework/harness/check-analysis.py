import json,math
from pathlib import Path
r=json.loads(Path('results.json').read_text());v=json.loads(Path('study-validation.json').read_text());s=r['summary']
assert s['completeDataset'] and s['attempted']==v['selectedAttempts']==773696
assert s['finished']==v['finished'] and s['failed']==v['unfinished']
assert s['attempted']==s['finished']+s['failed']
assert not any(k.startswith('exception:') for k in s['reasons']),s['reasons']
for scope,nm,ns,pm,ps in [('baseline',282,33,1024,4096),('coverage',282,33,256,1024),('tactical',24,8,64,128),('tactical-control',24,8,64,128)]:
 assert len(r['rankings'][scope]['market'])==nm
 assert len(r['rankings'][scope]['starters'])==ns
 for x in r['rankings'][scope]['market']:
  assert x['planned']==pm and x['games']==x['n']*2 and x['games']+x['missingGames']==pm
  if x['mean'] is not None:assert x['missingBounds'][0]<=x['mean']<=x['missingBounds'][1]
 for x in r['rankings'][scope]['starters']:assert x['planned']==ps and x['games']==x['n']*4
 for x in r['rankings'][scope]['market']+r['rankings'][scope]['starters']:
  if x['mean'] is not None:assert x['lo']<=x['mean']<=x['hi'] and 0<=x['q']<=1
for scope in ['baseline','coverage']:
 x=next(x for x in r['rankings'][scope]['starters'] if x['id']=='STARTER_TRASH');assert x['mean']==0 and x['lo']==x['hi']==0,'Cull placebo must be exact zero'
assert len(r['combos'])==64
assert {x['combo'] for x in r['combos']}=={'|'.join(x) for x in json.loads(Path('experiment-plan.json').read_text())['combos']}
assert len(r['builds']['baseline'])==len(r['builds']['coverage'])==16 and len(r['builds']['packages'])==28
assert len(r['proposals'])==0
for x in r['proposals']:
 assert x['games']==4*x['n'] and math.isclose(x['candidate']['mean']-x['control']['mean'],x['mean'],abs_tol=1e-12)
for scope,rows in r['matchups'].items():
 d={(x['a'],x['b']):x for x in rows}
 for (a,b),x in d.items():assert math.isclose(x['mean']+d[b,a]['mean'],1,abs_tol=1e-12) and x['games']==d[b,a]['games']
for x in r['combos']:
 assert x['games']==x['n']*8
 a=x['arms'];assert math.isclose(a['11']['mean']-a['10']['mean']-a['01']['mean']+a['00']['mean'],x['mean'],abs_tol=1e-12)

for x in r['pairs']:
 for k in ['aOnly','bOnly','neither']:
  assert x[k] is None or -1e-12 <= x[k] <= 1+1e-12,(x['a'],x['b'],k,x[k])
print('PASS: observed pair comparison denominators and score bounds')
Path('analysis-validation.json').write_text(json.dumps({'passed':True,'checks':['exact sample counts','all 282 market and 33 starter cards','frozen v52 rework, ten approved card changes','64 factorial combinations','zero Cull placebo','paired deltas and confidence intervals','complementary matchup scores','no simulation exceptions','observed pair comparison denominators and score bounds']},indent=2))
print('PASS: analysis invariants')
