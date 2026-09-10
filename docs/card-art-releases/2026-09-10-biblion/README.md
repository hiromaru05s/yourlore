# Biblion card art release — 2026-09-10

ステージング反映済み: `e561a39a-97a2-4e8f-abf4-cc47e4f0ffc5`（ソース `78d3ab2`）。全888画像を含む904配信ファイルのSHA-256一致を確認。

ユーザーの「新しいデザインで全て焼き直したので適用してステージングにデプロイ」の指示に基づき、現行カード296枚を適用。探索フォルダの「未適用・確認待ち」は制作時点の記録として保持する。

- 全体257枚、先行36枚、カル・宝箱・アチューンの改訂02を3枚。
- 各PNGのSHA-256・寸法と現行DB/STARTERSの全IDを照合。重複ID・不足・余剰なし。
- 832pxのWebP本体、384px/192pxの縮小版、計888ファイル。原画の比率・色・構図を保持して形式変換し、既存のカード枠で表示する。PNG原本は探索フォルダに保持。
- 旧カードを代用していたクエスト／クイックの19件のアート別名設定を削除。全カードが自身のIDに対応する新画像を使用。
- キャッシュ識別子を `20260910-biblion` に更新。カード表示、拡大、飛行テクスチャ、カード由来アバターで同じURL規則を使用。
- 既存の3D台・演出・カードフレーム・ルールは保持。

生成元と配信画像の対応は `manifest.json`。変換の再実行は `node scripts/import-biblion-card-art.mjs`（ローカルの元PNGが必要）。元の探索ファイルはこの適用コミットへ追加せず、配信用WebP・対応表・コードを保存する。

## 確認

- `art:check -- --include-starters`: 296/296、縮小版の不足・古いファイルなし。
- client/server型チェック、ビルド・design guard、duel-ui回帰テスト、diffチェック。
- `tests/biblion-card-art-browser.mjs`: 296IDの888URLをすべてブラウザでデコード。ID固有の参照先と832/384/192pxを確認。24枚を実カード枠で目視確認（`framed-samples.png`）。
- `tests/duel-render-audit-browser.mjs`: 新アートで購入、シェルフ、アチューン、魔法ドラッグ、手札破棄、ロード時の台を検証（`duel/`）。
- 検証範囲はローカルChromeの実エンジン対戦fixtureと配信画像の確認。実サーバー2人対戦・Safariの再検証は含まない。

配信先は https://test.yourlore.xyz / lore-server-staging。配信バージョン・公開ファイル照合は `deployment.json` / `staging-verification.json` を参照。
