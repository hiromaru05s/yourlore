# 対戦効果音の再設計 — 2026-09-27

クリック／タップが良い一方、対戦効果音は世界観に合わないという指摘への修正。承認済みUIの `click` 3種・`pop`・`error` は **v3のファイル、音量、再生ポリシーを維持**。それ以外の29キュー／35ファイルをv4へ変更した。現在の選択音源は合計40ファイル・約550 KiB。

## 調査と方向

LOREの基準は `docs/world-bible.md` のBiblion：書物の記録が魔法で具現化する図書館。木・布・ガラスの生活音だけでは、この具現化と戦闘の感触を表せていなかった。

Hearthstone制作チームは、カードの印象に即して素材を加工し、発動と着弾の拍を設計すること、音楽的な魔法音を環境音と共存させ、鳴らす音を選ぶことを説明している。この考え方を、短いカード操作音と広がる魔法の余韻、移動と接触の分離に適用した。他作品の音源は使用していない。

出典：[Blizzard — Inside Battle.net: Meet the Sound Team Behind Hearthstone’s Harmonic Design](https://news.blizzard.com/en-gb/article/23964694/inside-battle-net-meet-the-sound-team-behind-hearthstones-harmonic-design)。

BGMの方向は、Biblionの静けさと対戦の緊張を保ち、繰り返す効果音が旋律と競合しないこと。今回の主な指摘を効果音の修正と捉え、別途指定されたホーム・開幕・対戦の3曲は維持した。対戦曲は引き続きホームの60%のゲイン、曲末3秒の間隔。効果音側の低域を整理し、鋭い高域を抑え、魔法の余韻を短く拡散させて共存させる。BGMそのものの新規作曲・差し替えは含まない。

| 場面 | 今回の音設計 |
|---|---|
| ドロー・シャッフル・破棄 | 短く静かな紙の動き。頻度が高くても前に出すぎない |
| 魔法・召喚 | 専用の魔法素材。発動と具現化に立ち上がりと奥行きを付ける |
| 攻撃・着弾 | 刃の振り抜き→短い魔力の衝撃。着弾時に移動音の残りを35msでフェード |
| マナ | 明るい共鳴と上へ開く余韻。水晶到着時の発音を維持 |
| 回復 | マナより低く柔らかな共鳴、ゆっくり消える余韻 |
| 罠・死亡・リフト | 暗く吸い込まれる音と減衰。明るい獲得音と区別 |
| 勝敗 | 決着に合わせた魔法の余韻。前の戦闘音をフェードして空間を作る |
| コイン・ダイス | 金属・転がりの素材を短く整え、魔法音とは区別 |

## 素材と再現

新規素材は作者がCC0で公開したもの。使用分だけを `sources/` に保存し、作者・配布ページ・個別SHA-256を記録。

- [JaggedStone — Magic Spell SFX](https://opengameart.org/content/magic-spell-sfx)：魔法音のレイヤー。
- [rubberduck — 80 CC0 RPG SFX](https://opengameart.org/node/86018)：刃、魔法、書物、金属、水晶など。
- 既存のKenney CC0紙・ダイス素材は `../2026-09-27-audio/sources/` から参照。

音源ごとに切り出し・速度・帯域・相対音量・短いステレオ残響を調整。生活音のガラスを各イベントでピッチ変更して使う構成を廃止。加工はビルド時のみで、ゲーム内の合成処理や外部音声サービスは追加しない。使用音源・加工後のハッシュ・音量は `client/public/sfx/lore-v4/manifest.json` を参照。

```sh
python scripts/audio/build_lore_sfx_v4.py  # numpy, scipy, ffmpeg
python scripts/audio/check_lore_sfx_v4.py
node tests/audio-v3.mjs                  # 共通ミキサーの回帰検証
node tests/ceremony-audio-aim.mjs
LORE_TEST_ORIGIN=http://127.0.0.1:5218 node tests/audio-v3-browser.mjs
```

## 確認用音源

- `review-v4-with-bgm.mp3`：新版、31秒。
- `review-v3-with-bgm.mp3`：旧版、同じBGM・音量・イベント時刻。
- `review-timeline.json`：再生順と時刻。

既存の対戦BGMをゲームの初期ゲイン0.147、効果音を0.49で重ねた比較用レンダー。実プレイ録音ではなく、決めた時刻の比較音源。波形検査・ブラウザ検査は発音・同期・信号品質の確認であり、音色の主観的な良さを耳で確認したという意味ではない。

## 検証

- クライアント／サーバーtypecheck、production build。
- 全40MP3の実デコード：ピーク-3 dBFS未満、立ち上がり90ms未満、末尾クリック・DCなし、モノラルでも主要成分を維持。UI5ファイルのSHA-256一致、対戦35ファイルは全て更新。
- 共有ミキサー：8同時発音上限、遅延デコード破棄、ミュート／遷移／スキップ時の停止、攻撃の移動音と決着前の残音のフェード。
- Chromeの実Web Audio：全32キュー再生、攻撃1回につき着弾1回、相手の回復、召喚の着地VFXとの時差40ms以内、早送り時の消音。
- 実画面のBGM再生とステージング検証の結果は `checks/` と `staging/` に記録。オンライン通信／アカウントのfixtureを使った確認と実音源再生を区別する。

## ステージング反映

実装コミット `178c31e` をmainへ統合し、`https://test.yourlore.xyz/?v=178c31e` へ反映。Worker version `d8d90c19-b472-4e02-9834-d939cec97df3`。公開58ファイルのSHA-256一致、全40音源のChromeデコードを確認。公開アプリでBOT戦を起動し、v4の対戦音源とv3のUIだけを読み込むこと、開幕曲から対戦曲への切替、対戦曲末の 3001.7 ms の間隔を確認。ページ例外なし。アカウント/APIのみfixture、配信アプリ・BOT処理・音源は実物。
