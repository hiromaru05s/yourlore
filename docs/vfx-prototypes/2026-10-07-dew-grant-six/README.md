# 雫の初回・追加付与 / 各3案

2026-10-07。独立worktree `codex/dew-grant-six` の比較試作。共有のengine/controller、既存の雫増加試作、シールド／烙印セッションのファイルは変更しない。

- 比較ページ: http://127.0.0.1:55170/dew-grant-six.html
- 初回DF1〜DF3: 0 → 3。追加DA1〜DA3: 5 → 8。付与量は比較値。
- 3案を同じ進行率で比較。2.10〜2.70秒の固有タイミング。初回／追加、白／暗、自分／相手、両側同時、実盤面、低速、シーク、低減モーション。
- 名前は制作上のラベルであり、新規の能力・世界設定ではない。

| ID | 名前 | 主動作 |
|---|---|---|
| DF1 | 朝露の凝結 | 複数の水滴を面へ凝縮し、濡れた金縁へ定着 |
| DF2 | 落滴の結器 | 落下する一滴、接触での圧縮、雫形状への立ち上がり |
| DF3 | 翠膜の抱露 | 二枚の薄い水膜が前後から閉じ、内面に水を宿す |
| DA1 | 一滴の波紋 | 既存の雫へ合流し、内部だけに屈折波を伝える |
| DA2 | 金縁の汲露 | 両側の縁を液体が上り、上端の接触から充填 |
| DA3 | 双流の融和 | 二つの幅広い液体が巻き込み、内側へ収束 |

## 参照した内容

- チャット「雫・シールド・烙印の現状確認」(`01a113f3-63f4-7642-8f74-ae6d2feb8eff`) の20案制作と、SF3 / SA1 / BF3 / BA4の選定後のユーザー指摘を確認。「線をもっと綺麗でリアルに光らせる」を反映し、均一な線より濃い液体の芯・薄い反射・幅の変化を重視。
- `shield-brand-twenty` の比較UI・GameView fixtureをベースに、雫専用の新しい6形状を制作。参照元を変更せず複製。参照時点で他チャットはランタイム接続作業中。
- `docs/animation-quality-benchmark.md` と `docs/vfx-art-direction.md` を事前に読み、承認済み「銀紋の流墨」の動画由来の連続フレーム、および盾初回の連続フレームを確認。
- 今回へ翻案: 発生カードの表面が濡れる → 同じ翡翠色の水が移動 → 雫の位置で主形状が変わる → 既存素材へ定着。暗い芯・中間面・狭い明部・接触と数値の同期。
- 参照セッションの最新指定を優先し、シールドの青白／烙印の紅〜琥珀とは異なる翡翠と真珠色を採用。現行 `dew-ui.webp` の金縁を保持。

## 実装

`client/src/dev/dew-grant-six/`、`client/dew-grant-six.html`、`client/dew-grant-board.html` の専用入口だけに追加。

Canvas2Dの厚みを持つ水滴と、幅・法線に応じて反射する液体の面を使用。256pxの共有WebGL表面パスが既存雫のUVに屈折・細部反射を付ける。最後は元のUI画像へ正確に戻る。WebGLなしでは画像＋Canvas主動作を維持し、表面反射だけを省略。

実盤面はGameViewの模擬状態。`.pt-dew` の位置を測って描画し、対象側のみ元画像を一時的に隠す。停止・非表示・終了時に元画像へ戻し、pagehideでGPUとCanvasを解放。低減モーションは接触時刻での状態切替。

## 起動・検証

```sh
node node_modules/vite/bin/vite.js client --host 127.0.0.1 --port 55170 --strictPort
node node_modules/typescript/bin/tsc --noEmit -p client/tsconfig.json
node node_modules/vite/bin/vite.js build --config docs/vfx-prototypes/2026-10-07-dew-grant-six/vite.config.mjs
node docs/vfx-prototypes/2026-10-07-dew-grant-six/qa/check.mjs
node docs/vfx-prototypes/2026-10-07-dew-grant-six/qa/export.mjs
```

ビルドは公開assetをコピーしない検証専用。Playwrightは既存 `/tmp/lore-buff-browser-tools` 環境を利用。

機能結果は `qa/report.json`、途中形状はPNG、比較動画は `qa/six-30fps.mp4`。動画は30fpsの固定時刻を同じRendererへ渡して出力するため、実機フレームレートの証明とは区別する。

採用・ゲームイベント接続・ステージング公開は未実施。機能検査と美術上の承認は別であり、主要TCGや原神相当の品質へ到達したという認定はしない。

## 確認結果

- TypeScript検査と2入口のViteビルド成功。共有GameViewを含むため既存の大きなchunk警告は残る。
- 6案 × 7時点の状態確認で、初回0→3／追加5→8、数値更新は各1回。
- 320 / 390 / 844 / 1280pxで横方向のはみ出し0。
- 390 / 1280px × 両陣営 × 全6案の実盤面確認、白／暗の両側同時、低減モーション、非表示時の復元、dispose後Canvas 0。
- ブラウザ例外0、素材取得エラー0。初期の開発サーバー読み込みではホスト負荷によりタイムアウトが発生し、読み込み待機を調整した最終検査は成功。
- 見た目を確認し、DF3の途中形状を細い環から幅のある二枚の水膜へ修正。実盤面では元アイコンの縦横比を維持するよう補正。白背景の拡大、スマホ、相手側を画像で確認。
- 比較動画は `six-30fps.mp4`。`six-native.webm` と `native.json` は実時間の描画状況、`board-live.webm` は実盤面での連続再生。固定時刻出力と実機速度の結果を混同しない。

実時間録画は負荷の影響でコマ落ちがあるため、見比べ用には固定時刻の30fps動画を優先する。nativeの描画回数・最大間隔は `qa/native.json` を確認。滑らかな実機再生の保証はこの機能検査から行わない。
