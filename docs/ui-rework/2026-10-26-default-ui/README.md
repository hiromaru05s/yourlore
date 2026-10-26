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
