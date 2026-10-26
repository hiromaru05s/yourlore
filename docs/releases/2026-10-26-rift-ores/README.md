# リフト鉱石 — スターライト／メタライト

2026-10-26 のユーザー依頼：リフト物質を「リフト鉱石 - スターライト」に改名してアートを再制作。全体カード「リフト鉱石 - メタライト」（コスト2・魔法・プレイ不可）を追加。他のカードの効果で自分のリフトへ送られた場合、相手の墓地1枚を選び相手のリフトへ送る。本番反映まで依頼済み。

## 実装

- スターライトの保存済みID `RIFT_MATTER`、コスト5、既存の場2枚を送る効果は維持。三言語の名称・選択文言を更新。
- `RIFT_METALIGHT` を全体の購入プールへ追加。スタータープールには追加しない。
- `client/src/shared/riftMatter.ts` に三言語定義、`cards.ts`・`cardEffectText.ts`・`cardRuleMetadata.ts` に登録。
- 共通 `engine.ts` でプレイ拒否、実際のリフト追加検出、墓地の選択・移動を処理。相手ターンでも鉱石の所有者が選ぶ。対象ゼロは不発、不正UID・キャンセルは消費しない。神機は対象外。送られた別の鉱石はその所有者の効果を起動する。
- バランス版 `v63`。既存のリフト差分演出へ接続し、新しい専用VFXは作っていない。

## アートの参照と生成

参照した採用実装は `7156d1cb` の `client/src/ui/cardArt.ts` と `client/public/art/cards/`。既存のカード枠・背景・キャラクターは同コミットの実装を使用。

23枚の採用済みアート（変更対象の旧アート1枚＋他22枚）を実際に並べて確認し、内蔵 image_gen に参照として渡した。対象一覧と画像は `docs/card-art/2026-10-26-rift-ores/references.txt` / `references.jpg`。最終プロンプトは同ディレクトリの `generation.json`。

- スターライト：リフトの岩盤に生える青白い半透明の鉱石。内部の星光、黒紫の母岩、広い明暗面。
- メタライト：同じリフトの岩盤に含まれる銀灰色の金属鉱石。不透明の板状結晶と鈍い金属光沢。
- 最終保存先：`client/public/art/cards/RIFT_MATTER.webp`（既存置換）、`RIFT_METALIGHT.webp`（新規）。両方1472×1344、WebP quality 92。384px / 192px サムネイルも更新。カードごとの画像バージョンを更新して旧キャッシュと区別。
- 生成結果を目視し、実カード枠のクロップ・名称表示も `qa/cards-ja.png` で確認。ユーザーによる見た目の承認が済んだという意味ではない。

## 検証

- `npm run typecheck`。
- `tests/rift-ores.mjs`：追加10項目。名称・購入区分・プレイ不可・墓地だけの選択・不正対象・空墓地／神機・非発動ケース・相手ターンの所有者・鉱石同士の連鎖・複数個体・BOTの合法選択。
- `tests/rift-ores-server.mjs`：権威サーバーのWebSocketハンドラーで、非手番所有者の認可、相手からの不正操作拒否、無効対象・キャンセル拒否、選択中の保存／再接続、両クライアントの状態を確認。
- 既存 `starter-rift-rework.mjs` 13項目と `starter-rift-server.mjs` も通過。
- `npm run text:check`：379枚×3言語、1137文面が通過。今回2枚だけ監査台帳を更新。
- `npm run art:check`：376/376枚あり。チェックアウト時刻由来の既存サムネイルmtime警告は、今回以外の画像を再生成する根拠にはしない。今回6画像のサイズ・SHA-256は `qa/assets.json`。
- `tests/rift-ores-browser.mjs`：既存の実カードレンダラー／コントローラー／選択UIで墓地の2枚目を実クリックし、その個体だけリフトへ移動することを確認。1440pxと390pxの画像を保存。ページエラーなし。`qa/browser-report.json`。

プレビュー起動元は `/Users/hiromaru05s/.codex/worktrees/rift-ores/LORE_TCG`、URLは `http://127.0.0.1:5318`。`qa/cards-ja.png` / `rules-ja.png` / `rift-choice.png` / `board-after.png` / `board-390.png` に実表示を記録。ブラウザーはローカルfixtureであり、認証済み本番PvPの検証ではない。

## 本番反映

- 実装コミット `0798ea87`。最新mainを含む公開スナップショットは `a679258097f2f09f6633e6a62ba7a55e8dd5e3b0`。
- 既存ガードでコミット済みスナップショットをビルドし、全218件の本番テスト、型検査、ビルド成功後に公開。`production-suite.json` / `deploy.log`。
- 2026-10-26 16:51 KST、`https://yourlore.xyz`。Worker version `c59c5bc4-656b-40ac-a261-196715e5f9fd` に100%配信。`production-deployment.json`。
- `scripts/verify-rift-ores-release.mjs` で本番HTMLが今回のエントリーJSを参照することを確認。カタログ／エンジンを含むJS 2ファイル、配信マニフェスト、鉱石アート6ファイルがローカルのビルド／原本とSHA-256一致。`production-verification.json`。
- `tests/rift-ores-deployed-browser.mjs` をビルド済みローカル画面と本番URLで実行。両方の一覧検索、名称・コスト・プレイ不可・効果文、390pxの一覧／詳細表示が通過。`qa/built/` / `qa/production/`。本番に実際に配信された素材を使用し、スクリーンショットを目視確認。
- ブラウザーのアカウントAPIはfixture。実在アカウントやDBを書き換えていない。本番での認証済みPvPは未実施。見た目の承認と機能／配信の検証は別の証拠として扱う。
