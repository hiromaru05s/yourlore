# 召喚の着地：6つの質感試作

2026-10-03。ユーザーの「二重に適用されていないか」「元のリアルな召喚の方が良い」「原神レベルを意識した6案」に対するローカル比較。通常対戦のファイルは変更していない。見た目の採用・staging・production公開は未実施。

## プレビュー

`http://127.0.0.1:5318/summon-six.html`

再起動（このworktreeのルート）:

```sh
node node_modules/vite/bin/vite.js --config client/src/dev/summon-six/vite.config.mjs
```

6案同時／拡大／実盤面／現行比較。1×・0.5×・0.25×、時刻シーク、白／暗背景、カード変更、自分／相手、3枚同時、低減モーションを用意。

## 重複の原因（基準SHA 27186064dabf9efcfb9f1634b39170e71dc836f4）

- `client/src/ui/anim.ts` の `flyIntoSlot` heavy経路は `playMonster(...,'summon')` を再生する。
- `client/src/ui/monster/runtime.ts` は同じjobのrear/frontに `drawEffect` を呼ぶ。`monster/renderer.ts` の `drawContactDust` が追加の2D砂埃を描く。
- さらに着地callbackが `lore:summon-impact` をdispatchし、`duelScene.ts` の `onDust` が `impactDust.ts` の `createDust` で元の3D砂煙を生成する。
- したがって同一の着地に2系統の砂埃が重なる。summonイベントが2回走ると確認したわけではない。
- `flyIntoSlot` 後半の旧heavy分岐は先のreturn後なので、そこを第3の実行経路と数えない。

プレビューの「現行／元の3D」は既存の `drawContactDust` / `dustTexture` / `dustPose` を同じ2D比較面で再生したもの。3Dレンダラー全体の撮影や、デプロイ中の版を確認した映像ではない。

## 6案

| 案 | 主な物質と動き | 接地 |
|---|---|---|
| 1 砂紋 | 接地面に沿う薄い砂層、穏やかな下降、細かな沈降 | 620ms |
| 2 巻雲 | 低い体積煙、内部の空洞、縁の巻き返し、柔らかな反動 | 690ms |
| 3 岩層 | 長めの溜め、重い接地、角のある砕片、短い砂の尾 | 790ms |
| 4 光絹 | 枠・絵柄の凹凸反射、薄い膜、先細りの曲面 | 730ms |
| 5 圧塵 | 急な下降、1度の圧力解放、速く広がり崩れる面 | 570ms |
| 6 晶霧 | 細い反射、小さな結晶面、低い冷色の霧 | 760ms |

各案は同じ共通時計からカード位置、影、表面反射、接触素材を計算。カード素材は実カードDOMの公開面から取得する。ノイズ密度・陰影・形の浸食を使い、単なる粒子増量や色交換だけにはしない。

## 品質参照・評価

`animation-quality-benchmark.md`、`vfx-art-direction.md`、`world-bible.md`を確認。「銀紋の流墨」の800ms/1500ms静止画と動画を8fps連続フレームにして参照。Toonのimpact-detail-24fpsも確認した。カード表面のディテール、主形状、接触タイミング、形が崩れる消え方を翻案。

初回は両辺の煙が柱状になったため不採用にし、低い接地面から広がる煙へ修正。現行の2Dと3Dの重複を新案には持ち込んでいない。商用作品と同等の品質、ユーザー承認、通常対戦への統合を自動検証から主張しない。

## 検証

TypeScript検査 `node node_modules/typescript/bin/tsc --noEmit -p client/tsconfig.json` は終了コード0。

`?qa=1` でローカル検証と録画を実行。保存用エンドポイントは専用Vite設定のみに存在し、出力先を本フォルダのqaへ固定する。

- `qa/report.json`: 23項目、エラー0。6案×6時刻、現行比較、実GameView準備、両陣営×6案で原本1枚のみ置換、3枚同時、終了時復元、画面切替時iframe破棄、低減モーション、再生時計、停止、動画保存。
- `qa/six-{0,500,900,1250,1900,2500}.png`: 同じレンダラーの時刻別比較。
- `qa/six-continuous.mp4`: 同一レンダラーの61フレームを24fpsにした通常速度の比較動画。初回のMediaRecorder記録はホスト負荷による欠落があったため、決定論的な連続フレーム出力へ変更。実機性能保証ではない。
- ブラウザーで390×844の白／暗の比較表示を目視、横幅390/scrollWidth390で横はみ出しなし。
- 実盤面の固定公開fixtureで確認。認証オンライン対戦は対象外。

描画は30fps上限、煙のWebGLパスは1案1回で前後に再利用。元の作業ツリーにあった並行変更は触らず、専用worktreeに新規ファイルのみ追加した。
