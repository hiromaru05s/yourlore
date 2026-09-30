# B/C監査項目への対応（2026-09-30）

前回のB18件/C4件、計22件を判断対象にした。A8件の修正を保持し、共有mainの未コミット変更は取り込まず、隔離worktreeで作業した。進行中の他タスクには変更範囲を共有した。

今回新規対応14件、既存対応3件、部分対応3件、今回は変更しない2件。下表は分類時のIDを維持している。負荷試験や実端末での全条件保証を意味しない。

| ID | 判断・対応 | 状態 |
|---|---|---|
| B01 | 認証POSTはIPごと30回/分、問い合わせは5回/分。Workers Rate Limit bindingを使い、本番とstagingのカウンターを分離。JSON本文32KiB、既知文字列・booleanの型と長さを制限。正確な全世界共通quotaではなく地域ごとの濫用抑制。 | 対応 |
| B02 | API入口でnull/配列/型不正/過大本文を400/413として拒否し、業務handlerへ渡す前に検査。入力なしのPOSTは空objectとして扱う。deck等の構造は既存の専用検査を保持。 | 対応 |
| B03 | フレンド招待IDから一意のroom IDを決め、provisioningをDBへ保存。並行承諾・応答喪失後の再試行でも同じroomを使い、setup失敗は成功扱いしない。 | 対応 |
| B04 | 同一アカウントのqueue接続を一意にし、pairing/matched中の再queueを拒否。60件/10秒のWS制限とsetupのHTTP status検査。既存の対戦中に別経路から新対戦を始める機能全体の排他ではなく、queue内の排他。 | 対応 |
| B05 | room保存とalarmをawaitし、失敗を無視しない。未保存状態をbroadcastせず、メモリ状態を破棄して次回storageから復元。固定名の障害logを出し、alarm再試行はプラットフォームへ伝える。 | 対応 |
| B06 | 異常に大きかった前面VFX/ドラッグz-indexを127/135へ統一。modal150、カード拡大250の下。カード面・動作・タイミングを変えず、連続攻撃/同時発動/縦横viewportで比較。 | 対応 |
| B07 | 通常API・画像decode・フォント待ちに20秒の上限。APIはabort、画像は失敗cacheを捨て再試行可能にし、読み込み画面取消時は待機を解放。 | 対応 |
| B08 | 前セッションの静止描画cache、遅延gameロード、画像最適化を保持。 | 既存対応 |
| B09 | `npm run test:production`で現在有効なNode回帰を一括実行。v47/v49は古いルールの履歴として明示、ブラウザ試験は別枠。現行の音声cue・WebP・ページ分割・DOM環境にテストを更新。 | 対応 |
| B10 | Vite 7 / Wrangler 4へ更新、jsdomを開発依存へ移動、transitive修正版をlock。別worktree専用node_modulesで確認し、他セッションの依存は変更しない。 | 対応 |
| B11 | CI定義は導入用ファイルとして保存（GitHubのworkflow権限不足で追加拒否）。配信コマンドは全worktree共通lock、最新gh/mainとの完全SHA一致、追跡ファイルの変更なしを要求。commitから隔離snapshotを作りnpm ci→型検査→回帰→build、直前にmainを再確認する。生のwrangler実行や別PCまで強制する仕組みではない。 | 部分対応 |
| B12 | bootstrap schemaへfurnitureを追加。空DBからgetUserが成功する回帰。既存DBへの不要なALTERは実行しない。 | 対応 |
| B13 | Workers logsを有効化し、保存/alarm/queue失敗を固定event名で記録。socket handlerの例外をJSON破損と一緒に握り潰さない。自動invocation URLログは無効化し、本文・cookie・tokenを独自ログへ出さない。通知先/SLO、同時接続負荷、region/DB障害復旧訓練は未実施。 | 部分対応 |
| B14 | OAuthクライアント・メール送信のstaging設定とE2Eは未実施。本番secretを流用せず、実配送先・callback設定の確認が必要。 | 今回は変更しない |
| B15 | 固定URLの画像/音声をmax-age=0,must-revalidateへ。hash付きJS/CSSはimmutableを維持。既に端末へ保存された旧7日cacheは遡って消せないため、旧cache期限/再読み込みの制約は残る。 | 対応 |
| B16 | 前回のWebSocket型・サイズ検査を保持し再検証。 | 既存対応 |
| B17 | 前回の未設定管理secret拒否を保持し再検証。 | 既存対応 |
| B18 | 終局roomの自動削除は追加しない。保存期間・再接続・将来の対戦参照要件が未決定で、既存データを任意の期限で消す変更は行わない。 | 今回は変更しない |
| C01 | same-origin運用ではCORS許可headerを出さず、wildcard+credentialsの不整合を解消。明示APP_ORIGINを設定する用途は保持。 | 対応 |
| C02 | 共通modalへdialog/aria-modal/見出し参照、初期focus、Tab/Shift+Tabの循環、閉じた後のfocus復帰。confirmのEscapeは取消。必須選択をEscapeで勝手に確定/破棄しない。 | 対応 |
| C03 | 今回の通信・入力・制限・ルーム準備エラーを日英韓で表示。全API既存文字列の統一とメール本文/認証ページの多言語化は未完了。 | 部分対応 |
| C04 | 公開buildのsource mapを無効化、table-previewはLORE_BUILD_PREVIEW=1を明示した時のみ生成。開発previewソースは削除しない。 | 対応 |

## 対応しなかった部分と理由

1. **B11: GitHub CIの有効化** — 現在のpush用トークンにworkflow scopeがなく、GitHubがworkflow追加を拒否。 [導入用CI定義](production-checks.yml) を残し、配信ガードとローカル一括回帰は有効化済み。
2. **B13: 監視通知・負荷/障害復旧訓練** — 通知先、同時接続数、許容遅延/復旧時間が未設定。loggingの改善だけで運用合格としない。実iOS/Android・長時間試験も別途必要。
3. **B14: stagingのGoogleログイン・実メール配送E2E** — 専用認証情報・callback・配送先が必要。本番の認証情報を試験用にコピーしない。
4. **B18: 終了済みroomの自動削除** — 未決定の保存期限を設定して既存対戦を削除しない。保持期間と必要な参照用途を決めた後、対象を限定した削除処理を追加する。
5. **C03: 全API/メール/認証ページの完全多言語化** — 今回は運用上必要な新規エラーを翻訳。メール配送設定と合わせて実画面・文面を確認する作業が残る。

## 検証と境界

- [障害・並行操作回帰](evidence/regressions.json)、[ブラウザ操作/待ち時間](evidence/browser/report.json)、[レイヤー](evidence/layers/report.json)、[配信ガード](evidence/deploy-guard.json)、[依存監査](evidence/npm-audit.json)。
- `tests/production-suite.json`は現行/履歴/ブラウザの区分を明示。古い試験を成功扱いしたり、現行ルールを旧期待値に戻したりしていない。
- 見た目と機能は別評価。今回のVFX変更は重なり順だけで、新規造形/演出は追加していない。モーダルの下へ移ることと資源解放を確認し、全カード演出の美術品質を認定したものではない。
- [Cloudflare Rate Limiting仕様](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)、[Workers Logs設定](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) を確認して設定した。
- CIのbranch protection/必須check設定、外部からの生のwrangler配信禁止はこのリポジトリ内変更だけでは強制できない。

配信SHA、統合SHA、実ステージングの結果はrelease.jsonとevidenceへ追記する。本番配信は行わない。
