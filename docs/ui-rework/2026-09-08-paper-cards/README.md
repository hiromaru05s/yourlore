# 3Dカードと紙のドロー

対象: `test.yourlore.xyz`。通常の手札カードの表示・操作を維持し、ドロー中のカードをThree.jsの変形可能なメッシュに置き換える。

## 実装

- `client/src/ui/paperCard.ts`: 全カード共通の手続き生成モデル。24×40分割の表裏、薄い紙の側面、独立した表裏テクスチャ。外側に出る既存バッジのための透明な余白を持つ。モデルファイル・Blender・新規依存パッケージは不要。
- `cardSurface.ts`: 現在のDOMのフレーム・アート画像と切り抜き・カード名・コスト・攻撃・HP・状態ラベルをCanvasに合成。既存のRGBフレームの黒抜きフィルターを再現。翻訳や数値を別定義しない。モデル作成のためにカード絵を再生成していない。
- `paperDraw.ts`: 山札から先端を持ち上げ、浅い弧で運び、表へ返し、曲げを収束させて手札へ置く。1枚860ms、135ms間隔、最大6枚。円弧による曲げで紙の長さを保つ。厚いカードの張りを想定し、繰り返す波は使わない。物理シミュレーションではなく演出用の変形制御。
- 表裏・光源・曲げに応じた法線・接地を示す柔らかい影を使用。1バッチで1WebGLコンテキストを共有し、終了時にテクスチャ・ジオメトリ・コンテキストを解放。
- `anim.animateDraw`に接続。初期ドロー、ゲームイベントによる追加ドロー、自分・相手で共通。相手には表面を生成・読込しない。スリーブは山札の設定から取得する。
- 着地後は元のDOMカードへ引き継ぐ。静止カードや他のプレイ演出を全面的な3Dシーンへ移行したわけではない。ルール・通信・対戦サーバーの変更なし。

## 復帰条件

操作によるfast-forward、リサイズ、タブ非表示、画面破棄、WebGLコンテキスト喪失で終了し、手札の非表示を解除。WebGL非対応・軽減モーション時は演出を省略。画像ロードの期限は1.8秒、モジュールのロードを含む全体期限は4.2秒。モジュール・画像読込中もfast-forwardで即座に復帰する。

## 検証

- `npm run typecheck`
- `node tests/duel-ui.mjs`: 既存の盤面・市場・ターン・秘密情報とWebGL無しのドロー。
- `node tests/paper-card.mjs`: 平坦な着地、相手裏面の向き、有限なパラメーター、円弧変形での長さ保存。
- `tests/paper-card-browser.mjs`: 実Chromeで現行のGameViewとレスポンシブレイアウトを使用。通常3枚・6枚、自分/相手、途中操作、リサイズ、390×844の手札、軽減モーション、GPU喪失、画像ロード中のキャンセル、画面破棄、LocalController初期ドロー。結果は `browser-verification.json`。
- ブラウザテストはViteサーバーに接続。共有QAランタイムを使う場合: `LORE_TEST_ORIGIN=http://127.0.0.1:5174 PLAYWRIGHT_MODULE=/tmp/lore-browser-qa/node_modules/playwright/index.mjs node tests/paper-card-browser.mjs`。
- `npm run build`、Wrangler staging dry run。従来からの大きいチャンクの警告は残る。新しい演出コードは動的ロードし、Three.jsは砂時計と共通チャンク。

デスクトップChromeのサンプル測定ではドロー中の中央値・p95とも約16.7ms。全スマートフォンで60fpsを保証する測定ではない。スクリーンショットは制御したfixture、`controller-opening-draw.png`は実LocalControllerの初期ドロー。認証済みオンライン対戦の網羅試験ではない。

デプロイ情報と公開配信物のハッシュ照合は `deployment.json` / `remote-verification.json` を参照。
