# リフト枚数 — 数字のみ

2026-10-09。ユーザー指定により、カードの積層・枠・小印・紙面・増減アニメーションを撤去し、リフト上に数字だけを表示する。

- Cormorant Garamond Mediumと象牙色の淡い濃淡は維持。0枚も表示し、2桁・3桁は字面を調整する。
- 両陣営の実際の除外枚数、アクセシブル名、クリック／Enterで開く既存のカード一覧を維持。
- 変更対象は `riftRecordCount.ts` と `riftRecordCount.css`。リフト本体の背景・除外演出・他UIの変更は含めない。
- ローカル実GameViewで0〜9／12／99／999、両陣営、PC／スマホ、連続更新、カード一覧操作を確認。結果は `local-qa.json`、表示は `local-board.png`。
- 最新 `gh/main` へ統合し、`scripts/deploy-guard.mjs staging` の型検査・production suite・ビルド・現行SHA／Worker検証を通してステージングへ反映する。本番公開は行わない。

ローカルfixtureの機能確認と、ステージングでの認証付き実対戦確認は別のものとして扱う。
