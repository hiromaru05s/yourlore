# 星砂箔 — ガチャ報酬への採用

ユーザーは `card-sheen-triptych` の02「星砂箔」第2稿を採用し、ガチャ仕様変更と星晶の刻面を進める別セッションとの統合、merge/push/stagingを指示した。

## 採用した素材

145個のカット結晶、49箇所の時間差反射、17箇所の重なる輝点を含む第2稿をそのまま独立した描画関数へ抽出。初稿の弱いスクリーン合成へ戻さず、通常のsource-overで絵柄に明暗を残す。描画位置・周期・色・大きさは選択済みの第2稿を保持。

`client/src/ui/cardFinishStardust.ts` は素材のみ描画する。アート窓clip、縁（STARDUST_FINISH_EDGE）、文字と数値より下の配置、所有者／装備判定、時計、低減モーション、破棄は共通エフェクト基盤が担う。未採用01/03は実装に含めない。

## 共同リリース

ガチャ/API/デッキ別装備/通常runtimeは `codex/crystal-gacha-deck` が統合担当。スターター92.5%、装飾用空結果7%、エフェクト合計0.5%を維持し、星晶・星砂・虹彩の薄膜の3種を同一報酬枠で均等抽選する。最終ステージング状態は統合担当のリリース証拠で確認する。

## 抽出検証

Chromiumで採用第2稿と抽出後を通常面256×400／盤面256×256、時刻5種、seed2種の20条件で比較し、縁を含め全画素一致。外側の透明領域、canvas状態の復元、無効入力のno-opも確認。strict TypeScript検査通過。採用時の連続再生・実盤面レビューと、今回の描画抽出検証は別の証拠として扱う。実ゲームの装備・所有・ライフサイクル検証は統合担当で行う。

再実行: `PLAYWRIGHT_MODULE=/absolute/path/to/playwright node docs/releases/2026-10-15-stardust-gacha/qa/check-painter.mjs`（Chromeおよび既存esbuildを利用）。`qa/approved-preview.ts.txt`は選択された比較試作の凍結参照であり、通常runtimeへ配信されない。
