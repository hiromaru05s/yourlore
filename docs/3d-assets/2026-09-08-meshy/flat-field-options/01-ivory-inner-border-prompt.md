# 白磁案：内枠線の追加

内蔵ImageGenによる編集。参照／編集対象：`01-ivory-thin-rim.png`。
天板の内側に金の細い二重線と小さな菱形を追加。平面の色模様として指定し、台の形状は維持。

Meshyで形状を生成するときは無地版を使い、この画像は色・装飾の完成イメージとする。線は3D化後に天板のカラーテクスチャへ追加し、法線・高さ・変位には適用しない。今回作成したのは完成イメージで、UVテクスチャや3Dメッシュではない。

```text
Use case: precise-object-edit.
Edit the supplied image of LORE's smooth white porcelain duel platform. Make one narrowly scoped change: add a refined decorative inner border line on the WHITE TOP, close to the perimeter. Preserve the exact camera, background, object outline, low thickness, navy side apron, gold outer edges, white colour, smooth flat surface and lighting.
The new design is a pair of extremely fine muted champagne-gold lines running continuously around the rounded oblong outline, inset about 4 percent of the platform depth from the outer edge. The two lines have a narrow, elegant separation, not a thick band. They follow the existing straight runs and broad rounded corners precisely, providing a quiet frame to the playable white area. At the midpoint of the near and far long edges, integrate a tiny slender flat gold lozenge into the line as a restrained Biblion architectural accent. Keep these small, less than one percent of the platform width. Do not add a central emblem or interior dividing lines. The vast centre remains empty and white.
CRITICAL: These gold marks are flat printed colour / diffuse texture on a single planar porcelain face. They have ZERO thickness and ZERO depth: no engraved grooves, raised metal, ridges, recesses, embossing, bevels around the lines, ambient occlusion or shadows. Do not render line highlights implying relief. Uniform thin gold ink. The surface must still be perfectly flat and smooth.
No marble veins, cracks, texture noise, tiles, seams, mottling, additional ornaments, cards, text, labels or UI. One complete isolated object, same composition as the reference. This is an elegant restrained inner frame addition, not a redesign of the platform.
```
