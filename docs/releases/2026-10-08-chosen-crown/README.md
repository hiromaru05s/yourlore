# 選ばれし領域 — 01 虚空の戴冠

ユーザー選定: 2026-10-08、専用画像で作り直した第2稿の01。追加指示: 冠が部分的に現れて完成し、光るタイミングで「シャキーン」を鳴らす。ステージングへ公開し、効果音付きの実盤面プレビューのみ提示。

- 承認されたcrown PNGと形成・消散シェーダーを本体の専用モジュールへ移植。未選定の5素材は含めない。
- 公開playSpell(CHOSEN_AREA)と同じプレイヤーのwinがあるバッチだけで再生。既存のカード公開→冠→結果画面の順序をawaitする。ルール・勝利判定・隠し情報は変更しない。
- 最後の部位が約2620msで揃い、2700msの完成光と同じ時計でchosenCrownを一度だけ鳴らす。専用のオリジナル合成音（擦過・金属倍音・左右の短い反射、1.65秒）。音量設定と消音、AbortSignal、非表示・破棄・スキップ・低減モーションに対応。
- 元絵は凍結試作 `docs/vfx-prototypes/2026-10-08-chosen-six/revision2/assets/hero-1.png` と同一。内蔵画像生成により前ターンで作成済み。

## 検証

- `tests/chosen-victory.mjs`: 24/25/26枚、両勝利側、通常勝利との分岐、フレーム飛び時の一度だけのcue、低減モーション。
- `tests/chosen-victory-browser.mjs`: 実際のengine→controller→WebGL/Canvas→Web Audioで両視点を再生。音声開始は完成光と同じ2702ms / 2711ms、1回ずつ。終了時消去、完成前スキップ後の遅延音なし、低減モーション、390px、破棄を確認。ページエラー0。
- 既存audio-v3、client typecheck、production build通過。盤面の代表フレームを目視確認。production suiteはガードで実行。
- プレビュー `http://127.0.0.1:5420/chosen-crown-preview.html` は実GameView・実engine/controllerを使い、結果モーダルだけ省略するローカル固定盤面。DEV専用で配信ビルドに含めない。
- ステージングの認証対戦はユーザーが後で確認する依頼のため実施しない。公開後はWorker/sourceと配信アセットの一致を確認する。

## ステージング公開結果

- 配信元: `1eeb6e3d5ec2185f5abd96cde4315f4ff2051049`、Worker: `lore-server-staging`、Version: `b67e0cdc-e9fe-4ff9-81ad-600a5f1278be`。
- guarded deployment: client/server typecheck、81/81 production suite、design guard、buildを通過。
- `staging-assets.json`: index、全JS/CSS、冠PNG、専用MP3、音声manifestの48ファイルでSHA-256一致。
- 初回は音声manifestの登録漏れをテストが検出し、upload前に停止。登録して全チェックを再実行し、上記Versionを公開。
- この記録と検証スクリプトのリダイレクト対応は公開後の証跡更新で、配信アプリを変更しない。認証対戦の確認はユーザーが後で実施。
