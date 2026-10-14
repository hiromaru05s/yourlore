# ステージング公開証跡

- 公開先: https://test.yourlore.xyz
- 公開日時: 2026-10-14 11:12 JST/KST（02:12 UTC）
- 実装コミット: `1b50750c`
- 公開ソース: `8c55753b77e9cfe10b26bf9d39f912f5de4108a4`
- `node scripts/deploy-guard.mjs staging` によりクリーンなスナップショットを型検査・全回帰124/124・ビルド後に公開。
- Worker: `42d6ad27-66e7-4607-9379-c91a1f658841`、100%トラフィック。
- `deployment-status.json` の公開ソースアノテーションと一致。
- `build-manifest.json` はガードの実ビルドから保存。HTML／JS／CSS／背景の77/77 SHA-256が公開配信と一致（`assets.json`）。
- 公開サイトの読み込み完了・ログイン画面表示、取得console error 0件を確認。
- 認証済みHOME／新規登録の初回案内は公開環境では未操作。通常ゲストHOMEとチュートリアルのモデル・画面遷移、PC／スマホ、表情と停止処理はローカル検証。
- mainと作業ブランチへpush済み。本番は未公開。証跡の追加は公開ソースとは別のドキュメントコミット。
