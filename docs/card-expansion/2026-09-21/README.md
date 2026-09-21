# v50 反撃・カード拡張リリース

公開先: https://test.yourlore.xyz

- 指定の既存43種に「反撃」を追加。
- 新規48種を実装し、各カード専用のアート48枚とサムネイル96枚を追加。
- ミミックキング2世、アサシンギルドの宝箱をリワーク。
- 対象選択、購入・発動条件、コスト変動、クエスト進行、Bot、オンラインの非公開情報処理を接続。
- 最新のデザイン変更 `cb7432c` をマージ。統合コードは `adcb91c`、カード実装は `a373121`。
- Cloudflare Worker `lore-server-staging` の公開版: `a265ac52-7098-4a67-bc77-cae5ea2d1884`。

## 実装時に補った仕様

詳細: [DECISIONS.md](DECISIONS.md)。特に、反撃は攻撃力の半分・切り上げ、未指定の大砲兵は0コスト4/2・終了時2ダメージ、支配のコスト固定は発動ターンの次の手札3枚、ポイズンマスターは腐敗の通常1個＋追加2個としている。

[新カード一覧](CARDS.md) / [カード定義](catalog.json) / [アートの寸法・SHA-256](art-manifest.json) / [生成プロンプト](art-prompts.json) / [生成記録](generation-provenance.json)

## 検証

- 新効果36ケース: [mechanics-test.txt](mechanics-test.txt)
- 既存のクエスト・クイック、v47/v48、罠廃止、初期手札、ステータス表示の回帰テスト。
- Bot同士10試合、1193操作が完了。
- client/serverの型チェック、デザインガード、Viteビルド、Wrangler staging dry-run。
- 344カード×3言語のテキスト検査: 違反0。全344カードのアートとサムネイルが存在。
- 新規144画像URLのデコード、3言語のカード表示、対象選択、相手ターンの連続選択を実画面で検証: [browser/report.json](browser/report.json)
- 統合後のドロー、盤面UI、VFX、クイック再生、リフト折り込み・吸収、motion-v2のテストが通過。
- 本番配信用ビルドとステージングの148ファイルがSHA-256で一致: [deployment.json](deployment.json)
- ステージングの隔離した2アカウントで140操作・23ターン、再接続と対戦完了を確認。農場管理者、イカサマ、黒魔術師アリス、ミミックハンター、傭兵術が実際に解決: [staging-online.json](staging-online.json)
- サーバーの対戦記録はv50: [staging-match-version.json](staging-match-version.json)
- 公開HOMEからカード一覧を開き、ファイアー系5枚・黒魔法/黒魔術師6枚と画像の読み込みを確認: [browser/staging-browser.json](browser/staging-browser.json)
- テストアカウント・セッション・テスト対戦記録を削除。検証用の認証ファイルも削除: [staging-cleanup.json](staging-cleanup.json)

既存のViteチャンク容量・静的/動的import混在の警告は残る。ゲームバランスの勝率調整は実施しておらず、依頼の数値を実装した段階。

## 作業ツリー

統合先は `codex/reading-board-staging-20260921`、実装ブランチは `codex/counter-expansion-20260921`。今回のコード・アート・検証資料をコミットして両方を同期する。元の `/Users/hiromaru05s/Desktop/LORE_TCG` は別タスクが使用中のため、その未コミット作業を一括置換・削除しない。
