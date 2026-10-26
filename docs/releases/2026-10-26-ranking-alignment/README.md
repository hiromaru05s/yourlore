# ランキングの名前欄・列位置修正

- ユーザー指定: 名前リンクの共通ボタン装飾を除去、名前列を縮小、ティア・MMR・戦績を左へ移動し見出しと揃える。
- 参照した採用実装: `5b0f39711a269d31b98ec7b0ea073f023b590fef`（着手時のリモートmainと本番デプロイが一致）。`client/src/screens/leaderboard.ts`、`client/src/styles/loungeSelectedMenu.css`、`defaultButtons.css`、`defaultUI.css`、`rankedDecks.css`。
- 実装: `96329cc5`。名前列はPC最大280px、中間幅最大220px。見出し固有のマージンと一覧固有のパディングを除去し、列の位置と揃え方を一致させる。`.lb-deck-trigger` は共通ボタンの適用対象から除外。名前・下線・44pxのクリック領域・キーボードフォーカス・開閉操作を維持。
- プレビュー起動元: `/Users/hiromaru05s/.codex/worktrees/leaderboard-column-alignment/LORE_TCG`、`http://127.0.0.1:5568`。上記採用実装に今回のCSS変更を適用した実画面を使用。`f523e706`までの追加変更（デッキの余白修正）を取り込んでmainへ反映。
- ローカル検証: 1440 / 1070 / 820 / 390 / 320pxで可視列のX座標・幅が見出しと一致、名前リンクのborder-imageなし・背景透明、横方向のはみ出しなし。クリックでデッキ開閉、Enterで開く操作を確認。ブラウザーエラーなし。
- 見た目: `desktop.png`と`mobile.png`を目視確認。背景、外周の蒼銀パネル、共通ナビは現行実装。ランキング／ユーザーAPIは検証用データで、実アカウント操作の検証ではない。
- 本番: `https://yourlore.xyz` に `96329cc5b660e4b1c070d5868d837c7db60e70b4` をデプロイ済み。Worker version `a3ecb00b-3659-431a-b467-5764244cc0df`。型チェック、既存回帰テスト228/228、design guard、本番ビルドが通過。
- 公開後確認: 本番URLの実配信アセットで、同じ5画面幅の列位置・装飾除去・横はみ出し・デッキ開閉・キーボード操作チェックを再実行して通過。`production/checks.json` とスクリーンショットを保存。APIは検証用データ、実アカウントの操作は行っていない。
