# ドロー中の裏面の変色修正

参照: gh/main `b7bdb6bb`（本番app source `6b47faeb`と同一）。作業元はfinal-backend-performance-audit管理worktree。元のDesktop checkoutは変更していない。

## 原因と修正

`paperDraw.ts`の「縁の光」用DOM planeが、実際にはカード表面のほぼ全域を水色`#98ddff`・最大opacity 0.7で塗っていた。マスクは外周だけでなくカード面を含み、backfaceも表示されるため、引き上げ時に元の濃い裏面が水色へ変色する。実盤面を同じドロー時刻で停止し、このplaneだけを非表示にすると裏面が本来の色に戻ることを確認（before）。

全面を塗るplaneを削除。裏面画像・スリーブ固有の演出・WebGLの細い縁の光・厚み・移動/回転・着地タイミングは維持。

## 検証

- `tests/draw-back-color-browser.mjs`: 実board/controller＋state fixture。自分/相手、1280/390pxの持ち上げ途中で色被せなし・裏面画像あり・相手の表面情報なし。通常速度の再生と終了後の資源解放も成功。qaの録画・画像・report参照。
- `tests/draw-hand-tone-browser.mjs`: 飛行中の表面色、着地後の支払い/条件表示、既存手札の色、連続着地、abort/resize/skip/reduced motion、相手の秘匿が成功（qa/hand-tone.json）。
- `tests/solid-draw.mjs`: 山札の射影・移動・厚み・着地位置・中断が成功。
- 目視: 修正前は裏面全面が水色、該当planeのみ非表示および修正後は元の濃い裏面。新しいVFXデザインへの変更ではなく、色の不具合を除去した。ローカルfixtureの描画確認であり、認証済み本番対戦の証拠とはしない。

本番公開・公開後確認は下記に追記する。
