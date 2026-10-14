# HOME とチュートリアルの改修

2026-10-14。作業元は `gh/main` の `6154a96a`。古い共有作業フォルダには9課程の旧実装が残っていたため、最新12課程を含む独立worktreeで制作。

## 変更

- 下ナビは「チュートリアル / Tutorial / 튜토리얼」。採用済み水平線ナビを維持し、長いラベルの領域を確保。
- チュートリアルは12枚のステージカード。クリア済みは大きなチェック印・文字・緑の面で表示。次の未クリア課程に枠を付け、進捗件数と受取済み報酬を併記。
- 既存の報酬キー、12課程、合計3,000シャード、続行・復習・ルールノート・サーバーでの操作検証は維持。
- HOME背景は筆致と色面を持つビブリオンのイラストへ変更。配信用WebPは約258 KB。
- チュートリアルと同一の `mountManaSpirit` をHOMEに配置。浮遊・視線方向の揺れ・ひれ・まばたき、タップ／Enterで挨拶とひれ振り。精霊の会話からチュートリアルへ移動。
- 背景全体のズームと14個の粒子ループは削除。動きの主役を精霊自身にする。
- 低減モーションでは挨拶時も静止。非表示タブの停止、画面破棄時のWebGL解放、非WebGL時の既存SVG代替を確認。

## 検証

- `npm run build`：型検査とビルド成功。既存の大きなチャンクの警告あり。
- `node tests/menu-selected.mjs`：対戦モード、BOT選択、既存ショップ処理の回帰確認。
- `node tests/tutorial-academy.mjs`：12課程の実際のリデューサー、サーバー報酬検証、3,000合計、重複防止・ロールバック。
- `node tests/tutorial-academy-browser.mjs`：実習のドラッグ・攻撃対象選択、ルールノート、復習、三言語、低減モーション。
- `node tests/home-tutorial-browser.mjs`：実際の画面コンポーネントと共通ナビに検証用の進捗APIを接続。0／4／12クリア、続行・復習、エラー再試行、遅延応答、キーボード、精霊動作、非表示／低減モーション／WebGL代替、1280・390・320・844px。
- 通常App/router起動のローカルゲストでもHOME→チュートリアル→ノート→HOMEを確認。認証済みサーバーとの接続を証明するものではない。
- 画像：`qa/home-desktop.png`、`qa/home-390.png`、`qa/tutorial-desktop.png`、`qa/tutorial-stages.png`。
- 通常速度の連続再生はブラウザ録画に保存。精霊の同じ3Dボディ・ひれ・目の連動、途中の画面切替、スマホ実寸を確認。機能テストの成功とユーザーによる見た目の承認は別。見た目の承認は未取得。
- ローカル実装のみ。ステージング／本番への反映、push／main mergeは未実施。

## 背景画像の生成

built-in image_genを使用。原画は `biblion-source.png`、配信素材は `client/public/art/lounge/illustrated-v1/biblion.webp`。最終プロンプト：

```text
Use case: stylized-concept. Asset type: finished 16:9 landscape background illustration for LORE card game HOME, no UI. Biblion magic library, original world of recorded creatures made tangible. Highly stylized hand-drawn fantasy game environment, confident visible brush shapes, clear ink contours, large simplified color planes and two-to-three-tone cel-like shadows; deliberately NOT realistic architecture rendering or photorealism. Ivory stone arches, midnight cobalt bookcases, restrained muted vermilion cloth pennants, aged pale brass compass and eye motif embedded high in a round window. Composition: cozy medium-height library chamber with broad reading desk and a simple stone platform in left foreground to host a separately animated small character. Left center is open uncluttered character space; right third darker quiet navy shelves and negative space for duel UI overlay. Soft blue daylight, tiny warm window highlights, atmospheric graphic layers. Rich crafted illustration, readable bold shapes, not a flat vector icon. No characters, no creatures, no text, no letters, no UI, no sparkles, no particle cloud, no shiny photo textures. Wide landscape 1792x1024 or similar.
```
