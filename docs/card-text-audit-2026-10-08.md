# 全カード効果表記監査 — 2026-10-08

360枚 × 日本語・韓国語・英語 = 1080文面。生成専用カードとスターターを含む。前版の実装照合に加え、全件の条件・主体・対象・選択・処理順・期限・回数を再読し、明示的な段落構造と改定ルールに合わせた。

文面変更：351枚／1053文面。残りも全件確認済み。

## 改定範囲

- 条件と処理を分離し、独立した発動タイミングごとに見出しを付ける。
- 成功に依存する処理、任意選択、条件が複数処理にかかる範囲を明記。
- リコールの自身除外、浄化の手の選択取消、コレクターの条件付き移動等を実処理に合わせる。
- 卵の耐久と孵化までの残りターンを分離。カウンターの用途・付与先を明記。
- 全言語の略記を整理し、墓地／リフト、現在／最大／印刷体力を維持。
- 詳細画面の見出し、文字付き能力名、開閉する共通用語欄。

## 証拠の範囲

非テキストのカード定義は基準カタログと同一。エンジンのゲーム処理は変更していない。台帳のハッシュは再編集の検知用で、意味の正しさや読者の理解度を自動証明しない。

読み取り設問と各言語の期待回答は card-text-comprehension-2026-10-08.md、実行した検証と公開先は今回のリリース記録を参照する。実際の初見プレイヤー／母語話者のユーザーテストは実施していない。

## 全件結果

### M1 — スパーク・インプ

確認済み：既存の明確な表記を維持。実装キー：`{}`。

**ja**

> —

**ko**

> —

**en**

> —


### M2 — ストーン・パップ

確認済み：既存の明確な表記を維持。実装キー：`{}`。

**ja**

> —

**ko**

> —

**en**

> —


### M3 — ダスト・スカウト

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"draw"}`。

**ja**

> 【召喚時】カードを1枚引く。

**ko**

> 【소환시】카드를 1장 뽑는다.

**en**

> 【On Summon】Draw 1 card.


### M4 — ブレード・ヘア

確認済み：既存の明確な表記を維持。実装キー：`{}`。

**ja**

> —

**ko**

> —

**en**

> —


### M5 — アイアン・シェル

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"selfBurn"}`。

**ja**

> 【召喚時】自分に2ダメージを与える。

**ko**

> 【소환시】자신에게 2 데미지를 준다.

**en**

> 【On Summon】You take 2 damage.


### M6 — ツイン・ファング

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"defDown"}`。

**ja**

> 【召喚時】相手モンスター1体を選び、その体力-2（持続）。

**ko**

> 【소환시】상대 몬스터 1체를 선택해 그 체력 -2(지속).

**en**

> 【On Summon】Choose 1 enemy monster; it gets -2 HP (lasting).


### M7 — エンバー・ドレイク

確認済み：表記改定（ja / ko / en）。実装キー：`{"turnFx":"emberRecoil","attackFx":"chainKill"}`。

**ja**

> 【攻撃時】このモンスターの攻撃で相手モンスターを破壊したら、このターンに1回だけ追加で攻撃できる。
> 
> 【自分ターン開始時】ダイス1個を振り、5以上なら自分に3ダメージを与える。

**ko**

> 【공격시】이 몬스터의 공격으로 상대 몬스터를 파괴하면 이번 턴에 1회만 추가로 공격할 수 있다.
> 
> 【자신 턴 시작시】주사위 1개를 굴려 5 이상이면 자신에게 3 데미지를 준다.

**en**

> 【On Attack】If this monster destroys an enemy monster with its attack, it may attack once more, once per turn.
> 
> 【Your Turn Start】Roll 1 die; on 5 or more, you take 3 damage.


### M8 — グローブ・ウォーデン

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"heal"}`。

**ja**

> 【召喚時】自分の体力を1回復する。

**ko**

> 【소환시】자신의 체력을 1 회복한다.

**en**

> 【On Summon】Restore 1 of your HP.


### M9 — レリック・ハンター

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"refreshToken"}`。

**ja**

> 【召喚時】自分にカウンター1個を付与する（提示更新用）。
> 
> 【自分のターン中】自分のターン中、そのカウンター1個を消費して提示マーケットをマナなしで更新できる。このモンスターが場を離れても、未使用のカウンターは残る。

**ko**

> 【소환시】자신에게 카운터 1개 부여한다(제시 갱신용).
> 
> 【자신의 턴 중】자신의 턴 중 그 카운터 1개를 소비해 마나 없이 제시 마켓을 갱신할 수 있다. 이 몬스터가 필드를 떠나도 사용하지 않은 카운터는 남는다.

**en**

> 【On Summon】Gain 1 counter for refreshing offers.
> 
> 【During Your Turn】During your turn, you may spend 1 of these counters to refresh your offer market without paying mana. Unspent counters remain even after this monster leaves the field.


### M10 — マナ・ゴーレム

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"manaGolem"}`。

**ja**

> 【場にいる間】自分の場の、このモンスター以外の「ゴーレム」系モンスター1体につき、自分の最大マナ+1。

**ko**

> 【필드에 있는 동안】자신의 필드의 이 몬스터 외 골렘 계열 몬스터 1체당 자신의 최대 마나 +1.

**en**

> 【While on the Field】Your max mana +1 for each other Golem-family monster on your field.


### M11 — ウォーロード

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"warlordKnight"}`。

**ja**

> 【召喚時】自分の場に他のモンスターが2体以上いれば、「騎士」1体を自分の場に召喚する。

**ko**

> 【소환시】자신의 필드에 다른 몬스터가 2체 이상이면 기사 1체를 자신의 필드에 소환한다.

**en**

> 【On Summon】If you control at least 2 other monsters, summon 1 Knight to your field.


### M12 — タイタン・ゲート

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"atkDown"}`。

**ja**

> 【召喚時】相手モンスター1体を選び、その攻撃力-1（持続）。

**ko**

> 【소환시】상대 몬스터 1체를 선택해 그 공격력 -1(지속).

**en**

> 【On Summon】Choose 1 enemy monster; it gets -1 ATK (lasting).


### S1 — 三撃の火種

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"dmg"}`。

**ja**

> 【発動時】ダイス1個を振る — 1-2: 相手に3ダメージを与える / 3-4: 次の相手ターン開始時に得るマナ-1 / 5-6: 相手は次のターン、購入コスト3以下のモンスターを召喚できない。

**ko**

> 【발동시】주사위 1개를 굴린다 — 1-2: 상대에게 3 데미지를 준다 / 3-4: 다음 상대 턴 시작에 얻는 마나 -1 / 5-6: 상대는 다음 턴 구매 코스트 3 이하 몬스터를 소환할 수 없다.

**en**

> 【On Cast】Roll 1 die — 1-2: Deal 3 damage to the opponent / 3-4: The opponent gains 1 less mana at their next turn start / 5-6: The opponent cannot summon monsters with purchase cost 3 or less next turn.


### S10 — 青藍の書庫

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"draw"}`。

**ja**

> 【発動時】カードを2枚引く。

**ko**

> 【발동시】카드를 2장 뽑는다.

**en**

> 【On Cast】Draw 2 cards.


### S3 — 刃の囁き

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"buffPerm"}`。

**ja**

> 【発動時】種族を持たない自分の場のモンスター1体を選び、その攻撃力+3（持続）。

**ko**

> 【발동시】종족이 없는 자신의 필드의 몬스터 1체를 선택해 그 공격력 +3(지속).

**en**

> 【On Cast】Choose 1 non-tribal monster on your field; it gets +3 ATK (lasting).


### S4 — 双月の啓示

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"draw"}`。

**ja**

> 【発動時】カードを4枚引く。
> 
> 【回数制限】同名カード合計で自分の各ターン1回まで使用できる。

**ko**

> 【발동시】카드를 4장 뽑는다.
> 
> 【횟수 제한】같은 이름의 카드 합계로 자신의 턴마다 1회까지 사용할 수 있다.

**en**

> 【On Cast】Draw 4 cards.
> 
> 【Use Limit】You may play cards with this name only once during each of your turns in total.


### S5 — マーケット・クラッシュ

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"crash"}`。

**ja**

> 【発動時】次の相手ターンの提示を最大2枚にし、提示更新を封じる。

**ko**

> 【발동시】다음 상대 턴의 제시를 최대 2장으로 하고 제시 갱신을 봉쇄한다.

**en**

> 【On Cast】The opponent's next offer shrinks to 2 cards and cannot be rerolled.


### S8 — リコール

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"recall"}`。

**ja**

> 【発動時】自分の墓地から、このカード以外のカードを1枚まで選び、自分の手札に加える。

**ko**

> 【발동시】자신의 묘지에서 이 카드 이외의 카드를 최대 1장 선택해 자신의 패에 넣는다.

**en**

> 【On Cast】Choose up to 1 card other than this card in your graveyard and add it to your hand.


### S6 — 運命の糸

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"seek"}`。

**ja**

> 【発動時】自分のデッキからカードを1枚まで選び、自分の手札に加える。

**ko**

> 【발동시】자신의 덱에서 카드를 최대 1장 선택해 자신의 패에 넣는다.

**en**

> 【On Cast】Choose up to 1 card in your deck and add it to your hand.


### S7 — 戦場の脈動

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"buffAllTurn"}`。

**ja**

> 【発動時】このターン終了まで、現在自分の場にいる全モンスターの攻撃力+3。

**ko**

> 【발동시】이번 턴 종료까지 현재 자신의 필드에 있는 모든 몬스터의 공격력 +3.

**en**

> 【On Cast】All monsters currently on your field get +3 ATK until this turn ends.


### S12 — 鋼脈刻印

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】ダイス1個を振る。5以上なら、相手に烙印カウンター1個を付与する。

**ko**

> 【발동시】주사위 1개를 굴린다. 5 이상이면 상대에게 낙인 카운터 1개를 부여한다.

**en**

> 【On Cast】Roll 1 die. On 5 or more, give the opponent 1 Brand counter.


### S13 — 星墓の落下

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"dmg"}`。

**ja**

> 【発動時】相手に11ダメージを与える。

**ko**

> 【발동시】상대에게 11 데미지를 준다.

**en**

> 【On Cast】Deal 11 damage to the opponent.


### S14 — 大地の祝福

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】両方の場の、卵以外の全モンスターの蓄積ダメージを取り除く。自分の体力を5回復する。

**ko**

> 【발동시】양쪽 필드의 알 이외 모든 몬스터의 누적 데미지를 제거한다. 자신의 체력을 5 회복한다.

**en**

> 【On Cast】Remove all accumulated damage from every non-Egg monster on both fields. Restore 5 of your HP.


### S15 — ルーン爆裂

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"destroyMon"}`。

**ja**

> 【発動時】両方の場から購入コスト8以下のモンスターを1体まで選んで破壊する。

**ko**

> 【발동시】양쪽 필드에서 구매 코스트 8 이하 몬스터를 최대 1체 선택해 파괴한다.

**en**

> 【On Cast】Choose up to 1 monster on either field with purchase cost 8 or less and destroy it.


### MIMIC — ミミック

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【補足】宝箱のハズレで相手の場に召喚される。

**ko**

> 【참고】보물상자 꽝으로 상대의 필드에 소환된다.

**en**

> 【Note】Summoned to the enemy field by a failed treasure chest.


### E1 — 封鎖令

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"noSummonLow"}`。

**ja**

> 【場にある間】相手は購入コスト3以下のモンスターを召喚できない。
> 
> 【期間】自分のターン開始を4回迎えると終了する。

**ko**

> 【필드에 놓인 동안】상대는 구매 코스트 3 이하 몬스터를 소환할 수 없다.
> 
> 【기간】자신의 턴 시작을 4회 맞으면 종료한다.

**en**

> 【While Deployed】The opponent cannot summon monsters with purchase cost 3 or less.
> 
> 【Duration】Expires at the start of your 4th subsequent turn.


### E2 — 平和協定

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"noAttack"}`。

**ja**

> 【場にある間】両プレイヤーのモンスターは攻撃できない。
> 
> 【期間】双方のターン開始を合計4回迎えると終了する。

**ko**

> 【필드에 놓인 동안】양 플레이어의 몬스터는 공격할 수 없다.
> 
> 【기간】양쪽 턴 시작을 합계 4회 맞으면 종료한다.

**en**

> 【While Deployed】Neither player's monsters can attack.
> 
> 【Duration】Expires after 4 subsequent turn starts, counting both players.


### E3 — 知識の泉

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"bonusDraw"}`。

**ja**

> 【自分ターン開始時】追加でカードを1枚引く（4回）。4回目の処理後にこの魔法は終了する。その次の自分ターン開始時、自分の最大マナ+1。

**ko**

> 【자신 턴 시작시】카드를 1장 추가로 뽑는다(4회). 4회째 처리 후 이 마법 종료한다. 그 다음 자신의 턴 시작시 자신의 최대 마나 +1.

**en**

> 【Your Turn Start】Draw 1 extra card, for 4 turns. This spell expires after the 4th draw. At the start of your following turn, your max mana +1.


### TSO2 — 孤独な狼

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"hermitBuff"}`。

**ja**

> 【召喚時】自分の場の他のモンスターと永続魔法が合計1枚以下なら、このモンスターの攻撃力+3・体力+3（持続）。

**ko**

> 【소환시】자신의 필드의 다른 몬스터와 영구마법이 합계 1장 이하이면 이 몬스터의 공격력 +3, 체력 +3(지속).

**en**

> 【On Summon】If your other monsters and persistent spells total at most 1, this monster gets +3 ATK and +3 HP (lasting).


### TSO5 — 孤独な放浪者

確認済み：表記改定（ja / ko / en）。実装キー：`{"summonReq":"soloOnly"}`。

**ja**

> 【召喚条件】自分の場に孤独種族以外のモンスターがいない時のみ召喚可能。

**ko**

> 【소환 조건】자신의 필드에 고독 종족 외의 몬스터가 없을 때만 소환할 수 있다.

**en**

> 【Summon Requirement】No non-Solitary monsters on your field.


### TPO2 — 飢えた獣

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"devourGrow"}`。

**ja**

> 【相手モンスター破壊時】このモンスターが攻撃・反撃で相手モンスターを破壊するたび、破壊したモンスターの購入コスト分、このモンスターの攻撃力と体力を増やす（持続）。

**ko**

> 【상대 몬스터 파괴시】이 몬스터가 공격·반격으로 상대 몬스터를 파괴할 때마다 파괴한 몬스터의 구매 코스트만큼 이 몬스터의 공격력과 체력 증가(지속).

**en**

> 【Enemy Monster Destroyed】Whenever this monster destroys an enemy monster by attacking or counterattacking, increase this monster's ATK and HP by that monster's purchase cost (lasting).


### TPO5 — 捕食者

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"preyExec"}`。

**ja**

> 【召喚時】相手の購入コスト3～4のモンスターのうち、攻撃力と印刷体力の合計が最大の1体を自動で破壊する（同値は場の並び順）。破壊できたら自分の最大マナ+1。

**ko**

> 【소환시】상대의 구매 코스트 3~4 몬스터 중 공격력과 인쇄 체력의 합이 가장 큰 1체를 자동 파괴한다(동률은 필드 순서). 파괴했다면 자신의 최대 마나 +1.

**en**

> 【On Summon】Automatically destroy the enemy monster of purchase cost 3–4 with the highest ATK plus printed HP; ties use field order. If destroyed, your max mana +1.


### TAR2 — 没落貴族

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"lowAtkBan"}`。

**ja**

> 【場にいる間】相手の場の購入コスト2以下のモンスターは攻撃できない。

**ko**

> 【필드에 있는 동안】상대의 필드의 구매 코스트 2 이하 몬스터는 공격할 수 없다.

**en**

> 【While on the Field】Enemy monsters with purchase cost 2 or less cannot attack.


### TAR5 — 貴族領主

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"eliteGuard"}`。

**ja**

> 【場にいる間】相手の購入コスト6以下のモンスターはこのモンスターを攻撃できない。相手の全モンスターは自分を直接攻撃できない。

**ko**

> 【필드에 있는 동안】상대의 구매 코스트 6 이하 몬스터는 이 몬스터를 공격할 수 없다. 상대의 모든 몬스터는 자신을 직접 공격할 수 없다.

**en**

> 【While on the Field】Enemy monsters with purchase cost 6 or less cannot attack this monster. No enemy monster can attack you directly.


### ND2 — 予知のルーン

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"draw"}`。

**ja**

> 【発動時】カードを2枚引く。自分の体力を3回復する。

**ko**

> 【발동시】카드를 2장 뽑는다. 자신의 체력을 3 회복한다.

**en**

> 【On Cast】Draw 2 cards. Restore 3 of your HP.


### ND3 — 賢者の予言

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"draw"}`。

**ja**

> 【発動時】相手がダイス1個を振り予測値を決める。自分がダイス2個を振り、両方の出目が予測値と異なれば自分の最大マナ+4。

**ko**

> 【발동시】상대가 주사위 1개를 굴려 예측값 결정한다. 자신이 주사위 2개를 굴려 두 눈 모두 예측값과 다르면 자신의 최대 마나 +4.

**en**

> 【On Cast】The opponent rolls 1 die to set the prediction. Roll 2 dice; if neither result matches it, your max mana +4.


### ND5 — 古代の知識

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分の場の全モンスターに「オーラ」を付与（持続）。

**ko**

> 【발동시】자신의 필드의 모든 몬스터에 '아우라'를 부여한다(지속).

**en**

> 【On Cast】Grant Aura to all your monsters (lasting).


### NMD2 — 探書の精霊

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"draw"}`。

**ja**

> 【召喚時】カードを2枚引く。

**ko**

> 【소환시】카드를 2장 뽑는다.

**en**

> 【On Summon】Draw 2 cards.


### NMD4 — 記録者

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"chronicler"}`。

**ja**

> 【召喚時】自分の提示マーケットの直近10ターン分（双方通算）の履歴（更新分を含む）からカード1枚を選び、マナを払って購入できる。

**ko**

> 【소환시】자신 제시 마켓의 최근 10턴(양쪽 합계) 기록(갱신 포함)에서 카드 1장을 선택해 마나를 지불하고 구매할 수 있다.

**en**

> 【On Summon】You may choose 1 card from your offer-market history over the last 10 turns, counting both players, including refreshes, and pay mana to buy it.


### NMD6 — 大賢者

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"sageDiscount"}`。

**ja**

> 【場にいる間】自分のデッキ構成に魔法が13枚以上あれば、自分の魔法の発動コスト-1（最低0）。

**ko**

> 【필드에 있는 동안】자신의 덱 구성에 마법이 13장 이상이면 자신의 마법 시전 코스트 -1(최저 0).

**en**

> 【While on the Field】If your deck composition contains at least 13 spells, your spells cost 1 less to cast, to a minimum of 0.


### NGA3 — 戦士ゴーレム

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"golemSquad"}`。

**ja**

> 【召喚時】自分の場に他の「ゴーレム」系モンスターがいれば、このモンスターに気合用カウンター3個を付与する。

**ko**

> 【소환시】자신의 필드에 다른 골렘 계열 몬스터가 있으면 이 몬스터에 기합용 카운터 3개를 부여한다.

**en**

> 【On Summon】If another Golem monster is on your field, this monster gains 3 counters (used by Guts).


### NGA4 — 剣鬼

確認済み：表記改定（ja / ko / en）。実装キー：`{"attackFx":"berserk"}`。

**ja**

> 【攻撃時】攻撃対象をランダムに決める（このモンスター以外の味方モンスターも候補に含む）。

**ko**

> 【공격시】공격 대상을 무작위로 정한다(이 몬스터 외 아군 몬스터도 후보에 포함).

**en**

> 【On Attack】The attack target is chosen randomly, including your other monsters among eligible targets.


### NWL3 — ガーディアンゴーレム

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"gutsOnHit"}`。

**ja**

> 【攻撃ダメージを受けた後】このモンスターが攻撃で1以上のダメージを受け、気合を消費せずに生き残ると、カウンター1個を得る（気合に使用）。

**ko**

> 【공격 데미지를 받은 후】이 몬스터가 공격으로 1 이상의 데미지를 받고 기합을 소비하지 않고 살아남으면 카운터 1개를 얻는다(기합에 사용).

**en**

> 【After Taking Attack Damage】After this monster takes at least 1 attack damage and survives without spending Guts, it gains 1 counter (used by Guts).


### NHEX — 見習い呪術師

確認済み：表記改定（ja / ko / en）。実装キー：`{"turnFx":"hexCurse"}`。

**ja**

> 【自分ターン開始時】自分のデッキ構成に魔法が10枚以上あれば、ダイス1個を振る。5以上なら、新しい「呪い」3枚を相手の墓地に追加する。

**ko**

> 【자신 턴 시작시】자신의 덱 구성에 마법이 10장 이상이면 주사위 1개를 굴린다. 5 이상이면 새로운 저주 3장을 상대의 묘지에 추가한다.

**en**

> 【Your Turn Start】If your deck composition contains at least 10 spells, roll 1 die. On 5 or more, create 3 new Curses in the opponent's graveyard.


### AHEUK — アチューン・黒

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"manaDown"}`。

**ja**

> 【発動時】相手の最大マナ-1。自分の場にモンスターがいなければ、相手の最大マナをさらに1減らす。

**ko**

> 【발동시】상대의 최대 마나 -1. 자신의 필드에 몬스터가 없으면 상대의 최대 마나를 추가로 1 감소.

**en**

> 【On Cast】The opponent's max mana -1. If you control no monsters, reduce their max mana by 1 more.


### AJIN — アチューン・真

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"manaUpGain"}`。

**ja**

> 【発動時】自分の最大マナ+1。ダイス1個を振り、4以上なら新しい「アチューン」1枚を自分の墓地に追加する。

**ko**

> 【발동시】자신의 최대 마나 +1. 주사위 1개를 굴려 4 이상이면 새로운 어튠 1장을 자신의 묘지에 추가한다.

**en**

> 【On Cast】Your max mana +1. Roll 1 die; on 4 or more, create 1 new Attune in your graveyard.


### AMA — アチューン・魔

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"chestToMana"}`。

**ja**

> 【発動時】自分の手札の「宝箱」1枚を自動で自分の墓地へ送る。送った場合、自分の最大マナ+1。

**ko**

> 【발동시】자신의 패의 보물상자 1장을 자동으로 자신의 묘지로 보낸다. 보냈다면 자신의 최대 마나 +1.

**en**

> 【On Cast】Automatically send 1 Treasure Chest from your hand to your graveyard. If you did, your max mana +1.


### NHEAL — 生命の加護

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"healSummon"}`。

**ja**

> 【どちらかが召喚した時】どちらかがモンスターを召喚するたび、相手の体力を4回復するし、自分の体力を8回復する。

**ko**

> 【누구든 소환할 때】누구든 몬스터를 소환할 때마다 상대의 체력을 4 회복한다, 자신의 체력을 8 회복한다.

**en**

> 【When Either Player Summons】Whenever either player summons a monster, restore 4 of the opponent's HP and 8 of your HP.


### GM5_0 — 古代の狂戦士

確認済み：表記改定（ja / ko / en）。実装キー：`{"turnFx":"growAtk"}`。

**ja**

> 【自分ターン開始時】このモンスターの攻撃力+2（持続）。

**ko**

> 【자신 턴 시작시】이 몬스터의 공격력 +2(지속).

**en**

> 【Your Turn Start】This monster gets +2 ATK (lasting).


### GM5_2 — 鋼鉄の戦士

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"summonBuff"}`。

**ja**

> 【自分が召喚した時】自分がモンスターを召喚するたび、そのモンスターの体力+2（持続）。

**ko**

> 【자신이 소환할 때】자신이 몬스터를 소환할 때마다 그 몬스터의 체력 +2(지속).

**en**

> 【When You Summon】Whenever you summon a monster, it gets +2 HP (lasting).


### GM5_3 — 業火のドレイク

確認済み：表記改定（ja / ko / en）。実装キー：`{"turnFx":"turnBurn"}`。

**ja**

> 【自分ターン開始時】相手に3ダメージを与える。

**ko**

> 【자신 턴 시작시】상대에게 3 데미지를 준다.

**en**

> 【Your Turn Start】Deal 3 damage to the opponent.


### GS5_3 — 呪文書の解読

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】相手のデッキ・墓地・場にある「魔族」モンスター1枚につき、相手プレイヤーに16ダメージを与える。

**ko**

> 【발동시】상대의 덱·묘지·필드의 마족 몬스터 1장당 상대 플레이어에게 16 데미지를 준다.

**en**

> 【On Cast】Deal 16 damage to the opponent for each Demonkin monster in their deck, graveyard, and field combined.


### GS5_4 — 聖剣の一閃

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"buffTurn"}`。

**ja**

> 【発動時】自分の場のモンスター1体を選び、このターン終了までその攻撃力+8。

**ko**

> 【발동시】자신의 필드의 몬스터 1체를 선택해 이번 턴 종료까지 그 공격력 +8.

**en**

> 【On Cast】Choose 1 monster on your field; it gets +8 ATK until this turn ends.


### GM6_0 — ドラゴン

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"dragonFuse"}`。

**ja**

> 【召喚時】自分の場に「兵士」か「騎士」がいれば、その1体とこのモンスターを素材にして、次のモンスターを自分の場に召喚する。両方ある場合はどちらを素材にするか選ぶ。
> 兵士を使う：ドラゴンライダー1体。
> 騎士を使う：アンティークドラゴンナイト1体。
> 素材は自分の墓地へ送る。トークン・虚無の素材は自分のリフトへ送る。

**ko**

> 【소환시】자신의 필드에 병사 또는 기사가 있으면 그 1체와 이 몬스터를 재료로 다음 몬스터를 자신의 필드에 소환한다. 둘 다 있으면 사용할 재료를 선택한다.
> 병사 사용: 드래곤 라이더 1체.
> 기사 사용: 앤티크 드래곤 나이트 1체.
> 재료는 자신의 묘지로 보낸다. 토큰·공허 재료는 자신의 리프트로 보낸다.

**en**

> 【On Summon】If you control a Soldier or Knight, use 1 of them and this monster as materials to summon the following monster to your field. If both are available, choose which material to use.
> Using a Soldier: 1 Dragon Rider.
> Using a Knight: 1 Antique Dragon Knight.
> Send the materials to your graveyard. Send Token or Void materials to your Rift instead.


### GM6_1 — 次元幽閉者

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"jailer"}`。

**ja**

> 【召喚時】相手のリフトからカードを8枚まで選び、自分のリフトへ移す。

**ko**

> 【소환시】상대의 리프트에서 카드를 8장까지 선택해 자신의 리프트로 옮긴다.

**en**

> 【On Summon】Choose up to 8 cards in the opponent's Rift and move them to your Rift.


### GM6_7 — 将軍

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"generalKnight","aura":"general"}`。

**ja**

> 【召喚時】「騎士」（攻撃力4・体力4）1体を自分の場に召喚する。
> 
> 【相手が召喚した時】相手がモンスターを召喚するたびダイス1個を振り、4以上なら「騎士」1体を自分の場に召喚する。

**ko**

> 【소환시】기사(공격력 4, 체력 4) 1체를 자신의 필드에 소환한다.
> 
> 【상대가 소환할 때】상대가 몬스터를 소환할 때마다 주사위 1개를 굴려 4 이상이면 기사 1체를 자신의 필드에 소환한다.

**en**

> 【On Summon】Summon 1 Knight (4 ATK, 4 HP) to your field.
> 
> 【When the Opponent Summons】Whenever the opponent summons a monster, roll 1 die; on 4 or more, summon 1 Knight to your field.


### GM6_8 — 虚空の攻城兵

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【破壊時】「兵士」1体を自分の場に召喚する。

**ko**

> 【파괴시】병사 1체를 자신의 필드에 소환한다.

**en**

> 【On Destruction】Summon 1 Soldier to your field.


### GS6_4 — 火脈点火

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】相手に烙印カウンターが1個以上あれば、相手に烙印カウンター3個を追加する。

**ko**

> 【발동시】상대에게 낙인 카운터가 1개 이상 있으면 상대에게 낙인 카운터 3개 추가한다.

**en**

> 【On Cast】If the opponent has at least 1 Brand counter, give them 3 additional Brand counters.


### GS8_0 — 銀月砲

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"dmg"}`。

**ja**

> 【発動時】相手のデッキからカード1枚を選び、相手のリフトへ送ってよい。

**ko**

> 【발동시】상대의 덱에서 카드 1장을 선택해 상대의 리프트로 보낼 수 있다.

**en**

> 【On Cast】You may choose 1 card in the opponent's deck and send it to their Rift.


### INFKNIGHT — 騎士

確認済み：既存の明確な表記を維持。実装キー：`{}`。

**ja**

> —

**ko**

> —

**en**

> —


### NT_SEAL3 — 沈黙の番人

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"sealLow"}`。

**ja**

> 【場にいる間】両プレイヤーは発動コスト4以下の魔法を使用できない。

**ko**

> 【필드에 있는 동안】양 플레이어는 시전 코스트 4 이하 마법을 사용할 수 없다.

**en**

> 【While on the Field】Neither player can cast spells with cast cost 4 or less.


### NT_SEAL5 — 沈黙の巨神

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"sealLow"}`。

**ja**

> 【場にいる間】両プレイヤーは発動コスト6以下の魔法を使用できない。

**ko**

> 【필드에 있는 동안】양 플레이어는 시전 코스트 6 이하 마법을 사용할 수 없다.

**en**

> 【While on the Field】Neither player can cast spells with cast cost 6 or less.


### TSO3 — 孤独な狩人

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"gravePure"}`。

**ja**

> 【召喚時】自分の墓地にモンスターカードがなければカードを6枚引く。

**ko**

> 【소환시】자신의 묘지에 몬스터 카드가 없으면 카드를 6장 뽑는다.

**en**

> 【On Summon】If your graveyard has no monster cards, draw 6 cards.


### TPO3 — 飢えた追跡者

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"scavenger"}`。

**ja**

> 【相手モンスター破壊時】相手モンスターが破壊されるたび、ダイス1個を振る。5以上なら、そのモンスターの複製1体を自分の場に召喚する。

**ko**

> 【상대 몬스터 파괴시】상대 몬스터가 파괴될 때마다 주사위 1개를 굴린다. 5 이상이면 그 몬스터의 복제 1체를 자신의 필드에 소환한다.

**en**

> 【Enemy Monster Destroyed】Whenever an enemy monster is destroyed, roll 1 die. On 5 or more, summon 1 copy of that monster to your field.


### TAR3 — 没落した騎士

確認済み：既存の明確な表記を維持。実装キー：`{}`。

**ja**

> —

**ko**

> —

**en**

> —


### TGE1 — 始原の卵

確認済み：表記改定（ja / ko / en）。実装キー：`{"hatchTurns":4}`。

**ja**

> 【卵】攻撃できない。
> 
> 【耐久】カウンター2個で登場し、攻撃・ダメージを受けるたび1個失う（0個で破壊）。
> 
> 【孵化まで】双方のターン開始を4回数え、残り0の自分ターン開始時に孵化する。
> 
> 【孵化時】孵化時、この卵を自分のリフトへ送り、卵以外の購入コスト7以下の「始原」モンスターからランダムに1体を自分の場に召喚する。

**ko**

> 【알】공격할 수 없다.
> 
> 【내구】카운터 2개로 등장하며 공격·데미지를 받을 때마다 1개 감소(0개면 파괴).
> 
> 【부화까지】양쪽 턴 시작을 4회 세고 남은 턴이 0인 자신의 턴 시작시 부화한다.
> 
> 【부화시】부화시 이 알을 자신의 리프트로 보내고 알 이외 구매 코스트 7 이하 시초 몬스터 중 무작위 1체를 자신의 필드에 소환한다.

**en**

> 【Egg】Cannot attack.
> 
> 【Durability】Enters with 2 counters; loses 1 per attack or damage hit and is destroyed at 0.
> 
> 【Hatch Countdown】Count 4 turn starts, including both players; hatch at your turn start once none remain.
> 
> 【On Hatching】On hatching, send this Egg to your Rift and summon 1 random non-Egg Origin monster of purchase cost 7 or less to your field.


### TGE2 — 始原の火種

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"originEmber"}`。

**ja**

> 【召喚時】自分の場の他の「始原」モンスター1体を選び、その攻撃力+2（持続）。

**ko**

> 【소환시】자신의 필드의 다른 시초 몬스터 1체를 선택해 그 공격력 +2(지속).

**en**

> 【On Summon】Choose 1 other Origin monster on your field; it gets +2 ATK (lasting).


### TGE3 — 始原の守護者

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"selfBurn"}`。

**ja**

> 【召喚時】自分に3ダメージを与える。

**ko**

> 【소환시】자신에게 3 데미지를 준다.

**en**

> 【On Summon】You take 3 damage.


### TGE4 — 始原の裁判官

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"originArbiter"}`。

**ja**

> 【召喚時】ゲーム中、同名カードを初めて召喚した時だけ判定する。自分のデッキ構成にこの個体以外の「始原」カードがあれば、相手に烙印カウンター1個を付与する。同名の別個体も数える。
> 最初の召喚で条件を満たさなくても、2回目以降の召喚では発動しない。

**ko**

> 【소환시】게임 중 같은 이름의 카드를 처음 소환할 때만 판정한다. 자신의 덱 구성에 이 개체 이외의 시초 카드가 있으면 상대에게 낙인 카운터 1개를 부여한다. 같은 이름의 다른 개체도 센다.
> 첫 소환에서 조건을 충족하지 못해도 2회째 이후의 소환에는 발동하지 않는다.

**en**

> 【On Summon】Check only the first time you summon a card with this name this game. If your deck composition contains an Origin card other than this copy, give the opponent 1 Brand counter. Another copy with the same name counts.
> This does not trigger on the 2nd or later summon, even if the first summon failed the condition.


### TGE5 — 始原の精霊

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"originRite"}`。

**ja**

> 【召喚時】「始原の術式」を自分の場に展開する。

**ko**

> 【소환시】'시초의 술식'을 자신의 필드에 전개한다.

**en**

> 【On Summon】Deploy Origin Rite on your field.


### TGE6 — 始原の巨人

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"giantDraw"}`。

**ja**

> 【召喚時】カードを1枚引く。引いたカードがモンスターなら、購入コスト5以上の「始原」カード1枚を選び、マナを払って購入できる。

**ko**

> 【소환시】카드를 1장 뽑는다. 뽑은 카드가 몬스터이면 구매 코스트 5 이상 시초 카드 1장을 선택해 마나를 지불하고 구매할 수 있다.

**en**

> 【On Summon】Draw 1 card. If it is a monster, you may choose 1 Origin card of purchase cost 5 or more and pay mana to buy it.


### TGE7 — 始原の君主

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"originLord"}`。

**ja**

> 【場にいる間】自分の場の全ての「始原」モンスターの攻撃力+4・体力+4（自身を含む）。

**ko**

> 【필드에 있는 동안】자신의 필드의 모든 시초 몬스터의 공격력 +4, 체력 +4(자신 포함).

**en**

> 【While on the Field】All Origin monsters on your field, including this monster, get +4 ATK and +4 HP.


### HANDRESET — 忘却の新札

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"draw"}`。

**ja**

> 【発動時】自分の手札を全て自分の墓地へ送る。カードを5枚引く。

**ko**

> 【발동시】자신의 패를 전부 자신의 묘지로 보낸다. 카드를 5장 뽑는다.

**en**

> 【On Cast】Send your entire hand to your graveyard. Draw 5 cards.


### TIMEWARP — 時空間操作

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"dmg"}`。

**ja**

> 【発動時】ダイス1個を振り4以上なら次の相手のターンをスキップする。

**ko**

> 【발동시】주사위 1개를 굴려 4 이상이면 다음 상대 턴을 건너뛴다.

**en**

> 【On Cast】Roll 1 die: on 4 or more, skip the opponent’s next turn.


### INFERNO — 地獄

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"inferno"}`。

**ja**

> 【自分ターン開始時】自分に5ダメージを与える。相手に7ダメージを与える。

**ko**

> 【자신 턴 시작시】자신에게 5 데미지를 준다. 상대에게 7 데미지를 준다.

**en**

> 【Your Turn Start】You take 5 damage. Deal 7 damage to the opponent.


### GAMBLE — 六面の気まぐれ

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"dmg"}`。

**ja**

> 【発動時】ダイス1個を10回振る。出目の合計が40以上なら、自分の最大マナ+3。

**ko**

> 【발동시】주사위 1개를 10회 굴린다. 눈의 합이 40 이상이면 자신의 최대 마나 +3.

**en**

> 【On Cast】Roll 1 die 10 times. If the sum is at least 40, increase your max mana by 3.


### ASSASSIN1 — 初級アサシン

確認済み：既存の明確な表記を維持。実装キー：`{}`。

**ja**

> （追加効果なし・キーワード表示のみ）

**ko**

> （追加効果なし・キーワード表示のみ）

**en**

> （追加効果なし・キーワード表示のみ）


### ASSASSIN2 — 中級アサシン

確認済み：既存の明確な表記を維持。実装キー：`{}`。

**ja**

> （追加効果なし・キーワード表示のみ）

**ko**

> （追加効果なし・キーワード表示のみ）

**en**

> （追加効果なし・キーワード表示のみ）


### ASSASSIN3 — 上級アサシン

確認済み：表記改定（ja / ko / en）。実装キー：`{"summonReq":"assassinKin"}`。

**ja**

> 【召喚条件】自分のデッキ構成に同名以外の「アサシン」系カードがある時のみ召喚可能。

**ko**

> 【소환 조건】자신의 덱 구성에 동명 외 '암살자' 계열 카드가 있을 때만 소환할 수 있다.

**en**

> 【Summon Requirement】Summonable only with an Assassin-family card with a different name in your deck composition.


### ASSASSIN4 — 特級アサシン - ナイトロード

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"nightlord","summonReq":"assassinTrio"}`。

**ja**

> 【召喚条件】自分のデッキ構成に、このカードと同名でない「アサシン」系カードが3種類以上ある。
> 
> 【召喚時】相手に烙印カウンター3個を付与する。

**ko**

> 【소환 조건】자신의 덱 구성에 이 카드와 이름이 다른 암살자 계열 카드가 3종류 이상 있다.
> 
> 【소환시】상대에게 낙인 카운터 3개를 부여한다.

**en**

> 【Summon Requirement】Your deck composition contains at least 3 distinct Assassin-family card names other than this card’s name.
> 
> 【On Summon】Give the opponent 3 Brand counters.


### RUNE1 — ルーン学問 - 初級

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"destroyMon"}`。

**ja**

> 【発動条件】相手の場に購入コスト5以上のモンスターがいる。
> 
> 【発動時】その中で攻撃力と印刷体力の合計が最大の1体を自動で破壊する（同値は場の並び順）。

**ko**

> 【발동 조건】상대의 필드에 구매 코스트 5 이상 몬스터가 있다.
> 
> 【발동시】그중 공격력과 인쇄 체력의 합이 가장 큰 1체를 자동 파괴한다(동률은 필드 순서).

**en**

> 【Play Requirement】An enemy monster has purchase cost 5 or more.
> 
> 【On Cast】Automatically destroy the eligible monster with the highest ATK plus printed HP; ties use field order.


### RUNE2 — ルーン学問 - 中級

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】自分のデッキ・手札・墓地の合計枚数の半分以上が魔法またはスターター。
> 
> 【発動時】自分の最大マナ+8。

**ko**

> 【발동 조건】자신의 덱·패·묘지의 합계 절반 이상이 마법 또는 스타터.
> 
> 【발동시】자신의 최대 마나 +8.

**en**

> 【Play Requirement】At least half the cards in your deck, hand, and graveyard combined are spells or starters.
> 
> 【On Cast】Your max mana +8.


### RUNE3 — ルーン学問 - 上級

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"runeEcho"}`。

**ja**

> 【発動条件】自分のデッキ・手札・墓地の合計枚数の半分以上が魔法またはスターター。
> 
> 【場にある間】自分が手札から使った単発魔法の処理後、選択待ちがなければ、同じ魔法の効果をマナなしでもう1回処理する（重複しない）。

**ko**

> 【발동 조건】자신의 덱·패·묘지의 합계 절반 이상이 마법 또는 스타터.
> 
> 【필드에 놓인 동안】자신이 패에서 사용한 일회성 마법 처리 후 선택 대기가 없으면 같은 마법 효과를 마나 없이 1회 더 처리한다(중첩 불가).

**en**

> 【Play Requirement】At least half the cards in your deck, hand, and graveyard combined are spells or starters.
> 
> 【While Deployed】After resolving a non-persistent spell played from your hand, repeat its effect once without paying mana if no choice is pending; multiple copies do not stack.


### GENESIS_SONG — 始原の歌

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分のデッキ・墓地から「始原」モンスターをランダムに2体、自分の場に召喚する。

**ko**

> 【발동시】자신의 덱·묘지에서 시초 몬스터 2체를 무작위로 자신의 필드에 소환한다.

**en**

> 【On Cast】Summon 2 random Origin monsters from your deck and graveyard to your field.


### GENESIS_MAGIC — 始原の魔法

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分の場の全ての「始原」モンスターの攻撃力+4・体力+4（持続）。

**ko**

> 【발동시】자신의 필드의 모든 시초 몬스터의 공격력 +4, 체력 +4(지속).

**en**

> 【On Cast】All Origin monsters on your field get +4 ATK and +4 HP (lasting).


### KIN_CALL — 同族の呼び声

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"kinDiscount"}`。

**ja**

> 【場にある間】自分の場に種族モンスターがいれば、マーケットの種族カード購入コスト-2(最低1)。

**ko**

> 【필드에 놓인 동안】자신의 필드에 종족 몬스터가 있으면 마켓의 종족카드 구매코스트 -2(최소1).

**en**

> 【While Deployed】If you control a tribal monster, your purchases of tribal cards cost 2 less, to a minimum of 1.


### MULTI_CULTURE — 多様な文化

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】自分の場に異なる種族のモンスターが2種類以上いる。
> 
> 【発動時】自分の場の全ての種族モンスターの攻撃力+6（持続）。

**ko**

> 【발동 조건】자신의 필드에 서로 다른 종족의 몬스터가 2종류 이상 있다.
> 
> 【발동시】자신의 필드의 모든 종족 몬스터 공격력 +6(지속).

**en**

> 【Play Requirement】Your monsters represent at least 2 different tribes.
> 
> 【On Cast】All tribal monsters on your field get +6 ATK (lasting).


### SLAY_ART — 殺生の極意

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"slayArt"}`。

**ja**

> 【場にある間】どちらかのプレイヤーが受ける各ダメージを3増やす（モンスターへのダメージは増えない）。

**ko**

> 【필드에 놓인 동안】어느 플레이어가 받는 각 데미지를 3 증가(몬스터 데미지는 증가하지 않음).

**en**

> 【While Deployed】Increase each instance of damage to either player by 3; damage to monsters is unaffected.


### BLOOD1 — 血の魔法 - ブラッドドロー

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"draw"}`。

**ja**

> 【発動時】カードを6枚引く。自分に15ダメージを与える。

**ko**

> 【발동시】카드를 6장 뽑는다. 자신에게 15 데미지를 준다.

**en**

> 【On Cast】Draw 6 cards. You take 15 damage.


### DISARM1 — 最初の螺子抜き

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"destroyEnch"}`。

**ja**

> 【発動条件】相手の場に永続魔法がある。
> 
> 【発動時】両方の場から永続魔法を1枚まで選んで破壊する。

**ko**

> 【발동 조건】상대의 필드에 영구마법이 있다.
> 
> 【발동시】양쪽 필드에서 영구마법 최대 1장을 선택해 파괴한다.

**en**

> 【Play Requirement】The opponent controls a persistent spell.
> 
> 【On Cast】Choose and destroy up to 1 persistent spell on either field.


### DISARM2 — 青銅解剖図

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"destroyEnch"}`。

**ja**

> 【発動条件】相手の場に永続魔法がある。
> 
> 【発動時】両方の場から永続魔法を2枚まで選んで破壊する。

**ko**

> 【발동 조건】상대의 필드에 영구마법이 있다.
> 
> 【발동시】양쪽 필드에서 영구마법 최대 2장을 선택해 파괴한다.

**en**

> 【Play Requirement】The opponent controls a persistent spell.
> 
> 【On Cast】Choose and destroy up to 2 persistent spells on either field.


### DISARM3 — 魔法研究機関

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】相手の場に永続魔法がある。
> 
> 【発動時】相手の永続魔法1枚をランダムに破壊し、墓地の代わりに相手のリフトへ送る。

**ko**

> 【발동 조건】상대의 필드에 영구마법이 있다.
> 
> 【발동시】상대 영구마법 1장을 무작위로 파괴하고 묘지 대신 상대의 리프트로 보낸다.

**en**

> 【Play Requirement】The opponent controls a persistent spell.
> 
> 【On Cast】Destroy 1 random enemy persistent spell and send it to their Rift instead of their graveyard.


### FORBIDDEN — 禁断の術式

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】自分の場に「始原」以外の種族モンスターがいる。
> 
> 【発動時】自分の体力を1にする（ダメージではない）。ダイス1個を振り、5以上なら自分の場の「始原」以外の種族をランダムに1つ決め、その種族で自分の場にいないモンスターを1種類につき1体、自分の場に召喚する。

**ko**

> 【발동 조건】자신의 필드에 시초 이외 종족 몬스터가 있다.
> 
> 【발동시】자신의 체력을 1로 만든다(데미지가 아님). 주사위 1개를 굴려 5 이상이면 자신의 필드의 시초 이외 종족을 무작위로 1개 정하고 그 종족 중 자신의 필드에 없는 몬스터를 종류당 1체씩 자신의 필드에 소환한다.

**en**

> 【Play Requirement】You control a non-Origin tribal monster.
> 
> 【On Cast】Set your HP to 1; this is not damage. Roll 1 die; on 5 or more, randomly select 1 non-Origin tribe you control, then summon 1 of each monster of that tribe not already on your field.


### LUCKY_CHEST — 幸運の宝箱

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】ダイス2個の合計 — 2-3: 自分の最大マナ+3、カードを2枚引く / 4-5: 相手の場に「ミミック」（攻撃力3・体力2）1体を召喚する / 6-8: 自分の最大マナ+1 / 9-11: 自分の体力を8回復する / 12: 自分の体力を12回復する。

**ko**

> 【발동시】주사위 2개 합계 — 2-3: 자신의 최대 마나 +3, 카드를 2장 뽑는다 / 4-5: 상대의 필드에 미믹(공격력 3, 체력 2) 1체 소환한다 / 6-8: 자신의 최대 마나 +1 / 9-11: 자신의 체력을 8 회복한다 / 12: 자신의 체력을 12 회복한다.

**en**

> 【On Cast】Roll 2 dice and total them — 2-3: Your max mana +3, draw 2 cards / 4-5: Summon 1 Mimic (3 ATK, 2 HP) to the opponent's field / 6-8: Your max mana +1 / 9-11: Restore 8 of your HP / 12: Restore 12 of your HP.


### MIMIC2 — マスターミミック

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"chestLock"}`。

**ja**

> 【場にいる間】このモンスターが場にいる限り両者は宝箱を使用できない (アチューン・魔は可能)。

**ko**

> 【필드에 있는 동안】이 몬스터가 필드에 있는 한 양 플레이어는 보물상자를 사용할 수 없다 (어튠 - 마는 가능).

**en**

> 【While on the Field】While this monster is out, neither player can use Treasure Chests (Attune - Arcane still works).


### GUILD_CHEST — アサシンギルドの宝箱

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】ダイス2個の合計（自分の場に「アサシン」系カードがあれば、9-12は代わりにカードを4枚引く） — 2-3: 自分の最大マナ+3 / 4: 自分の場に「ギルドの情報網」を展開（自分ターン開始時に追加でカードを1枚引く） / 5-6: 自分の最大マナ+2 / 7: 自分の最大マナ+1 / 8: 自分の体力を10回復する / 9-10: 相手の場に「初級アサシン」「中級アサシン」を各1体召喚する / 11-12: 相手の場に「初級アサシン」「中級アサシン」「上級アサシン」を各1体召喚し、自分に10ダメージを与える。

**ko**

> 【발동시】주사위 2개 합계(자신의 필드에 암살자 계열 카드가 있으면 9-12는 대신 카드를 4장 뽑는다) — 2-3: 자신의 최대 마나 +3 / 4: 자신의 필드에 길드 정보망 전개한다(자신 턴 시작에 카드를 1장 추가로 뽑는다) / 5-6: 자신의 최대 마나 +2 / 7: 자신의 최대 마나 +1 / 8: 자신의 체력을 10 회복한다 / 9-10: 상대의 필드에 초급·중급 암살자를 각각 1체 소환한다 / 11-12: 상대의 필드에 초급·중급·상급 암살자를 각각 1체 소환하고 자신에게 10 데미지를 준다.

**en**

> 【On Cast】Roll 2 dice and total them; if you control an Assassin-family card, results 9-12 instead draw 4 cards — 2-3: Your max mana +3 / 4: Deploy Guild Network to your field (draw 1 extra card at your turn start) / 5-6: Your max mana +2 / 7: Your max mana +1 / 8: Restore 10 of your HP / 9-10: Summon 1 Novice and 1 Adept Assassin to the opponent's field / 11-12: Summon 1 Novice, 1 Adept, and 1 Elite Assassin to the opponent's field, then take 10 damage.


### GUILD_EYE — ギルドの情報網

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"bonusDraw"}`。

**ja**

> 【自分ターン開始時】追加でカードを1枚引く。

**ko**

> 【자신 턴 시작시】카드를 1장 추가로 뽑는다.

**en**

> 【Your Turn Start】Draw 1 extra card.


### CATALYST — 亀裂の触媒

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分に4ダメージを与える。その後、自分の最大マナ+1。

**ko**

> 【발동시】자신에게 4 데미지를 준다. 그 후 자신의 최대 마나 +1.

**en**

> 【On Cast】You take 4 damage. Then increase your max mana by 1.


### WORLD_SEED — 世界樹の種

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"seedMana"}`。

**ja**

> 【自分ターン開始時】ダイス1個を振り、5以上なら自分の最大マナ+1。

**ko**

> 【자신 턴 시작시】주사위 1개를 굴려 5 이상이면 자신의 최대 마나 +1.

**en**

> 【Your Turn Start】Roll 1 die; on 5 or more, your max mana +1.


### MANA_GIANT — ジャイアントゴーレム

確認済み：表記改定（ja / ko / en）。実装キー：`{"turnFx":"giantGolem"}`。

**ja**

> 【自分ターン開始時】自分のデッキ構成に「ジャイアントゴーレム」以外の「ゴーレム」系モンスターが2種類以上あれば、自分の体力を10回復する。

**ko**

> 【자신 턴 시작시】자신의 덱 구성에 자이언트 골렘 이외 골렘 계열 몬스터가 2종류 이상이면 자신의 체력을 10 회복한다.

**en**

> 【Your Turn Start】If your deck composition has at least 2 distinct Golem-family monster names other than Giant Golem, restore 10 of your HP.


### HOURGLASS — 時の砂時計

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"manaUp"}`。

**ja**

> 【発動時】自分の最大マナ+2。その後、カードを2枚引く。

**ko**

> 【발동시】자신의 최대 마나 +2. 그 후 카드를 2장 뽑는다.

**en**

> 【On Cast】Increase your max mana by 2. Then draw 2 cards.


### LIFE_CYCLE — 生命の循環

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"healMana"}`。

**ja**

> 【自分の回復時】自分が体力を回復するか体力を得るたび、ダイス1個を振る。4以上なら、自分の最大マナ+1。

**ko**

> 【자신 회복시】자신이 체력을 회복하거나 얻을 때마다 주사위 1개를 굴린다. 4 이상이면 자신의 최대 마나 +1.

**en**

> 【When You Heal】Whenever you restore or gain HP, roll 1 die. On 4 or more, increase your max mana by 1.


### LIFE_SANCTUM — 生命の聖域

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"sanctumField"}`。

**ja**

> 【自分ターン開始時】自分の場の全モンスターの体力+2（持続）。

**ko**

> 【자신 턴 시작시】자신의 필드의 모든 몬스터 체력 +2(지속).

**en**

> 【Your Turn Start】All monsters on your field get +2 HP (lasting).


### WORLD_HEART — 世界樹の心臓

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"worldHeart"}`。

**ja**

> 【自分ターン開始時】雫2を得て、自分の体力を2回復する。

**ko**

> 【자신 턴 시작시】이슬 2 획득, 자신의 체력을 2 회복한다.

**en**

> 【Your Turn Start】Gain 2 Dew and restore 2 of your HP.


### MEDITATE — 瞑想

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"heal"}`。

**ja**

> 【発動条件】自分の最大マナが11以下で、自分の体力が40未満。
> 
> 【発動時】自分の体力が40になる量だけ回復する。自分に烙印カウンター1個を付与する。

**ko**

> 【발동 조건】자신의 최대 마나 11 이하, 자신의 체력 40 미만.
> 
> 【발동시】자신의 체력이 40이 되는 양만큼 회복한다. 자신에게 낙인 카운터 1개 부여한다.

**en**

> 【Play Requirement】Your max mana is at most 11 and your HP is below 40.
> 
> 【On Cast】Restore the amount of HP needed to reach 40. Give yourself 1 Brand counter.


### HERMIT — 隠遁の安息

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"heal"}`。

**ja**

> 【発動条件】自分の場にモンスターがいない。
> 
> 【発動時】自分の体力が40未満なら、40になるまで回復する。その後、現在の体力にかかわらず、自分の体力を15回復する。
> 
> 【回数制限】同名カード合計でゲーム中5回まで。

**ko**

> 【발동 조건】자신의 필드에 몬스터가 없다.
> 
> 【발동시】자신의 체력이 40 미만이면 40이 될 때까지 회복한다. 그 후 현재 체력과 관계없이 자신의 체력을 15 회복한다.
> 
> 【횟수 제한】같은 이름의 카드 합계로 게임 중 5회까지.

**en**

> 【Play Requirement】You control no monsters.
> 
> 【On Cast】If your HP is below 40, restore it to 40. Then restore 15 of your HP, regardless of your current HP.
> 
> 【Use Limit】5 plays per game across all copies with this name.


### WORLD_BLESS — 世界樹の祝福

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"worldBless"}`。

**ja**

> 【双方のターン開始時】そのターンのプレイヤーの最大マナ+1。自分のターンで、自分のデッキ・手札・墓地に「エルフ」系カードがあれば、+1の代わりに+4。

**ko**

> 【양쪽 턴 시작시】해당 턴 플레이어의 최대 마나 +1. 자신의 턴이고 자신의 덱·패·묘지에 엘프 계열 카드가 있으면 +1 대신 +4.

**en**

> 【Either Turn Start】The active player's max mana +1. On your turn, if an Elf-family card is in your deck, hand, or graveyard, gain +4 instead of +1.


### GLASS_BAN — 戦略変更

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"glassBan"}`。

**ja**

> 【場にある間】両方の場で、現在の攻撃力と現在体力の差が4以上あるモンスターは攻撃できない。

**ko**

> 【필드에 놓인 동안】양쪽 필드에서 현재 공격력과 현재 체력의 차이가 4 이상인 몬스터는 공격할 수 없다.

**en**

> 【While Deployed】Monsters on either field cannot attack if their current ATK and current HP differ by 4 or more.


### SHATTER — 地震

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分に5ダメージを与える。両方の場の、卵以外の全モンスターの最大体力を1にし、蓄積ダメージを取り除く（持続）。

**ko**

> 【발동시】자신에게 5 데미지를 준다. 양쪽 필드의 알 이외 모든 몬스터의 최대 체력을 1로 만들고 누적 데미지를 제거한다(지속).

**en**

> 【On Cast】You take 5 damage. Set all non-Egg monsters' max HP on both fields to 1 and remove their accumulated damage (lasting).


### SCARECROW — かかし召集

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】かかし(0/1)3体を自分の場に召喚する。

**ko**

> 【발동시】허수아비(0/1) 3체를 자신의 필드에 소환한다.

**en**

> 【On Cast】Summon three 0/1 Scarecrows to your field.


### LEVY — 召集

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】兵士(2/2)3体を自分の場に召喚する。

**ko**

> 【발동시】병사(2/2) 3체를 자신의 필드에 소환한다.

**en**

> 【On Cast】Summon three 2/2 Soldiers to your field.


### INQUISITION — 異端審問

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】相手のデッキ・墓地・場にある種族を持つモンスター1枚につき、相手プレイヤーに6ダメージを与える。

**ko**

> 【발동시】상대의 덱·묘지·필드의 종족을 가진 몬스터 1장당 상대 플레이어에게 6 데미지를 준다.

**en**

> 【On Cast】Deal 6 damage to the opponent for each tribal monster in their deck, graveyard, and field combined.


### MIMIC_LORD — ミミックリーダー

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"mimicLord"}`。

**ja**

> 【召喚時】両方の場の、このモンスター以外の「ミミック」系モンスター1体につき、このモンスターの攻撃力+3・体力+3（持続）。

**ko**

> 【소환시】양쪽 필드의 이 몬스터 외 미믹 계열 몬스터 1체당 이 몬스터의 공격력 +3, 체력 +3(지속).

**en**

> 【On Summon】This monster gets +3 ATK and +3 HP for each other Mimic-family monster on either field (lasting).


### AWAKENED_MIMIC — 覚醒ミミック

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"awakenMimic"}`。

**ja**

> 【召喚時】自分の場に「ミミック」(3/2)2体を召喚する。

**ko**

> 【소환시】자신의 필드에 '미믹'(3/2) 2체를 소환한다.

**en**

> 【On Summon】Summon two Mimics (3/2) to your field.


### MIMIC_KING — ミミックキング

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"mimicKing"}`。

**ja**

> 【召喚時】自分のリフトの「ミミック」系カード1枚につき、このモンスターの攻撃力+1・体力+1（持続）。6枚以上あれば「マスターミミック」1体を自分の場に召喚する。

**ko**

> 【소환시】자신의 리프트의 미믹 계열 카드 1장당 이 몬스터의 공격력 +1, 체력 +1(지속). 6장 이상이면 마스터 미믹 1체를 자신의 필드에 소환한다.

**en**

> 【On Summon】This monster gets +1 ATK and +1 HP per Mimic-family card in your Rift (lasting). If there are at least 6, summon 1 Master Mimic to your field.


### VITAL2 — 世界樹の信徒

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"dewBeliever"}`。

**ja**

> 【召喚時】自分の体力を3回復する。その後ダイスを1回振り、5以上なら雫1を得る。

**ko**

> 【소환시】자신의 체력을 3 회복한다. 그 후 주사위 1개를 굴린다. 5 이상이면 이슬 1 획득한다.

**en**

> 【On Summon】Restore 3 of your HP. Then roll 1 die; on 5 or more, gain 1 Dew.


### VITAL3 — 世界樹の守り人

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"heal","aura":"treeKeeper"}`。

**ja**

> 【召喚時】自分の体力を5回復する。
> 
> 【カード使用時】自分が「世界樹」「エルフ」系カードをプレイするたび、雫1を得る。

**ko**

> 【소환시】자신의 체력을 5 회복한다.
> 
> 【카드 사용시】세계수·엘프 계열 카드를 사용할 때마다 이슬 1 획득한다.

**en**

> 【On Summon】Restore 5 of your HP.
> 
> 【When a Card Is Played】Gain 1 Dew whenever you play a World Tree or Elf card.


### VITAL4 — 鼓舞王

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"rallyGuts"}`。

**ja**

> 【召喚時】自分の場の「兵士」「騎士」のうち、気合を持たない各モンスターに、気合と気合用カウンター1個を付与する（持続）。
> 
> 【自分が召喚した時】後から召喚する「兵士」「騎士」にも、気合を持たなければ同じ処理を行う。付与済みの気合とカウンターは、このモンスターが場を離れても残る。

**ko**

> 【소환시】자신의 필드의 병사·기사 중 기합이 없는 각 몬스터에 기합과 기합용 카운터 1개를 부여한다(지속).
> 
> 【자신이 소환할 때】이후 소환하는 병사·기사도 기합이 없으면 같은 처리를 한다. 부여한 기합과 카운터는 이 몬스터가 필드를 떠나도 남는다.

**en**

> 【On Summon】Give each Soldier and Knight on your field that lacks Guts the Guts ability and 1 counter for Guts (lasting).
> 
> 【When You Summon】Apply the same effect to Soldiers and Knights you summon later if they lack Guts. The granted ability and counters remain even after this monster leaves the field.


### CULL_FLOOD — カルの洗礼

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】新しい「カル」4枚を自分の墓地に追加する。自分のデッキ・墓地からカードを合計3枚まで選んで自分のリフトへ送る。

**ko**

> 【발동시】새로운 컬 4장을 자신의 묘지에 추가한다. 자신의 덱·묘지에서 카드 합계 최대 3장을 선택해 자신의 리프트로 보낸다.

**en**

> 【On Cast】Create 4 new Culls in your graveyard. Choose up to 3 cards total from your deck and graveyard and send them to your Rift.


### PAIN_HARVEST — 苦痛の収穫

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"cullOnHit"}`。

**ja**

> 【相手がダメージを受けた時】相手プレイヤーがダメージを受けるたび、新しい「カル」2枚を自分のリフトに追加する。

**ko**

> 【상대가 데미지를 받을 때】상대 플레이어가 데미지를 받을 때마다 새로운 컬 2장을 자신의 리프트에 추가한다.

**en**

> 【Opponent Takes Damage】Whenever the opponent takes damage, create 2 new Culls in your Rift.


### CULL_FARM — カル栽培

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"cullTurn"}`。

**ja**

> 【自分ターン開始時】新しい「カル」1枚を自分の手札に加える。

**ko**

> 【자신 턴 시작시】새로운 컬 1장을 자신의 패에 추가한다.

**en**

> 【Your Turn Start】Create 1 new Cull in your hand.


### PURGE_ALL — 大粛清

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分のデッキ・墓地からカードを好きな枚数選び、自分のリフトへ送る（0枚でもよい）。

**ko**

> 【발동시】자신의 덱·묘지에서 원하는 수만큼 카드를 선택해 자신의 리프트로 보낸다(0장도 가능).

**en**

> 【On Cast】Choose any number of cards from your deck and graveyard and send them to your Rift, including 0.


### EXILE_NUKE1 — 虚空砲撃

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分のリフトにあるカード枚数×1ダメージを相手に与える。

**ko**

> 【발동시】자신의 리프트의 카드 수×1 데미지를 상대에게 준다.

**en**

> 【On Cast】Deal damage to the opponent equal to 1 times the number of cards in your Rift.


### EXILE_NUKE2 — 虚空大崩壊

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分のリフトにあるカード枚数×2ダメージを相手に与える。

**ko**

> 【발동시】자신의 리프트의 카드 수×2 데미지를 상대에게 준다.

**en**

> 【On Cast】Deal damage to the opponent equal to 2 times the number of cards in your Rift.


### GOLIATH_HUNT — ジャイアントキリング

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】相手の場に現在体力10以上のモンスターがいる。
> 
> 【発動時】その中で攻撃力と最大体力の合計が最大の1体を自動で破壊する（同値は場の並び順）。

**ko**

> 【발동 조건】상대의 필드에 현재 체력 10 이상 몬스터가 있다.
> 
> 【발동시】그중 공격력과 최대 체력 합이 가장 큰 1체를 자동 파괴한다(동률은 필드 순서).

**en**

> 【Play Requirement】An enemy monster has at least 10 current HP.
> 
> 【On Cast】Automatically destroy the eligible monster with the highest ATK plus max HP; ties use field order.


### DOUBLE_EXEC — 二重処刑

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"destroyMon"}`。

**ja**

> 【発動時】両方の場のモンスターから合計2体まで選んで破壊する。

**ko**

> 【발동시】양쪽 필드의 몬스터 중 합계 2체까지 선택해 파괴한다.

**en**

> 【On Cast】Choose and destroy up to 2 monsters from either field combined.


### MASSACRE — 大虐殺

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分の最大マナ-1。相手の場のモンスターを全て破壊する。

**ko**

> 【발동시】자신의 최대 마나 -1. 상대 필드의 몬스터를 전부 파괴한다.

**en**

> 【On Cast】Your max mana -1. Destroy all monsters on the enemy field.


### MIMIC_KING2 — ミミックキング2世

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【召喚時】自分のリフトにミミック系6枚以上なら「ミミックの隠れ家」を展開する。

**ko**

> 【소환시】리프트에 미믹 계열 6장 이상이면 미믹의 은신처를 전개한다.

**en**

> 【On Summon】With at least 6 Mimic-family cards in your Rift, deploy Mimic Hideout.


### ORIGIN_MIMIC — 始原のミミック

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"originMimic"}`。

**ja**

> 【召喚時】自分の場・墓地・リフトにある「ミミック」系モンスター1枚につき、このモンスターの攻撃力+2・体力+2（持続、自身を含む）。

**ko**

> 【소환시】자신의 필드·묘지·리프트의 미믹 계열 몬스터 1장당 이 몬스터의 공격력 +2, 체력 +2(지속, 자신 포함).

**en**

> 【On Summon】This monster gets +2 ATK and +2 HP per Mimic-family monster on your field or in your graveyard or Rift, including itself (lasting).


### GREED_PRICE — 強欲の代価

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】「ミミック」2体を自分の場に召喚する。新しい「ミミック」5枚を自分のリフトに追加する。

**ko**

> 【발동시】미믹 2체를 자신의 필드에 소환한다. 새로운 미믹 5장을 자신의 리프트에 추가한다.

**en**

> 【On Cast】Summon 2 Mimics to your field. Create 5 new Mimics in your Rift.


### MARKET_CRISIS — 経済危機

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】固定マーケット7枚を全て更新する。

**ko**

> 【발동시】고정 마켓 7장을 전부 갱신한다.

**en**

> 【On Cast】Refresh all 7 cards of the fixed market.


### TOKEN00 — かかし

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【補足】このモンスターはトークン。破壊されると墓地の代わりに自分のリフトへ行く。

**ko**

> 【참고】이 몬스터는 토큰이다. 파괴되면 묘지 대신 자신의 리프트로 간다.

**en**

> 【Note】This monster is a Token. When destroyed, it goes to your Rift instead of your graveyard.


### SOLDIER2 — 兵士

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【補足】このモンスターはトークン。破壊されると墓地の代わりに自分のリフトへ行く。

**ko**

> 【참고】이 몬스터는 토큰이다. 파괴되면 묘지 대신 자신의 리프트로 간다.

**en**

> 【Note】This monster is a Token. When destroyed, it goes to your Rift instead of your graveyard.


### FURNACE — 溶鉱炉

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"furnace"}`。

**ja**

> 【自分ターン開始時】自分の墓地で購入コストが最も低いカード1枚を、自動で自分のリフトへ送る（同値なら墓地の先頭を優先）。

**ko**

> 【자신 턴 시작시】자신의 묘지에서 구매 코스트가 가장 낮은 카드 1장을 자동으로 자신의 리프트로 보낸다(동률이면 묘지 앞쪽 우선).

**en**

> 【Your Turn Start】Automatically send 1 card with the lowest purchase cost in your graveyard to your Rift; ties use graveyard order.


### PURGE_TOUCH — 浄化の手

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"exilePick"}`。

**ja**

> 【発動条件】自分の墓地にカードがある。
> 
> 【発動時】自分の烙印カウンターを全て取り除く。自分の墓地からカードを1枚まで選び、自分のリフトへ送る。送った場合、カードを1枚引く。

**ko**

> 【발동 조건】자신의 묘지에 카드가 있다.
> 
> 【발동시】자신의 낙인 카운터를 전부 제거한다. 자신의 묘지에서 카드를 최대 1장 선택해 자신의 리프트로 보낸다. 보냈다면 카드를 1장 뽑는다.

**en**

> 【Play Requirement】Your graveyard is not empty.
> 
> 【On Cast】Remove all your Brand counters. Choose up to 1 card in your graveyard and send it to your Rift. If you do, draw 1 card.


### SCRAPPER — スクラップ収集家

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】自分のデッキ・墓地に購入コスト1以下のカードが合計2枚以上ある。
> 
> 【発動時】そのうち2枚を自動で自分のリフトへ送る（墓地、デッキの順）。自分の最大マナ+1。

**ko**

> 【발동 조건】자신의 덱·묘지에 구매 코스트 1 이하 카드가 합계 2장 이상.
> 
> 【발동시】그중 2장을 자동으로 자신의 리프트로 보낸다(묘지, 덱 순서). 자신의 최대 마나 +1.

**en**

> 【Play Requirement】Your deck and graveyard contain at least 2 cards of purchase cost 1 or less.
> 
> 【On Cast】Automatically send 2 of them to your Rift, taking from the graveyard before the deck. Your max mana +1.


### HORDE — 軍団の旗手

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"hordeRally"}`。

**ja**

> 【召喚時】自分の場の全ての「兵士」「騎士」の攻撃力+4(持続)。

**ko**

> 【소환시】자신의 필드의 모든 '병사'·'기사'의 공격력 +4(지속).

**en**

> 【On Summon】All Soldiers and Knights on your field ATK +4 (lasting).


### ELITE — 精鋭騎士団長

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"eliteSoldiers"}`。

**ja**

> 【召喚時】デッキ構成が10枚以下なら兵士(2/2)2体を召喚する。

**ko**

> 【소환시】덱 구성이 10장 이하면 병사(2/2) 2체를 소환한다.

**en**

> 【On Summon】With 10 or fewer cards in your deck composition, summon two 2/2 Soldiers.


### WALLBREAK1 — 城壁破砕

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"destroyMon"}`。

**ja**

> 【発動時】両方の場の攻撃力2以下のモンスターのうち、攻撃力と最大体力の合計が最大の1体を自動で破壊する（相手のオーラ持ちは除く。同値は相手側、場の並び順を優先）。

**ko**

> 【발동시】양쪽 필드의 공격력 2 이하 몬스터 중 공격력과 최대 체력 합이 가장 큰 1체를 자동 파괴한다(상대 아우라 보유 제외, 동률은 상대 우선·필드 순서).

**en**

> 【On Cast】Automatically destroy the monster on either field with ATK 2 or less and the highest ATK plus max HP, excluding enemy Aura monsters; ties favor the enemy field, then field order.


### WALLBREAK2 — 攻城崩壊

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"destroyMon"}`。

**ja**

> 【発動時】相手の場の攻撃力2以下のモンスターを全て破壊する。

**ko**

> 【발동시】상대의 필드의 공격력 2 이하 몬스터를 모두 파괴한다.

**en**

> 【On Cast】Destroy all enemy monsters with ATK 2 or less.


### SNIPE1 — 狙撃

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"destroyMon"}`。

**ja**

> 【発動時】両方の場の現在体力3以下のモンスターのうち、攻撃力と最大体力の合計が最大の1体を自動で破壊する（相手のオーラ持ちは除く。同値は相手側、場の並び順を優先）。

**ko**

> 【발동시】양쪽 필드의 현재 체력 3 이하 몬스터 중 공격력과 최대 체력 합이 가장 큰 1체를 자동 파괴한다(상대 아우라 보유 제외, 동률은 상대 우선·필드 순서).

**en**

> 【On Cast】Automatically destroy the monster on either field with current HP 3 or less and the highest ATK plus max HP, excluding enemy Aura monsters; ties favor the enemy field, then field order.


### SNIPE2 — 一斉射撃

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"destroyMon"}`。

**ja**

> 【発動時】相手の場の現在体力2以下のモンスターを全て破壊する。

**ko**

> 【발동시】상대의 필드의 현재 체력 2 이하 몬스터를 모두 파괴한다.

**en**

> 【On Cast】Destroy all enemy monsters with current HP 2 or less.


### DRAGON_EGG — ドラゴンの卵

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"ward","hatchTurns":8}`。

**ja**

> 【卵】攻撃できない。
> 
> 【耐久】カウンター6個で登場し、攻撃・ダメージを受けるたび1個失う（0個で破壊）。
> 
> 【孵化まで】双方のターン開始を8回数え、残り0の自分ターン開始時に孵化する。
> 
> 【孵化時】孵化時、この卵を自分のリフトへ送り、「黒竜」「赤竜」「青竜」からランダムに1体を自分の場に召喚する。

**ko**

> 【알】공격할 수 없다.
> 
> 【내구】카운터 6개로 등장하며 공격·데미지를 받을 때마다 1개 감소(0개면 파괴).
> 
> 【부화까지】양쪽 턴 시작을 8회 세고 남은 턴이 0인 자신의 턴 시작시 부화한다.
> 
> 【부화시】부화시 이 알을 자신의 리프트로 보내고 흑룡·적룡·청룡 중 무작위 1체를 자신의 필드에 소환한다.

**en**

> 【Egg】Cannot attack.
> 
> 【Durability】Enters with 6 counters; loses 1 per attack or damage hit and is destroyed at 0.
> 
> 【Hatch Countdown】Count 8 turn starts, including both players; hatch at your turn start once none remain.
> 
> 【On Hatching】On hatching, send this Egg to your Rift and summon 1 random Black, Red, or Blue Dragon to your field.


### BEAST_EGG — 神獣の卵

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"ward","hatchTurns":10}`。

**ja**

> 【卵】攻撃できない。
> 
> 【耐久】カウンター7個で登場し、攻撃・ダメージを受けるたび1個失う（0個で破壊）。
> 
> 【孵化まで】双方のターン開始を10回数え、残り0の自分ターン開始時に孵化する。
> 
> 【孵化時】孵化時、この卵を自分のリフトへ送り、「神獣」1体を自分の場に召喚する。

**ko**

> 【알】공격할 수 없다.
> 
> 【내구】카운터 7개로 등장하며 공격·데미지를 받을 때마다 1개 감소(0개면 파괴).
> 
> 【부화까지】양쪽 턴 시작을 10회 세고 남은 턴이 0인 자신의 턴 시작시 부화한다.
> 
> 【부화시】부화시 이 알을 자신의 리프트로 보내고 신수 1체를 자신의 필드에 소환한다.

**en**

> 【Egg】Cannot attack.
> 
> 【Durability】Enters with 7 counters; loses 1 per attack or damage hit and is destroyed at 0.
> 
> 【Hatch Countdown】Count 10 turn starts, including both players; hatch at your turn start once none remain.
> 
> 【On Hatching】On hatching, send this Egg to your Rift and summon 1 Divine Beast to your field.


### D_BLACK — 黒竜

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"blackDragon"}`。

**ja**

> 【召喚時】相手の場の全モンスターの体力-3（持続）。その後、相手のリフトからカードを8枚まで選び、相手の墓地へ戻す。

**ko**

> 【소환시】상대의 필드 모든 몬스터 체력 -3(지속). 그 후 상대의 리프트에서 카드를 8장까지 선택해 상대의 묘지로 되돌린다.

**en**

> 【On Summon】All enemy monsters get -3 HP (lasting). Then choose up to 8 cards in the opponent's Rift and return them to their graveyard.


### D_RED — 赤竜

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"burn","aura":"spellAmp"}`。

**ja**

> 【召喚時】相手に15ダメージを与える。
> 
> 【場にいる間】自分の魔法が相手にダメージを与えるたび+3追加ダメージ。

**ko**

> 【소환시】상대에게 15 데미지를 준다.
> 
> 【필드에 있는 동안】자신의 마법이 상대에게 데미지를 줄 때마다 +3 추가 데미지.

**en**

> 【On Summon】Deal 15 damage to the opponent.
> 
> 【While on the Field】Your spells deal +3 extra damage to the opponent.


### D_BLUE — 青竜

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"blueDragon","turnFx":"growMaxHp"}`。

**ja**

> 【召喚時】自分の体力を20回復する。
> 
> 【自分ターン開始時】相手の場のモンスター1体につき、自分の体力を1回復する。

**ko**

> 【소환시】자신의 체력을 20 회복한다.
> 
> 【자신 턴 시작시】상대의 필드의 몬스터 1체당 자신의 체력을 1 회복한다.

**en**

> 【On Summon】Restore 20 of your HP.
> 
> 【Your Turn Start】Restore 1 of your HP for each enemy monster.


### DIVINE — 神獣

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"divine","aura":"ward"}`。

**ja**

> 【召喚時】自分の最大マナ+15。以後、自分ターン開始時のドロー+1（このモンスターが場を離れても続く）。両方の場のモンスター・永続魔法から合計3枚まで選んで破壊する。

**ko**

> 【소환시】자신의 최대 마나 +15. 이후 자신 턴 시작 드로우 +1(이 몬스터가 필드를 떠나도 지속). 양쪽 필드의 몬스터·영구마법 중 합계 3장까지 선택해 파괴한다.

**en**

> 【On Summon】Your max mana +15. For the rest of the game, draw 1 extra card at your turn start, even after this monster leaves. Choose and destroy up to 3 monsters or persistent spells from either field combined.


### EGG_HUNTER — エッグハンター

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"eggHunter"}`。

**ja**

> 【攻撃時】このモンスターが卵を攻撃した場合、その卵のカウンターを通常の1個の代わりに6個減らす。

**ko**

> 【공격시】이 몬스터가 알을 공격하면 그 알의 카운터를 보통 1개 대신 6개 감소.

**en**

> 【On Attack】When this monster attacks an Egg, remove 6 counters from that Egg instead of the usual 1.


### INCUBATOR — 高級孵化器

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"incubate"}`。

**ja**

> 【発動時】自分の場の卵を1体まで選び、孵化までの残りターンを5減らす（最低0）。0になれば直ちに孵化する。

**ko**

> 【발동시】자신의 필드의 알을 1체까지 선택해 부화까지 남은 턴을 5 감소(최저 0). 0이 되면 즉시 부화한다.

**en**

> 【On Cast】Choose up to 1 Egg on your field and reduce its remaining hatch turns by 5, to a minimum of 0. If it reaches 0, hatch it immediately.


### EGG_MASTER — 孵化マスター

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"eggMaster"}`。

**ja**

> 【召喚時】自分の場の全ての卵にカウンターを5個ずつ追加する（孵化までの残りターンは変わらない）。

**ko**

> 【소환시】자신의 필드의 모든 알에 카운터를 각각 5개 추가한다(부화까지 남은 턴은 바뀌지 않음).

**en**

> 【On Summon】Add 5 counters to each Egg on your field; remaining hatch turns do not change.


### BLOOD_JOY — 血の魔法 - 喜

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分に6ダメージを与える。相手と自分は体力を12得る。

**ko**

> 【발동시】자신에게 6 데미지를 준다. 상대와 자신은 체력을 12 얻는다.

**en**

> 【On Cast】You take 6 damage. Both players gain 12 HP.


### BLOOD_ANGER — 血の魔法 - 怒

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分に10ダメージを与える。両方の場の全モンスターは攻撃力+3(持続)。

**ko**

> 【발동시】자신에게 10 데미지를 준다. 필드 위 모든 몬스터는 공격력 +3(지속).

**en**

> 【On Cast】You take 10 damage. All monsters on both fields gain +3 ATK (lasting).


### BLOOD_SORROW — 血の魔法 - 哀

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分に12ダメージを与える。自分の墓地で購入コストが最も高いカード1枚を、自動で自分のリフトへ送る（同値なら墓地の先頭を優先）。

**ko**

> 【발동시】자신에게 12 데미지를 준다. 자신의 묘지에서 구매 코스트가 가장 높은 카드 1장을 자동으로 자신의 리프트로 보낸다(동률이면 묘지 앞쪽 우선).

**en**

> 【On Cast】You take 12 damage. Automatically send 1 card with the highest purchase cost in your graveyard to your Rift; ties use graveyard order.


### BLOOD_PLEASURE — 血の魔法 - 楽

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分に14ダメージを与える。自分の最大マナ+1。

**ko**

> 【발동시】자신에게 14 데미지를 준다. 자신의 최대 마나 +1.

**en**

> 【On Cast】You take 14 damage. Your max mana +1.


### VAMP_PACT — 吸血契約

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分に6ダメージを与える。「見習い吸血鬼」を自分の場に召喚する。

**ko**

> 【발동시】자신에게 6 데미지를 준다. '견습 흡혈귀'를 자신의 필드에 소환한다.

**en**

> 【On Cast】You take 6 damage. Summon an 'Apprentice Vampire' to your field.


### BLOOD_FEST — 血の祝祭

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"bloodFest"}`。

**ja**

> 【血の魔法の発動時】自分が「血の魔法」をプレイするたび、自分の最大マナ+1。

**ko**

> 【피의 마법 발동시】자신이 피의 마법을 사용할 때마다 자신의 최대 마나 +1.

**en**

> 【When You Cast Blood Magic】Whenever you play Blood Magic, your max mana +1.


### BLOOD_SHIELD — 吸血術式

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"bloodShield"}`。

**ja**

> 【場にある間】自分は「血の魔法」によるダメージを受けない。

**ko**

> 【필드에 놓인 동안】자신은 '피의 마법'으로 인한 데미지를 받지 않는다.

**en**

> 【While Deployed】You take no damage from 'Blood Magic'.


### VAMP_WARD — 吸血の極意

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"vampWard"}`。

**ja**

> 【場にある間】両方の場の全ての「吸血鬼」系モンスターは破壊されない。

**ko**

> 【필드에 놓인 동안】양쪽 필드의 모든 흡혈귀 계열 몬스터는 파괴되지 않는다.

**en**

> 【While Deployed】Vampire-family monsters on both fields cannot be destroyed.


### VAMP_PACT2 — 吸血刻印契約

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分に15ダメージを与える。「初級吸血鬼」を自分の場に召喚する。

**ko**

> 【발동시】자신에게 15 데미지를 준다. '초급 흡혈귀'를 자신의 필드에 소환한다.

**en**

> 【On Cast】You take 15 damage. Summon a 'Novice Vampire' to your field.


### VAMP_BUTLER — ヴァンパイア執事

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"vampButler"}`。

**ja**

> 【攻撃後】このモンスターの攻撃後、このモンスターにカウンター1個を置く。3個以上になると全て取り除き、「見習い吸血鬼」1体を自分の場に召喚する。
> 
> 【補足】このモンスターは「吸血鬼」系として扱う。

**ko**

> 【공격 후】이 몬스터의 공격 후 이 몬스터에 카운터 1개를 놓는다. 3개 이상이면 전부 제거하고 견습 흡혈귀 1체를 자신의 필드에 소환한다.
> 
> 【참고】이 몬스터는 흡혈귀 계열로 취급.

**en**

> 【After Attack】After this monster attacks, put 1 counter on it. At 3 or more, remove them all and summon 1 Apprentice Vampire to your field.
> 
> 【Note】This monster counts as Vampire-family.


### BLOOD_SECRET — 血の魔法 - 秘術

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】自分の場に「吸血鬼」系モンスターがいる。
> 
> 【発動時】自分に9ダメージを与える。自分の場の「吸血鬼」系モンスター1体を選んで破壊する。破壊できたら自分の最大マナ+3、自分の体力を10回復する。

**ko**

> 【발동 조건】자신의 필드에 흡혈귀 계열 몬스터가 있다.
> 
> 【발동시】자신에게 9 데미지를 준다. 자신의 필드의 흡혈귀 계열 몬스터 1체를 선택해 파괴한다. 파괴했다면 자신의 최대 마나 +3, 자신의 체력을 10 회복한다.

**en**

> 【Play Requirement】You control a Vampire-family monster.
> 
> 【On Cast】You take 9 damage. Choose and destroy 1 Vampire-family monster on your field. If destroyed, your max mana +3 and restore 10 of your HP.


### VAMP1 — 見習い吸血鬼

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【血の魔法の発動時】自分が「血の魔法」を発動した時、「初級吸血鬼」1体を自分の場に召喚する（この個体が場にいる間1回）。

**ko**

> 【피의 마법 발동시】자신이 피의 마법을 발동하면 초급 흡혈귀 1체를 자신의 필드에 소환한다(이 개체가 필드에 있는 동안 1회).

**en**

> 【When You Cast Blood Magic】When you cast Blood Magic, summon 1 Novice Vampire to your field, once while this copy remains on the field.


### VAMP2 — 初級吸血鬼

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【血の魔法の発動時】自分が「血の魔法」を発動した時、「中級吸血鬼」1体を自分の場に召喚する（この個体が場にいる間1回）。

**ko**

> 【피의 마법 발동시】자신이 피의 마법을 발동하면 중급 흡혈귀 1체를 자신의 필드에 소환한다(이 개체가 필드에 있는 동안 1회).

**en**

> 【When You Cast Blood Magic】When you cast Blood Magic, summon 1 Adept Vampire to your field, once while this copy remains on the field.


### VAMP3 — 中級吸血鬼

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【血の魔法の発動時】自分が「血の魔法」を発動した時、「上級吸血鬼」1体を自分の場に召喚する（この個体が場にいる間1回）。

**ko**

> 【피의 마법 발동시】자신이 피의 마법을 발동하면 상급 흡혈귀 1체를 자신의 필드에 소환한다(이 개체가 필드에 있는 동안 1회).

**en**

> 【When You Cast Blood Magic】When you cast Blood Magic, summon 1 Elite Vampire to your field, once while this copy remains on the field.


### VAMP4 — 上級吸血鬼

確認済み：表記改定（ja / ko / en）。実装キー：`{"attackFx":"vampDrain"}`。

**ja**

> 【血の魔法の発動時】自分が「血の魔法」を発動した時、「特級吸血鬼」1体を自分の場に召喚する（この個体が場にいる間1回）。
> 
> 【攻撃時】このモンスターの攻撃で相手プレイヤーに与えたダメージの半分、自分の体力を回復する（端数切り捨て）。

**ko**

> 【피의 마법 발동시】자신이 피의 마법을 발동하면 특급 흡혈귀 1체를 자신의 필드에 소환한다(이 개체가 필드에 있는 동안 1회).
> 
> 【공격시】이 몬스터의 공격으로 상대 플레이어에게 준 데미지의 절반만큼 자신의 체력을 회복한다(버림).

**en**

> 【When You Cast Blood Magic】When you cast Blood Magic, summon 1 Supreme Vampire to your field, once while this copy remains on the field.
> 
> 【On Attack】Restore your HP by half the damage this monster's attack deals to the opponent, rounded down.


### VAMP5 — 特級吸血鬼

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"vampLord","attackFx":"vampDrain"}`。

**ja**

> 【召喚時】相手に15ダメージを与える。自分の体力を30回復する。
> 
> 【攻撃時】このモンスターの攻撃で相手プレイヤーに与えたダメージと同じ量、自分の体力を回復する。

**ko**

> 【소환시】상대에게 15 데미지를 준다. 자신의 체력을 30 회복한다.
> 
> 【공격시】이 몬스터의 공격으로 상대 플레이어에게 준 데미지만큼 자신의 체력 회복한다.

**en**

> 【On Summon】Deal 15 damage to the opponent. Restore 30 of your HP.
> 
> 【On Attack】Restore your HP by the damage this monster's attack deals to the opponent.


### FLAME — 火種の負債

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】相手に2ダメージ、自分に1ダメージを与える。

**ko**

> 【발동시】상대에게 2 데미지, 자신에게 1 데미지를 준다.

**en**

> 【On Cast】Deal 2 damage to the opponent, you take 1 damage.


### GHOST — 幽霊

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【相手の回復時】相手が体力を回復するたび、このモンスターの攻撃力+1（持続）。
> 
> 【行動の終了後】1回の行動で相手の最大マナが増えた場合、自分に2ダメージを与える。その行動で相手が回復した場合も、自分に2ダメージ（それぞれ行動ごとに1回）。

**ko**

> 【상대 회복시】상대가 체력을 회복할 때마다 이 몬스터의 공격력 +1(지속).
> 
> 【행동 처리 후】1회 행동 중 상대의 최대 마나가 증가하면 자신에게 2 데미지를 준다. 그 행동에서 상대가 회복한 경우에도 자신에게 2 데미지를 준다(각각 행동당 1회).

**en**

> 【When the Opponent Heals】Whenever the opponent restores HP, this monster gets +1 ATK (lasting).
> 
> 【After an Action】If the opponent's max mana increases during an action, you take 2 damage. If they restore HP during that action, you also take 2 damage; each condition triggers once per action.


### BLOOD_RITE — 血鬼術

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"spellHeal"}`。

**ja**

> 【場にある間】両プレイヤーへの魔法ダメージを無効にし、受けるはずだった量だけそのプレイヤーの体力を回復する。
> 
> 【期間】双方のターンが合計14ターン経過したターン開始時にこの魔法を破壊する。
> 
> 【破壊時】破壊されたこの魔法は墓地の代わりに自分のリフトへ送る。

**ko**

> 【필드에 놓인 동안】양 플레이어가 받을 마법 데미지를 무효화하고 그 양만큼 해당 플레이어의 체력 회복한다.
> 
> 【기간】양쪽 턴이 합계 14턴 지난 턴 시작시 이 마법을 파괴한다.
> 
> 【파괴시】파괴된 이 마법은 묘지 대신 자신의 리프트로 보낸다.

**en**

> 【While Deployed】Prevent spell damage to either player and restore that player's HP by the prevented amount.
> 
> 【Duration】Destroy this spell at turn start after 14 turns, counting both players.
> 
> 【On Destruction】When destroyed, send this spell to your Rift instead of your graveyard.


### WEAKEN_ALL — 弱化術式

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"weakenAll"}`。

**ja**

> 【設置上限】この魔法は両方の場を合わせて最大2枚まで存在できる。
> 
> 【場にある間】両方の場の全モンスターの攻撃力-2（後から場に出るものも含む）。この魔法が場を離れると、この減少はなくなる。
> 
> 【破壊時】この魔法を墓地の代わりに自分のリフトへ送る。

**ko**

> 【설치 제한】이 마법은 양 필드 합계 최대 2장까지 존재 가능.
> 
> 【필드에 놓인 동안】양쪽 필드의 모든 몬스터 공격력 -2(나중에 등장하는 몬스터 포함). 이 마법이 필드를 떠나면 이 감소는 사라진다.
> 
> 【파괴시】이 마법을 묘지 대신 자신의 리프트로 보낸다.

**en**

> 【Field Limit】At most 2 copies across both fields.
> 
> 【While Deployed】All monsters on both fields have -2 ATK, including later arrivals. This reduction ends when this spell leaves the field.
> 
> 【On Destruction】Send this spell to your Rift instead of your graveyard.


### GUILD_HALL — アサシンギルド支部

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"assassinGuild"}`。

**ja**

> 【相手への攻撃命中時】自分の「アサシン」系モンスターかこのモンスターの攻撃で相手プレイヤーにダメージを与えるたび、このモンスターにカウンター1個を置く。3個以上になると全て取り除き、相手に14ダメージを与える。

**ko**

> 【공격으로 상대에게 데미지】자신 암살자 계열 몬스터 또는 이 몬스터의 공격으로 상대 플레이어에게 데미지를 줄 때마다 이 몬스터에 카운터 1개를 놓는다. 3개 이상이면 전부 제거하고 상대에게 14 데미지를 준다.

**en**

> 【Attack Hits the Opponent】Whenever an allied Assassin-family monster or this monster damages the opponent with an attack, put 1 counter on this monster. At 3 or more, remove them all and deal 14 damage to the opponent.


### FATE_WHEEL — 運命の輪

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"fateWheel"}`。

**ja**

> 【出目を確認した後】自分のダイス結果を確認後、その行動のダイス1個を振り直せる（自分の各ターン1回）。
> 
> 【破壊時】この魔法を墓地の代わりに自分のリフトへ送る。

**ko**

> 【눈을 확인한 후】자신의 주사위 결과를 확인한 뒤 그 행동의 주사위를 다시 굴릴 수 있다(자신의 턴마다 1회).
> 
> 【파괴시】이 마법을 묘지 대신 자신의 리프트로 보낸다.

**en**

> 【After Seeing the Roll】After seeing your dice results, you may reroll the dice for that action, once during each of your turns.
> 
> 【On Destruction】Send this spell to your Rift instead of your graveyard.


### COUNTERCALC — 逆算

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】相手の最大マナが7以下で、相手の場に永続魔法がある。
> 
> 【発動時】相手の永続魔法1枚をランダムに破壊する。

**ko**

> 【발동 조건】상대의 최대 마나가 7 이하이고 상대의 필드에 영구마법이 있다.
> 
> 【발동시】상대 영구마법 1장을 무작위로 파괴한다.

**en**

> 【Play Requirement】The opponent's max mana is at most 7 and they control a persistent spell.
> 
> 【On Cast】Destroy 1 random enemy persistent spell.


### AMBUSH — 奇襲

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】相手の最大マナが4。
> 
> 【発動時】相手に8ダメージを与える。自分に3ダメージを与える。この魔法を自分のリフトへ送る。

**ko**

> 【발동 조건】상대의 최대 마나가 4.
> 
> 【발동시】상대에게 8 데미지를 준다. 자신에게 3 데미지를 준다. 이 마법을 자신의 리프트로 보낸다.

**en**

> 【Play Requirement】The opponent's max mana is exactly 4.
> 
> 【On Cast】Deal 8 damage to the opponent. You take 3 damage. Send this spell to your Rift.


### TRUMPET — 支援ラッパ

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分の場から異なる個体を3体まで選び、このターン終了までそれぞれの攻撃力+1（同名可）。

**ko**

> 【발동시】자신의 필드에서 서로 다른 개체를 최대 3체 선택해 이번 턴 종료까지 각각 공격력 +1(동명 가능).

**en**

> 【On Cast】Choose up to 3 different monsters on your field, allowing the same name; each gets +1 ATK until this turn ends.


### FORESIGHT — 先見の明

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"foresight"}`。

**ja**

> 【発動条件】自分の場に「先見の明」がない。
> 
> 【双方のターン開始時】自分の最大マナが10以上なら、自分の最大マナ+2、この魔法を自分のリフトへ送る。
> 
> 【破壊時】墓地の代わりに自分のリフトへ送る。

**ko**

> 【발동 조건】자신의 필드에 선견지명이 없다.
> 
> 【양쪽 턴 시작시】자신의 최대 마나가 10 이상이면 자신의 최대 마나 +2, 이 마법을 자신의 리프트로 보낸다.
> 
> 【파괴시】묘지 대신 자신의 리프트로 보낸다.

**en**

> 【Play Requirement】You control no Foresight.
> 
> 【Either Turn Start】If your max mana is at least 10, your max mana +2 and send this spell to your Rift.
> 
> 【On Destruction】Send it to your Rift instead of your graveyard.


### TRICKROOM — トリックルーム

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】両方の場の全モンスターの攻撃力と現在体力を入れ替える。双方のターン開始を合計2回迎えると元に戻す（効果中に登場したモンスターも対象）。効果中の強化は終了後、反対のステータスに残る。

**ko**

> 【발동시】양쪽 필드의 모든 몬스터 공격력과 현재 체력을 교환. 양쪽 턴 시작을 합계 2회 맞으면 되돌린다(효과 중 등장한 몬스터 포함). 효과 중 강화는 종료 후 반대 능력치에 남는다.

**en**

> 【On Cast】Swap ATK and current HP of all monsters on both fields. Swap back after 2 subsequent turn starts, counting both players; monsters entering during the effect are also affected. Buffs gained during the effect remain on the opposite stat afterward.


### INCUBATOR_S — 孵化器

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"incubate"}`。

**ja**

> 【発動時】自分の場の卵を1体まで選び、孵化までの残りターンを2減らす（最低0）。0になれば直ちに孵化する。

**ko**

> 【발동시】자신의 필드의 알을 1체까지 선택해 부화까지 남은 턴을 2 감소(최저 0). 0이 되면 즉시 부화한다.

**en**

> 【On Cast】Choose up to 1 Egg on your field and reduce its remaining hatch turns by 2, to a minimum of 0. If it reaches 0, hatch it immediately.


### TRIBE_PACT — 多種族契約

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"tribeContract"}`。

**ja**

> 【場にある間】自分の種族モンスターの購入コスト-1（最低1）。
> 
> 【自分ターン開始時】ゲームの通算45ターン目以降の自分ターン開始時、まだ自分が種族シナジーを1回も発動していなければ敗北する。

**ko**

> 【필드에 놓인 동안】자신의 종족 몬스터 구매 코스트 -1(최저 1).
> 
> 【자신 턴 시작시】게임 통산 45턴째 이후 자신의 턴 시작시 자신이 종족 시너지를 1회도 발동하지 않았으면 패배.

**en**

> 【While Deployed】Your tribal monsters cost 1 less to buy, to a minimum of 1.
> 
> 【Your Turn Start】At your turn start on game turn 45 or later, you lose if you have never activated a tribe synergy.


### GOLEM1 — 兵士ゴーレム

確認済み：既存の明確な表記を維持。実装キー：`{}`。

**ja**

> （追加効果なし・キーワード表示のみ）

**ko**

> （追加効果なし・キーワード表示のみ）

**en**

> （追加効果なし・キーワード表示のみ）


### GOLEM2 — リーダーゴーレム

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"leaderGolem"}`。

**ja**

> 【味方モンスター破壊時】自分の場のモンスターが倒れるたびこのモンスターにカウンター1個（気合に使用）。

**ko**

> 【아군 몬스터 파괴시】자신의 필드의 몬스터가 쓰러질 때마다 이 몬스터에 카운터 1개를 얻는다(기합에 사용).

**en**

> 【Allied Monster Destroyed】Whenever a monster on your field dies, this monster gains 1 counter (used by Guts).


### GOLEM3 — ゴーレムキング

確認済み：表記改定（ja / ko / en）。実装キー：`{"summonReq":"golemKin"}`。

**ja**

> 【召喚条件】自分の場・デッキ・手札・墓地に同名以外の「ゴーレム」系モンスターがいる時のみ召喚可能。

**ko**

> 【소환 조건】자신의 필드·덱·패·묘지에 동명 외 '골렘' 계열 몬스터가 있을 때만 소환할 수 있다.

**en**

> 【Summon Requirement】Summonable only with a Golem-family monster with a different name in your field, deck, hand or graveyard.


### DECAY_CRAFT — 暗器製造

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】相手の場の、卵以外の全モンスターにカウンター1個を付与する（腐敗の処理）。自分の場のモンスターを2体まで選び、「腐敗」を付与する（持続）。

**ko**

> 【발동시】상대의 필드의 알 이외 모든 몬스터에 카운터 1개 부여한다(부패 처리). 자신의 필드의 몬스터를 최대 2체 선택해 부패 부여한다(지속).

**en**

> 【On Cast】Put 1 counter on each non-Egg monster on the enemy field, applying Decay rules. Choose up to 2 monsters on your field and give them Decay (lasting).


### RUST_SLUG — ラストキャップ・スラッグ

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"decayAll"}`。

**ja**

> 【召喚時】相手の場の、卵以外の全モンスターにカウンター1個を付与する（腐敗の処理）。
> 
> 【相手の腐敗破壊時】腐敗で相手モンスターが破壊されるたび、自分の最大マナ+1、自分の体力を5回復する（同名は重複しない）。

**ko**

> 【소환시】상대의 필드의 알 이외 모든 몬스터에 카운터 1개 부여한다(부패 처리).
> 
> 【상대 부패 파괴시】부패로 상대 몬스터가 파괴될 때마다 자신의 최대 마나 +1, 자신의 체력을 5 회복한다(동명 중첩 불가).

**en**

> 【On Summon】Put 1 counter on each non-Egg enemy monster, applying Decay rules.
> 
> 【Enemy Destroyed by Decay】Whenever Decay destroys an enemy monster, your max mana +1 and restore 5 of your HP; multiple copies do not stack.


### MAJESTY_RITE — 刻印秘術

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分の最大マナ-1。自分の場のモンスター1体を選び、「威厳」を付与する（持続）。

**ko**

> 【발동시】자신의 최대 마나 -1. 자신의 필드의 몬스터 1체를 선택해 위엄 부여한다(지속).

**en**

> 【On Cast】Your max mana -1. Choose 1 monster on your field and give it Majesty (lasting).


### CROSSROADS — 選択の岐路

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】新しい「カル」2枚を自分の墓地に追加する。

**ko**

> 【발동시】새로운 컬 2장을 자신의 묘지에 추가한다.

**en**

> 【On Cast】Create 2 new Culls in your graveyard.


### CHOSEN_KNIGHT — 選ばれし剣士

確認済み：表記改定（ja / ko / en）。実装キー：`{"attackFx":"cullExile2"}`。

**ja**

> 【場にいる間】自分のリフトの「カル」2枚につき、このモンスターの攻撃力+1・体力+1。
> 
> 【攻撃後】自分の「カル」2枚を自動でリフトへ送る（墓地、デッキ、手札の順）。

**ko**

> 【필드에 있는 동안】자신의 리프트의 컬 2장당 이 몬스터의 공격력 +1, 체력 +1.
> 
> 【공격 후】자신의 컬 2장을 자동으로 리프트로 보낸다(묘지, 덱, 패 순서).

**en**

> 【While on the Field】This monster gets +1 ATK and +1 HP for every 2 Culls in your Rift.
> 
> 【After Attack】Automatically send 2 of your Culls to your Rift, taking from graveyard, deck, then hand.


### CHOSEN_MAGE — 選ばれし魔法使い

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【場にいる間】自分のリフトの「カル」2枚につき、このモンスターの攻撃力+1・体力+1。
> 
> 【自分ターン開始時】自分のリフトの「カル」1枚を自分の墓地へ戻してよい。戻した場合、相手に8ダメージ（各個体、各自分ターン1回）。

**ko**

> 【필드에 있는 동안】자신의 리프트의 컬 2장당 이 몬스터의 공격력 +1, 체력 +1.
> 
> 【자신 턴 시작시】자신의 리프트의 컬 1장을 자신의 묘지로 되돌릴 수 있다. 되돌렸다면 상대에게 8 데미지를 준다(개체당 자신의 각 턴 1회).

**en**

> 【While on the Field】This monster gets +1 ATK and +1 HP for every 2 Culls in your Rift.
> 
> 【Your Turn Start】You may return 1 Cull from your Rift to your graveyard. If you do, deal 8 damage to the opponent, once per copy during each of your turns.


### CHOSEN_ARCHER — 選ばれし弓手

確認済み：表記改定（ja / ko / en）。実装キー：`{"attackFx":"giantSlayer"}`。

**ja**

> 【場にいる間】自分のリフトの「カル」2枚につき、このモンスターの攻撃力+2。
> 
> 【攻撃時】攻撃対象の相手モンスターの現在体力が15以上なら、そのモンスターを破壊する。

**ko**

> 【필드에 있는 동안】자신의 리프트의 컬 2장당 이 몬스터의 공격력 +2.
> 
> 【공격시】공격 대상 상대 몬스터의 현재 체력이 15 이상이면 그 몬스터를 파괴한다.

**en**

> 【While on the Field】This monster gets +2 ATK for every 2 Culls in your Rift.
> 
> 【On Attack】If the enemy monster being attacked has at least 15 current HP, destroy it.


### CHOSEN_ROGUE — 選ばれし盗賊

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【場にいる間】自分のリフトの「カル」2枚につき、このモンスターの攻撃力+2。

**ko**

> 【필드에 있는 동안】자신의 리프트의 컬 2장당 이 몬스터의 공격력 +2.

**en**

> 【While on the Field】This monster gets +2 ATK for every 2 Culls in your Rift.


### RUST_SHROOM — ラストマッシュルーム

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【相手の腐敗破壊時】腐敗で相手モンスターが破壊されるたび、自分の最大マナ+1（同名は重複しない）。

**ko**

> 【상대 부패 파괴시】부패로 상대 몬스터가 파괴될 때마다 자신의 최대 마나 +1(동명 중첩 불가).

**en**

> 【Enemy Destroyed by Decay】Whenever Decay destroys an enemy monster, your max mana +1; multiple copies do not stack.


### CHOSEN_AREA — 選ばれし領域

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】自分のリフトに「カル」が25枚以上ある。
> 
> 【発動時】自分は直ちに勝利する。

**ko**

> 【발동 조건】자신의 리프트에 컬이 25장 이상 있다.
> 
> 【발동시】자신은 즉시 승리한다.

**en**

> 【Play Requirement】Your Rift contains at least 25 Culls.
> 
> 【On Cast】You win the game immediately.


### TRIAL_AREA — 試練の領域

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"trialArea"}`。

**ja**

> 【発動時】自分に6ダメージを与える。
> 
> 【自分ターン開始時】新しい「カル」1枚を自分の墓地に追加する。その後、自分の墓地からカードを2枚まで選び、自分のリフトへ送る。

**ko**

> 【발동시】자신에게 6 데미지를 준다.
> 
> 【자신 턴 시작시】새로운 컬 1장을 자신의 묘지에 추가한다. 그 후 자신의 묘지에서 카드를 2장까지 선택해 자신의 리프트로 보낸다.

**en**

> 【On Cast】You take 6 damage.
> 
> 【Your Turn Start】Create 1 new Cull in your graveyard. Then choose up to 2 cards from your graveyard and send them to your Rift.


### ANCIENT_CIV — 古代文明

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"ancientCiv"}`。

**ja**

> 【自分ターン開始時】発動後、双方通算で9ターン以上経過していれば、次の全てを行う。
> 自分の最大マナを1減らす。新しい「ドラゴンの卵」か「神獣の卵」1枚を選んで自分の手札に加える。この魔法を破壊する。

**ko**

> 【자신 턴 시작시】발동 후 양쪽 합계로 9턴 이상 지났으면 다음을 모두 처리한다.
> 자신의 최대 마나를 1 줄인다. 새로운 드래곤의 알 또는 신수의 알 1장을 선택해 자신의 패에 넣는다. 이 마법을 파괴한다.

**en**

> 【Your Turn Start】If at least 9 turns have elapsed since casting, counting both players, do all of the following.
> Reduce your max mana by 1. Choose 1 new Dragon Egg or Divine Beast Egg to add to your hand. Destroy this spell.


### GAMBLER — ギャンブラー

確認済み：表記改定（ja / ko / en）。実装キー：`{"turnFx":"gambler"}`。

**ja**

> 【自分ターン開始時】ダイス1個を振り、4以上なら自分の最大マナ+1。

**ko**

> 【자신 턴 시작시】주사위 1개를 굴려 4 이상이면 자신의 최대 마나 +1.

**en**

> 【Your Turn Start】Roll 1 die; on 4 or more, your max mana +1.


### ELF_HAVEN — エルフの憩い場

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"elfHaven"}`。

**ja**

> 【場にある間】自分の「世界樹」系カードの購入・発動コストは0。
> 
> 【回数制限】自分が「世界樹」系カードを購入できるのは、自分の各ターンに合計3枚まで。
> 
> 【カード購入時】自分が「世界樹」系または「エルフ」系カードを購入するたび、自分は雫1を得る。

**ko**

> 【필드에 놓인 동안】자신의 세계수 계열 카드의 구매·시전 코스트는 0.
> 
> 【횟수 제한】세계수 계열 카드는 자신의 각 턴에 합계 3장까지 구매할 수 있다.
> 
> 【카드 구매시】자신이 세계수 또는 엘프 계열 카드를 구매할 때마다 자신은 이슬 1을 얻는다.

**en**

> 【While Deployed】Your World Tree-family cards cost 0 to buy and cast.
> 
> 【Use Limit】You may buy at most 3 World Tree-family cards in total during each of your turns.
> 
> 【When a Card Is Bought】Whenever you buy a World Tree-family or Elf-family card, gain 1 Dew.


### HALF_ELF — ハーフエルフ

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"halfElf"}`。

**ja**

> 【召喚時】自分の場に「世界樹」系カードがあれば、「世界樹の慈しみ」を自分の場に展開する。
> 
> 【場にいる間】どちらかの場に「世界樹」系カードがあれば、このモンスターの攻撃力+3。

**ko**

> 【소환시】자신의 필드에 세계수 계열 카드가 있으면 세계수의 보살핌을 자신의 필드에 전개한다.
> 
> 【필드에 있는 동안】어느 쪽 필드에 세계수 계열 카드가 있으면 이 몬스터 공격력 +3.

**en**

> 【On Summon】If you control a World Tree-family card, deploy World Tree's Care to your field.
> 
> 【While on the Field】If either player controls a World Tree-family card, this monster gets +3 ATK.


### LEGEND_GAMBLER — 伝説のギャンブラー

確認済み：表記改定（ja / ko / en）。実装キー：`{"turnFx":"legendGambler"}`。

**ja**

> 【自分ターン開始時】1～6から出目を1つ予測し、ダイス3個を振る。1個以上が的中した場合、次から一つを選んで行う。
> 自分の最大マナ+4。
> 自分の体力を35回復する。
> 相手の場のモンスター・永続魔法から毎回ランダムに1枚を選んで破壊する処理を2回行う。
> 的中し、かつ自分のデッキ構成に「ギャンブラー」がある場合は、選ばず全てを上から順に行う。

**ko**

> 【자신 턴 시작시】1~6 중 눈 1개를 예측하고 주사위 3개를 굴린다. 1개 이상 적중하면 다음 중 하나를 선택해 처리한다.
> 자신의 최대 마나 +4.
> 자신의 체력을 35 회복한다.
> 상대 필드의 몬스터·영구마법 중 매번 무작위로 1장을 선택해 파괴하는 처리를 2회 한다.
> 적중했고 자신의 덱 구성에 도박꾼이 있으면 선택하지 않고 전부 위에서부터 순서대로 처리한다.

**en**

> 【Your Turn Start】Predict a result from 1–6, then roll 3 dice. If at least 1 matches, choose one of the following.
> Increase your max mana by 4.
> Restore 35 of your HP.
> Destroy 1 random monster or persistent spell on the enemy field, twice, choosing again each time.
> If a die matches and your deck composition contains Gambler, apply all options in the order above instead of choosing.


### ELF — エルフ

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"elfDew","summonReq":"dew4"}`。

**ja**

> 【召喚条件】自分の雫4以上。
> 
> 【召喚時】雫2を得て、相手の攻撃力9以上のモンスター1体を選んで破壊する。
> 
> 【場にいる間】自分の場の異なる「世界樹」系カード1種類につき、このモンスターの攻撃力+1・体力+1。両プレイヤーの回復量2倍。

**ko**

> 【소환 조건】자신의 이슬이 4 이상이다.
> 
> 【소환시】자신은 이슬 2를 얻는다. 상대의 필드에서 공격력 9 이상인 몬스터 1체를 선택해 파괴한다.
> 
> 【필드에 있는 동안】자신의 필드에 있는 세계수 계열 카드 1종류당 이 몬스터의 공격력 +1, 체력 +1. 양 플레이어의 회복량을 2배로 만든다.

**en**

> 【Summon Requirement】You have at least 4 Dew.
> 
> 【On Summon】Gain 2 Dew; choose and destroy 1 enemy monster with ATK 9 or more.
> 
> 【While on the Field】This monster gets +1 ATK and +1 HP per distinct World Tree card name on your field. Double both players’ healing.


### DARK_ELF — ダークエルフ

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"darkElfDew","summonReq":"darkElf"}`。

**ja**

> 【召喚条件】雫4以上で、自分の場に「ダークエルフ」以外の「エルフ」系モンスターがいない。
> 
> 【召喚時】雫4消費。相手にシールドがあれば相手に10ダメージを与える。
> 
> 【場にいる間】自分の場に「傭兵」系がいれば回避、「魔族」がいればオーラを得る。

**ko**

> 【소환 조건】자신의 이슬이 4 이상이고, 자신의 필드에 다크 엘프 이외의 엘프 계열 몬스터가 없다.
> 
> 【소환시】자신의 이슬 4를 소비한다. 상대에게 실드가 있으면 상대에게 10 데미지를 준다.
> 
> 【필드에 있는 동안】자신의 필드에 용병 계열 몬스터가 있으면 이 몬스터는 회피를 얻는다. 마족 몬스터가 있으면 아우라를 얻는다.

**en**

> 【Summon Requirement】You have at least 4 Dew and no allied Elves other than Dark Elves.
> 
> 【On Summon】Spend 4 Dew. If the opponent has Shield, deal 10 damage to them.
> 
> 【While on the Field】Gain Evade with an allied Mercenary, and Aura with allied Demonkin.


### HIGH_ELF — ハイエルフ

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"highElfDew","summonReq":"dew10"}`。

**ja**

> 【召喚条件】自分の雫が10以上ある。
> 
> 【召喚時】相手の手札を全て見て、カードを3枚まで選び、相手のリフトへ送る。その後、相手のシールドを全て破壊し、自分の雫を2倍にする。
> 
> 【場にいる間】自分の場の「世界樹」系カード1種類につき、このモンスターの攻撃力+2・体力+2。相手の回復量を半分にする（端数切り捨て）。

**ko**

> 【소환 조건】자신의 이슬이 10 이상이다.
> 
> 【소환시】상대의 패를 전부 보고 카드를 최대 3장 선택해 상대의 리프트로 보낸다. 그 후 상대의 실드를 전부 파괴하고 자신의 이슬을 2배로 만든다.
> 
> 【필드에 있는 동안】자신의 필드에 있는 세계수 계열 카드 1종류당 이 몬스터의 공격력 +2, 체력 +2. 상대의 회복량을 절반으로 만든다(버림).

**en**

> 【Summon Requirement】You have at least 10 Dew.
> 
> 【On Summon】Look at the opponent’s entire hand. Choose up to 3 cards in it and send them to the opponent’s Rift. Then destroy all of the opponent’s Shield and double your Dew.
> 
> 【While on the Field】This monster gets +2 ATK and +2 HP per distinct World Tree-family card name on your field. Halve the opponent’s healing, rounded down.


### ELDER_ELF_KING — エルダーハイエルフキング

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"elderDew","summonReq":"dew12"}`。

**ja**

> 【召喚条件】自分の雫12以上。
> 
> 【召喚時】相手の場のモンスター・永続魔法・クエストを全て破壊し、自分の雫を3倍にする。
> 
> 【場にいる間】自分の場の異なる「世界樹」系カード1種類につき、このモンスターの攻撃力+4・体力+4。相手がターン中にプレイできるカードは最大3枚。
> 
> 【破壊時】自分の雫が15以上あれば、雫15を消費して相手に30ダメージを与える。

**ko**

> 【소환 조건】자신의 이슬이 12 이상이다.
> 
> 【소환시】상대의 필드의 몬스터·영구마법·퀘스트를 모두 파괴하고 자신의 이슬을 3배로 만든다.
> 
> 【필드에 있는 동안】아군 필드의 서로 다른 세계수 계열 1종당 이 몬스터의 공격력 +4, 체력 +4. 상대는 각 턴에 카드를 최대 3장 사용할 수 있다.
> 
> 【파괴시】자신의 이슬이 15 이상이면 이슬 15를 소비하고 상대에게 30 데미지를 준다.

**en**

> 【Summon Requirement】You have at least 12 Dew.
> 
> 【On Summon】Destroy all enemy monsters, persistent spells, and quests; triple your Dew.
> 
> 【While on the Field】This monster gets +4 ATK and +4 HP per distinct World Tree card name on your field. The opponent may play at most 3 cards per turn.
> 
> 【On Destruction】If you have at least 15 Dew, spend 15 Dew and deal 30 damage to the opponent.


### WORLD_CARE — 世界樹の慈しみ

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"worldCare"}`。

**ja**

> 【設置上限】自分の場に最大1枚。
> 
> 【自分ターン開始時】雫1を得る。

**ko**

> 【설치 제한】자신의 필드에 최대 1장.
> 
> 【자신 턴 시작시】이슬 1 획득한다.

**en**

> 【Field Limit】At most 1 on your field.
> 
> 【Your Turn Start】Gain 1 Dew.


### HPS_SCALE — 鋼の鱗

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"buffPerm"}`。

**ja**

> 【発動時】自分の場のモンスター1体を選び、その体力+3（持続）。

**ko**

> 【발동시】자신의 필드의 몬스터 1체를 선택해 그 체력 +3(지속).

**en**

> 【On Cast】Choose 1 monster on your field; it gets +3 HP (lasting).


### HPS_GRAFT — 生命の接ぎ木

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"buffPerm"}`。

**ja**

> 【発動時】自分の場のモンスター1体を選び、その体力+6（持続）。

**ko**

> 【발동시】자신의 필드의 몬스터 1체를 선택해 그 체력 +6(지속).

**en**

> 【On Cast】Choose 1 monster on your field; it gets +6 HP (lasting).


### HPS_OATH — 守護の誓い

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"buffAllDef"}`。

**ja**

> 【発動時】現在、自分の場にいる全モンスターの体力+6（持続）。

**ko**

> 【발동시】현재 자신의 필드에 있는 모든 몬스터의 체력 +6(지속).

**en**

> 【On Cast】All monsters currently on your field get HP +6 (lasting).


### HPS_SOIL — 生命の土壌

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"soilHp"}`。

**ja**

> 【自分が召喚した時】自分がモンスターを召喚するたび、そのモンスターの体力+2(持続)。

**ko**

> 【자신이 소환할 때】자신이 몬스터를 소환할 때마다 그 몬스터의 체력 +2(지속).

**en**

> 【When You Summon】Each monster you summon gets +2 HP (lasting).


### HPS_BOULDER — 巨岩の加護

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"buffPerm"}`。

**ja**

> 【発動時】自分の場のモンスター1体を選び、その体力+12（持続）。そのモンスターに「挑発」を付与する（持続）。

**ko**

> 【발동시】자신의 필드의 몬스터 1체를 선택해 그 체력 +12(지속). 그 몬스터에 도발 부여한다(지속).

**en**

> 【On Cast】Choose 1 monster on your field; it gets +12 HP (lasting). Give that monster Taunt (lasting).


### GUILD_CO — 商会

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"guild"}`。

**ja**

> 【発動条件】自分の場に「商会」がない。
> 
> 【自分ターン開始時】この魔法にカウンター1個を置く。この魔法のカウンター20個ごとに20個を取り除き、新しい「闇商人」1枚を自分の手札に加える。

**ko**

> 【발동 조건】자신의 필드에 상회가 없다.
> 
> 【자신 턴 시작시】이 마법에 카운터 1개를 놓는다. 이 마법의 카운터 20개마다 20개를 제거하고 새로운 암상인 1장을 자신의 패에 추가한다.

**en**

> 【Play Requirement】You control no Trade Guild.
> 
> 【Your Turn Start】Put 1 counter on this spell. For every 20 counters on it, remove 20 and create 1 Black Market Dealer in your hand.


### SLUM — スラム街

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】自分の場に「商会」がある。
> 
> 【発動時】ダイス1個を振り、その出目と同じ数のカウンターを自分の「商会」に置く。

**ko**

> 【발동 조건】자신의 필드에 상회가 있다.
> 
> 【발동시】주사위 1개를 굴려 나온 수만큼 자신 상회에 카운터를 놓는다.

**en**

> 【Play Requirement】You control a Trade Guild.
> 
> 【On Cast】Roll 1 die and put that many counters on your Trade Guild.


### GRAPE — ぶどう

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"hpUp"}`。

**ja**

> 【発動時】自分の体力を2回復する。

**ko**

> 【발동시】자신의 체력을 2 회복한다.

**en**

> 【On Cast】Restore 2 of your HP.


### BREWING — 醸造

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"brewing"}`。

**ja**

> 【自分ターン開始時】自分の手札の「ぶどう」「高品質ぶどう」を全て自分の墓地へ送る。送った「ぶどう」1枚につき1個、「高品質ぶどう」1枚につき3個、この魔法にカウンターを置く。
> 
> 【期間】発動後、6回目の自分ターン開始時に上の処理を行った後、この魔法のカウンター数と同じ枚数の新しい「ワイン」を自分の手札に加え、この魔法を自分の墓地へ送る。

**ko**

> 【자신 턴 시작시】자신의 패에 있는 포도·고급 포도를 전부 자신의 묘지로 보낸다. 보낸 포도 1장당 1개, 고급 포도 1장당 3개의 카운터를 이 마법에 놓는다.
> 
> 【기간】발동 후 6번째 자신의 턴 시작에 위 처리를 한 뒤, 이 마법의 카운터 수만큼 새로운 와인을 자신의 패에 넣고 이 마법을 자신의 묘지로 보낸다.

**en**

> 【Your Turn Start】Send all Grapes and Premium Grapes in your hand to your graveyard. Put 1 counter on this spell per Grape sent and 3 per Premium Grape sent.
> 
> 【Duration】At your 6th turn start after casting, perform the effect above, then create Wines in your hand equal to this spell’s counters and send this spell to your graveyard.


### MERCH1 — 見習い商人

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"guildCnt"}`。

**ja**

> 【召喚時】自分の場の「商会」にカウンター3個を置く。

**ko**

> 【소환시】자신의 필드의 상회에 카운터 3개를 놓는다.

**en**

> 【On Summon】Put 3 counters on your Trade Guild.


### MERCH2 — 王都の商売人

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"guildCnt"}`。

**ja**

> 【召喚時】自分の場の「商会」にカウンター8個を置く。

**ko**

> 【소환시】자신의 필드의 상회에 카운터 8개를 놓는다.

**en**

> 【On Summon】Put 8 counters on your Trade Guild.


### GRAPE2 — 高品質ぶどう

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"hpUp"}`。

**ja**

> 【発動時】自分の体力を4回復する。

**ko**

> 【발동시】자신의 체력을 4 회복한다.

**en**

> 【On Cast】Restore 4 of your HP.


### WINE — ワイン

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"hpUp"}`。

**ja**

> 【発動時】自分の体力を6回復する。カードを1枚引く。

**ko**

> 【발동시】자신의 체력을 6 회복한다. 카드를 1장 뽑는다.

**en**

> 【On Cast】Restore 6 of your HP. Draw 1 card.


### DARK_MERCHANT — 闇商人

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】購入可能なカード一覧からカード1枚を選び、購入コスト分のマナを払って購入してよい。

**ko**

> 【발동시】구매 가능한 카드 목록에서 카드 1장을 선택해 구매 코스트만큼 마나를 지불하고 구매할 수 있다.

**en**

> 【On Cast】You may choose 1 card from the purchasable catalog and pay its purchase cost in mana to buy it.


### TPO1 — 飢えた仔獣

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"preyBounce","summonReq":"preyLow2"}`。

**ja**

> 【召喚条件】相手の場に購入コスト2以下のモンスターがいる。
> 
> 【召喚時】相手の場の、オーラを持たない購入コスト2以下のモンスター1体を選び、相手の手札に戻す。

**ko**

> 【소환 조건】상대의 필드에 구매 코스트 2 이하 몬스터가 있다.
> 
> 【소환시】상대의 필드에서 아우라가 없는 구매 코스트 2 이하 몬스터 1체를 선택해 상대의 패로 되돌린다.

**en**

> 【Summon Requirement】The opponent controls a monster with purchase cost 2 or less.
> 
> 【On Summon】Choose 1 such enemy monster without Aura and return it to the opponent's hand.


### TSO1 — 隠遁者

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"soloLock"}`。

**ja**

> 【召喚時】このターンを含め、双方通算6ターン後まで自分はモンスターを召喚できない（通常は自分の3ターン後の開始時に解除）。

**ko**

> 【소환시】이번 턴부터 양쪽 합계 6턴 후까지 자신은 몬스터 소환 불가(통상 자신의 3턴 후 시작시 해제).

**en**

> 【On Summon】You cannot summon monsters from now until 6 total turns later, counting both players; normally this ends at the start of your 3rd subsequent turn.


### TAR1 — 貴族の執事

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"pageDraw"}`。

**ja**

> 【自分ターン開始時】自分ターン開始時のドロー+1（このモンスターが場にいる間）。

**ko**

> 【자신 턴 시작시】자신 턴 시작 드로우 +1(이 몬스터가 필드에 있는 동안).

**en**

> 【Your Turn Start】Draw 1 extra card at your turn start while this monster is on the field.


### TDE1 — 魔族の斥候

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"manaDebt5","summonReq":"mm5"}`。

**ja**

> 【召喚条件】自分の最大マナが5以上。
> 
> 【召喚時】自分の最大マナ-1。双方通算10ターン後のターン開始時に、自分の最大マナ+1（このモンスターが場を離れても戻る）。

**ko**

> 【소환 조건】자신의 최대 마나 5 이상.
> 
> 【소환시】자신의 최대 마나 -1. 양쪽 합계 10턴 후 턴 시작시 자신의 최대 마나 +1(이 몬스터가 필드를 떠나도 복구).

**en**

> 【Summon Requirement】Your max mana is at least 5.
> 
> 【On Summon】Your max mana -1. At turn start 10 total turns later, counting both players, your max mana +1, even if this monster has left.


### TDE2 — 魔族の戦士

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"demonTax2","summonReq":"mm5"}`。

**ja**

> 【召喚条件】自分の最大マナが5以上。
> 
> 【場にいる間】自分の最大マナ-2(最低3)。

**ko**

> 【소환 조건】자신의 최대 마나가 5 이상.
> 
> 【필드에 있는 동안】자신의 최대 마나 -2(최저 3).

**en**

> 【Summon Requirement】Your max mana is at least 5.
> 
> 【While on the Field】Your max mana -2 (never below 3).


### TDE3 — 魔族の狂戦士

確認済み：表記改定（ja / ko / en）。実装キー：`{"turnFx":"demonRoll"}`。

**ja**

> 【自分ターン開始時】ダイス1個を振る。1～3なら自分の最大マナを1減らし、4～6なら2減らす。この効果では3未満にならない。

**ko**

> 【자신 턴 시작시】주사위 1개를 굴린다. 1~3이면 자신의 최대 마나를 1 줄이고, 4~6이면 2 줄인다. 이 효과로 3 미만이 되지는 않는다.

**en**

> 【Your Turn Start】Roll 1 die. On 1–3, reduce your max mana by 1; on 4–6, reduce it by 2. This effect cannot reduce it below 3.


### TDE4 — 魔王

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"manaSet3","aura":"manaGrowthLock","summonReq":"demonKing"}`。

**ja**

> 【召喚条件】自分の最大マナが5以上で、自分のデッキ構成に「魔王」以外の「魔族」モンスターがいる。
> 
> 【召喚時】自分の最大マナを3にする。
> 
> 【場にいる間】自分の最大マナは増えない。

**ko**

> 【소환 조건】자신의 최대 마나가 5 이상이고 자신의 덱 구성에 마왕 이외의 마족 몬스터가 있다.
> 
> 【소환시】자신의 최대 마나를 3으로 만든다.
> 
> 【필드에 있는 동안】자신의 최대 마나는 증가하지 않는다.

**en**

> 【Summon Requirement】Your max mana is at least 5 and your deck composition contains a Demonkin monster other than Demon King.
> 
> 【On Summon】Set your max mana to 3.
> 
> 【While on the Field】Your max mana cannot increase.


### DUNGEON_FLOOR — ダンジョン最下層

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】相手の最大マナが7以上。
> 
> 【発動時】自分の最大マナ-1（この効果では3未満にならない）。ダイス1個を振り、その出目と同じ数の「ミミック」を自分の場に召喚する。

**ko**

> 【발동 조건】상대의 최대 마나 7 이상.
> 
> 【발동시】자신의 최대 마나 -1(이 효과로 3 미만이 되지 않음). 주사위 1개를 굴려 나온 수만큼 미믹을 자신의 필드에 소환한다.

**en**

> 【Play Requirement】The opponent has at least 7 max mana.
> 
> 【On Cast】Your max mana -1, without reducing it below 3. Roll 1 die and summon that many Mimics to your field.


### GEM_RAIN — 宝石の雨

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"gemRain"}`。

**ja**

> 【場にある間】場の全ての「ミミック」系モンスターの攻撃力+3。

**ko**

> 【필드에 놓인 동안】필드 위 모든 '미믹' 계열 몬스터의 공격력 +3.

**en**

> 【While Deployed】All Mimic-family monsters on both fields get ATK +3.


### VOID_FRUIT — 虚無の果実

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"voidFruit"}`。

**ja**

> 【自分ターン開始時】自分のリフトのカード1枚につき、自分の体力を1回復する。

**ko**

> 【자신 턴 시작시】자신의 리프트의 카드 1장당 자신의 체력을 1 회복한다.

**en**

> 【Your Turn Start】Restore 1 of your HP for each card in your Rift.


### VOID_APOSTLE — 虚無空間の使徒

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"voidApostle","turnFx":"voidRoll"}`。

**ja**

> 【召喚時】自分に13ダメージを与える。自分のリフトのカード1枚につき、このモンスターの攻撃力+1・体力+1（持続）。
> 
> 【自分ターン開始時】ダイス1個を振り、1なら自分に10ダメージを与え、このモンスターを破壊する。

**ko**

> 【소환시】자신에게 13 데미지를 준다. 자신의 리프트 카드 1장당 이 몬스터 공격력 +1, 체력 +1(지속).
> 
> 【자신 턴 시작시】주사위 1개를 굴려 1이면 자신에게 10 데미지, 이 몬스터 파괴한다.

**en**

> 【On Summon】You take 13 damage. This monster gets +1 ATK and +1 HP per card in your Rift (lasting).
> 
> 【Your Turn Start】Roll 1 die; on 1, deal 10 damage to yourself and destroy this monster.


### CASINO — カジノ

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"casino"}`。

**ja**

> 【ダイスを振った時】どちらかがダイス1個を振るたび、このモンスターにカウンター1個を置く（カジノダイスは除く）。
> 
> 【カジノダイス】12個ごとに12個を消費してカジノダイス1個を振る — 1-2: 自分に30ダメージを与える / 3-4: 相手に30ダメージを与える / 5: 相手に40ダメージを与える / 6: 相手の最大マナを3にする。

**ko**

> 【주사위를 굴릴 때】누구든 주사위 1개를 굴릴 때마다 이 몬스터에 카운터 1개를 놓는다(카지노 주사위 제외).
> 
> 【카지노 주사위】12개마다 12개를 소비해 카지노 주사위 1개를 굴린다 — 1-2: 자신에게 30 데미지를 준다 / 3-4: 상대에게 30 데미지를 준다 / 5: 상대에게 40 데미지를 준다 / 6: 상대의 최대 마나를 3으로 만든다.

**en**

> 【When Dice Are Rolled】Whenever either player rolls 1 die, put 1 counter on this monster, except for Casino dice.
> 
> 【Casino Die】For every 12 counters, spend 12 to roll 1 Casino die — 1-2: You take 30 damage / 3-4: Deal 30 damage to the opponent / 5: Deal 40 damage to the opponent / 6: Set the opponent's max mana to 3.


### REFRESH_HAND — リフレッシュ

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】カードを1枚引く。その後、自分の手札からカードを2枚まで選び、自分のリフトへ送る。

**ko**

> 【발동시】카드를 1장 뽑는다. 그 후 자신의 패에서 카드를 최대 2장 선택해 자신의 리프트로 보낸다.

**en**

> 【On Cast】Draw 1 card. Then choose up to 2 cards in your hand and send them to your Rift.


### FOCUS — 選択と集中

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分のデッキ・墓地からカードを合計3枚まで選び、自分のリフトへ送る。

**ko**

> 【발동시】자신의 덱·묘지에서 카드를 합계 최대 3장 선택해 자신의 리프트로 보낸다.

**en**

> 【On Cast】Choose up to 3 cards total from your deck and graveyard and send them to your Rift.


### GUILD_HQ — アサシンギルド本部

確認済み：表記改定（ja / ko / en）。実装キー：`{"turnFx":"nightMarket","aura":"assassinHQ"}`。

**ja**

> 【相手への攻撃命中時】自分の「アサシン」系モンスターか「アサシンギルド支部」の攻撃で相手プレイヤーにダメージを与えるたび、相手に烙印カウンター1個を付与する。
> 
> 【自分ターン開始時】ナイトマーケットから「アサシン」系カード1枚を選び、マナを払って購入できる。

**ko**

> 【공격으로 상대에게 데미지】자신 암살자 계열 몬스터 또는 암살자 길드 지부의 공격으로 상대 플레이어에게 데미지를 줄 때마다 상대에게 낙인 카운터 1개 부여한다.
> 
> 【자신 턴 시작시】나이트 마켓에서 암살자 계열 카드 1장을 선택해 마나를 지불하고 구매할 수 있다.

**en**

> 【Attack Hits the Opponent】Whenever an allied Assassin-family monster or Assassin Guild Branch damages the opponent with an attack, give the opponent 1 Brand counter.
> 
> 【Your Turn Start】You may choose 1 Assassin-family card from the Night Market and pay mana to buy it.


### WORLD_TREE — 世界樹

確認済み：表記改定（ja / ko / en）。実装キー：`{"turnFx":"worldTree","summonReq":"dew8"}`。

**ja**

> 【召喚条件】自分の雫が8以上。
> 
> 【場にいる間】自分の雫によるターン開始時の回復量を2倍にする。
> 
> 【味方の攻撃時】自分のモンスターが攻撃する時、雫1を消費してそのモンスターの攻撃力+6（持続）にしてよい。
> 
> 【味方が攻撃される時】自分のモンスターが攻撃される時、雫1を消費してそのモンスターの体力+6（持続）にしてよい。
> 
> 【自分ターン開始時】自分は雫3を得る。

**ko**

> 【소환 조건】자신의 이슬이 8 이상이다.
> 
> 【필드에 있는 동안】자신의 이슬에 의한 턴 시작 회복량을 2배로 만든다.
> 
> 【아군 공격시】자신의 몬스터가 공격할 때, 이슬 1을 소비해 그 몬스터의 공격력 +6(지속)을 적용할 수 있다.
> 
> 【아군이 공격받을 때】자신의 몬스터가 공격받을 때, 이슬 1을 소비해 그 몬스터의 체력 +6(지속)을 적용할 수 있다.
> 
> 【자신 턴 시작시】자신은 이슬 3을 얻는다.

**en**

> 【Summon Requirement】You have at least 8 Dew.
> 
> 【While on the Field】Double your turn-start healing from Dew.
> 
> 【When an Ally Attacks】When your monster attacks, you may spend 1 Dew to give it +6 ATK (lasting).
> 
> 【When an Ally Is Attacked】When your monster is attacked, you may spend 1 Dew to give it +6 HP (lasting).
> 
> 【Your Turn Start】Gain 3 Dew.


### CURSE — 呪い

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分に1ダメージを与える。

**ko**

> 【발동시】자신에게 1 데미지를 준다.

**en**

> 【On Cast】You take 1 damage.


### ORIGIN_RITE — 始原の術式

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"originRite"}`。

**ja**

> 【自分が召喚した時】自分が「始原の守護者」以外の「始原」モンスターを召喚するたび、相手の場の、オーラを持たないモンスターと永続魔法からランダムに1枚を破壊する。対象がなければ代わりに相手に烙印カウンター1個を付与する。
> 
> 【破壊時】この魔法を自分のリフトへ送る。

**ko**

> 【자신이 소환할 때】자신이 시초의 수호자 이외 시초 몬스터를 소환할 때마다 상대의 필드의 아우라가 없는 몬스터와 영구마법 중 무작위 1장을 파괴한다. 대상이 없으면 대신 상대에게 낙인 카운터 1개 부여한다.
> 
> 【파괴시】이 마법을 자신의 리프트로 보낸다.

**en**

> 【When You Summon】Whenever you summon an Origin monster other than Origin Guardian, destroy 1 random card among enemy monsters without Aura and enemy persistent spells. If none exist, give the opponent 1 Brand counter instead.
> 
> 【On Destruction】Send this spell to your Rift.


### DRAGON_RIDER — ドラゴンライダー

確認済み：表記改定（ja / ko / en）。実装キー：`{"attackFx":"halfSecond"}`。

**ja**

> 【場にいる間】2回目の攻撃は攻撃力半分(切り下げ)。

**ko**

> 【필드에 있는 동안】2회째 공격은 공격력 절반(내림).

**en**

> 【While on the Field】The 2nd attack has half ATK (rounded down).


### ANTIQUE_DK — アンティークドラゴンナイト

確認済み：既存の明確な表記を維持。実装キー：`{}`。

**ja**

> —

**ko**

> —

**en**

> —


### CASTLE — 城

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"castleInit","aura":"castle"}`。

**ja**

> 【召喚時】このモンスターにカウンター2個を置く。
> 
> 【攻撃を受ける時】このモンスターが攻撃を受ける時、このモンスターのカウンター1個を消費してその攻撃を無効にする。
> 
> 【場にいる間】自分は購入コスト5以上のモンスターを召喚できない。
> 
> 【自分が召喚した時】自分が「兵士」「騎士」を召喚するたび、このモンスターにカウンター1個を置く。

**ko**

> 【소환시】이 몬스터에 카운터 2개를 놓는다.
> 
> 【공격받을 때】이 몬스터가 공격받을 때 이 몬스터의 카운터 1개를 소비해 그 공격을 무효화한다.
> 
> 【필드에 있는 동안】자신은 구매 코스트 5 이상 몬스터를 소환할 수 없다.
> 
> 【자신이 소환할 때】자신이 병사·기사를 소환할 때마다 이 몬스터에 카운터 1개를 놓는다.

**en**

> 【On Summon】Put 2 counters on this monster.
> 
> 【When Attacked】When this monster is attacked, spend 1 counter from this monster to negate the attack.
> 
> 【While on the Field】You cannot summon monsters of purchase cost 5 or more.
> 
> 【When You Summon】Whenever you summon a Soldier or Knight, put 1 counter on this monster.


### ACID_RAIN — 酸性雨

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"acidRain"}`。

**ja**

> 【相手の腐敗破壊時】相手モンスターが腐敗で破壊されるたび相手に烙印カウンター1個を付与する。

**ko**

> 【상대 부패 파괴시】상대 몬스터가 부패로 파괴될 때마다 상대에게 낙인 카운터 1개를 부여한다.

**en**

> 【Enemy Destroyed by Decay】Whenever an enemy monster dies to Decay, the opponent gains 1 Brand counter.


### BUDGET — 運営予算

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】ダイス1個を振り2以上なら兵士(2/2)1体を自分の場に召喚する。

**ko**

> 【발동시】주사위 1개를 굴려 2 이상이면 병사(2/2) 1체를 자신의 필드에 소환한다.

**en**

> 【On Cast】Roll 1 die: on 2 or more, summon a Soldier (2/2) to your field.


### EXPANSION — 増設

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】自分の場に「城」がある。
> 
> 【発動時】自分の「城」にカウンター5個を置く。

**ko**

> 【발동 조건】자신의 필드에 성이 있다.
> 
> 【발동시】자신 성에 카운터 5개를 놓는다.

**en**

> 【Play Requirement】You control a Castle.
> 
> 【On Cast】Put 5 counters on your Castle.


### LAND_GRANT — 領土付与

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】自分の場に「城」がある。
> 
> 【発動時】カード一覧から購入コスト3以下の「貴族」モンスター1体を選び、新たに自分の場に召喚してよい。

**ko**

> 【발동 조건】자신의 필드에 성이 있다.
> 
> 【발동시】카드 목록에서 구매 코스트 3 이하 귀족 몬스터 1체를 선택해 새로 자신의 필드에 소환할 수 있다.

**en**

> 【Play Requirement】You control a Castle.
> 
> 【On Cast】You may choose 1 Aristocrat monster with purchase cost 3 or less from the catalog and summon a new copy to your field.


### TREASON — 反逆罪

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】相手の場に「城」がある。
> 
> 【発動時】相手の場の全モンスターと全永続魔法を破壊する（クエストは除く）。相手に烙印カウンター3個を付与する。

**ko**

> 【발동 조건】상대의 필드에 성이 있다.
> 
> 【발동시】상대의 필드의 모든 몬스터와 영구마법을 파괴한다(퀘스트 제외). 상대에게 낙인 카운터 3개 부여한다.

**en**

> 【Play Requirement】The opponent controls a Castle.
> 
> 【On Cast】Destroy all enemy monsters and persistent spells, excluding quests. Give the opponent 3 Brand counters.


### STRONG_ACID — 強酸性雨

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"strongAcid"}`。

**ja**

> 【発動時】相手の場の、卵以外の全モンスターにカウンター2個を付与する（腐敗の処理）。
> 
> 【相手の腐敗破壊時】腐敗で相手モンスターが破壊されるたび、相手に7ダメージを与え、相手に烙印カウンター1個を付与する。

**ko**

> 【발동시】상대의 필드의 알 이외 모든 몬스터에 카운터 2개 부여한다(부패 처리).
> 
> 【상대 부패 파괴시】부패로 상대 몬스터가 파괴될 때마다 상대에게 7 데미지, 상대에게 낙인 카운터 1개 부여한다.

**en**

> 【On Cast】Put 2 counters on each non-Egg enemy monster, applying Decay rules.
> 
> 【Enemy Destroyed by Decay】Whenever Decay destroys an enemy monster, deal 7 damage to the opponent and give them 1 Brand counter.


### ROTTEN_GROUND — 腐敗した土地

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"rottenGround"}`。

**ja**

> 【どちらかが召喚した時】どちらかが卵以外のモンスターを召喚するたび、そのモンスターにカウンター2個を付与する（腐敗の処理）。

**ko**

> 【누구든 소환할 때】누구든 알 이외 몬스터를 소환할 때마다 그 몬스터에 카운터 2개 부여한다(부패 처리).

**en**

> 【When Either Player Summons】Whenever either player summons a non-Egg monster, put 2 counters on it, applying Decay rules.


### UNBRAND — 徐印

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】相手と自分の烙印カウンターを全て取り除く。

**ko**

> 【발동시】상대와 자신의 낙인 카운터를 모두 제거한다.

**en**

> 【On Cast】Remove all Brand counters from both players.


### DEMON_REALM — 魔界

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"demonRealm"}`。

**ja**

> 【発動時】自分の場の全ての「魔族」モンスターの効果・キーワード能力を無効にする。
> 
> 【自分が召喚した時】以後、自分が召喚する「魔族」モンスターにも同じ処理を行う。この無効化はこの魔法が場を離れても、そのモンスターが場にいる間続く。

**ko**

> 【발동시】자신의 필드의 모든 마족 몬스터의 효과·키워드 능력을 무효화한다.
> 
> 【자신이 소환할 때】이후 자신이 소환하는 마족 몬스터에도 같은 처리한다. 이 무효화는 이 마법이 필드를 떠나도 해당 몬스터가 필드에 있는 동안 지속.

**en**

> 【On Cast】Negate all effects and keywords of your Demonkin monsters.
> 
> 【When You Summon】Also negate those of Demonkin monsters you summon later. Negation lasts while each affected monster remains on the field, even if this spell leaves.


### AEM — アンティークエンハンスマジック

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動条件】自分のデッキ構成に「ゴーレム」系モンスターが2種類以上あり、自分の場にもいる。
> 
> 【発動時】自分の場の「ゴーレム」系モンスターを2体選び、各攻撃力+7（持続、1体しかいなければその1体）。

**ko**

> 【발동 조건】자신의 덱 구성에 골렘 계열 몬스터가 2종류 이상이고 자신의 필드에도 있다.
> 
> 【발동시】자신의 필드의 골렘 계열 몬스터 2체를 선택해 각각 공격력 +7(지속, 1체뿐이면 그 1체).

**en**

> 【Play Requirement】Your deck composition has at least 2 distinct Golem-family monster names and you control a Golem.
> 
> 【On Cast】Choose 2 Golem-family monsters on your field; each gets +7 ATK (lasting); if only 1 exists, affect that 1.


### KNIGHT_TEACH — ゴーレムキングの教え

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】現在自分の場にいる各モンスターに、次のいずれかを適用する。
> 気合を持たない：気合と気合用カウンター1個を付与する（持続）。
> 既に気合を持つ：気合用カウンターを3個追加する。

**ko**

> 【발동시】현재 자신의 필드에 있는 각 몬스터에 다음 중 해당하는 효과를 적용한다.
> 기합이 없다: 기합과 기합용 카운터 1개를 부여한다(지속).
> 이미 기합이 있다: 기합용 카운터 3개를 추가한다.

**en**

> 【On Cast】Apply the matching effect to each monster currently on your field.
> Without Guts: give it Guts and 1 counter for Guts (lasting).
> Already has Guts: add 3 counters for Guts.


### DUNGEON — 生きているダンジョン

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"dungeon"}`。

**ja**

> 【場にいる間】両方の場の「気合」「回避」をどちらも持たないモンスターが攻撃する時、その攻撃の攻撃力を最大1にする。

**ko**

> 【필드에 있는 동안】양쪽 필드의 기합·회피가 모두 없는 몬스터가 공격할 때 그 공격의 공격력을 최대 1로 만든다.

**en**

> 【While on the Field】When a monster on either field without Guts or Evade attacks, cap its ATK for that attack at 1.


### NL_SECRET — ナイトロードの秘技

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【発動時】自分の場のモンスター1体を選び、「暗襲」か「回避」のどちらかを選んで付与する（持続）。自分の場の「アサシン」系モンスターを2体選び、各攻撃力+3（持続、1体しかいなければその1体）。

**ko**

> 【발동시】자신의 필드의 몬스터 1체를 선택해 암습 또는 회피 중 하나를 골라 부여한다(지속). 자신의 필드의 암살자 계열 몬스터 2체를 선택해 각각 공격력 +3(지속, 1체뿐이면 그 1체).

**en**

> 【On Cast】Choose 1 monster on your field and give it your choice of Infiltrate or Evade (lasting). Choose 2 Assassin-family monsters on your field; each gets +3 ATK (lasting); if only 1 exists, affect that 1.


### HEXER1 — 初級呪術師

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"hexSummon"}`。

**ja**

> 【召喚時】自分のデッキ構成に魔法が8枚以上あれば、ダイス1個を振る。5以上なら、新しい「呪い」3枚を相手の墓地に追加する。

**ko**

> 【소환시】자신의 덱 구성에 마법이 8장 이상이면 주사위 1개를 굴린다. 5 이상이면 새로운 저주 3장을 상대의 묘지에 추가한다.

**en**

> 【On Summon】If your deck composition contains at least 8 spells, roll 1 die. On 5 or more, create 3 new Curses in the opponent's graveyard.


### HEXER2 — 中級呪術師

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"hexSummon"}`。

**ja**

> 【召喚時】自分のデッキ構成に魔法が10枚以上あれば、ダイス1個を振る。4以上なら、新しい「呪い」4枚を相手の墓地に追加する。

**ko**

> 【소환시】자신의 덱 구성에 마법이 10장 이상이면 주사위 1개를 굴린다. 4 이상이면 새로운 저주 4장을 상대의 묘지에 추가한다.

**en**

> 【On Summon】If your deck composition contains at least 10 spells, roll 1 die. On 4 or more, create 4 new Curses in the opponent's graveyard.


### HEXER3 — 上級呪術師

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"hexSummon","aura":"hexCurseOnSpell"}`。

**ja**

> 【召喚時】自分のデッキ構成に魔法が13枚以上あれば、ダイス1個を振る。3以上なら、新しい「呪い」5枚を相手の墓地に追加する。
> 
> 【相手の魔法使用時】相手が魔法をプレイするたび、新しい「呪い」1枚を相手の墓地に追加する。

**ko**

> 【소환시】자신의 덱 구성에 마법이 13장 이상이면 주사위 1개를 굴린다. 3 이상이면 새로운 저주 5장을 상대의 묘지에 추가한다.
> 
> 【상대 마법 사용시】상대가 마법을 사용할 때마다 새로운 저주 1장을 상대의 묘지에 추가한다.

**en**

> 【On Summon】If your deck composition contains at least 13 spells, roll 1 die. On 3 or more, create 5 new Curses in the opponent's graveyard.
> 
> 【Opponent Plays a Spell】Whenever the opponent plays a spell, create 1 new Curse in their graveyard.


### HEXER4 — 特級呪術師 - ケロイド

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"hexBoss","summonReq":"hexBoss"}`。

**ja**

> 【召喚条件】自分のデッキ構成に魔法が15枚以上あり、全体の半分以上を占める。
> 
> 【相手の魔法使用時】相手が魔法を使用するたびダイス1個を振り、3以上ならその魔法を無効にする。
> 
> 【場にいる間】自分の場の全ての「呪術師」系モンスターの攻撃力+5。

**ko**

> 【소환 조건】자신의 덱 구성에 마법이 15장 이상이며 전체의 절반 이상이다.
> 
> 【상대 마법 사용시】상대가 마법을 사용할 때마다 주사위 1개를 굴려 3 이상이면 그 마법 무효.
> 
> 【필드에 있는 동안】자신의 필드의 모든 주술사 계열 몬스터 공격력 +5.

**en**

> 【Summon Requirement】Your deck composition contains at least 15 spells and at least half its cards are spells.
> 
> 【Opponent Plays a Spell】Whenever the opponent plays a spell, roll 1 die; on 3 or more, negate that spell.
> 
> 【While on the Field】All Hexer-family monsters on your field get +5 ATK.


### SORTER — 選別者

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"sorterSummon","aura":"sorter"}`。

**ja**

> 【召喚時】自分の「カル」3枚を自動でリフトへ送る（墓地、デッキ、手札の順）。
> 
> 【自分のリフト追加時】自分のリフトに「カル」が追加されるたび、自分の「カル」1枚を同じ順で追加で送る（この追加分では再発動しない）。

**ko**

> 【소환시】자신의 컬 3장을 자동으로 리프트로 보낸다(묘지, 덱, 패 순서).
> 
> 【자신의 리프트에 추가시】자신의 리프트에 컬이 추가될 때마다 자신의 컬 1장을 같은 순서로 추가로 보낸다(이 추가분으로 재발동하지 않음).

**en**

> 【On Summon】Automatically send 3 of your Culls to your Rift, taking from graveyard, deck, then hand.
> 
> 【Card Added to Your Rift】Whenever a Cull is added to your Rift, send 1 additional Cull in the same order; this extra Cull does not trigger this effect again.


### COLOSSEUM_REST — コロシアムの休憩場

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"colosseumRest"}`。

**ja**

> 【自分ターン開始時】自分のリフトの「カル」1枚につき、自分の体力を1回復する。

**ko**

> 【자신 턴 시작시】자신의 리프트의 컬 1장당 자신의 체력을 1 회복한다.

**en**

> 【Your Turn Start】Restore 1 of your HP for each Cull in your Rift.


### COLOSSEUM — コロシアム

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"colosseum"}`。

**ja**

> 【自分ターン開始時】自分のリフトに「カル」が8枚以上あれば、「選ばれし」モンスターの一覧から1体を選び、新たに自分の場に召喚してよい。

**ko**

> 【자신 턴 시작시】자신의 리프트에 컬이 8장 이상이면 선택받은 몬스터 목록에서 1체를 선택해 새로 자신의 필드에 소환할 수 있다.

**en**

> 【Your Turn Start】If your Rift contains at least 8 Culls, you may choose 1 monster from the Chosen catalog and summon a new copy to your field.


### UNBRANDER — 除印師

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"unbrand"}`。

**ja**

> 【召喚時】自分に烙印カウンターがあれば自分の烙印カウンターを1個取り除く。

**ko**

> 【소환시】자신에게 낙인 카운터가 있으면 자신의 낙인 카운터 1개를 제거한다.

**en**

> 【On Summon】If you have a Brand counter, remove 1 of your Brand counters.


### LAWLESS — 不法地帯

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"lawless"}`。

**ja**

> 【発動時】両方の場の、卵以外の全モンスターの最大体力を1にし、蓄積ダメージを取り除く（持続）。
> 
> 【どちらかが召喚した時】後から召喚される卵以外のモンスターにも同じ処理を行う。

**ko**

> 【발동시】양쪽 필드의 알 이외 모든 몬스터의 최대 체력을 1로 만들고 누적 데미지를 제거한다(지속).
> 
> 【누구든 소환할 때】이후 소환되는 알 이외 몬스터에도 같은 처리한다.

**en**

> 【On Cast】Set every non-Egg monster's max HP to 1 and remove its accumulated damage (lasting).
> 
> 【When Either Player Summons】Apply the same change to non-Egg monsters summoned later.


### RIFT — 次元の裂け目

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"rift"}`。

**ja**

> 【自分のリフト追加時】自分のリフトにカードが1枚追加されるたび、自分の体力を5回復する。

**ko**

> 【자신의 리프트에 추가시】자신의 리프트에 카드가 1장 추가될 때마다 자신의 체력을 5 회복한다.

**en**

> 【Card Added to Your Rift】Whenever 1 card is added to your Rift, restore 5 of your HP.


### FREE_REWARD — 無償の対価

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"freeReward"}`。

**ja**

> 【カード使用時】自分が購入コスト0のカードをプレイするたび、カードを1枚引く。

**ko**

> 【카드 사용시】자신이 구매 코스트 0 카드를 사용할 때마다 카드를 1장 뽑는다.

**en**

> 【When a Card Is Played】Whenever you play a card with purchase cost 0, draw 1 card.


### NO_PAIN — ノーペインノーゲイン

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"painGain"}`。

**ja**

> 【自分がダメージを受けた時】自分がダメージを受けるたび、ダイス1個を振る。6なら、自分の最大マナ+1。

**ko**

> 【자신이 데미지를 받을 때】자신이 데미지를 받을 때마다 주사위 1개를 굴린다. 6이면 자신의 최대 마나 +1.

**en**

> 【When You Take Damage】Whenever you take damage, roll 1 die. On 6, increase your max mana by 1.


### ORIGIN_QUEST — 起源の探究

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"originQuest"}`。

**ja**

> 【発動時】両方の場の購入コスト0のモンスター・永続魔法1枚につき、カードを1枚引く。

**ko**

> 【발동시】양쪽 필드의 구매 코스트 0 몬스터·영구마법 1장당 카드를 1장 뽑는다.

**en**

> 【On Cast】Draw 1 card for each monster or persistent spell of purchase cost 0 on either field.


### BEGINNER_MIND — 初心

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"beginnerMind"}`。

**ja**

> 【発動条件】この魔法以外の自分の手札が0枚。
> 
> 【発動時】カードを4枚引く。

**ko**

> 【발동 조건】이 마법 외 자신의 패가 0장.
> 
> 【발동시】카드를 4장 뽑는다.

**en**

> 【Play Requirement】You have no other cards in hand.
> 
> 【On Cast】Draw 4 cards.


### VOID_RITE — 次元術式

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"voidAll"}`。

**ja**

> 【発動時】両方の場の、卵以外の全モンスターに「虚無」を付与する（持続）。

**ko**

> 【발동시】양쪽 필드의 알 이외 모든 몬스터에 공허 부여한다(지속).

**en**

> 【On Cast】Give Void to all non-Egg monsters on both fields (lasting).


### SPACE_RITE — 空間術式

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"spaceLock"}`。

**ja**

> 【発動条件】相手の場のモンスター・永続魔法が合計6枚以上。
> 
> 【場にある間】相手はモンスターを召喚できず、魔法を使用できない。
> 
> 【期間】自分のターン開始を3回迎えると終了する。

**ko**

> 【발동 조건】상대의 필드의 몬스터·영구마법이 합계 6장 이상.
> 
> 【필드에 놓인 동안】상대는 몬스터를 소환하거나 마법을 사용할 수 없다.
> 
> 【기간】자신의 턴 시작을 3회 맞으면 종료한다.

**en**

> 【Play Requirement】The opponent controls at least 6 monsters and persistent spells combined.
> 
> 【While Deployed】The opponent cannot summon monsters or play spells.
> 
> 【Duration】Expires at the start of your 3rd subsequent turn.


### LUCKY_ECHO — 幸運の残響

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"luckyEcho"}`。

**ja**

> 【ダイスを振った時】自分が振ったダイスの出目が6のたび相手に6ダメージを与える。この効果の処理中、自分のこの効果は再発動しない。

**ko**

> 【주사위를 굴릴 때】자신이 굴린 주사위가 6일 때마다 상대에게 6 데미지를 준다. 이 효과 처리 중 자신의 이 효과는 다시 발동하지 않는다.

**en**

> 【When Dice Are Rolled】Whenever a die you roll shows a 6, deal 6 damage to the opponent. Your copies of this effect cannot trigger again while it is resolving.


### BUYOUT — 買い占め

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"buyout"}`。

**ja**

> 【発動条件】このターン、自分が同名カードを合計2枚以上購入している。
> 
> 【発動時】自分の最大マナ+1。

**ko**

> 【발동 조건】이번 턴 자신이 같은 이름의 카드를 합계 2장 이상 구매했다.
> 
> 【발동시】자신의 최대 마나 +1.

**en**

> 【Play Requirement】You bought at least 2 cards with the same name this turn.
> 
> 【On Cast】Your max mana +1.


### PENANCE — 苦行の対価

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"penance"}`。

**ja**

> 【発動時】自分の烙印カウンター1個につき、自分の最大マナ+2、自分の体力を10回復する（カウンターは消費しない）。

**ko**

> 【발동시】자신의 낙인 카운터 1개당 자신의 최대 마나 +2, 자신의 체력을 10 회복한다(카운터는 소비하지 않음).

**en**

> 【On Cast】For each of your Brand counters, your max mana +2 and restore 10 of your HP; do not spend the counters.


### PACK_INSTINCT — 群れの本能

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"packInstinct"}`。

**ja**

> 【発動条件】自分の場に同名モンスターが2体以上いる。
> 
> 【発動時】自分の場で同名が2体以上いるモンスター全ての攻撃力+2・体力+2（持続）。

**ko**

> 【발동 조건】자신의 필드에 같은 이름의 몬스터가 2체 이상 있다.
> 
> 【발동시】자신의 필드에서 같은 이름이 2체 이상인 모든 몬스터의 공격력 +2, 체력 +2(지속).

**en**

> 【Play Requirement】You control at least 2 monsters with the same name.
> 
> 【On Cast】Every monster on your field that shares its name with another ally gets +2 ATK and +2 HP (lasting).


### MIND_BURST — 精神放出術

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"mindBurst"}`。

**ja**

> 【発動時】自分の場の全モンスターから、気合に使うカウンターを全て取り除く。取り除いた合計数×4ダメージを相手に与える（それ以外のカウンターは取り除かない）。

**ko**

> 【발동시】자신의 필드의 모든 몬스터에서 기합에 쓰이는 카운터를 전부 제거한다. 제거한 합계 수×4 데미지를 상대에게 준다(다른 카운터는 제거하지 않음).

**en**

> 【On Cast】Remove all counters used for Guts from your monsters. Deal damage to the opponent equal to 4 times the total removed; other counters are unaffected.


### RICH_HABIT — 富豪の習慣

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"richHabit"}`。

**ja**

> 【自分ターン開始時】開始時ドロー後、自分の手札が4枚以上なら自分の体力を6回復する。手札が6枚以上なら、さらに自分の最大マナ+1。

**ko**

> 【자신 턴 시작시】턴 시작 드로우 후 자신의 패가 4장 이상이면 자신의 체력을 6 회복한다. 패가 6장 이상이면 추가로 자신의 최대 마나 +1.

**en**

> 【Your Turn Start】After turn-start draws, if you have at least 4 cards in hand, restore 6 of your HP. If you have at least 6, also gain +1 max mana.


### Q_RIFT — リフト研究

確認済み：表記改定（ja / ko / en）。実装キー：`{"quest":{"event":"exile","target":10}}`。

**ja**

> 【クエスト】設置後、自分のリフトにカードが累計10枚追加される。
> 
> 【報酬】新しい「カル」7枚を自分のリフトに追加する。

**ko**

> 【퀘스트】설치 후 자신의 리프트에 카드가 누적 10장 추가된다.
> 
> 【보상】새로운 컬 7장을 자신의 리프트에 추가한다.

**en**

> 【Quest】After deployment, have a total of 10 cards added to your Rift.
> 
> 【Reward】Create 7 new Culls in your Rift.


### Q_BRAND — 反撃の狼煙

確認済み：表記改定（ja / ko / en）。実装キー：`{"quest":{"event":"opponentDamage","target":40}}`。

**ja**

> 【クエスト】設置後、相手から累計40ダメージを受ける。
> 
> 【報酬】相手プレイヤーに烙印カウンターを1個付与する。

**ko**

> 【퀘스트】설치 후 상대에게 누적 40 데미지를 받는다.
> 
> 【보상】상대 플레이어에게 낙인 카운터 1개 부여한다.

**en**

> 【Quest】After deployment, take 40 damage from your opponent.
> 
> 【Reward】Give the opponent 1 Brand counter.


### Q_TORI — 精霊 - トリ

確認済み：表記改定（ja / ko / en）。実装キー：`{"quest":{"event":"emptyTurn","target":5}}`。

**ja**

> 【クエスト】設置後、自分の場にモンスターがいない状態で、自分のターンを5回終了する。
> 
> 【報酬】自分の体力+30。

**ko**

> 【퀘스트】설치 후 자신의 필드에 몬스터가 없는 상태로 자신의 턴 5회 종료한다.
> 
> 【보상】자신의 체력 +30.

**en**

> 【Quest】After deployment, end 5 of your turns with no monsters on your field.
> 
> 【Reward】Restore 30 of your HP.


### Q_WINTER — 精霊 - ウィンター

確認済み：表記改定（ja / ko / en）。実装キー：`{"quest":{"event":"healthGain","target":30}}`。

**ja**

> 【クエスト】設置後、自分の体力を累計30上昇させる。
> 
> 【報酬】自分の最大マナ+2。

**ko**

> 【퀘스트】설치 후 자신의 체력을 누적 30 올린다.
> 
> 【보상】자신의 최대 마나 +2.

**en**

> 【Quest】After deployment, increase your HP by a total of 30.
> 
> 【Reward】Your max mana +2.


### Q_TRIBE — 一族の誓い

確認済み：表記改定（ja / ko / en）。実装キー：`{"quest":{"event":"tribeSummon","target":6}}`。

**ja**

> 【クエスト】設置後、自分が種族モンスターを累計6体召喚する。
> 
> 【報酬】自分の場にいる種族モンスターと同じ種族で、自分の場に同名がいないモンスター1体をカード一覧から選び、新たに自分の場に召喚する。

**ko**

> 【퀘스트】설치 후 자신이 종족 몬스터를 누적 6체 소환한다.
> 
> 【보상】자신의 필드 종족 몬스터와 같은 종족이며 자신의 필드에 동명이 없는 몬스터 1체를 카드 목록에서 선택해 새로 자신의 필드에 소환한다.

**en**

> 【Quest】After deployment, summon a total of 6 tribal monsters.
> 
> 【Reward】Choose 1 monster from the catalog that shares a tribe with a monster you control and has no same-name monster on your field; summon a new copy to your field.


### Q_CASTLE — 対攻城作戦

確認済み：表記改定（ja / ko / en）。実装キー：`{"quest":{"event":"castleTurn","target":9}}`。

**ja**

> 【クエスト】設置後、自分の場の同じ個体の「城」を、双方のターン終了時に連続9回維持する。途中でその城が場を離れたり、別の個体に替わったりした場合は数え直す。
> 
> 【報酬】「騎士」3体を自分の場に召喚する。

**ko**

> 【퀘스트】설치 후 자신의 필드에 같은 개체의 성을 양쪽 턴 종료시 연속 9회 유지한다. 도중에 그 성이 필드를 떠나거나 다른 개체로 바뀌면 다시 센다.
> 
> 【보상】기사 3체를 자신의 필드에 소환한다.

**en**

> 【Quest】After deployment, keep the same Castle on your field for 9 consecutive turn ends, counting both players. Restart the count if that Castle leaves or is replaced by another copy.
> 
> 【Reward】Summon 3 Knights to your field.


### Q_DECAY — どくびし

確認済み：表記改定（ja / ko / en）。実装キー：`{"quest":{"event":"decayKill","target":4}}`。

**ja**

> 【クエスト】設置後、腐敗の効果で相手モンスターを4体破壊する。
> 
> 【報酬】相手プレイヤーに30ダメージを与える。

**ko**

> 【퀘스트】설치 후 부패 효과로 상대 몬스터 4체 파괴한다.
> 
> 【보상】상대 플레이어에게 30 데미지를 준다.

**en**

> 【Quest】After deployment, destroy 4 enemy monsters through Decay.
> 
> 【Reward】Deal 30 damage to the opponent.


### Q_ASSASSIN — アサシンギルドの伝達

確認済み：表記改定（ja / ko / en）。実装キー：`{"quest":{"event":"assassinHit","target":6}}`。

**ja**

> 【クエスト】設置後、自分の「アサシン」系モンスターの攻撃で相手プレイヤーに累計6回ダメージを与える（「アサシンギルド支部」の追加ダメージ発動も1回と数える）。
> 
> 【報酬】相手の場の、オーラを持たないモンスター・永続魔法・クエストから1枚を選び、相手のリフトへ送る。

**ko**

> 【퀘스트】설치 후 자신 암살자 계열 몬스터의 공격으로 상대 플레이어에게 누적 6회 데미지(암살자 길드 지부의 추가 데미지 발동도 1회로 계산).
> 
> 【보상】상대의 필드의 아우라가 없는 몬스터·영구마법·퀘스트 중 1장을 선택해 상대의 리프트로 보낸다.

**en**

> 【Quest】After deployment, deal attack damage to the opponent with your Assassin-family monsters a total of 6 times; each Assassins' Guild Branch bonus-damage trigger also counts as 1.
> 
> 【Reward】Choose 1 enemy monster without Aura, persistent spell, or quest and send it to the opponent's Rift.


### Q_MANA — マナ順応

確認済み：表記改定（ja / ko / en）。実装キー：`{"quest":{"event":"spellPlay","target":25}}`。

**ja**

> 【クエスト】設置後、魔法カードを25回プレイする。
> 
> 【報酬】自分の最大マナ+4。

**ko**

> 【퀘스트】설치 후 마법 카드 25회 사용.
> 
> 【보상】자신의 최대 마나 +4.

**en**

> 【Quest】After deployment, play 25 spell cards.
> 
> 【Reward】Your max mana +4.


### QUICK_MIMIC — ミミックパーティー

確認済み：表記改定（ja / ko / en）。実装キー：`{"quick":true}`。

**ja**

> 【購入時】「ミミック」1体を自分の場に召喚し、新たな「ミミック」2枚を自分のリフトに追加する。

**ko**

> 【구매시】미믹 1체 자신의 필드에 소환, 새로운 미믹 2장 자신의 리프트에 추가한다.

**en**

> 【On Purchase】Summon 1 Mimic on your field and add 2 new Mimics to your Rift.


### QUICK_SURVIVAL — 生存をかけた戦い

確認済み：表記改定（ja / ko / en）。実装キー：`{"quick":true}`。

**ja**

> 【購入条件】自分の体力が15以下。
> 
> 【購入時】「生きているダンジョン」1体を自分の場に召喚する。

**ko**

> 【구매 조건】자신의 체력 15 이하.
> 
> 【구매시】살아있는 던전 1체를 자신의 필드에 소환한다.

**en**

> 【Purchase Requirement】You have 15 HP or less.
> 
> 【On Purchase】Summon 1 Living Dungeon to your field.


### QUICK_POISON — ポイズン

確認済み：表記改定（ja / ko / en）。実装キー：`{"quick":true}`。

**ja**

> 【購入条件】相手の場にオーラを持たないモンスターがいる。
> 
> 【購入時】そのモンスター1体を選び、カウンター2個を付与する（腐敗の処理）。

**ko**

> 【구매 조건】상대의 필드에 아우라가 없는 몬스터가 있다.
> 
> 【구매시】그 몬스터 1체를 선택해 카운터 2개 부여한다(부패 처리).

**en**

> 【Purchase Requirement】The opponent controls a monster without Aura.
> 
> 【On Purchase】Choose 1 such monster and put 2 counters on it, applying Decay rules.


### QUICK_WORLD — 世界樹の恵み

確認済み：表記改定（ja / ko / en）。実装キー：`{"quick":true}`。

**ja**

> 【購入条件】自分の場に「エルフ」系または「世界樹」系のモンスター・永続魔法がある。
> 
> 【購入時】「世界樹の心臓」を自分の場に展開する。

**ko**

> 【구매 조건】자신의 필드에 엘프 또는 세계수 계열 몬스터·영구마법이 있다.
> 
> 【구매시】세계수의 심장을 자신의 필드에 전개한다.

**en**

> 【Purchase Requirement】You control an Elf- or World Tree-family monster or persistent spell.
> 
> 【On Purchase】Deploy Heart of the World Tree to your field.


### QUICK_MUSTER — 緊急召集

確認済み：表記改定（ja / ko / en）。実装キー：`{"quick":true}`。

**ja**

> 【購入条件】自分の場に「城」がある。
> 
> 【購入時】「兵士」3体を自分の場に召喚する。

**ko**

> 【구매 조건】자신의 필드에 성이 있다.
> 
> 【구매시】병사 3체를 자신의 필드에 소환한다.

**en**

> 【Purchase Requirement】You control a Castle.
> 
> 【On Purchase】Summon 3 Soldiers to your field.


### QUICK_SORT — 選別の掟

確認済み：表記改定（ja / ko / en）。実装キー：`{"quick":true}`。

**ja**

> 【購入条件】自分のリフトに「カル」が10枚以上ある。
> 
> 【購入時】相手の場の、オーラを持たないモンスター・永続魔法・クエストから1枚を選んで破壊する。

**ko**

> 【구매 조건】자신의 리프트에 컬 10장 이상.
> 
> 【구매시】상대의 필드의 아우라가 없는 몬스터·영구마법·퀘스트 중 1장을 선택해 파괴한다.

**en**

> 【Purchase Requirement】Your Rift contains at least 10 Culls.
> 
> 【On Purchase】Choose and destroy 1 enemy monster without Aura, persistent spell, or quest.


### QUICK_REBIRTH — 強制輪廻

確認済み：表記改定（ja / ko / en）。実装キー：`{"quick":true}`。

**ja**

> 【購入条件】自分の墓地にモンスターがいる。
> 
> 【購入時】自分の墓地のモンスター1体を選ぶ。購入コスト7以下なら「虚無」を付与して自分の場に召喚する（8以上なら何も起こらない）。

**ko**

> 【구매 조건】자신의 묘지에 몬스터가 있다.
> 
> 【구매시】자신의 묘지의 몬스터 1체를 선택한다. 구매 코스트 7 이하이면 공허를 부여해 자신의 필드에 소환한다(8 이상이면 효과 없음).

**en**

> 【Purchase Requirement】Your graveyard contains a monster.
> 
> 【On Purchase】Choose 1 monster in your graveyard. If its purchase cost is 7 or less, summon it to your field with Void; if 8 or more, nothing happens.


### QUICK_ATTUNE — アチューン・瞬

確認済み：表記改定（ja / ko / en）。実装キー：`{"quick":true}`。

**ja**

> 【購入時】自分の最大マナ+1。自分は体力2を得る。

**ko**

> 【구매시】자신의 최대 마나 +1. 자신은 체력을 2 얻는다.

**en**

> 【On Purchase】Increase your max mana by 1 and gain 2 HP.


### QUICK_GRIMOIRE — 呪術魔法書

確認済み：表記改定（ja / ko / en）。実装キー：`{"quick":true}`。

**ja**

> 【購入時】このターン終了まで、自分が手札から使う魔法の発動コスト-1（最低0）。

**ko**

> 【구매시】이번 턴 종료까지 자신이 패에서 사용하는 마법의 시전 코스트 -1(최저 0).

**en**

> 【On Purchase】Until this turn ends, your spells played from hand cost 1 less to cast, to a minimum of 0.


### QUICK_ASSAULT — 総攻撃

確認済み：表記改定（ja / ko / en）。実装キー：`{"quick":true}`。

**ja**

> 【購入条件】自分の場にモンスターが2体以上いる。
> 
> 【購入時】自分の場の異なる個体2体を選び、このターン終了までそれぞれの攻撃力+2（同名可）。

**ko**

> 【구매 조건】자신의 필드에 몬스터가 2체 이상 있다.
> 
> 【구매시】자신의 필드의 서로 다른 개체 2체를 선택해 이번 턴 종료까지 각각 공격력 +2(동명 가능).

**en**

> 【Purchase Requirement】You control at least 2 monsters.
> 
> 【On Purchase】Choose 2 different monsters on your field, allowing the same name; each gets +2 ATK until this turn ends.


### INTERCEPT — 迎撃準備

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】自分の場に「砲撃兵」1体を召喚する。自分の場に「城」か「兵士」がいれば「大砲兵」1体も召喚する。

**ko**

> 【발동시】포격병 1체 소환한다. 자신의 필드에 성 또는 병사가 있으면 대포병 1체도 소환한다.

**en**

> 【On Cast】Summon 1 Gunner. If you control a Castle or Soldier, also summon 1 Heavy Gunner.


### REINFORCE — 緊急応援

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】「騎士」「兵士」「砲撃兵」を1体ずつ自分の場に召喚する。次の相手ターン終了時に、この効果で召喚したモンスターを破壊する。

**ko**

> 【발동시】기사·병사·포격병을 각각 1체씩 자신의 필드에 소환한다. 다음 상대 턴 종료시 이 효과로 소환한 몬스터를 파괴한다.

**en**

> 【On Cast】Summon 1 Knight, 1 Soldier, and 1 Gunner to your field. Destroy the monsters summoned by this effect at the end of the opponent’s next turn.


### GUNNER — 砲撃兵

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【自分ターン終了時】相手プレイヤーと相手の場のモンスターからランダムに対象を1つ決め、1ダメージを与える。

**ko**

> 【자신 턴 종료시】상대 플레이어와 상대의 필드의 몬스터 중 무작위 대상 1개를 정해 1 데미지를 준다.

**en**

> 【Your Turn End】Randomly select 1 target from the opponent and their monsters, then deal 1 damage to it.


### HEAVY_GUNNER — 大砲兵

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【自分ターン終了時】相手プレイヤーと相手の場のモンスターからランダムに対象を1つ決め、2ダメージを与える。

**ko**

> 【자신 턴 종료시】상대 플레이어와 상대의 필드의 몬스터 중 무작위 대상 1개를 정해 2 데미지를 준다.

**en**

> 【Your Turn End】Randomly select 1 target from the opponent and their monsters, then deal 2 damage to it.


### FARM_KEEPER — 農場管理者

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【自分ターン終了時】自分の場に「醸造」があれば「かかし」2体を召喚する。

**ko**

> 【자신 턴 종료시】자신의 필드에 양조가 있으면 허수아비 2체 소환한다.

**en**

> 【Your Turn End】If you control Brewing, summon 2 Scarecrows.


### MIMIC_HUNTER — ミミックハンター

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【自分ターン終了時】両方の場の「ミミック」を全て破壊する（同名カードのみ）。

**ko**

> 【자신 턴 종료시】양쪽 필드의 미믹을 모두 파괴한다(같은 이름 카드만).

**en**

> 【Your Turn End】Destroy all monsters named Mimic on both fields; other Mimic-family names are unaffected.


### QUICK_HELLFIRE — 獄炎

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","quick":true}`。

**ja**

> 【購入時】相手に烙印カウンターがなければ1個、既にあれば2個を付与する。

**ko**

> 【구매시】상대에게 낙인 카운터가 없으면 1개, 이미 있으면 2개를 부여한다.

**en**

> 【On Purchase】Give the opponent 1 Brand counter if they have none, or 2 if they already have at least 1.


### STABLE — 馬小屋

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動条件】自分の場に「騎士」系モンスターがいる。
> 
> 【発動時】自分の「騎士」系モンスター1体を選んで破壊する。破壊できたら「騎馬兵」1体を自分の場に召喚する。

**ko**

> 【발동 조건】자신의 필드에 기사 계열 몬스터가 있다.
> 
> 【발동시】자신의 기사 계열 몬스터 1체를 선택해 파괴한다. 파괴했다면 기마병 1체를 자신의 필드에 소환한다.

**en**

> 【Play Requirement】You control a Knight-family monster.
> 
> 【On Cast】Choose and destroy 1 Knight-family monster you control. If destroyed, summon 1 Cavalry to your field.


### CAVALRY — 騎馬兵

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【場にいる間】このモンスターが受ける反撃を無効化する。

**ko**

> 【필드에 있는 동안】이 몬스터가 받는 반격을 무효화한다.

**en**

> 【While on the Field】Immune to Counter damage.


### MERCENARY — 傭兵

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【召喚時】「兵士」1体を自分の場に召喚する。どちらかの場に「カジノ」があればダイス3個を振る。

**ko**

> 【소환시】병사 1체를 자신의 필드에 소환한다. 어느 쪽 필드에 카지노가 있으면 주사위 3개를 굴린다.

**en**

> 【On Summon】Summon 1 Soldier to your field. If either player controls a Casino, roll 3 dice.


### MERC_LEADER — 傭兵リーダー

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【召喚時】「兵士」2体を自分の場に召喚する。どちらかの場に「カジノ」があればダイス5個を振る。

**ko**

> 【소환시】병사 2체를 자신의 필드에 소환한다. 어느 쪽 필드에 카지노가 있으면 주사위 5개를 굴린다.

**en**

> 【On Summon】Summon 2 Soldiers to your field. If either player controls a Casino, roll 5 dice.


### MERC_MASTER — 傭兵ギルドマスター

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【召喚時】「兵士」2体を自分の場に召喚する。どちらかの場に「カジノ」があればダイス10個を振る。
> 
> 【自分ターン開始時】「兵士」1体を自分の場に召喚する。どちらかの場に「カジノ」があればダイス10個を振る。

**ko**

> 【소환시】병사 2체를 자신의 필드에 소환한다. 어느 쪽 필드에 카지노가 있으면 주사위 10개를 굴린다.
> 
> 【자신 턴 시작시】병사 1체를 자신의 필드에 소환한다. 어느 쪽 필드에 카지노가 있으면 주사위 10개를 굴린다.

**en**

> 【On Summon】Summon 2 Soldiers to your field. If either player controls a Casino, roll 10 dice.
> 
> 【Your Turn Start】Summon 1 Soldier to your field. If either player controls a Casino, roll 10 dice.


### MERC_ART — 傭兵術

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","ench":"mercArt"}`。

**ja**

> 【場にある間】自分の「傭兵」系モンスターの召喚時・ターン開始時効果を2回行う（重複なし）。自分のデッキ構成に「傭兵」系が2種類以上あれば、自分の場の全ての「傭兵」系モンスターの攻撃力+3・体力+3。

**ko**

> 【필드에 놓인 동안】자신 용병 계열 몬스터의 소환시·턴 시작시 효과를 2회 실행(중첩 불가). 자신의 덱 구성에 용병 계열이 2종류 이상이면 자신의 필드 모든 용병 계열 몬스터 공격력 +3, 체력 +3.

**en**

> 【While Deployed】Resolve your Mercenary-family monsters' summon and turn-start effects 2 times; does not stack. If your deck composition has at least 2 distinct Mercenary names, all your Mercenary-family monsters get +3 ATK and +3 HP.


### Q_CHEAT — イカサマ

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","quest":{"event":"dice","target":20}}`。

**ja**

> 【クエスト】設置後、自分がダイスを累計20個振る。
> 
> 【報酬】相手のデッキからカード1枚を選び、相手のリフトへ送る。

**ko**

> 【퀘스트】설치 후 자신이 주사위를 누적 20개 굴린다.
> 
> 【보상】상대의 덱에서 카드 1장을 선택해 상대의 리프트로 보낸다.

**en**

> 【Quest】After deployment, roll a total of 20 dice.
> 
> 【Reward】Choose 1 card in the opponent’s deck and send it to their Rift.


### Q_TOWN — 城下町

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","quest":{"event":"town","target":3}}`。

**ja**

> 【クエスト】設置後、「兵士」の召喚・「カジノ」の召喚・「ワイン」の使用がそれぞれ1回以上行われる（どちらのプレイヤーでも数える）。
> 
> 【報酬】新しい「支配」1枚を自分の手札に加える。

**ko**

> 【퀘스트】설치 후 병사 소환·카지노 소환·와인 사용이 각각 1회 이상 발생(어느 플레이어든 계산).
> 
> 【보상】새로운 지배 1장을 자신의 패에 추가한다.

**en**

> 【Quest】After deployment, a Soldier is summoned, a Casino is summoned, and Wine is played, at least 1 time each; either player's actions count.
> 
> 【Reward】Create 1 new Dominion in your hand.


### DOMINION — 支配

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】カードを3枚引く。このターン次に自分が手札から使うカード3枚の使用コストを1にする。相手の最大マナ-1、自分の最大マナ+1。

**ko**

> 【발동시】카드를 3장 뽑는다. 이번 턴 다음에 자신이 패에서 사용하는 카드 3장의 사용 코스트를 1로 만든다. 상대의 최대 마나 -1, 자신의 최대 마나 +1.

**en**

> 【On Cast】Draw 3 cards. The next 3 cards you play from hand this turn cost 1 mana each. The opponent's max mana -1 and your max mana +1.


### POISON_MASTER — ポイズンマスター

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【攻撃時】攻撃対象の相手モンスターにカウンター2個を追加で付与する（腐敗の処理）。

**ko**

> 【공격시】공격 대상 상대 몬스터에 카운터 2개 추가 부여한다(부패 처리).

**en**

> 【On Attack】Put 2 additional counters on the enemy monster this monster attacks, applying Decay rules.


### ADVANCE — 快進撃

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】現在、自分の場にいる全モンスターの攻撃力+2（持続）。「兵士」「騎士」「騎馬兵」はさらに+1。

**ko**

> 【발동시】현재 자신의 필드에 있는 모든 몬스터의 공격력 +2(지속). 병사·기사·기마병은 추가 +1.

**en**

> 【On Cast】All monsters currently on your field get +2 ATK (lasting). Soldiers, Knights and Cavalry gain +1 more.


### QUICK_AID — 応急手当て

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","quick":true}`。

**ja**

> 【購入条件】直前の相手ターンに、異なる個体の相手モンスター3体以上から直接攻撃のダメージを受けた（同名可）。
> 
> 【購入時】自分の体力を25回復する。

**ko**

> 【구매 조건】직전 상대 턴에 서로 다른 상대 몬스터 개체 3체 이상에게 직접 공격 데미지를 받았다(동명 가능).
> 
> 【구매시】자신의 체력을 25 회복한다.

**en**

> 【Purchase Requirement】During the last opponent turn, at least 3 different enemy monsters dealt direct-attack damage to you; they may share a name.
> 
> 【On Purchase】Restore 25 of your HP.


### EMPTY_MIND — 無の境地

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【購入条件】自分のデッキ構成に魔法が9枚以上ある。
> 
> 【発動条件】このターン、自分が既に魔法を4枚以上プレイしている。
> 
> 【発動時】新しい「創造」1枚を自分の手札に加える。

**ko**

> 【구매 조건】자신의 덱 구성에 마법 9장 이상.
> 
> 【발동 조건】이번 턴 자신이 이미 마법을 4장 이상 사용했다.
> 
> 【발동시】새로운 창조 1장을 자신의 패에 추가한다.

**en**

> 【Purchase Requirement】Your deck composition contains at least 9 spells.
> 
> 【Play Requirement】You already played at least 4 spells this turn.
> 
> 【On Cast】Create 1 new Creation in your hand.


### CREATION — 創造

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】カードを1枚引き、自分の体力を1回復する。新しい「創造」1枚を自分の墓地に追加する。このカードを含め自分のリフトに「創造」が10枚以上あれば、相手のデッキからカード1枚を選び、その複製を自分の墓地に追加する。
> 
> 【回数制限】同名合計で自分の各ターン3回まで。

**ko**

> 【발동시】카드를 1장 뽑는다. 자신의 체력을 1 회복한다. 새로운 창조 1장을 자신의 묘지에 추가한다. 이 카드를 포함해 자신의 리프트에 창조가 10장 이상이면 상대의 덱에서 카드 1장을 선택해 그 복제를 자신의 묘지에 추가한다.
> 
> 【횟수 제한】같은 이름 합계로 자신의 각 턴 3회까지.

**en**

> 【On Cast】Draw 1 card and restore 1 of your HP. Create 1 new Creation in your graveyard. If your Rift contains at least 10 Creations, including this card, choose 1 card in the opponent's deck and add a copy to your graveyard.
> 
> 【Use Limit】3 plays during each of your turns across all copies of this name.


### ROGUE_ART — 盗賊の心得

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【コスト】自分の場に「アサシン」系モンスターがいれば、このカードの購入・発動コストは0。
> 
> 【発動時】自分の場に「アサシン」系モンスターがいれば、自分の場の全モンスターに回避を付与する（持続）。いなければ、自分の場のモンスター1体を選び、回避を付与する（持続）。

**ko**

> 【코스트】자신의 필드에 암살자 계열 몬스터가 있으면 이 카드의 구매·시전 코스트는 0.
> 
> 【발동시】자신의 필드에 암살자 계열 몬스터가 있으면 자신의 필드의 모든 몬스터에 회피를 부여한다(지속). 없으면 자신의 필드의 몬스터 1체를 선택해 회피를 부여한다(지속).

**en**

> 【Cost】If you control an Assassin-family monster, this card costs 0 to buy and cast.
> 
> 【On Cast】If you control an Assassin-family monster, give Evade to all monsters on your field (lasting). Otherwise, choose 1 monster on your field and give it Evade (lasting).


### MIMIC_HIDEOUT — ミミックの隠れ家

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","ench":"mimicHideout"}`。

**ja**

> 【自分ターン終了時】自分の場に「ミミック」系モンスターがいれば、「マスターミミック」1体を自分の場に召喚する。

**ko**

> 【자신 턴 종료시】자신의 필드에 미믹 계열 몬스터가 있으면 마스터 미믹 1체를 자신의 필드에 소환한다.

**en**

> 【Your Turn End】If you control a Mimic-family monster, summon 1 Master Mimic to your field.


### BLACK_REVERSE — 黒魔法：リバース

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","ench":"blackReverse"}`。

**ja**

> 【場にある間】どちらかのプレイヤーへのダメージを、もう一方のプレイヤーに移す（モンスターへのダメージは対象外・重複なし）。
> 
> 【期間】自分のターン開始を6回迎えると終了する。
> 
> 【回数制限】各プレイヤー、同名合計でゲーム中2回まで。

**ko**

> 【필드에 놓인 동안】어느 플레이어가 받을 데미지를 다른 플레이어에게 옮긴다(몬스터 데미지 제외·중첩 불가).
> 
> 【기간】자신의 턴 시작 6회 후 종료한다.
> 
> 【횟수 제한】각 플레이어가 같은 이름 합계로 게임 중 2회까지.

**en**

> 【While Deployed】Redirect damage to either player to the other player; monster damage is unaffected and this does not stack.
> 
> 【Duration】Expires at your 6th subsequent turn start.
> 
> 【Use Limit】Each player may play this name 2 times per game.


### BLACK_INFINITY — 黒魔法：インフィニティ

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","ench":"blackInfinity"}`。

**ja**

> 【発動条件】このターン、両プレイヤーの魔法がプレイヤー・モンスターに与えたダメージが累計5以上。
> 
> 【場にある間】自分プレイヤーへの魔法ダメージを無効にし、防いだダメージ量と同じ枚数の新しい「カル」を自分のリフトに追加する。
> 
> 【期間】自分のターン開始を6回迎えると終了する。

**ko**

> 【발동 조건】이번 턴 양 플레이어의 마법이 플레이어·몬스터에게 준 데미지 합계 5 이상.
> 
> 【필드에 놓인 동안】자신 플레이어에게 오는 마법 데미지를 막고 막은 데미지 수만큼 새로운 컬을 자신의 리프트에 추가한다.
> 
> 【기간】자신의 턴 시작 6회 후 종료한다.

**en**

> 【Play Requirement】Spells from both players have dealt at least 5 total damage to players or monsters this turn.
> 
> 【While Deployed】Prevent spell damage to you and create that many new Culls in your Rift.
> 
> 【Duration】Expires at your 6th subsequent turn start.


### BLACK_NOVA — 黒魔法：ノヴァ

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動条件】自分の場にモンスターがいない。
> 
> 【発動時】自分の体力を1にする。その後、次の相手ターンを1回スキップする。

**ko**

> 【발동 조건】자신의 필드에 몬스터가 없다.
> 
> 【발동시】자신의 체력을 1로 만든다. 그 후 다음 상대 턴을 1회 건너뛴다.

**en**

> 【Play Requirement】You control no monsters.
> 
> 【On Cast】Set your HP to 1. Then skip the opponent’s next turn once.


### BLACK_CURSE — 黒魔法：カース

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【購入条件】自分のデッキ構成に、同名以外の「黒魔法」がある。
> 
> 【発動時】新しい「呪い」5枚を相手の墓地に追加する。

**ko**

> 【구매 조건】자신의 덱 구성에 같은 이름 이외 흑마법이 있다.
> 
> 【발동시】새로운 저주 5장을 상대의 묘지에 추가한다.

**en**

> 【Purchase Requirement】Your deck composition contains a Black Magic spell with a different name.
> 
> 【On Cast】Create 5 new Curses in the opponent's graveyard.


### BLACK_ELSA — 黒魔術師 - エルサ

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【召喚時】新しい「呪い」7枚を相手の墓地に追加する。
> 
> 【黒魔法の使用時】自分が「黒魔法」をプレイするたび、相手に烙印カウンター1個を付与する。

**ko**

> 【소환시】새로운 저주 7장을 상대의 묘지에 추가한다.
> 
> 【흑마법 사용시】자신이 흑마법을 사용할 때마다 상대에게 낙인 카운터 1개 부여한다.

**en**

> 【On Summon】Create 7 new Curses in the opponent's graveyard.
> 
> 【When You Play Black Magic】Whenever you play Black Magic, give the opponent 1 Brand counter.


### BLACK_ALICE — 黒魔術師 - アリス

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【召喚時】新しい「呪い」2枚を相手の墓地に追加する。
> 
> 【黒魔法の使用時】自分が「黒魔法」をプレイするたび、自分の最大マナ+1。

**ko**

> 【소환시】새로운 저주 2장을 상대의 묘지에 추가한다.
> 
> 【흑마법 사용시】자신이 흑마법을 사용할 때마다 자신의 최대 마나 +1.

**en**

> 【On Summon】Create 2 new Curses in the opponent's graveyard.
> 
> 【When You Play Black Magic】Whenever you play Black Magic, your max mana +1.


### QUICK_CURSE — 消えない呪い

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","quick":true}`。

**ja**

> 【購入時】相手のリフトの「呪い」1枚につき、新しい「呪い」1枚を相手の墓地に追加する。

**ko**

> 【구매시】상대의 리프트에 있는 저주 1장당 새로운 저주 1장을 상대의 묘지에 추가한다.

**en**

> 【On Purchase】For each Curse in the opponent’s Rift, create 1 new Curse in their graveyard.


### SOUL_HARVEST — 魂の収穫

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】相手のデッキ構成にある呪い1枚につき相手プレイヤーに4ダメージを与える。

**ko**

> 【발동시】상대의 덱 구성의 저주 1장당 상대 플레이어에게 4 데미지를 준다.

**en**

> 【On Cast】Deal 4 damage to the opponent per Curse in their deck composition.


### ANESTHESIA — 麻酔

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】このターン終了まで、現在自分の場にいる全モンスターが受けるダメージを無効にする（後から召喚するモンスターは対象外）。

**ko**

> 【발동시】이번 턴 종료까지 현재 자신의 필드의 모든 몬스터가 받는 데미지를 무효화한다(이후 소환되는 몬스터 제외).

**en**

> 【On Cast】Until this turn ends, prevent all damage to monsters currently on your field; monsters summoned later are unaffected.


### EARTHQUAKE — 地震

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】両方の場のモンスター全体に4ダメージを与える。

**ko**

> 【발동시】양쪽 필드의 모든 몬스터에게 4 데미지를 준다.

**en**

> 【On Cast】Deal 4 damage to all monsters on both fields.


### MAGMA_RAIN — マグマの雨

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】両方の場のモンスター全体に6ダメージを与える。

**ko**

> 【발동시】양쪽 필드의 모든 몬스터에게 6 데미지를 준다.

**en**

> 【On Cast】Deal 6 damage to all monsters on both fields.


### FIRE_BALL — ファイアーボール

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】自分に2ダメージを与える。どちらかのプレイヤー1人、またはどちらかの場のモンスター1体を選び、6ダメージを与える。

**ko**

> 【발동시】자신에게 2 데미지를 준다. 어느 쪽 플레이어 1명 또는 어느 쪽 필드의 몬스터 1체를 선택해 6 데미지를 준다.

**en**

> 【On Cast】You take 2 damage. Choose either player or 1 monster on either field and deal 6 damage to that target.


### FIRE_ARROW — ファイアーアロー

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】自分に1ダメージを与える。相手プレイヤーと相手の場のモンスターから毎回ランダムに対象を1つ決め、1ダメージを与える処理を3回行う。

**ko**

> 【발동시】자신에게 1 데미지를 준다. 상대 플레이어와 상대의 필드의 몬스터 중 매번 무작위 대상 1개를 정해 1 데미지를 주는 처리를 3회 반복한다.

**en**

> 【On Cast】You take 1 damage. Repeat 3 times: randomly select 1 target from the opponent and their monsters, then deal 1 damage to it.


### FIRE_ZONE — ファイアーゾーン

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動条件】この魔法以外に、除外できる自分の手札がある。
> 
> 【発動時】その手札1枚を選んで自分のリフトへ送る。相手の場の全モンスターと相手プレイヤーにそれぞれ5ダメージ（このターン既に自分がファイアー魔法をプレイしていれば、代わりに9ダメージ）。

**ko**

> 【발동 조건】이 마법 외에 제외할 수 있는 자신의 패가 있다.
> 
> 【발동시】그 패 1장을 선택해 자신의 리프트로 보낸다. 상대의 필드의 모든 몬스터와 상대 플레이어에게 각각 5 데미지를 준다(이번 턴 이미 자신이 파이어 마법을 사용했다면 대신 9 데미지).

**en**

> 【Play Requirement】You have another card in hand that can be exiled.
> 
> 【On Cast】Choose 1 such card and send it to your Rift. Deal 5 damage to each enemy monster and the opponent; deal 9 instead if you already played a Fire spell this turn.


### FIRE_METEOR — ファイアーメテオ

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【コスト】このターン既に他のファイアー魔法をプレイしていれば、発動コストを1にする。
> 
> 【発動時】自分の最大マナを1減らす。その後、相手プレイヤーと相手の場のモンスターから毎回ランダムに対象を1つ決め、2ダメージを与える処理を8回行う。

**ko**

> 【코스트】이번 턴에 이미 다른 파이어 마법을 사용했다면 시전 코스트를 1로 만든다.
> 
> 【발동시】자신의 최대 마나를 1 줄인다. 그 후 상대 플레이어와 상대의 필드의 몬스터 중 매번 무작위로 대상 1개를 정해 2 데미지를 주는 처리를 8회 한다.

**en**

> 【Cost】If you already played another Fire spell this turn, set this spell’s cast cost to 1.
> 
> 【On Cast】Reduce your max mana by 1. Then deal 2 damage to a random target among the opponent and their monsters, 8 times. Choose the random target again each time.


### FIRE_ART — 炎術の極意

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】このターン自分のファイアー魔法の発動コスト-2(最低0)。

**ko**

> 【발동시】이번 턴 자신 파이어 마법 사용 코스트 -2(최소 0).

**en**

> 【On Cast】This turn your Fire spells cost 2 less to play (minimum 0).


### FIRE_MASTER — ファイアーマスター

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【場にいる間】自分の「ファイアー魔法」の発動コスト-2（最低0）。
> 
> 【破壊時】自分のデッキ・墓地から「ファイアー魔法」を合計2枚選び、手札に加える（1枚しかなければその1枚）。

**ko**

> 【필드에 있는 동안】자신 파이어 마법 시전 코스트 -2(최저 0).
> 
> 【파괴시】자신의 덱·묘지에서 파이어 마법 합계 2장을 선택해 패에 추가한다(1장뿐이면 그 1장).

**en**

> 【While on the Field】Your Fire spells cost 2 less to cast, to a minimum of 0.
> 
> 【On Destruction】Choose 2 Fire spells from your deck and graveyard combined and add them to your hand; if only 1 exists, take that 1.


### DOUBLE_UP — ダブルアップ

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","ench":"doubleUp"}`。

**ja**

> 【場にある間】両プレイヤーの魔法によるダメージが2倍(重複なし)。

**ko**

> 【필드에 놓인 동안】양 플레이어의 마법 데미지가 2배(중복 불가).

**en**

> 【While Deployed】Spell damage from either player is doubled (non-stacking).


### ASSASSIN_SQUAD — アサシンスカッド

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"expansion"}`。

**ja**

> 【召喚時】自分の場に他の「アサシン」系モンスターがいれば、「中級アサシン」1体を自分の場に召喚し、自分の場の全モンスターに「回避」を付与する（持続）。
> 
> 【攻撃条件】相手プレイヤーの体力が11以上。

**ko**

> 【소환시】자신의 필드에 다른 암살자 계열 몬스터가 있으면 중급 암살자 1체를 자신의 필드에 소환하고 자신의 필드 모든 몬스터에 회피 부여한다(지속).
> 
> 【공격 조건】상대 플레이어 체력 11 이상.

**en**

> 【On Summon】If you control another Assassin-family monster, summon 1 Adept Assassin to your field and give all your monsters Evade (lasting).
> 
> 【Attack Requirement】The opponent has at least 11 HP.


### DISCOVERY_SMALL — 小さな発見

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】カードを2枚引く。
> 
> 【回数制限】同名合計で自分の各ターン1回まで。

**ko**

> 【발동시】카드를 2장 뽑는다.
> 
> 【횟수 제한】같은 이름 합계로 자신의 각 턴 1회까지.

**en**

> 【On Cast】Draw 2 cards.
> 
> 【Use Limit】1 play during each of your turns across all copies of this name.


### DISCOVERY — 発見

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】カードを3枚引く。この効果より前に、このターン自分が通常の開始時ドロー以外でカードを引いていれば、さらにカードを1枚引く。
> 
> 【回数制限】同名合計で自分の各ターン1回まで。

**ko**

> 【발동시】카드를 3장 뽑는다. 이 효과 전에 이번 턴 자신이 통상 턴 시작 드로우 이외로 카드를 뽑았다면 추가로 카드를 1장 뽑는다.
> 
> 【횟수 제한】같은 이름 합계로 자신의 각 턴 1회까지.

**en**

> 【On Cast】Draw 3 cards. If you drew a card earlier this turn outside the normal turn-start draw, draw 1 more.
> 
> 【Use Limit】1 play during each of your turns across all copies of this name.


### DISCOVERY_LARGE — 大きな発見

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion"}`。

**ja**

> 【発動時】カードを4枚引く。この効果より前に、このターン自分が通常の開始時ドロー以外でカードを引いていれば、さらにカードを2枚引く。
> 
> 【回数制限】同名合計で自分の各ターン1回まで。

**ko**

> 【발동시】카드를 4장 뽑는다. 이 효과 전에 이번 턴 자신이 통상 턴 시작 드로우 이외로 카드를 뽑았다면 추가로 카드를 2장 뽑는다.
> 
> 【횟수 제한】같은 이름 합계로 자신의 각 턴 1회까지.

**en**

> 【On Cast】Draw 4 cards. If you drew a card earlier this turn outside the normal turn-start draw, draw 2 more.
> 
> 【Use Limit】1 play during each of your turns across all copies of this name.


### PREPARATION — 仕込み

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","ench":"bonusDraw"}`。

**ja**

> 【自分ターン開始時】追加でカードを1枚引く（合計7回の後、この魔法を墓地へ送る）。

**ko**

> 【자신 턴 시작시】카드를 1장 추가로 뽑는다(합계 7회 후 이 마법을 묘지로 보낸다).

**en**

> 【Your Turn Start】Draw 1 extra card; after 7 total draws this way, send this spell to your graveyard.


### EROSION — 摩耗

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","ench":"erosion"}`。

**ja**

> 【追加ドロー時】自分のターン中、通常の開始時ドロー以外でカードを1枚引くたび、相手に1ダメージを与える。

**ko**

> 【추가 드로우시】자신 턴에 통상 턴 시작 드로우 이외로 카드 1장을 뽑을 때마다 상대에게 1 데미지를 준다.

**en**

> 【When You Draw Extra Cards】During your turn, whenever you draw 1 card outside the normal turn-start draw, deal 1 damage to the opponent.


### GROWTH — 成長

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"expansion","ench":"growth"}`。

**ja**

> 【追加ドロー時】自分のターン中、通常の開始時ドロー以外でカードを1枚引くたび、自分の体力を1回復する。

**ko**

> 【추가 드로우시】자신 턴에 통상 턴 시작 드로우 이외로 카드 1장을 뽑을 때마다 자신의 체력을 1 회복한다.

**en**

> 【When You Draw Extra Cards】During your turn, whenever you draw 1 card outside the normal turn-start draw, restore 1 of your HP.


### APPRENTICE_ARMORER — 見習い装備職人

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"armorer"}`。

**ja**

> 【召喚時】「自分がシールド4を得る」か「自分の場の他のモンスター1体を選び、攻撃力+1・体力+1（持続）」を選ぶ。

**ko**

> 【소환시】자신의 실드 4 획득 또는 자신의 필드의 다른 몬스터 1체를 선택해 공격력 +1, 체력 +1(지속) 중 하나 선택한다.

**en**

> 【On Summon】Choose one: gain 4 Shield; or choose 1 other monster on your field and give it +1 ATK and +1 HP (lasting).


### VETERAN_ARMORER — 熟練した装備職人

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"armorer"}`。

**ja**

> 【召喚時】「自分がシールド10を得る」か「自分の場の他のモンスター1体を選び、攻撃力+2・体力+2（持続）」を選ぶ。自分の場に「城」があれば両方行う。強化対象が「兵士」「騎士」「砲撃兵」「傭兵」系なら、+2の代わりに攻撃力+3・体力+3。

**ko**

> 【소환시】자신의 실드 10 획득 또는 자신의 필드의 다른 몬스터 1체를 선택해 공격력 +2, 체력 +2(지속) 중 하나 선택한다. 자신의 필드에 성이 있으면 둘 다 처리한다. 강화 대상이 병사·기사·포격병·용병 계열이면 +2 대신 공격력 +3, 체력 +3.

**en**

> 【On Summon】Choose one: gain 10 Shield; or choose 1 other monster on your field and give it +2 ATK and +2 HP (lasting). If you control Castle, do both. For a Soldier, Knight, Gunner, or Mercenary-family target, give +3 ATK and +3 HP instead of +2.


### SALLY_WEAPONMASTER — サリィ - ウェポンマスター

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"armorer","turnFx":"weaponmaster"}`。

**ja**

> 【召喚時】「自分がシールド30を得る」か「自分の場の他のモンスター1体を選び、攻撃力+4・体力+4（持続）」を選ぶ。
> 
> 【自分ターン開始時】自分の場の「装備職人」1体ごとに、別々に自分がシールド5を得る。

**ko**

> 【소환시】자신의 실드 30 획득 또는 자신의 필드의 다른 몬스터 1체를 선택해 공격력 +4, 체력 +4(지속) 중 하나 선택한다.
> 
> 【자신 턴 시작시】자신의 필드의 장비 장인 1체마다 따로 자신이 실드 5 획득한다.

**en**

> 【On Summon】Choose one: gain 30 Shield; or choose 1 other monster on your field and give it +4 ATK and +4 HP (lasting).
> 
> 【Your Turn Start】For each Armorer on your field, gain 5 Shield separately.


### PRIEST — 神官

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"shield","aura":"shieldDew"}`。

**ja**

> 【召喚時】自分はシールド6を得る。
> 
> 【シールド獲得時】自分がシールドを得るたび、自分は雫2を得る。

**ko**

> 【소환시】자신의 실드 6 획득한다.
> 
> 【실드 획득시】자신이 실드를 얻을 때마다 자신 이슬 2 획득한다.

**en**

> 【On Summon】Gain 6 Shield.
> 
> 【When You Gain Shield】Whenever you gain Shield, gain 2 Dew.


### HIGH_PRIEST — 高等神官

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"shield","aura":"shieldDew"}`。

**ja**

> 【召喚時】自分はシールド9を得る。
> 
> 【シールド獲得時】自分がシールドを得るたび、自分は雫3を得る。

**ko**

> 【소환시】자신의 실드 9 획득한다.
> 
> 【실드 획득시】자신이 실드를 얻을 때마다 자신 이슬 3 획득한다.

**en**

> 【On Summon】Gain 9 Shield.
> 
> 【When You Gain Shield】Whenever you gain Shield, gain 3 Dew.


### BLACKSMITH — 鍛冶屋

確認済み：表記改定（ja / ko / en）。実装キー：`{"ench":"doubleShield"}`。

**ja**

> 【場にある間】自分が得るシールド量が2倍になる。

**ko**

> 【필드에 놓인 동안】자신이 얻는 실드 양 2배.

**en**

> 【While Deployed】Double the amount of Shield you gain.


### SHIELD_TITAN — 盾の巨神

確認済み：表記改定（ja / ko / en）。実装キー：`{"aura":"doubleShieldOther","summonReq":"shield20"}`。

**ja**

> 【召喚条件】直前の相手ターン中にシールド20以上を保有した。
> 
> 【自分ターン終了時】シールド10を得る。
> 
> 【場にいる間】このモンスターの効果以外で自分が得るシールド量が2倍になる。

**ko**

> 【소환 조건】직전 상대 턴 중 실드 20 이상 보유.
> 
> 【자신 턴 종료시】실드 10 획득한다.
> 
> 【필드에 있는 동안】이 몬스터 외 효과로 자신이 얻는 실드 양 2배.

**en**

> 【Summon Requirement】You held at least 20 Shield at some point during the opponent’s previous turn.
> 
> 【Your Turn End】Gain 10 Shield.
> 
> 【While on the Field】Double Shield you gain from sources other than this monster.


### ARMOR_BREAK — アーマーブレイク

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"armorBreak"}`。

**ja**

> 【発動時】相手のシールドを9減らす（最低0）。この効果で減らす前の相手のシールドが10以上なら、相手に烙印カウンター1個を付与する。

**ko**

> 【발동시】상대의 실드를 9 감소(최저 0). 이 효과로 감소하기 전 상대의 실드가 10 이상이면 상대에게 낙인 카운터 1개 부여한다.

**en**

> 【On Cast】Reduce the opponent's Shield by 9, to a minimum of 0. If they had at least 10 Shield before this reduction, give them 1 Brand counter.


### SPEAR_AND_SHIELD — 矛と盾

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"spearShield"}`。

**ja**

> 【発動時】相手のシールド量が自分の場の全モンスターの総攻撃力未満なら、相手のシールドを全て破壊する。

**ko**

> 【발동시】상대의 실드가 아군 전체 공격력 합계 미만이면 상대의 실드 전부 파괴한다.

**en**

> 【On Cast】Destroy all enemy Shield if it is less than your monsters’ total ATK.


### SELECTED_SWORD — 選りすぐりの剣

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"cullSword"}`。

**ja**

> 【発動時】自分の場のモンスター1体を選び、自分のリフトの「カル」1枚につき、その攻撃力+1（このターン終了まで）。

**ko**

> 【발동시】자신의 필드의 몬스터 1체를 선택해 자신의 리프트의 컬 1장당 그 공격력 +1(이번 턴 종료까지).

**en**

> 【On Cast】Choose 1 monster on your field; it gets +1 ATK per Cull in your Rift until this turn ends.


### SELECTED_SHIELD — 選りすぐりの盾

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"cullShield"}`。

**ja**

> 【発動時】自分のリフトの「カル」枚数と同じ量のシールドを自分が得る。

**ko**

> 【발동시】자신의 리프트의 컬 수만큼 자신이 실드 획득한다.

**en**

> 【On Cast】Gain Shield equal to the number of Culls in your Rift.


### WINE_COLLECTOR — ワインコレクター

確認済み：表記改定（ja / ko / en）。実装キー：`{"onSummon":"wineCollector"}`。

**ja**

> 【召喚時】自分の手札に「ワイン」が2枚以上あれば、次の全てを行う。
> そのうち2枚を自動で自分のリフトへ送る。新しい「闇商人」1枚を自分の手札に加える。このモンスターも自分のリフトへ送る。

**ko**

> 【소환시】자신의 패에 와인이 2장 이상 있으면 다음을 모두 처리한다.
> 그중 2장을 자동으로 자신의 리프트로 보낸다. 새로운 암상인 1장을 자신의 패에 넣는다. 이 몬스터도 자신의 리프트로 보낸다.

**en**

> 【On Summon】If your hand contains at least 2 Wines, do all of the following.
> Automatically send 2 of them to your Rift. Create 1 Black Market Dealer in your hand. Send this monster to your Rift.


### DEFENSIVE_STANCE — 防御の姿勢

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"golemShield"}`。

**ja**

> 【発動時】自分はシールドを3＋（自分の場の「ゴーレム」系モンスターの種類数×2）得る（合計を1回で獲得）。

**ko**

> 【발동시】자신은 실드를 3＋(자신의 필드의 골렘 계열 몬스터 종류 수×2) 획득(합계를 1회에 획득).

**en**

> 【On Cast】Gain 3 plus 2 times the number of distinct Golem-family monster names on your field as Shield, in 1 gain.


### IRON_WALL — 鉄壁

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"golemShield"}`。

**ja**

> 【発動時】自分はシールドを6＋（自分の場の「ゴーレム」系モンスターの種類数×3）得る（合計を1回で獲得）。

**ko**

> 【발동시】자신은 실드를 6＋(자신의 필드의 골렘 계열 몬스터 종류 수×3) 획득(합계를 1회에 획득).

**en**

> 【On Cast】Gain 6 plus 3 times the number of distinct Golem-family monster names on your field as Shield, in 1 gain.


### DESERTIFICATION — 砂漠化

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"desertification"}`。

**ja**

> 【発動時】相手の雫を0にする。

**ko**

> 【발동시】상대의 이슬을 0으로 만든다.

**en**

> 【On Cast】Set the opponent’s Dew to 0.


### NOURISHING_RAIN — 潤う雨

確認済み：表記改定（ja / ko / en）。実装キー：`{"act":"dew"}`。

**ja**

> 【発動時】自分は雫1を得る。

**ko**

> 【발동시】자신은 이슬 1을 얻는다.

**en**

> 【On Cast】Gain 1 Dew.


### STARTER_TRASH — カル

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【使用時】このカードを自分のリフトへ送る。

**ko**

> 【사용시】이 카드를 자신의 리프트로 보낸다.

**en**

> 【On Play】Send this card to your Rift.


### STARTER_CHEST — 宝箱

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【使用時】ダイス1個を振る — 1-2: 相手の場に「ミミック」（攻撃力3・体力2）1体を召喚する / 3-4: 自分の体力を5回復する / 5-6: 自分の最大マナ+1。

**ko**

> 【사용시】주사위 1개를 굴린다 — 1-2: 상대의 필드에 미믹(공격력 3, 체력 2) 1체 소환한다 / 3-4: 자신의 체력을 5 회복한다 / 5-6: 자신의 최대 마나 +1.

**en**

> 【On Play】Roll 1 die — 1-2: Summon 1 Mimic (3 ATK, 2 HP) to the opponent's field / 3-4: Restore 5 of your HP / 5-6: Your max mana +1.


### STARTER_MANA — アチューン

確認済み：表記改定（ja / ko / en）。実装キー：`{}`。

**ja**

> 【使用時】自分の最大マナ+1。

**ko**

> 【사용시】자신의 최대 마나 +1.

**en**

> 【On Play】Your max mana +1.

