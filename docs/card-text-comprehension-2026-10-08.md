# 三言語の読み取り確認 — 2026-10-08

これは編集者による文面と実装の照合記録。初見プレイヤーや各言語の母語話者を募集して測定したユーザーテストではない。全360枚には表記ルール第6節の5問を適用し、条件・主体・対象・選択・順序・依存・期限・回数・ゾーンを確認した。全件の最終文面は監査台帳に保存している。

以下は複数の答えが出やすい25場面の具体的な設問と期待回答。三言語で同じ状況判断になることを再読した。対象不在・取消・支払い失敗などの代表分岐は `tests/card-wording.mjs` の26シナリオと既存のゲーム挙動テストで照合する。全25設問が個別の自動テストになっているという意味ではない。

## S8

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 自分自身を回収できるか。選択を断れるか。 | このカード自身は選べない。0枚で終了できる。 |
| 한국어 | 자기 자신을 회수할 수 있는가? 선택을 거절할 수 있는가? | 이 카드 자신은 선택할 수 없다. 0장으로 끝낼 수 있다. |
| English | Can it recover itself? May you decline? | No to itself. You may choose 0 cards. |

## PURGE_TOUCH

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 除外を選ばなかったら、烙印除去とドローはどうなるか。 | 烙印は全て取り除く。カードは引かない。 |
| 한국어 | 제외를 선택하지 않으면 낙인 제거와 드로우는? | 낙인은 전부 제거한다. 카드는 뽑지 않는다. |
| English | What happens if no card is exiled? | All your Brand counters are removed. You do not draw. |

## WINE_COLLECTOR

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | ワインが1枚だけでも自身はリフトへ行くか。 | 行かない。ワイン2枚以上の条件が全処理にかかる。 |
| 한국어 | 와인이 1장뿐이어도 수집가가 리프트로 가는가? | 가지 않는다. 와인 2장 이상이라는 조건이 모든 처리에 적용된다. |
| English | Does the Collector exile itself with only 1 Wine? | No. The entire effect requires at least 2 Wines. |

## HERMIT

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 体力50で使うと、通常の回復量ではいくつになるか。 | 65。40未満の補正はなくても、15回復は行う。 |
| 한국어 | 체력 50에서 사용하면 일반 회복량 기준으로 얼마가 되는가? | 65. 40 미만 보정이 없어도 15 회복은 한다. |
| English | At 50 HP with normal healing, what is the result? | 65 HP. The additional 15 healing still occurs. |

## ANCIENT_CIV

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 発動後8ターンの時点で、卵だけ先に得られるか。 | 得られない。全処理が双方通算9ターン以上経過後の自分ターン開始時に起きる。 |
| 한국어 | 발동 후 8턴에 알만 먼저 받을 수 있는가? | 불가능하다. 모든 처리는 양쪽 합계 9턴 이상이 지난 자신의 턴 시작에 일어난다. |
| English | Can you get the Egg after only 8 elapsed turns? | No. All steps require at least 9 elapsed turns and your turn start. |

## TGE4

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 最初の召喚で条件を満たさなかったら、次回やり直せるか。 | やり直せない。同名合計で最初の召喚だけ判定する。 |
| 한국어 | 첫 소환에 조건을 못 채우면 다음 소환에 다시 판정하는가? | 아니다. 같은 이름 합계로 첫 소환에만 판정한다. |
| English | If the first summon fails the condition, can a later copy try again? | No. Only the first summon of that name is checked. |

## VITAL4

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 鼓舞王が場を離れると、付与済みの気合は消えるか。 | 消えない。気合を持たない兵士・騎士への付与は持続する。 |
| 한국어 | 고무왕이 떠나면 이미 부여한 기합이 사라지는가? | 아니다. 기합이 없던 병사·기사에게 부여한 능력은 지속된다. |
| English | Does granted Guts disappear when the source leaves? | No. Guts granted to Soldiers and Knights that lacked it is lasting. |

## EGG_MASTER

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | カウンターを5個増やすと孵化が5ターン遅れるか。 | 遅れない。耐久カウンターと孵化までの残りターンは別。 |
| 한국어 | 카운터 5개가 늘면 부화가 5턴 늦어지는가? | 아니다. 내구 카운터와 부화까지 남은 턴은 별개다. |
| English | Do 5 added counters delay hatching by 5 turns? | No. Durability counters and hatch countdown are separate. |

## DRAGON_EGG

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 相手ターン開始時に孵化までの残りが0になったら直ちに孵化するか。 | 通常は次の自分ターン開始時に孵化する。孵化器の即時孵化は別効果。 |
| 한국어 | 상대 턴 시작에 남은 부화 턴이 0이면 즉시 부화하는가? | 통상 다음 자신의 턴 시작에 부화한다. 부화기의 즉시 부화는 별도 효과다. |
| English | Does reaching 0 at the opponent’s turn start hatch it immediately? | Normally it waits for your turn start. An Incubator’s immediate hatch is a separate effect. |

## MIND_BURST

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 腐敗カウンターも取り除いてダメージに数えるか。 | 数えない。気合用だけを取り除き、その合計×4。 |
| 한국어 | 부패 카운터도 제거하고 데미지에 세는가? | 아니다. 기합용만 제거하고 그 합계의 4배를 준다. |
| English | Are Decay counters removed and counted? | No. Only Guts counters are removed and multiplied by 4. |

## HIGH_ELF

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 相手の手札を0枚除外して終了すると、シールド破壊と雫2倍は起きるか。 | 起きる。手札の除外枚数に依存しない。 |
| 한국어 | 상대 패를 0장 제외하고 끝내도 실드 파괴와 이슬 2배가 일어나는가? | 일어난다. 제외한 패의 수에 의존하지 않는다. |
| English | If you exile 0 cards, do Shield destruction and doubling Dew happen? | Yes. They do not depend on exiling a hand card. |

## BLOOD_SECRET

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 吸血鬼を破壊できなかった場合、最大マナ+3と体力10は得るか。 | 得ない。自分への9ダメージは先に処理する。 |
| 한국어 | 흡혈귀를 파괴하지 못해도 최대 마나 +3과 체력 10을 얻는가? | 얻지 못한다. 자신에게 주는 9 데미지는 먼저 처리한다. |
| English | Do you gain 3 max mana and 10 HP if destruction is prevented? | No. The 9 damage to yourself is processed first. |

## WORLD_TREE

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 攻撃時と攻撃を受ける時の雫1消費は強制か。 | どちらも任意。支払った側の効果だけ得る。 |
| 한국어 | 공격시와 공격받을 때 이슬 1 소비는 강제인가? | 둘 다 선택이다. 소비한 쪽의 효과만 얻는다. |
| English | Are the 1 Dew payments mandatory? | No. Each is optional and grants only its corresponding effect. |

## CASTLE

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | カウンターが0でも攻撃を無効にできるか。 | できない。1個を消費する必要がある。 |
| 한국어 | 카운터가 0이어도 공격을 무효화하는가? | 아니다. 카운터 1개를 소비해야 한다. |
| English | Can it negate an attack with 0 counters? | No. It must spend 1 counter. |

## SNIPE1

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 弱い対象を自由に選べるか。 | 選べない。現在体力3以下から、攻撃力＋最大体力の合計が最大の対象を自動選択。相手のオーラ持ちは除外。 |
| 한국어 | 약한 대상을 자유롭게 고르는가? | 아니다. 현재 체력 3 이하 중 공격력+최대 체력 합이 가장 큰 대상을 자동 선택한다. 상대 아우라 몬스터는 제외한다. |
| English | Can you freely choose a weak target? | No. Among monsters with current HP at most 3, it automatically takes the highest ATK plus max HP, excluding enemy Aura monsters. |

## Q_CASTLE

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 同名の別の城に替えれば進捗を引き継ぐか。 | 引き継がない。同じ個体で双方のターン終了を連続9回。 |
| 한국어 | 같은 이름의 다른 성이 진행도를 이어받는가? | 아니다. 같은 개체로 양쪽 턴 종료를 연속 9회 유지해야 한다. |
| English | Does a replacement Castle keep progress? | No. The same copy must remain for 9 consecutive turn ends, counting both players. |

## BREWING

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 発動後6回目の自分ターン開始時に送ったぶどうはワインに数えるか。 | 数える。ぶどうの処理をしてから、その時のカウンター数でワインを生成する。 |
| 한국어 | 발동 후 6번째 자신의 턴 시작에 보낸 포도도 와인에 세는가? | 센다. 포도 처리 후의 카운터 수로 와인을 생성한다. |
| English | Do Grapes sent on the 6th subsequent turn start count? | Yes. Grapes are processed before the final counter total creates Wines. |

## QUICK_REBIRTH

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 購入コスト8のモンスターを選ぶとどうなるか。 | 何も起こらない。召喚するのは7以下だけ。 |
| 한국어 | 구매 코스트 8 몬스터를 고르면? | 아무 일도 일어나지 않는다. 7 이하만 소환한다. |
| English | What happens if you choose a purchase-cost 8 monster? | Nothing. Only cost 7 or less is summoned. |

## QUICK_ATTUNE

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 買ったカードは手札か墓地に入るか。 | どちらでもない。即効魔法なので、処理前に自分のリフトへ行く。 |
| 한국어 | 구매한 카드는 패 또는 묘지로 가는가? | 둘 다 아니다. 속공 마법이므로 처리 전에 자신의 리프트로 간다. |
| English | Does the purchased card enter your hand or graveyard? | Neither. As a Quick spell, it goes to your Rift before resolving. |

## ROGUE_ART

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | アサシンがいれば、0コストと全体回避のどちらかを選ぶか。 | 選ばない。購入・発動コスト0で、発動時にアサシンがいれば全体に付与する。 |
| 한국어 | 암살자가 있으면 0 코스트와 전체 회피 중 하나를 고르는가? | 아니다. 구매·시전 코스트는 0이고 발동시 암살자가 있으면 전체에 부여한다. |
| English | With an Assassin, do you choose between free cost and group Evade? | No. The cost is 0, and controlling an Assassin on cast makes Evade affect all your monsters. |

## FIRE_ARROW

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 3回とも同じ対象になるか。 | 毎回選び直す。同じ対象が繰り返し選ばれることもある。 |
| 한국어 | 3회 모두 같은 대상인가? | 매번 다시 정한다. 같은 대상이 반복해서 선택될 수도 있다. |
| English | Are all 3 hits locked to the same target? | No. Each hit chooses again; a target may be chosen repeatedly. |

## ANESTHESIA

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 後から召喚したモンスターも守るか。 | 守らない。発動時点で自分の場にいたモンスターだけ。 |
| 한국어 | 나중에 소환한 몬스터도 보호하는가? | 아니다. 발동시 자신의 필드에 있던 몬스터만 보호한다. |
| English | Does it protect monsters summoned later? | No. Only monsters on your field when it resolves. |

## DEFENSIVE_STANCE

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 同名ゴーレム2体の場合、シールドは何回、いくつ得るか。 | 種類数は1なので、5を1回で得る。他の補正がなければ合計5。 |
| 한국어 | 같은 이름 골렘 2체이면 실드를 몇 회, 얼마 얻는가? | 종류 수는 1이므로 5를 1회 얻는다. 다른 보정이 없으면 합계 5다. |
| English | With 2 Golems sharing a name, how much Shield and how many gains? | One distinct name gives 5 Shield in a single gain, before other modifiers. |

## DISCOVERY

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | この効果で引いた3枚だけで追加1枚の条件を満たすか。 | 満たさない。この効果より前の追加ドローが必要。 |
| 한국어 | 이 효과로 뽑은 3장만으로 추가 1장 조건을 채우는가? | 아니다. 이 효과 이전의 추가 드로우가 필요하다. |
| English | Do its own 3 draws activate the extra draw? | No. An extra draw before this effect is required. |

## ORIGIN_RITE

| 言語 | 設問 | 期待回答 |
|---|---|---|
| 日本語 | 相手の場にオーラ持ちモンスターしかいない場合、対象がある扱いか。 | ない扱い。選択候補がなければ烙印1個を付与する。 |
| 한국어 | 상대에게 아우라 몬스터만 있으면 대상이 있는 것으로 보는가? | 아니다. 선택 후보가 없으면 낙인 1개를 부여한다. |
| English | Does a field containing only enemy Aura monsters provide a target? | No. If no eligible target exists, give 1 Brand counter instead. |
