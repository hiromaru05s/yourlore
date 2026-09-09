# 白磁・紺・金の対戦台 — Blender / Web

2026-09-08。ユーザーが添付した[参照画像](reference.png)をBlender 5.2.1で再制作。画像を板に貼った見せ方ではなく、閉じた立体メッシュとPBRマテリアルを持つGLB。

- [編集原本](lore-ivory-table.blend)：テクスチャを内包。レンダリング確認用のカメラ・ライト・床も含む。
- [Blenderレンダー](preview.png)
- [標準GLB](../../../client/public/models/lore-table/table.glb)：218,004 bytes、3,168三角形、3マテリアル。
- [軽量GLB](../../../client/public/models/lore-table/table-low.glb)：88,284 bytes、1,248三角形、3マテリアル。
- [静止フォールバック](../../../client/public/models/lore-table/preview.webp)：18,570 bytes。
- [生成来歴・SHA-256](manifest.json)、[書き出し後の形状検査](geometry-check.json)。

## Webで確認

リポジトリルートで `npm run dev` を実行し、`http://127.0.0.1:5173/table-preview.html` を開く。ドラッグ回転、ホイール拡大、参照角度／斜め／真上、標準／軽量切り替え、GLB保存に対応。

`npm run build` で `client/dist/table-preview.html` にも出力する。`npm --workspace client run preview -- --host 127.0.0.1 --port 5175` でビルド済みファイルを確認できる。WebGLが使えない場合は同じモデルの静止画を表示する。モデル／テクスチャ／Three.jsは同一オリジンから配信し、実行時のCDNや外部モデル生成サービスは不要。

2026-09-09追記：対戦画面への組み込みとステージング反映を実施。[反映記録](../../ui-rework/2026-09-09-3d-table/README.md)。独立プレビューでは回転可能、対戦中は固定カメラで表示する。

## 形状と組み込み契約

- GLBはメートル、+Y上、X左右、+Z手前。ルートTRSは恒等変換。
- 作業寸法：幅1.60m × 奥行1.02m × 厚さ0.075m。角丸半径0.40m。
- この盤面の実寸契約は既存資料にないため、画像比率から決めた作業寸法。シェルフ／デッキホルダーの専用寸法規格とは別物。対戦レイアウトとの統合時に必要な寸法を確定する。
- 天板は全域Y=0。本体はY=-0.075…0。金線・前後の菱形は平面カラーテクスチャとmetallic/roughnessのみ。normal／height／displacementなし。
- `body`＝白磁と金の印刷、`trim`＝外縁と側面下部の金線、`accent`＝濃紺側面。
- 標準・軽量ともGLB内にPNGを埋め込み。透明材質、外部URI、Dracoなどの追加デコーダ、カメラ、ライト、床、カード、アニメーションはGLBに含めない。
- 輪郭・底面も閉じたメッシュ。Blender原本のmanifoldチェックと、実際のGLBの平面・法線・外形チェックを通している。
- 独立プレビューは操作・リサイズ・ロード完了時のみ再描画。常時ループ／自動回転なし。DPRは1.75まで。古いGLBのジオメトリ／材質／画像は切り替え時に解放する。対戦画面は既存の約30fpsの描画ループ・WebGLコンテキストを共有する。

## 再生成

リポジトリルートから実行。

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/blender/build_lore_table.py
node -e "require('sharp')('docs/3d-assets/2026-09-08-blender-table/preview.png').webp({quality:88}).toFile('client/public/models/lore-table/preview.webp')"
python3 scripts/blender/check_lore_table.py
npm run build
```

生成スクリプトは別のBlenderプロセスで実行する。開いている作業ファイルを消去しない。MCPが応答していなかったため今回はBlender CLI/Pythonを使用した。

## 検証

- `npm run build`：typecheckとViteの複数エントリービルド成功。既存の大きいJSチャンクについてViteのサイズ注意あり。
- `python3 scripts/blender/check_lore_table.py`：標準・軽量とも成功。GLB自体から三角形・法線・天板高さ・寸法・不透明材質・外部依存なし・SHAを検査。
- Khronos glTF Validator：両方ともエラー0、警告0。[標準レポート](table.glb.validation.json)／[軽量レポート](table-low.glb.validation.json)。参考情報として未使用UVとNPOT画像サイズの通知のみ。
- ブラウザ：1920×1080／1280×720と390×844で表示、視点切り替え、標準／軽量切り替え、ドラッグ回転を確認。配信用ビルドでもGLBロードを確認。
- WebGL初期化失敗／コンテキスト消失時の静止画処理は実装済み。GPU障害を実際に発生させる試験と実機のFPS計測は未実施。

Three.jsの読み込みは[GLTFLoaderの公式仕様](https://threejs.org/docs/pages/GLTFLoader.html)に従う。美術参照はユーザー添付画像、形状とテクスチャは今回の手続き生成。外部の既製3Dモデルは使用していない。
