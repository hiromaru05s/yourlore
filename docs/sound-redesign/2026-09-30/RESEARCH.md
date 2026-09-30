# TCG効果音の再調査と v5 の制作判断

2026-09-30。ユーザーはHOMEの操作音、draw③、buyを承認。攻撃・召喚・被弾・impact・facehit・mana-payを明示的に却下し、全体を再適用してステージング前に試聴するよう指定した。

## 一次資料で確認したこと

1. **Hearthstoneの音響チーム**。固定されたゲーム動作にリズムを合わせ、カードの性格・印象を音へ反映する。魔法も発動と接触の拍を分ける。多くの音を重ねればよいのではなく、何をいつ鳴らすかを選ぶ。
   - Blizzard, *Inside Battle.net: Meet the sound team behind Hearthstone’s harmonic design*。
   - https://news.blizzard.com/en-us/article/23964694/inside-battle-net-meet-the-sound-team-behind-hearthstones-harmonic-design
2. **Magic Duels: Originsの実制作**。音響制作者Harry Boamは、カードのアニメーションから接触点を確認し、最大の衝撃へ低中高域の厚みを集め、その周囲に動きを付ける工程を記録。作品の性格によって、Hearthstoneの軽快さとMagicの暗い残響の方向も異なる。
   - Harry Boam (2016), *An autoethnographical study on how creative sound work is affected by commercialisation and the professional media industry*, University of Huddersfield, pp.53–57。
   - https://eprints.hud.ac.uk/id/eprint/30303/1/Final%20thesis.pdf

資料の文章・制作記録を調査した。両ゲームの実プレイを今回録画／聴取して比較したという記録ではない。「TCGなら必ずこの音色」という単一の正解を資料から導いてはいない。

## 既存実装の問題と今回の判断

v4では攻撃にも魔法素材を足し、impact・damage・facehitを近い素材の組み合わせにしていた。召喚にも魔法素材を重ね、mana-payは逆再生の魔法だった。多くのキューに拡散残響が付く構成だった。これは生成コードの確認であり、機械的な信号チェックから聴感の良さを断定したものではない。

今回の制作判断は、**移動の音、当たった音、場へ置かれた重さ、資源操作の小さな確認音を分ける**こと。新しい振り抜き・打撃素材を導入し、v4のJaggedStone魔法レイヤーを新版では使わない。幅広い拡散残響を外し、必要な音にだけ短い初期反射を付ける。

| 役割 | v5の狙い | 長さ（設計値） |
|---|---|---:|
| attack | 短い風切り。まだ命中していない動き | 250ms |
| impact | 硬い芯のある打撃。カードへの接触 | 290ms |
| facehit | 低中域の重さを足した直接攻撃 | 400ms |
| damage | 短く詰まったダメージ通知 | 300ms |
| summon | 低い着地の芯＋短い空気の広がり | 580ms |
| mana-pay | 小さな結晶接触＋短い抜け | 250ms |
| play | 紙の操作と短い発動の抜け | 420ms |
| heal | 柔らかい上昇、打撃成分なし | 780ms |

これらの長さ・レベルはLORE向けの制作値。参照ゲームを実測した数値ではない。

## 保持と再適用のマトリクス

| ユーザー要望 | 実装・成果物 | 確認 |
|---|---|---|
| HOMEの音は良い | click全3種、pop、error、coin、matchのURLとバイト列を維持 | ハッシュ一致 |
| drawは③だけ | soundUrls('draw')は既存draw-3のみ | 5回連続再生でも③のみ |
| BuyはOK | 既存buyを保持。buyRevealの支払い完了後に追加。無料／簡易表示も確認音あり | UI関数の実ブラウザ確認 |
| 攻撃・召喚・被弾などを作り直す | 28キュー／32ファイルをv5として再制作 | デコード・信号・ブラウザ試聴 |
| 全体を再適用 | 全35キューをmanifestとsoundUrlsで照合 | 41選択ファイル一致 |
| ステージング前に音を見せる | /sound-review.html。旧／新、単音／連続、BGMあり／なし | 全ボタン・停止・スマホ表示 |

## 素材

- artisticdude, [Swishes Sound Pack](https://opengameart.org/content/swishes-sound-pack), CC0。作者による木の棒・ハンガー等の振り抜き録音。
- Jordan Irwin (AntumDeluge), [Thwack Sounds](https://opengameart.org/content/thwack-sounds), CC0。物を叩いた録音。原ライセンスは `sources/thwack/LICENSE.txt`。
- Kenney, [Impact Sounds](https://kenney.nl/assets/impact-sounds)ほか、既存リポジトリ内のCC0録音。
- 低い減衰衝撃、短い空気のテクスチャ、減衰共鳴はオリジナルのオフライン合成。ゲーム中の合成処理ではない。

他作品のゲーム音源は取り込んでいない。元データ、使用ファイルのハッシュ、出典は `sources/manifest.json`。各出力の素材は `inventory.json`。

## 適用状態

分離した `sfx-rebuild-preview` 作業ツリーで制作。続くユーザーの「フィードバックする時間ないから終わったらステージングにあげといて」に従い、mainへ統合してステージングに反映。本番は対象外。機能・デコード検証は主観的な聴感評価を代替しない。

前回の未適用シーンへ一律に音を追加する作業は含めない。既存の全音を再評価・再割当し、明示的に承認されたBuyの未接続だけを補う。開始BGM、対戦BGM、HOME BGMは変更しない。
