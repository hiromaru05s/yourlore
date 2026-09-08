# 対戦台の3D化 — staging

参照画像からBlenderで制作した白磁・紺・金の台を、対戦画面に組み込んだ。以前の台は `/art/biblion/duel-table.png` という背景画像だった。現在はGLBの天板・縁・側面を既存のWebGLレンダラーで描画し、カードとマーケットはその上のDOMとして操作する。

- 配信先：<https://test.yourlore.xyz>、Worker `lore-server-staging`。
- [デプロイ記録](deployment.json)、[配信ファイル照合](remote-verification.json)。
- [Blender原本・生成来歴・GLB検査](../../3d-assets/2026-09-08-blender-table/README.md)。
- 単体の回転プレビュー：<https://test.yourlore.xyz/table-preview.html>。

## 表示と負荷

`duelTable.ts` がGLBを非同期で読み込み、`duelScene.ts` の既存コンテキスト・環境光・約30fpsのループを共有する。対戦用カメラは固定。画面比率に合わせて台の奥行きを調整し、カードの寸法・配置・入力処理は既存のものを使う。台と小物は別カメラで描画する。

幅700px以下で対戦に入る場合は88,284 bytes / 1,248三角形の軽量GLB、それ以外は218,004 bytes / 3,168三角形を読み込む。材質は各3種類。両方とも画像を内包し、外部CDNや追加デコーダは不要。GPUやモデルの読み込みが失敗した場合は既存背景を表示する。対戦終了時は台のメッシュ・材質・画像も解放する。

## 検証

- `npm run typecheck`、`npm run build`、`node tests/duel-ui.mjs`、`git diff --check` 成功。Viteの既存の大きなチャンクに関する注意は残る。
- Wrangler 4.130.0の `deploy -c server/wrangler.toml --env staging --dry-run` 成功後、同じstaging指定でデプロイ。D1・Workerのソースや設定は変更しない。
- ローカル `duel-lab.html?dense=1`：1280×720、1920×1080、390×844で実際のWebGL描画を確認。両軍7モンスター・14スペル/トラップ、中央マーケット、手札、デッキ、シェルフ、リフト、砂時計が表示される。PCは `data-table-state=ready`、スマホは `ready-low`、canvasは1枚、スマホの横スクロールなし。
- ステージングの単体プレビューでも標準GLBの描画成功とブラウザエラーなしを確認。
- ステージングのHTML、JS/CSS、台のGLB/プレビュー/manifestをHTTP取得し、ローカルの配信ビルドとSHA-256一致を検査。結果は上記JSON。
- ステージングのログイン後の実対戦・オンラインマッチングは未検証。GPU障害の強制発生、長時間プレイ、実機のFPS測定も未実施。

反映前のバージョンは `7b063a10-ac81-44a5-97f8-02efdf3e19e8`。既存のHOME・スペルドロップ改善を含む同じブランチ上の後続変更として反映した。本番へのデプロイは行っていない。
