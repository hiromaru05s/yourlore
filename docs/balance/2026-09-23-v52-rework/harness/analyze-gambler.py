import collections as co,gzip,hashlib,itertools,json,math,statistics as st
from pathlib import Path
root=Path('.');base=root/'focused';manifest=json.loads((base/'manifest.json').read_text())
for f,h in manifest['hashes'].items():assert hashlib.sha256(Path(f).read_bytes()).hexdigest()==h
assert json.loads((base/'raw/worker-0.log').read_text().splitlines()[-1])['complete']
f=base/'raw/games-0.jsonl'
if not f.exists():f=f.with_suffix('.jsonl.gz')
groups=co.defaultdict(dict);seen=set();bad=co.Counter();tot=0
with (base/'gambler-plan.jsonl').open() as pf,(gzip.open(f,'rt') if f.suffix=='.gz' else f.open()) as rf:
 for pl,rl in itertools.zip_longest(pf,rf):
  assert pl is not None and rl is not None;p,r=json.loads(pl),json.loads(rl);assert p['id'] not in seen;seen.add(p['id']);tot+=1
  for k,v in p.items():assert r[k]==v
  if not r['finished']:bad[r['reason']]+=1;continue
  groups[r['opponent'],r['rep']][r['copies'],r['starting']]={'score':.5 if r['winner'] is None else float(r['winner']==0),'gamblerUsed':r['sides'][0]['uses'].get('GAMBLER',0)>0,'legendUsed':r['sides'][0]['uses'].get('LEGEND_GAMBLER',0)>0}
assert tot==2688;assert not any(k.startswith('exception:') for k in bad)
vs=[v for v in groups.values() if len(v)==6]
def ci(v):
 n=len(v);m=st.mean(v);se=st.stdev(v)/math.sqrt(n)
 return dict(n=n,mean=m,lo=m-1.96*se,hi=m+1.96*se)
arms={c:ci([st.mean(v[c,s]['score'] for s in [0,1]) for v in vs]) for c in [0,1,2]}
deltas={f'{a}->{b}':ci([st.mean(v[b,s]['score']-v[a,s]['score'] for s in [0,1]) for v in vs]) for a,b in [(0,1),(1,2),(0,2)]}
use={c:{k:st.mean(v[c,s][k] for v in vs for s in [0,1]) for k in ['gamblerUsed','legendUsed']} for c in [0,1,2]}
r={'passed':True,'attempted':tot,'finished':tot-sum(bad.values()),'unfinished':sum(bad.values()),'reasons':dict(bad),'completeBlocks':len(vs),'arms':arms,'deltas':deltas,'use':use,'rawSha256':hashlib.file_digest(f.open('rb'),'sha256').hexdigest(),'notes':'Follow-up design inherited unchanged from v51, fixed Casino recipe and 28 opponents; differences conditional on deliberate Legendary Gambler acquisition. Same seeds/starts; all six games must finish.'}
(base/'results.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
pct=lambda x:f'{x*100:.2f}%';pp=lambda x:f'{x*100:+.2f}pt'
s='# ギャンブラーの専用構築内での役割\n\n2,688戦。カジノ構築のギャンブラー0/1/2枚を比較し、伝説のギャンブラーの購入方針を共通にした追加試験。低い単体枠順位だけでバフを決めないために前回v51で設計した条件をそのまま再実行。本ランキングとは別枠。全6試合が決着した先後・構成ブロックのみ。\n\n| ギャンブラー枚数 | 勝率 | 95%区間 | 本人使用率 | 伝説使用率 |\n|---|---|---|---|---|\n'
for c,z in arms.items():s+=f"| {c} | {pct(z['mean'])} | {pct(z['lo'])}〜{pct(z['hi'])} | {pct(use[c]['gamblerUsed'])} | {pct(use[c]['legendUsed'])} |\n"
s+='\n| 変更 | 差 | 95%区間 | 完全ブロック数 |\n|---|---|---|---|\n'
for k,z in deltas.items():s+=f"| {k}枚 | {pp(z['mean'])} | {pp(z['lo'])}〜{pp(z['hi'])} | {z['n']} |\n"
s+=f"\n決着{r['finished']}戦、未決着{r['unfinished']}戦。理由：{dict(bad)}。0→1を主要比較、1→2と0→2は補助的比較として扱う。v52のリワーク適用後の結果。\n"
Path('gambler-role.md').write_text(s)
