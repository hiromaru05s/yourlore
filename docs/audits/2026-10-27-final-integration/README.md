# 最終統合・BE/DB・性能監査（進行中）

- 初期参照: `f9f05fe5dec6d7162ede3ac271e6255447726260`（gh/main）。元フォルダの保存ブランチと88件のtracked変更は触らず隔離。
- 作業: `/Users/hiromaru05s/.codex/worktrees/final-backend-performance-audit/LORE_TCG`、`codex/final-backend-performance-audit`。
- ローカル表示: Vite dev `http://127.0.0.1:5488`、production preview `http://127.0.0.1:5487`。起動元はいずれも上記worktreeのclient。
- 他チャット（BOT強化・開始ボタン・ロード演出）が終了した後、最新mainと本番版を再照合して最終検証・本番反映する。10分監視はこのチャットのheartbeat `lore-be-db`。
- 現段階では本番未反映。これは最終合格・完了報告ではない。

## 初期DB/取り込み監査

本番のスキーマと現行コードのテーブル・カラムを照合し、欠落なし。今回の追加索引だけが未適用。`production-schema-baseline.json`参照。
ステージングは`ranked_recent_decks`と`ranked_match_decks`が欠落。0026/0027と今回の0028を最終統合検証前に適用する。
本番の初期deploymentは`1a6f23f3`由来でmainの祖先。ロード演出・開始ボタンの公開が進行中であるため、最終状態の再確認が必要。
以前の手札/Elfweave再利用最適化`770805da`はmainに未収録。現在の`boardView.ts`へ該当メソッドだけを移し、他の採用済み変更を維持した。

## 実装

- 空、不正形式、枚数不足のデッキ保存で既存プリセットを置換しない。旧クライアントの正常な8枚payloadと装備継承は保持。
- 在席通知はデッキ・所持品・EXPを含まない認証照合。同じメニューへの移動は追加heartbeatを送らず、低速時もリクエストを直列化。
- ランキングの参加資格確認をA/B別EXISTSと部分索引に変更。問い合わせのユーザー別時間検索にも索引。
- セッションのBOT初回クリア照会は既知の4キーを直接検索。Cookie名は完全一致。
- 通常/ランクのルーム作成失敗でsocketを1013 closeし、既存lobbyのbackoff再接続を発動。
- フレンド準備失敗は再試行可能な招待として残す。準備中も期限切れ・辞退・取消を扱い、取消とroom作成の競合で誤ったacceptedを返さない。
- 同時GETを共有し、完了後は再利用しない。書込み開始/完了で共有を無効化し、呼出し側ごとにデータを複製。個別AbortSignalは共有対象外。
- 起動時の認証をアプリコード取得と並行化し、本文を含む10秒deadlineで明示的な再読込経路を維持。管理画面コードは一般ゲーム起動時に取得しない。
- フォント宣言は同じファイル・同じcascadeのまま同一subsetのweightを近接配置。gzip圧縮改善。Brotliでは微増するため、すべてのブラウザで同じ転送削減とは扱わない。
- 相手の手札DOM/canvasをopaque UIDで再利用。Elfweaveは変わったtexture revisionだけを転写し、無関係なDOM更新では再走査しない。

## 得られた証拠（途中）

- 不正デッキ保存、旧payload互換、在席認証、Cookie境界、フレンド準備失敗/再試行/期限/取消競合、キュー失敗復帰をSQLite＋Worker関数で確認。
- 同時GET 3→1、メニュー移動heartbeat 7→1、通信の世代境界/失敗/取消を確認。
- 1,000人・12,000試合のローカルSQLite比較で順位結果不変、全件走査から索引検索へ。`query-performance.json`は本番D1レイテンシ計測ではない。
- 現行盤面の60回更新で相手手札の追加/削除ノード各540→0。120tickの袖転写840→420、無関係DOM変更による走査120→0。12時点のRGBA、10通りの配置が一致。`render-reuse/{before,after}.json`参照。Windows実機FPSではない。
- 初回production suiteには新ロード画像のesbuild解決失敗（別チャットで修正中）と、キュー失敗後も同じsocketを使う旧テスト前提の不一致。後者は実クライアント同様の再接続検証へ更新。
- 初回menuブラウザテストの100ms固定待機は、高解像度カードの再decode中を欠落として扱った。実ファイル存在を確認し、可視画像の完了を上限20秒で待ち、実際の所要時間を計測する方式へ更新。

## 追加検証

- 全体初回は233/240。4件はロード画像URLのbundle設定、1件は修正済みのキュー再接続前提、1件はBOT workerの途中結果/timeout前提、1件はdeck editor検証のtimeout。deck editor単独再実行は成功。全体最終実行は統合後に行う。
- OnlineControllerを通した両viewerの状態更新・相手play・draw・後片付けが成功。`render-online/report.json`参照。
- 全381カードを強制eagerにしていたgalleryの入場処理を修正。初期viewportのみ準備し、画面外336/341枚のlazy指定を維持。1280/390pxの可視カード欠落なし、末尾scroll・検索成功。ローカルViteでは2292/1294ms。API fixture、同時負荷が変動するため本番の短縮率ではない。`gallery-admission/report.json`参照。
- 公開guardにread-only DB contract検査を追加。必要table/column/type/indexが欠落すれば公開前に止まる。本番の実スキーマへの試行は、今回の未適用3索引を正しく検出。

- 追加migration0026/0027/0028をステージングに適用（2026-10-26T17:24 UTC頃）。変更はCREATE TABLE/INDEX IF NOT EXISTSのみ。remote schema contract検査成功。
- 最新採用main `b5295ad0`をmerge `549cc2d6`へ取り込み。HOME SVGのreadiness検証とgallery最適化の両方を維持。初回のURL解決4件・gallery/deck検証・型checkは成功。
- BOT workerのテストは、制限時間内の結果なら全探索と一致、期限到達なら最後の完了済み合法手を検証する現在の契約へ修正。Worker禁止時の安全な貪欲手も確認。再実行36ケース成功、timeout0。失敗時もworker/timerを閉じる。
- ビルド済みコードでauth500ms/main2000msの遅延を与え、authがmain取得中に完了、authリクエスト1回、admin chunk未取得を確認。`startup-overlap/report.json`参照。

## 現在の検証結果（2026-10-26 17:44 UTC頃）

- 統合commit `5c6451e5`で243/243 production tests成功。型check・buildも成功。`suite-integrated.json`参照。
- 本番依存packageのnpm auditは既知の指摘0（この時点のregistry結果。アプリ全体の無欠陥を保証するものではない）。
- 直接HTTP・5 Mbps・40 ms・1280x900の同条件比較。最適化前は758画像URL/15,776,100 bytes/27,556 ms、最適化後は165画像URL/2,382,082 bytes/5,417 ms。可視40枚の欠落なし。サービスワーカーを無効化した比較で、本番実測値ではない。`gallery-comparison/report.json`参照。
- built previewの6メニュー往復（1280/700px）成功、page error/HTTP失敗/可視画像欠落なし。`menu-integrated/report.json`参照。
- 本番`b5295ad0`の匿名ブラウザ起動・API認証境界も確認。これは今回のBE最適化の公開後検証ではなくbaseline。
- 元checkoutのtracked変更88件をread-only照合。25件はmainと同一、63件は異なり保全。異なる内容には旧版・試作が含まれるため、未採用案の一括mergeはしていない。BEのtracked変更は元checkoutにない。`original-checkout-inventory.json`参照。
- HOME開始ボタンとロード演出の2セッションは完了、本番反映済み。採用実装と公開記録は取り込み済み。BOT強化セッションは稼働中。

## 継続手順

1. 10分heartbeat `lore-be-db`でBOT `01a13092-ff36-7fa3-8488-52b169b874ea`と新規active LOREチャットを確認。完了済み2チャットの再稼働もlist_threadsで確認する。チャットへメッセージは送らない。
2. 自分が最後になったらfetch/merge最新gh/main。BOTのDB migration、NPC構築数とHOME説明、失敗時の再試行、BOT負荷とworkerテストを再点検。0028 migration名が衝突した場合は追加索引を別番号に整理する（索引はステージングへ適用済み）。
3. 元checkoutは変更しない。現在の管理worktree/branchを継続する。最終code検証後、fast-forwardでgh/mainへpushし、guardを使ってstagingへ公開。新しいDB追加migrationがあれば事前にレビューし適用。
4. `LORE_BACKEND_STAGING_OUT=docs/audits/2026-10-27-final-integration/staging-live.json node scripts/run-staging-audit.mjs`で本物のstaging API/D1/認証WebSocketを検証。runnerが一時accountを作成し、失敗時も削除・残存0確認する。今の時点ではlive QA accountはまだ作っていない。cleanup失敗時だけ表示されるprivate recovery fileでcleanupを再実行する。
5. 本番の3索引は未適用。最新schema・deployed SHAの祖先関係・activeチャット・shared deploy lockを再確認し、追加migrationを適用後、`npm run deploy`（guard）で公開。guardの迂回や他セッションのlock削除は禁止。
6. 本番source/version/静的assets/API境界を確認し、`tests/release-readonly-browser.mjs`で匿名実配信を再検証。QA証拠と公開SHAをreportへ記録。本番の実アカウント対戦や実機FPSを確認済みとは扱わない。完了してからheartbeatを停止する。

## 残作業

他チャットの採用済みmainを統合 → 全suite/型/ビルドを最終commitで検証 → ステージングの追加migration → 認証済みQAアカウントによるAPI/WS/購入/報酬/再接続検証と後片付け → 本番schema/version/ロック再照合 → guardで本番公開 → 静的配信・匿名境界・DB確認 → 監視停止。


## 追加依頼：本番ユーザーデータ全消去（2026-10-27）

ユーザーが「最後にユーザーデータを全てWIPE」「まっさらな状態」「本番にあげて」と明示。元の統合・監視・最終監査・公開の依頼に追加する。**本番の全アカウントを対象とし、過去のGoogleアカウント保持例外は適用しない。** 2026-10-26 17:50 UTC時点では準備のみで、ユーザーデータは未消去。

- 対象は本番ゲームのusers、sessions、メール認証token、所持品、購入・報酬・EXP・tutorial・medal、rank、対戦履歴・保存deck、friend/challenge、presence、問い合わせ、gift、coupon使用記録、追加されるBOT進行データ。旧production Durable Object namespaceの対戦・alarm・queueも削除する。
- カード／商品定義・アセット・DBスキーマ・coupon定義・運用設定は残す。coupon使用数は0へ戻す。古いwipe SQLの新規coupon作成処理を流用しない。
- 新規のユーザーデータexportは作らず、監査記録にはtable別件数とrelease情報だけを残す。Cloudflare側の自動バックアップ保持まで消去したという報告はしない。
- `USER_DATA_RESET=1`を設定したWorkerはDB/auth処理前に全API・WSを503/no-storeで停止する。通常時はDB照会を増やさない。`server/src/retiredUserData.ts`は旧DOのsocketを閉じalarm/storageを消去し、DBへの決済処理を持たない。いずれも今は本番で有効化していない。
- `scripts/sql/production-user-wipe-20261027.sql`は現時点の全ユーザーテーブルを列挙。`tests/user-data-reset.mjs`がschemaと完全照合し、テーブル追加時に消去漏れを失敗にする。BOT変更をmerge後、必要なDELETEをFK順に追加する。

### 最終本番リセットの実行順

1. 他セッション完了・最新main統合・最終回帰・認証付きstaging QAを完了する。production用の追加索引を適用し、公開前schema検査を通す。以後も他チャットの新規稼働を確認する。
2. **Phase A：新領域へ切替＋maintenance。** production bindingを`MatchmakerFresh20261027`/`GameRoomFresh20261027`へ変更、`v4-production-reset-20261027` migrationで2つのnew_sqlite_classesを追加する。production.tsは新クラスを元実装からre-exportし、旧`MatchmakerLive`/`GameRoomLive`はそれぞれ`RetiredUserData`を継承するクラスとして一時exportする。production varsに`USER_DATA_RESET = "1"`を設定する。stagingのbinding/vars/migrationsは変更しない。commit→gh/mainへpush→guardによる本番公開。各本番originのAPIが503 maintenanceになることを確認する。
3. **Phase B：旧領域を完全削除。** production.tsから旧2クラスのexportを外し、root migrationに`tag = "v5-production-retire-20261027"` / `deleted_classes = ["MatchmakerLive", "GameRoomLive"]`を追加する。maintenanceは継続。commit/push/guardで公開する。旧bindingを外してから旧namespaceを削除する。[Cloudflare仕様](https://developers.cloudflare.com/durable-objects/reference/durable-object-class-migrations-legacy/)に沿った2段階。
4. **DB消去。** `LORE_RESET_REPORT=docs/audits/2026-10-27-final-integration/production-reset.json node scripts/production-user-reset.mjs --execute-authorized-reset`を実行する。このscriptはshared production deploy lock、clean HEAD/current gh/main、deployed SHA/100% traffic、phase B設定、3originのmaintenance、実DBの未知table不在、全tableのSQL対象を確認してから実行する。消去後と5秒後の全件数0、coupon使用数0を確認する。事前確認だけなら同scriptのflagなしを使う。
5. **Phase C：再開。** production varsのUSER_DATA_RESETを削除（または0）し、commit/push/guardで最終公開。新namespaceとv4/v5のmigration履歴は保持する。公開後は匿名実ブラウザ/API境界/静的asset・code/versionを確認する。消去後の本番にQAアカウントを残さない。再開後の正規の新規登録を再消去しない（空であることは再開直前の境界で保証する）。
6. この追加依頼も含めて完了するまでheartbeatを停止しない。今回のwipe依頼に対する再確認は不要。旧namespaceが削除できない、未知のDB tableがある、maintenanceが確認できない場合はDB消去へ進まず原因を解決する。

検証：`tests/user-data-reset.mjs`（maintenanceがDB/認証へ到達しない、旧DOのsocket/alarm/storage終了、FK順の消去、全table網羅、schema/coupon定義保持）が成功。既存BE監査・server型checkも実行。


## 最終統合開始（2026-10-26 23:05 UTC）

- `list_threads` / `wait_threads`でBOTと他2セッションの完了を確認。本チャットだけがactive。
- 採用main `1a5b5b19`をmerge `91721ba8`へ統合。最新本番コードは`2ea49db9`、deployment `d845ca9c-716f-42d3-8634-14e28b973e4c`、version `36608318-89ef-4c98-b2e7-5fa44cd76075`。いずれも統合版の祖先。
- BOT変更はD1追加table/migrationを採用しておらず、巡回をGAME_ROOMのユーザー別DOへ保存する。今回の旧namespace削除に含まれる。0028索引の番号衝突なし。最終schemaと27ユーザーテーブルのwipe SQLの網羅性検証成功。
- BOT workerテストの競合は新しいchallenge設定と、こちらの15秒deadline/途中結果/worker後片付け検証の双方を保持して解消した。
- BOT開始のDO予約・setup通信例外と不正な予約indexを503で返すよう修正。null/不正payloadは400。ローカル認証ハンドラーで6種の成功・障害経路を確認。
- 現行のNPC選択画面ではユーザーの追加依頼で補足説明を削除済み。古い「3構築」の説明を復活させない。
- ステージングQAは通常フレンド戦にランク専用previewを要求していた手順を修正。未決済の対戦が残っている場合はアカウントを消さずprivate recovery fileを保全し、遅延書込み後の孤児データを防ぐ。
- 一時アカウントによる本物のAPI/WS検証の後、route差替えなしの認証済みブラウザで6メニュー往復を確認する手順を追加。
- BOTの重い局面はpeer検証でworkerd約16.55秒。採用版は手番残り45秒未満で短い探索へ切り替える。全局面や実機の最大ラグを保証する結果ではない。


## ステージング実通信検証（2026-10-26 23:15–23:19 UTC）

- `57fb12d8`をguard経由でstaging公開。version `45189916-171c-470b-8025-424c7a0978d4`。guardで型/buildと246/246回帰検査成功（`suite-final.json`）。
- 本物のAPI/D1/認証WebSocketで、購入の同時実行・ガチャ再送、coupon上限・gift重複防止、不正deck保全、ランク2人接続・秘匿手札・MMR確定・再接続、フレンド招待/受理/対戦/決済、BOT開始/決済を確認（`staging-live.json`）。
- route差替えなしの認証ブラウザで1280/700px、6画面×2往復を確認。HTTP失敗・pageerror・可視画像欠落0。カード画面初回2003/1030ms、再訪324/379ms（CDN・端末・ネットワークを固定していない実配信測定。前後比較の改善率とはしない）。`staging-live-browser/report.json`。現行HOMEとカード画面を目視確認。
- 後片付けのD1件数確認はcompound SELECTを拒否された。ユーザー削除自体は完了していたが、確認完了までprivate recovery fileを保全。独立SELECTのbatchに修正し、全関連行0を確認して認証fileを削除した。再現テストと本番reset count処理にも修正を反映。`staging-cleanup.txt`。
- 本番0028の3索引適用成功。read-only schema contractとアプリ全28tableの完全照合成功、未知tableなし。
- 次はproduction Phase Aのmaintenance＋新namespace切替。ユーザーデータはまだ消去していない。

- stagingで全4難易度の認証開始・BOT実応答・降参決済と一時account/対戦記録の削除を確認（`staging-bot/authenticated-npc.json`、cleanup=true）。


## 本番reset Phase A完了

- `7f3ebeb1`をguard公開。246/246・型・build成功。version `560998c2-846c-4d98-abc1-7f41412193d9`、deployment `03f3e2a3-57a4-4728-b94b-f4bcd1a216df`。
- 3originの`/api/auth/me`が503/maintenance=true/no-storeを返すことを確認（`phase-a.json`）。新namespaceへbinding切替、旧クラスはDB決済を持たない退役実装。
- 続いてPhase Bで旧2namespaceを削除する。D1ユーザーデータはまだ消去していない。
