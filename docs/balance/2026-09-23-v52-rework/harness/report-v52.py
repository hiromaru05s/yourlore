import collections,json
from pathlib import Path
root=Path('.');r=json.load(open('results.json'));cat=json.load(open('catalog.json'));C=cat['cards'];labels=json.load(open('build-labels.json'));sup=json.load(open('supplement/results.json'));sp=json.load(open('supplement/plan.json'));focused=json.load(open('focused/results.json'));s=r['summary'];assert s['completeDataset'] and focused['passed']
def name(id):return C.get(id,{}).get('nameJa',labels.get(id,id))
def pct(x):return '—' if x is None else f'{x*100:.2f}%'
def pp(x):return '—' if x is None else f'{x*100:+.2f}pt'
def ci(x,d=False):f=pp if d else pct;return f(x['lo'])+'〜'+f(x['hi'])
def tab(head,rows):return '| '+' | '.join(head)+' |\n|'+'|'.join(['---']*len(head))+'|\n'+''.join('| '+' | '.join(str(v).replace('|',' / ').replace('\n',' ') for v in row)+' |\n' for row in rows)+'\n'
def write(f,x):Path(f).write_text(x.rstrip()+'\n')
M=r['rankings']['baseline']['market'];S=r['rankings']['baseline']['starters'];cv={x['id']:x for x in r['rankings']['coverage']['market']};costRanks=collections.Counter();changed=set(json.load(open('catalog-diff-v51.json'))['changed']);oldnew=json.load(open('../2026-09-21-v51-deep/catalog-diff-v49.json'));new=set(oldnew['new']);counter=set(oldnew['counter'])
for x in M:
 if x['rank'] is not None:costRanks[x['cost']]+=1;x['costRank']=costRanks[x['cost']]
 else:x['costRank']=None
 x.update(coverageMean=cv[x['id']]['mean'],new=x['id'] in new,counter=x['id'] in counter)
 if x['id'] in changed:x['flags'].append('今回リワーク適用')
 if x['id'] in ['DISCOVERY_SMALL','DISCOVERY','DISCOVERY_LARGE']:x['flags'].append('同名1回制限適用済み。自己回収時のBOT判断に限界')
 if x['id']=='TAR2':x['flags'].append('BOTが攻撃禁止を見落とす未決着あり')
 if x['id']=='POISON_MASTER':x['flags'].append('腐敗3個の除去判断を補助試験で評価')
 if x['id']=='SOUL_HARVEST':x['flags'].append('専用構築とリバース中の判断を別評価')
marketNote='同じ初期8枚から対象カードと同コストの対照を優先購入して比較。正規コスト・条件を維持するが自然な入手頻度ではない。全体順位は同コスト対照への効率で、コスト間の絶対的な単体強度ではない。使用率10%未満・対照なしは保留。勝ち1・引分0.5、先後が揃うシードのみ。\n\n'
starterNote='カル1枠を対象カードに置換した勝率差（pt）。背景7枚・相手・シード・先後を共通化。使用率10%未満は保留。別枠の固定アチューンは順位なし。\n\n'
write('market-ranking.md','# v52 リワーク後：全体プール282種\n\n'+marketNote+tab(['順位','カード','購入/発動','同コスト順位','比較勝率','95%区間','順位95%範囲','シード','購入率','使用率','補完BOT','注意'],[(x['rank'] or '保留',x['name'],str(x['cost'])+'/'+str(C[x['id']].get('play',x['cost'])),x['costRank'] or '保留',pct(x['mean']),ci(x),x.get('rank95','—'),x['n'],pct(x['boughtRate']),pct(x['usedRate']),pct(x['coverageMean']),' / '.join(x['flags'])) for x in M]))
write('starter-ranking.md','# v52 リワーク後：スターター33種\n\n'+starterNote+tab(['順位','カード','カル比','95%区間','置換後勝率','対照勝率','シード','欠測率','使用率','注意'],[(x['rank'] or '保留',x['name'],pp(x['mean']),ci(x,True),pct(x['treatmentScore']),pct(x['controlScore']),x['n'],pct(x['missingRate']),pct(x['usedRate']),' / '.join(x['flags'])) for x in S]))
comboNote='00=両方対照、10=Aのみ、01=Bのみ、11=両方。相互作用=11−10−01+00。各256シード×先後×4条件、全8戦が決着したブロックのみ。qは64組の多数比較補正。組ごとに背景と対照が異なるため11勝率だけで組同士を絶対比較しない。\n\n'
write('combos.md','# v52 対照付きコンボ64組\n\n'+comboNote+tab(['組み合わせ','共通補助','00','10','01','11','相互作用','95%区間','q値','シード','欠測率','11使用率A/B'],[(x['names'],' / '.join(name(id) for id in x['support']) if x['support'] else 'なし',*(pct(x['arms'][a]['mean']) for a in ['00','10','01','11']),pp(x['mean']),ci(x,True),f"{x['q']:.3g}",x['n'],pct(1-x['n']/256),' / '.join(pct(x['useRates']['11'][id]) for id in x['combo'].split('|'))) for x in r['combos']]))
write('pairs-observed.md','# v52 自然対戦：同時保有の観測\n\n勝っているから買えた等の選択偏りを含み、因果効果ではない。保有150例以上を勝率順で掲載。全組はresults.jsonと検索表へ保存。\n\n'+tab(['カードA','カードB','保有勝率','保有側n','Aのみ','Bのみ','序盤保有勝率','序盤n'],[(x['nameA'],x['nameB'],pct(x['score']),x['n'],pct(x['aOnly']),pct(x['bOnly']),pct(x['earlyScore']),x['earlyN']) for x in r['pairs'] if x['n']>=150]))
recipes=json.load(open('builds.json'));routes=json.load(open('packages.json'));buildTables={};bt='# v52 構築・購入ルートと相性\n\n固定レシピと固定購入順の総当たり。最適構築を探索し尽くした結果ではない。専用ルートは購入機会を与えるが正規コスト・条件を維持。自然な入手頻度とは異なる。通常BOTと補助BOTの差は別掲。\n\n'
for scope,title in [('packages','専用購入ルート28種'),('baseline','通常BOT・初期構築16種'),('coverage','補完BOT・初期構築16種')]:
 xs=r['builds'][scope];buildTables[scope]=tab(['順位','構築','勝率','95%区間','先後ペア','平均ターン','60T率','終了時最大HP'],[(i+1,labels[x['name']],pct(x['mean']),ci(x),x['n'],round(x['turn'],2),pct(x['turncap']),round(x['maxHp'],1)) for i,x in enumerate(xs)])
 bt+='## '+title+'\n\n'+buildTables[scope]
 order=[x['name'] for x in xs];ms={(x['a'],x['b']):x for x in r['matchups'][scope]}
 bt+='### 対面表\n\n行側の成績。\n\n'+tab(['構築']+[labels[x] for x in order],[(labels[a],*(pct(ms[a,b]['mean']) if a!=b else '—' for b in order)) for a in order])
bt+='## 全レシピ・優先購入順\n\nアチューンは別枠で自動付与。\n\n'+tab(['初期構築','8枚'],[(labels[k],' / '.join(f'{name(id)}×{n}' for id,n in collections.Counter(v).items())) for k,v in recipes.items()])+tab(['ルート','初期構築','優先購入順'],[(labels[k],labels[v['deck']],' → '.join(name(id) for id in v['route'])) for k,v in routes.items()]);write('builds-report.md',bt)
bg='# v52 背景デッキ別の感度\n\n主試験を4層へ分けた内訳。追加試合ではない。\n\n'
for title,rows,fmt in [('市場',M,pct),('スターター：カル比',S,pp)]:bg+='## '+title+'\n\n'+tab(['カード','初期カル','無作為8枚','既定BOT','固定レシピ'],[(x['name'],*(fmt(x['byBackground'][k]['mean'])+' (n='+str(x['byBackground'][k]['n'])+')' for k in ['default','random','preset','recipe'])) for x in rows])
write('background-sensitivity.md',bg)
policy='# v52 BOT方針による感度\n\n両側の方針を同時に変えた同条件比較。基準はgreedyDecide(g,false)。補完BOTは一部準備呪文の見落としを補う。戦術探索は状態内の将来の乱数まで評価しうるので対人と同じ条件ではない。小標本の無差は同等性の証明ではない。\n\n'
for scope,sections in r['policyDeltas'].items():
 for section,xs in sections.items():
  fmt=pct if section=='market' else pp
  policy+='## '+scope+' / '+section+'\n\n'+tab(['カード','基準','変更後','差','95%区間','q','シード'],[(x['name'],fmt(x['control']),fmt(x['alternative']),pp(x['mean']),ci(x,True),f"{x['q']:.3g}",x['n']) for x in sorted(xs,key=lambda x:-abs(x['mean']))])
write('policy-sensitivity.md',policy)
follow=f"# v52 構成・BOT判断の追加試験\n\n実行{sup['summary']['attempted']:,}戦、決着{sup['summary']['finished']:,}戦、未決着{sup['summary']['unfinished']:,}戦。カード・ルールは全条件で同じv52。全4試合が決着した比較ブロックのみ。主ランキングへ混ぜない。\n\n補助BOTは腐敗除去、ドロー前の摩耗/成長、炎魔法前の炎術、リバース中の既知の自傷回避を考慮。方針比較では両側へ同じ補助を適用。未来の出目の選別ではない。\n\n"
for kind,title in [('recipe','レシピ変更'),('policy','BOT補助・特化構築'),('card-policy','BOT補助・通常カード')]:
 follow+='## '+title+'\n\n'+tab(['対象','変更前','変更後','差','95%区間','q','シード'],[(sp['variants'][x['variant']]['description'] if kind=='recipe' else name(x['variant']),pct(x['before']['mean']),pct(x['after']['mean']),pp(x['mean']),ci(x,True),f"{x['q']:.3g}",x['n']) for x in sup['rows'] if x['kind']==kind])
follow+='\n構築変更とBOT補助はカードの数値調整とは異なる。異なる相手・初期構築の成績を同列比較しない。\n'
follow+='\n## 対面別の補助BOT・改良レシピ成績\n\n各行の候補側の成績。小標本のため区間も併記。\n\n'
for x in sup['rows']:
 if x['kind']=='card-policy':continue
 follow+='### '+(sp['variants'][x['variant']]['description'] if x['kind']=='recipe' else labels[x['variant']])+'\n\n'+tab(['相手','対照','候補','候補95%区間','共通シード'],[(labels[o],pct(y['control']['mean']),pct(y['candidate']['mean']),ci(y['candidate']),y['candidate']['n']) for o,y in x['byOpponent'].items()])
write('supplement-report.md',follow)
tokens=[id for id in C if id not in cat['market'] and id not in cat['starters']]
write('generated-cards.md','# v52 独立順位なし29種\n\n生成専用・固定アチューン等。入手元や構築全体を通じて評価し、無料配布の単体順位は作らない。創造は同名合計3回制限を適用済み。\n\n'+tab(['カード','ID','効果'],[(name(id),id,C[id]['textJa']) for id in tokens]))
total=s['attempted']+sup['summary']['attempted']+focused['attempted'];finished=s['finished']+sup['summary']['finished']+focused['finished'];failed=total-finished
summary=f"# LORE v52 — リワーク適用後のバランス分析\n\n承認済み10枚をすべて適用した版。本計測と追加試験は合計 **{total:,}戦**、決着 **{finished:,}戦**、未決着 **{failed:,}戦**。前回データや事前確認を今回の実行数へ加算していない。\n\n"
summary+=f"対象は市場282種・スターター33種・64コンボ・28購入ルート・16初期構築。市場{sum(x['rank'] is not None for x in M)}種とスターター{sum(x['rank'] is not None for x in S)}種を順位付けし、それぞれ{sum(x['rank'] is None for x in M)}種・{sum(x['rank'] is None for x in S)}種は低使用率等で保留。生成・固定29種は独立順位なし。\n\n"
summary+='[全282種](market-ranking.md) / [スターター33種](starter-ranking.md) / [検索表](index.html) / [前後比較](version-comparison.md) / [コンボ64組](combos.md) / [自然保有](pairs-observed.md) / [構築と相性](builds-report.md) / [前回上位8ルート](elite-routes.md) / [構成・BOT補助](supplement-report.md) / [背景別](background-sensitivity.md) / [ギャンブラー](gambler-role.md) / [対照の使用率感度](peer-coverage-sensitivity.md) / [適用内容](source-audit.md) / [測定方法](methodology.md)\n\n'
if Path('findings.md').exists():summary+=Path('findings.md').read_text()+'\n\n'
summary+='## 全体上位20\n\n'+marketNote+tab(['順位','カード','比較勝率','95%区間','順位95%範囲','使用率'],[(x['rank'],x['name'],pct(x['mean']),ci(x),x.get('rank95','—'),pct(x['usedRate'])) for x in M if x['rank'] and x['rank']<=20])
summary+='## スターター全順位\n\n'+starterNote+tab(['順位','カード','カル比','95%区間','使用率','注意'],[(x['rank'] or '保留',x['name'],pp(x['mean']),ci(x,True),pct(x['usedRate']),' / '.join(x['flags'])) for x in S])
summary+='## 特化構築順位\n\n'+buildTables['packages']
summary+='## 自然対戦のテンポ\n\n'+tab(['指標','値'],[('決着試合',s['observationGames']),('平均決着ターン',round(s['turns']['baseline:observe']['mean'],2)),('中央値',s['turns']['baseline:observe']['median']),('60T以上',pct(s['endings']['baseline:observe'].get('turncap',0)/s['observationGames'])),('先手得点率',pct(s['firstPlayerScore']['baseline:observe'])),('終了時最大HP平均',round(s['observedMaxHp']['mean'],2))])
summary+=f"## 限界・検証\n\n固定BOT・レシピ・入手機会に依存し、人間の最適プレイを保証しない。細かな順位差は区間が重なることがある。低使用率・条件未達を弱さと断定しない。主試験の未決着理由：`{s['reasons']}`（{pct(s['failed']/s['attempted'])}）。未決着を勝敗へ置き換えず、必要な全試合が揃わない比較ブロックを除外した。\n\n[実装確認](source-audit.md) / [全計画照合](study-validation.json) / [統計検証](analysis-validation.json) / [ランナー一致](cached-reducer-validation.json)。\n"
write('REPORT.md',summary)
data={'summary':{'attempted':s['attempted'],'finished':s['finished'],'failed':s['failed'],'firstScore':{'observe':s['firstPlayerScore']['baseline:observe']}},'market':M,'starters':[{**x,'observedUses':round(x['usedRate']*x['n']*2)} for x in S],'pairs':r['pairs'],'factor':[{**x,'arms':{k:v['mean'] for k,v in x['arms'].items()}} for x in r['combos']],'builds':[{**x,'build':x['name']} for x in r['builds']['baseline']],'packages':[{**x,'build':x['name']} for x in r['builds']['packages']],'proposals':[],'quests':[{**x,'complete':x['completed']} for x in r['quests']],'names':{id:name(id) for id in C},'buildLabels':labels}
write('index.html',Path('harness/view.html').read_text().replace('{{VERSION}}','v52').replace('/*DATA*/{}',json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')))
write('delivery-counts.json',json.dumps(dict(attempted=total,finished=finished,unfinished=failed,primary=s['attempted'],supplement=sup['summary']['attempted'],focused=focused['attempted']),indent=2))
print('Rendered v52 rankings and report:',total,finished,failed)
