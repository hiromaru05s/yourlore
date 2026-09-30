# LORE プロダクション品質監査（2026-09-30）

判定: **Aの修正を含めても、無条件に本番品質へ合格とは判定しない。** 認証・対戦・演出の検証で確認できた範囲と、未実施の負荷/実端末/OAuth・メール/障害復旧を区別する。これは全ての未知バグが存在しないことの証明ではない。

基準: main `9d6221f7`（配信runtime `97dc64e8`）。隔離branch `codex/production-audit-20260930`。最終統合・配信SHAは [release.json](release.json) を参照。

- A: 進行不能、不正対戦、非公開情報漏れ、ゲーム/残高データ破損。今回自律修正。
- B: 公開前に改善・追加確認すべき堅牢性、レイヤー、性能、テスト、運用。静的指摘は実再現と区別。
- C: 品質・保守性・アクセシビリティの改善。

## 全件一覧

A 8件 / B 17件 / C 4件、計29件。詳細は機械可読な [findings.json](findings.json) にも保存。

### 緊急度A

| ID | 問題と影響・対応 | 状態 | 根拠 |
|---|---|---|---|
| A01 | **内部ルーム作成処理を公開URLから実行できる**<br>公開ルーム下位パスへPOSTすると任意の参加者・seed・ranked条件で作成できた。入力経路を単一IDのWebSocketに限定し、setupは完全一致・POST限定・一度だけにした。<br>`server/src/index.ts; server/src/gameRoom.ts` | 修正・ローカル回帰成功 | security-before.json / security-after.json |
| A02 | **非公開の手札・山札順を物理UIDで復元できる**<br>HIDDENでもUIDがrevealedCardsと一致し、既知カードの手札位置・次のドローを追跡できた。非公開ゾーンを匿名スロットUIDにし、正当な手札/山札閲覧効果は実UIDを保持。<br>`client/src/shared/protocol.ts` | 修正・ローカル回帰成功 | security-before.json / security-after.json |
| A03 | **必須選択が残るとサーバーの時間切れでもターンが終わらない**<br>oppMon/myMon/giantShop等のキャンセル不可選択をnullで消せず10秒ずつ永久延長。実エンジンで合法対象を順に解決し、対象消失時も期限を閉じる。手札上限は既存の右端破棄を維持。<br>`server/src/gameRoom.ts; server/src/gameInput.ts` | 修正・ローカル回帰成功 | security-after.json / final-dew-shield-server.log |
| A04 | **BOTの攻撃中に人間の防御選択が拒否される**<br>WORLD_TREE_DEFENDのownerは人間でもcurはBOT。LocalControllerがcurのみで判定していた。actingSideで選択権を判定し、通常の手番外操作は拒否する。<br>`client/src/game/controller.ts` | 修正・ブラウザ回帰成功 | runtime/report.json |
| A05 | **呪い反応中の永続魔法が墓地と場に二重存在する**<br>HEXER3が呪いを墓地末尾に追加した後、discard.pop()が魔法ではなく呪いを削除。魔法のUIDで移動させ、生成された呪いを保存する。初回seed 32/168/171で検出。<br>`client/src/shared/engine.ts` | 修正・ローカル回帰成功 | duplicate-uid.json / security-after.json / engine-first-pass.json |
| A06 | **報酬の残高更新失敗で未払いのまま取得済みになる**<br>取得記録と加算が別commit。加算失敗後は再試行しても0。記録と加算をD1 batch内で確定し、重複支払いも防ぐ。<br>`server/src/rewards.ts` | 修正・障害注入成功 | security-before.json / security-after.json |
| A07 | **クーポン上限超過と失敗時の永久未払い**<br>在庫の事前SELECTと消費が別処理なのでmax_uses=1でも並行2件が200。消費資格をtransaction中に再確認し、claim/残高/使用数を同時確定。<br>`server/src/rewards.ts` | 修正・並行/障害注入成功 | security-before.json / security-after.json |
| A08 | **未ログイン接続がカジュアル対戦枠を消費できる**<br>匿名queueは参加できるがroomはログイン必須。認証済みの相手まで成立しない対戦へ送られる。queueも認証必須に統一。<br>`server/src/index.ts; server/src/matchmaker.ts` | 修正・ローカル回帰成功 | security-after.json |

### 緊急度B

| ID | 問題と影響・対応 | 状態 | 根拠 |
|---|---|---|---|
| B01 | **ログイン/登録・匿名問い合わせに十分な濫用制限がない**<br>ログイン試行回数・最大入力長/IP制限なし。問い合わせはログイン時だけ10件/時。メール再送には60秒制限がある。アプリ外WAFの保護は未確認。<br>`server/src/auth.ts; server/src/index.ts` | 未対応 | ソース確認 |
| B02 | **REST入力の型不正が400ではなく例外になる**<br>email/q等を型検査せずtrim。数値/配列/nullのpayloadに対する統一バリデーションと上限がない。<br>`server/src/auth.ts; server/src/social.ts` | 未対応 | ソース確認 |
| B03 | **同じフレンド対戦招待の並行承諾で別ルームができる**<br>pendingをSELECT→room作成→UPDATEするため、二重承諾を原子的に取得していない。claim状態/同一roomIdと再試行設計が必要。<br>`server/src/social.ts` | 未対応・並行成立の静的指摘 | ソース確認 |
| B04 | **マッチング成立中の再queue・複数タブの排他が不足**<br>pairのawait中に同じsocketを再queue可能。アカウント単位の一意待機/対戦予約、flood guard、setup応答status確認がない。<br>`server/src/matchmaker.ts` | 未対応・負荷試験未実施 | ソース確認 |
| B05 | **進行中の永続化/アラーム失敗を黙って捨てる**<br>persistや一部setAlarmがcatchで無視される。障害後の状態整合性・再試行・通知が不足。結果精算には別途再試行があり既存回帰は成功。<br>`server/src/gameRoom.ts` | 未対応 | final-lounge-settlement.log / ソース確認 |
| B06 | **前面VFXと確認ダイアログのレイヤー優先順位が逆転**<br>VFX=2147483647、overlay=150。確認画面が表示されてもVFXは上に描かれる。pointer-events:noneにより操作は可能。UI・選択・結果・VFXの共通レイヤー規約が必要。<br>`client/src/ui/monster/layers.ts; client/src/styles/base.css` | 実盤面で確認・未対応 | layers/report.json / layers/dialog-during-vfx.png |
| B07 | **画像/通常APIの待ち時間に上限がなく読み込みで止まり得る**<br>decode/fetchの大部分にtimeoutなし。失敗応答では再試行UIが出るが、応答しない通信はPromiseが完了しない。切断中の再開・キャンセル試験が不足。<br>`client/src/ui/assetReadiness.ts; client/src/net/api.ts` | 未対応・静的指摘 | ソース確認 |
| B08 | **静止カード再描画と起動画像/JSの負荷**<br>基準SHAでは静止カードにも常時RAF、DOM計測/Canvas消去。main JS約1.10MB raw。別セッションが最適化中で、こちらでは未完成変更を取り込まない。<br>`client/src/ui/monster/runtime.ts; client/src/ui/menuAssets.ts` | 別セッション対応中・最終SHAで再確認 | build.log / 他タスクの現行worktree |
| B09 | **現行回帰と過去仕様テストが混在し全体テストを一括実行できない**<br>46本の自動抽出試験で41成功/5失敗。v47/v49は後続ルールとの差分、ceremony音声集合の差分、DOMグローバル不足、旧固定パス。deck試験の旧BOT導線は今回更新して成功。<br>`tests; package.json` | deck導線のみ修正・残り未対応 | baseline-tests.json / 各失敗log / deck-browser-fixed.log |
| B10 | **依存パッケージに既知の脆弱性**<br>npm audit全体9件（high7/moderate2）、omit-devはundici high1。後者はjsdom由来のNode用経路で、配信ブラウザ/Workerが脆弱機能を使用する証拠は未確認。依存分類の整理と更新が必要。<br>`package-lock.json` | 未対応・到達性を区別 | npm-audit-runtime.json / npm-audit-all.json |
| B11 | **CIと全セッション共通の配信排他・SHAガードがない**<br>リポジトリに.githubのCI定義なし。今回手動で最新main/配信versionを再確認するが、将来の古いworktree再配信を自動阻止する仕組みではない。<br>`package.json; scripts/deploy.sh` | 今回の配信では手動ガード | sha-matrix.json / staging-before.json |
| B12 | **初期DB作成コマンドだけでは現在のschemaがそろわない**<br>schema.sqlにfurnitureなし。db:initはschemaのみを適用し、現在のgetUserはfurnitureをSELECT。新環境は追加migration手順を要する。既存stagingはログイン成功。<br>`server/schema.sql; server/migrations; server/package.json` | 未対応・新規環境の再現性不足 | securityテストDB準備 / ソース確認 |
| B13 | **障害検知と運用上の合格証拠が不足**<br>observability設定なし。socketのJSON処理とonMessage例外を同じcatchで無視。エラー率/切断率/精算滞留の監視、同時接続負荷・復元訓練の証拠がない。外部設定は未確認。<br>`server/wrangler.toml; client/src/net/socket.ts` | 未対応・運用監査範囲の限界 | ソース確認 |
| B14 | **stagingでGoogleログイン/メール確認・再設定をE2E検証できない**<br>stagingのsecret名はAUTH_SECRETのみ。本番にはGOOGLE_CLIENT_SECRETとRESEND_API_KEYがあることを読取確認したが、実際のOAuth/配送は未検証。stagingの登録は自動認証扱い。<br>`server/src/oauth.ts; server/src/email.ts` | 設定/別途E2Eが必要 | secret値は収集・保存せず名前のみ確認 |
| B15 | **固定URL画像/音声の7日キャッシュと上書き更新**<br>/art,/ui,/sfxを7日キャッシュ。コメントは名前変更前提だが固定名を更新する運用も可能。既存ブラウザで旧素材が残るため内容hash付きURL/版管理を統一する。<br>`client/public/_headers` | 未対応・配信ハッシュ一致だけでは既存cacheを保証しない | _headers / final live hashes |
| B16 | **不正なWebSocket JSONでhandler例外**<br>null/action欠落/型不正を受理していた。型・サイズ・action引数を検査し、状態を変更せず破棄する。<br>`server/src/gameInput.ts; server/src/gameRoom.ts; server/src/matchmaker.ts` | 今回修正済み | security-before.json / security-after.json |
| B17 | **管理secret未設定時に文字列undefinedが認証値になる**<br>AUTH_SECRETが未設定の場合Bearer undefinedを比較していた。設定済みstaging/本番では再現しないが、新環境をfail closedへ修正。<br>`server/src/rank.ts` | 今回修正済み | security-after.json |

### 緊急度C

| ID | 問題と影響・対応 | 状態 | 根拠 |
|---|---|---|---|
| C01 | **CORSのwildcardとcredentials=trueの不整合**<br>現状同一originのため動作するが、別originのcredential付API用途では許可されない設定。不要ならCORSを削減し、必要ならallowlist化。<br>`server/src/auth.ts; server/wrangler.toml` | 未対応 | ソース確認 |
| C02 | **モーダルのキーボード/支援技術対応が不十分**<br>確認modalにrole/dialog、aria-modal、focus移動/復帰、focus trapの明示実装がない。主要フローをキーボードと実端末の支援技術で検証する。<br>`client/src/ui/modal.ts` | 未対応 | ソース確認 |
| C03 | **言語とエラーメッセージの統一不足**<br>API/メールは韓国語または英語が中心。日本語UIの翻訳マッピング外エラーと配送画面を点検する必要がある。<br>`server/src/auth.ts; server/src/email.ts; client/src/net/serverMsg.ts` | 未対応 | ソース確認 |
| C04 | **公開ビルドにsourcemapと開発用previewが残る**<br>sourcemap:true、table-previewを本番入力に含む。即時の秘密漏えいは確認していないが、公開用途を明示して配信対象を限定する。<br>`client/vite.config.ts` | 未対応 | build-fixed.log / ソース確認 |

## 検査範囲と結果

- サーバー: 認証/セッション、OAuth、メールtoken、招待、管理API、ソーシャル/フレンド対戦、デッキ/所持品、報酬/クーポン、matchmaker、GameRoom、rank精算と再試行。
- ルール: 現行DB 357定義×両side=714 smokeケース。前提条件により発動できないカードも含むため「全能力・全組合せ合格」とは数えない。200 seed対戦で有限値・非負mana・UID一意性・終局を検査。最終数値は [engine-audit.json](evidence/engine-audit.json)。
- 初回対戦でseed 32/168/171のUID二重存在を発見。原因はA05。初回結果は [engine-first-pass.json](evidence/engine-first-pass.json)、再現状態は [duplicate-uid.json](evidence/duplicate-uid.json)。
- 従来46本は41成功/5失敗。失敗を隠して成功扱いしない。[全結果](evidence/baseline-tests.json)。修正後の現行ルール/サーバー/精算/デッキ等16本は全成功。[結果](evidence/final-regressions.json)。
- A修正と付随する防御は [security-after.json](evidence/security-after.json) の独立チェック、[BOT防御選択](evidence/runtime/report.json) で確認。D1障害注入はSQLite adapterで、実CloudflareのDB障害を起こしたものではない。
- typecheck/build/art:check/text:check、staging dry-run成功。各logをevidenceに保存。

## アニメーション・レイヤー

- persistent field=16、portrait=18（数値UI=22）。PC1280、縦390、横844の配置で確認。手前VFXは独立root=2147483647、内部rear=1/cards=2/front=3。
- 通常再生・3回連続攻撃・両側同時発動・PC/スマホ・低減motion・abort/resize/skip/DOM除去/画面非表示・disposeを検査。モンスターと銀紋リフトはテストの終端で残留layer/resourceなし。
- ただしB06のとおり、modalに対する前後関係は未整理。その他全VFXを網羅的に同時発動した検証ではない。
- 機能テスト成功と見た目の基準達成は別。今回新規アートは制作していない。全既存演出が「銀紋の流墨」と同等品質であるとは判定していない。
- [連続再生動画](evidence/layers/continuous.webm)、[レイヤー結果](evidence/layers/report.json)、[モンスター結果](evidence/monster/browser-report.json)、[リフト結果](evidence/rift/browser-report.json)、[デッキ結果](evidence/deck/browser-report.json)。

## SHA・他セッションとの整合

- 共有checkoutの未コミット変更を監査へコピーせず、専用worktreeで修正。変更のない既存UI/VFXを古いbranchのtreeで上書きしない。
- [46 worktreeのSHA行列](evidence/sha-matrix.json) は祖先関係を記録。祖先でない9先端を「機能未反映」とは判定しない。過去の統合はcherry-pick/選択取り込みを含み、[既存feature matrix](../../releases/2026-09-30-integrated/feature-matrix.json) と現行回帰で確認。
- 描画・起動最適化タスクへ重複ファイル/配信競合の情報を共有。リリース直前のremote main・現行staging versionを再読し、統合してから配信する。
- 本番への配信は依頼範囲外で実施しない。本番secretは名前の存在だけを読取確認した。

## 検証限界

- ChromeでのPC/モバイルviewport試験。実iOS Safari/Android端末、長時間熱/メモリ、回線切替、数百同時接続、DB障害・region障害は未検証。
- 実認証/実API/実対戦のstaging検証は専用QAアカウントを使用。一般ユーザーとの公開queueや本番データは試験対象にしない。rank精算の並行性・重複/失敗再試行はローカルSQLite回帰で確認する。
- 過去に発生した未払いclaim、破損済みの進行中roomを一括補正する移行は実施しない。今回の修正は新しい操作での再発防止であり、過去の補正には対象データの追加調査が必要。

## 参照

- [Cloudflare D1 batchのtransaction/rollback仕様](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Durable Object State](https://developers.cloudflare.com/durable-objects/api/state/)
- [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
