# トリックルーム — 流れる銀砂 + ② 引き寄せ交換

2026-10-14 ユーザーがアイコン切替②を選択し、ステージング適用を指示。

- 板の継続効果は選択済みの①「流れる銀砂」。攻撃・体力の既存枠に青赤グラデーションを継続する。
- 発動・解除で実際のアイコンが互いに寄って戻る600 msの動き。300 msでengine由来の攻撃／現在体力とダメージ色を更新する。
- `GameView.render` → `TrickRoomPresentation` に接続し、実対戦の状態表示用Actorも同じタイムラインで更新する。
- `trickSwapped` の変化をコピーしたスカラーで追跡。同値同士も交換を見せる。延長、重複snapshot、途中接続、新規召喚、所有者変更では余分な交換を発火しない。
- 交換対象は一般の能力上昇／低下演出から除外し、二重演出を防止。通常の他の能力変化は従来経路を維持する。
- 手札プレイ演出は既存controllerを使用。ゲームルール・期間・カードバランスは変更しない。
- 任意の次操作によるfast-forward、画面非表示、再描画、破棄で最終値へ確定し、アイコンの一時スタイルを除去する。継続効果は非表示中停止、終了時にcanvasを除去。reduced motionは180 msの局所明度変化のみ。
- 銀砂はプレビューと同じ110点の軌跡・輪郭・色。継続surface描画は最大30 fps、アイコン交換はrequestAnimationFrameで更新する。

## 検証経路

`tests/trick-room.mjs`: 実reduceによる両プレイヤー、現在HP、延長、2ターン解除、同値、重複、再接続、in-place変化、召喚、移動、ゲーム終了。

`tests/trick-room-browser.mjs`: cosmetic-studioのBaseController.applyResult/queueを経由し、実盤面で手札プレイ→継続→解除。PC1280／390px、両陣営、状態表示Actorの数値、表示欠落、二重演出、fast-forward、hidden、reduced、disposeを検証する。この検証はfixtureであり、認証済み2人のオンライン対戦の証明ではない。

配信は `scripts/deploy-guard.mjs staging` によるコミット済みsnapshot検証後に実施。配信証跡は別途記録する。

実対戦経路のフレーム検証で、状態表示Actor生成時に本体を即非表示→Actorは次フレームで初描画、という1フレームの空白を検出。`syncMonsterStates` で本体を保持し、Actor初描画の時点で非表示にするよう修正。通常の状態表示・攻撃判定は維持する。

局所検証結果: 実reduceテスト成功。通常controller経路はPC発動401/解除171フレーム、390px相手側発動285/解除172フレームで表示欠落0・一般能力演出との二重再生0。skip/hidden/reduced/dispose成功、ブラウザ例外0。詳細は `qa/validation.json` とフレーム記録。
