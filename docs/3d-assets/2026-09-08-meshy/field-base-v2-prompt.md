# フィールド土台 v2 — 実際の背景を参照

内蔵ImageGenで生成。参照画像: `client/public/art/biblion/duel-table.png`（リポジトリルート基準）。
初回案の木製・角型土台を訂正し、実際の背景の大理石・濃紺と金の縁・大きく丸めた輪郭を基準とする。

```text
Use case: precise-object-edit.
Input image 1: the ACTUAL existing LORE game battlefield background. This is the mandatory visual source, not a loose mood reference.
Task: extract and faithfully reconstruct ONLY the large central marble duel platform as one isolated 3D asset reference for Meshy image-to-3D. Preserve the existing platform's identity and silhouette: a very broad rounded oblong / stadium-like slab with smoothly sweeping curved ends and nearly straight long edges; a vast uninterrupted pale cool ivory / faint lavender white marble top covered by the same fine branching grey marble veins; a narrow continuous midnight navy blue stone perimeter, finely edged in muted gold, with a low dark navy stepped side fascia and understated regularly spaced small gold joint details. The top must remain completely flat and empty. NO central symbols, no compass rose, no geometric engravings, no wood, no ornate corner fittings, no blue inset gems, no beige parchment, no new decoration. Preserve the material palette and restrained architectural detailing from the source exactly.
Remove the surrounding bookshelves, walls, pillars, crystals, and environment. Show only the floor/table platform, no room, no legs. The source hides some of the side thickness: complete only that narrow low supporting side wall consistently with its visible navy-and-gold edge.
Composition: one complete isolated solid object centered on a plain neutral light grey studio background, with generous 8 percent margins on every side and the entire uninterrupted silhouette visible. Landscape image. Elevated front three-quarter view close to the source's top-down camera, 60 degrees above horizontal, long axis running horizontally, very little yaw. Show a slim amount of front and side thickness. Keep the same broad spacious playing surface proportions, not a small portable board or rectangular wooden tray.
Rendering: polished premium game environment asset with clean physically plausible geometry and clearly readable marble material; soft diffuse neutral lighting and light contact shadow, no dramatic lighting, no bloom, no vignette. No cards, no UI, no typography, no labels, no logo, no multiple views. The result should immediately be recognizable as the exact central platform from input image 1 separated from its room.
```
