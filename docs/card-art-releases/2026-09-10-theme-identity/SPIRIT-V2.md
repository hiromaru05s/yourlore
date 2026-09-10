# 精霊2枚の描画スタイル修正

写実的な毛・鼻・顔を、エルフの既存イラストを基準とした輪郭線と色面に置き換えた。犬の特徴と背景のテーマは保持。内蔵ImageGenで2枚を再生成し、配信用3サイズにも反映した。

[正確な生成プロンプト](spirit-style-v2.json) / [全体一覧](README.md)

## トリ

茶色い毛、黒い垂れ耳、クリーム色の口元を保持。細かな毛の写実描写を抑え、毛束の形と描かれた陰影で表現。

![トリ・修正版](/Users/hiromaru05s/Desktop/LORE_TCG-art-theme-revision/docs/card-art-releases/2026-09-10-theme-identity/images/Q_TORI.png)

[写実的だった前案](iterations/Q_TORI-attempt1.png)

## ウィンター

白灰の長毛、顔の片側の灰色部分、長い白い脚を保持。大きな毛束と青紫の影で整理し、顔も同じイラスト調に統一。

![ウィンター・修正版](/Users/hiromaru05s/Desktop/LORE_TCG-art-theme-revision/docs/card-art-releases/2026-09-10-theme-identity/images/Q_WINTER.png)

[写実的だった前案](iterations/Q_WINTER-attempt1.png)

原本の生成元はmanifestに記録。`spirit-style-v2.json`の参照パスは呼び出し時の値で、当時の犬画像は現在 `iterations/` に保存している。再利用用の参照パスは `dog-prompts.json` に記録。
