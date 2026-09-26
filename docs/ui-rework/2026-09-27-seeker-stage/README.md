# LORE Seeker Stage — approved HOME concept 02

2026-09-27。承認された `docs/ui-concepts/2026-09-23-home-game-five/02-seeker-stage.png` を基に、インゲーム以外の画面へ適用。

## 変更

- HOME: 探書者の全面背景、右側の画像生成された対戦紋章、実データのMMR・順位と使用デッキ。
- 共通導線: 左サイドバーを廃止し、ホーム／デッキ／カード／ランキング／フレンド／ショップ／遊び方の下部ドックへ変更。プロフィールは左上、設定・招待・問い合わせは右上からアクセス。
- カード・デッキ・ランキング・フレンド・プロフィール・戦績・スリーブ・設定・ショップ・ガイド・ログイン・登録・待機・各ダイアログを紺と銀の画面に統一。
- カード一覧はヘッダーとフィルターを固定し、トレーだけスクロール。空状態・最下段でも背景が途切れない。
- 縦画面と低い横画面に専用レイアウト。キーボードフォーカス、Escape、ダイアログのフォーカス復帰、動きを減らす設定を維持。
- フレンド一覧は常駐サイドパネルから下部ドックへ移動。画面ごとの既存操作・サーバー処理を再利用。

## 生成素材

内蔵 image_gen を使用。背景と透過紋章を個別生成。文字・MMR・デッキ名は画像に焼き込まずHTMLで表示。既存の25種の画像生成PNGアイコンも継続使用。

- `client/public/art/lounge/stage-v1/stage.png`
- `client/public/art/lounge/stage-v1/sigil.png`
- `assets.json`: 生成プロンプト、出力元、実装パス、SHA-256。

## 検証

- `npm run typecheck` / `npm run build` / `git diff --check`
- `tests/lounge-browser.mjs`: デッキ保存、未保存退出、カード詳細、対戦申請、プロフィール編集、設定、招待・問い合わせ、認証等31状態。API fixtureを使用。
- `tests/lounge-stage.mjs`: HOME 1280×720、844×390、390×844、320×568。カード一覧1586/1024/390/320px。ランク／ノーマル待機・キャンセル、BOT選択、下部ドック、補助メニュー位置、25PNGの読込。API/WebSocket fixtureを使用。
- `tests/lounge-rank.mjs` / `tests/lounge-settlement.mjs`: 既存MMR精算の回帰確認。
- Wrangler 4のstaging dry run。

スクリーンショットのユーザー情報・ランキングはテストデータ。オンラインの実ユーザー同士の対戦成立をこのUIテストで検証したという意味ではない。

配信先は `https://test.yourlore.xyz/`。配信結果と統合情報は `deployment.json` に記録。
