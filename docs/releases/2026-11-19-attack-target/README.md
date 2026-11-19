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
公開後は配信済みJS/CSSと実盤面のPC・タッチを、隔離したAPI/room fixtureで検証する。公開結果は完了後に追記。
