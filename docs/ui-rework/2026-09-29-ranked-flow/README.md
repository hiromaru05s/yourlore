# ランクマッチ：MMR・ティア・結果演出

2026-09-29。既存のルールを調査し、計算仕様を維持したまま、サーバーの確定結果から試合後の演出とHOMEまで接続。

## 実装と対応表

| 要求 | 実装 | 検証 |
| --- | --- | --- |
| 既存MMRの把握 | `client/src/shared/rank.ts` がクライアント／サーバー共通の定義 | SQLiteで計算・境界・月替わり |
| 勝敗演出終了後に増減 | `BaseController.openResult` → `RankPresentation`。既存crown演出終了のゲートを維持 | 実盤面で先行通知・通常速度の連続再生 |
| 昇格・降格 | MMRカウント、ゲージ、刻印、紋章の下からの材質切替、着地 | 勝利・敗北・Silver/Gold境界・GM出入り |
| ティアのアイコン | ネイティブSVGの8種。金属面・刻印・ファセット・翼・冠 | 実寸、320/390px、PC、ティア一覧 |
| HOMEで自分のティア | 紋章・MMR・順位・次ティアまでの残り。クリックでランキング | 取得失敗→再読込、画面再訪で最新値 |
| 重複／復帰 | 保存済みの試合IDで結果取得、同じ画面で重複無視、直近50試合の演出済みIDをsessionStorageに保持 | WebSocket重複／終了試合への再接続 |
| 通信遅延 | pending→8秒タイムアウト付きREST取得、最大10回・3秒間隔、手動再確認 | 終了後のWS切断→REST復旧 |
| 副作用の防止 | ノーマル/BOT/不成立試合はMMR対象外。離脱でRAF/observer/listener/timerを解放 | 結果途中の終了、低減モーション、復習から再表示 |

## 現行ルール（変更なし）

- 初期1000。Elo式、K=32、勝者に追加+2、MMR下限0。
- 同じMMR同士なら勝利+18、敗北−16、引き分け±0。MMR差がある引き分けでは変動する。
- UTC月単位。前月にレートがあれば `(前月MMR + 1000) / 2` を四捨五入。前月に参加していなければ1000。
- アイアン0／ブロンズ1030／シルバー1090／ゴールド1150／プラチナ1250／ダイヤモンド1400／マスター1550。
- GMは1550以上かつそのシーズンの順位25位以内。順位の同点順はMMR降順→更新時刻昇順→ユーザーID昇順。
- ランクマッチのみ対象。両者参加後の降参・切断敗北も通常の結果として計算。両者が揃う前の不成立は対象外。
- 世界観バイブルの将来構想である「ランク別カードプール」は今回導入していない。

## 表示の時計と品質

承認済み「銀紋の流墨」動画をフレーム列で読み、発生源に沿う細い光・面の陰影・段階的な変化をUI紋章へ適用した。MMR UIにはカード転送の流体や独立した粒子を足していない。

既存の盤面勝敗演出終了 → 結果画面 → 0–0.5秒：盾の輪郭に刻印 → 0.5–2.1秒：サーバー確定値までMMR/ゲージを補間 → 2.1–2.75秒：同じ盾の面を次ティアの材質へ切替 → 3秒：確定表示。数値と面の変化は単一RAF時計。HOMEも同一の紋章を使用する。

機能検証と見た目の判断は分ける。機能は自動テスト、見た目は保存動画と途中フレーム、PC/スマホの実盤面で確認する。ユーザーによる新しい紋章の最終的な好みの確認は未実施。

## サーバーとDB

- `ranked_results` の同一トランザクション内に両者の更新前後の順位を保存。GMをクライアントのMMRだけで推測しない。他者が後から順位を変えても過去の演出内容が変わらない。
- 既存のexactly-once台帳・CAS再試行・DOの5秒アラーム再試行を維持。
- `GET /api/rank/result?matchId=…` は認証済み参加者本人の結果だけを返す。現在レートとの差から試合結果を捏造しない。
- 公開時は **`server/migrations/0016_ranked_standings.sql` を先に適用**してからWorkerとクライアントを更新する。4つのnullable列の追加のみで、旧Workerとも共存できる。旧行は順位がnullなので通常ティアへフォールバック。
- ローカルの検証を実施。リモートDBの変更・ステージング／本番のデプロイはこの作業では実施していない。

## 再確認

```sh
npm run typecheck
npm run build
node tests/lounge-rank.mjs
node tests/lounge-settlement.mjs
node tests/duel-opening-server.mjs
LORE_TEST_ORIGIN=http://127.0.0.1:5298 node tests/ranked-flow-browser.mjs
LORE_TEST_ORIGIN=http://127.0.0.1:5298 node tests/ranked-home-browser.mjs
LORE_TEST_ORIGIN=http://127.0.0.1:5298 node tests/ranked-online-browser.mjs
```

開発プレビュー：`/rank-lab.html`。昇格、勝利、敗北、降格、引き分け、GM昇格／降格を盤面から再生できる。開発専用で本番ビルドには含まれない。

ブラウザのAPI/WSはテストfixture。実際のOnlineControllerと通知経路を使用するが、認証した実ユーザー同士のリモート対戦ではない。保存・再試行は実GameRoomコード＋SQLiteで別途検証。

参考：[D1 batchのトランザクション保証](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)、[Durable ObjectsのWebSocketライフサイクル](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)。

## 検証結果

- `lounge-rank` / `lounge-settlement` / `duel-opening-server`：成功。台帳・両者へのWS通知・永続化内容も確認。
- `browser-report.json`：通常速度で勝利／敗北／昇降格、レビュー再表示、遅延、0変動、中断、低減モーション、ノーマル除外。
- `online-report.json`：実OnlineControllerのWS重複、終了試合の再接続、終了時にソケットを失った後のREST復旧。
- `home-report.json`：1440/1280/844/390/320px、最新レートへの更新、通信失敗→再試行。
- `lifecycle-report.json`：非表示タブで確定値へ終了、試合IDによる重複再生防止、DOM削除時にRAF終了。
- `ranked-flow.webm`：56.48秒の実盤面連続録画。`continuous-contact-sheet.jpg` は冒頭30秒、`rating-material-frames.jpg` はMMR更新と材質切替の5fps切出し。
- 見た目：金属の陰面・細い刻印光・盾表面に沿う反射・同じ位置での昇格切替を確認。PC/スマホで数値、次ティア、再対戦操作が読める。粒子量で品質を代用していない。
- 型チェックとクライアントの本番ビルド：固定コピー `/private/tmp/lore-ranked-validation-20260929` で成功。今回のクライアント全変更のSHA-256が作業フォルダと一致することを `source-manifest.json` に保存。サーバーは作業フォルダで型チェック成功。
- 共有フォルダ全体でも一度型チェックとbuildを通過したが、最終再実行時は並行制作の `homeCardEntryLab`、`series-vfx-b`、`series-vfx-d` の未完成ファイルで停止。これらは変更せず保存。公開前には並行変更の統合チェックとDB migrationが必要。
