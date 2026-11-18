# 攻撃対象ハイライト — 第3稿・赤い外周と浮上

2026-11-18。ユーザーの追加指定: 赤に戻す、少し大袈裟に、カードフレームの周りだけを変える、選択されたカードのサイズ・浮上にも工夫する。

ローカルプレビュー: http://127.0.0.1:5286/attack-target-preview.html?v=3

「選択表示」で通常と比較。「浮上を再生」で同じカードが浮く動きを再確認。手前のカードからドラッグすると実際の対象選択になる。「盤面を戻す」で再試行できる。

## 見た目

- 元のフレームと数値シールの画像から実際の外形を抽出。外周のすぐ外側だけに赤い面と明るい芯を置き、光が輪郭に沿って動く。
- マスクによってカードの内側には光を描かない。フレームの素材・名前・数値・絵柄の色を維持。矩形の囲み、面全体の色変更は使用しない。
- 選ばれたカードは180msで6.5%拡大し、カード高の5.5%だけ上がる。下に落ちる影で高さを補う。
- 対象変更・キャンセル時は150msで元の姿勢へ戻る。攻撃確定時は選択用の姿勢を即時解除し、既存の戦闘演出へ渡す。
- 低減モーションでは拡大・浮上・外周の移動光を止め、静止した赤いハイライトを維持。

## 採用済み実装との照合

着手時に `gh/main` をfetchし、最新が `9af927a69`（Apply approved physical hand dragging and held-card outline）へ更新されていることを確認。第2稿を `d11e4c7e2` に保存し、mainを `4af5a4ae0` でマージ。最新の手札操作を含む実盤面を土台にした。

参照:
- `client/src/ui/boardView.ts`、`client/src/ui/cardView.ts`
- `client/src/styles/card.css`、`client/src/styles/game.css`
- `client/src/ui/monster/runtime.ts`、`client/src/ui/monster/actor.ts`
- 最新採用の輪郭抽出: `client/src/ui/handConditionOutline.ts`（手札の採用済み外周演出と同じラスタ形状）
- 読み込まれたフレーム: `/art/biblion/modular/base-mon-print.webp`

変更:
- `client/src/ui/attackTarget.ts` / `client/src/styles/attackTarget.css`: 外周マスクと加算方式の浮上。元のActorが持つ姿勢に重ねる。
- `client/src/ui/boardView.ts`: 実際の対象切り替えに接続。浮上前の領域を保持し、元のカード下端にポインターを置いたとき対象が点滅しないようにする。
- `client/src/dev/attackTargetPreview.ts` / `.css`: 既存の比較ページを第3稿へ更新。

起動元: `/Users/hiromaru05s/.codex/worktrees/attack-target-frame-1118/LORE_TCG/client`

```sh
node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5286 --strictPort
```

## 確認

機能と見た目は分けて記録する。

機能: client型チェック、`git diff --check`、既存の `tests/attack-drag-browser.mjs`。追加の `tests/attack-target-browser.mjs` はマウス／タッチの対象変更、浮上前の下端での選択保持、拡大・浮上の寸法、素早い対象往復、キャンセルでの復帰、既存の常時効果Actorとの共存、装備フレーム、低減モーションを検証する。結果・境界は `qa-v3/checks.json`。

見た目: 白い採用済み盤面、PC1440×960・スマホ390×844で、赤い外周が実フレームに合うこと、元のカード面が維持されること、拡大時に隣のカードを大きく隠さないことを確認。連続録画と途中フレームで浮上・対象変更・戻り方を確認。ユーザーの見た目の承認は未取得。

過去稿は `round1.md` / `qa/` と `round2.md` / `qa-v2/`。本番未反映。認証済みオンライン対戦は未検証。
