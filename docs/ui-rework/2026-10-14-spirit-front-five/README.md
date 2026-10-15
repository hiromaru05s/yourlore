# 白いガイドモブ：胸元デザイン5案

2026-10-14。胸元だけを比較する選択用プレビュー。採用・ステージング反映は未実施。

Preview: http://127.0.0.1:5227/spirit-front-five.html

1. 雫の灯 — 透明な雫と乳白色の芯。金属台座を使わない。
2. 三日月のゆりかご — 銀の曲線に小さな光球。
3. 小さな魔導書 — 赤い革表紙、紙、留め具、青い栞。
4. 双葉のしるし — 反りと葉脈のある翡翠の葉と乳白色の実。
5. 蒼銀のコンパス — 青い文字盤、銀の方位針、目盛り。

## Scope

実際の `mountManaSpirit` に胸元だけを渡す。体、目、ひれ、照明、笑う・眠るモーションの元データは共通。通常のHOME・チュートリアルは既存の胸元のまま。比較用HTMLは通常のproduction buildに追加していない。

全身／胸元拡大、自然な動き／笑う／眠る／静止、明るい背景を切替可能。比較サムネイルは同じ静止姿勢。切替・ページ離脱・HMR時にレンダラーを破棄する。

## Verification

- client/server typecheck: PASS
- mana-spirit-motion focused tests: PASS
- standalone preview Vite build: PASS (Three.js込みのchunk size advisoryあり)
- Browser: 全5案の選択、全身／拡大、笑う／眠るの切替を確認。
- Canvas count: 切替後も6枚（hero 1 + thumbnails 5）。Browser error log: 0。
- Widths: 1280、390、320、844で横はみ出しなし。390px表示も目視。
- `qa/overview-closeup.png`、`qa/overview-body.png`、各案拡大、mobile screenshotを保存。

機能確認とデザイン採用は別。見た目の最終選択はユーザー待ち。

## 選択更新

2026-10-14、ユーザーが01「雫の灯」を採用。共有実装へ移行。後続のシルエット比較は `../2026-10-14-spirit-silhouette-five/README.md` を参照。
