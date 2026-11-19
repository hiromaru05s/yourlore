# 攻撃対象ハイライト — 第2稿・2案

2026-11-18。ユーザーの「色が微妙。もっとシンプルかつ、綺麗、ただ豪華な感じ。2パターン」に合わせ、赤橙の第1稿を差し替えた。2案ともローカル比較用。本番未反映・ユーザー未採用。

## プレビュー

- ① 銀白: http://127.0.0.1:5286/attack-target-preview.html?look=silver
- ② シャンパン: http://127.0.0.1:5286/attack-target-preview.html?look=gold

同じ相手カードの選択状態で切り替え可能。手前のカードからドラッグすると実操作に切り替わる。「選択表示」で再度固定表示、「盤面を戻す」でリセット。

①は銀白のフレームに2.6秒周期で細い反射が流れる。②は低彩度の淡い金のフレームに、上下の紋章から3.2秒周期で柔らかく光が満ちる。元の画像の彫り・曲線・透明な輪郭をそのまま使う。光の色を絵柄の中央や数値には重ねず、独立した飾りを追加しない。低減モーションではどちらも静止表示。

## 参照・起動元

再作業前に `gh/main` をfetchし、現在も基準コミット `e5a8c53fd` であることを確認。未コミットの第1稿を保持した専用ブランチ `codex/attack-target-frame-1118` で改修。

起動元: `/Users/hiromaru05s/.codex/worktrees/attack-target-frame-1118/LORE_TCG/client`

```sh
node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5286 --strictPort
```

採用済み実装:
- `client/src/ui/boardView.ts` / `client/src/ui/cardView.ts`
- `client/src/styles/card.css` / `client/src/styles/game.css`
- `client/src/ui/monster/runtime.ts`
- 実盤面のフレーム: `/art/biblion/modular/base-mon-print.webp`

今回の実装:
- `client/src/styles/game-overlays.css`: カード自身の印刷フレームを使うハイライト。ローカルの既定表示は①。
- `client/src/dev/attackTargetPreview.css`: ②の比較用スタイル。
- `client/src/dev/attackTargetPreview.ts`: 実盤面・実ドラッグ・2案の切り替え。

## 確認

機能: client型チェック、差分の書式チェック成功。実盤面で①②の切り替え、マウス／タッチでの対象変更とキャンセル、低減モーションを確認。タッチの検証は入力送信直後ではなく、DOMに選択対象が反映された時点で判定する。

見た目: 1440×960、390×844で元のフレームとの一致、絵柄・数値、2案の色を確認。連続録画とフレーム列で光の動きも確認。①は白銀の狭い反射、②は淡い金のゆっくりした明暗。最終的な好み・採用はユーザー判断。

検証画像・録画: `qa-v2/`。第1稿の記録と検証は `round1.md` / `qa/` に区別して保存。認証済みオンライン対戦は未検証。
