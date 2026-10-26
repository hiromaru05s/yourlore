# ゲーム中のカード外側に出る灰色の下地

2026-10-26、ローカル作業ツリーに修正。ステージング・本番へのデプロイは未実施。

召喚rendererがカードの画像とは別に灰色の角丸長方形を描いていた。モンスターの旧／現行rendererにも、召喚・攻撃・効果発動・強化時にカードの外側へ見える矩形の影が残っていた。これらの追加下地を削除した。召喚時の表面反射はキャプチャしたカード面のalphaで切り抜き、透明部分へ四角い光が乗らないようにした。カード本来のラスターフレーム、数値、接触時の砂塵は保持する。

CSSではカードの背景・外枠を最初から透明にし、後半の上書きに依存していた古い設定と、未使用の拡大表示用矩形シャドウ／全面反射を整理した。

## 見た目の確認

- [修正前／修正後の拡大比較](comparison.png)。ローカル実盤面の召喚途中を切り出したもの。同一時刻の画素差分ではない。
- [通常速度の召喚動画](summon.mp4)。実際に動く盤面の録画から抜粋。音声なし。
- [PCの召喚途中](desktop-summon.png)、[スマホの相手カード拡大](mobile-summon.png)。

通常速度の連続再生と途中フレームで、カードの下に出ていた灰色の四角い面がなく、枠・絵・数値が残ることを確認した。ユーザーによる見た目の承認とは別。

## 機能検証

`tests/card-frame-contour-browser.mjs` を追加。製品main.tsのCSS全体を読み、メニュー側の追加スタイルがbody直下の演出カードに波及する場合も検査する。[実行結果](browser-report.json)。

- alphaを持つ十字形の検査用カードで、カード面・反射から四角い塗りがはみ出さないことを画素検査。
- 接触前の召喚ground pass、召喚・攻撃・発動・攻撃力／体力強化のrear passに追加の下地がないことを画素検査。
- 通常カード・旧裏面・伏せ罠のCSSに背景色・border・box-shadowが付かないことを検査。
- 1280×900／390×844、両陣営のcontroller召喚、両陣営の魔法プレイ、同時召喚、スキップ、低減モーション、resize、完了後の演出要素回収を確認。
- 修正前は、接触前の召喚ground passで外側のalpha=65を検出して失敗。修正後は同じ領域のalpha=0。
- `tests/slate-summon.mjs`、`tests/spell-frame.mjs`、`tests/monster-animation-rules.mjs` 合格。
- 製品エントリから到達するソースのTypeScript検査は合格。クライアント全体の `npm --workspace client run typecheck` は、未変更の `src/dev/card-finish-three` 等の試作エラーで不合格。
- デザインガードと製品Viteビルドは合格。出力先は作業用の一時ディレクトリとし、既存のdistや公開環境を更新していない。

再実行例（PlaywrightとChromeが必要）:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/card-frame-contour-browser.mjs
```

標準出力先は `.cache/card-frame-contour`。`LORE_RECORD_VIDEO=1` で動画も保存する。ブラウザーfixtureでの確認であり、認証済みオンライン対戦・実機性能・デプロイ済み環境の確認は含まない。

## 本番公開用の統合

公開指示後、`963f874e` の最新採用実装を土台に専用worktreeへ移植。既存のUI・ランキング・カード画像等を作業元の古い版へ戻さないよう、5ファイルの修正差分だけを適用した。現行の通常召喚はM2で検証し、fixtureの開始演出待機も現行controllerに合わせた。

現行のエルフ・吸血鬼・呪術師・魔法使い・傭兵・シールドタイタンにも、印刷面とは独立した不透明な裏板／矩形の影があった。`summon/boardRender.ts` でゲーム中の描画時だけそれらを隠し、描画後には元のvisibilityを復元する。比較用スタジオの描画、選択済みの表面変形・葉・歯・破片・水晶等は維持する。

専用6系統で透明な検査カードに余計なalphaが出ないことを画素検査し、実盤面で6系統すべての通常再生・完了・後片付けを確認。最新main全体のフロント・サーバー型チェックも合格。`tests/summon-card-contour.mjs` を製品検証スイートへ登録し、下地だけを除外すること、スタジオへ状態が漏れないこと、renderer例外時の復元を検査する。

- [最新採用実装での検証結果](main-browser-report.json)
- [最新採用エルフの召喚](main-elf-summon.png)
- [最新採用通常モンスターの召喚](main-generic-summon.png)

公開状況はデプロイ後の `deployment.json` で記録する。
