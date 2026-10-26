# LORE animation work

アニメーション・VFXの新規制作／改修では、着手前に以下を読むこと。

- `docs/animation-quality-benchmark.md` — ユーザー承認の最低遵守品質。「銀紋の流墨」（2026-09-27 rich試作の②）が基準。
- `docs/vfx-art-direction.md` — Toonの造形、可読性、既存指定。

カード表面・物質変化・動作を一体にする。独立した粒や環の装飾だけで品質を満たしたとしない。連続再生と実盤面で比較し、機能テストの成功と見た目の品質判断を分けて報告する。

# LORE menu design

HOME・デッキ・カード・ランキング・フレンド・ショップ・遊び方など、対戦画面以外のUIを制作／改修するときは `docs/menu-design-insights.md` を先に読む。下ナビの採用基準、実例研究、未承認案の区別を共有する。世界観は `docs/world-bible.md` に従う。

# LORE default UI

2026-10-26以降、全ページ・ポップアップの標準UIは02「蒼銀の面取り」（外周も面取りした版）。UIを制作／改修するときは `docs/default-ui-design.md` を読み、`client/src/styles/defaultUI.css` の共通面とトークンを使う。以前の枠デザインへ戻さない。

標準ボタンは同日採用の02「隅のしるし」。`client/src/styles/defaultButtons.css` と `docs/default-ui-design.md` のボタン仕様を使用する。
