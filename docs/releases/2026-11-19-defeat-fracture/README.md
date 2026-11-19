# 敗北演出の固定破片・重低音

2026-11-19、ユーザーが実盤面プレビューと音の修正後に本番適用を指示。

## 採用内容

- キャラクターと枠にヒビ → 小さく揺れる → 80ms静止 → 破裂 → 初速の後にスロー。手前へ迫る立体破片。
- 8キャラクター×両陣営の事前生成した固定モデル。数値UIの画素走査・実行時の破片生成を除外。
- キャラクターの実表示画像・比率・位置を保ち、敗北時に拡大される不具合を修正。
- 破裂後の揺れは1.5秒。体力・シールド・雫に破裂220ms前だけヒビを重ね、破裂時に消す。
- 深い低音と拡散残響の2.35秒の効果音。破裂に同期し、音量・ミュート・中断・解放へ接続。

## 参照・範囲

- 統合元main: `a67ceafdf`。本番の直前稼働ソース: `d815a6ac9`。
- 実装: `client/src/ui/manaRupture/`、`client/src/ui/outcomeSurface.ts`。
- 固定モデル: `client/public/vfx/character-fractures/v1/`、生成元の採用素材コミット `e5a8c53fd`。
- 比較の起動元: `/Users/hiromaru05s/.codex/worktrees/defeat-depth-preview-1118/LORE_TCG/client`、http://127.0.0.1:5538/defeat-depth-preview.html 。
- [仕様・検証証跡](../../vfx-prototypes/2026-11-18-defeat-depth/FIXED-FRAGMENTS.md)。プレビュー専用の入口は本番公開しない。
- ゲームルール・DB・Durable Objectの変更なし。GPUの発光描画は残り、全端末で一定FPSを保証する変更ではない。

## 公開前検証

固定モデル16個・タイミング・音声波形、致死時の演出→結果遷移、表面採取、実盤面PC/スマホ幅・数値非破砕・ヒビ・キャンセルを確認する。公開は既存のコミット固定デプロイガードで、型検査・production suite・build・DBスキーマ整合・mainの一致を確認する。

## 本番反映・確認結果

- 2026-11-19 07:34 KST、本番 `https://yourlore.xyz` へ反映。
- ソース: `fe168a872aa9e28a51b7c152c01a13e04995d9a1`。
- Worker version: `dc2e9cf4-d500-4ad7-84d4-dd6bde5fd9b7`、100%。[deployment.json](qa/deployment.json)
- production suite **299/299**、client/server型検査、design guard、build、DBスキーマ確認が成功。[production-suite.json](qa/production-suite.json)
- 本番から取得したHTML・JS・CSSと固定モデル16種のJSON/ヒビ画像、計170ファイルがコミット固定ビルドとバイト単位で一致。[production-assets.json](qa/production-assets.json)
- 本番配信クライアントでPC 1280×900の自分側敗北、スマホ390×844の相手側敗北を確認。ヒビ→バッジ消失、破裂音1回、1.5秒で揺れ停止、演出終了後の結果表示、位置の復元を確認。ブラウザエラー・素材読込エラー0。[production-browser-report.json](qa/production-browser-report.json)
- 上記ブラウザ検証のAPI・WebSocketは隔離fixture。engineが生成した致死イベントを本番クライアントへ渡し、実際の対戦画面で検証した。実アカウント・実対戦データへの変更なし。実プレイヤー同士の対戦は今回の確認範囲外。
- 見た目はユーザーが承認したプレビューの仕様で反映。本番配信素材で保存した [PC](qa/production-me-1280.png) / [スマホ](qa/production-opp-390.png) でも奥行き・破片・盤面との重なりを確認。
