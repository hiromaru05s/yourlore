# 攻撃ドラッグ — 第6稿・矢印だけ整理

2026-11-19。ユーザー指定「矢印エフェクトだけちょっといい感じに変えて」に対応。

プレビュー: http://127.0.0.1:5286/attack-target-preview.html?v=6

## 今回の変更

`client/src/ui/attackAim.ts` の描画のみ変更。太い金属状の断面、ずらした暗い側面、反復する小さな矢じりを撤去。細い青の曲線と白青の芯、軽い先端へ整理。長い尾と尖った前端を持つ光が曲線に沿って先へ走り、進行方向を示す。元カード・対象カードの枠と浮上は変更していない。

最低品質基準で確認した発生源との接続、主形状・狭い明部の分離を継続。光の尾を細くほどき、起点・終端で曲線の範囲へ収める。低減モーションでは光の移動を止める。

## ソース・起動元

着手時fetchした最新main `fe168a872` をマージ。新しい採用済み敗北演出を含めた実盤面で確認。今回の矢印は第5稿 `aa3dbf01c` から改修。

参照: `client/src/ui/attackAim.ts`、`client/src/ui/aimGeometry.ts`、`client/src/ui/boardView.ts`。現在のカードと `/art/biblion/modular/base-mon-print.webp`、白い盤面を継続。プレビュー入口は `client/src/dev/attackTargetPreview.ts`。

起動元: `/Users/hiromaru05s/.codex/worktrees/attack-target-frame-1118/LORE_TCG/client`
起動: `node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5286 --strictPort`
既存の同一プロセスからHMR配信。PC・スマホの読み込まれた素材と見た目を画像で確認。

## 確認

機能: client型チェック・diffチェック成功。既存の `tests/attack-target-browser.mjs` でPC・タッチの輪郭、浮上、付け根追従、対象切替、キャンセル、装備枠・常時効果、低減モーションを確認。`qa-v6/checks.json` に結果。

見た目: PC1440×960・スマホ390×844の実盤面画像と、`qa-v6/flow-review.webm` の連続再生を確認。機能成功とは分け、見た目の採用はユーザー確認待ち。

本番未反映。過去稿は `round1.md`〜`round5.md`。
