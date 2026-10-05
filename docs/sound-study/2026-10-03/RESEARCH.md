# 魔法カードのプレイ音 — 調査と5案

2026-10-03。ユーザーが現在のv6の音色を再び却下し、調査を踏まえた5案を要求。
比較プレビューを作成。採用・本体URL変更・ステージング配信は行わない。

## 読んだ一次資料と制作への反映

- [Hearthstone音響チーム / Blizzard](https://hearthstone.blizzard.com/en-gb/news/23964694/inside-battle-net-meet-the-sound-team-behind-hearthstone-s-harmonic-design/): カード操作の一定の拍、発動と命中の区別、聞かせる音の取捨選択。今回は共通プレイ音だけを比較し、ダメージ確定音は変えない。音源単体だけでなく同じカード・同じ動作・BGM中で比較する。
- [Fabio Coressel / BOOM Libraryの制作記録](https://www.boomlibrary.com/blog/inside-the-sonic-lab-behind-magic-alchemy/): 実物の反応を録り、短く、乾いた、組み合わせやすい魔法音へ加工する手法。長い残響や大きな爆発を足す方向を避け、元素材と立ち上がりに違いを持たせる。BOOMの販売音源は使用していない。
- [Iain McGregor本人の寄稿](https://www.asoundeffect.com/sounds-of-magic/): 身近な物の音を変形させ、開始・流れ・終わりで魔法の振る舞いを示す考え方。今回は物の質感を残し、音程を変えるだけの5案にしない。
- [Pro Sound Effects / Marshall McGeeの制作解説紹介](https://blog.prosoundeffects.com/how-to-sound-design-magic-spell-sound-effects): 同じ素材から異なる制作者が魔法音を作る比較を紹介している。記事本文を確認した。埋込動画の音声・手順まで視聴確認したとは扱わない。

参照ゲームの音声を抽出・転用していない。文献に基づく方針とLORE向けの制作判断を区別し、プロの実務経験や聴感審査を済ませたとは主張しない。

## 前回から変える設計

v6の生成コードは220/330/440/660 Hzの合成成分と和音の余韻を主役にしていた。
「魔法らしさ」を和音へ寄せすぎた、という制作上の仮説から今回はオシレーター/和音のベッドを使わず、CC0素材を編集する。
「変」というユーザー評価の原因を信号解析だけで確定したものではない。

| 案 | 主素材 | リズム・質感 | 想定用途/注意 |
|---|---|---|---|
| 01 シルクの封印 | 布、控えめなカード設置、風切り | 擦過から乾いた締まり | 連発向きの共通音候補。地味さは比較対象 |
| 02 エア・リリース | 実録の風切り、低く加工した布 | 滑らかな一つの押し出し | 属性を選びにくい共通音候補 |
| 03 クリスタルの展開 | 複数速度のガラス、布、風切り | 微細な粒と短いきらめき | 明るい魔法寄り。汎用性は01/02と比較 |
| 04 スパークの解放 | CC0火の効果音、風切り | 細かい破裂と短い放出 | 火属性寄り。全魔法に合うとは扱わない |
| 05 深いシジル | 低速の布、宝石素材、短い風切り | 低い擦過と奥行き | 暗い/重い魔法寄り。スマホの低域も比較 |

長さは0.48〜0.72秒。これはLOREの約480msのカード提示に合わせた制作値で、参照ゲームの実測値ではない。
現状のplaySpellの発音点は演出の開始。比較でもその点を変更しない。

## 比較と品質確認

- 同じ音量スライダー、同じ二乗ゲイン、既存と同じコンプレッサー設定。
- 候補の100 Hz以上の最強200ms区間を約-28.5 dB RMSへ調整。ITUラウドネス規格の完全な知覚一致ではない。
- 現在のv6は加工せず元の音量で比較可能。
- 各案の単音、3回反復、5案連続、実盤面、BGM、モノラル、停止を用意。
- 実盤面は同じエンジンのreduceとBaseController.playEventsを使い、playのバッファだけ差し替える。新しいVFXを比較用に捏造しない。
- 自動検証はデコード、信号、発音経路、再生/停止、画面サイズ等の確認。良い音かどうかの判断とは別。

## 素材と再現

既存のCC0素材を利用: Kenney、artisticdude Swishes、rubberduck RPG sounds。
使用ファイル・元ファイルSHA-256はsources.json、編集レイヤー・出力SHA-256はclient/src/dev/spell-sound-five/assets/manifest.json。
元ライセンスは元素材フォルダのLicense.txtおよびdocs/ui-rework/2026-09-27-audio-v4/sources/manifest.jsonに保存。
生成: `python scripts/audio/build_spell_five.py`（numpy、scipy、ffmpeg）。
プレビュー: `http://127.0.0.1:5393/spell-sound-five.html`。

## 検証結果

- clientのTypeScriptチェック成功（`tsc --noEmit -p client/tsconfig.json`相当、増分キャッシュ使用）。
- Chrome実行で単音5案、旧音、3回反復、5案連続、途中停止、BGM停止、モノラルを確認。
- 5案すべてで実コントローラーの魔法プレイ時に候補バッファが1回発音することを確認。永続魔法の設置も確認。
- 1440/390/320pxで横方向のはみ出しなし。デスクトップ・390pxのスクリーンショットを目視確認。
- `qa/report.json`に発音トレース・音源ハッシュ・確認項目、`qa/*.png`に画面を保存。
- ブラウザ検証: `PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/spell-sound-five-browser.mjs`。Playwrightが標準解決できれば環境変数は不要。Viteを5393番で起動してから実行する。
- Chromeのバッファ再代入制限に合わせ、プレビュー専用フックは初回のバッファ設定時に置換する。通常ゲームの`sound.ts`等に変更なし。

これは固定シーンでの機能検証であり、ログインした対戦・ステージングの確認や聴感の承認を意味しない。
