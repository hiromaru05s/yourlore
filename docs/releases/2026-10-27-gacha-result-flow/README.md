# ガチャ結果とショップの表示修正

## 参照元とプレビュー

- 基準: `gh/main` / `c6abd89e`。公開前に更新された `05238782`（デッキのホバー修正）も統合。本番取得時のsource annotation `ed86e67c` も含む。
- 現行実装: `client/src/ui/shopGacha.ts`、`gachaCinematic.ts`、`gachaRewardStage.ts`、`client/src/styles/shopGachaTable.css`。
- 採用UI: `docs/default-ui-design.md`、`client/src/styles/defaultUI.css` と `defaultButtons.css`。現行の共通パネル、背景 `/art/shop/biblion-draw-table-v1.webp`、カード背面 `/frames/sleeve_default.webp` を維持。
- プレビュー起動元: `/Users/hiromaru05s/.codex/worktrees/gacha-result-flow/LORE_TCG`、`npm --workspace client run dev -- --host 127.0.0.1 --port 5548`。
- 表示URL: `http://127.0.0.1:5548`。実アプリのショップ導線と採用素材をブラウザで確認。元の作業フォルダの未コミット変更には触れていない。

## 変更

- 1回・10連とも演出から結果一覧へ直接進む。結果をクリックして開く詳細画面、その描画実装と専用CSSを削除。
- 結果タイルはホバー反応を残した非操作要素。履歴も同様。
- 結果左下の閉じるを削除し、右上Xを維持。右下に「もう一度引く」。直前と同じ回数と消費額をYES/NOで確認。NO/Escは元の結果を維持。
- 購入中はDOMを作り直さず、操作状態だけ更新。状態通知もカード配置を押し上げない。重複操作と残高不足を抑止。
- 「結果へ」を152×56px（狭い画面142×52px）に拡大し、16px左・上へ移動。
- 白磁を含むQuiet Luxuryスリーブは既存の丸い輪郭に沿って外側をクリップ。
- ショップのカード扇は内側の矩形で切らず、背景と同じ標準パネルの面取り境界でクリップ。
- スマホでは結果本文だけスクロールし、Xと引き直しを表示領域内に維持。

## 検証

- `npm run typecheck`、`npm run build` 成功。
- `tests/shop-gacha-preview-browser.mjs`: 5サイズのレイアウト、素材、カテゴリ、低減モーションに成功。
- `tests/gacha-rewards-browser.mjs`: 実演出の完走、スキップ、1回/10連、ホバーのみ、NO/Esc、YES二重操作時のリクエスト一回、残高不足、購入前後のDOM/座標不変、履歴、5サイズに成功。APIのみfixture、画像・CSS・3Dは実実装。
- `tests/gacha-reward-readiness-browser.mjs`: フレームの遅延時に不完全なカードを隠し、読み込み完了後に表示することを確認。
- `tests/gacha-entry-loading-browser.mjs`: 6サイズの操作領域、遅いプロフィール取得が演出を破棄しないこと、1回結果への直接遷移に成功。
- `tests/gacha-azure-motion.mjs`: 採用演出の連続性・資源所有のチェック成功。
- 目視: PC/スマホの共通枠、カード端、白磁スリーブ、結果本文と操作、YES/NOの表示を確認。動画は `/tmp/lore-gacha-result-flow/video/` に保存。
- 実アカウントでのシャード消費・実機検証は実施していない。機能fixtureの成功と実購入を混同しない。

本番のsource/versionと反映確認はデプロイ完了後に追記する。
