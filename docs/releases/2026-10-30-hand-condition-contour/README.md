# 手札の条件成立フレームの輪郭ずれ

右端の手札で金色の線がカードから大きくはみ出す不具合を修正。
この線は、カード固有の召喚・発動条件を満たしたことを表す既存の golden-twin 表示。

## 原因と修正

`client/src/styles/card.css` は画質のため `.card-frame` を幅・高さ200%で描画し、`scale:.5; transform-origin:0 0` で戻している。
`client/src/ui/handConditionOutline.ts` が縮小前のサイズで画像の輪郭を抽出していた。
カードローカルの座標計算へ各レイヤーの CSS scale と transform-origin を反映。
扇状配置・ホバーの変形は親カードから SVG へ一度だけ継承し、数値シールのはみ出しを維持する。
カード画像・高解像度描画・既存の金色の二本の光・条件判定は変更しない。

## 参照元・実行元

- 着手時の最新 `gh/main`: `89e4e752fc671415baea52466d5759cf39d32bad`。
- ローカルの古い作業ブランチ `8d7cdbe0` と未コミット作業を保持し、最新 main から専用 worktree を作成。
- 修正コミット: `8cdb5250`。最初の統合ビルド: `461783cb`（`ec8ea238` を含む）。
- 実装: `client/src/ui/handConditionOutline.ts`、接続元 `client/src/ui/handCondition.ts` / `boardView.ts`。
- 既存カードの素材: `cardView.ts` と `card.css` が選ぶ採用済み raster frame / modular seals。実際の frame URL は browser report に記録。
- 起動元: `/Users/hiromaru05s/.codex/worktrees/hand-playable-frame-fix/LORE_TCG`。
- 開発 URL: `http://127.0.0.1:5298`。ビルド済み URL: `http://127.0.0.1:5299`。

## 検証

- 修正前: 幅200のカードに対して条件輪郭の右端224・下端337。実盤面でユーザー画像と同種のはみ出しを再現し、回帰テストが失敗。
- `tests/hand-condition-contour-browser.mjs`: 本番 router / controller / 全CSS / 採用素材を使用。魔族の斥候・魔族の戦士・買い占めを左・中央・右端へ配置。手札収納・展開・ホバー・PC / 390px / 横向き・マナ不足・条件解除 / 復帰・カード削除・低減モーションを確認。
- ビルド済みクライアントで15状態を通過。Mirror Silver / Flowing Gold / Obsidian Ember / Nacre Prism / Verdigris Runes の5種類も採用済み素材のまま検証。`qa/built/report.json` と代表画像・連続録画に保存。
- 最終統合ソース `e6d2e5b3d9a4cbe3e389b9bd38b5a28a2048b822` で再ビルドし、同じ15状態を通過（`qa/integrated-report.json`）。配信前の本番URLでも右端224の同じ失敗を確認（`qa/production-before.png`）。
- `npm run typecheck`、`tests/hand-condition-rules.mjs`（22,680ケース）、`npm run build` 成功。
- 見た目: 実盤面の修正前後画像と連続録画からの時間順サンプルで、金色の線がカードと数値シールに沿い、ホバーの移動に付いてくることを確認。既存演出の幾何修正であり、新しいVFX案の採用ではない。
- 機能検証と目視確認は上記の範囲。認証とWebSocket状態は fixture。実ユーザーのPvP・物理スマホの描画性能・ユーザーによる最終見た目承認は未検証。

## 本番反映

- 2026-10-30 12:22 KST/JST、`https://yourlore.xyz` へ統合ソース `e6d2e5b3d9a4cbe3e389b9bd38b5a28a2048b822` を配信。今回の修正 `8cdb5250` を含む。
- 共有ガード実行中の先行配信と競合したため直接配信を迂回せず待機。その後の最新統合版の `scripts/deploy-guard.mjs production` がスキーマ確認・型検査・254/254検証・ビルドを完了して配信した。
- Worker version: `4f5419bf-4fc2-4c3a-94d6-11ac2b25dc28`、100%。`qa/deployment.json` / `qa/guard-summary.log`。
- エントリー / CSS / 対戦実装を含む5ファイルのSHA-256が検証済みビルドと一致（`qa/production-assets.json`）。
- 本番配信ファイルで15状態すべて成功。ページエラー0。金色フレームとスマホ幅の画像を目視確認し、条件輪郭がカードの外周に沿うことを確認（`qa/production/`）。API/WS状態は引き続きfixtureで、実アカウントPvPの確認ではない。
- 既に開いているクライアントへ修正を取り込むには再読み込みが必要。
