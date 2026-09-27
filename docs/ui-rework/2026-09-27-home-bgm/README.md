# ホームBGM「余白と残響」

ユーザー指定のMP3を無変換で `client/public/music/yohaku-to-zankyo.mp3` に収録。
217.96秒、48 kHz、ステレオ、5,118,916 bytes。
SHA-256: `1f5855ccd4adcb2bc2c4315be93695352a54ad75f273b3920c82eac2cf28200c`
元ファイル・配置ファイル・ビルド出力のハッシュ一致を確認。

- ホーム画面でループ再生。初回は画像準備完了まで音源の通信を開始しない。
- 自動再生が許可されない場合はクリック・タップ・キー入力で再試行。
- 既存音量設定に連動。BGMの音量は設定値の二乗 × 0.5（初期値70%で0.245）。
- ホーム離脱時に停止・音源を解放。ホーム再訪時は曲の先頭から再生。
- タブ非表示で一時停止、再表示で再開。ホーム以外や対戦中には流さない。
- 既存効果音モジュールは変更せず、`getSfxVolume` のみ参照。

## 検証

`npm run build` 成功（既存の大きなチャンク警告あり）、`git diff --check` 成功。
Chromeで実音源のデコード・再生、曲末のループ、画像準備前の通信なし、音量とミュート、ホーム再訪、BOT開始時の停止と解放を確認。ページ例外なし。
自動再生拒否は最初の `play()` のみ NotAllowedError を注入して再試行を検証。非表示／再表示は visibilitychange を注入して検証。

再実行: Viteを5189番で起動し、`PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node docs/ui-rework/2026-09-27-home-bgm/browser-check.mjs`。
任意の接続先は `LORE_TEST_ORIGIN` で指定できる（Viteのソースモジュール配信が必要）。
