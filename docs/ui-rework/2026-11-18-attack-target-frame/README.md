# 攻撃選択 — 矢印を現行版へ復帰

2026-11-19。ユーザー指定「現行の矢印に戻して」に対応。

プレビュー: http://127.0.0.1:5286/attack-target-preview.html?v=7

`client/src/ui/attackAim.ts` を、fetchで確認した現行main `fe168a872` のファイルと完全一致させた。第4〜6稿の独自の矢印描画を取り除き、現行の帯・流れる小さな矢じり・先端・起点と対象の環を復帰。

青い攻撃元、赤い対象の実輪郭ハイライトと、両カードの浮上は維持。接続元は `client/src/ui/boardView.ts`、`client/src/ui/attackTarget.ts`。プレビューは `client/src/dev/attackTargetPreview.ts`。カード素材 `/art/biblion/modular/base-mon-print.webp` と現在の白い実盤面を継続。

起動元: `/Users/hiromaru05s/.codex/worktrees/attack-target-frame-1118/LORE_TCG/client`
起動コマンド: `node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5286 --strictPort`

検証: client型チェック、diffチェック、mainとの矢印ファイル一致、PC・タッチの選択／浮上／キャンセル／常時効果／低減モーション。結果は `qa-v7/checks.json`、実盤面の表示は `qa-v7/*-selected.png`。今回は現行描画への復帰で、新たな見た目の品質認定は行わない。

本番未反映。過去稿は `round1.md`〜`round6.md`。
