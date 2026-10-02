# ③「月白の背面光」標準適用

2026-09-29、ユーザー指示「3番で適用して」に対応。ローカルの通常表示へ適用。その後、統合版1157300としてステージング https://test.yourlore.xyz へ公開。

- `client/src/ui/passiveIcon.ts`: 承認済みv2アイコンの上に、③と同形・同色の暗い接触線と青白い縁を描画。共通描画を使うカード・盤面・説明・検索へ反映。
- `client/src/styles/passives.css`: 試作③と同じ線幅4/1、透過率0.95/0.9、1.2px/3pxの局所光。回数と付与の角印は発光より手前。常時点灯の静止表現で、アニメーションやタイマーを追加しない。
- `client/src/dev/passiveHighlightEffects.css`: 比較時だけ標準光を隠し、5案の光や「光なし」が重ならず比較できるようにした。
- v2 SVGの図柄と、右側のパッシブ名・説明は維持。

型チェック（クライアント・サーバー）、製品ビルド、`git diff --check` 通過。ブラウザーで通常描画の発光レイヤー、11種の日本語の名前と説明への発光、比較ページの二重発光防止を確認。PC/スマホの結果と画像は同フォルダの `qa-report.json` と `board-desktop.png` / `board-mobile.png`。

見た目の確認: 明るい盤面と詳細表示でも、元の図柄・濃紺の面を残し、選定された青白い縁がアイコンの形に沿って見える。

## ステージング公開

Worker version: `366ec090-a02a-4b9e-b3fb-b1092746a3e8`。全工程統合タスクが公開を担当。公開HTML・エントリJS/CSS・11種のv2 SVGの計15ファイルが、確定ビルドとSHA-256一致。③の発光レイヤーとCSS値を配信資産で確認。記録は `staging/deployment.json` / `staging/hashes.json`。

公開サイトのカード一覧から11種のカード詳細を操作し、全パッシブ名・v2アイコン・③の発光スタイルが一致。1280px/390pxで表示確認、ページ例外なし。アカウント/APIのみfixtureで、JS/CSS/SVGとカードアートは公開サイトから取得。認証済みオンライン対戦ではない。`staging/verification.json` / `staging/description-desktop.png` / `staging/description-mobile.png`。詳細検索を閉じてからカードを開く操作で確認した。
