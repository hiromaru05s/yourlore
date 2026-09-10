#!/usr/bin/env python3
import json,sys,html,statistics as st
from pathlib import Path
root=Path(sys.argv[1]);r=json.loads((root/'results.json').read_text());c=json.loads((root/'catalog.json').read_text());s=r['summary'];meta=json.loads((root/'source-manifest.json').read_text());version=c['version']
def pc(v):return '—' if v is None else f'{v*100:.1f}%'
def pp(v):return '—' if v is None else f'{v*100:+.1f}pt'
def ci(x):return f"{pp(x['lo'])}〜{pp(x['hi'])}"
def name(id):return c['cards'][id].get('nameJa',id)
def table(head,rows):return '| '+' | '.join(head)+' |\n|'+ '|'.join(['---']*len(head))+'|\n'+''.join('| '+' | '.join(str(v).replace('|',' / ').replace('\n',' ') for v in row)+' |\n' for row in rows)+'\n'
market=[(i+1 if x.get('peerCount',1)>0 else '保留',x['name'],x['id'],x['cost'],pc(x['mean']),f"{pc(x['lo'])}〜{pc(x['hi'])}",x['games'],pc(x['boughtRate']),pc(x['usedRate']),pc(x['observed']['score']),x['observed'].get('n',0),x['excludedGames'],' / '.join(x.get('flags',[]))) for i,x in enumerate(r['market'])]
(root/'market-ranking.md').write_text('# 全体プール240種：同コスト比較ランキング\n\n勝率は同コストの無作為な相手カードに対し、双方が指定カードを通常価格で優先購入するBOT方針の成績。先後を変えた2戦を1シードとして信頼区間を計算。純粋な単体性能や人間対戦の順位とは異なる。自然観測は購入した側の勝率で、因果効果ではない。引分は0.5勝。使用率は全比較対戦を分母とする。\n\n'+table(['順位','カード','ID','コスト','比較勝率','95% CI','採用試合数','購入率','使用率','自然観測勝率','観測n','除外試合数','注意点'],market))
starter=[(i+1,x['name'],x['id'],pp(x['mean']),ci(x),pc(x['treatmentScore']),pc(x['controlScore']),x['n'],' / '.join(x.get('flags',[]))) for i,x in enumerate(r['starters'])]
(root/'starter-ranking.md').write_text('# スターター33種：カル1枠との差分\n\n同じ背景デッキ・相手・シード・先後で、カル1枠を指定カードに置換。差分は勝率ポイント。各カード200シード×4戦を予定し、4戦すべて決着したシードだけ採用。アチューンは全員に固定1枚のため順位なし。重複採用や専用構築での価値とは異なる。\n\n'+table(['順位','カード','ID','カル比','95% CI','置換側勝率','対照勝率','独立シード数','注意点'],starter))
buildlabels={'DEFAULT':'初期カル','AGGRO':'速攻','RAMP':'ランプ','MIDRANGE':'ミッドレンジ','GAMBLER':'ギャンブラー','ELF':'エルフ','CASTLE':'城','ASSASSIN':'アサシン','DECAY':'腐敗','CULL':'カル特殊勝利','EGG':'卵','MERCHANT':'商人・醸造','DUNGEON':'ダンジョン','CASINO':'カジノ','RIFT':'次元の裂け目','TRIBE':'種族契約'}
text=f'''# LORE {version} バランス実測レポート — 2026-09-10

対象：`{meta["commit"]}`、通常プール240種・自由枠スターター33種。実行 {s['attempted']:,}戦、決着 {s['finished']:,}戦、未決着除外 {s['failed']:,}戦。指定のナーフと最大体力増加時の回復統一を適用。本番BOTの判断方針は同じ。

[検索できる集計表](index.html) / [全体プール全順位](market-ranking.md) / [スターター全順位](starter-ranking.md) / [全組み合わせ・生の集計値](results.json) / [実験条件](methodology.md)

## 読み方

- 全体プール：指定カードを実際のコストで優先購入し、同コストの無作為なカードを優先購入する相手と比較。手札への無料追加なし。初期8枚は双方同一。条件付き即時魔法は購入条件を満たすまで待つ。通常モンスターの召喚条件は使用時に判定する。比較勝率は「そのカードを買いに行く方針の価値」。
- スターター：カル1枠を対象カードへ置換したときの勝率差。背景7枚・相手・乱数シード・先後を揃えた比較。
- 組み合わせ：自然対戦での同時採用・購入の観測と、{len(r['factor'])}組の4条件比較を分ける。観測だけではOPと断定しない。
- 勝率は引分を0.5勝として計算。未決着を引分・敗北に含めない。比較実験は同一シードの先後をまとめて95%信頼区間を計算し、カード群ごとにBH多重比較補正のq値もJSONへ収録。
- 大量対戦は `greedyDecide(g, false)`（追加の深いリーサル探索なし、通常の打点計算あり）。購入を40%の確率で探索する別方針も自然観測に含める。戦術探索ありの確認は別集計。HELLや人間の最適プレイの検証ではない。

## 自然対戦の概況

24,000戦を予定した自然観測で、決着 {len([]) if 'observe' not in s['counts'] else s['counts']['observe']-s['badByStage'].get('observe',0):,}戦。先手の成績 {pc(s['firstScore'].get('observe'))}、平均 {s['turns']['observe']['mean']:.1f}ターン、中央値 {s['turns']['observe']['median']:.0f}、10–90パーセンタイル {s['turns']['observe']['p10']}–{s['turns']['observe']['p90']}ターン。ターンは双方合計。

## 全体プール上位20

同コスト帯との比較なので「高コストほど上位になる」順位ではない。区間が重なる順位は暫定。購入・使用率が低い条件付きカードは、その条件を作る専用構築での価値を十分に測れていない。

'''
text+=table(['順位','カード','コスト','比較勝率','95% CI','試合数','使用率'],[(i+1,x['name'],x['cost'],pc(x['mean']),f"{pc(x['lo'])}〜{pc(x['hi'])}",x['games'],pc(x['usedRate'])) for i,x in enumerate(r['market'][:20])])
text+='## スターター全順位\n\n'+table(['順位','カード','カル比','95% CI','シード数','注意点'],[(i+1,x['name'],pp(x['mean']),ci(x),x['n'],' / '.join(x.get('flags',[]))) for i,x in enumerate(r['starters'])])
text+='## 自然対戦の組み合わせ上位\n\n同時採用・購入した側の勝率。購入前から勝勢だった可能性と、共通のデッキ要因を含む。序盤欄は双方合計10ターン以内の購入に限定した同時保有。スターターは初期採用で数える。基礎カードのカル・宝箱を含む組はこの抜粋から除外し、全データには残す。\n\n'
pairlist=[x for x in r['pairs'] if x['n']>=150 and x['earlyN']>=40 and not {'STARTER_TRASH','STARTER_CHEST'}&{x['a'],x['b']}][:20]
text+=table(['カードA','カードB','同時保有勝率','n','序盤保有勝率','序盤n'],[(x['nameA'],x['nameB'],pc(x['score']),x['n'],pc(x['earlyScore']),x['earlyN']) for x in pairlist])
text+='## 4条件比較：コンボの上乗せ\n\n00=両方対照、10=Aのみ、01=Bのみ、11=両方。スターターの対照はカル、通常カードの対照は同コストから無作為に選んだカード。通常カードは優先購入。相互作用=11−10−01+00。両方の勝率が高くても、相互作用が小さければ単に各カードが強い可能性がある。全条件で同じ背景・相手・シードを用い、8戦すべて決着したシードを採用。\n\n'
text+=table(['A + B','00','10','01','11','相互作用','95% CI','シード数'],[(' + '.join(name(i) for i in x['combo'].split('|'))+(f"（共通補助：{name(x['support'])}）" if x.get('support') else ''),*(pc(x['arms'][a]) for a in ['00','10','01','11']),pp(x['mean']),ci(x),x['n']) for x in r['factor']])
text+='## 初期構築16種の総当たり\n\n各組合せ60戦、各構築900戦を予定。同じ購入ロジックで比較し、専用の市場誘導は行わない。固定レシピの結果であり、各テーマの最適構築を探索し尽くした値ではない。初期8枚は `builds.json` に全記録。\n\n'
text+=table(['構築','勝率','試合数','平均ターン','60ターン到達率','終了時平均最大HP'],[(buildlabels.get(x['build'],x['build']),pc(x['mean']),x['games'],f"{x['turn']:.1f}",pc(x['turncap']),f"{x['maxHp']:.1f}") for x in r['builds']])
text+='## クエストの実際の達成率\n\n自然観測の配置した側を分母とした1回以上の達成率。配置前の被ダメージ等は進捗にならない。クエストが場からリフトへ移動し、同じ行動に対応する達成ログがあることを確認して計上した。相手から除外されたクエストとは区別する。\n\n'
text+=table(['クエスト','配置した側n','達成した側n','達成率'],[(name(x['id']),x['activated'],x['complete'],pc(x['complete']/x['activated']) if x['activated'] else '—') for x in sorted(r['quests'],key=lambda x:x['complete']/max(1,x['activated']))])
if r['validation']:
    text+='## 戦術探索ありBOTでの追加確認\n\n小標本の感度確認。各項目は同シード・先後の対応比較。\n\n'
    text+=table(['比較','勝率差','95% CI','シード数'],[(x['test'],pp(x['mean']),ci(x),x['n']) for x in r['validation']])
if r.get('coverage'):
    text+='## 使用判断を補ったBOTでの感度確認\n\n商人・卵・カル特殊勝利の使用判断を補う測定用BOTと元BOTを、同じ相手・シード・先後で比較。\n\n'
    text+=table(['構築','元BOT勝率','補完後勝率','差','95% CI','シード数'],[(buildlabels.get(x['target'],x['target']),pc(x['controlScore']),pc(x['treatmentScore']),pp(x['mean']),ci(x),x['n']) for x in r['coverage']])
text+='## 測定上の限界\n\n- BOTが使いこなせないカードは、人間の最適プレイでの強さを過小評価し得る。使用率と未決着数を併記。\n- カル特殊勝利の即勝利見逃しを再現。低勝率をそのまま上方修正の根拠にはできない。\n- 比較実験は先後ペア・4条件の全戦が決着したシードを採用。欠測は引分扱いにせず除外。\n- 自然観測は初期採用と通常購入イベントの同時保有であり、発動したコンボの勝率ではない。\n- 表にない組み合わせの因果効果や全構築の最適化は未検証。\n'
if (root/'findings.md').exists(): text=text.replace('## 読み方', (root/'findings.md').read_text()+'\n\n## 読み方',1)
(root/'REPORT.md').write_text(text)
# Compact data-only view, no network or dependency required.
data={'summary':s,'market':r['market'],'starters':r['starters'],'pairs':r['pairs'],'factor':r['factor'],'builds':r['builds'],'quests':r['quests'],'names':{id:name(id) for id in c['cards']},'buildLabels':buildlabels}
template=Path('scripts/balance/view.html').read_text().replace('{{VERSION}}',version)
(root/'index.html').write_text(template.replace('/*DATA*/{}',json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')))
for filename in ['REPORT.md','market-ranking.md','starter-ranking.md']:
    output=root/filename;output.write_text(output.read_text().rstrip()+'\n')
print('Wrote REPORT.md, market-ranking.md, starter-ranking.md and index.html')
