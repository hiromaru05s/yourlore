# 闇商人 — カード名検索と絞り込み

2026-11-04。ユーザーがプレビューを承認し、main統合と本番反映を指示。最新main `1a8e215e` に競合なく統合後、購入・キャンセル／3言語／4画面サイズのブラウザ検証を再実行しPASS。本番反映結果は `docs/releases/2026-11-04-dark-merchant-filters/` に記録する。

- ベース: リモート `gh/main` の `76f0e1f365b5a1797a15fccb747edf3cbe0c44d7`。提示前にもリモートmainが同一であることを確認。
- 作業ブランチ: `codex/dark-merchant-filters`。
- 起動元: `/Users/hiromaru05s/.codex/worktrees/dark-merchant-filters/LORE_TCG/client`。
- URL: http://127.0.0.1:5196/dark-merchant-preview.html
- 起動: リポジトリルートで `npm --workspace client run dev -- --host 127.0.0.1 --port 5196 --strictPort`。

## 採用実装の参照

`client/src/game/controller.ts` の giantShop / darkMarket 分岐と `client/src/ui/modal.ts` の cardPicker を変更。共通パネル `client/src/styles/defaultUI.css`、ボタン `defaultButtons.css`、カード表示 `client/src/ui/cardView.ts`、盤面 `client/src/ui/boardView.ts`、共有カード定義 `client/src/shared/cards.ts` は上記mainの採用実装を使用。

共通パネルは `/art/ui/lore-panel-azure-cut-lossless.webp`。プレビューの盤面・フードのシーカー・カード画像をブラウザで確認した。旧作業フォルダのプレビューや画像はコピーしていない。

## 変更

表示言語のカード名を部分一致で検索。NFKC正規化と大文字小文字の吸収に対応。購入コストは一覧にある値から1つ選択。種別はすべて／モンスター／魔法カード。条件はANDで組み合わせる。該当件数、空状態、解除操作を表示する。

購入可能なカードの抽出とエンジンの購入処理は維持。フィルターで選択中のカードが非表示になると選択・確定を解除する。他のカード選択ポップアップではフィルターを有効化しない。

## 検証

- `npm --workspace client run typecheck`: PASS。
- `npm run build`: PASS。既存の大きなchunkに関する警告あり。
- `node tests/dark-merchant-filters-browser.mjs`: PASS。購入・キャンセル、検索＋コスト＋種別、非表示選択の解除、0件・全解除、全半角・英語大小文字、3言語、4ウィンドウサイズ。
- 実コントローラーとreducerを使い、闇商人を発動して開くローカルfixture。エルフ購入でマナ10→6と墓地への追加、マナ3で購入候補から除外、キャンセルでマナ維持を確認。
- 画面画像: `desktop.png`、`filtered.png`、`window-*.png`。検索・ボタン・確定操作のはみ出しなし。高さが低いウィンドウはカード欄をスクロールして閲覧する。
- 実アカウントやオンラインPvPは未検証。外観は本プレビューをユーザー承認済み。

テストのブラウザ依存は `PLAYWRIGHT_MODULE` で指定可能。この環境では `/tmp/lore-merchant-tools/node_modules/playwright/index.mjs` を使用。
