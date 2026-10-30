# 奇襲の墓地経由演出を修正

ユーザー指示: 奇襲の使用後、リフト演出の前に墓地へ移って見える挙動を修正し、本番へ反映。

## 原因と変更

奇襲の reducer は自己除外まで解決しているが、先行する `playSpell` の行き先を `discard` のまま返していた。controller はまず墓地へ着地し、その後 removed 差分からもう一度リフト演出を再生していた。

- `client/src/shared/engine.ts`: 奇襲の効果解決後、同じ UID が実際に removed に入った場合だけ cast event を `vanish` に訂正。
- `client/src/game/controller.ts`: `vanish` の通常魔法も既存の保留・リフト終了経路へ接続。同じ公開カード面をダメージ処理中保持し、終了後に一度だけリフトへ送る。
- ダメージ、コスト、墓地反応、勝敗・自己除外のルールは変更しない。ダメージで試合終了し既存ルールが自己除外を行わなかった場合、通知も実際の墓地行きのまま。
- 現行のカード素材・呪文発動・双環の秘文の造形と共有タイミングはそのまま使用。

## 参照元と起動元

着手時の最新 `gh/main` / 本番配信元: `5839a8bd39128f80f1453a82e8ccc1ffbafdf7bc`。本番 Worker version `efab21c0-2b79-4700-8143-c8294bbc5a21` を read-only 取得して照合。

参照実装: 上記2ファイル、`client/src/ui/anim.ts` (`revealSpell` / `finishQuickSpell`)、`client/src/ui/riftScene.ts` / `riftInkScene.ts`、`client/src/dev/cosmeticStudio/board.ts`。品質基準は `docs/animation-quality-benchmark.md` / `docs/vfx-art-direction.md`。

起動元: `/Users/hiromaru05s/.codex/worktrees/ambush-rift-direct/LORE_TCG/client`。
URL: `http://127.0.0.1:5589/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1`。
Desktop の既存未コミット変更を保持し、最新 main の専用 worktree で作業。

## 検証

- `tests/quick-playback.mjs`: 実 reducer → controller の奇襲回帰テストを追加。両陣営 × 通常・シールド・相手致死・自己致死・発動条件外の10ケース。既存同名リフト記録があっても今回の UID を使用、墓地経由なし、追加の差分除外なし、HP演出後に一度だけ退出を確認。既存 quick / multi-pending / effect ordering 検証も成功。
- 型検査と本番ビルド成功。
- `tests/ambush-rift-browser.mjs`: 採用済み実盤面・実 controller を用い、PC 1280 / mobile幅 390 × 両陣営の4ケース成功。墓地への奇襲表示0回、リフト演出1回、同じカード面、リフト到着、残留DOMなし、ブラウザエラー0。
- 機能検証とは別に連続録画の時系列画像を目視確認。墓地への着地と再出現がなく、保持した奇襲から現行リフト吸収・軌跡へ続くことを確認。新しいVFX案の品質承認ではなく、既存採用演出の接続修正。
- `qa/` に結果と連続フレーム。元動画・スクリーンショットは `/tmp/lore-ambush-rift/`。

ブラウザ fixture による確認であり、認証済みPvP、実機FPSの検証ではない。本番公開結果は別記。
