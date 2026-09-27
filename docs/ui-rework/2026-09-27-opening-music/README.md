# 7秒の開幕と「Clash of Blades」

指定MP3を無変換で `client/public/music/clash-of-blades.mp3` に保存。
6.52秒、48 kHzステレオ、180,393 bytes。
SHA-256: `73ca490d1cf64c2c80885c3329eba4f2b82be397f3b23d6eb01a5c73a46688ca`。

## 挙動

- 通常再生では、開幕から7,000 msでコイントス開始。6,300 msから肖像が盤面に収まり、8,500 msで先攻表示、9,100 msから配札、10,450 msで操作解放。
- ランクマ・ノーマル・BOTの実際の開幕時刻に「Clash of Blades」を1回再生。相手や画像の準備待ちでは再生しない。
- 開幕曲のendedを受けて「poised opening」へ切り替え。2曲は重ならず、通常時は開幕曲を途中で切らない。
- 対戦曲の音量はホームの60%、次ループまでの3秒間隔を維持。既存スキップ・reduced-motionでも音楽が重複せず、画面破棄で両曲と再生予約を解放。
- 開幕途中の再接続では経過位置に合わせる。既にプレイ可能な対戦への再接続では対戦曲から再開。ミュート／タブ非表示からの復帰時に過ぎた開幕曲を再演しない。
- サーバーと共通タイミング定数を使うため、最初のターンの持ち時間は演出後から開始。既に開始済みの部屋のplayableAtは保存済みturnStartAtに合わせ、デプロイで期限を伸ばさない。

## 検証

- クライアントbuild・サーバーtypecheck・diff check成功。
- 開幕サーバーテスト: 準備待ち、操作解放、再接続・休止復帰、旧ルーム期限、ランクマpreview、アラーム順序、隠し手札。
- 開幕ブラウザ既存テスト: 4画面サイズ、先攻／後攻、スキップ、reduce-motion、ローカル／オンライン時計、500秒時差、WebGL fallback。
- ceremony-audio-aim / quick-playback / opening-hands 成功。
- ホームBGM、対戦BGMの回帰検証成功。対戦曲末の間隔実測3,001.4 ms。
- 新規実音源テストでnormal/ranked/BOTの全てで自然な曲末→対戦BGMを確認。切替待ち28.2 / 26.4 / 27.1 ms。コイントスphaseの最初の観測7,219 / 7,085 / 7,063 ms（タイムライン閾値7,000 ms、ブラウザポーリングによる観測遅延あり）。ページ例外なし。開幕中の画面破棄で対戦曲が後から始まらないことも確認。

ブラウザのオンラインWebSocketはテスト用スタブ。認証済み実オンライン対戦はこの検証範囲に含まない。

再実行: Viteを5191番で起動し、`PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node docs/ui-rework/2026-09-27-opening-music/browser-check.mjs`。接続先は `LORE_TEST_ORIGIN` で変更可能。

## 統合・ステージング

並行作業の最終main `9f18d0d` に本変更を `b0ce8f7` として取り込み。
`https://test.yourlore.xyz/?v=b0ce8f7` へ反映済み。
Worker version: `e46a04ab-4144-4090-97b9-0c65ac6bc629`。
公開index・参照JS/CSS・3曲の計7ファイルでビルド出力とSHA-256一致。
公開画面から実BOT対戦を起動し、開幕曲の自然終了→対戦曲、7秒コイントス、音量0.147、対戦曲末3秒待機を確認。ページ例外なし。
アカウント/APIのみ明示的fixture。配信アプリ、BOT処理、音源再生は実物。productionへのデプロイなし。
再実行は `tests/opening-music-staging-browser.mjs`、結果は `staging/browser.json`。
