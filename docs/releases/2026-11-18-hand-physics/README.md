# 採用された手札ドラッグの物理感

ユーザーが2026-11-18に第4稿を採用し、本番適用を指示。基点は `e5a8c53fd163523072eb60fb1197f5736ead0254`。採用済みazure-silverネームプレートを含む最新mainに統合。

## 通常の対戦操作

- つかんだ位置を支点に、減衰ばねで移動・3軸の傾きを連動。最終採用値は第3稿から各軸0.9倍。同じ入力のY傾き最大は約44.24°。
- 手札の現在の配置に近づくと、ボタンを離す前でも手札サイズへ滑らかに復帰。再び前へ出すと盤面のドラッグサイズへ戻る。手札側でのリリースはキャンセル。
- カードの実フレームとコスト・攻撃・体力の飾りから外周を抽出し、青白い細い光を輪郭に密着。薄い反射と影もカードの動作に追従。
- プレイは現在位置から既存の召喚・発動へ引き継ぐ。マウス・タッチ共通。低減モーションは傾きと移動光を止め、操作とサイズ復帰を維持。
- 本番では通常経路として有効。プレビューのdataset指定は不要。DOMMatrix非対応環境は既存のポインタ追従方式へフォールバック。
- リモート状態の更新で手札DOMが差し替わっても保持中の元カードを隠し、新しい実位置を復帰先にする。中断・画面破棄時はRAFと選択SVGを解放。

主要実装: `client/src/ui/boardView.ts`, `handPhysics.ts`, `heldCardOutline.ts`, `client/src/styles/handPhysics.css`。輪郭抽出は既存の `handConditionOutline.ts` を共用。プレビュー操作パネルは本番へ含めない。

## 検証

- client型検査、`hand-physics-motion.mjs`、`duel-ui.mjs`、`touch-activation.mjs`、`hand-condition-rules.mjs` が合格。JSDOMはCanvas・showModal未実装の警告を出すが既存DOM検証は合格。
- `hand-physics-browser.mjs`: 1280×900のマウス、390×844のタッチ、390×844の低減モーションで合格。プレビュー有効化フラグなしの標準GameViewを使用。
- 各ケースで、ドラッグ中の元DOM差し替え、保持したまま手札サイズへ復帰、前へ出し直して縮小、キャンセル、blur/touchCancel、閉じた手札からの直接ドラッグ召喚、一時ノード除去を確認。pageerrorは0件。
- 自動検証は `qa/browser-report.json`。実盤面画像は同じQAフォルダにローカル保存。機能検証の合格と見た目の採用は別: 見た目は本チャットの第4稿をユーザーが採用済み。
- 検証起動元: `/Users/hiromaru05s/.codex/worktrees/hand-physics-production-1118/LORE_TCG`。ローカルfixture URL: `http://127.0.0.1:5319/hand-physics-check`（ブラウザ検証スクリプトが一時提供）。

実装コミットは `9af927a69aa339237b457f7c2cb4eb6cd84038b9`。リリース検証中に追加された対戦修正 `8400b596a`、採用済みプレイ位置の光 `60cbd9160`、回帰テスト更新を含む `d815a6ac9364fc8040f8f069122dfc06ac5f1a68` でも、同じ3条件のブラウザ検証と本番ビルドを再確認した。結果は `qa/integrated-browser-report.json`、照合用ファイルは `qa/built-assets.json`。

再確認時のコールド読み込みではテストがローダー消去前に操作を始めたため、検証スクリプトに `.duel-loader` の消去待ちを追加。その後3条件とも合格。ゲーム本体の追加修正はなし。

## 本番反映

2026-11-18 23:55 JST、統合コミット `d815a6ac9364fc8040f8f069122dfc06ac5f1a68` を既存のguard付きリリース手順で公開。全298件のproduction suite、client/server型検査、デザインガード、本番ビルドが成功。Cloudflare version `0626fd5c-60a2-42e4-bb49-f08e7ea946c6` を100%配信。`qa/deployment.json` と `qa/production-suite.json` に記録。

`https://yourlore.xyz` のJavaScript/CSSについて、検証済みビルドとSHA-256が一致（`qa/production-assets.json`）。本番配信の通常HOME→シングル→対戦→初手確定からカードをドラッグし、物理処理の標準有効化、元カード非表示、保持中の手札サイズ復帰、フレーム輪郭5パス、手札でのキャンセルと一時ノード除去を確認。ブラウザ例外0件。`qa/production-browser-report.json` に記録。

公開後のブラウザ確認はアカウントAPIのみをローカルゲストfixtureに置換し、公開済みアセットと通常のローカルBOT対戦を利用。実アカウントの書き換えは行っておらず、実ユーザー同士の認証済みPvPは未検証。画像 `qa/production-held.png` と `qa/production-home.png` はローカル保存し、最新版のネームプレート・盤面・保持輪郭を目視確認した。
