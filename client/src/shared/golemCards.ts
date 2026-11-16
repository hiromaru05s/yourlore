import type {CardDef} from './types';

export const GOLEM_UPKEEP: Record<string, {mana:number; cards:string[]}> = {
  GOLEM1: {mana:2, cards:['GOLEM2','M10']},
  GOLEM2: {mana:2, cards:['NGA3']},
  M10: {mana:2, cards:['NWL3']},
  NGA3: {mana:3, cards:['AEM']},
  NWL3: {mana:3, cards:['MIND_BURST']},
  GOLEM3: {mana:2, cards:['IRON_WALL']},
};

type Line = [string,string,string];
const summon:Line=['召喚時','소환 시','On Summon'];
const upkeep:Line=['自分のターン開始時','자신의 턴 시작 시','At the Start of Your Turn'];
const spells:Line=['相手の魔法使用時','상대 마법 사용 시','Opponent Plays a Spell'];
const monsters:Line=['相手のモンスター召喚時','상대의 몬스터 소환 시','When the Opponent Summons a Monster'];
const field:Line=['場にある間','필드에 있는 동안','While on the Field'];
function line(h:Line,ja:string,ko:string,en:string):Line {
  return [`【${h[0]}】${ja}`,`【${h[1]}】${ko}`,`【${h[2]}】${en}`];
}
function text(...lines:Line[]) {
  const inLang=(i:number)=>lines.map(row=>row[i]).join('\n\n');
  return {ja:inLang(0),ko:inLang(1),en:inLang(2)};
}
function enchantGuts(enemy=false) {
  return line(summon,`${enemy?'相手':'自分'}の場の永続魔法1枚につき、このモンスターは気合カウンターを1つ得る。`,`${enemy?'상대':'자신'} 필드의 영구마법 1장당 이 몬스터는 기합 카운터를 1개 얻는다.`,`Gain 1 Guts counter for each persistent spell on ${enemy?"your opponent’s":"your"} field.`);
}
function heal(n:number) {
  return line(spells,`相手のターン中、相手が魔法カードを使用するたび、自分の体力を${n}回復する。`,`상대 턴에 상대가 마법 카드를 사용할 때마다 자신의 체력을 ${n} 회복한다.`,`Whenever the opponent plays a spell during their turn, restore ${n} of your HP.`);
}
function pay(id:string, ja:string,ko:string,en:string, mon=false) {
  const {mana}=GOLEM_UPKEEP[id];
  const actionKo = mon ? (id === 'GOLEM1' ? ' 중 1체를 자신의 필드에 소환' : ' 1체를 자신의 필드에 소환') : ' 1장을 패에 추가';
  return line(upkeep,`このモンスターの気合カウンター1つとマナ${mana}を支払い、${ja}を${mon?'自分の場に1体召喚':'手札に1枚追加'}してよい。`,`이 몬스터의 기합 카운터 1개와 마나 ${mana}을 지불하고 ${ko}${actionKo}할 수 있다.`,`You may spend 1 Guts counter from this monster and ${mana} mana to ${mon?'summon '+en+' to your field':'add '+en+' to your hand'}.`);
}
export const GOLEM_TEXT = {
  GOLEM1:text(enchantGuts(),pay('GOLEM1','「リーダーゴーレム」か「マナ・ゴーレム」','리더 골램 또는 마나 골렘','a Leader Golem or a Mana Golem',true)),
  GOLEM2:text(enchantGuts(true),heal(1),pay('GOLEM2','「戦士ゴーレム」','전사 골램','a Warrior Golem',true)),
  M10:text(enchantGuts(),heal(2),pay('M10','「ガーディアンゴーレム」','가디언 골램','a Guardian Golem',true)),
  NGA3:text(line(summon,'自分の場の他の「ゴーレム」系統モンスター1体につき、このモンスターは気合カウンターを1つ得る。','자신 필드의 다른 골렘 계열 몬스터 1체당 이 몬스터는 기합 카운터를 1개 얻는다.','Gain 1 Guts counter for each other Golem monster on your field.'),
    line(monsters,'相手のターン中、相手がコスト3以上のモンスターを召喚するたび、このモンスターは気合カウンターを1つ得る。','상대 턴에 상대가 코스트 3 이상인 몬스터를 소환할 때마다 이 몬스터는 기합 카운터를 1개 얻는다.','Whenever the opponent summons a monster costing 3 or more during their turn, gain 1 Guts counter.'),
    pay('NGA3','「アンティークエンハンスマジック」','앤티크 인핸스 매직','Antique Enhance Magic')),
  NWL3:text(enchantGuts(),heal(2),pay('NWL3','「精神放出術」','정신 방출술','Mind Burst')),
  GOLEM3:text(line(summon,'自分のデッキ構成に同名以外の「ゴーレム」系統モンスターがいなければ、このモンスターの攻撃力は1になる。','자신의 덱 구성에 이름이 다른 골렘 계열 몬스터가 없으면 이 몬스터의 공격력이 1이 된다.','If your deck composition contains no differently named Golem monster, set this monster’s ATK to 1.'),
    line(spells,'相手のターン中、相手が魔法カードを使用するたび、相手の場のランダムな永続魔法1枚を破壊する。','상대 턴에 상대가 마법 카드를 사용할 때마다 상대 필드의 무작위 영구마법 1장을 파괴한다.','Whenever the opponent plays a spell during their turn, destroy 1 random persistent spell on their field.'),
    line(monsters,'相手のターン中、自分の場に同名以外の「ゴーレム」系統モンスターがいる場合、相手がコスト3以上のモンスターを召喚するたび、このモンスターは気合カウンターを1つ得る。','상대 턴에 자신의 필드에 이름이 다른 골렘 계열 몬스터가 있는 동안 상대가 코스트 3 이상인 몬스터를 소환할 때마다 이 몬스터는 기합 카운터를 1개 얻는다.','Whenever the opponent summons a monster costing 3 or more during their turn, gain 1 Guts counter if you control a differently named Golem monster.'),
    pay('GOLEM3','「鉄壁」','철벽','Iron Wall')),
  MANA_GIANT:text(line(summon,'自分のデッキ構成に同名以外の「ゴーレム」系統モンスターがいなければ、このモンスターの体力は9になる。','자신의 덱 구성에 이름이 다른 골렘 계열 몬스터가 없으면 이 몬스터의 체력이 9가 된다.','If your deck composition contains no differently named Golem monster, set this monster’s HP to 9.'),
    line(field,'相手のターン中、相手がマナ水晶を得るたび、このモンスターの「虚無」を取り除く。すでに「虚無」がなければ、代わりに攻撃力・体力が2増える。自分がマナ水晶を得るたび、マナを1得る。自分のデッキ構成に同名以外の「ゴーレム」系統モンスターがいれば、さらにマナを1得る。','상대 턴에 상대가 마나 수정을 얻을 때마다 이 몬스터의 공허를 제거한다. 이미 공허가 없으면 대신 공격력과 체력이 2 증가한다. 자신이 마나 수정을 얻을 때마다 마나를 1 얻는다. 자신의 덱 구성에 이름이 다른 골렘 계열 몬스터가 있으면 마나를 1 더 얻는다.','Whenever the opponent gains mana crystals during their turn, remove Void from this monster. If it already lacks Void, it gains +2 ATK and +2 HP instead. Whenever you gain mana crystals, gain 1 mana, plus 1 more if your deck composition contains a differently named Golem monster.')),
  GOLEM_TEST:text(line(field,'相手のターン中、相手が自分の永続魔法を破壊するたび、「兵士ゴーレム」1体を自分の場に召喚する。','상대 턴에 상대가 자신의 영구마법을 파괴할 때마다 병사 골램 1체를 자신의 필드에 소환한다.','Whenever the opponent destroys one of your persistent spells during their turn, summon a Soldier Golem to your field.')),
};
const prints:Record<keyof typeof GOLEM_TEXT,[number,number,string[]]>={
  GOLEM1:[1,1,['guts']], GOLEM2:[2,4,['guts']], M10:[1,4,['guts']], NGA3:[3,1,['guts','counter']],
  NWL3:[1,8,['guts','counter']], GOLEM3:[7,11,['guts']], MANA_GIANT:[3,14,['void']], GOLEM_TEST:[0,1,['guts']],
};
export function applyGolemCatalog(db:Record<string,CardDef>) {
  db.GOLEM_TEST={id:'GOLEM_TEST',t:'mon',cost:1,noShop:true,name:'시험용 골렘',nameJa:'試験用ゴーレム',nameEn:'Prototype Golem',text:GOLEM_TEXT.GOLEM_TEST.ko};
  for(const [id,[atk,def,passive]] of Object.entries(prints)) {
    Object.assign(db[id],{atk,def,passive});
    for(const key of ['onSummon','turnFx','summonReq','aura','val','val2'] as const) delete db[id][key];
  }
  db.REFRESH_HAND.maxUsesPerTurn=3;
}
