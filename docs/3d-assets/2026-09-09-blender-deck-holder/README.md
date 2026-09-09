# Biblion Ivory — Blender製デッキホルダー

2026-09-09。[別セッションの対戦台](../2026-09-08-blender-table/README.md)で使用した白磁・濃紺・真鍮色と金の二重線を引き継いだ、カードを上に載せる台座。[コスメティック規格v1](../../cosmetics/v1/README.md)に合わせてBlender 5.2.1で直接モデリング。外部の生成3DモデルやImageGenは使用していません。

## ファイル

- [編集用Blender原本](lore-biblion-deck-holder.blend)：テクスチャ内包、スタジオ照明、カメラ、非表示の実寸カード40枚入り。
- [標準GLB](../../../client/public/models/cosmetics/deck_holder_biblion_ivory/v1/model.glb)
- [軽量GLB](../../../client/public/models/cosmetics/deck_holder_biblion_ivory/v1/model-low.glb)
- [GLBを再読み込みした実レンダー](glb-preview.png)／[軽量GLBの実レンダー](glb-low-preview.png)
- [カードなし](preview.png)／[1枚を載せた状態](with-card-1.png)／[40枚を載せた状態](with-deck-40.png)
- [自分側静止フォールバック](../../../client/public/models/cosmetics/deck_holder_biblion_ivory/v1/fallback-self.webp)／[相手側](../../../client/public/models/cosmetics/deck_holder_biblion_ivory/v1/fallback-opponent.webp)
- [納品アセットマニフェスト](../../../client/public/models/cosmetics/deck_holder_biblion_ivory/v1/asset.json)
- [生成記録](manifest.json)／[GLB形状検査](geometry-check.json)

Blender原本の `REFERENCE_CARDS_NOT_EXPORTED` コレクションを表示するとカードの載り方を確認できます。カードとスタジオはGLBには含めません。GLBは対戦画面への組み込み前の制作アセットです。実際のドロー・シャッフル、ロード失敗時の挙動、端末FPS、ショップでの購入は未検証のため、マニフェストは `draft` としています。

## 形状と外観

- **天板：76.8×118.4mm、角丸半径2.56mm、全域Y=0。** 金線、角の製本風の模様、中央の菱形は平面テクスチャ。法線・高さ・displacementなし。
- **全体：80.64×122.24×8.96mm。** 規格の外形上限83.2×124.8×8.96mm以内。下面Y=-8.96mm。
- 上の白磁から、細い真鍮色の肩、濃紺の側面、下の金線、控えめな内側の足へつなぐ断面。側面に小さなファセット付きの金色シャードを前後対称に配置。
- 箱・トレー状の内壁、カードを囲む縁、カード接触面の凹凸はなし。全商品形状がY≤0。
- カード64×100mmを中央へ置くと、天板の余白は左右各6.4mm、前後各9.2mm。40枚の確認用カードは厚さ0.32mm×40＝12.8mm。
- GLBはメートル、+Y上、+Z手前。`cosmetic_root → visual → DeckPedestal` と、root直下の `deck_mount` 空ノード。全ノードTRSは恒等変換。天板中央が原点。
- Blender原本は通常のZ上で作業し、GLBエクスポーターが座標変換。ゲームではアンカーを盤面から8.96mm上に置くと足裏が接地。

## パフォーマンスと素材

| | 標準 | 軽量 |
|---|---:|---:|
| 三角形 | 1,688 | 448 |
| マテリアル／draw call | 1／1 | 1／1 |
| GLBバイト数 | 92,912 | 31,600 |
| カラー／ORM画像 | 1024²／512² | 512²／256² |
| RGBA展開＋mipmap換算 | 6.67MiB | 1.67MiB |

共通名 `body` の1マテリアルへアトラス化し、カラーとORMをGLBへ内包。OPAQUE・metallic-roughness方式。ライト・アニメーション・外部URI・追加デコーダなし。フォールバック画像はモデルを描けない場合の代替であり、モデル用の全テクスチャと同時ロードする必要はありません。

- 白磁：sRGB `#F2EFE7`、roughness約0.72。
- 濃紺：`#101A2E`、roughness約0.42、metallic約0.05。
- 側面の真鍮色：`#A47F4D`、roughness約0.38、metallic約0.65。
- 天板の印刷金：`#8C6437`、金属感は控えめ。色・輝度は照明と表示環境によって変わります。

[原寸カラー](textures/source-basecolor.png)／[原寸ORM](textures/source-orm.png)は各2048²。UVの天板領域は左下基準 `(0.02,0.02)…(0.642,0.98)`。天板の左右がU、長辺がV。右側の共通色スウォッチ中心は紺 `(0.84,0.15)`、金 `(0.84,0.35)`、足 `(0.84,0.55)`、白 `(0.84,0.75)`。ブリードを含むスウォッチ範囲はU>0.70、各中心V±0.075。UV配置は `CosmeticAtlas_v1` に保存。

これは専用形状の最初の候補で、今後すべての画像差し替え商品が使用する `deck_pedestal_v1` マスターとしての採用はまだ確定していません。同じ形状の色違いはこのメッシュとUVを再利用できます。

## 検証

- 出力GLBから天板頂点と三角形の面積を再計算。天板の高さ偏差0、上向き法線誤差0、天板全体の被覆を確認。
- 左右・前後対称、外形上限、足裏高さ、全頂点Y≤0、アンカー名と原点を検査。
- 標準／軽量の三角形、draw call、材質、UV、埋め込み画像、GPUメモリ換算、転送量が規格内。
- Blenderソースの各シェルが閉じたmanifold形状であることを確認。標準／軽量ともGLBをBlenderへ再インポートしてレンダー。
- Khronos glTF Validator：両方とも**エラー0・警告0**。[標準レポート](model.validation.json)／[軽量レポート](model-low.validation.json)。空アンカーについての情報通知のみ。
- 1枚／40枚の実寸カードで目視確認。カードは確認用の静的治具で、ゲームのデッキ表示実装の変更ではありません。

## 再生成

開いているBlenderや別セッションのファイルには触らず、独立プロセスで実行します。

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/blender/build_lore_deck_holder.py
python3 scripts/blender/check_lore_deck_holder.py
```

画像のWebP化・アセットマニフェスト更新は `node scripts/blender/package_lore_deck_holder.cjs`（Nodeの `sharp` が必要、今回の環境では利用可能）。再インポートレンダーとKhronos Validatorの記録は別検査です。ゲームのランタイム、ステージング、別セッションの対戦台ファイルは変更していません。

GLB再インポートレンダー：

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background docs/3d-assets/2026-09-09-blender-deck-holder/lore-biblion-deck-holder.blend --python scripts/blender/render_lore_deck_holder_export.py
```
