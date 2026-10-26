# Default UI: 02 蒼銀の面取り

ユーザーが選んだ生成画像を共通パネルに採用。外周の四隅も内側のフレームと平行に面取りし、通常ページとダイアログを同じ青い面・銀青の細線で統一する。

`client/src/styles/defaultUI.css` がページの主面、共通モーダル、ネイティブdialog、カード説明面、通知を担当。既存の各ページの構造・イベント・カード・3Dアートは保持。独自コンポーネントは `.lore-surface` で同じ面を使える。標準仕様を `docs/default-ui-design.md`、`AGENTS.md`、メニュー設計資料に記録。

元画像：選択済み `client/public/previews/biblion-ui-simple/02-cut.png` を `client/public/art/ui/lore-panel-azure-cut.png` へ原寸コピー。生成し直していない。

## ローカル確認

- client/server TypeScriptチェック成功。
- production build成功。
- IABで実コンポーネントを使うAPI fixtureを確認：HOME、カード、デッキ、ランキング、フレンド、ショップ、設定、ログイン、チュートリアル、ルールノート、ガチャ提供割合、カード選択。
- カード選択後に確定ボタンが有効になり、確定で閉じることを確認。
- 320×640 iframeでHOME、カード一覧、カード選択を確認。本文の縦スクロールを維持し、決定・キャンセルは表示範囲内。
- 確認中にチュートリアルの枠内余白、ルールノートの暗い文字、ガチャ操作色を調整。
- QA用HTMLはViteの製品build inputに登録していない。fixture APIはローカルで完結し本番へ送信しない。

本番の配信結果・確認は配信後に追記する。fixtureでの確認は実アカウントや実機の確認ではない。

## 初回本番配信と追加修正

初回 `d909a956` は215/215回帰テスト、型チェック、buildを経て本番配信。Version `109584b5-c3f8-4618-8370-b4e2efb5b403`。本番ログイン画面とCSSを確認し、枠PNGのSHA-256がローカルと一致。

最終確認でカード拡大の外周に旧二重枠が残っていたため、共通面の所有者を説明欄から `.zoom-wrap` 全体へ修正。説明欄は薄い区切りに変更。カード画像・関連カード操作は保持する。勝敗画面、プレゼント受信箱、390pxのチュートリアル案内も追加で目視確認。QA用プレゼント応答は現行APIのitems形式へ修正。

## 最終本番確認

- 配信commit: `7d63c67d2689a5fb0f815af0be3600b211db9e6a`。
- Cloudflare Version: `4a0a5ba3-23ce-4fa3-8bd3-3fdba20b8681`。
- 修正後もclient/server typecheck、215/215回帰テスト、build成功。既存の本番デプロイガードで配信。
- 本番HTMLが参照するCSSに面取りフレームとカード拡大の外周修正が含まれること、PNGのSHA-256が同一であることを確認。詳細は `production-assets.json`。
- IABの本番ログイン画面で枠素材URL、20pxのpolygon面取り、横方向のはみ出しなしを確認。`qa/production-login.png`。
- ローカル320pxでもカード拡大の長い名前、カード画像、説明、終了操作の表示を確認。`qa/card-inspection-320.png`。
- このブラウザの本番セッションはログアウト状態。ログイン後の各ページはローカル実コンポーネント＋fixtureでの確認であり、認証済み本番や実端末の検証とは区別する。
