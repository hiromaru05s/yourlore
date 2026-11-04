# 闇商人のカード名検索・コスト／種別フィルター

2026-11-04。ユーザーがローカルプレビューを承認し、mainマージと本番反映を指示。

## 実装

- 機能コミット: `9e8ce4e99506b95f44fae51355098dc1aeaa38f1`。
- 承認・統合確認コミット: `0e459488ebed4ca1b2d822d41c6fe5cfc1feb3f7`。mainへfast-forward push済み。
- カード名の部分一致（NFKC正規化・大文字小文字の吸収）、購入コスト、すべて／モンスター／魔法カードをANDで組み合わせる。
- 該当件数、0件表示、一括解除。非表示になった選択カードは解除し、確定を無効化。
- 購入候補の権限・マナ・カード固有条件と既存の購入処理は維持。フィルターは闇商人でのみ有効。
- 所有ソース: `client/src/game/controller.ts`、`client/src/ui/modal.ts`、`cardPickerFilters.ts`、`client/src/styles/cardPickerFilters.css`、`client/src/i18n.ts`。

## 検証範囲

- `tests/dark-merchant-filters-browser.mjs`: 実コントローラー・reducerで検索、コスト／種別、0件、全解除、非表示選択のクリア、購入時のマナ消費・墓地への追加、購入不可候補の除外、キャンセルを確認。3言語・4画面サイズでPASS。
- プレビュー後のmain `1a8e215e` に統合し、同ブラウザ検証を再実行してPASS。
- 初回のguarded snapshotでDBスキーマ・クライアント／サーバー型チェック・全267/267回帰テスト・ビルドがPASS。その間にmainへENEMY TURN固定表示が追加されたため、最新main一致チェックで配信前に停止。
- `a41a503ab925d7a8152abd45ef18e6cf9e8ea589` へfast-forwardして再リリース。別作業のロック中は開始せず、解放後に標準デプロイガードで実行。
- ブラウザ検証はローカルfixture。実アカウント・認証付きPvPは未検証。DB・アカウントデータの変更なし。

## 本番反映結果

- 2026-11-04 18:50 KST、`https://yourlore.xyz` に反映完了。
- デプロイソース: `a41a503ab925d7a8152abd45ef18e6cf9e8ea589`。
- Worker version: `7e5e22ee-0086-47fe-b504-4a79454e7733`、トラフィック100%。
- Deployment: `48497784-9956-45c6-9858-7b4abf1013c2`。
- 最新mainのクリーンなスナップショットでDB整合性、両型チェック、267/267回帰テスト、本番ビルドがPASS。
- 本番配信のHTML/JS/CSS/JSON **138ファイル**がローカルの同一ソースのビルドとSHA-256完全一致。検索・フィルターのJS/CSSと3言語辞書もこの照合対象に含む。
- 公開トップページと匿名認証APIは200、認証が必要なcollection/profile/queueは401であることを読み取りのみで確認。
- `asset-parity.json`、`deployment.json`、`public-smoke.json` に詳細。機能ブラウザ検証と本番バイト照合を組み合わせた確認であり、実アカウント/PvPの操作検証ではない。
- 本記録を追加する後続コミットはアプリの配信内容を変更しない。
