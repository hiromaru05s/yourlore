# 手札ドラッグの空気抵抗を20%低減

ユーザーの指示: 現行より約20%控えめにして本番反映。

参照main: `d3ca461a7ce9e3197a9c16c2db8dadc2ef98dd72`。採用実装 `9af927a69` の `client/src/ui/handPhysics.ts` を調整。接続元は `client/src/ui/boardView.ts`、外周・見た目は既存の `heldCardOutline.ts` と `client/src/styles/handPhysics.css`。

通常経路のX/Y/Z回転目標をclamp後に0.8倍。速度に対する傾きと上限を同率で抑える。つかむ支点、並進ばね、減衰、手札サイズ復帰、プレイ・キャンセル、低減モーションは既存のまま。旧比較用soft設定も維持。

## 検証

- 既存 `hand-physics-motion.mjs` 合格。同一入力の通常Y最大角は約44.24°→35.39°。静止後の収束、保持中のサイズ復帰、低減モーション、RAF解放も合格。
- `hand-physics-browser.mjs` はPC 1280×900、タッチ390×844、低減モーション390×844で全項目合格。元DOM更新、手札戻し、再ドラッグ、キャンセル、中断、閉じた手札からの召喚、一時ノード解放を確認。ブラウザ例外0件。
- 実盤面上の連続往復ドラッグを記録。輪郭・反射がカードに追従し、絵柄・盤面の可読性を確認。比較前は同じ最新実装の回転倍率だけ1へ戻したもの。機能検証と見た目確認は別であり、ユーザーによる変更後の目視承認を意味しない。
- ローカル起動元: `/Users/hiromaru05s/.codex/worktrees/hand-drag-softer-1120/LORE_TCG`
- URL: `http://127.0.0.1:5328/hand-physics-check`（ブラウザ検証の一時fixture）。素材は同worktreeの現行アセット。
- ローカル動画・途中フレーム: `/tmp/lore-drag-1120-visual`、比較前: `/tmp/lore-drag-1120-baseline`。

公開結果は本番検証後に追記する。
