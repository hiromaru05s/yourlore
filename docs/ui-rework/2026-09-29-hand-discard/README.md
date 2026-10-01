# 手札上限の墓地ドラッグ案内

2026-09-29 修正。追加のユーザー指示により統合担当経由で https://test.yourlore.xyz へ公開済み。公開ソース1157300、Worker version 366ec090-a02a-4b9e-b3fb-b1092746a3e8。配信された手札描画処理・handDiscardソースと今回の検証済み実装の一致、およびシェルフ強調CSSの存在を確認（staging-verification.json）。

- handCap選択中はプレイ可否と分けて手札をフルカラー表示し、操作不可カーソル・吹き出しを解除。
- 手札を自動展開。カードの縁と墓地シェルフを水色で強調し、ドロップ先を明示。
- ドラッグ中の複製元は非表示にし、保持するカードはフルカラーを維持。
- カードの飛行アニメーションそのものは変更していない。今回の見た目確認は静的な操作案内の可読性であり、VFX品質の承認ではない。

検証: npm run typecheck 成功。tests/hand-discard-browser.mjs 成功（1280×900のマウス、390×844のタッチ・低減モーション）。実コントローラーとエンジンで、0マナ時の色、ドラッグ取消、残り3→2→1枚、キーボード完了、後処理を検証。画像を目視確認。

既存 tests/duel-ui.mjs は102行の #hpbar-me 参照で失敗。今回編集していないHP表示とテストの不一致であり、全体テスト合格とはしていない。

再実行: Viteを起動後、LORE_TEST_URL=http://127.0.0.1:5283 node tests/hand-discard-browser.mjs （既存の /tmp/lore-opening-tools Playwright を使用）。
