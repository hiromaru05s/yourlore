# 永続魔法・クエスト7枠とLvネームタグ

## 変更

- 永続魔法・クエストの共用領域を最大7枠に変更。旧罠も同じ枠数に含む。
- キャラクター右側〜デッキ下に横1列。デッキを少し中央へ移動し、相手手札も列を覆わない位置へ調整。短い画面では閉じた手札のみ空きスペースへ縮小し、展開時の大きさは維持。
- 両者の銘板をマナ水晶のトレイ上辺へ接続。別の数値カウンターを除いた実モデルの幅に一致させる。画面高による上下切替は廃止。
- タグ内は「Lv.＋名前」。称号の別行は廃止。オンラインは対戦開始時の公開プロフィール、ローカル自分側はログイン中のレベルを使用。NPCなどレベルがない相手には値を捏造しない。
- ルールブック、実習本文、短い案内、ルールノートの上限説明を更新。本文・ノート・ルールブックは日本語・英語・韓国語を同期。
- クエストを数えていなかった「ギルドの情報網」の生成経路と、Botの固定14枠判定も修正。

## 参照・プレビュー

開始時の最新gh/main: `9dcf3ec09`。銘板の採用実装: `e5a8c53fd`。
実装: `client/src/ui/boardView.ts`, `client/src/ui/boardProjection.ts`, `client/src/ui/readingBoardLayout.ts`, `client/src/styles/duelNameplate.css`。
起動元: `/Users/hiromaru05s/.codex/worktrees/nameplate-board-1119/LORE_TCG/client`
可変サイズ: `http://127.0.0.1:5473/nameplate-board.html?count=7`
固定1920×1080（縮小なし）: `http://127.0.0.1:5473/nameplate-1920.html`

最新BaseController/GameView、共通CSS、3D盤面、実素材を使用。永続魔法5枚＋クエスト2枚のローカル検証状態。Nキーで銘板表示切替、7キーで7枚、4キーで4枚。右クリックで詳細。

## 検証

- `npm run typecheck` / `npm run build`: 成功。
- `node tests/seven-spell-slots.mjs`: 両陣営・魔法/クエスト混在で7枚目成功、8枚目拒否と手札/マナ保持、満杯時の通常魔法、生成魔法、3言語ノート。
- `node tests/duel-ui.mjs`: 7枠、Lv表示など。既存JSDOMのCanvas/showModal未実装の診断は残るため、ブラウザでの表示・詳細表示も別途検証。
- `node tests/tutorial-academy.mjs`: 36実習・66シーン。
- `node tests/seeker-book.mjs`: 3言語・41ページ。
- `node tests/incubator-trade.mjs`: 孵卵器の満杯時など。
- `tests/seven-spell-slots-browser.mjs`: 1920×1080、1440×900、1280×720、1366×768、390×844、844×390。7枚が1列、銘板/肖像/デッキ/閉じた手札との非重複、クエスト詳細、長い名前とLv表示。

この作業はローカル実装とプレビュー。本番配信および進行中の部屋の移行は未実施。旧状態に8枚以上が保存されていても勝手にカードを削除しない。
