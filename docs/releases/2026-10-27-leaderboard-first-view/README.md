# ランキングをMacBookのファーストビューに収める

参照実装: `d46abeda` の `client/src/screens/leaderboard.ts` / `client/src/styles/leaderboardStanding.css`。前回の高さ1000pxの検証に加え、ユーザーのChromeで実測した1470×745を基準に修正。

自分の順位の見出しと順位を横並びにし、順位72px→40px、MMR42px→36px。承認済みのランク紋章184×184pxを維持。上下の余白、ランキング見出し、パネル余白を縮める。プロフィールのランク表示は変更しない。

プレビュー起動元: `/Users/hiromaru05s/.codex/worktrees/leaderboard-column-alignment/LORE_TCG`、`http://127.0.0.1:5568`。

`../2026-10-26-ranked-profiles/browser-check.mjs` のランキングデータを3人にし、1470×745・1280×720・1070×700で、パネルと勝敗が下ナビより上に収まること、コンテンツの縦スクロールが発生しないこと、紋章184pxの維持を確認。320〜1440pxの既存検証（列揃え、プロフィール導線、閉じる操作、空データ）も通過。ブラウザーAPIは検証用データ。

## 本番確認

`1a6f23f37f927a2797a2a2534a029b5f146fe2b8` を本番へ公開（UI修正コミット `ab67f627`）。Worker `be2e5560-509b-40d0-bd1d-6ba529227182`、100%。最新main照合、共有公開ロック、型チェック、237/237テスト、design guard、本番ビルドを通過。

本番アセットの検証用APIによる全ブラウザーチェックも通過（`production/`）。さらにユーザーのChromeの実ログイン状態でランキングを開き、1470×745、紋章幅184px、パネル下端582.375px、コンテンツ下端641px、下ナビ上端657px、scrollHeight/clientHeightともに561pxを確認。現在の3人の一覧と自分の勝敗がスクロールなしで見える。長いランキングや展開したルール説明は通常どおりスクロール可能。
