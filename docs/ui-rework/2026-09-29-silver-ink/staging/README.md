# 銀紋リフトのステージング検証

ユーザー選定の②「銀紋の流墨」を共通リフト除外へ適用。通常除外・クイック魔法・生成カードが共通入口を使用する。

- 配信: https://test.yourlore.xyz/
- Worker: `1f062553-96e8-449d-8e29-99411bd96f0c`
- 土台: `7801cc3e9c6043fb6fb48016d8cb26aa97f3d336`。同コミットの新しい盤面モデルを保持。
- 実装: 3新規ソース、`riftScene.ts` の接続、`anim.ts` の待機上限1行。別のマナ／シェルフ試作は含めない。
- 型検査（client/server）、ビルド、rift-transmute、quick-playback、隔離ソースのブラウザ検証に成功。`checks.json` / `isolated-browser-report.json`。
- 配信16ファイルのSHA-256一致。`hashes.json`。
- 公開JSで800ms発光・1,500ms渦化の継続をassertし、代表画像を目視確認。終了後オーバーレイ消去・ページ例外なし。`browser.json` / `effect-800.png` / `effect-1500.png`。
- ブラウザ検証はアカウント/API fixtureと変更のないメディアのローカルキャッシュを使用。JSと盤面GLBはステージング取得。BOT盤面でカード複製と固定リフト位置へ描画関数を明示呼出し。自然発生した除外や認証済みオンライン対戦の検証ではない。
- サーバー変更・DBマイグレーション・本番デプロイなし。

公開時点の5ソースは `source-manifest.json` のハッシュで確定。初回公開の後に別タスクの盤面公開が入ったため、最新盤面へ合流して最終公開した履歴は `deployment.json` に記録。
