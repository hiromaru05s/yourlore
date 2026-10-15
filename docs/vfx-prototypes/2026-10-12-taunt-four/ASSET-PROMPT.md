# 第2稿 / 獅子の浮彫素材

- 組み込み `image_gen.imagegen`。CLI/APIの別経路は使用していない。
- `transparent_background: true`。生成後の原寸・アルファを保持してコピー。
- 保存先: `client/public/art/vfx/taunt-four/lion-relief.png`。
- 用途: 第3案の浮彫メッシュの色・輪郭。深さ、顎の動き、出現境界は `lionRelief.ts` の共通時計で生成。

## 実際に使用したプロンプト

Use case: stylized-concept. Asset type: a high-end fantasy card game's animated bas-relief VFX texture, isolated cutout. Create one exquisitely sculpted lion guardian face in aged ivory bronze, direct perfectly frontal symmetrical orthographic view, mouth open roaring, fangs clearly separated, deep dark mouth cavity, strong raised brow, long swept sculptural mane with 7 or 8 large flowing locks on each side, compact broad silhouette. Entire lion head and mane only, no shield backing, no surrounding circle, no shoulders, no torso, no pedestal. It must look like a physical carved relief with powerful sculptural planes, fine chased engraving following the mane, edge wear, dark crevices, soft warm patinated bronze midtones, narrow pale gold edge reflections. Tasteful semi-realistic painted game art, not photoreal animal, not a flat icon, not a generic vector mascot. Form readable at 120 pixels. Broad muzzle in center, upper face and nose in upper 65% and lower jaw in bottom 35% to support a jaw-open animation. Both left and right long outer mane sections sweep downward to two tapered roots which will emerge from a card's lower corners. Neutral soft overhead-left light. Fill 85% of a square canvas with the entire subject, transparent background, preserve clean alpha around silhouette and mane tips. No glow, no mist, no particles, no aura, no lettering, no symbols outside sculpture, no watermark.
