# ③ 岩層の着地 — runtime adoption (2026-10-05)

ユーザー指定: 「３で適用してステージングにあげて。現行のなんか二重で適用されている召喚アニメーションは消してね」。

## 実装

- 承認した修正版③の catalog/material/renderer を `client/src/ui/summon/` へ移し、比較プレビューも同じ実装を参照する。
- 手札の公開演出から同じ高さ・平行面へ引き継ぎ、790msでカード面全体が盤面に接地。四辺の砂煙、角のある砕片、表面反射も同じ時計で描く。
- `playMonster(...,'summon')` は専用の③ランタイムに一度だけ接続。従来の monster actor / contact dust は召喚経路から外した。
- `lore:summon-impact` の送信と盤面側の購読を除去。旧2Dと3D砂埃の重複を止めた。棚への到着・魔法などの汎用 `lore:summon-dust` は別用途として維持。
- 元カードは公開面のみを取得し、演出中は1枚に置換。終了・中断・resize・skip・画面破棄でカードの可視状態を復元し、canvas/WebGLを解放する。低減モーション・素材取得不能時はネイティブカードへ復帰。

## 検証

- `qa/runtime-report.json`: 実GameView、27 checks / 0 errors。両陣営、面全体の接地行列、単一置換、接地callback1回、3枚同時、abort/skip/resize/clear、取得途中のキャンセル、手札召喚経路、旧3D impactイベント0回。
- `tests/slate-summon.mjs`: 低減モーション、開始前abort、取得途中キャンセル、素材失敗時の復帰、切断済みsource。
- CUAで実盤面表示を確認。見た目の採用根拠はユーザーが選定した③であり、チェック通過だけを品質承認とは扱わない。
- PCと390×844の実盤面fixtureで各27項目を確認。`qa/runtime-mobile-report.json`。認証オンライン対戦の検証は含まれない。

## ステージング公開

- 公開URL: https://test.yourlore.xyz/
- 召喚実装コミット: `0efc0f54`。
- 公開元: `f5744953a6ea23bf7571d489afb6e728228e9c15`。並行する魔法効果音・カード一覧幅修正を含む統合版。共有デプロイガードによる同じ統合版の公開に合流し、二重デプロイは行わなかった。
- Worker version: `483822d6-0eb6-4ef9-ad2c-12591b08b26c`。`qa/staging-deployment.json`。
- committed snapshot / npm ci / client・server型検査 / production 53/53 / buildを通過。
- `qa/staging-hashes.json`: HTML・JS・CSS 37/37ファイルのSHA-256一致。共有node_modulesのローカル試作buildはchunk名が異なったため、同一SHAをnpm ci環境でビルドした `cards-no-horizontal-scroll` worktreeの成果物を比較対象に使用した。配信された `modal-BENTXwaL.js` に③の実装を確認。
- CUAで新しい `main-BZazi_b2.js` を読み込み、公開ログイン画面の表示を確認。召喚の動作検証はローカルGameView fixtureで実施したもので、ステージングの認証済み対戦を検証したという意味ではない。
- 本番は変更していない。
