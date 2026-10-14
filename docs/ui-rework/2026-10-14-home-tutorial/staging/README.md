# ステージング適用結果

- URL: https://test.yourlore.xyz
- 公開日時: 2026-10-14 01:39 UTC（10:39 JST/KST）
- 公開ソース: `3fb6039abeb914ab350fab3d6d418b0b224997d2`
- UI実装: `c5848093`。最新mainの `9cc8ecae`（拡大カード）と `98de9558`（カードアート）を統合し、mainと `codex/home-tutorial-spirit` へpush済み。
- コマンド: `node scripts/deploy-guard.mjs staging`
- クリーンなスナップショットで依存インストール、型検査、production回帰 **123/123**、ビルド成功。
- Worker version: `5e18f9d8-f8f4-4bfd-83a9-1d7509e66e03`、トラフィック **100%**。`deployment-status.json` に公開ソースのアノテーションを保存。
- `build-manifest.json` はガードが公開した実ビルドから削除前に採取。HTML、全JS/CSS、新HOME背景の **77/77** SHA-256が公開配信と一致。照合は `assets.json`。
- 公開サイトをブラウザで開き、読み込み完了・ログイン画面への正常遷移を確認。取得したconsole warning/errorは0件。
- 当該ブラウザは未ログインのため、公開環境の認証済みHOME／クリア保存の操作は未実施。HOME・チュートリアルの詳細な画面／動作検証は親READMEに記載のローカル検証。本番は未反映。

この記録の追加はドキュメントのみであり、公開ソースのSHAとは別コミット。
