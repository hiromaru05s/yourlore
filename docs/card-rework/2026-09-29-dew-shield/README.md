# 雫・シールド拡張と新規16枚のLORE画風アート

新規16枚、既存11枚のリワーク、雫／シールドの状態・対戦処理・BOT・公開状態・盤面表示を実装。仕様の対応表は `implementation-matrix.md`。

## アート

初稿16枚は写実性が強いとして差し戻されたため、承認済みの既存カード SOLDIER2 / VITAL2 / GOLEM1 / WORLD_CARE を画像参照に用いて、全16枚を内蔵画像ツールで再生成した。描かれた輪郭と大きな色面、白亜・青布・翡翠・陶板を基調とする。生成ツールはモデル名を公開していない。

- `art-gallery.html`: 修正版16枚の一覧。
- `art-direction-v2.md`: 適用した画風の基準。
- `generated-art-v2.json`: 第2稿のプロンプト、参照、生成元PNGの記録。
- `generated-art.json`: 差し戻しになった初稿の生成記録。配信には使わない。
- `art-manifest.json`: 修正版16枚×3サイズ、計48ファイルの寸法とSHA-256。
- `import-art.mjs`: 生成済みPNGから配信WebPへの形式変換。

## このコミットの検証

`qa/` に実行結果とPC／縦画面／横画面のスクリーンショットを保存。

- `npm run typecheck`: client / server 成功。
- `npm run text:check`: 360枚×3言語、違反0。
- `npm run art:check -- --include-starters`: 360/360枚。
- `npm run build`: 成功。既存の大きいチャンクに関するVite警告あり。
- `node tests/dew-shield-v54.mjs`: 32シナリオ群成功。
- `node tests/dew-shield-server.mjs`: 実GameRoom＋2つの疑似WebSocketで防御側選択権、相手の不正応答拒否、保存／再接続、手札秘匿、タイムアウトを確認。
- 関連回帰7本成功（v54とserverを含め全9本は `qa/regression-results.json` を参照）。
- `LORE_TEST_ORIGIN=http://127.0.0.1:5200 node tests/dew-shield-browser.mjs`: 実BaseControllerの職人選択操作、双方の雫／シールド表示を3画面サイズで確認。修正版16枚の画像decodeも成功。
- 48画像のSHA-256・寸法・全面不透明を確認。

ブラウザ検証はローカルfixture。サーバー検証は実GameRoomクラスを使ったローカル統合テストであり、ステージング上の認証済み2人対戦を実行したという意味ではない。

## 統合担当への引き渡し

最終マージ・push・ステージング公開は統合タスク `01a0e9ed-c169-7b33-9251-2c7173f0fd51` が担当。機能ブランチから独立してデプロイしない。

`client/src/ui/boardView.ts` は他工程の手札案内変更と交差する。両プレイヤーの `.pt-resources` と盤面レイアウトの下端余白を保持すること。`cards.ts` の v54 と新規 `dewShieldCards.ts` の登録、`card-art-lib.mjs` の読込対応をまとめて統合する。クライアントとサーバーは同じ共有エンジンを使うため、両方を公開すること。

公開後は `art-manifest.json` の配信画像ハッシュと、配信JSにv54カード群が含まれることを照合する。別タスクの同時デプロイによる巻き戻しを防ぐため公開は直列化する。
