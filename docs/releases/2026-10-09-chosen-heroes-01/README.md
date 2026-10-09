# 選ばれし4種 — ①金鍛の顕現の採用

2026-10-09 ユーザー指示: 「０１で全部適用してステージングにあげて」。

対象: `CHOSEN_KNIGHT`、`CHOSEN_MAGE`、`CHOSEN_ARCHER`、`CHOSEN_ROGUE`。4種すべて variant 0（表示番号01）。選定済みプレビューの renderer / weapon / catalog を `ui/chosenSummon/` へ移し、比較画面も同じ実装を参照する。見た目とタイムラインは維持。

共通の `playSlateSummon` 入口で4種を選別し、旧slateと重ならない置換にする。手札からの飛行は同じ `chosenPlacement` を使い、カード面を盤面と平行に接地させる。効果で生成される召喚と直接の場への召喚も対応。接地コールバックは1840msに1回だけ。既存の召喚音をそのコールバックで鳴らす。

同時再生は1つのWebGL rendererを共有。個別のカード面キャプチャは終了時に解放し、全ジョブ終了でrendererを破棄する。中断、置換、スキップ、画面非表示、resize、pagehide、DOM切断、非同期ロード中のキャンセルを扱う。低減モーションは静止カード、GPU／画像／描画失敗は元カードへ復帰する代替経路。

エルフ・種族召喚・ミミック・選ばれし領域の勝利演出は変更しない。共有のdirtyなmainへ書き戻さず、専用ブランチへ最新gh/mainとローカルmainの確定コミットを取り込んだ。

検証:
- `tests/chosen-heroes-summon.mjs`: 4職選択、1840msの接地1回、共有GPU、反復、中断、ロード／capture中キャンセル、エラー代替、資源解放。
- `tests/chosen-heroes-browser.mjs`: 実GameViewで4職×両陣営、手札／生成召喚、3枚同時、390px幅、スキップ、低減モーション。採用①のみ出現、旧slateと重ならず、終了時に元カード復帰。
- production suiteへ上記lifecycleテストを登録。公開は `scripts/deploy-guard.mjs staging` で最新HEADのクリーンなsnapshotを再構築・全検査。

実盤面検証はローカル固定状態と実際の描画経路を使ったfixture。認証済みオンライン対戦の実プレイ確認とは区別する。ステージング公開元・配信ハッシュは公開後の記録を参照。

## ステージング反映結果

- URL: https://test.yourlore.xyz/
- 公開元: `fc1ec0c56d5cb0f2800232d94886271c7da1064e`（guarded release）
- Worker version: `fe836101-ee87-47cc-a32e-4d0fde7cfa26`、100%配信
- Deployment: `7f90c038-7742-4cc9-ad4c-8a761d4ac43c`（2026-10-09T08:29:41Z）
- 独立snapshotで client/server typecheck、production suite **85/85成功**、production build成功。
- 同じ公開元のローカルbuildと配信されたHTML・全JS/CSS・4職の武器PNGをSHA-256で照合し **50/50一致**。`qa/staging-parity.json`。
- 公開ページをChromeで確認: HTTP 200、pageerror 0。`qa/staging-smoke.json`。
- ローカルの実GameView描画経路のQAは成功。認証済みオンライン対戦で4職を召喚する実プレイは未実施。
