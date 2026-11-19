# 基本アチューンの追加効果表示

対戦中の基本アチューンを拡大すると、通常の効果本文の直後に「追加効果（永続）」を表示する。アチューン研究・解析・秘訣などで付与された `PlayerState.attuneBonuses` を、所有者の状態から読む。手札には付与件数を表示し、デッキ・墓地・リフト一覧でも所有者を引き継ぐ。カード図鑑や関連カードのカタログ表示には対戦状態を付けない。

回復、シールド、雫、水晶、現在マナ、全体ダメージ、ミニ精霊、相手／自分の墓地への呪いを日・韓・英で表示。連続した同一効果のみ `×N` にまとめ、付与順と1回ごとの量を保持する。元のカード定義やゲーム処理は変更しない。

## 参照実装とプレビュー

- 初期参照: `d3ca461a7`。最新main `10bf25e0e` を取り込み、手札の拡大率・ドラッグ更新を維持。
- 表示実装: `f419337cf` の `client/src/ui/attuneBonusRules.ts`, `cardView.ts`, `cardInspection.ts`, `boardView.ts`, `modal.ts`。
- 共通デザイン: 最新mainの `client/src/styles/game-overlays.css` と、`cardView.ts` が参照するカード原画・フレームをそのまま使用。
- 起動元: `/Users/hiromaru05s/.codex/worktrees/attune-added-effects-1120/LORE_TCG`、Vite `http://127.0.0.1:5633`。
- 実盤面ブラウザ検証: `tests/attune-added-effects-browser.mjs`。1280×900 / 390×844で、研究の実際のダイス結果、追加付与後の更新、デッキ／墓地からの詳細、相手所有者との分離、横方向のはみ出しなし、ページエラーなしを確認。両サイズの追加効果欄を目視確認。
- 機能検証: `tests/attune-added-effects.mjs`。3言語、両プレイヤー・両閲覧者、通信用状態のシリアライズ、重複と順序、不利な効果、未付与、カタログ分離を確認。production suiteにも登録。
- 実アカウント同士のオンライン対戦は今回の検証対象外。
