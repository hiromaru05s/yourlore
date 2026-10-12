# 反撃の構え — 4案 / 2026-10-12

選定用の独立プレビュー。[開く](http://127.0.0.1:5469/counter-four.html)

予備動作は全案700ms。①鋼弓の返し（弾性曲げ）、②片刃の切り返し（片側ピボット）、③逆流の脈動（液膜）、④折翼の反攻（二面の折り畳み）。同一の配色で動作・主形状の違いを比較する。

通常速度 / 0.5倍 / 0.25倍、4案同時 / 拡大 / 実盤面、白 / 暗背景、実盤面の両陣営 / 3枚同時、低減モーション、シーク・停止・カード変更。騎士・デーモン・ミミック・選りすぐりの騎士の公開カード面を使用する。

```sh
node node_modules/vite/bin/vite.js --config client/src/dev/counter-four/vite.config.mjs
node node_modules/typescript/bin/tsc --noEmit -p client/src/dev/counter-four/tsconfig.json
node node_modules/vite/bin/vite.js build --config client/src/dev/counter-four/vite.config.mjs
node client/src/dev/counter-four/check.mjs
```

## 構成と境界

- `client/src/dev/counter-four/renderer.ts`: 曲げ・片軸捻り・波動・二面折りを独立した変形で描画。カード面と表面処理を同一メッシュへ投影。Canvas 2D、GPUコンテキストの追加なし。
- `surface.ts`: 実カードDOMの絵・フレーム・数値、パッシブSVGをキャプチャ。12%余白を正確に除いて寸法を一致させる。
- `motion.ts`: 700msの最終姿勢が既存の`attackPose(180ms)`につながる。通常攻撃の予備動作180msを二重挿入しない。
- `board.ts`: 実際のGameView/盤面/DOMMatrix投影を使用する固定状態fixture。対象の表裏や秘密情報は読まない。非表示・表示切替・初期化・終了時に元カードを復元する。
- 本プレビューは反撃のゲームイベント追加、致死時のイベント順序変更、オンライン対戦、音の接続を含まない。倒されても反撃する仕様への採用は、破壊前の公開カード面を保持するイベント設計が別途必要。
- 既存の通常ゲームコードを変更していない。4案は未選定、ステージング・本番へ未デプロイ。

## 研究・レビュー

[制作前調査](research.md)に、他セッションのフィードバック、一次資料、承認済み動画の観察と今回への翻案を記録。

`qa/comparison.png` は変形途中、`qa/browser-desktop.png` / `qa/mobile.png` / `qa/mobile-dark.png` は比較UI、`qa/board-*.png` は実盤面。`qa/comparison-playback.webm` は前半が通常速度2回、後半が0.5倍速1回の連続再生。`qa/report.json` は境界姿勢と座標計算、`qa/browser.json` は実ブラウザの復元・陣営・表示幅検証。描画命令の時間と実機FPSは別物として記録する。

見た目の自己レビューでは、カードと表面の追従、主要な動きの相違、輪郭・影のはみ出し、700ms→返撃へのつながりを見る。機能検証の成功は、ユーザーの品質承認や商用ゲーム同等の保証ではない。

## 最終確認

- 実ブラウザ: 両陣営×4案、3枚同時、終了・中断で隠したカード0枚へ復元、390pxで横はみ出しなし。カード4種の切替、OS低減モーション時の自動再生停止、4案目までのスクロール、スマホ相手側の3枚同時を確認。最新`browser.json`はconsole error 0、`final-browser.json`はpage error / HTTP失敗0。
- 700msの接続: 699.99msと通常攻撃180msの姿勢差が0.001未満。描画座標の有限性と開始・終了の面復元を確認。
- 自己レビューで修正: 透明領域への矩形陰影、パッシブアイコンの欠落、弱すぎる①の曲げ、ページ下部のクリップ、faviconの404を解消。
- 4案の同時描画: 共有されたローカル環境の同じ計測コードで、CPU描画命令生成の平均を23.99msから4.90msへ削減。静止面は画像の直接描画、曲げに必要な方向だけを細分化。GPU実行時間・実機スマホFPSの保証ではない。最悪フレーム81.8msは記録に残す。
- 見た目: 実盤面・白/暗・通常速度/低速の連続キャプチャを確認。①弾性、②片側の姿勢、③逆流、④折面の差は保った。4案の最終選定・品質承認は未取得。
- 対象プレビューと実盤面の依存を含む型検査、専用Viteビルド、`git diff --check`は成功。ゲーム盤面を読み込む既存の大きなchunkの警告は残る。
