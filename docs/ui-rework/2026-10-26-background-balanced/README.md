# 背景の輪郭を戻すプレビュー

- 状態: 2026-10-26 ユーザー採用。鳥を15秒周期にして本番反映を依頼。[実装・公開記録](../../releases/2026-10-26-balanced-background/README.md)。以下は比較プレビュー制作時点の記録。
- 最新参照: `9626b86a` (2026-10-26に gh/main をfetchして照合、fast-forward)。本番採用の背景は `toon-soft-20261026`、Zenoは現在のtoonモデル、UIは蒼銀の面取りと隅のしるし。
- 現行実装: `client/src/ui/homeAtmosphere.ts`、`client/src/styles/homeAtmosphere.css`、`client/src/ui/homeDistantBirds.ts`、`client/src/dev/defaultUIFixture.ts`。実際のApp/HOMEを使用。製品コードへの変更なし。
- プレビュー: http://127.0.0.1:5549/balanced-background-preview.html
- サーバー起動元: `/Users/hiromaru05s/.codex/worktrees/zeno-material-three/LORE_TCG/client` (Vite、PID 32413、5549)。

## 調整

元の輪郭の濃さ100に対し75を制作目標に、元の線幅を保って中程度の青灰・黄土・緑の輪郭へ調整。数値は画像生成への指示であり、ピクセル単位で一律25%の低減を測定したものではない。前回の40目標より輪郭を残す。

`toon-outline-20261026` の元画像を編集入力として明示的に使用。今回・前回・元の素材の3切替は、すべて現行HOMEレンダラーと現行の自然な雲を共通使用する。元の素材比較は過去のシャープ化シェーダーを復元していないため、当時の描画そのものの再現ではない。

保存素材: `client/public/art/lounge/toon-balanced-20261026/library-wide.webp` (1671×941)、`ivy.webp` (727×2162)。built-in image_genで編集し、alphaを維持してWebPに形式変換。全プロンプトは [prompts.md](prompts.md)。

雲は `toon-soft-20261026/clouds.webp` を継続使用。雲のサイズ・移動、ツタの揺れ、城の後ろの鳥、Zenoのモデルと動きは現行コードを使用。プレビューだけThreeのURL解決とCSSの背景参照を差し替える。

## 確認

- `npm --workspace client run typecheck`、`git diff --check` 成功。
- ブラウザーで今回と前回を切り替え、Zenoと現行UIを含む実画面を目視。柱・アーチの線を前回より明確にし、葉の外形を保持。
- 新素材のDOM参照 `toon-balanced-20261026`、WebGL `data-atmosphere=ready` とcanvas opacity=1を確認。新規シーンのconsole error 0。
- 雲・ツタ・Zenoの時間変化を複数時点で確認。鳥の既存アニメーション実装・層順には変更なし（今回は全周期の検証は未実施）。
- スクリーンショット: [今回](qa/balanced.png)、[前回](qa/previous.png)。合成APIによる検証ユーザー表示。
