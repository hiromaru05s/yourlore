# 外観・カードフレームの軽量化 — 2026-10-29

ユーザー依頼: 外観エフェクト・フレーム適用時を中心に全体の重さを改善し、本番へ反映。

## 参照元・作業元

- 基準: remote `gh/main` / 本番 `5839a8bd39128f80f1453a82e8ccc1ffbafdf7bc`。着手時の本番版 `efab21c0-2b79-4700-8143-c8294bbc5a21`。
- 実装コミット: `ee7e926a`。
- 主要パス: `client/src/ui/cardFrameMaterial.ts`, `cardFrame.ts`, `cardFinish.ts`, `cardFinishCrystal.ts`, `cardEffects/prismVeil.ts`, `deckAppearance.ts`, `client/src/screens/deck.ts`。
- プレビュー起動元: `/Users/hiromaru05s/.codex/worktrees/cosmetics-performance/LORE_TCG`。
- 開発表示 `http://127.0.0.1:5296`、本番ビルド表示 `http://127.0.0.1:5297`。同じ採用済み素材・CSS・カード描画を使用。別作業の古いDesktopチェックアウトは変更していない。

## 変更

- 材質ごとに繰り返していた原画マスク解析をURL単位で共有（最大24件）。GPUテクスチャもレンダラー内で共有。
- 各フレーム描画のたびにWebGL出力のwidth/heightを変更していた処理を廃止。必要なサイズまで拡張して保持し、各素材を切り出す。
- カード1枚の準備完了で全カードを強制再描画していた重複処理を除去。準備時はそのカードだけ、同じ時刻・材質は共通の描画結果を使用。
- 外観の選択は既存の選択状態と必要なサンプルだけ更新。フレーム一覧を再作成しない。非表示の編成カード9枚の再作成も止め、編成へ戻った際に更新。
- 非表示の全フレーム／エフェクトはRAF待機へ移し、IntersectionObserverから再開。未接続フレームの10秒猶予後の掃除と明示的破棄を保持。
- 結晶の固定形状・星砂箔のクリップを再利用。虹彩の原画凹凸を原画と表示形状単位で共有（最大16件）。破棄時は不要なcanvas backing bufferを解放。

## 計測

Chrome headless、1440×1000、同じマシン・同じAPI fixture。各操作後2秒を観測。下表はRAF間隔の最大値（ms）であり、INPやユーザー実機FPSではない。ブラウザ負荷で時間は変動するため、画像解析回数・再確保回数・ノード保持も併記して検証した。

| 操作 | 修正前 最大RAF間隔 | 修正後 最大RAF間隔 | canvasサイズ設定回数 |
| --- | ---: | ---: | ---: |
| open-appearance | 150.1 | 66.7 | 940 → 46 |
| frame:mirror-silver | 383.3 | 16.8 | 1414 → 0 |
| frame:flowing-gold | 383.2 | 16.8 | 1632 → 0 |
| frame:obsidian-ember | 499.9 | 16.8 | 1630 → 0 |
| frame:nacre-prism | 433.3 | 16.8 | 1630 → 0 |
| frame:verdigris-runes | 416.6 | 16.8 | 1632 → 0 |
| effect:crystal-facets | 583.3 | 16.8 | 1574 → 10 |
| effect:stardust-foil | 650.0 | 16.8 | 1534 → 5 |
| effect:prism-veil | 566.6 | 16.8 | 1564 → 5 |
| edit-equipped | 66.7 | 83.2 | 176 → 68 |
| return-home | 183.3 | 83.4 | 89 → 67 |

フレーム5種・エフェクト3種の選択で、修正後の観測窓に50ms超のlong taskは0件。フレーム選択時の原画再解析・canvasサイズ設定は0件。画面外の全3エフェクト＋フレームは描画0、再表示で再開、破棄後canvas残存0。

初回の外観表示、装備した編成への初回復帰、HOME復帰ではlong taskが残る。全画面・全端末のラグ解消や通信遅延改善を主張しない。

## 検証

- 型チェック（client/server）、本番ビルド成功。
- 本番スイート 250/250成功。
- `tests/card-frames-browser.mjs`: 5種類の価格・確認・所持・デッキ別保存・再表示、PC/スマホ幅、低減モーション。
- `tests/card-frame-lifecycle-browser.mjs`: 形状保持、WebGL context loss時の最終画素、WebGLなしの静的代替、途中キャンセル・破棄。
- `tests/card-frame-continuity-browser.mjs`: 実GameView/reducer/controller、1280/390幅、金/黒曜、ドロー・購入・召喚で同じフレームの継続、残存物なし。連続動画をqaに保持。
- `tests/card-frame-persistent-browser.mjs`: 1280/390幅、両陣営、E3/WORLD_SEED/Q_RIFTの発動・着地、同時発動、残存物なし。
- 新規の`cosmetics-performance-browser`, `cosmetics-runtime-browser`で選択時のノード保持、描画停止・再開、破棄を確認。
- 新規の`card-frame-pixels-browser`: 5材質×3形状×3時点=45条件で変更前とRGBA完全一致。
- 新規の`card-effect-pixels-browser`: 結晶・虹彩×全体/場×3時点=12条件で変更前とRGBA完全一致。

機能テストと見た目の判断は別。採用済み素材・材質の画素比較、PC/スマホ実盤面キャプチャ、通常時計の連続再生テストで既存の見た目と連続性を確認した。新しいデザインの採用判断は行っていない。APIはfixtureで、実購入・本番ユーザー保存・認証付きPvP・物理スマートフォンの性能は未検証。

## 本番

本番ビルド（5297）でもフレーム5種・エフェクト3種の選択でlong task 0、最大RAF間隔16.8msを確認。`qa/after-build.json`を参照。

本番未反映。`git push gh HEAD:main`がGitHubのInvalid username or tokenで失敗し、ガード付きデプロイは開始されていない。資格情報を含まないHTTPS経路にも利用可能なcredentialはなく、SSHもpublickey認証に失敗。認証復旧が必要。

復旧後は最新`gh/main`を取得して統合し、`npm run deploy`のデプロイロック・スキーマ照合・型検証・本番スイート・ビルドを通し、配信アセットと外観操作を検証する。現時点で本番反映済みとは報告しない。

## 2026-10-30 再開・統合

GitHubログイン復旧を確認し、作業ブランチのpushに成功。最新mainの見本カード（アチューンを上部配置、選択フレームとエフェクトを併用）を取り込み、一覧は保持したまま見本カードだけを更新するよう競合を解消した。

`deck-appearance-preview-browser.mjs`で5フレーム、エフェクト併用、拡大、保存・再表示、defaultへの解除、1440/1280/390/320幅の配置が成功。統合後性能の記録は`qa/integrated-performance.json`、外観の現在の見た目は`qa/integrated-1440.png`と`qa/integrated-390.png`。前日の画像は変更前の比較記録として保持する。

他の本番デプロイのロック解放を待ち、最新版mainを維持してガード付きリリースを実行する。
