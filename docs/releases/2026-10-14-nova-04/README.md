# ノヴァ 04「十二刻の破断」採用

2026-10-14。ユーザーの「04でステージングあげて」により、中央空中生成の5案から04を選択。

## 通常対戦への接続

- `BLACK_NOVA` の解決時に `nova` イベントを出す。ルールのHP1・相手skipTurns加算は変更しない。無効化された魔法には解決イベントを出さない。
- `BaseController` は解決イベントに対応して、採用した04を一回再生。共通の魔法枠・追加の墓地飛行を重ねない。
- カードのプレイ位置→中央の黒い膜と塊の凝集→体力UIの薄黒赤の吸引→相手の時計を十二片にして三段階で吸引→黒球収縮。
- HPは生成後の1.35–2.45秒に実際のイベント開始HPから1へ表示変更。相手のHPは変えない。ルーンによる反復は別の解決イベントとして扱う。
- 各再生は独立したレンダラーを所有。終了、fast-forward、resize、非表示、ページ離脱、DOM切断でロード待ちを含めてキャンセル。GPU・DOMを解放し、最後は権威状態へ同期する。
- 動作低減時は短い静止主体の表示。WebGLが使えない場合は中央の簡略黒球と時間意匠へフォールバックする。

## 検証

- `tests/nova.mjs`: 両陣営×HP1/2/24/120、skipTurns加算、場の制約、無効化、血の儀式による誤変換の防止、ルーン反復。
- `tests/nova-browser.mjs`: 実BaseController/実GameViewのPC/スマホ×両陣営、04の単発再生、HP変化の時刻、相手HP不変、完了・残骸なし。fast-forward、resize、hidden、DOM切断、reduced motion、WebGL代替も確認。
- 全体型検査、guard経由のproduction suiteとbuild、公開元SHA・ステージング配信物の照合は `qa/` に保存。
- 認証済みオンライン対人戦の実機確認と本番デプロイは今回の範囲外。

元比較: `/Users/hiromaru05s/Desktop/LORE_TCG/docs/vfx-prototypes/2026-10-14-nova-central-five/`。実ランタイムは比較専用ページを参照しない。

## ステージング確認済み

- 採用実装: `d23d54847db614732893a49cc69a1ccfdc3ff5a1`。
- 公開された統合ソース: `a7bc86896cefe0f5b1214098515a846ef86e3b2f`（上記ノヴァ実装を含む）。
- `scripts/deploy-guard.mjs staging` の全体型検査、132/132テスト、design guard、ビルドが成功。
- Worker: `713c6fda-4615-4681-935a-de28490406b1`、ステージングへの配信率100%。
- `https://test.yourlore.xyz` のHTML・全JS/CSS・ノヴァ画像・体力UI画像の計82ファイルが、ガードのコミット済みビルドとSHA-256一致。
- `deployment.json`、`guard-result.log`、`staging-assets.json` に証跡を保存。ブラウザー10項目はローカルの実Controller/GameViewによる検証で、認証済み対人戦の確認とは区別する。
