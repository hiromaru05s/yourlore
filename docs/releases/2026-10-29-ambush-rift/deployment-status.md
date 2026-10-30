# 公開状況（2026-10-29）

修正コミット: `a6856f7e`。**2026-10-30 本番反映・公開後検証完了。** 以下の認証ブロック記録は解消前の履歴。

- `git push gh HEAD:main` は GitHub の `Invalid username or token` により失敗。
- 認証情報を含まないHTTPS URL + 既存キーチェーンでも同じエラー。SSHは `Permission denied (publickey)`。
- 接続済みGitHubプラグインはなく、確認したアプリ内ブラウザも未ログイン。
- `npm run deploy` は `HEAD must equal current gh/main` で停止。Cloudflareへ書き込みを開始していない。ガードは迂回していない。
- 本番配信元は着手時 `5839a8bd39128f80f1453a82e8ccc1ffbafdf7bc`。
- 本番ビルドを専用worktreeの `client/dist` から `http://127.0.0.1:5590` で起動し、`tests/ambush-rift-browser.mjs` のPC/mobile幅・両陣営4ケースも成功。`qa/built-report.json` を参照。

認証復旧後は `gh/main` の最新変更を確認・必要なら統合し、修正をpush、既定の `npm run deploy` でコミット済みスナップショットの再検証と公開を行う。公開後は配信ソース・静的アセットと同ブラウザケースを確認する。

ログ: `/tmp/lore-ambush-{typecheck,build,playback,browser,built,suite,deploy}.log`。

最終ローカル検証: `npm run test:production` **250/250成功**（終了コード0）。`qa/production-suite.log` を保存。テストが書き換えた既存の過去レポート3ファイルは、この作業で生じた差分のみ元に戻した。全検証終了後もGitHubの認証復旧待ちで、本番への公開は未実施。

## 2026-10-30 認証復旧・公開再開

GitHub CLIの既存認証で作業ブランチへのpush成功。最新main `89e4e752`（デッキ外観・ルーン学問・ターンタイマー更新を含む）を `b380fa6f` へ競合なく統合し、奇襲の回帰テストと本番ビルドを再確認。別公開が保持する共有ロックの終了後、最新mainを再確認して既定のデプロイガードで公開する。前節の認証ブロックは解消済み。

## 本番公開・配信確認完了（2026-10-30）

- 配信元: `e6d2e5b3d9a4cbe3e389b9bd38b5a28a2048b822`。奇襲修正 `a6856f7e` の包含を ancestry とソースで確認。
- Worker version: `4f5419bf-4fc2-4c3a-94d6-11ac2b25dc28`（100%）。Deployment: `2d0cbb39-821d-4e8d-9334-80b25db36aff`。
- 公開時刻: 2026-10-30 12:22:48 JST/KST。対象: https://yourlore.xyz 。
- 同時進行の変更を取り込んだ共通mainに対し、既定の共有ロック・デプロイガードで型検査、**254/254テスト**、ビルド、配信前のmain/本番バージョン確認を通過。共通公開のログ: `/private/tmp/lore-home-tier-deploy.log`。
- この作業でもCloudflareの配信状態を独立取得し、**139ファイルのSHA-256一致**を確認。ローカル照合用ビルドの起動元は本worktree `client/dist`、生成元は上記の公開ソースと一致。
- 本番配信の `cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1` で **1280 / 390幅 × 両陣営の4ケース成功**。奇襲が墓地へ表示されるフレーム0、リフト演出1回、同じカード面を保持、軌跡・到着、残留DOMなし、ブラウザエラー0。
- 実配信の画像を別途目視確認し、現行のカード・盤面・リフト素材であることを確認。録画と各ケースの途中・最終画像は `/tmp/lore-ambush-production/`。
- `qa/production/` に配信状態、ハッシュ、ブラウザ検証結果、代表画像を保存。

確認範囲は実配信コード＋実盤面に reducer の fixture を適用した表示検証。認証済みPvPや実機性能検証とは区別する。既存の開いたクライアントは再読み込みで更新される。
