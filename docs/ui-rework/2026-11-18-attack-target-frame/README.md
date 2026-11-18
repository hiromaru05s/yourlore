# 攻撃ドラッグ — 第4稿・攻撃元の浮上と光の立体感

2026-11-18。ユーザーの追加指定: ドラッグ中に攻撃元も浮上させる。ドラッグ演出の品質を上げ、よりリアルにする。

プレビュー: http://127.0.0.1:5286/attack-target-preview.html?v=4

「選択表示」で通常と比較。「浮上を再生」で攻撃元・対象の浮上を再確認。手前のカードから相手へドラッグして実操作できる。「盤面を戻す」で再試行。

## 変更

- 攻撃元は190msで4.5%拡大し、カード高の9%浮上。影で盤面との距離を補う。カードの絵柄・文字・数値は色替えしない。
- 対象側は前稿の赤い実輪郭と6.5%拡大・5.5%浮上を継続。
- 青い矢印は暗い側面、細い明部、明暗の連続した断面、面取りした先端を持つ光の帯へ更新。帯の内部を反射が前進する。細い影を同じ形に沿わせ、卓上から持ち上がった厚みを表現する。
- 光の起点は浮いた攻撃元の上端。カードの動き・サイズに毎フレーム追従する。矢印の幅はカードの実寸に合わせ、スマホでは細くなる。
- 照準中はその攻撃元の待機用山形を止め、操作中の矢印へ表示を集中。解除時は元の待機表示へ戻る。
- 低減モーションでは両カードの浮上と光の移動を止める。対象の赤い外周と矢印自体は残す。

## 採用済み実装との照合

着手時に `gh/main` をfetch。最新main `d815a6ac9`（Update hand and Rift playback regressions for the corrected lifecycle）を作業ブランチにマージし、手札の物理操作・青いドロップ受付表示・修正済みの対戦処理を含めた実盤面を使用。

参照:
- `client/src/ui/boardView.ts`、`client/src/ui/cardView.ts`
- `client/src/ui/monster/runtime.ts`、`client/src/ui/monster/actor.ts`
- `client/src/styles/card.css`、`client/src/styles/game.css`
- 実カードフレーム: `/art/biblion/modular/base-mon-print.webp`

変更:
- `client/src/ui/attackLift.ts`: 攻撃元と対象の共通の加算方式の浮上・復帰。
- `client/src/ui/attackAim.ts`: 立体的な帯・反射・先端・光の接続。
- `client/src/ui/boardView.ts`: 実ドラッグの開始／中断／確定へ接続。
- `client/src/ui/monster/runtime.ts`: 照準中の待機用表示を抑え、安定した浮上姿勢へ。
- `client/src/ui/attackTarget.ts`、`client/src/styles/attackTarget.css`: 共通浮上へ整理し、攻撃元の影を追加。
- `client/src/dev/attackTargetPreview.ts`: 実盤面プレビュー。

起動元: `/Users/hiromaru05s/.codex/worktrees/attack-target-frame-1118/LORE_TCG/client`

```sh
node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5286 --strictPort
```

## 確認

機能: client型チェック、`git diff --check`、`tests/attack-drag-browser.mjs`。`tests/attack-target-browser.mjs` に攻撃元の拡大率・浮上・矢印起点の追従・両側の解除・低減モーションを追加。マウス／タッチ、対象の下端での保持、素早い対象変更、常時効果Actor、装備フレームも確認する。結果は `qa-v4/checks.json`。

見た目: 白い採用済み盤面、PC1440×960・スマホ390×844。光の断面・暗い側面・先端の明部、両カードの浮上、光の付け根を画像と連続録画で確認。最終的な見た目の承認はユーザー判断。

過去稿は `round1.md` / `round2.md` / `round3.md` とそれぞれのQAフォルダ。本番未反映。認証済みオンライン対戦は未検証。
