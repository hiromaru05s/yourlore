# 対戦ネームタグ：01「蒼銀の銘板」

ユーザーが2026-11-18に比較案01を採用し、本番反映を指示。

- 基点：`db23af652b147129f89f6cce780b8d4a8a87b1f4`（取得時の最新gh/main）。
- 採用案のSVGから固定の名前文字だけを除去。深青の面・薄い銀青の面取り・斜線・菱形を維持。
- `client/public/art/ui/duel-nameplate-azure.svg`、`client/src/styles/duelNameplate.css` が意匠。`client/src/ui/boardView.ts` は実プレイヤー名を表示し、長い名前は省略・titleで全文を保持。
- `client/src/ui/boardProjection.ts` が投影後のマナ枠に名前を接続。スマホ縦では肖像とHPを避け、画面端に余白がない場合はマナ枠の反対側へ配置。称号の別行表示を保持。
- 標準UIは `docs/default-ui-design.md`、世界観は `docs/world-bible.md` を参照。

## 検証環境

起動元：`/Users/hiromaru05s/.codex/worktrees/nameplate-azure-1118/LORE_TCG`。
URL：`http://127.0.0.1:5449/nameplate-review`。最新ソースのBaseController/GameViewと実盤面・実素材を使用する一時的なローカルfixture。HTTP 200だけでなくブラウザ画像を確認する。

確認対象：1280×900、390×844、844×390、1920×1080。両陣営の名前、長い日本語名、称号付き。実ユーザーのオンライン対戦は対象外。
