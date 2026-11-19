# 攻撃選択演出の本番反映

2026-11-19、ユーザーが第8稿を承認し、本番反映を指示。

- 攻撃元は青、対象カードは赤で実フレームの輪郭に沿って発光。両カードを少し拡大して浮上。
- 矢印は現行版を維持。先端に太い赤い照準・内向きマーク・脈動を追加。カードと相手プレイヤーで共通。
- 相手プレイヤーの四角い選択枠を肖像に沿う光へ変更。
- キャンセル・再選択・並べ替え・低減モーションを確認。ゲームルール・サーバー・DBの変更なし。

採用プレビュー: `9878aa250`、最新統合main `cf2e89503`。
実装: `client/src/ui/attackAim.ts`、`attackTarget.ts`、`attackLift.ts`、`boardView.ts`、`monster/runtime.ts`、`client/src/styles/attackTarget.css`。
[制作・QA記録](../../ui-rework/2026-11-18-attack-target-frame/README.md)。プレビュー入口は本番ビルドの対象外。

公開には既存のコミット固定デプロイガードを使用。DB整合、client/server型検査、production suite、design guard、build、mainと本番稼働版の整合を確認する。
公開後は配信済みJS/CSSと実盤面のPC・タッチを、隔離したAPI/room fixtureで検証する。公開結果は以下。

公開前の初回suiteは端末負荷下で `bot-npcs.mjs`（15分）と `bot-server-challenge.cjs`（2分）がETIMEDOUT。機能assertionの不一致ではない。両テストの判定とシナリオを維持し、上限のみそれぞれ30分・10分へ変更してガードから再実行する。

## 本番反映・確認結果

- 2026-11-19、本番 https://yourlore.xyz へ反映。
- 公開ソース: `be26c91fa38e63f61da7a5701eedc35c05f3408c`。
- Worker version: `9aea24ab-f087-43ba-b57d-dcffa7094803`、100%。[deployment.json](qa/deployment.json)
- ガードの再実行で **299/299成功**。DB整合、client/server型検査、design guard、build、main整合も成功。[production-suite.json](qa/production-suite.json)
- 初回の297/299と時間切れ2件は[initial-timeouts.json](qa/initial-timeouts.json)に保存。NPCシナリオやassertionを省略せず再検証した。
- 公開用のコミット固定snapshotから採取したHTML・JS・CSS・JSON **139ファイル**が、本番から取得したファイルとSHA-256で一致。[production-assets.json](qa/production-assets.json)。プレビューHTMLは本番ビルドから除外されている。
- 本番配信クライアントでPC1440×960とスマホ390×844を検証。青い元カード・赤い対象・両カードの浮上、カード照準、プレイヤー照準、攻撃不能時の区別、キャンセル後の解放、直接攻撃の送信とengineでの解決を確認。ブラウザエラー0。[production-browser-report.json](qa/production-browser-report.json)
- 画面は本番のJS/CSS/素材。APIとWebSocketのみ隔離fixtureを使用し、実アカウントや実対戦データを変更していない。実プレイヤー同士の通信対戦は今回の確認範囲外。
- 見た目はユーザー承認の第8稿。本番の[PC・カード](qa/production-desktop-card.png)／[PC・プレイヤー](qa/production-desktop-player.png)／[スマホ・カード](qa/production-mobile-card.png)／[スマホ・プレイヤー](qa/production-mobile-player.png)で照合。

本番確認用ブラウザはMetal描画を指定。初期のローカル確認は同時負荷を避けて中止し、公開後に両サイズを改めて成功させた。公開後のコミットは記録と検証スクリプトの起動オプションのみで、配信コードは上記の公開ソース。
