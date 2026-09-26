import collections as co,gzip,json,math,statistics as st
from pathlib import Path

root=Path('.').resolve();old=root.parent/'2026-09-21-v51-deep';groups=co.defaultdict(dict);signatures={};counts=co.Counter()
for version,folder in [('v51',old),('v52',root)]:
 for f in sorted((folder/'supplement/raw').glob('games-*.jsonl*')):
  for line in (gzip.open(f,'rt') if f.suffix=='.gz' else f.open()):
   r=json.loads(line);key=(r['kind'],r['variant'],r['opponent'],r['rep']);slot=(key,r['arm'],r['starting'])
   signature=json.dumps({k:r.get(k) for k in ['seed','decks','starting','policy','tactical','priority','peer','controls','support','aware']},sort_keys=True)
   if version=='v51':assert slot not in signatures;signatures[slot]=signature
   else:assert signatures[slot]==signature,slot
   counts[version]+=1
   if r['finished']:groups[key][version,r['arm'],r['starting']]=.5 if r['winner'] is None else float(r['winner']==0)
assert counts=={'v51':43264,'v52':43264},counts
def ci(v):
 n=len(v);m=st.mean(v);se=st.stdev(v)/math.sqrt(n) if n>1 else 0
 return dict(n=n,mean=m,lo=m-1.96*se,hi=m+1.96*se,p=math.erfc(abs(m)/(se*math.sqrt(2))) if se else (0 if m else 1))
rows=[]
for kind,variant in sorted({(k,v) for k,v,o,n in groups}):
 blocks=[v for (k,b,o,n),v in groups.items() if (k,b)==(kind,variant) and len(v)==8]
 before=[st.mean(v['v51','candidate',s] for s in [0,1]) for v in blocks]
 after=[st.mean(v['v52','candidate',s] for s in [0,1]) for v in blocks]
 rows.append(dict(kind=kind,variant=variant,before=st.mean(before),after=st.mean(after),**ci([b-a for a,b in zip(before,after)])))
order=sorted(rows,key=lambda x:x['p']);q=1
for i in range(len(order)-1,-1,-1):q=min(q,order[i]['p']*len(order)/(i+1));order[i]['q']=q
Path('version-comparison-supplement.json').write_text(json.dumps({'notes':'Same candidate recipe/policy under v51 and v52. Complete eight-game blocks only. All ten reworks together, not an isolated Harvest effect. Same seed, deck, opponent, priority and policy verified.','rows':rows},ensure_ascii=False,indent=2)+'\n')
labels=json.load(open('build-labels.json'));cards=json.load(open('catalog.json'))['cards'];variants=json.load(open('supplement/plan.json'))['variants']
def name(x):return variants.get(x,{}).get('description',cards.get(x,{}).get('nameJa',labels.get(x,x)))
def pct(x):return f'{x*100:.2f}%'
def pp(x):return f'{x*100:+.2f}pt'
s='# 特化BOT・改良レシピのv51→v52比較\n\n同じ改良レシピ／補助BOTを両版で使った前後比較。両版の対照・候補・先後の全8試合が決着したブロックのみ。10枚の同時変更と相手への影響を含み、魂の収穫だけの因果効果ではない。\n\n| 種別 | 対象 | v51 | v52 | 差 | 95%区間 | 共通シード | q |\n|---|---|---|---|---|---|---|---|\n'
for x in rows:s+=f"| {x['kind']} | {name(x['variant'])} | {pct(x['before'])} | {pct(x['after'])} | {pp(x['mean'])} | {pp(x['lo'])}〜{pp(x['hi'])} | {x['n']} | {x['q']:.3g} |\n"
Path('version-comparison-supplement.md').write_text(s);print('PASS paired specialized version comparisons',len(rows))
