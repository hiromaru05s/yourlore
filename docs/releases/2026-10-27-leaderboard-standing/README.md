# ランキングの自分の順位を大きく表示

参照: 最新採用main `538b3b48`。対象は `client/src/screens/leaderboard.ts` と新規 `client/src/styles/leaderboardStanding.css`。既存 `ui/rankEmblem.ts` の紋章、蒼銀パネル、背景をそのまま使用。

右側の自分の順位をコンパクトな一行から縦配置へ変更。PCの順位72px、紋章184px、MMR42px、勝敗数26pxを使い、ティア・MMR・戦績を分けて表示。狭い画面では一覧の上に移し、左に紋章・右に順位／MMR／戦績を配置。空状態の非表示を維持。

プレビュー起動元: `/Users/hiromaru05s/.codex/worktrees/leaderboard-column-alignment/LORE_TCG`、`http://127.0.0.1:5568`。

クライアント型チェックと `../2026-10-26-ranked-profiles/browser-check.mjs` で、1440/1070/820/390/320pxの表示・列揃え・横はみ出し、プロフィール導線と閉じる動作を確認。自分の順位・MMR・紋章が各幅で十分なサイズに保たれることも確認。ブラウザーAPIは検証用データ。
