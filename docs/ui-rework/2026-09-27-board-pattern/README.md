# Biblionのフラットな盤面紋様

白いインゲーム盤面の無地部分に、`docs/world-bible.md` の「目とコンパス環」を取り入れた大きな薄い紋章を両側に配置。外周はシャンパン色の細い飾り線、紋章は青灰色。カードを置く領域のコントラストは低くし、細かな反復模様で埋めない構成。

模様は独自の編集可能なSVG。影・グラデーション・ベベル・発光・凹凸は含まない。SVGをベースカラーに焼き込み、既存の白い面のnormalTextureとmetallicRoughnessTextureを外した。roughnessは一律0.88、metallicは0。盤面のPOSITION/NORMAL/indicesは元データと同一で、形状・高さ・カード配置・入力判定は変えていない。既存の紺色の外枠や金属部は維持。

- 元図形: `client/public/models/reading-board/v1/biblion-surface-v1.svg`
- 組み込み先: 同ディレクトリの `board.glb` / `board-low.glb`
- 再生成: `node scripts/build-board-pattern.mjs`。元GLBはgitの `d2ff0fee320c13e7d74e4eb2e4b101b37b59819b` に固定。
- 通常版の模様は2048×1260、軽量版は1024×630。不要になった白い面の凹凸／粗さ画像を除去し、通常版は4,851,224→3,636,392 bytes、軽量版は1,552,460→1,331,020 bytes。
- 新規ランタイム描画処理や別レイヤーは追加せず、既存のGLBロード／描画を使用。バージョン付きURLを更新して旧盤面キャッシュとの混在を防止。

## 確認

production build成功。実際のBoardView／duelSceneを使用して1440×900の通常モデル、640×420の軽量モデルを表示。空のフィールドと両側7枚のフィールドを目視確認。ページ例外なし。再生成時に既存の頂点・法線・インデックスのバイナリ同一性を検査。

`board-1440-empty.png` / `board-1440-full.png` / `board-640-empty.png` が確認画像。`assets.json` にサイズ、元データと出力のSHA-256、凹凸除去の記録を保存。
