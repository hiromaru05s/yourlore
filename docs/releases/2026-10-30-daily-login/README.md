# 毎日ログインボーナスと既存クーポンの失効

本番: https://yourlore.xyz

- Runtime source: `edda26cdd6b65f8335bf3785ccd18ded0dee885e`
- Worker version: `a9fa3860-bf9e-49c8-8463-f2cd941f05a3` (100%)
- Deployment: `78a08135-6fa9-44db-b85c-5a164b138e9c`
- Deployed: 2026-10-30 18:35 JST/KST

認証済みユーザーがログインまたはプレゼントBOXを取得すると、当日の10,000無償シャードをBOXへ配送する。JST/KST共通の0:00で日付を切り替え、1ユーザー・1日につき1回。BOXで受け取るまで残高は増えない。発行済みの未受取ボーナスは期限なしで残る。未ログイン日への遡及支給はしない。

`0030_retire_existing_coupons.sql` を本番D1に適用し、既存の `LORE30000`、`LORE10`、`WELCOME100` をすべて失効。有効なコードは0件。使用履歴・使用回数・既に付与された残高は保持する。新規コードを将来明示的に発行する機能自体は維持。

## 検証

- committed snapshotの本番デプロイガード、DB schema、型検査、258/258のproduction suite、ビルドが通過。
- 当日の配送、日付境界、年越し／閏日、並行配送・受取、二重加算防止、障害ロールバック、改ざん拒否、クーポン全件失効をテスト。
- 実本番のWorker・D1・HTTPセッションで専用QAアカウントを検証。初期残高0、配送1件、個別／一括並行受取の合計10,000、記帳1件、最終残高10,000。3コードともHTTP 410。有効コード0。終了後、QAアカウント・セッション・配送・受取・活動履歴の削除を確認。
- 本番UIの日本語・韓国語・英語、1461/390/320pxを隔離Worker/SQLite APIへ接続して検証。米国端末タイムゾーン、日付をまたぐ遅延受取、0:00の自動更新、再読み込み、期限なし表示、横はみ出し、フォーカス復帰を確認。日付境界は模擬サーバー時刻で検証し、本番時刻を変更していない。実端末や実プレイヤーのアカウントでの検証ではない。

[QAと本番APIの証拠](../../qa/2026-10-30-daily-login/README.md) · [全件テスト](production-suite.json) · [デプロイ](deployment.json)

## 参照・起動元

最新採用実装 `gh/main` の `1b984ccf` を基準に、`client/src/ui/giftInbox.ts`、`client/src/shared/dailyLoginGift.ts`、`server/src/dailyLoginGift.ts`、`server/src/gifts.ts` を変更。既存の蒼銀UI・封筒アート・受取トランザクションを継承。

作業・プレビュー起動元: `/Users/hiromaru05s/.codex/worktrees/tutorial-onboarding/LORE_TCG`。ローカルUI: `http://127.0.0.1:5173/`。公開UI検証: `https://yourlore.xyz`。公開画面の素材・表示を画像でも確認。
