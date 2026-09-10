# 光のテクスチャ（旧版・現在は未使用）

上矢印を隠すというフィードバックにより、現在の attack-up.ts では読み込まない。以下は初版の生成記録。

内蔵imagegenツールで新規作成したオリジナル素材。ゲーム映像や他社素材の切り抜きは使用していない。

保存先: `energy-wisp.png`。1024×1536 RGBA。sipsでalphaチャンネル、FFmpegのalphaextract/signalstatsでalphaの変動範囲を確認（YMIN=0、YMAX=254）。透明背景であることを確認した上で、実ブラウザでも四角い背景が出ないことを目視した。

元ファイル: `/Users/hiromaru05s/.codex/generated_images/01a08848-18a1-78d3-bbfc-5ece9076e661/exec-38c0189e-55b0-430d-8583-6802d5a01b75.png`

ブラウザ側で広い弱い光を抑え、UVの揺らぎとノイズによる輪郭の消失を加える。PNGそのもののピクセルは編集していない。

## 最終生成プロンプト

Use case: stylized-concept. Asset type: ORIGINAL game VFX particle texture, a single isolated upward energy wisp for an elegant anime fantasy card game's attack-strength buff. This is a production sprite, NOT a scene or mockup. Create ONE long vertical tapered crescent-like brushstroke of golden luminous energy with several fine trailing filaments inside it; upward direction. Slight gentle S-curve, sharp pointed upper tip, broad white-hot ivory body with saturated amber-orange thin edge, long fragmented fading lower tail. Sophisticated hand-painted anime action RPG magic effect, clean designed silhouette, graceful calligraphic movement, translucent layered interior with negative space. Keep the wisp narrow, occupying the central 35 percent of the image width and 85 percent height, on a genuinely transparent background. Restrained local bloom only; no giant blurry glow cloud. One wisp only, no separate objects, no symbols, no arrows, no numbers, no letters, no swords, no people, no cards, no circle, no ground, no environment, no watermark. Portrait canvas. Preserve full tip and full tail within image margins.
