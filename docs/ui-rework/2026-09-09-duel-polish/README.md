# 対戦画面・演出修正 — 2026-09-09

攻撃時のUI消失を直し、斜め盤面とカードの見え方、攻撃操作、カードの着地、ダイス、図書館家具をまとめて更新。

| 指摘 | 対応 |
|---|---|
| 攻撃を受けるとUIが消える | 揺れをUIとWebGLの共通親に適用。UIだけが低い描画層に閉じ込められる原因を除去 |
| カードが横に太い | 32度の傾きによる縦の圧縮を補正。フィールドカードの中央投影比は約0.789（元の0.8に対応） |
| デッキが雑に置かれている | 回転・横ずれをなくし、薄いカードをまっすぐ積層 |
| モンスターをドラッグして攻撃 | 場にカードを残し、青金の曲線矢印・発生点・対象リングを表示。左右移動による並べ替えも保持 |
| キャラクターUIが小さい | 720pで約85pxから114px、1080pで142pxへ拡大 |
| ダイスが浮く | 初回落下＋4段階の減衰バウンド、回転に応じた支持高さ、接地影。出目は実際の上面に停止 |
| マーケットの土台 | 原案を画像生成しBlenderで制作、平らな紺の天板・白磁・金縁を組み込み |
| 既存デッキ台座 | `deck_holder_biblion_ivory/v1` の標準・軽量GLBを利用 |
| シェルフ | 既存生成画像を参照してBlender制作。12の共通収納位置へカードを配置 |
| 永続魔法が途切れる | 拡大表示から実際の魔法枠へ連続飛行。飛行中に枠を切り替え、着地後のDOMと投影を一致 |
| モンスターの着地角度が急変 | 同じ飛行処理で徐々に傾け、場のカードへ位置・角度・大きさを合わせて引継ぎ |

[家具の制作記録](../../3d-assets/2026-09-09-library-furniture/README.md)、[PC 720p](desktop-1280.png)、[PC 1080p](desktop-1920.png)、[スマホ](phone.png)、[攻撃矢印](attack-arrow.png)、[ダイス停止](dice-rest.png)。

## 検証

- `npm run typecheck` / `npm run build` / `git diff --check`
- `node tests/duel-ui.mjs` / `node tests/dice-model.mjs` / `node tests/library-furniture-model.mjs`
- `tests/duel-polish-browser.mjs`: 実際のUI・コントローラー・エンジンを用い、攻撃時の描画層、矢印と元カードの固定、両側の召喚/永続魔法の着地、PC/スマホ、ダイス、Escape取消・演出途中の画面破棄を検証。[結果](browser-checks.json)
- `tests/enchantment-drop-browser.mjs`: 永続魔法のドロップ領域・状態反映・キャンセル・ネイティブタッチ入力。[結果](spell-regression/browser-checks.json)
- `tests/library-piles-browser.mjs`: 4つの3D山札/シェルフ、手札拡大、シャッフル→ドロー、空デッキ、縮小モーション、リサイズ、スマホ当たり判定、GPU喪失時の復帰。[結果](library-regression/browser-checks.json)
- Khronos glTF Validator: 新規4モデルでエラー・警告0。

ブラウザーの詳細試験はローカルの固定対戦状態を利用した。認証付きオンライン対人戦のマッチング・完走とは別の検証。ステージング配信結果は `deployment.json` と `remote-verification.json` に記録する。
