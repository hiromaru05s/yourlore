import collections as co,gzip,json,math,statistics as st
from pathlib import Path
R=json.load(open('results.json'));M=R['rankings']['baseline']['market'];supported={x['id'] for x in M if x['usedRate']>=.5};groups=co.defaultdict(dict)
for f in Path('raw/baseline').glob('games-*.jsonl*'):
 for line in (gzip.open(f,'rt') if f.suffix=='.gz' else f.open()):
  r=json.loads(line)
  if r['stage']!='market' or not r['finished'] or r['peer'] not in supported:continue
  groups[r['card'],r['rep']][r['starting']]={'score':.5 if r['winner'] is None else int(r['winner']==0),'stratum':r['stratum']}
def ci(v):
 n=len(v)
 if not n:return {'n':0,'mean':None,'lo':None,'hi':None}
 m=st.mean(v);se=st.stdev(v)/math.sqrt(n) if n>1 else 0
 return {'n':n,'mean':m,'lo':m-1.96*se,'hi':m+1.96*se}
rows=[]
for x in M:
 gs=[v for (i,n),v in groups.items() if i==x['id'] and len(v)==2]
 rows.append({'id':x['id'],'name':x['name'],'main':x['mean'],'mainRank':x['rank'],'targetUseRate':x['usedRate'],**ci([st.mean(y['score'] for y in v.values()) for v in gs]),'byBackground':{k:ci([st.mean(y['score'] for y in v.values()) for v in gs if v[0]['stratum']==k]) for k in ['default','random','preset','recipe']}})
for x in rows:
 if x['main'] is None:x.update(mean=None,lo=None,hi=None)
r={'notes':'Post-hoc sensitivity using existing games. Comparator identities are restricted to cards with at least 50% usage in their own baseline trials, not selected by whether the comparator was used or won within the evaluated match. This still selects on observed BOT coverage; not an independent human-play validation or a causal change effect. Excludes incomplete first/second-seat pairs. Primary ranks are not overwritten.','supportedComparatorCount':len(supported),'rows':rows}
Path('peer-coverage-sensitivity.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
pct=lambda v:'—' if v is None else f'{v*100:.2f}%'
s='# 相手BOTの未活用カードによる影響\n\n主ランキングには相手が能力を使わないカードも対照として含まれる。追加の対戦を行わず、対照カード自身の基本試験で使用率50%以上だったカードを相手にした試合へ限定し、先後が揃ったものを再集計した。その試合で実際に使ったか・勝ったかで選んでいない。ただし観測後に定義したBOT対応範囲の感度分析で、独立した対人検証やカードの絶対強度ではない。主順位は上書きしない。\n\n| カード | 主比較 | 対照を限定 | 95%区間 | シード数 |\n|---|---|---|---|---|\n'
for x in rows:s+=f"| {x['name']} | {pct(x['main'])} | {pct(x['mean'])} | {pct(x['lo'])}〜{pct(x['hi'])} | {x['n']} |\n"
Path('peer-coverage-sensitivity.md').write_text(s)
for x in rows:
 if x['id'] in ['M11','AJIN','LUCKY_CHEST','MERC_LEADER','TDE3','EGG_MASTER']:print(x['id'],x['n'],pct(x['main']),pct(x['mean']),pct(x['lo']),pct(x['hi']))
print('Supported peer identities',len(supported))
