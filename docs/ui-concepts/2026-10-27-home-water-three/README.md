# HOME 水面 3案 — 2026-10-27

未採用のローカル比較。製品実装・本番デプロイは変更していない。

## 起点と起動

- fetch後の `gh/main` / `c6abd89e` を基点に独立worktree作成。
- 起動元: `/Users/hiromaru05s/.codex/worktrees/home-water-three/LORE_TCG/client`
- URL: http://127.0.0.1:5586/home-water-three.html
- 起動: `../node_modules/.bin/vite --config water-preview.config.ts --host 127.0.0.1 --port 5586 --strictPort`
- 現行背景参照: `client/src/ui/homeAtmosphere.ts`、`client/public/art/lounge/toon-balanced-20261026/library-wide.webp`、同 `ivy.webp`、`toon-soft-20261026/clouds.webp`。
- HOMEは同コミットの `defaultUIFixture.ts` から実際の `App.home` / 共通UI / ゼノを表示。プロフィール・APIはローカルfixture。
- プレビュー用Vite解決だけで `homeAtmosphereLoader` の読込先を `src/dev/home-water-three/atmosphere.ts` へ変更。通常の製品エントリーに変更なし。

## 比較

1. 細かなさざ波: 短い横波と細かな反射の変化。
2. 風が渡る湖: 斜め方向へ進む長い波筋。
3. ゆったりしたうねり: 低周波の変位で反射面全体がゆっくり揺れる。

水面は採用画像そのものを再サンプルし、色と座標で範囲を限定。境界近傍のマスクを縮め、石柱・手すりの輪郭を変位対象から除外。既存の雲・蔦・鳥・光は同じ現行実装を維持する。

品質基準の「銀紋の流墨」動画を連続フレームで確認。今回への適用は、元の素材のディテールを残した連続変形と、場の位置に固定された表面変化。環・粒子追加は水の動きの代用にしない。

## 確認と限界

- TypeScript noEmit確認。
- ブラウザで3案切替、全景／水面拡大／実HOME、停止・再開を確認。
- 背景の採用画像・ゼノ・共通UIの見た目を基点実装と照合。
- `preview.jpg` は02の水面拡大、`paused.jpg` は停止時の確認。
- 画質の最終選択はユーザー確認待ち。実アカウント動作、実機GPU性能、本番は未検証。

## 01選択・白い水平線の調整

ユーザーが01を選択。添付画像で指摘された細い白線は、水の動きを切った状態でも見える、元の背景の水際ハイライト。`water.ts` の読み取り時に水際の狭い帯だけを検査し、上下より局所的に明るく、直下が青い水面である画素を近傍色へ馴染ませた。元アセットの上書きはしない。同じ補正済みサンプルを変位にも使い、動いた時に白線が再出現しないようにした。

01の波の速度・振幅・反射は維持。TypeScript確認成功。拡大・HOME表示で白線の抑制、柱・手すりの維持を確認。選択された動きは01、白線調整後の外観はプレビュー確認段階。本番への反映なし。
