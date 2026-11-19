# 現行召喚＋青い枠の粒子転送

前稿の2案はユーザー不採用。本稿は現行の中央拡大・落下・接地を実際に呼び、間の転送区間だけを変更した試作。本番未反映。

- [実盤面プレビュー](http://127.0.0.1:5298/cinematic-vfx.html): 今回の試作／現行／順番に比較。自分側・相手側、再生・停止・連続再生。
- [実再生の録画](qa/preview.mp4): 自分側→相手側。画面録画は25fps、アニメーション自体の時間指定書き出しではない。

## 今回の指定と処理

1. 現行 `focusCard` で中央に拡大。両陣営の既存タイミングを維持する。
2. 拡大されたカードが消え、同じ位置に四角い青い発光の枠を残す。
3. 枠の各位置から光の粒が高速移動する。細い方向性のある尾を伴い、移動先の枠上の対応点へ集まる。
4. 移動先は `summonPlacement(face, width, height, 0)` が返す**現行の落下開始位置**。粒の到着に合わせて枠を再形成し、その中から元のカード面を現す。
5. 現行 `playMonster(face, 'summon')` に戻す。落下の軌道・速度・反動・接地の砂塵・音は元の処理。
6. その既存の `onImpact` で地面にヒビを描き、1000msかけて濃さを落とす。カードや隣のモンスターの上には描かない。

転送の追加区間は820ms。0–130msで実カードが青い枠へ移り、180ms以降に粒が離れる。各粒は240–305msで移動し、到着順に枠を再形成。590–790msで実カードを戻し、820msで現行の落下へ渡す。共通の `STANDARD_FX` や現行の落下時計は変更していない。

## 現行を維持する境界

- `client/src/ui/anim.ts`: `ghostSummon` → `carrySlatePrint` → `focusCard` → `playMonster`。中央表示を別の試作モーションで模倣していない。
- 元の `borrowCardPrint` で絵柄・枠・数値の実DOMを借り、同じ要素を盤面へ戻す。新しいカード画像や低解像度の代替画像を作らない。
- 現行の `refreshSummonAppearance`、着地前の照明補間、フレーム密度補正も維持。追加の薄い四角は光のみで、カードを切り抜くコンテナではない。
- 任意の転送処理を渡せる引数は `import.meta.env.DEV` で制限。採用中の通常呼び出しは引数なしで従来の転送を実行する。新しい演出コードは `client/src/dev/cinematic-vfx/frameTransfer.ts` に置いた。
- 低減モーションでは追加の粒子・ヒビを省き、現行の低減経路へ進む。中断・リサイズでは追加canvasと借用中のカード面を復元する。

## 参照元・起動元

- 使用した採用実装: `7e51b93d1dd1eaff798dfc1722cfdf9e09760996`。このブランチへの統合基点: `6c5aca42eda22f816c729309abb9dfafdca5e1c0`。
- 提示前にリモートmain `f87eca10e3b1dac1180c10671ddfe1487b1d5548` も確認。差分は勝敗演出等で、今回の `ui/anim.ts`、`ui/summon/`、盤面描画・共通盤面CSSは同一。
- 現行落下・接地: `client/src/ui/summon/runtime.ts`, `catalog.ts`, `renderer.ts`。共通盤面: `client/src/ui/boardView.ts`, `boardProjection.ts`, `client/src/styles/defaultUI.css`, `reading-board.css`。
- プレビュー: `client/src/dev/cinematic-vfx/current.ts` が実際のGameView fixtureと既存 `ghostSummon` を使う。`?mana-transfer` のときだけ追加転送を渡す。
- 起動元: `/Users/hiromaru05s/.codex/worktrees/cinematic-vfx-1118/LORE_TCG/client`、Vite PID 93994、port 5298。

## 検証

- `npm run typecheck --prefix client` 成功。
- `node tests/slate-summon.mjs` 成功。低減・事前中断・捕捉中断・未接続の既存テスト。
- `tests/cinematic-frame-transfer-browser.mjs`: 1100×680／390×680 × 両陣営。枠だけになる時点、粒子移動、枠の再形成、元のカード出現、元の着地への引継ぎを検査。借りた子要素・画像URLを最後まで維持し、引継ぎ時の矩形差は最大約0.4pxだった。
- ヒビの画像アルファ総量が約80ms→約480ms→約810msで減少することを確認。4条件とも接地通知から消失まで約1006–1013ms。途中で一度に消す処理ではない。
- 転送中の停止、リサイズ、低減モーション、従来比較側の再生も確認。終了後に追加canvas・借用用フライト・slate hostが残らない。
- `tests/cinematic-frame-transfer-studio-browser.mjs`: 現行→試作の比較順序、連続OFFでの停止、連続操作による中断、PC／スマホの画面を確認。
- [browser-report.json](qa/browser-report.json)、[studio-report.json](qa/studio-report.json)。JSエラーなし。通常再生のフレーム間隔はこのMacのChrome headlessで中央値16.7ms／p95 16.8ms。実機スマホの測定ではない。

実盤面の通常速度録画と各段階のフレームを確認した。機能検査の成功をユーザーの見た目の承認とは扱わない。ライブPvPのイベント列や同時召喚には未接続で、専用召喚エフェクト・本番の採用状態は変更していない。
