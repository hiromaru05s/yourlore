# 敗北演出 — 固定破片と奥行き

2026-11-18に実盤面で調整し、2026-11-19にユーザーから本番適用の指示あり。
最終仕様と検証は [FIXED-FRAGMENTS.md](FIXED-FRAGMENTS.md)、公開状況は [リリース記録](../../releases/2026-11-19-defeat-fracture/README.md) を参照。

- ローカルプレビュー: http://127.0.0.1:5538/defeat-depth-preview.html
- 起動元: `/Users/hiromaru05s/.codex/worktrees/defeat-depth-preview-1118/LORE_TCG/client`
- 最新統合元: `a67ceafdf`。固定モデルの採用素材は `e5a8c53fd`。
- 実盤面: `boardView.ts`、`duelScene.ts`、`readingBoardLayout.ts`、`styles/reading-board.css`。
- 実接続: `game/controller.ts` → `ui/manaRupture/runtime.ts`。旧演出はdev比較の `rendererBaseline.ts` / `shadersBaseline.ts` に保存。
- 「銀紋の流墨」の最低品質基準は、表面から同じ物質の破片へ変わる連続性、予兆と衝撃の時間設計、手前へ迫る厚みとして適用。見た目のユーザー承認と機能検証は区別する。
- 開発用の比較ページは本番ビルドの入口に追加しない。
- 元のDesktop作業フォルダの既存変更は編集していない。
