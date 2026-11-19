# 敗北時の青いマナ飛散と採用音①

ユーザーが第4稿①「高く駆け上がる」を選択し、本番反映を指示。

- 厚いガラスの破砕とマナの噴出を土台に、640→1100Hzの上昇する共鳴を追加。2.35秒、破裂の瞬間に発音。
- 破片の断面から青いマナが尾を引いて広がる。最大24本を1メッシュで描画し、既存の発光と噴出も破裂後に強める。
- 固定破片・キャラクターの大きさ・1.5秒の揺れ・体力/シールド/雫の直前ヒビと破裂時の消失を維持。
- ゲームルール、DB、対戦同期は変更なし。全端末のFPS保証を意味しない。

## 採用元

- 試作参照: `5de0b41ef839c2df1dd74b9de2a33d2292eac40d` + 本チャットの青い飛散と第4稿①。
- 統合元main: `4f20db7a55ae2cb59b5fe48e92e3c7e23b5f50df`。盤面と対象のキャラクター素材に差分なし。
- 実装: `client/src/ui/manaRupture/{renderer,shaders,manaScatter,impactSound,crystalImpactBase}.ts`。
- 選定音: `approved-sound-1.wav`。48kHzの本番用生成波形と保存WAVの全サンプルを照合する。
- プレビュー起動元: `/Users/hiromaru05s/.codex/worktrees/defeat-depth-preview-1118/LORE_TCG/client`、http://127.0.0.1:5538/defeat-depth-preview.html 。
- 公開用作業元: `/Users/hiromaru05s/.codex/worktrees/defeat-mana-release-1119/LORE_TCG`。

## 検証

- 固定モデル16個、1.5秒の揺れ、ヒビ、44.1/48kHzの波形・キャッシュ・非クリッピング、採用WAV全サンプル一致、production音源のdev依存なし。
- 追加メッシュの上限、破片追従、表示時間、有限な頂点座標、geometry/material解放。
- デプロイガードでコミット固定・最新main一致・DBスキーマ・client/server型検査・production suite・buildを確認する。
- 公開後は配信素材の一致、本番クライアントの自分/相手側敗北、PC/スマホ、発音1回と採用音PCMハッシュ、結果遷移を確認する。API/WSは隔離fixtureで、実アカウント・実対戦データを変更しない。
