# 本番公開の確認

- 本番: https://yourlore.xyz
- 公開ソース: `43cb0e4c39cf6ba7e6c8bacb48893b95ba9022ae`。今回の実装・検証commit `34f8fb12` / `210b692b` / `3c450e57` を含む。
- Worker version: `a72b60a0-ca9e-4f79-88cc-dfe276be973f`、100%配信。2026-10-23 15:15:47（Asia/Seoul）。
- 自タスクの `3c450e57` に対する型チェック、201/201 production suite、ビルドは成功。公開直前にmainが更新されたため、この版の公開はdeploy guardが停止した。
- 最新main `43cb0e4c` の別作業のguarded releaseが今回の変更も含めて公開。該当リリースのsnapshotからビルド成果物を読み取り専用で取得し、公開HTML/JS/CSS/JSON 125ファイルのSHA-256一致を確認。
- 公開URLのブラウザ検証: 28抽選fixture、20画面/種別チェック、家具10系統、全スリーブ、3エフェクトの時間変化、エラー0。通常演出→10件一覧、スキップ、低減モーション、履歴、拡大、戻る、Escape、追加購入なしを確認。
- 1280×720では10件を5列×2段で同時表示。小さい画面では2列でスクロール。カードのフレーム、モンスター/魔法の種別、家具とスリーブの形、エフェクトの装着見本を画像で確認。

証拠は `qa/production-deployment.json`、`qa/production-parity.json`、`qa/browser-production.json`、`qa/production-1280.png`、`qa/production-390.png`。ブラウザではAPIの確定結果をfixtureで供給し、実際に配信されたアプリと素材を使用。実アカウントの残高を消費する抽選は実施していない。
