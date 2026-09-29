# 肖像アイコン配置③の採用

ユーザーが比較案③「枠を両側に見せる」を選択。体力・シールド・雫を少し下へ吊るし、体力を左、雫を右へ寄せる共通CSSを両プレイヤーへ適用した。雫の横幅は110%、数字の中心は53.5%を維持。

変更は `client/src/styles/reading-board.css`。体力には独立したCSS `translate` を使い、盤面投影が設定する `transform:none` と干渉しない。

## 検証

- client/server typecheck、production build、diff check成功。buildには既存のchunkサイズ警告あり。
- 実controllerを使用し、1920×1080・1440×900・390×844・844×390の両プレイヤーを撮影。
- 承認済み③の1920・390・844幅の6配置と比較し、枠・体力・シールド・雫の各座標・寸法が0.02px以内で一致。
- アイコンの画面内への収まり、ブラウザエラー0件を確認。`approved-comparison.png` が選択時の比較画像、`after-*` が実装後の確認画像。
- `staging-verify.mjs` は配信ファイルのSHA-256と、配信されたBOT盤面の配置を承認済み座標と照合する。ログイン/APIはfixtureのため、認証付きオンライン対戦の検証ではない。

公開の記録は `staging/` に保存する。
