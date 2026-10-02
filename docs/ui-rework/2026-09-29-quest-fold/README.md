# クエストプレイ採用: ② 光頁の折契

2026-09-29。ユーザー指示「2番で適用して」。採用対象は `docs/vfx-prototypes/2026-09-29-quest-integrated` の第2稿②。第1稿と第2稿の比較ファイルは変更しない。

- `client/src/ui/questFoldMaterial.ts`: 承認された中央の折れ、面の陰影、表面の刻印と光脈。元の絵・枠・数値と同じUVを使う。
- `client/src/ui/questFold.ts`: 3秒の共通時計。現在のカードと実クエストタイルを取得し、盤面の投影行列へ連続的に移動する。最後は同じ位置のネイティブDOMへ引き継ぐ。
- `client/src/ui/cardSurface.ts`: クエストの実タイル（絵・枠・コスト・進行表示）の取得。今回不要な裏面画像は取得しない。
- `client/src/ui/anim.ts`: クエストの `revealSpell -> field` に接続。従来の独立した `quest` 装飾をこの経路から除去。通常の残存魔法は既存経路を継続。
- `client/src/game/controller.ts`: 配置したクエストの実UIDを演出へ引き継ぐ。

`setFxSkip`、画面サイズ変更、タブ非表示、タイムアウトは既存 `boardMotionScope` を介して中断する。中断やWebGL・画像取得失敗時は実カードの配置表示へ戻す。低減モーションでは折り畳みを省く。終了時にWebGLのテクスチャ・バッファ・プログラム・コンテキストを解放し、ゲームの再描画後に一時DOMを削除する。

## 再現

```sh
node node_modules/vite/bin/vite.js client --host 127.0.0.1 --port 5265 --strictPort
```

<http://127.0.0.1:5265/quest-play-lab.html>

この開発用ページは実際の `reduce -> BaseController -> revealSpell -> GameView` を使用する。クエストと陣営を選択して再生できる。製品ビルドの入力には含めない。

## 検証

検証結果は `qa` に保存。機能検証と見た目の確認を分ける。ステージング公開は統合タスクが担当し、この実装作業自体ではデプロイしない。

- `npm run typecheck`: client/server 成功（採用版接続時）。最終表示サイズ調整後も再実行。
- `npm run build`: 成功（採用版接続時。最終拡大率調整の直前）。
- `node tests/quest-quick.mjs` / `node tests/quick-playback.mjs`: 成功。
- `PW_TEST_SCREENSHOT_NO_FONTS_READY=1 node tests/quest-fold-browser.mjs`: 8項目成功、ブラウザー例外0。実 `reduce -> controller -> revealSpell` 経路。両陣営、異なる3クエスト、既存0/3/8枠、実UID、着地誤差2px未満、後片付け、早送り、リサイズ、390px、低減モーション、WebGL不可を確認。
- 最終画像: `qa/peak-*.png`、`qa/rest-*.png`、`qa/mobile-peak.png`。カード本体と刻印が同じ折れに従うことを目視。`peak.png` 等の無接尾辞画像は拡大率調整前の検討記録。
- `qa/extra-report.json`: 通常速度の追加録画・両側同時再生・非表示中断の追加検査はChrome起動が180秒でタイムアウトし未完了。機能検証8項目の成功を、これらの成功や商用ゲーム同等の品質認定として扱わない。統合先で再確認する。
- 未コミット。公開なし。

## ステージング依頼後の追加確認

統合タスク側で通常速度・両陣営同時・非表示中断の3項目が成功。`qa/integration-extra-report.json` と `qa/integration-continuous-playback.jpg` を保存。questFold.ts と questFoldMaterial.ts のSHA-256が採用版と同一であることを再確認した。公開は統合タスク `01a0e9ed-c169-7b33-9251-2c7173f0fd51` が担当し、配信結果は `staging/` に記録する。

## ステージング公開

2026-09-29 JST、統合リリース `115730049bd664b4f82e2a16328139994f7fd4e8` として https://test.yourlore.xyz へ公開。Worker version は `366ec090-a02a-4b9e-b3fb-b1092746a3e8`。本番には未公開。

独立検証で公開JS/CSS・クエスト枠・コスト枠・Q_RIFTアートのHTTP 200と確定distとのSHA256一致、および公開main内のquest-fold-canvasを確認。証跡は `staging/verification.json` と `staging/deployment.json`。公開環境で認証後のクエスト発動を再操作したものではなく、通常速度・双方同時・中断の実動作は同一ソースの統合QAで検証済み。
