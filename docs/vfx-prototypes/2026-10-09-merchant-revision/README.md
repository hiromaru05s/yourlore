# 商人の金貨／闇商人の魔法：各4案

2026-10-09。旧6案への「ダサい」という評価を受けて構成から変更した比較用プレビュー。ユーザー選択、通常対戦への採用、ステージング反映はまだ行っていない。

## プレビュー

`http://127.0.0.1:55143/merchant-six.html?revision=2`

「音付き再生」で4案を同時再生する。音は選択中の1案のみ。「この案を再生 ♪」で音も個別に比較できる。「実盤面・手札から」は実際の GameView / boardMatrix を使う検証用盤面であり、対戦エンジンへ統合したものではない。

| 対象 | 01 | 02 | 03 | 04 |
|---|---|---|---|---|
| 見習い商人・2枚 | 両脇の釣銭 | 扇の払い出し | 片跳ねの勘定 | 縁回りの余韻 |
| 王都の商売人・6枚 | 両脇の釣銭 | 扇の払い出し | 片跳ねの勘定 | 縁回りの余韻 |
| 闇商人・魔法 | 黒貨の通行料 | 禁庫の放出 | 影秤の契約 | 夜市の開幕 |

通常商人は同じ4方向を2枚と6枚で比較し、枚数に応じて扇の角度、飛ぶ高さ、着地時刻が変わる。合計12通り。

## 今回変えた点

- 通常商人：既存の通常召喚 Slate をそのまま使い、着地後の金貨だけを追加。カード自体の商人専用変形は廃止。厚み、縁の刻み、表裏の浮彫、金属反射を持つ3Dコインが放物線を描き、接地・減衰・微細な消失へ続く。
- 2枚／6枚は実際に描画する金貨の数。光点を金貨の代わりに数えていない。
- 闇商人：魔法カードとして手札位置から中央へ拡大。カードの面を読み取れる状態で保持し、その周囲に専用の闇市場を形成する。黒貨、門と幕、金庫の蓋、秤の揺れ、天幕の展開をそれぞれ別の動きにした。
- コイン音：既存の `coinLand.mp3` を接地時刻に同期。黒貨は低い再生音程。シークは無音、停止は発音ノードも停止。
- 3.1秒の通常召喚と6.6秒の特別魔法を明確に分離。闇商人をモンスター枠へ着地させない。

## 参照と判断

着手前に `docs/animation-quality-benchmark.md`、`docs/vfx-art-direction.md`、`docs/world-bible.md` を参照した。

他チャット「選ばれし領域のエフェクト案を作成」の、既存カード画像を周辺オブジェクトへ流用した案が拒否された経緯を確認。採用された改稿の連続動画と `docs/vfx-prototypes/2026-10-08-chosen-six/revision2/RESEARCH.md` を参照した。始原は `ui/tribeSynergy/victory.ts` の細い金属彫刻、段階的な形成、抑えた光を確認した。比較作品と同品質だというユーザー承認は得ていない。

- [Blizzard: The Art Behind the Science](https://news.blizzard.com/en-us/article/22552047/developer-insights-the-art-behind-the-science)：カード固有の出来事と主動作を中心に置く考え方を参照。
- [Riot: Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)：重要度と読みやすさに合わせたエフェクトの規模、視覚的な雑音の抑制を参照。

## 専用素材

内蔵 `image_gen` を使用。プロンプトと生成元の完全な記録は [prompts.json](prompts.json)。PNGは全て1536×1024で実アルファを保持。

- `client/src/dev/merchant-v2/assets/gate.png`
- `client/src/dev/merchant-v2/assets/coffer.png`
- `client/src/dev/merchant-v2/assets/balance.png`
- `client/src/dev/merchant-v2/assets/bazaar.png`

カード絵はカード面そのものにだけ使用。周囲の専用造形にカード画像を貼り付けていない。生成画像に対する形成・消失・部位の変形は WebGL シェーダーで描く。

## 検証

- scoped TypeScript と比較ページ用 Vite build を実施。
- [checks.json](qa/checks.json)：37項目。3カード×4案×両側、手札トリガー、3枚同時、終了時のカード復帰、音の解除・停止、低減表示、24回の切替後のコインGPUリソース数、320/390/844pxの横はみ出し、ブラウザエラー。
- 4案同時のリアルタイム収録 `*.webm` には実際の WebAudio 出力を含む。配布用 `*-continuous.mp4` は24fpsで時刻を固定した全フレーム書き出しで、同じコイン素材・発音時刻・音程・音量を OfflineAudioContext で合成した音声を含む。動画の音は01のみ。リアルタイム収録時のフレーム間隔は各 `*-capture.json` に記録。書き出し動画を60fps保証の根拠にはしていない。
- 金貨の軌道を5ms刻みで検査し、全8通りで最大2枚／6枚、負の高さなし、終了時に金貨なしを確認：`qa/coin-counts.json`。
- 最終修正後、魔法の終了／停止で暗幕と盤面の減光が消えること、320pxで拡大カードが見えることを再確認：`qa/final-checks.json`。
- 実盤面画像・モバイル画像・4案比較画像は `qa/` に保存。
- 見た目の自己確認：通常商人はカードの着地を変えず、金貨の輪郭と跳ね方が区別できる。闇商人は主造形と成立順序が4案で異なり、中央のカードを遮らない。最終的な見た目の採否は未決定。

## ローカル起動

リポジトリ直下から:

```sh
./node_modules/.bin/vite --config client/src/dev/merchant-six/vite.config.mjs
./node_modules/.bin/tsc -p client/src/dev/merchant-v2/tsconfig.json --noEmit
./node_modules/.bin/vite build --config client/src/dev/merchant-six/vite.config.mjs
```

比較用エントリーだけを `merchant-v2` へ向けた。旧 `merchant-six` の制作コードと資料は履歴として保持。
