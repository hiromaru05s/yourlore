# 虹彩の薄膜 — 採用01のガチャ報酬用描画

2026-10-15、ユーザー選択の01「虹彩の薄膜」を、再生速度・発生頻度2倍の採用プレビューから抽出。ガチャ共通実装と同時にマージ・push・ステージング反映する指示に基づく描画モジュール。

## 接続契約

- ID: `effect:prism-veil`
- `createPrismVeil(card: HTMLElement, seed = 0)` → `canvas`, `draw(seconds, strength = 1)`, `dispose()`。
- callerは実秒を渡す。素材内部で2倍時計へ変換するため、callerでさらに倍速にしない。
- 公開カードの `.card-art` にCanvasを配置。通常カードの元絵から輪郭光を抽出し、screen合成で薄膜・細い波紋・微光を絵柄と重ねる。カード文面、コスト、数値のDOMは変更しない。
- 永続魔法・クエストは `.buff-icon` 内の `.buff-art.card-art` のCSS背景画像にも対応する。callerが公開面を正規化し、既存clip-pathを保持する。
- 所有者・デッキ装備・非公開カード判定、RAF、低減モーション、visibility、resize、DOM更新後の再接続は共通runtimeが担当する。
- `dispose()` は冪等。画像decode完了待ちの破棄や破棄後drawでも面を復活させない。

## 検証

`node docs/releases/2026-10-15-prism-veil/check.mjs`。Playwrightの場所は `PLAYWRIGHT_MODULE` で指定可能。

`selected-reference.ts.txt` はユーザーが選択した2倍速試作の凍結ソース。通常面・field面、2種の位相、6時点の合計24通りをChrome Canvasで画素比較し、差分0を確認する。強度0、二重dispose、decode後の破棄維持、裏面拒否、CSS背景の小型tileも検証。結果は `qa.json`。

単体型チェックと `git diff --check` も実施。これは採用済み素材の画素一致と描画のライフサイクル検証であり、統合版の認証済みガチャや対人戦の成功を示すものではない。統合・デプロイ記録は共通実装担当が別途保存する。
