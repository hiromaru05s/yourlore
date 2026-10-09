# 雫の可視性 + 控えめなトゥーン / 6案

2026-10-08。前回の透明な液体5案をユーザーが評価したうえで、「原神ライクなトゥーン感をほんの少し」「透明すぎるため見えやすく」「ユニークな6案」という依頼に対応した比較試作。

[比較ページ](http://127.0.0.1:55170/dew-toon-six.html?id=T1)。前回の `dew-liquid-five.html` にも入口を追加。隔離worktree `codex/dew-grant-six` 内で制作。

| ID | 名称 | 可視性の設計 |
|---|---|---|
| T1 | 翠水の薄衣 | 翡翠の薄い色面 + 二段の陰影。面積で形を見せる |
| T2 | 月縁の雫 | 澄んだ中心 + 暗い影側の縁 + 真珠色の光側の縁 |
| T3 | 流彩の水紋 | 曲面を流れる二本の色帯。液面の動きを読ませる |
| T4 | 露芯の灯 | 透明な外層 + 内側に揺れる濃淡の芯。中央に視線を集める |
| T5 | 風綾の曳露 | 本体につながる二筋の先細りの伴流。進行方向を見せる |
| T6 | 折膜の添露 | 前後に重なる短い水膜。局所的な薄い色面で奥行きを補う |

6案は色替えではなく、面・縁・表面の帯・内部・伴流・前後の膜という別々の設計。同じL1の水滴形状を初期設定とし、前回L1〜L5の形へ共通で切り替え可能。これは6種類の可視性デザインであり、初回・追加それぞれ6案ではない。付与フローは前回と同じ追加付与5→8。

## 保持と変更

前回の立体曲面、法線、IOR 1.333の屈折、Fresnel反射、厚みに応じた吸収、液体の変形を保ち、その後段に控えめな色面を重ねる。CSS opacityを単に変更する仕組みではない。金縁のUIアイコンは元の画像を使用する。

T5/T6は本体と接続する薄い水の面。移動の接線方向に追従し、到着時は本体とともに縮む。別々に浮く粒や外輪は使わない。T4はT1と似た全体着色にならないよう、内側の小さな濃淡へ集約した。

「選択案を透明版と比較」は選択中の拡大枠／実盤面だけを前回の透明版へ切り替える。下の6案は新デザインを維持する。前回の5形状すべてについて、4時刻ずつ計20ケースで透明版の画素が前回と完全一致した（`qa/optics.json`）。

## 比較と制約

- 質感を拡大、付与フロー、実盤面の3モード。白／暗、5形状、速度変更、シーク、低減モーション、両陣営・両側同時。
- 実盤面は現行GameViewのローカルfixture。カードと雫アイコンの実矩形を基準に移動し、2190msで5→8、終了や非表示で元の値に復元する。
- 屈折は背景を使う近似。実盤面は肖像Canvas・カードアート・アイコン・盤面色から光学背景を再構成し、DOM全体の正確なピクセル屈折ではない。オンライン対戦への組み込みではない。
- WebGLが必要。透明度やトゥーン感の最終的な美術判断はユーザー選定待ち。

## 検証

- TypeScript検査と専用2入口ビルド成功。既存GameView由来の大きなchunk警告あり。
- `qa/check.mjs` / `report.json`: 6案の加算時刻、5形状×6案、320/390/844/1440pxの横はみ出し0、390/1280px×2陣営×6案、白暗の両側同時、低減モーション、2周再生、復元・破棄。ブラウザ例外と素材エラー0。
- `qa/optics.mjs`: 前回との透明な光学描画の一致を検査。20ケース、最大画素差0。
- `qa/export.mjs`: `material-six.mp4` / `flow-six.mp4` は6案を同じ時刻で並べた30fpsの比較動画。`material-native.webm` は実時間録画。固定時刻書き出しは実機性能の証明ではない。
- `qa/board-live.mjs`: GameView上で6案を順番に最後まで再生した `board-live.webm` と状態記録。
- 白・暗の拡大画像、実盤面画像、連続フレームで形・接続・小さい表示を確認。機能検査の成功はユーザーの美術承認を意味しない。

ローカル比較のみ。ゲーム本体の採用・ステージング公開・本番公開は未実施。

## 参照と再実行

`docs/animation-quality-benchmark.md` / `docs/vfx-art-direction.md` の材質連続性と可読性を基準とし、[Three.js公式の物理材質資料](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)で透過・屈折率・厚み・吸収・反射を参照。描画は専用WebGL実装。原神のアセットを使用したものではなく、「控えめなトゥーン感」という方向の試作。

```sh
node node_modules/vite/bin/vite.js client --host 127.0.0.1 --port 55170 --strictPort
node node_modules/typescript/bin/tsc --noEmit -p client/tsconfig.json
node node_modules/vite/bin/vite.js build --config docs/vfx-prototypes/2026-10-08-dew-toon-six/vite.config.mjs
node docs/vfx-prototypes/2026-10-08-dew-toon-six/qa/check.mjs
node docs/vfx-prototypes/2026-10-08-dew-toon-six/qa/optics.mjs
node docs/vfx-prototypes/2026-10-08-dew-toon-six/qa/export.mjs
node docs/vfx-prototypes/2026-10-08-dew-toon-six/qa/board-live.mjs
```
