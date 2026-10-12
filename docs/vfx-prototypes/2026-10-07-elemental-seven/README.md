# LORE — 炎・雷・鋼の7演出

2026-10-07。砲撃兵と大砲兵を同一アニメーションとし、指定の8カードを7種類の演出として制作した。独立worktreeのローカル制作プレビュー。ユーザーの見た目承認、対戦イベントへの接続、main統合、デプロイは未実施。

## 再生

```sh
npm --workspace client run dev -- --host 127.0.0.1 --port 5268 --strictPort
```

[比較画面](http://127.0.0.1:5268/elemental-seven.html)で7種類を切り替える。「再生」、一時停止、シーク、0.5倍／0.25倍、ループ、拡大／実盤面、白背景、両陣営、低減モーションに対応。

動画は `qa/seven-effects.mp4`、個別動画は `qa/{cannon,lightning,berserk,arrow,meteor,ball,zone}.mp4`。30fpsの決定論的フレームから生成した動画であり、実時間のfps測定動画ではない。

| 演出 | 制作した動き | 時間 |
| --- | --- | --- |
| 砲撃兵・大砲兵 | 真鍮の砲口に発火、カードの反動、重量のある鉄弾、接触の破片、広がって薄れる砲煙 | 3.3秒 |
| 落雷 | カード表面の帯電、先行放電、枝分かれする3回の雷、短い再放電、残留電流 | 3.9秒 |
| 剣鬼 | 刃とカード面の赤い反射、溜め、カードの踏み込み、先端が薄い緋色の切断面、復帰 | 3.0秒 |
| ファイアーアロー | 表面から炎が立ち上がり、細い炎槍を3本発射。各着弾を分離 | 3.6秒 |
| ファイアーメテオ | カードから上へ熱が立ち昇る。溶岩の亀裂を持つ不規則な核、加速して落ちる8発、火炎と煙 | 5.1秒 |
| ファイアーボール | 表面の光を炎へ集め、厚い火球が加速して移動。接触で膨張し、暗い煙へ変化 | 3.4秒 |
| ファイアーゾーン | 地表を炎が伝い、敵モンスター3体と相手プレイヤーが同時に噴炎。各炎の高さと揺れを変える | 4.1秒 |

砲撃兵／大砲兵は同じ描画・時計を使用し、カード絵と表示ダメージだけを切り替える。剣鬼は1回の攻撃の演出で、表示ダメージは最終DBの攻撃力を参照する。味方への攻撃も確認できる。ボール／砲撃のプレイヤー着弾、ゾーンの強化9ダメージも確認可能。

## 落雷の訂正と使用範囲

先行する会話では落雷を現行カードとして列挙したが、最終DBではv43で全トラップが削除されている。`cards.ts` の旧パッチと `engine.ts` の残存処理だけでは現行使用可否を判定できない。今回はユーザーの明示指定に従って旧仕様の落雷を制作。プレビュー内にだけ旧カード定義を置き、ゲームのDBへ復帰させていない。画面にも旧仕様と表示する。

## 品質設計と参照

- `docs/animation-quality-benchmark.md` と `docs/vfx-art-direction.md` を制作前に確認。銀紋の流墨の800ms／1500ms／2160msと動画全体の連続抽出フレーム、既存Toon炎の連続フレームを確認した。
- 翻案した要素は、元の絵柄から抽出した明暗エッジの発光、発生元に固定した動作、主形状・暗部・細い明部の階層、接触後に形が広がり煙へ変わる余韻。紫や環は全効果に共通化していない。
- [Epic / Fire Examples](https://dev.epicgames.com/documentation/unreal-engine/fire-examples?application_version=4.27) と [Unity / Realistic smoke lighting](https://unity.com/blog/engine-platform/realistic-smoke-with-6-way-lighting-in-vfx-graph) を調査し、炎による局所照明と煙の陰影を制作方針へ取り入れた。今回のコードは独自の簡易ボリューム積分で、これらのエンジンや6方向ベイクを使用したという意味ではない。
- 「原神以上」はユーザーの品質目標。商用作品を超えたという客観評価やユーザー承認は、機能テストの成功からは導かない。

## 構成

- `client/src/dev/elemental-seven/catalog.ts`: 7項目、時間、固定の着弾列。描画中に対象を抽選しない。
- `material.ts`: 共有WebGLアトラス。22段のボリューム積分、移流ノイズ、燃焼温度の色、吸収を含む煙。WebGL非対応／コンテキスト喪失時は明示的な2D代替。
- `surface.ts`: 実カード絵のエッジを抽出。カード面内に発光・走査光・焦げを描き、DOMの動きへ追従。
- `effects.ts`: 発射・飛行・着弾・煙・放電・斬撃。単一の渡された時計を使用。
- `stage.ts`: 実カードDOMと実GameViewを使う固定局面、再生制御、片付け。
- `main.ts` / `style.css`: 比較画面。既存の対戦／メニュー画面は変更しない。

実盤面モードも固定局面の提示であり、実対戦イベントを処理するものではない。対象カードには反復確認用の体力+40を与え、プレイヤー体力は80。自傷、手札除外、最大マナ減少、反撃、破壊や2回目の攻撃はシミュレートしない。効果対象・着弾回数・接触時の表示変化を見比べる制作環境。

## 検証

```sh
npm --workspace client run typecheck
node_modules/.bin/vite build --config docs/vfx-prototypes/2026-10-07-elemental-seven/vite.config.ts
LORE_PLAYWRIGHT_PATH=/absolute/path/to/playwright/index.mjs node docs/vfx-prototypes/2026-10-07-elemental-seven/check.mjs
LORE_PLAYWRIGHT_PATH=/absolute/path/to/playwright/index.mjs node docs/vfx-prototypes/2026-10-07-elemental-seven/lifecycle.mjs
LORE_PLAYWRIGHT_PATH=/absolute/path/to/playwright/index.mjs node docs/vfx-prototypes/2026-10-07-elemental-seven/record.mjs
```

`qa/report.json`: 7演出の途中・完了フレーム、3／8／3発、ゾーン同時着弾、プレイヤー／味方対象、砲撃兵2種類、強化ゾーン、白背景、実GameViewの準備完了と両陣営、320／390pxの横溢れなし、停止／リセット／単発完了、OS低減モーション。

`qa/lifecycle.json`: 非表示で停止、WebGL喪失時の代替描画、途中破棄時に演出Canvasが0枚、二重破棄の安全性。通常終了時も透明画素を検証している。

`qa/build.log`: 独立したプレビューバンドルのビルド。GameViewと共有カード定義を含むためチャンクサイズ警告あり。既存公開アセットは同じclient/publicから提供し、ビルド検証時に複製しない。

実時間のフレーム間隔は `qa/report.json` に保存。開発PCのHeadless Chromeでの観測で、スマホ実機のGPU性能を保証する値ではない。

機能確認と見た目の評価は別。雷の過大な線幅、斬撃の輪状シルエット、砲撃の発生位置を代表フレームで修正した。動画・白背景・実盤面で比較できる制作物として提出し、最終的な見た目はユーザー確認待ち。
