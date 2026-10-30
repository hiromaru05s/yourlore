# 永続魔法の下半分が黒くなる描画の修正

参照: 本番と `gh/main` の `5839a8bd39128f80f1453a82e8ccc1ffbafdf7bc`。
実装: `client/src/ui/cardView.ts`、`client/src/ui/enchantmentView.ts`、`client/src/styles/game.css`。
確認サーバー: `/Users/hiromaru05s/.codex/worktrees/enchant-blackout-fix/LORE_TCG` から Vite を起動し、`http://127.0.0.1:5476/cosmetic-studio.html?board=1&runtime=1&set=default` の実 GameView を使用。

## 原因と修正

古い `.zone-st .card-art { height:89%; }` が、永続魔法／クエストの画像レイヤーに適用されていた。現在のレイヤーは幅・高さ200%をscale(.5)で描画するため、この指定が高さだけを上書きして実表示を約44.5%へ縮め、枠の暗い内部が下半分に露出していた。

旧高さ指定を削除。画像と枠は共通の200%寸法・0.5倍率で一致する。カード画像、枠、カウンター・時間表示のデザイン、カードのルールは変更しない。

## 検証

- `tests/enchant-art-browser.mjs`: 修正前に画像13.99px／枠31.54pxの高さ不一致で失敗することを確認。修正後は両陣営、1280×900・844×390・390×844、再描画、数値更新、低減モーションで画像と枠の描画寸法が一致。
- 醸造（カウンター付き）、血鬼術、商会（無期限）、古代文明とクエストを対象に確認。実カード素材の画像デコードも確認。
- `tests/enchant-time-ui.mjs`、`tests/card-counters.mjs` 成功。
- PCの実盤面と描画用カード画像を目視し、絵が下端まで継続していることを確認。狭い画面における既存の時間バッジの最小径は今回変更していない。
- ブラウザ確認はローカル状態fixtureによる。認証付きPvP・実機では未確認。機能確認は新規VFXの品質承認を意味しない。

再実行: Viteを起動し、`PLAYWRIGHT_MODULE` と `LORE_TEST_ORIGIN` を設定して `node tests/enchant-art-browser.mjs`。画像の保存先は `LORE_TEST_OUT`（既定 `/tmp/lore-enchant-art`）。公開時は既存 `npm run deploy` ガードでコミット済みスナップショットの型検査・production suite・ビルドを実行。

## 公開状況（2026-10-29）

`npm run typecheck`、production suite **250/250**、`npm run build` は成功。修正のブラウザ再検証も成功。

本番反映は未完了。`git push gh HEAD:main` が保存済みHTTPS認証の拒否で失敗し、資格情報ヘルパー経由のHTTPS・SSHも利用不可。デプロイガードは迂回していない。本番確認時の配信元は引き続き `5839a8bd39128f80f1453a82e8ccc1ffbafdf7bc`（version `efab21c0-2b79-4700-8143-c8294bbc5a21`、100%）。GitHub認証復旧後、最新mainとの差分を再確認してpushし、`npm run deploy`と配信版確認を行う必要がある。
