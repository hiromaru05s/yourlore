# HP決着：マナの破裂

2026-10-26、ユーザーが立体版プレビューを選択し「これを本番に適用して」と指示。

## 採用した挙動

致死ダメージで敗者のHPが0になった接触フレームから、現在のキャラクター・枠・HP・残存リソース表示にヒビが入り、マナが漏れる。破断の開始を遅くし、奥行き方向の移動・XYZ回転を伴う厚みのある破片が加速して破裂する。約3550msの余韻まで終えてから既存の勝利／敗北・MMR・報酬UIを開く。両プレイヤーが同じ敗者を見る。

投了・切断・時間制限・引き分け・終了済み状態への復帰ではHPダメージを捏造しない。実際に致死ダメージを含む新規の確定バッチだけを対象とする。低減モーション、非表示、画面離脱、サイズ変更、スキップ、描画失敗では演出を終了し、結果表示を止めない。

## 参照元と実装

- 土台：`db61a55c9bca2ee9060891723b4ab7b237888ae9` の採用済み盤面。リリース時には最新 `gh/main` と統合する。
- 現在の表示元：`client/src/ui/boardView.ts`、`client/src/styles/presentation.css`、`client/src/styles/reading-board.css`。`outcomeSurface.ts` が表示中のシーカーCanvas／BOT画像・マスク・枠・数値・アイコンを取得する。旧キャラクターや代用品へ置換しない。
- `client/src/ui/manaRupture/renderer.ts`、`fragments.ts`、`shaders.ts`：選択された3D版。Voronoi分割した表裏・切断面、透視投影、環境反射、深度を参照するボリューム光、HDRの多段Bloom。キャンバス上の平面図形版は不採用。
- `client/src/ui/manaRupture/plan.ts`、`runtime.ts`：確定した致死バッチの選別、事前準備、接触後HP0の再取得、一度だけの開始、結果待機、GPU／音声／イベントの解放。準備は2500ms、開始後は6500msで待機を打ち切る。
- `client/src/game/controller.ts`：攻撃・魔法・反射など既存のHP表示更新と同じ経路から開始。最終盤面描画と演出完了の両方を待つ。
- `client/src/ui/anim.ts`：既存スキップからの取消。
- 開発プレビュー起動元：`/Users/hiromaru05s/.codex/worktrees/outcome-flow-preview/LORE_TCG`、Vite `http://127.0.0.1:5196/rank-lab.html?combat=win&fx=mana`（`defeat` も）。このfixtureは本番Controllerを直接使用し、独立した二重演出を起動しない。fixtureのみの描画準備短縮は本番には入らない。

## 検証

- `tests/mana-rupture.mjs`：実エンジンの両陣営の致死攻撃、魔法／反射、対象外の決着、重複開始防止、HP0取得、完了までの待機、低減モーション、非表示・離脱・サイズ変更・スキップ・Context喪失、準備タイムアウト、音声／GPU解放。
- 型チェック・本番ビルド、既存 `outcome-finale` と `combat-tempo` テストが成功。
- ブラウザの本番Controller fixture：双方でHP3→0、3D renderer、演出中に結果UIがないこと、完了後VICTORY／DEFEATとMMRを確認。実測3636ms／3627ms（画面更新間隔を含む）。例外ログなし。完了時に元の枠が復活しない。
- 見た目：採用された3D版の表面・発光・緩急を保持。採用前プレビューで通常速度／途中フレームと390px幅の自分側を確認済み。本番接続では両陣営の通常速度を確認。
- 認証済みの二端末オンライン対戦および実機スマートフォンの性能検証は別範囲で、このfixtureをその証拠としない。

本番公開は共通ロックと最新main照合、クリーンなコミットスナップショットの依存インストール・型チェック・production suite・ビルドを行う `npm run deploy` から実施する。

## 本番公開確認

- 公開ソース：`394e7b6e75058a5b3e5b1e3e4c8a57bc1e14bfe2`。実装・終了処理は `d5d900e5` と同一であることを再照合した。最新mainの共同リリースに含まれたため、重複した公開は行わない。
- 2026-10-26 09:59:05 UTC、Worker version `e6b70717-470b-4a9f-8231-d1a5223b32ea` を100%配信。[公開記録](production.json)。
- 保護付きのクリーンスナップショットで型チェック・全226件・ビルドを通過。公開配信のJS／CSS／マニフェスト／枠・マスク・HP等135ファイルのSHA-256が一致。[照合結果](public-assets.json)。HTMLはCloudflareの解析beaconが挿入されるため本文ハッシュとは分け、エントリーJSが同じビルドを指すことをHTTPと本番ブラウザで確認した。
- 本番ログイン画面の読込とコンソールエラーなしを確認。認証済みPvPを実施したという意味ではない。
- [通常速度の本番Controller fixture・破裂サンプル](qa/lethal-burst.png)。プレビュー起動元は上記の作業ツリーと5196番ポート。
