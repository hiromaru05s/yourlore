# 第7稿 — 奥行きで縮む光球と進行方向に沿う尾

2026-11-19。ユーザー指定の「地面へ近づくほど小さく」「空気抵抗のように進行方向が見える」をシャドバ召喚に適用。

- 飛行開始から着弾まで、光球の投影半径を連続的に縮小。着弾直前は出発時の約24%。実盤面1440px幅では自分側42.76px→10.18px、相手側40.59px→9.66px。
- 円弧の接線方向で先端を圧縮し、後方へ少し引き伸ばす。先端に薄い圧力膜を重ねる。
- 実際に通過した座標をつなぐ尾。淡い青白の面、白い芯、流れる細い筋と側面の短い筋を重ねる。尾の幅と長さも光球の縮小へ追従し、終盤に長いレーザー状にならないよう制限。
- 着弾後の尾は着弾点へ吸い込まれるよう短くなり、120ms以内に消える。中央開示、粒子化、ヒビ、収束円、再着地は第6稿を維持。

[実盤面プレビュー](http://127.0.0.1:5298/cinematic-vfx.html)。通常速度・低速・シーク、自分側／相手側、現行との比較が可能。

最低基準「銀紋の流墨」の主形状から細い尾へ連続してつながる部分を参照。今回も、光球から独立した粒の飾りではなく、光球の速度・向き・大きさから尾を描く。実盤面の連続再生と途中フレームで縮小・尾・着弾を確認。機能検証の成功を原作の再現品質の合格判定とはしない。

`npm --workspace client run typecheck` と `check-r7.mjs` 成功。両陣営で縮小が単調、3.2秒の通常再生が約3.23–3.26秒で完了、終了時の揺れ復元、390px幅、切替・破棄を確認。ページ例外と記録されたアセット失敗は0。`qa/r7/report.json`、両陣営のコマ画像、`qa/r7/continuous.webm` を保存。

## 参照実装と起動元

着手時に `gh/main` を取得し、`a67ceafdf4936e5054ccedf413072ece7525ffb2` をマージ。前稿の参照 `d815a6ac9` から採用済みの `client/src/ui` / `client/src/styles` / `client/public` に変更がないことも差分で確認。

- 現行比較：`client/src/dev/cinematic-vfx/current.ts` → `client/src/ui/anim.ts`。
- 採用盤面・カード：`client/src/ui/boardView.ts`、`boardProjection.ts`、`cardPrintCapture.ts` と実際に読み込む既存素材。
- 改修：`client/src/dev/cinematic-vfx/shadowverse.ts`、`arrivalShader.ts`、`material.ts`、`scene.ts`。
- サーバーの実cwd：`/Users/hiromaru05s/.codex/worktrees/cinematic-vfx-1118/LORE_TCG/client`、ポート5298。
- 作業ブランチ：`codex/cinematic-vfx-1118`。本番未反映。
