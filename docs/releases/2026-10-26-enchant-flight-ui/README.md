# 永続魔法の着地中の旧UI表示を除去

ユーザー報告の「醸造で旧『残り6』が一瞬出る」「期限付き血鬼術に∞が一瞬出る」を修正。

盤面の時間表示は新しい円形UIに更新済みだったが、`revealSpell` が演出専用面を別に生成し、カード定義の `val` だけで旧ラベルと∞を選んでいた。血鬼術・古代文明は `val:99` でもグローバルターンで期限が決まるため、この分類が誤っていた。

- `activeEnchantmentTile` を盤面と着地演出で共有。初回生成から同じ円形時間UI・蓄積カウンターを使用し、無期限の魔法だけ∞を表示する。
- コントローラーから実際のEnchant・現在ターン・種族シナジー状態を渡し、既存の `enchantTimeState` で時計を判定。既存のカードルール・有効期間は変更しない。
- 演出のメッシュ用テクスチャにもネイティブのSVGを印刷。着地直前の円形UIの出現・消失や旧ラベルへの置き換えを避ける。

## 検証

`tests/enchant-time-ui.mjs` に期限付き5種、無期限、種族契約の期限解除、ライブ蓄積値、新規血鬼術の10ターン表示を追加。persistent-flight・duel-uiも通過。

`browser-check.mjs` は実際のreduce → BaseController → GameView → 着地レンダラーをローカルで動かす。醸造・血鬼術・古代文明・商会を両プレイヤー側でプレイし、MutationObserverと8msサンプリングで旧ラベル・誤った∞がないこと、描画用SVGにも現在の数字が入ること、着地後の一時DOMとcanvasが片付くことを確認。結果は `qa/browser.json`、連続映像は `qa/cast-sequence.webm`。`qa/blood-rite-flight-frames.png` で移動中から円形10を確認。

これはローカルの実プレイ経路検証であり、認証付きオンライン対戦の検証ではない。機能チェックとは別に、連続映像と実盤面の着地を目視確認した。

## 本番反映

2026-10-26 20:01 (Asia/Seoul)。公開ソース `3993a8094217ad95d8600c4892732db1c42c41c7` は修正 `2905ed56` を含む。型検査・全228件のproduction-suite・ビルドをdeploy-guardで通過。Worker version `227c7370-c95f-4ed1-9a84-9e82d648388f`、100%。

本番 https://yourlore.xyz のHTML・機能を含むJS・CSSのSHA-256一致を3/3確認。`production.json` 参照。
