# ターン通知① 採用記録

2026-10-02: 「１でいい。確定。」により紺影の魔眼＋還流の封印を採用。
追加指示により通常ゲームへの接続、push、main統合、ステージング公開を実施する。

- 登場～1500msは承認済み `veil` と同じ。1500～2320msは `recall`。
- `client/src/ui/turnSigil.ts` は採用形状のみ抽出。ギャラリーの画像ロードや未採用分岐を含めない。
- タイトルは既存翻訳、ターン番号は実値。controllerの初回開幕後／ターン切替の既存通知経路を維持。
- 再発動、fast-forward、controller退出、非表示、pagehide、外部DOM撤去、期限でCanvas・rAF・タイマー・リスナーを終了。
- 低減モーションは静止造形と90msフェード。入力を遮らない。

## 検証

`npx vite --config docs/vfx-prototypes/2026-10-02-turn-sigil-adoption/vite.config.mjs`

- `/docs/vfx-prototypes/2026-10-02-turn-sigil-adoption/verify.html`: 凍結した承認rendererとのピクセル比較、128条件すべて差分0。登場だけでなく閉じる全段階を含む。
- `board.html`: 現在のGameViewと実カードを使う固定盤面。両陣営、PC、390×844、閉じる途中、低減、通常の `anim.turnBanner` 再生と終了を確認。ブラウザエラー0。
- `tests/turn-banner.mjs`: 両陣営、翻訳、実ターン、置換、resize、低減、期限、非表示、pagehide、外部撤去、fast-forward、資源解放。
- `npm run typecheck` / `npm run build` 成功。回帰テストと公開証跡はrelease.jsonを参照。

見た目の採用判断はユーザー承認に基づく。検証用盤面は実ゲームUIを使うfixtureであり、認証済みオンライン対戦のE2E完走を意味しない。

## 統合範囲

専用worktreeを最新 `gh/main` から作成。通常コードは `anim.ts` の呼出・停止接続と、新規 `turnBanner.ts` / `turnSigil.ts` のみ。
共有mainに残るmimic-family／animation-reviewの未コミット変更は取り込まない。比較用rendererはdocs内に凍結保存し、通常bundleに含めない。

回帰テストの実行基盤: 既存チュートリアル検証は3言語の全ページ・全フィルタと報酬シナリオを実行する。単独で全assertionを完走したが、並行作業中に従来120秒を超えたため、このテストのみ300秒を明示設定。検証内容・assertionは変更しない。DOM環境では画面倍率を `window.devicePixelRatio` から取得する。
