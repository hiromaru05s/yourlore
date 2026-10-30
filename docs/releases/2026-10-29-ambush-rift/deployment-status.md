# 公開状況（2026-10-29）

修正コミット: `a6856f7e`。本番未反映。

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
