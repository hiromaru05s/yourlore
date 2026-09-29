# アニメーション描画の最適化 — 2026-09-29

追加指示「ステージングにあげて」「衝突起こりそうであればマージして」により、ローディング刷新と競合なく統合して https://test.yourlore.xyz/ へ公開済み。開始時からあった未コミット作業と、並行タスクのUI変更は保持した。本番へのデプロイは行っていない。

## 測定結果

同じPCのChrome headless、通常モーション、DPR 1、CPU制限なし。`duel-lab.html?polish` の読み込み後、待機状態を各5秒間計測。390pxはスマホ**幅**の確認で、実機のモバイルGPU計測ではない。

| 指標 | 1280×900 変更前 | 1280×900 変更後 | 390×844 変更前 | 390×844 変更後 |
| --- | ---: | ---: | ---: | ---: |
| 盤面GPU描画命令 | 61,961 | 7,860 | 61,318 | 8,448 |
| メインスレッド処理時間 | 2.770秒 | 0.319秒 | 2.346秒 | 0.285秒 |
| JavaScript実行時間 | 1.950秒 | 0.113秒 | 1.648秒 | 0.112秒 |
| フレーム間隔 p95 | 33.3ms | 16.7ms | 33.4ms | 16.7ms |

GPU描画命令は約86〜87%減。メインスレッド処理時間は約88%減。フレーム計測にはOSの同時負荷なども影響するため、全端末・全場面のFPS保証ではない。変更前後の5秒区間の比較には `before.json` と `after-final.json` を使用。`scenePerf` は別の5秒窓で集計する参考値で、上記測定区間とは一致しない。

3枚同時除外では、全画面Canvasへの三角形転写が **59,680回 → 0回**。別のGPU資源テストでは、3枚×8反復の描画をカード面のアップロード**3回**だけで実行し、各カードの色が混ざらないことも確認した。ローカルの表面Canvas描画とGPUシェーダー自体は引き続き必要。

## 実装・検証の対応

| 対象 | 変更内容 | 確認 |
| --- | --- | --- |
| 盤面 | 静止した家具・ガラス・影のキャッシュと、ボタン／リフト／飛行／着地演出を分離。準備完了後の定期的な全再描画を停止 | 待機計測、実盤面のドロー・再構成・マナ・除外 |
| ターンボタン | 深度計算のカメラをボタン領域へ絞り、画面外モデルの描画命令を削減。タイマー更新は表示レイヤーだけを更新 | 3種×有効／無効×全画面／部分領域の12条件で色比較 |
| 物理ボタンの入力 | 関係ないカードやUIのクリックで、全盤面を1秒間再描画しない | 通常速度の実盤面操作 |
| 銀紋の流墨 | 毎フレーム160個の三角形へ画像を転写していた処理を、同じ行列による単一面のCSS投影へ変更 | 両陣営、場／手札、3枚同時、クイック魔法、390px |
| カード面のGPU転送 | 同時除外の不変テクスチャを最大8枚まで保持し、終了時に解放 | 3色の描画一致、転送回数、上限超過時の廃棄、再利用 |
| 画面破棄 | 盤面と飛行用WebGLコンテキストを明示的に解放 | 切断後の `isContextLost()` 確認 |
| 中断・代替経路 | 新しい投影面も元の演出と一緒に片付ける | スキップ、リサイズ、対象削除、非表示タブ、低減モーション、WebGL非対応 |

## 機能確認

すべて通過。

- `npm run typecheck` — client/server
- `npm run build` — design guard含む。既存の大きなチャンク警告は残る。
- `tests/solid-draw.mjs`、`tests/motion-v2.mjs`、`tests/quick-playback.mjs`
- `tests/rift-silver-browser.mjs` — 全経路・非公開カード情報・中断後の資源解放
- `tests/rift-ink-resources-browser.mjs` — 同時テクスチャ保持と破棄
- `tests/turn-light-parity-browser.mjs` — 12条件、RGBA最大誤差1/255以下
- `tests/mana-adoption-browser.mjs` — 通常実装のマナ演出、数値同期、キャンセル
- `tests/rendering-playback-browser.mjs` — PC／スマホ幅の通常速度連続再生、同時マナ、WebGL解放
- `tests/rendering-performance-browser.mjs` — 各5秒、GPU描画命令15,000未満の回帰判定
- `git diff --check`

開発サーバーのHMRで同じモジュールが異なるURLとして読み込まれると、資源カウンターのテストだけが誤ったモジュールを参照する。サーバーを新しく起動し、HMRを無効にした状態で最終回帰テストを通した。同時発動の途中状態テストは時計を固定し、通常速度の完走確認は別の連続再生テストで行った。

## 見た目の確認

機能テストとは分けて確認。承認済みの銀紋の流墨の映像から連続フレームを確認し、変更前後の800ms／1500ms／2160msの実盤面画像を両陣営で保存・比較した。表面の銀紋、輪郭、渦化、移動先、接地影は維持されている。シェーダー、演出時間、解像度設定、粒子数は変更していない。投影方法を変えたため、三角形境界の補間はピクセル単位で完全一致する方式ではない。

通常速度の録画は `playback/continuous.webm`、一覧は `playback/contact-sheet.jpg`。390pxの途中画像は `silver-regression/mobile-me.png` と `mobile-opp.png`。ボタンの色は `color-parity.json` に数値比較を保存した。実機iOS/Safariや認証付きオンライン対戦の検証は今回の範囲に含まない。

## 再実行

起動したViteのURLを指定する。ブラウザ計測時は別のビルド／ブラウザテストと同時実行しない。

```sh
LORE_TEST_ORIGIN=http://127.0.0.1:5279 node tests/rendering-performance-browser.mjs current
LORE_TEST_ORIGIN=http://127.0.0.1:5279 node tests/rendering-playback-browser.mjs
LORE_TEST_ORIGIN=http://127.0.0.1:5279 LORE_TEST_OUTPUT=docs/performance/2026-09-29/silver-regression node tests/rift-silver-browser.mjs
LORE_TEST_ORIGIN=http://127.0.0.1:5279 node tests/rift-ink-resources-browser.mjs
LORE_TEST_ORIGIN=http://127.0.0.1:5279 LORE_TEST_REPORT=docs/performance/2026-09-29/color-parity.json node tests/turn-light-parity-browser.mjs
```

実装5ファイルのハッシュを `manifest.json`、差分を `implementation.patch` に保存。

## ステージング公開と検証

- 最適化コミット: `47f472f17f51c2aae1f2997fe953cad03965beb8`
- ローディング刷新との統合コミット: `e5a6ffdcd2c582bfcf97cae717158cf8a6db63d9`。競合なし。main／GitHubにも統合。
- Worker: `lore-server-staging`
- 公開バージョン: `c15bb0da-c1be-43e5-8d35-aeb97a0f9591`
- 配信: `main-D663MnFl.js` / `main-DGZlqDv1.css`
- 配信JS/CSSおよびindexの14ファイルについて、統合版のビルド出力とSHA-256一致。
- 公開BOT盤面の5秒待機計測: PC 7,903回／390px 8,446回の盤面GPU描画命令、両方フレーム間隔p95 16.7ms。
- 公開された `swallowRiftCard` から新しい `rift-silver-source` の生成、通常速度での完走、Canvasの削除を確認。JavaScript例外0件。

デプロイはローディング刷新タスクと調整し、統合版を1回だけ公開した。型チェック・ビルドは分離した公開用worktreeでも実施。最適化5ファイルはローカル検証時のSHA-256と一致する。認証・API応答はテスト用fixtureで、実際の配信アセット／BOT盤面を検証した。流墨は公開手札の複製から公開関数を呼ぶプローブであり、自然なゲーム操作による除外や認証付きオンライン対戦の検証ではない。

テスト調整: 公開版の盤面rootはラボの `#app` と異なるため、待機条件を `data-reading-turn` へ修正した。短時間の流墨Canvasの検査は、別通信での要素待ちから同じブラウザ内のMutationObserverへ変更して完走を確認した。これらのテスト修正に伴う実装変更・再デプロイはない。

詳細は `staging/deployment.json`、`staging/verification.json`、`staging/browser.log`。再検証は次のコマンドで実行する。

```sh
LORE_STAGING_BUILD=/Users/hiromaru05s/.codex/worktrees/loading-silver-staging/LORE_TCG/client/dist node tests/rendering-staging-browser.mjs
```
