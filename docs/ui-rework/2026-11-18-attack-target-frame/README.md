# 攻撃選択 — 第8稿・ターゲット照準の強調

2026-11-19。ユーザー指定: カードだけでなく相手プレイヤーを選択した際も、薄い円を強めてターゲットしていることを明確にする。

プレビュー: http://127.0.0.1:5286/attack-target-preview.html?v=8
「プレイヤーを狙う」で相手の場を空にして直接攻撃対象を確認。「カードを狙う」で通常のカード対象へ戻る。どちらも実ドラッグ可能。

## 変更

- `client/src/ui/attackAim.ts` の先端の照準を変更。現行の青い矢印の帯・進行方向・先端は維持。
- 有効な対象に太い赤の四分割照準、明るい内縁、四方向から内側を指すマークを表示。中心は塗らず、絵柄と先端を読ませる。
- 選択時180msで照準を絞り込み、以後1.1秒周期で小さく収縮・発光。低減モーションでは静止。照準はカードまたはプレイヤー肖像の実寸に合わせ8〜38px半径へ調整。
- プレイヤーの四角い旧選択枠をなくし、肖像のアルファ輪郭に沿う赤い光へ変更。
- 攻撃できない肖像は成功照準を出さず、従来の抑えた色で区別。青い攻撃元・赤いカード枠・浮上は継続。

## 参照と起動元

着手時にfetchして確認した最新main `fe168a872`。既に作業ブランチにマージ済み。直前の矢印復帰 `25e20fd5b` を土台に先端表示のみ改修。
参照・変更: `client/src/ui/attackAim.ts`、`client/src/ui/boardView.ts`、`client/src/dev/attackTargetPreview.ts`。実カードは `/art/biblion/modular/base-mon-print.webp`、実際のBaseController・BoardView・白い盤面・現行肖像を使用。

起動元: `/Users/hiromaru05s/.codex/worktrees/attack-target-frame-1118/LORE_TCG/client`
起動: `node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5286 --strictPort`

## 確認

機能: 型チェック、diffチェック、`tests/attack-target-browser.mjs`（PC・タッチのカード／プレイヤーの照準とキャンセル、元カード浮上、対象変更、低減モーション）、`tests/attack-drag-browser.mjs`（攻撃・不正対象・直接攻撃・再操作・並べ替え）。並列の録画検証中は一度タイムアウトしたため、録画を止めて順次再検証し成功。結果は `qa-v8/checks.json` と `/tmp/lore-attack-drag-v8`。

見た目: 白い実盤面のPC・スマホでカード対象／肖像対象を比較。`qa-v8/*-selected.png`、`qa-v8/*-player.png`、`qa-v8/motion-*.png` の連続フレームに保存。機能成功と見た目の採用は分け、最終採用はユーザー確認待ち。

本番未反映。過去稿は `round1.md`〜`round7.md`。
