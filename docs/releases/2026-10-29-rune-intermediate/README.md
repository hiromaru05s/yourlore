# ルーン学問 - 中級：最大マナ＋2

- 依頼：中級の最大マナ増加を＋2に弱体化し、本番へ反映。
- 基準：`5839a8bd39128f80f1453a82e8ccc1ffbafdf7bc`。着手時の `gh/main` と本番稼働ソースは一致。
- `client/src/shared/engine.ts` の RUNE2 を＋8から＋2へ変更し、対戦ログも更新。
- 発動条件（デッキ・手札・墓地の半分以上が魔法またはスターター）と購入／発動コスト5は維持。
- 日本語・韓国語・英語の正規効果文と定義の説明を更新。バランス版は v69。
- `tests/rune-intermediate.mjs`：両者の発動、半分ちょうど／条件未達、現在マナの消費、上級の再発動、最大マナ増加禁止、GameRoomの配信と永続化・復元を検証。
- 三言語381枚のテキスト検査に合格。実プレイヤー同士のPvP検証ではない。
- 本番公開は標準 `npm run deploy` のソース照合・DBスキーマ検査・型検査・production suite・ビルド・競合検知を経由する。

## 検証結果と公開状態

- 実装コミット：`81ea648a`。
- `npm run typecheck`、`npm run text:check`、`npm run test:production`（251/251）、`npm run build`、本番DBの読み取り専用スキーマ検査に合格。
- 公開は未実施。GitHubが既存認証情報を `Invalid username or token` として拒否し、mainへの反映に進めない。
- 既存のOSキーチェーン経由でも同じ認証エラー。認証情報を更新後、最新 `gh/main` を取得・必要な統合・mainへのpushを行い、標準 `npm run deploy` を再開する。
- 本番バージョン・配信アセットの事後検証は未実施。対人PvP検証は未実施。
