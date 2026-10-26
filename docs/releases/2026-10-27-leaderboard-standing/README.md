# ランキングの自分の順位を大きく表示

参照: 最新採用main `538b3b48`。対象は `client/src/screens/leaderboard.ts` と新規 `client/src/styles/leaderboardStanding.css`。既存 `ui/rankEmblem.ts` の紋章、蒼銀パネル、背景をそのまま使用。

右側の自分の順位をコンパクトな一行から縦配置へ変更。PCの順位72px、紋章184px、MMR42px、勝敗数26pxを使い、ティア・MMR・戦績を分けて表示。狭い画面では一覧の上に移し、左に紋章・右に順位／MMR／戦績を配置。空状態の非表示を維持。

プレビュー起動元: `/Users/hiromaru05s/.codex/worktrees/leaderboard-column-alignment/LORE_TCG`、`http://127.0.0.1:5568`。

クライアント型チェックと `../2026-10-26-ranked-profiles/browser-check.mjs` で、1440/1070/820/390/320pxの表示・列揃え・横はみ出し、プロフィール導線と閉じる動作を確認。自分の順位・MMR・紋章が各幅で十分なサイズに保たれることも確認。ブラウザーAPIは検証用データ。

## 本番反映

2026-10-27、`508980235d6f0e08b72b20b239dde872f165c047` を https://yourlore.xyz へ公開。Worker `45f4ce0f-4985-4c89-8d59-59af9ebc713c`、100%。先行公開完了後の最新main `4dbe3aca` を統合し、共有ロック・最新main照合・型チェック・237/237の回帰テスト・design guard・本番ビルドを通過。

本番配信アセットでも5画面幅のブラウザー検証が通過。右側の自分の順位の大きさと配置、狭い画面、ランキング各列、共通プロフィールへの移動・終了を確認。`production/` は検証用APIデータによる結果。順位やMMR、戦績のデータは変更していない。
