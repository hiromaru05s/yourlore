import json,pathlib,html
r=pathlib.Path(__file__).resolve().parent
jobs=json.loads((r/'prompts.json').read_text())['jobs'];qas=json.loads((r/'visual-qa.json').read_text()) if (r/'visual-qa.json').exists() else {}
labels={j['theme']:j['themeJa'] for j in jobs}
directions={'spirit':'トリ＝茶毛・黒い垂れ耳・暖色の森。ウィンター＝白灰の長毛・雪と青い川。','golem':'露出した銅関節と青緑の核。採掘場・鋳造場・運搬橋。','hexer':'形の違う陶器の仮面、結び紐と紫煙。湿地・柳・布の儀式場。','mimic':'既存の白紺と木枠の宝箱を継承し、蓋・脚・舌・牙でランク差。鉱洞と財宝の地形。','demon':'非人間的な角・灰赤の肌・黒曜石の外殻。赤い玄武岩と噴気孔。','predator':'黄土色の生身の獣、骨の背板と牙。棘の草原・乾いた谷。','noble':'青緑のベルベットと人物の年齢差。木張りの応接間・温室・領地の馬車。','lonely':'色を抑えた旅装と大きな余白。塩原・荒野・海岸の一人きりの場所。','origin':'琥珀・螺旋の化石・根と黒石の原生的な姿。地熱の段丘とシダの火口。','vampire':'牙・ワイン色の布・赤いガラス。夜の葡萄畑・運河の館・酒蔵。','elf':'翡翠色の編み葉と銅、顔や髪型の差。樹上住居と根の橋。ダークエルフは変更対象外。','assassin':'墨色の実用装束と暗赤の合図。雨の瓦屋根・木造路地・隠れたギルド。','worldtree':'生きた白い樹皮・金色の樹液・緑の葉。巨木の内部と根、水や生命の循環。','decay':'錆橙の傘と青緑のひだ。菌糸が侵食する泥炭地・沈んだ廃材・菌洞。'}
ready=[j for j in jobs if (r/'images'/f"{j['id']}.png").exists()]
links=[]
for theme,label in labels.items():
 subset=[j for j in jobs if j['theme']==theme];lines=[f'# {label}','',directions[theme],'','[全体入口](README.md)','','| 番号・カード | 改訂画像 |','|---|---|']
 for j in subset:
  img=f"![{j['name']}]({r}/images/{j['id']}.png)" if j in ready else '生成中'
  lines.append(f"| {j['number']} · {j['name']} | {img} |")
 lines+=['','## 造形と確認','']
 for j in subset:lines += [f"### {j['number']} {j['name']}",'',j['effect'],'',j['scene'],'',qas.get(j['id'],{}).get('finding','目視確認待ち'),'']
 (r/f'gallery-{theme}.md').write_text('\n'.join(lines).rstrip()+'\n');links.append(f"- [{label}：{len(subset)}枚](gallery-{theme}.md) — {directions[theme]}")
rows=[]
for j in jobs:
 id=j['id']; exists=j in ready
 new=f'images/{id}.png' if exists else ''
 before=f'before/{id}.webp'
 old=f'<details><summary>変更前を表示</summary><img loading="lazy" src="{before}" alt="変更前"></details>' if (r/before).exists() else ''
 picture=f'<a href="{new}"><img loading="lazy" src="{new}" alt="{html.escape(j["name"])}"></a>' if exists else '<div class="pending">生成中</div>'
 rows.append(f'<article data-theme="{j["theme"]}" data-search="{html.escape(j["number"]+" "+id+" "+j["name"])}"><h2>{j["number"]} {html.escape(j["name"])}</h2><p class="tag">{j["themeJa"]} · {id}</p>{picture}{old}<p>{html.escape(j["effect"])}</p></article>')
options=''.join(f'<option value="{k}">{v}</option>' for k,v in labels.items())
page='''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>LORE テーマ別アート改訂</title><style>body{margin:0;background:#101923;color:#eae6da;font:15px system-ui}header{padding:28px 4vw;background:#172634;position:sticky;top:0;z-index:2;border-bottom:1px solid #607684}h1{font-size:23px;margin:0 0 12px}select,input{font:inherit;background:#223748;color:#fff;border:1px solid #6c8293;border-radius:6px;padding:10px;margin:4px}main{padding:24px 4vw;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}article{background:#1d2a36;border:1px solid #425867;border-radius:10px;overflow:hidden}article h2{font-size:17px;padding:15px 15px 0;margin:0}p{padding:0 15px;line-height:1.7}.tag{color:#afbfcb;font-size:12px}img{display:block;width:100%;height:auto}summary{padding:12px;cursor:pointer;color:#e2c89c}article[hidden]{display:none}.pending{padding:90px;text-align:center}a{color:#ddc59b}@media(max-width:900px){main{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){main{grid-template-columns:1fr}}</style><header><h1>LORE · テーマ別アート改訂</h1><span>COUNT / TOTAL 枚保存 · 番号かカード名でフィードバック</span><br><select id="theme"><option value="">全テーマ</option>OPTIONS</select><input id="search" placeholder="番号・カード名・IDで検索" aria-label="カード検索"></header><main>ROWS</main><script>const theme=document.querySelector('#theme'),search=document.querySelector('#search');function filter(){for(const a of document.querySelectorAll('article'))a.hidden=!!((theme.value&&a.dataset.theme!==theme.value)||!a.dataset.search.toLowerCase().includes(search.value.toLowerCase()))}theme.onchange=filter;search.oninput=filter;</script></html>'''
(r/'index.html').write_text(page.replace('COUNT',str(len(ready))).replace('TOTAL',str(len(jobs))).replace('OPTIONS',options).replace('ROWS',''.join(rows)))
readme=['# テーマ別アート改訂','',f'{len(ready)}/{len(jobs)}枚を内蔵ImageGenで生成・保存。テーマの背景、配色、人物・生物の輪郭を描き分ける。','', '[検索・変更前比較つき一覧](index.html) / [全プロンプト](prompts.json) / [生成・配信対応表](manifest.json) / [目視所見](visual-qa.json) / [検証と引き継ぎ](VALIDATION.md)','','## テーマ別画像一覧','']+links+['','## 引き継ぎ','','- ブランチ：`codex/card-art-theme-revision-20260910`。マージとデプロイは別セッションで行う。','- 配信画像は既存のカードIDごとに832/384/192pxのWebPへ変換し、現在のカード枠で表示する。PNG原本もこのフォルダに保持。','- ダークエルフを除外。対象外カードの画像、ゲームルール、カード定義、UI配置は変更しない。','- 全案はユーザーの最終フィードバック待ち。目視確認は承認を意味しない。','- 犬の参照写真はユーザー添付。プロンプトに元パスと参照の役割を記録し、SNS画面の文言は使用しない。','- `import-art.mjs`は原画の全構図・比率を保つ形式変換。`build-review.py`は一覧を再生成。','- 比較用の旧画像は `before/`。制作前の配信画像ハッシュは `baseline.json`。']
(r/'README.md').write_text('\n'.join(readme)+'\n');print({'generated':len(ready),'qa':len(qas)})
