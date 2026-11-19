# 攻撃ドラッグ — 第5稿・進行方向と青い起点

2026-11-19。ドラッグ先への進行方向を読み取りやすくし、攻撃元もカードフレームにぴったり青く発光させる指定への対応。

プレビュー: http://127.0.0.1:5286/attack-target-preview.html?v=5

## 変更と見た目

- 現行mainの `attackAim.ts` にある前進する小さな矢じりを参照。第4稿の厚み・断面の陰影・反射を維持し、帯の表面に白青の矢じりを連続して流す。曲線の接線を使うため、ドラッグ方向が変わっても先端へ向く。起点と先端で滑らかに出入りし、帯の外へ散らさない。
- 攻撃元にも実フレームのアルファ輪郭を共有したマスクを使用。青い外周・細い白青の芯・周回する短い反射で縁だけを照らす。カード面・文字・数値の色は変更しない。
- 元カードと対象カードの浮上、対象の赤い輪郭は第4稿を継続。中断・確定・並べ替えで両方の輪郭を解除。低減モーションでは移動を止め、方向の形と色を残す。
- 最低基準「銀紋の流墨」の動画を主作業フォルダの凍結参照から連続フレームで再確認。今回は実物の縁から光が立ち上がる連続性、主形状と狭い明部の分離を翻案。

## ソースと起動元

着手時 `gh/main` をfetchし、最新 `a67ceafdf` をマージ。前稿 `23ddfd107` の作業を維持。今回のmain差分は採用済み手札演出の検証記録と待機修正で、盤面・キャラクター素材の変更はない。

参照・変更: `client/src/ui/attackAim.ts`、`client/src/ui/attackTarget.ts`、`client/src/ui/boardView.ts`、`client/src/styles/attackTarget.css`、`client/src/dev/attackTargetPreview.ts`。
実素材: `/art/biblion/modular/base-mon-print.webp`。実際のBaseController・BoardView・現在のカード・白い盤面を使用。

起動元: `/Users/hiromaru05s/.codex/worktrees/attack-target-frame-1118/LORE_TCG/client`

```sh
node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5286 --strictPort
```

起動プロセスのcwdと引数を確認。プレビューのPC・スマホ画像で使用素材と表示を再確認。

## 検証

機能: 型チェックとdiffチェック成功。`tests/attack-target-browser.mjs` はPC・タッチで青い実輪郭、浮上、起点追従、元のヒット範囲、対象切替、キャンセル、装備枠と常時効果、低減モーションを確認。`tests/attack-drag-browser.mjs` は攻撃・キャンセル後の再操作・直接攻撃・不正対象・並べ替えが成功。

見た目: PC1440×960、スマホ390×844の白い実盤面を画像と連続録画で確認。青い攻撃元から赤い対象へ矢じりが進む。結果 `qa-v5/checks.json`、画像 `qa-v5/*-selected.png`、連続再生 `qa-v5/flow-review.webm`。機能成功とは分け、見た目の最終採用はユーザー確認待ち。

本番未反映。認証済みオンライン対戦は未検証。過去稿は `round1.md`〜`round4.md`。
