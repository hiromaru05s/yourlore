# パッシブ説明の改訂

11種類の三言語説明を実装に照合し、条件・効果・処理・補足の段落に分けた。ゲームの数値や処理は変更していない。

| 能力 | 主な確認・修正点 | 実装の照合先（engine.ts） |
|---|---|---|
| 虚無 | カード種別で説明を分ける。リフトと墓地の違い、デッキ補充、魔法が無効になった場合、単に手札から捨てた場合を区別 | destroyMonsterCore / binEnch / playFromHand / resolveTarget / drawN |
| 神器 | 選択除外の対象外。自動除外時は手札ではなく墓地へ戻り、再補充される | purgeChoices / sweepRelics |
| 気合 | 召喚時のカウンター、致命ダメージ時に1個消費、体力1で生存。貫通は防げず、魔法ダメージや直接破壊とは区別 | applyFieldGlobals / resolveAttackCore / monsterDamage / endureWithGuts |
| 腐敗 | 攻撃ダメージ前にカウンター付与。3個で破壊し、破壊に成功した場合のみ持ち主へ3ダメージ。用途の異なるカウンターは合算しない | resolveAttackCore / addDecay |
| 反撃 | 破壊されても攻撃力半分切り上げで反撃。無効攻撃には発動せず、貫通・再反撃・攻撃時効果は発生しない | resolveAttackCore / counterHit |
| 二刀流 | 自分の各ターンに2回。最初の攻撃が無効でも1回分消費 | resolveAttackCore / attack action |
| 暗襲 | 相手モンスターを無視してプレイヤーに直接攻撃。モンスターへの攻撃は不可。直接攻撃禁止は受ける | monsterCanAttack / attack action |
| オーラ | 相手の魔法・モンスター効果による選択対象から保護。攻撃・全体効果・自分の選択効果は受ける | resolveTarget / areaDamage |
| 威厳 | そのターンに召喚された相手モンスターの攻撃を禁止。保有者がいなくなれば制限解除 | monsterCanAttack / attack action |
| 挑発 | 挑発を持たない味方への攻撃が条件。保有者が複数でもダイス1個、成功時はランダム1体が引き受ける。直接攻撃は対象外 | resolveAttackCore |
| 回避 | 攻撃される時にダイス1個、4以上で攻撃無効。攻撃回数は消費。魔法ダメージ・反撃には発動しない | resolveAttackCore / counterHit |

虚無を保有するカードには該当する種別だけを表示し、虚無を付与・参照するカードには全種別を表示する。アイコンの共通説明も同じ段落データから作る。見出し付きの段落内でも固有カード名・シリーズ参照のリンク変換を維持する。

検証: `tests/passive-explanations.mjs` は説明上の分岐を実際のエンジンで確認する。`tests/card-effect-ux.mjs` は全カード三言語で段落と全文の保持を確認する。`tests/passive-explanations-browser.mjs` は11能力・虚無3種別・虚無参照を三言語・1280/390幅で表示し、本文16px以上・横はみ出し・戻るフォーカスを検査する。ブラウザの本番検証ではAPI応答だけを隔離したfixtureに置き換え、公開済みHTML/JS/CSSと実際のカード一覧を使う。

これらは実装・表示の検証であり、初見プレイヤーや母語話者のユーザーテストではない。公開先・バージョン・実行結果はリリース記録に残す。
