# 商人・闇商人 03 の採用

2026-10-12 のユーザー指定により、見習い商人・王都の商売人・闇商人をすべて03へ適用。

- MERCH1 / MERCH2: 通常の岩層召喚は維持し、同じ時計・接地面へ03「片跳ねの勘定」を合成。枚数は2枚 / 6枚。2026-10-12に修正した接触インパルス、縁・面の反発、摩擦、回転、個別の消失をそのまま共有。
- DARK_MERCHANT: 魔法プレイの拡大表示を03「影秤の契約」に置き換える。黒貨12枚、秤の出現・揺れ・崩れを6.6秒で再生。標準の魔法フレームを重ねて再生しない。最後は同じカード面を既存のリフト／墓地移動へ引き渡すため、比較版末尾のカード消失だけを保持へ置き換えた。
- 音は物理接触時刻に同期。ゲーム共通の音量・ミュート・同時発音制限とキャンセルを使用。
- 比較版とゲーム版が同じ coins / physics / darkRenderer / material を使う。未選択の案は採用しない。

## 確認

型チェック、本番ビルド、production suite 91/91を通過。実ブラウザー21グループは全て0msから開始し、console errorは0件。390px幅の闇商人も構図を確認。`dark-runtime.mp4` / `royal-runtime.mp4` は実時間の連続スクリーンキャプチャ（音声なし）。

- `tests/merchant-runtime.mjs`: 03固定、最初の描画、中央カードからの引き渡し、abort/resize/pagehide/非表示/切断、準備中キャンセル、再発動、低減モーションの標準経路へのフォールバック、描画失敗、音/GPU解放。
- `docs/vfx-prototypes/2026-10-12-merchant-coin-physics/check.cjs`: 12ケース。回転正規化、接地、連続性、枚数、消失、決定性。
- `client/merchant-runtime.html`: 本番 `playMonster` / `summonFromHand` / `ghostSummon` / `revealSpell` を使う実GameView。両陣営14経路、中断6経路、3枚同時召喚の21グループ。ブラウザー結果は `browser-report.json`。
- 見た目: 選択された比較版03と同じ素材・物理・タイムラインを実盤面で連続確認。機能テストの結果とユーザーの見た目の承認は別。
- ステージングは `scripts/deploy-guard.mjs staging` を使用。公開後のHTML・JS・CSS・秤画像・効果音のSHA-256は `staging-assets.json`。デプロイ情報は `deployment.json`。

ローカルの実盤面検証は認証済みオンライン対戦の証明ではない。本番デプロイは対象外。
