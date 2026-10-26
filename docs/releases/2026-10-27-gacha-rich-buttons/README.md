# ガチャの残高確認と専用ボタン

2026-10-27のユーザー追加指定。基準main `538b3b48`、実装 `client/src/ui/shopGacha.ts`、`client/src/screens/shop.ts`、`client/src/styles/shopGachaTable.css`。既存のカード扇、背景、共通パネルを維持。

- 引き直しのYES/NOに「現在 → 消費後」のシャード残高を表示。直前のサーバー応答で更新された残高から今回の費用を差し引く。未確定の重複還元は抽選後の加算と明記。
- ガチャの成功時に「購入が完了しました。」を表示しない。エラーと購入結果の回復導線は維持。
- 1回と10回だけ共通ボタンの外観から除外。銀青と古金の金属縁、濃い面、カードの線画、大きい回数と消費シャードで構成。ボタン寸法・位置と購入処理は維持。狭いボタンでは線画を省き、文字と価格を優先する。
- 確認ダイアログとYES/NOはデフォルトUIを使用。専用ボタンの例外を `docs/default-ui-design.md` に記録。

## 確認

- 起動元 `/Users/hiromaru05s/.codex/worktrees/gacha-result-flow/LORE_TCG`、`http://127.0.0.1:5548`。現行の実ショップにAPI fixtureだけを接続。
- 型チェック成功。
- `tests/gacha-rewards-browser.mjs`: 1回/10連の残高（還元後の99,050→98,050、97,050→96,950）、NO/Esc、YES連打の一回処理、残高不足、非遷移の結果、購入通知非表示、カード位置不変、5サイズに成功。
- `tests/shop-gacha-preview-browser.mjs`: 5サイズの操作位置、カテゴリ、共通枠・背景、装着見本、低減モーションに成功。
- 1440×900、390×844、844×390の実画面を目視。回数と価格、銀青/金の区別、枠の欠け、確認画面の残高を確認。見た目は今回の指示に対する実装判断であり、追加のユーザーによる見た目の承認とは区別する。
- 実購入と物理端末での確認は行っていない。

## 本番反映

2026-10-27 00:41（Asia/Seoul）、source `8a6921f3388548c5d43d36904b0912a1f5d7e186` を本番100%公開。Version `11e212e5-c80b-4702-8f0f-f2377ff1acea`。`deployment.json` に配信状態を記録。

既存のguarded deploymentで型チェック・237/237の必須テスト・ビルドに成功。本番URLで `tests/gacha-rewards-browser.mjs` も成功。公開された実JS/CSS/素材とfixture APIで残高のbefore/after、通知非表示、1回/10連、確認のNO/Esc/YES、連打抑止、残高不足、5サイズを確認。実アカウントの購入は行っていない。

本番配信のショップ画像と残高確認を目視し、銀青/古金の専用ボタン、共通枠、現行背景とカードを確認。`production-browser-report.json` と `production-confirmation.png`。
