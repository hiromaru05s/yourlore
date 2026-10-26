# 名前の右側でランクとMMRを強調

参照: 最新採用main `ed86e67c`。本番事前確認は `ffe29c66` / Worker `36ccfc96-0a6c-4d99-bf3e-10918df2a3cf`。最新のカードフレーム・ショップ等のmain更新を含めて検証。対象は `client/src/screens/profile.ts`、`client/src/ui/rankedProfile.ts`、`client/src/styles/rankedProfile.css`。採用済み `ui/rankEmblem.ts` の紋章、蒼銀パネル、背景を使用。

- ランキング・フレンドの共通プロフィールと自分のプロフィールで、ランクを名前の右側に移動。
- PCは176pxのランク紋章と64pxのMMRを表示。ランク名はMMRの上に配置し、従来の小さい「現在のランク」行は統合。
- 狭い画面でも名前の右側を維持。紋章100px・MMR38pxまで段階的に調整し、名前は折り返す。
- 自分のプロフィールは上部を横幅いっぱいの本人情報＋ランクの行に整理。戦績・直近3試合・購入率TOP5はその下に表示。非公開設定と閉じる操作を維持。

プレビュー起動元: `/Users/hiromaru05s/.codex/worktrees/leaderboard-column-alignment/LORE_TCG`、`http://127.0.0.1:5568`。最新の採用済み素材を実画面で確認。

クライアント型チェックと `../2026-10-26-ranked-profiles/browser-check.mjs` が通過。1440/390/320pxで本人情報の右にランクがあること、十分な紋章・数字サイズ、ヘッダーの横はみ出しなし、ランクの重複なしを確認。既存の5画面幅、空／非公開状態、フレンド導線、デッキ列、カード詳細、閉じるボタン・フォーカス復帰も確認。ブラウザーのAPIは検証用データ。
