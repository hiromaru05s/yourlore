import ast,collections as co,gzip,itertools,json,math,statistics as st,sys
from pathlib import Path
onlyPackages='--packages-only' in sys.argv;stem='version-comparison.packages' if onlyPackages else 'version-comparison';root=Path('.').resolve();prior=root.parent/'2026-09-21-v51-deep';groups=co.defaultdict(dict);counts=co.Counter();trunc=co.Counter()
for version,folder in [('v51',prior),('v52',root)]:
 for scope in (['packages'] if onlyPackages else ['baseline','packages']):
  for file in sorted((folder/'raw'/scope).glob('games-*.jsonl*')):
   with (gzip.open(file,'rt') if file.suffix=='.gz' else file.open()) as stream:
    for line in stream:
     try:r=json.loads(line)
     except ValueError:
      assert version=='v51' and not line.endswith('\n');trunc[str(file)]+=1;continue
     stage=r['stage']
     if scope=='baseline' and stage not in ['market','starter']:continue
     counts[version,stage]+=1
     if not r['finished']:continue
     target=r['card'] if stage in ['market','starter'] else '|'.join(r['builds'])
     key=(stage,target,r['rep']);slot=(version,r.get('arm',''),r['starting']);assert slot not in groups[key]
     groups[key][slot]=(.5 if r['winner'] is None else float(r['winner']==0))
def ci(v):
 n=len(v);m=st.mean(v);se=st.stdev(v)/math.sqrt(n) if n>1 else 0
 return {'n':n,'mean':m,'lo':m-1.96*se,'hi':m+1.96*se,'p':math.erfc(abs(m)/(se*math.sqrt(2))) if se else (0 if m else 1)}
def bh(xs):
 order=sorted(xs,key=lambda x:x['p']);q=1
 for i in range(len(order)-1,-1,-1):q=min(q,order[i]['p']*len(order)/(i+1));order[i]['q']=q
stats=co.defaultdict(list)
for (stage,target,rep),v in groups.items():
 if stage=='starter':
  if len(v)!=8:continue
  before=st.mean(v['v51','treatment',s]-v['v51','control',s] for s in [0,1]);after=st.mean(v['v52','treatment',s]-v['v52','control',s] for s in [0,1])
 else:
  if len(v)!=4:continue
  before=st.mean(v['v51','',s] for s in [0,1]);after=st.mean(v['v52','',s] for s in [0,1])
 if stage=='build':
  a,b=target.split('|');stats['packages',a].append((before,after));stats['packages',b].append((1-before,1-after))
 else:stats[stage,target].append((before,after))
rows=[]
for (stage,target),vs in sorted(stats.items()):
 rows.append({'scope':stage,'id':target,**ci([b-a for a,b in vs]),'before':st.mean(a for a,b in vs),'after':st.mean(b for a,b in vs)})
for scope in {x['scope'] for x in rows}:bh([x for x in rows if x['scope']==scope])
assert onlyPackages or len([x for x in rows if x['scope']=='market'])==282
out={'compares':'Combined effect of the ten approved changes; not an attribution to a single change. Paired complete blocks only. Unfinished comparison blocks are excluded.','counts':[{ 'version':v,'stage':s,'attemptsRead':n} for (v,s),n in counts.items()],'oldPartialFinalLinesIgnored':dict(trunc),'rows':rows}
Path(stem+'.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
C=json.load(open('catalog.json'))['cards']
labels=json.loads(Path('build-labels.json').read_text())
name=lambda i,scope:labels.get(i,i) if scope=='packages' else C.get(i,{}).get('nameJa',i)
pct=lambda x:f'{x*100:.2f}%';pp=lambda x:f'{x*100:+.2f}pt'
s='# v51→v52の同条件比較\n\n10変更をまとめて適用した版間差。デッキ・対戦相手・乱数・先後・購入方針が同一の条件を使い、両バージョンで必要な試合が全て決着したブロックだけを採用した。1枚の個別調整だけの効果には分解できない。欠測によりカードごとの共通ブロック数が異なる場合がある。以下の値は比較対象をそろえた平均で、全件の主ランキングと僅かに異なりうる。既存データの再集計であり、v52の実行試合数へ重ねて加算しない。\n\n'
for scope,title in [('market','市場282種：比較勝率の変化'),('starter','スターター：カル比の変化'),('packages','専用構築：対戦勝率の変化')]:
 if onlyPackages and scope!='packages':continue
 xs=sorted([x for x in rows if x['scope']==scope],key=lambda x:-abs(x['mean']));fmt=pp if scope=='starter' else pct
 s+='## '+title+'\n\n| カード/構築 | v51 | v52 | 差 | 95%区間 | 共通ブロック | q |\n|---|---|---|---|---|---|---|\n'
 for x in xs:s+=f"| {name(x['id'],scope)} | {fmt(x['before'])} | {fmt(x['after'])} | {pp(x['mean'])} | {pp(x['lo'])}〜{pp(x['hi'])} | {x['n']} | {x['q']:.4g} |\n"
 s+='\n'
Path(stem+'.md').write_text(s);print('Saved paired v51/v52 comparisons',len(rows),'rows')
