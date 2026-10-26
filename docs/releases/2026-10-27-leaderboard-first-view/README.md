# ランキングをMacBookのファーストビューに収める

参照実装: `d46abeda` の `client/src/screens/leaderboard.ts` / `client/src/styles/leaderboardStanding.css`。前回の高さ1000pxの検証に加え、ユーザーのChromeで実測した1470×745を基準に修正。

自分の順位の見出しと順位を横並びにし、順位72px→40px、MMR42px→36px。承認済みのランク紋章184×184pxを維持。上下の余白、ランキング見出し、パネル余白を縮める。プロフィールのランク表示は変更しない。

プレビュー起動元: `/Users/hiromaru05s/.codex/worktrees/leaderboard-column-alignment/LORE_TCG`、`http://127.0.0.1:5568`。

`../2026-10-26-ranked-profiles/browser-check.mjs` のランキングデータを3人にし、1470×745・1280×720・1070×700で、パネルと勝敗が下ナビより上に収まること、コンテンツの縦スクロールが発生しないこと、紋章184pxの維持を確認。320〜1440pxの既存検証（列揃え、プロフィール導線、閉じる操作、空データ）も通過。ブラウザーAPIは検証用データ。
