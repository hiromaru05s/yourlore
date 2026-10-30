# 外観の見本カード修正 — 2026-10-29

ユーザー指定: 外観でフレーム選択を見本カードに反映し、見本のアチューンを一番上、フレーム・エフェクト・スリーブ・家具の選択UIをその下に置く。

- 参照した最新main／本番: `5839a8bd39128f80f1453a82e8ccc1ffbafdf7bc`。本番の事前Worker version: `efab21c0-2b79-4700-8143-c8294bbc5a21`。
- 実装: `client/src/ui/deckAppearance.ts`、`client/src/styles/deckAppearance.css`。
- 採用済み `cardView`、`cardFrame`、`cardFinish`、`STARTERS.STARTER_MANA`、蒼銀の共通UIを使用。フレームとエフェクトを同じ見本・拡大表示に渡す。
- 選択UIより前の独立した中央配置に移動し、エフェクト欄の下にあった旧見本を削除。再描画時に旧エフェクトを解放。
- カード一覧やデッキ内の順序は変更しない。

ローカル起動元: `/Users/hiromaru05s/.codex/worktrees/appearance-frame-fix/LORE_TCG`。
表示URL: `http://127.0.0.1:5229/`（Viteのclient）。

確認: 型チェック、製品ビルド、`tests/deck-appearance.mjs`、`tests/card-frames.mjs` 成功。
`tests/deck-appearance-preview-browser.mjs`: 5種類のフレーム切替、エフェクト併用、拡大、保存／画面再入場、通常枠への復帰、1440/1280/390/320pxで見本の中央配置・選択UIより上・画面内への収まりを確認。実際の表示素材を使用し、PC／狭幅のスクリーンショットも確認。
所有権・保存のブラウザー検証はAPI fixture。実アカウントの装備更新や実購入を行った証拠ではない。ユーザーによる見た目の最終確認とは別。

## 本番反映 — 2026-10-30

GitHub認証復旧後、修正を最新mainへ統合。並行して進行していたガード付きリリースに本変更が含まれることを確認し、重複デプロイせず完了を待った。

- 公開ソース: `89e4e752fc671415baea52466d5759cf39d32bad`（修正 `5b8b1010` を包含）。
- Worker version: `e6b6ec90-b11b-4aa5-83ef-d17416d5b2cb`、配信100%。
- リリース: 型チェック、252/252製品テスト、製品ビルド成功。
- `https://yourlore.xyz` の公開アセットで同じブラウザーテストが成功。5種類のフレームとエフェクト併用、拡大、保存／再表示、通常枠への復帰、1440/1280/390/320pxで上中央への配置を確認。APIのみfixtureのため実アカウント更新は行っていない。
- 結果: `production-report.json`。公開版のPCスクリーンショットも目視確認。
