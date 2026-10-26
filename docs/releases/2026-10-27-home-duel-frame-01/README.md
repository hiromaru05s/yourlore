# HOME 対戦ボタン — 採用01「一枚銀の縁」

ユーザー指定: 4案の01を本番へ採用し、消えていたハイライトを控えめに適用。

## 採用内容

- 円の外径・比率を全モードで統一。
- シングル（水色）とノーマル（紺）は同じ銀枠画像領域を共用。
- ランクマッチは同じ骨格で上部だけ深紅の差し込み。
- 承認済みの複数色の内側と、水に絵の具を落とすホバー流墨を継承。
- ハイライトは明度1.055倍、拡大1.025倍、枠の光は5px・不透明度24%。キーボードフォーカスは輪郭も表示。
- 日英韓のモード表示と既存の対戦開始遷移を維持。タブ選択だけでは対戦開始しない。
- GPU非対応／コンテキスト喪失は同じ画像の静止表示へ。低減モーション、非表示タブ、モード切替／HOME破棄時の停止・解放に対応。

## 実装

- `client/src/screens/home.ts`: モードとボタン表示の連動、破棄時の解放。
- `client/src/ui/homeDuelButton.ts`: 共通枠、ランク枠、透過素材の合成、静止代替。
- `client/src/ui/homeDuelInk.ts`: 承認済みの流体・UV移流。待機中は連続描画しない。
- `client/src/styles/homeDuelButton.css`: 円の比率、文字、控えめなハイライト。
- `client/public/art/ui/home-duel-frame-01/`: 承認済みPNGを無加工でコピー。

プレビューと同様、旧ランクの狭い内側だけ1.181倍で共通開口へ合わせる。元の模様・配色は描き直さない。製品では録画用のpreserveDrawingBufferを無効化し、遅延読込の破棄競合とWebGL失敗時の代替を追加。

## 素材の出典

built-in imagegen使用。元の制作場所は `/Users/hiromaru05s/Desktop/LORE_TCG/output/ranked-entry-20261027/`。

- 枠: Round 5 / `source/client/generated-r5/frame-01.png`。
- 内側: Round 4 / `source/client/generated-r4/{single,normal,ranked}.png`。
- 生成プロンプト: 本ディレクトリの `generation-prompts.json`。
- 元生成ファイル: `$CODEX_HOME/generated_images/01a178c2-43b9-7c30-ab39-c3b93aed0ce7/` の `exec-ab2e19eb-f111-4e86-bd3e-ed86b8d2e2b9.png`（枠）、`exec-6dd242f0-be8f-40be-8e4c-5e380fe5da98.png`（水色）、`exec-4d20d26a-2a27-447c-908d-5448f42c887b.png`（紺）、`exec-bdbae134-eb72-4081-9048-9cf92c44603a.png`（赤）。

## 参照ソースと公開

最新main `b8f9e1b3f25f0e25d85b1ab9fcb49f13461dce4a` から専用worktreeを作成。採用HOME・Zeno・共通UIの参照元を照合。公開前の本番はソース `1a6f23f37f927a2797a2a2534a029b5f146fe2b8`、Worker版 `be2e5560-509b-40d0-bd1d-6ba529227182`。そのソースは今回の祖先に含まれる。

ローカル確認の起動元: `/Users/hiromaru05s/.codex/worktrees/home-duel-frame-01/LORE_TCG/client`、Vite `http://127.0.0.1:5591/ui-default-qa.html?page=home`。実HOMEコンポーネントとfixtureアカウントを使用。

公開は `scripts/deploy-guard.mjs production` により、ロック、main一致、公開済みソース包含、型検査、production suite、ビルド、公開版競合チェックを通したコミットスナップショットで行う。公開結果は追記の `production.json` を参照。

## 検証範囲

`tests/menu-selected.mjs` でモード選択／開始遷移、枠共用、ランク枠差分、同モード再選択時の再割当なし、旧renderer破棄、HOME終了時の全解放を確認。ブラウザでは3色の表示、マウスホバーによる流墨、控えめなハイライトを確認。機能確認とユーザーの見た目採用は区別する。実PvP・物理スマホの確認は含まない。

追加ブラウザ確認: WebGLをボタンだけ無効にしたfixtureで `motion=static`・canvasなし・同一静止素材の表示を確認。390×844と320×640のiframeを目視し、短い画面の既存コンパクト枠は86pxの円とモード名だけで可読性を保った。ホバーの実測は `brightness(1.055)`、`drop-shadow(... 0.24 ... 5px)`、`motion=fluid`、再入場回数の更新を確認。console errorなし。保存画像はローカルfixtureで、本番ログイン済みHOMEの証跡ではない。

公開ガードで既存 `quick-playback` のNode用バンドルが新しいloadingScreen.css内の公開画像URLを解決しようとして失敗したため、他のNode用描画テストと同様に `.css` を空ローダーにした。検証対象のゲームイベント・順序のアサーションは変更せず、対象テストの成功を確認。
