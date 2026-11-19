# 攻撃対象 — フレームの発光ハイライト

2026-11-18。ローカルプレビュー。ユーザーの見た目の承認待ち。本番への反映は行っていない。

## プレビュー

http://127.0.0.1:5286/attack-target-preview.html

起動元: `/Users/hiromaru05s/.codex/worktrees/attack-target-frame-1118/LORE_TCG/client`

```sh
node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5286 --strictPort
```

変更後／変更前、自動で見る、盤面を戻す。自動表示中でも手前のカードをドラッグすると実操作へ切り替わる。変更前は以前の囲みを比較用CSSで再現。

## 参照元の確認

- 着手時に `gh/main` を fetch。基準コミット `e5a8c53fd`（Apply approved azure silver duel nameplate）。このコミットから専用ブランチ `codex/attack-target-frame-1118` を作成。
- 元の作業フォルダは `8d7cdbe02` と多数の未コミット変更を持っていたため、上書きせず保持。
- 採用済み表示: `client/src/ui/boardView.ts`、`client/src/ui/cardView.ts`、`client/src/styles/card.css`、`client/src/styles/game.css`、`client/src/ui/monster/runtime.ts`。
- 実盤面で読み込まれたフレームは `/art/biblion/modular/base-mon-print.webp`。縦型カードを使う現在の盤面で確認し、古い正方形フレームの試作は使用していない。
- 盤面・キャラクター・名札・カード・共通UIは、この基準の実コンポーネントとアセットを使用。`main.ts` の全スタイルシートをプレビューにも読み込む。

## 変更

`client/src/styles/game-overlays.css` の `.card.is-atk-target` から外側の outline / box-shadow を除去。カード自身の `.card-frame` が持つ画像を重ねて、元の曲線・彫り・透明な輪郭に沿う赤橙色の色面と移動する反射を表示する。絵柄の周辺にも弱い反射を加える。数値のシール、絵の中央、カードの輪郭は元の表示を維持。

150msで点灯し、1.6秒の弱い明滅と1.9秒の反射を続ける。対象変更・キャンセルでは同じクラスの解除に連動。低減モーションでは静止ハイライト。キャラクターへの直接攻撃の既存表示は維持。

`client/src/ui/monster/runtime.ts` では、攻撃対象へのカード全体のフィルタを外し、印刷フレームの光を使う。

品質基準の「銀紋の流墨」は動画の連続フレームと代表画を確認。今回はUIの選択状態として、カード面・実フレームの彫り・輪郭と光の一体感、狭い明部と色面の役割分担を適用。

## 確認結果

機能:
- client TypeScript型チェック、`git diff --check` 成功。
- 既存 `tests/attack-drag-browser.mjs` 成功。マウス／タッチ、対象攻撃、直接攻撃、無効対象、キャンセルと再試行、並べ替え。
- 実ドラッグで3つの対象を順に切り替え、常に1枚だけがハイライトされ、解除後に矢印・対象状態が残らないことを確認。
- PC 1440×960／スマホ390×844、低減モーション、黒曜・金の装備フレームと消耗済み状態を確認。ブラウザエラー0。詳細は `qa/checks.json`。

見た目:
- 白い採用済み盤面で、外側の四角い枠が消え、カード本体の枠が明瞭な赤橙色に変わることを確認。
- 通常再生の録画と時間を追ったフレーム、実寸PC／スマホ画像で確認。色面は点滅で消失せず、反射中も絵柄・数値を判別できる。動画は `qa/drag-review.webm`。
- 上記はローカルの実コンポーネントを使った確認。認証済みオンライン対戦は未実施。見た目の最終承認はユーザー確認待ち。
