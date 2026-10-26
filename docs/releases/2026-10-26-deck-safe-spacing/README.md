# Deck screen safe spacing and confirmation emphasis

2026-10-26、ユーザーの添付2枚に基づき、下ナビとの重なり・ユーザー情報直下の窮屈さ・確定操作の弱さを修正。本番公開まで明示的に指示された。

## Source and scope

- 基準：最新 `gh/main` の `71fd342244b95139717dd5e92499e985cd734206`。`client/src/screens/deck.ts` の実画面と、採用済み `deckLayout.css`／`deckActions.css` を使用。現在のぼかしなしのパネル・カード・背景・共通UIはそのまま使用する。
- 参照：カード一覧 `cardsWorkspace.css`／`menuWorkspace.css` と共通ラウンジの `--bar`／`--dock`。1911×893でカード一覧の外枠は上端88px、下端779px、下ナビ上端805px。
- 変更対象：`client/src/styles/deckLayout.css` と `client/src/styles/deckActions.css`。デッキ保存や所持・編成・ドラッグのロジックは変更しない。

## Changes

- デッキ専用の固定 `top:64px`／`bottom:82px` を廃し、`calc(var(--bar) + 8px)`／`calc(var(--dock) + 10px)` で実際のヘッダーと下ナビに追従する。スマホも同じ安全域を使う。
- 添付と同じ1911×893では切替と上部操作が24px下がり、ユーザー情報の下端からデッキ切替まで29px、一覧枠からナビ領域まで26px空く。外枠の下端はカード一覧と一致する。
- 低いPC横画面／小さいスマホは作業領域を内部スクロールさせる。候補の高さとフィルターを確保し、固定ナビへはみ出すまま放置しない。
- 確定操作は、既存の面取りとチェック印を保ちながら、濃く彩度のある青の面・白い太めの文字・銀青の縁へ変更。ホバー／押下／無効／既存の未保存時の強調は維持する。

## Checks

- 実アプリのローカルゲストで1911×893、1280×720、390×844、320×568、844×390、667×375を確認。横方向のはみ出しなし、プロフィールとの間隔18px以上、作業領域と下ナビの間隔18px以上。通常画面は候補・フィルター自体もナビより上、低い画面はスクロール領域でクリップする。[実測](qa/layout-checks.json)。
- 確定ボタンをクリックし「保存完了！次のゲームから適用されます。」を確認。
- QAは実コンポーネントを使ったローカルゲストであり、認証済み本番アカウントで保存した証拠ではない。
- プレビュー起動元：`/Users/hiromaru05s/.codex/worktrees/outcome-flow-preview/LORE_TCG`。専用Vite `http://127.0.0.1:5586/?devLogin=1`。5196番は別作業ツリーの既存previewが使用していたため、修正の確認には使用しない。

公開は `scripts/deploy-guard.mjs production` による最新main照合・コミット済みクリーンスナップショットの型チェック／production suite／ビルドを通して実施し、配信されたCSSとエントリーの一致を別途記録する。
