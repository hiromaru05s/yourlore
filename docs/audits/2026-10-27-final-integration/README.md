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

## 残作業

他チャットの採用済みmainを統合 → 全suite/型/ビルドを最終commitで検証 → ステージングの追加migration → 認証済みQAアカウントによるAPI/WS/購入/報酬/再接続検証と後片付け → 本番schema/version/ロック再照合 → guardで本番公開 → 静的配信・匿名境界・DB確認 → 監視停止。
