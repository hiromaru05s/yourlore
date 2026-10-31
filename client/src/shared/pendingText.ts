import type {Pending} from './types';
type Locale='ja'|'ko'|'en';
type Copy=Record<Locale,string>;
const c=(ja:string,ko:string,en:string):Copy=>({ja,ko,en});
/** Choice instructions are authored by effect, never translated from a battle log. */
export const CHOICE_TEXT:Record<string,Copy>={
 ARMORER_MODE:c('自分のシールド獲得か、自分の他のモンスター1体の強化を選んでください。','자신이 실드를 얻거나 자신의 다른 몬스터 1체를 강화하는 효과를 선택하세요.','Choose between gaining Shield and strengthening 1 of your other monsters.'),
 ARMORER_TARGET:c('強化する自分の他のモンスター1体を選んでください。','강화할 자신의 다른 몬스터 1체를 선택하세요.','Choose 1 of your other monsters to strengthen.'),
 ELF_DESTROY:c('破壊する、攻撃力9以上の相手モンスター1体を選んでください。','파괴할 공격력 9 이상의 상대 몬스터 1체를 선택하세요.','Choose 1 opposing monster with at least 9 ATK to destroy.'),
 HIGH_ELF_HAND:c('相手の手札からリフトへ送るカードを1枚まで選ぶか、確認を終えてください。','상대의 패에서 리프트로 보낼 카드를 최대 1장 선택하거나 확인을 마치세요.','Choose up to 1 card from the opponent’s hand to send to their Rift, or finish inspecting their hand.'),
 COLOSSEUM_REST:c('体力を全回復する自分のモンスター1体を選んでください。','체력을 전부 회복할 자신의 몬스터 1체를 선택하세요.','Choose 1 of your monsters to restore to full HP.'),
 NIGHT_CASTLE_GIFT:c('新しく手札に加える「吸血契約」か「吸血の極意」を選んでください。','패에 새로 추가할 흡혈 계약 또는 흡혈의 극의를 선택하세요.','Choose a new Vampiric Pact or Vampiric Secret Art to add to your hand.'),
 QUICK_POISON:c('腐敗カウンターを2個付与する相手モンスター1体を選んでください。','부패 카운터 2개를 부여할 상대 몬스터 1체를 선택하세요.','Choose 1 opposing monster to receive 2 Decay counters.'),
 QUICK_REBIRTH:c('自分の墓地からモンスター1体を選んでください。購入コスト7以下なら虚無を付与して召喚します。8以上なら効果はありません。','자신의 묘지에서 몬스터 1체를 선택하세요. 구매 비용이 7 이하면 허무를 부여하여 소환합니다. 8 이상이면 효과가 없습니다.','Choose 1 monster from your graveyard. If its purchase cost is 7 or less, summon it with Void. Otherwise, nothing happens.'),
 QUICK_SORT:c('破壊する相手の場のモンスター・永続魔法・クエスト1枚を選んでください。','파괴할 상대 필드의 몬스터·영구 마법·퀘스트 1장을 선택하세요.','Choose 1 opposing monster, enchantment or Quest on the field to destroy.'),
 Q_ASSASSIN:c('相手の場から相手のリフトへ送るモンスター・永続魔法・クエスト1枚を選んでください。','상대 필드에서 상대의 리프트로 보낼 몬스터·영구 마법·퀘스트 1장을 선택하세요.','Choose 1 opposing monster, enchantment or Quest on the field to send to the opponent’s Rift.'),
 Q_TRIBE:c('自分の場と同じ種族で、まだ自分の場にいない名前のモンスター1体を選んで召喚してください。','자신의 필드와 같은 종족이며 자신의 필드에 없는 이름의 몬스터 1체를 선택하여 소환하세요.','Choose a monster to summon that shares a tribe with your monsters and has a name not already on your field.'),
 RIFT_JAILER:c('相手のリフトから自分のリフトへ移すカードを選んでください（合計8枚まで）。','상대의 리프트에서 자신의 리프트로 옮길 카드를 선택하세요(합계 최대 8장).','Choose cards to move from the opponent’s Rift to your Rift (up to 8 in total).'),
 RIFT_METALIGHT:c('相手の墓地から相手のリフトへ送るカード1枚を選んでください。','상대의 묘지에서 상대의 리프트로 보낼 카드 1장을 선택하세요.','Choose 1 card from the opponent’s graveyard to send to their Rift.'),
 STABLE:c('破壊する自分の騎士1体を選んでください。破壊した場合、新しい騎馬兵1体を召喚します。','파괴할 자신의 기사 1체를 선택하세요. 파괴했다면 새로운 기마병 1체를 소환합니다.','Choose 1 of your Knights to destroy. If it is destroyed, summon a new Cavalry.'),
 Q_CHEAT:c('相手のデッキから相手のリフトへ送るカード1枚を選んでください。','상대의 덱에서 상대의 리프트로 보낼 카드 1장을 선택하세요.','Choose 1 card from the opponent’s deck to send to their Rift.'),
 CREATION:c('複製する相手のデッキのカード1枚を選んでください。複製は自分の墓地に加えます。','복제할 상대 덱의 카드 1장을 선택하세요. 복제본을 자신의 묘지에 추가합니다.','Choose 1 card in the opponent’s deck to copy. Add the new copy to your graveyard.'),
 ROGUE_ART:c('回避を付与する自分のモンスター1体を選んでください。','회피를 부여할 자신의 몬스터 1체를 선택하세요.','Choose 1 of your monsters to gain Evade.'),
 FIRE_BALL:c('7ダメージを与えるプレイヤーかモンスター1体を選んでください。','7 데미지를 줄 플레이어 또는 몬스터 1체를 선택하세요.','Choose a player or monster to deal 7 damage to.'),
 FIRE_ZONE:c('自分の手札から自分のリフトへ送るカード1枚を選んでください。','자신의 패에서 자신의 리프트로 보낼 카드 1장을 선택하세요.','Choose 1 card from your hand to send to your Rift.'),
 attack:c('攻撃する相手モンスター1体を選んでください。','공격할 상대 몬스터 1체를 선택하세요.','Choose an opposing monster to attack.'),
 bounceLow:c('相手の手札に戻す、購入コスト2以下の相手モンスター1体を選んでください。','상대의 패로 되돌릴 구매 비용 2 이하의 상대 몬스터 1체를 선택하세요.','Choose 1 opposing monster with purchase cost 2 or less to return to the opponent’s hand.'),
 setAtk2:c('攻撃力を2にする相手モンスター1体を選んでください。','공격력을 2로 만들 상대 몬스터 1체를 선택하세요.','Choose 1 opposing monster whose ATK will become 2.'),
 decayMark:c('腐敗カウンターを1個付与する相手モンスター1体を選んでください。','부패 카운터 1개를 부여할 상대 몬스터 1체를 선택하세요.','Choose 1 opposing monster to receive 1 Decay counter.'),
 emberBuff:c('攻撃力+2する自分の他の始原モンスター1体を選んでください。','공격력을 2 올릴 자신의 다른 시초 몬스터 1체를 선택하세요.','Choose 1 of your other Origin monsters to gain +2 ATK.'),
 nlTarget:c('パッシブを付与する自分のモンスター1体を選んでください。','패시브를 부여할 자신의 몬스터 1체를 선택하세요.','Choose 1 of your monsters to gain a passive ability.'),
 nlGrant:c('選んだモンスターに付与するパッシブを選んでください。','선택한 몬스터에게 부여할 패시브를 선택하세요.','Choose the passive ability to grant to the selected monster.'),
 grantMajesty:c('威厳を付与する自分のモンスター1体を選んでください。','위엄을 부여할 자신의 몬스터 1체를 선택하세요.','Choose 1 of your monsters to gain Majesty.'),
 bloodSecret:c('破壊する自分の吸血鬼系モンスター1体を選んでください。','파괴할 자신의 흡혈귀 계열 몬스터 1체를 선택하세요.','Choose 1 of your Vampire-family monsters to destroy.'),
 seek:c('自分のデッキから手札に加えるカード1枚を選んでください。','자신의 덱에서 패에 추가할 카드 1장을 선택하세요.','Choose 1 card from your deck to add to your hand.'),
 recall:c('自分の墓地から手札に戻すカード1枚を選んでください。','자신의 묘지에서 패로 되돌릴 카드 1장을 선택하세요.','Choose 1 card from your graveyard to return to your hand.'),
 exilePick:c('自分の墓地から自分のリフトへ送るカード1枚を選んでください。','자신의 묘지에서 자신의 리프트로 보낼 카드 1장을 선택하세요.','Choose 1 card from your graveyard to send to your Rift.'),
 scrapper:c('自分の手札から、購入コスト1のカード2枚を選んで自分のリフトへ送ってください。','자신의 패에서 구매 비용이 1인 카드 2장을 선택하여 자신의 리프트로 보내세요.','Choose 2 cards with purchase cost 1 from your hand to send to your Rift.'),
 chosenMage:c('自分のリフトのカル1枚を墓地に戻して相手に8ダメージを与える、選ばれし魔法使い1体を選んでください。','자신의 리프트의 컬 1장을 묘지로 되돌리고 상대에게 8 데미지를 줄 선택받은 마법사 1체를 선택하세요.','Choose a Chosen Mage to return 1 Cull from your Rift to your graveyard and deal 8 damage to the opponent.'),
 gamblerGuess:c('ダイスの出目を1つ予測してください。','주사위 눈 1개를 예측하세요.','Predict the result of the die.'),
 gamblerPick:c('発動する効果を1つ選んでください。','발동할 효과 1개를 선택하세요.','Choose 1 effect to activate.'),
 nightMarket:c('マナを支払って購入するアサシン系カード1枚を選んでください。','마나를 지불하고 구매할 암살자 계열 카드 1장을 선택하세요.','Choose 1 Assassin-family card to purchase by paying mana.'),
 colosseumPick:c('召喚する選ばれしモンスター1体を選んでください。','소환할 선택받은 몬스터 1체를 선택하세요.','Choose 1 Chosen monster to summon.'),
 samsaraPick:c('召喚するモンスター1体を選んでください。','소환할 몬스터 1체를 선택하세요.','Choose 1 monster to summon.'),
 civChoice:c('手札に加える卵1枚を選んでください。','패에 추가할 알 1장을 선택하세요.','Choose 1 Egg to add to your hand.'),
 giantShop:c('マナを支払って購入する、購入コスト5以上の始原カード1枚を選んでください。','마나를 지불하고 구매할 구매 비용 5 이상의 시초 카드 1장을 선택하세요.','Choose 1 Origin card with purchase cost 5 or more to purchase by paying mana.'),
 chronicler:c('両者通算の過去10ターンの提示から、マナを支払って購入するカード1枚を選んでください。','양쪽 턴을 합친 최근 10턴의 제시에서 마나를 지불하고 구매할 카드 1장을 선택하세요.','Choose 1 card from the offers of the last 10 turns (counting both players) to purchase by paying mana.'),
 dragonFuse:c('融合後に召喚するモンスターを選んでください。','융합 후 소환할 몬스터를 선택하세요.','Choose the monster to summon through fusion.'),
 exileOppDeck:c('相手のデッキから相手のリフトへ送るカード1枚を選んでください。','상대의 덱에서 상대의 리프트로 보낼 카드 1장을 선택하세요.','Choose 1 card from the opponent’s deck to send to their Rift.'),
 landGrant:c('召喚する、購入コスト3以下の貴族モンスター1体を選んでください。','소환할 구매 비용 3 이하의 귀족 몬스터 1체를 선택하세요.','Choose 1 Aristocrat monster with purchase cost 3 or less to summon.'),
 darkMarket:c('マナを支払って購入するカード1枚を選んでください。','마나를 지불하고 구매할 카드 1장을 선택하세요.','Choose 1 card to purchase by paying mana.'),
 reroll:c('ダイスを振り直すか、今の結果を使うか選んでください。','주사위를 다시 굴리거나 현재 결과를 사용할지 선택하세요.','Choose whether to reroll the dice or keep the current result.'),
};
export const DYNAMIC_CHOICE_REASONS=['WORLD_TREE_ATTACK','WORLD_TREE_DEFEND','SELECTED_SWORD','QUICK_ASSAULT','RIFT_MATTER','FIRE_MASTER','handCap','defDown','weaken','atkDown','blackDragon','divine','breaktrap','bloodShower','destroyTrap','destroyEnch','destroyMon','feastKill','buffTurn','buffPerm','golemBuff','grantDecay','purge','incubate'] as const;
export function pendingText(q:Pending,lang:Locale):string {
 const d=q.data??{},v=Number(d.val??1),n=Number(d.count??1);let text=CHOICE_TEXT[q.reason];
 switch(q.reason){
 case 'WORLD_TREE_ATTACK':case 'WORLD_TREE_DEFEND':{const atk=q.reason==='WORLD_TREE_ATTACK';text=atk?c('雫1を消費して攻撃するモンスターの攻撃力を3上げますか？場を離れるまで続きます。','이슬 1을 소비하여 공격하는 몬스터의 공격력을 3 올릴까요? 필드를 떠날 때까지 유지됩니다.','Spend 1 Dew to give the attacking monster +3 ATK until it leaves the field?'):c('雫1を消費して攻撃されるモンスターの体力を3上げますか？場を離れるまで続きます。','이슬 1을 소비하여 공격받는 몬스터의 체력을 3 올릴까요? 필드를 떠날 때까지 유지됩니다.','Spend 1 Dew to give the defending monster +3 HP until it leaves the field?');break;}
 case 'SELECTED_SWORD':text=c(`このターン終了まで攻撃力+${d.amount}する自分のモンスター1体を選んでください。`,`이번 턴 종료까지 공격력을 ${d.amount} 올릴 자신의 몬스터 1체를 선택하세요.`,`Choose 1 of your monsters to gain +${d.amount} ATK until the end of this turn.`);break;
 case 'QUICK_ASSAULT':text=c(`このターン終了まで攻撃力+2する${d.first?'2':'1'}体目の自分のモンスターを選んでください。`, `이번 턴 종료까지 공격력을 2 올릴 자신의 ${d.first?'두':'첫'} 번째 몬스터를 선택하세요.`,`Choose the ${d.first?'second':'first'} of your monsters to gain +2 ATK until the end of this turn.`);break;
 case 'RIFT_MATTER':text=c(`相手の場から相手のリフトへ送る${d.left===1?'2枚目の':'1枚目の'}カードを選んでください。`,`상대 필드에서 상대의 리프트로 보낼 ${d.left===1?'두':'첫'} 번째 카드를 선택하세요.`,`Choose the ${d.left===1?'second':'first'} card on the opponent’s field to send to their Rift.`);break;
 case 'FIRE_MASTER':text=c('自分のデッキか墓地から手札に加えるファイアー魔法を選んでください（合計2枚。1枚しかなければ1枚）。','자신의 덱이나 묘지에서 패에 추가할 파이어 마법을 선택하세요(합계 2장, 1장뿐이면 1장).','Choose Fire spells from your deck or graveyard to add to your hand (2 in total, or 1 if only 1 is available).');break;
 case 'handCap':text=c(`手札から捨てるカードを${v}枚選んでください。`,`패에서 버릴 카드 ${v}장을 선택하세요.`,`Choose ${v} card${v===1?'':'s'} to discard from your hand.`);break;
 case 'defDown':case 'weaken':case 'atkDown':{const atk=q.reason==='atkDown';text=c(`${atk?'攻撃力':'体力'}を${v}下げる相手モンスター1体を選んでください。`,`${atk?'공격력':'체력'}을 ${v} 낮출 상대 몬스터 1체를 선택하세요.`,`Choose 1 opposing monster to lose ${v} ${atk?'ATK':'HP'}.`);break;}
 case 'blackDragon':text=c(`相手のリフトから相手の墓地へ戻すカードを${v}枚まで選んでください。`,`상대의 리프트에서 상대의 묘지로 되돌릴 카드를 최대 ${v}장 선택하세요.`,`Choose up to ${v} cards from the opponent’s Rift to return to their graveyard.`);break;
 case 'divine':case 'breaktrap':case 'bloodShower':case 'destroyTrap':case 'destroyEnch':{const type=d.trapOnly?c('セットトラップ','세트 함정',v===1?'set trap':'set traps'):d.enchOnly?c('永続魔法','영구 마법',v===1?'enchantment':'enchantments'):d.noMon?c('セットトラップか永続魔法','세트 함정 또는 영구 마법',v===1?'set trap or enchantment':'set traps or enchantments'):c('モンスター・セットトラップ・永続魔法','몬스터·세트 함정·영구 마법',v===1?'monster, set trap or enchantment':'monsters, set traps or enchantments');text=c(`破壊する${type.ja}を${d.anySide?'両方':'相手'}の場から${v}枚まで選んでください。`,`${d.anySide?'양쪽':'상대'} 필드에서 파괴할 ${type.ko}을 최대 ${v}장 선택하세요.`,`Choose up to ${v} ${type.en} on ${d.anySide?'either player’s field':'the opponent’s field'} to destroy.`);break;}
 case 'destroyMon':case 'feastKill':text=c(`破壊するモンスター1体を${d.anySide?'両方':'相手'}の場から選んでください。${d.maxCost!=null?`購入コスト${d.maxCost}以下。`:''}残り${v}体。`,`${d.anySide?'양쪽':'상대'} 필드에서 파괴할 몬스터 1체를 선택하세요. ${d.maxCost!=null?`구매 비용 ${d.maxCost} 이하. `:''}${v}체 남음.`,`Choose 1 monster on ${d.anySide?'either player’s field':'the opponent’s field'} to destroy.${d.maxCost!=null?` Purchase cost must be ${d.maxCost} or less.`:''} ${v} remaining.`);break;
 case 'buffTurn':text=c(`このターン終了まで攻撃力+${v}する自分のモンスター1体を選んでください（残り${n}体）。`,`이번 턴 종료까지 공격력을 ${v} 올릴 자신의 몬스터 1체를 선택하세요(${n}체 남음).`,`Choose 1 of your monsters to gain +${v} ATK until the end of this turn (${n} remaining).`);break;
 case 'buffPerm':text=c('カードの効果で強化する自分のモンスター1体を選んでください。','카드의 효과로 강화할 자신의 몬스터 1체를 선택하세요.','Choose 1 of your monsters to strengthen with this card’s effect.');break;
 case 'golemBuff':text=c(`攻撃力+${v}する自分のゴーレム1体を選んでください（残り${n}体）。`,`공격력을 ${v} 올릴 자신의 골렘 1체를 선택하세요(${n}체 남음).`,`Choose 1 of your Golems to gain +${v} ATK (${n} remaining).`);break;
 case 'grantDecay':text=c(`腐敗を付与する自分のモンスター1体を選んでください（残り${n}体）。`,`부패를 부여할 자신의 몬스터 1체를 선택하세요(${n}체 남음).`,`Choose 1 of your monsters to gain Decay (${n} remaining).`);break;
 case 'purge':text=c(`自分のリフトへ送るカードを${v>=99?'何枚でも':`${v}枚まで`}選んでください。`,`자신의 리프트로 보낼 카드를 ${v>=99?'원하는 만큼':`최대 ${v}장`} 선택하세요.`,`Choose ${v>=99?'any number of cards':`up to ${v} card${v===1?'':'s'}`} to send to your Rift.`);break;
 case 'incubate':text=c(`孵化を${v}ターン早める自分の卵1体を選んでください。`,`부화를 ${v}턴 앞당길 자신의 알 1체를 선택하세요.`,`Choose 1 of your Eggs to hatch ${v} turns sooner.`);break;
 }
 const result=(text??c('この効果の対象を選んでください。','이 효과의 대상을 선택하세요.','Choose a target for this effect.'))[lang];
 return result+(q.allowCancel?' '+c('選ばずに終了できます。','선택하지 않고 마칠 수 있습니다.','You may finish without choosing another card.')[lang]:'');
}
