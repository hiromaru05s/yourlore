# LORE 図書館家具 — 2026-09-09

マーケットは [生成原案](market-concept.png) をもとに Blender で制作。シェルフは [既存原案](../2026-09-08-meshy/shelf-case.png) を参照し、共通カードの収納規格に合わせて再構成した。デッキ台座は別作業で制作済みの [Blenderモデル](../2026-09-09-blender-deck-holder/README.md) をそのまま使用。

- [生成プロンプト](market-prompt.txt) / [出典・配信ファイルとSHA-256](manifest.json)
- [マーケット原本](market.blend) / [レンダー](market-preview.png)
- [シェルフ原本](shelf.blend) / [レンダー](shelf-preview.png)
- [形状検査](geometry-checks.json) / [Khronos GLB検査](gltf-validation.json)

実行: `/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/blender/build_lore_library_furniture.py`。

GLBはメートル、+Y上、1U=64mm。シェルフの外形・空洞・足裏・アンカーは `docs/cosmetics/v1/README.md` に準拠。カードはGLBに含めず、共通の12スロットにゲーム側で表示する。マーケットは無地の平らな天板に、HTMLのカードと操作部を重ねる。盤面幅に合わせて奥行のみ調整する。

| GLB | 三角形 | 描画数 | サイズ |
|---|---:|---:|---:|
| shelf | 1,564 | 3 | 約116 KB |
| shelf-low | 628 | 1 | 約54 KB |
| market | 1,044 | 3 | 約97 KB |
| market-low | 452 | 1 | 約44 KB |

標準・軽量とも本物のメッシュ。外部テクスチャ、実行コード、カメラ、ライトを含まない。GLB検査はエラー・警告0。未使用UVと取付用空ノードの情報メッセージのみ。マウントとカード空間は書き出された頂点で検査済み。WebGLが利用できない場合は既存の画像/CSS表示へ戻る。商品販売・装備選択機能の実装は今回の範囲に含まない。
