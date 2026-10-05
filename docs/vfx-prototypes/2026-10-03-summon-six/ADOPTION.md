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
- ステージングの公開記録は完了後に追記。認証オンライン対戦の検証は上記には含まれない。
