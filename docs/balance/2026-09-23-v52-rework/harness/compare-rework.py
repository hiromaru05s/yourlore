import collections as co,gzip,json,math,statistics as st
from pathlib import Path
root=Path('.').resolve();old=root.parent/'2026-09-21-v51-deep';groups=co.defaultdict(dict);counts=co.Counter();signatures={}
for ver,folder in [('v51',old),('v52',root)]:
 for scope in ['baseline','packages','combos']:
  for f in sorted((folder/'raw'/scope).glob('games-*.jsonl*')):
   for line in (gzip.open(f,'rt') if f.suffix=='.gz' else f.open()):
    r=json.loads(line);stage=r['stage']
    if scope=='baseline' and stage not in ['market','starter']:continue
    if stage=='factor' and r['combo']=='INFKNIGHT|STABLE':continue
    target=r.get('card',r.get('combo','|'.join(r.get('builds',[]))))
    key=(stage,target,r['rep']);arm=r.get('arm','');start=r['starting'];sig=json.dumps({k:r.get(k) for k in ['seed','decks','starting','policy','tactical','priority','peer','controls','support']},sort_keys=True)
    sk=(key,arm,start)
    if ver=='v51':signatures[sk]=sig
    elif sk in signatures:assert signatures[sk]==sig,sk
    else:
     # Corrected Warlord + Stable records were stored in correction/ in v51.
     assert stage=='factor' and target=='M11|STABLE';continue
    counts[ver,stage]+=1
    if not r['finished']:continue
    groups[key][ver,arm,start]=.5 if r['winner'] is None else float(r['winner']==0)
# Load the corrected v51 factor and match it to the v52 plan explicitly.
for ver,folder,scope in [('v51',old,'correction'),('v52',root,'combos')]:
 for f in (folder/'raw'/scope).glob('games-*.jsonl*'):
  for line in (gzip.open(f,'rt') if f.suffix=='.gz' else f.open()):
   r=json.loads(line)
   if r.get('combo')!='M11|STABLE':continue
   key=('factor','M11|STABLE',r['rep']);slot=(ver,r['arm'],r['starting']);assert slot not in groups[key]
   sk=(key,r['arm'],r['starting']);sig=json.dumps({k:r.get(k) for k in ['seed','decks','starting','policy','tactical','priority','peer','controls','support']},sort_keys=True)
   if ver=='v51':signatures[sk]=sig
   else:assert signatures[sk]==sig
   if r['finished']:groups[key][slot]=.5 if r['winner'] is None else float(r['winner']==0)
def ci(v):
 n=len(v);m=st.mean(v);se=st.stdev(v)/math.sqrt(n) if n>1 else 0
 return dict(n=n,mean=m,lo=m-1.96*se,hi=m+1.96*se,p=math.erfc(abs(m)/(se*math.sqrt(2))) if se else (0 if m else 1))
def bh(xs):
 order=sorted(xs,key=lambda x:x['p']);q=1
 for i in range(len(order)-1,-1,-1):q=min(q,order[i]['p']*len(order)/(i+1));order[i]['q']=q
stats=co.defaultdict(list)
for (stage,target,rep),v in groups.items():
 need=16 if stage=='factor' else 8 if stage=='starter' else 4
 if len(v)!=need:continue
 def score(ver):
  if stage=='starter':return st.mean(v[ver,'treatment',s]-v[ver,'control',s] for s in [0,1])
  return st.mean(v[ver,'11' if stage=='factor' else '',s] for s in [0,1])
 a,b=score('v51'),score('v52')
 if stage=='build':
  x,y=target.split('|');stats['packages',x].append((a,b));stats['packages',y].append((1-a,1-b))
 else:stats[stage,target].append((a,b))
rows=[dict(scope=scope,id=id,**ci([b-a for a,b in vs]),before=st.mean(a for a,b in vs),after=st.mean(b for a,b in vs)) for (scope,id),vs in sorted(stats.items())]
for scope in {x['scope'] for x in rows}:bh([x for x in rows if x['scope']==scope])
assert sum(x['scope']=='market' for x in rows)==282;assert sum(x['scope']=='factor' for x in rows)==64
result={'version':'v51 → v52','notes':'All ten reworks applied together. Complete paired blocks only. Decks, opponents, seed, priority and BOT policy verified identical. Not a single-card causal attribution. Old games excluded from new execution count.','rows':rows}
(root/'version-comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
cat=json.load(open('catalog.json'))['cards'];labels=json.load(open('build-labels.json'));name=lambda id:cat.get(id,{}).get('nameJa',labels.get(id,id));pct=lambda x:f'{x*100:.2f}%';pp=lambda x:f'{x*100:+.2f}pt'
s='# v51 → v52：リワーク前後の同条件比較\n\n10枚を同時に変更した総合的な差。両版のデッキ・相手・乱数・先後・購入方針・BOT方針が一致することを照合し、双方の全試合が決着したブロックだけで計算した。各カード1枚の調整だけに因果を分解できない。旧版の試合は今回の実行数に加算しない。コンボは8条件×2版が揃うものの11条件の差。\n\n'
for scope,title in [('market','全体プール'),('starter','スターター枠価値'),('packages','専用購入ルート'),('factor','コンボ同時採用')]:
 s+='## '+title+'\n\n| カード・構築 | v51 | v52 | 差 | 95%区間 | 共通シード | q |\n|---|---|---|---|---|---|---|\n'
 fmt=pp if scope=='starter' else pct
 for x in sorted([x for x in rows if x['scope']==scope],key=lambda x:-abs(x['mean'])):s+=f"| {'＋'.join(name(id) for id in x['id'].split('|'))} | {fmt(x['before'])} | {fmt(x['after'])} | {pp(x['mean'])} | {pp(x['lo'])}〜{pp(x['hi'])} | {x['n']} | {x['q']:.3g} |\n"
 s+='\n'
(root/'version-comparison.md').write_text(s.rstrip()+'\n');print('Paired rework comparisons:',len(rows))
