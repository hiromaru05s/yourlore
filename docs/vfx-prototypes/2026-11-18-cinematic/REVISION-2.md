# 第2稿 — 裏面接触と実盤面、リアル寄りの光・炎

2026-11-18の追加指定を優先：召喚はカードが立つ動きではなく、裏面が盤面へ接触・衝突する。実盤面で見られること。攻撃・魔法のVFXは従来のToon指定よりリアル寄りにしてよい。以下はこの試作についての変更で、全ゲームの画風規定を書き換えるものではない。

## 今回の変更

- 初期表示を実盤面、初期再生を召喚に変更。暗背景への切替なしで確認できる。
- 召喚カードの姿勢は現行 `boardProjection.ts` の `projectedPlacement()` と同じ行列で描画。カードのZ方向の上昇・落下・微小な跳ね返りを、盤面と同じ透視投影へ通す。カード下端の足元を廃止。
- カード全面の裏に投影した影が高さに応じて広がり、接触時に狭まる。1.47秒で裏面全体が接地し、四辺から粉塵が広がる。縦に立ち上がる帯・魔法陣を廃止。
- 攻撃は盤面のカード姿勢を保って踏み込み、70msのヒットストップを保持。太い色帯、漫画的な星形の衝撃、同心円を廃止。細い露光状の閃光、方向を持つ微細な火花、接触後の粉塵へ変更。
- 魔法は輪郭線を伴うリボンと星形を廃止。視線方向に12層積分した炎の密度・吸収・温度で厚みを描き、連続する火の塊と冷えて残る煙に変更。
- 実盤面の魔法着弾先を、レイアウト上サイズを持たないポートレート親コンテナから実際の `.pt-ring` に修正。
- カード用シェーダーにsRGB出力変換を追加。動作中のカードだけ暗くなる問題を修正。

## 参照元・起動元

リモートmainの最新確認：`914dc9bab354518587fb9a17e1c5e14ef550a703`。第1稿の作業コミット：`b45c16672`。着手時の専用worktreeはclean。元のDesktop作業フォルダには触れていない。

- 現行盤面：`client/src/ui/boardView.ts`、`client/src/ui/boardProjection.ts`、`client/src/ui/readingBoardLayout.ts`、`client/src/styles/reading-board.css`
- 現行カード：`client/src/ui/cardView.ts`、`client/src/ui/cardPrintCapture.ts`、`client/src/styles/card.css`
- 変更実装：`client/src/dev/cinematic-vfx/scene.ts`、`material.ts`、`energy.ts`、`realistic.ts`
- 起動元：`/Users/hiromaru05s/.codex/worktrees/cinematic-vfx-1118/LORE_TCG/client`
- URL：http://127.0.0.1:5298/cinematic-vfx.html

## 検証

`npm --workspace client run typecheck`

`QA_OUT=docs/vfx-prototypes/2026-11-18-cinematic/qa/r2 node docs/vfx-prototypes/2026-11-18-cinematic/check.mjs`

実盤面／白／暗、両陣営、スマホ幅、途中停止、通常再生終了、低減モーション、コンソールエラーを確認。第1稿の記録は `qa/`、今回の記録は `qa/r2/` に分離。

機能検証と見た目の承認は別。現行盤面で着地・攻撃・魔法の途中と連続再生を目視確認するが、ユーザーの最終採用判断は未取得。本番ゲームイベントへの接続や本番デプロイは行っていない。

検証結果：型チェック成功、26項目でページ／コンソールエラー0、GPUなしの軽量描画と破棄も成功。接地前1.15・1.43秒、接地1.47秒、余韻1.60秒および実カードへの復帰前後2.32・2.40秒を保存。`qa/r2/contact-sequence.jpg` が接地連続フレーム。
