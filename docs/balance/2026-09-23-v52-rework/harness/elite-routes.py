import collections as co,gzip,json,math,statistics as st
from pathlib import Path
old=Path('../2026-09-21-v51-deep');rank=json.load(open(old/'results.json'))['builds']['packages'];elite=[x['name'] for x in rank[:8]];data=co.defaultdict(dict)
for version,root in [('v51',old),('v52',Path('.'))]:
 for f in (root/'raw/packages').glob('games-*.jsonl*'):
  for line in (gzip.open(f,'rt') if f.suffix=='.gz' else f.open()):
   r=json.loads(line);a,b=r['builds']
   if a not in elite or b not in elite or not r['finished']:continue
   data[a,b,r['rep']][version,r['starting']]=.5 if r['winner'] is None else float(r['winner']==0)
vec=co.defaultdict(list);match=co.defaultdict(list)
for (a,b,rep),z in data.items():
 if len(z)!=4:continue
 oldscore=st.mean(z['v51',s] for s in [0,1]);newscore=st.mean(z['v52',s] for s in [0,1]);vec[a].append((oldscore,newscore));vec[b].append((1-oldscore,1-newscore));match[a,b].append(newscore);match[b,a].append(1-newscore)
def ci(v):
 n=len(v);m=st.mean(v);se=st.stdev(v)/math.sqrt(n)
 return dict(n=n,mean=m,lo=m-1.96*se,hi=m+1.96*se)
rows=[dict(id=k,before=ci([a for a,b in v]),after=ci([b for a,b in v]),delta=ci([b-a for a,b in v])) for k,v in vec.items()];rows.sort(key=lambda x:-x['after']['mean'])
result={'selection':'Top eight fixed purchase routes from prior v51 ranking, identified before considering v52 outcomes. Descriptive subset of existing matched games, not new games or all optimized decks. Does not include aware-policy black-harvest variants.','routes':elite,'rows':rows,'matchups':[dict(a=a,b=b,**ci(v)) for (a,b),v in match.items()]};Path('elite-routes.json').write_text(json.dumps(result,indent=2)+'\n')
labels=json.load(open('build-labels.json'));pct=lambda n:f'{n*100:.2f}%';pp=lambda n:f'{n*100:+.2f}pt'
s='# 前回上位8ルート同士に限った比較\n\n前回v51の上位8ルートを固定して、その内部対戦を再集計。新しい試合は追加していない。専用カードの購入機会を与える条件であり、自然環境や最適構築全体ではない。黒魔法の補助BOT・改良レシピは別試験で、この8種には含まれない。双方の先後が揃うシードだけで比較。\n\n| 構築 | v51 | v52 | 差 | 差の95%区間 | 共通シード |\n|---|---|---|---|---|---|\n'
for x in rows:s+=f"| {labels[x['id']]} | {pct(x['before']['mean'])} | {pct(x['after']['mean'])} | {pp(x['delta']['mean'])} | {pp(x['delta']['lo'])}〜{pp(x['delta']['hi'])} | {x['delta']['n']} |\n"
Path('elite-routes.md').write_text(s);print(s)
