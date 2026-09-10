import json,sys
from pathlib import Path
root=Path(sys.argv[1]);r=json.loads((root/'results.json').read_text());c=json.loads((root/'comparison.json').read_text());cat=json.loads((root/'catalog.json').read_text())
def pct(x):return '—' if x is None else f'{100*x:.1f}%'
def pp(x):return '—' if x is None else ('0.0pt' if abs(x)<.0005 else f'{100*x:+.1f}pt')
labels={'TRIBE':'種族契約','ASSASSIN':'アサシン','MERCHANT':'商人・醸造','GAMBLER':'ギャンブラー','CASINO':'カジノ','CULL':'カル特殊勝利','EGG':'卵'}
def table(head,rows):return '| '+' | '.join(head)+' |\n|'+ '|'.join(['---']*len(head))+'|\n'+''.join('| '+' | '.join(str(v).replace('|',' / ') for v in row)+' |\n' for row in rows)+'\n'
def name(id):return cat['cards'][id].get('nameJa',id)
market={x['id']:x for x in r['market']};delta={x['key']:x for x in c['market']};starter={x['id']:x for x in r['starters']};sd={x['key']:x for x in c['starters']}
s='## 指定ナーフの前後\n\n全体プールは同コスト優先購入比較、スターターはカル1枠との差。すべての指定変更と回復統一を同時に適用した環境差であり、個々のナーフだけの因果効果ではない。共通の先後・シードを用いた差の区間と標本数は `comparison.json`。\n\n'
s+=table(['カード','v46','v47','差','v47使用率','v47試合数'],[(name(id),pct(delta[id]['before']),pct(delta[id]['after']),pp(delta[id]['change']),pct(market[id]['usedRate']),market[id]['games']) for id in ['NGA4','TDE1','TDE2','TDE3','TDE4','M7']])
x=sd['ELF_HAVEN'];s+=f"エルフの憩い場のカル比は {pp(x['before'])} → {pp(x['after'])}。発動コストのナーフと環境全体の回復強化が同時に入っている。\n\n"
s+='## 次の調整候補を選ぶときの注意\n\n- 魔王は召喚条件のため、通常の購入比較だけでは専用構築での強さを過小評価し得る。斥候＋魔王と、斥候を共通補助にした魔界＋魔王の4条件試験を追加した。\n- 魔界は現在、魔王の最大マナ3化と増加禁止を無効化し、威厳・オーラは残す。最大マナ8で12/14の魔王を維持する盤面を再現した。`demon-realm-reproduction.json`。無効化する範囲は次の仕様検討点。\n- ハーフエルフによる世界樹の慈しみの重複展開が、最大体力増加＋回復の両方へつながる。自然対戦の例では60ターン時点で体力3,399／最大3,493。同じシードの旧版は体力931／最大3,493だった。大きな上限自体は旧版にも存在し、今回その多くが現在体力として使えるようになった。`high-hp-examples.json`。\n- 回復・除外系の強化が、相手を倒す速度より60ターン判定への耐久を伸ばす場合がある。平均ターンだけでなく、構築表の60ターン到達率とダメージも見る。\n\n'
rift=next(x for x in r['builds'] if x['build']=='RIFT')
s+=f"次元の裂け目＋試練の領域の固定構築は {pct(rift['mean'])}。60ターン到達は {pct(rift['turncap'])}なので、強さを判定勝ちだけで説明することはできない。試練の領域単独のカル比は {pp(starter['TRIAL_AREA']['mean'])}、次元の裂け目単独は {pp(starter['RIFT']['mean'])}で、組み合わせ依存が大きい。\n\n"
s+='## 上乗せが強いコンボ候補\n\n相互作用が正でも、複数比較補正後のq値と区間を併記して判断する。\n\n'
factors=sorted(r['factor'],key=lambda x:x['mean'],reverse=True)[:6]
s+=table(['組み合わせ','両方の勝率','相互作用','95%区間','q値','シード数'],[('＋'.join(name(id) for id in x['combo'].split('|'))+('（斥候共通補助）' if x.get('support') else ''),pct(x['arms']['11']),pp(x['mean']),pp(x['lo'])+'〜'+pp(x['hi']),('<0.001' if x.get('q',1)<.001 else f"{x.get('q',1):.3f}"),x['n']) for x in factors])
s+='斥候＋魔王の相互作用には、魔王の召喚条件を満たす効果が含まれる。魔界＋魔王（斥候を共通補助）はセット勝率58.0%、相互作用−1.0pt（95%区間−6.5〜+4.6pt）で、このBOT条件では上乗せは確認できなかった。\n\n'
s+='## 勝ち筋が弱く見える構築\n\n総当たり下位のレシピは次の通り。BOTが使わないカードを持つ構築では、カードの弱さと未活用を切り分ける必要がある。\n\n'
s+=table(['構築','勝率','試合数','相手の平均被ダメージ','終了時平均最大マナ','60T到達率'],[(labels.get(x['build'],x['build']),pct(x['mean']),x['games'],f"{x['damage']:.1f}",f"{x['mana']:.1f}",pct(x['turncap'])) for x in r['builds'][-5:]])
s+='被ダメージには相手自身の自傷も含み、純粋な与ダメージ量ではない。ギャンブラーは終了時最大マナが高い一方で相手の被ダメージが少なく、今回のBOT・レシピでは資源成長を勝利に結びつけにくい。\n'
s+='\n使用判断の補完比較（総当たりとは別の、固定5相手との比較）：\n\n'
s+=table(['構築','元BOT','補完BOT','改善幅','95%区間'],[(labels.get(x['target'],x['target']),pct(x['controlScore']),pct(x['treatmentScore']),pp(x['mean']),pp(x['lo'])+'〜'+pp(x['hi'])) for x in r['coverage']])
s+='カル特殊勝利はBOTが即勝利を見逃す既知の問題があり、レシピの低勝率だけを根拠に上方修正しない。商人・卵も使用判断による改善幅を踏まえて評価する。\n'
(root/'findings.md').write_text(s)
