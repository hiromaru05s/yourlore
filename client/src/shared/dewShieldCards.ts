import type { CardDef } from './types';

const card = (id: string, name: string, nameJa: string, nameEn: string, cost: number, textJa: string, data: Partial<CardDef> = {}): CardDef => ({
  id, name, nameJa, nameEn, cost, t: 'spell', text: textJa, textJa, textEn: textJa, ...data,
});

export const DEW_SHIELD_CARDS: CardDef[] = [
  card('APPRENTICE_ARMORER', '견습 장비 장인', '見習い装備職人', 'Apprentice Armorer', 2,
    '【召喚時】自分にシールド4、または自分の他のモンスター1体に+1/+1', {t:'mon',atk:1,def:1,onSummon:'armorer',val:4,val2:1}),
  card('VETERAN_ARMORER', '숙련 장비 장인', '熟練した装備職人', 'Veteran Armorer', 4,
    '【召喚時】自分にシールド10、または自分の他のモンスター1体に+2/+2。自分の場に「城」があれば両方発動。強化対象が「兵士」「騎士」「砲撃兵」「傭兵」系なら+3/+3', {t:'mon',atk:3,def:2,onSummon:'armorer',val:10,val2:2}),
  card('SALLY_WEAPONMASTER', '샐리 - 웨폰 마스터', 'サリィ - ウェポンマスター', 'Sally - Weaponmaster', 8,
    '【召喚時】自分にシールド30、または自分の他のモンスター1体に+4/+4。【自分ターン開始時】自分の場の「装備職人」1体につきシールド5を得る', {t:'mon',atk:12,def:10,onSummon:'armorer',val:30,val2:4,turnFx:'weaponmaster'}),
  card('PRIEST', '신관', '神官', 'Priest', 4,
    '【召喚時】自分にシールド6。【常時】自分がシールドを得るたび、雫2を得る', {t:'mon',atk:0,def:4,onSummon:'shield',val:6,aura:'shieldDew',val2:2}),
  card('HIGH_PRIEST', '고등 신관', '高等神官', 'High Priest', 6,
    '【召喚時】自分にシールド9。【常時】自分がシールドを得るたび、雫3を得る', {t:'mon',atk:1,def:7,onSummon:'shield',val:9,aura:'shieldDew',val2:3}),
  card('BLACKSMITH', '대장간', '鍛冶屋', 'Blacksmith', 2,
    '【永続】自分が得るシールド量が2倍になる', {ench:'doubleShield',val:99}),
  card('SHIELD_TITAN', '방패의 거신', '盾の巨神', 'Shield Titan', 7,
    '【条件】直前の相手ターン中にシールド20以上を保有した。【自分ターン終了時】シールド10を得る。【常時】このモンスターの効果以外で自分が得るシールド量が2倍になる', {t:'mon',atk:3,def:30,passive:['taunt','majesty','aura'],summonReq:'shield20',aura:'doubleShieldOther'}),
  card('ARMOR_BREAK', '아머 브레이크', 'アーマーブレイク', 'Armor Break', 2,
    '相手のシールド9を破壊する。破壊前のシールドが10以上なら、相手に烙印カウンター1個を付与する', {act:'armorBreak'}),
  card('SPEAR_AND_SHIELD', '창과 방패', '矛と盾', 'Spear and Shield', 2,
    '相手のシールド量が自分の場の全モンスターの総攻撃力未満なら、相手のシールドを全て破壊する', {act:'spearShield'}),
  card('SELECTED_SWORD', '엄선된 검', '選りすぐりの剣', 'Selected Sword', 1,
    '自分が除外したカル1枚につき、どちらかの場のモンスター1体の攻撃力+1。この強化はターン終了時になくなる', {noShop:true,passive:['void'],act:'cullSword'}),
  card('SELECTED_SHIELD', '엄선된 방패', '選りすぐりの盾', 'Selected Shield', 1,
    '自分が除外したカルの枚数分、シールドを得る', {noShop:true,passive:['void'],act:'cullShield'}),
  card('WINE_COLLECTOR', '와인 수집가', 'ワインコレクター', 'Wine Collector', 2,
    '【召喚時】手札の「ワイン」2枚をリフトへ送り、「闇商人」を手札に加える。成功した場合、このモンスターもリフトへ送る', {t:'mon',atk:0,def:1,onSummon:'wineCollector'}),
  card('DEFENSIVE_STANCE', '방어 태세', '防御の姿勢', 'Defensive Stance', 1,
    'シールド3を得る。自分の場の異なる「ゴーレム」系モンスター1種類につき、さらにシールド2を得る', {act:'golemShield',val:3,val2:2}),
  card('IRON_WALL', '철벽', '鉄壁', 'Iron Wall', 2,
    'シールド6を得る。自分の場の異なる「ゴーレム」系モンスター1種類につき、さらにシールド3を得る', {act:'golemShield',val:6,val2:3}),
  card('DESERTIFICATION', '사막화', '砂漠化', 'Desertification', 4,
    '相手の雫を0にする', {act:'desertification',passive:['void']}),
  card('NOURISHING_RAIN', '촉촉한 비', '潤う雨', 'Nourishing Rain', 3,
    '雫1を得る', {act:'dew',val:1,noShop:true}),
];

export const DEW_SHIELD_STARTERS = ['SELECTED_SWORD', 'SELECTED_SHIELD', 'NOURISHING_RAIN'];

export function applyDewShieldRework(db: Record<string, CardDef>): void {
  const patch = (id: string, textJa: string, changes: Partial<CardDef> = {}) => Object.assign(db[id], {text:textJa,textJa,textEn:textJa}, changes);
  patch('WORLD_CARE', '【常時】自分の場に最大1枚。【自分ターン開始時】雫1を得る');
  patch('WORLD_TREE', '【条件】雫8以上。【常時】自分の雫による回復量2倍。自分のモンスターの攻撃時、任意で雫1を消費してその攻撃力+6（永続）。自分のモンスターの被攻撃時、任意で雫1を消費してその体力+6（永続）。【自分ターン開始時】雫3を得る', {atk:1,def:30,summonReq:'dew8',turnFx:'worldTree'});
  patch('VITAL2', '【召喚時】自分の体力3回復。その後ダイスを1回振り、5以上なら雫1を得る', {onSummon:'dewBeliever',val:3});
  patch('VITAL3', '【召喚時】自分の体力5回復。【常時】自分が「世界樹」「エルフ」系カードをプレイするたび、雫1を得る', {onSummon:'heal',val:5,aura:'treeKeeper'});
  patch('ELF_HAVEN', '【永続】「世界樹」カードの購入／発動コスト0（購入は自分の各ターン3枚まで）。自分が「世界樹」「エルフ」系カードを購入するたび、雫1を得る');
  patch('WORLD_HEART', '【自分ターン開始時】雫2を得て、自分の体力2回復', {ench:'worldHeart',val2:2});
  patch('DARK_ELF', '【条件】雫4以上で、自分の場に「ダークエルフ」以外の「エルフ」系モンスターがいない。【召喚時】雫4消費。相手にシールドがあれば相手に10ダメージ。【常時】自分の場に「傭兵」系がいれば回避、「魔族」がいればオーラを得る', {summonReq:'darkElf',onSummon:'darkElfDew'});
  patch('ELF', '【条件】雫4以上。【召喚時】雫2を得て、相手の攻撃力9以上のモンスター1体を選んで破壊。【常時】自分の場の異なる「世界樹」系カード1種類につき+1/+1。両プレイヤーの回復量2倍', {atk:14,def:12,summonReq:'dew4',onSummon:'elfDew',passive:[...new Set([...(db.ELF.passive ?? []),'evade'])]});
  patch('HIGH_ELF', '【条件】雫10以上。【召喚時】相手の手札を全て確認し、3枚までゲームから除外。相手のシールドを全て破壊し、自分の雫を2倍にする。【常時】自分の場の異なる「世界樹」系カード1種類につき+2/+2。相手の回復量半分（端数切り捨て）', {summonReq:'dew10',onSummon:'highElfDew'});
  patch('ELDER_ELF_KING', '【条件】雫12以上。【召喚時】相手の場のカードを全て破壊し、自分の雫を3倍にする。【常時】自分の場の異なる「世界樹」系カード1種類につき+4/+4。相手がターン中にプレイできるカードは3枚まで。【破壊時】雫15を消費し、相手に30ダメージ（雫不足なら不発）', {summonReq:'dew12',onSummon:'elderDew'});
}

const LOCALIZED: Record<string, [string, string]> = {
 APPRENTICE_ARMORER:['【소환시】자신 실드 4 또는 다른 아군 몬스터 1체 +1/+1','【Summon】Gain 4 Shield or give another allied monster +1/+1.'],
 VETERAN_ARMORER:['【소환시】자신 실드 10 또는 다른 아군 몬스터 1체 +2/+2. 아군 성이 있으면 둘 다 발동. 병사·기사·포격병·용병 계열 대상은 +3/+3','【Summon】Gain 10 Shield or give another ally +2/+2. Both with your Castle. Soldier/Knight/Gunner/Mercenary targets get +3/+3.'],
 SALLY_WEAPONMASTER:['【소환시】자신 실드 30 또는 다른 아군 몬스터 1체 +4/+4. 【자신 턴 시작】아군 장비 장인 1체당 실드 5 획득','【Summon】Gain 30 Shield or give another ally +4/+4. 【Your turn start】Gain 5 Shield separately for each allied Armorer.'],
 PRIEST:['【소환시】자신 실드 6. 【상시】자신이 실드를 얻을 때마다 이슬 2 획득','【Summon】Gain 6 Shield. 【Constant】Whenever you gain Shield, gain 2 Dew.'],
 HIGH_PRIEST:['【소환시】자신 실드 9. 【상시】자신이 실드를 얻을 때마다 이슬 3 획득','【Summon】Gain 9 Shield. 【Constant】Whenever you gain Shield, gain 3 Dew.'],
 BLACKSMITH:['【영구】자신이 얻는 실드 양 2배','【Permanent】Double the amount of Shield you gain.'],
 SHIELD_TITAN:['【조건】직전 상대 턴 중 실드 20 이상 보유. 【자신 턴 종료】실드 10 획득. 【상시】이 몬스터 외 효과로 자신이 얻는 실드 양 2배','【Requires】Held 20+ Shield at any point during the last opponent turn. 【Your turn end】Gain 10 Shield. 【Constant】Double Shield you gain from sources other than this monster.'],
 ARMOR_BREAK:['상대 실드 9 파괴. 파괴 전 실드가 10 이상이면 상대 낙인 카운터 1개','Destroy 9 enemy Shield · If previously 10+, give them 1 Brand counter.'],
 SPEAR_AND_SHIELD:['상대 실드가 아군 전체 공격력 합계 미만이면 상대 실드 전부 파괴','Destroy all enemy Shield if it is less than your monsters’ total ATK.'],
 SELECTED_SWORD:['제외된 자신의 컬 1장당 어느 쪽 필드든 몬스터 1체 공격력 +1. 턴 종료시 해제','Give 1 monster on either field +1 ATK for each of your exiled Culls · Until turn end.'],
 SELECTED_SHIELD:['제외된 자신의 컬 수만큼 실드 획득','Gain Shield equal to the number of your exiled Culls.'],
 WINE_COLLECTOR:['【소환시】패의 와인 2장을 리프트로 보내고 암상인을 패에 추가. 성공시 이 몬스터도 리프트로','【Summon】Send 2 Wines from hand to the Rift and add a Dark Merchant to hand. If successful, send this monster to the Rift too.'],
 DEFENSIVE_STANCE:['실드 3 획득. 아군 필드의 서로 다른 골렘 계열 1종당 추가 실드 2','Gain 3 Shield · Plus 2 for each distinct Golem monster on your field.'],
 IRON_WALL:['실드 6 획득. 아군 필드의 서로 다른 골렘 계열 1종당 추가 실드 3','Gain 6 Shield · Plus 3 for each distinct Golem monster on your field.'],
 DESERTIFICATION:['상대의 이슬을 0으로 만든다','Set the opponent’s Dew to 0.'],
 NOURISHING_RAIN:['이슬 1 획득','Gain 1 Dew.'],
 WORLD_CARE:['【상시】자신 필드에 최대 1장. 【자신 턴 시작】이슬 1 획득','【Constant】At most 1 on your field. 【Your turn start】Gain 1 Dew.'],
 WORLD_TREE:['【조건】이슬 8 이상. 【상시】자신 이슬 회복량 2배. 아군 공격시 선택: 이슬 1 소비, 공격력 +6(영구). 아군 몬스터 피격시 선택: 이슬 1 소비, 그 몬스터 체력 +6(영구). 【자신 턴 시작】이슬 3 획득','【Requires】8+ Dew. 【Constant】Double your Dew healing. When your monster attacks, you may spend 1 Dew for permanent +6 ATK. When your monster is attacked, you may spend 1 Dew for permanent +6 HP. 【Your turn start】Gain 3 Dew.'],
 VITAL2:['【소환시】자신 체력 3 회복, 주사위 1회, 5 이상이면 이슬 1 획득','【Summon】Restore 3 of your HP · Then roll a die; on 5+, gain 1 Dew.'],
 VITAL3:['【소환시】자신 체력 5 회복. 【상시】세계수·엘프 계열 카드를 사용할 때마다 이슬 1 획득','【Summon】Restore 5 of your HP. 【Constant】Gain 1 Dew whenever you play a World Tree or Elf card.'],
 ELF_HAVEN:['【영구】세계수 카드 구매/시전 코스트 0(자신 턴 구매 3장까지). 세계수·엘프 카드 구매시 이슬 1 획득','【Permanent】World Tree cards cost 0 to buy/cast (buy up to 3 per own turn). Gain 1 Dew whenever you buy a World Tree or Elf card.'],
 WORLD_HEART:['【자신 턴 시작】이슬 2 획득, 자신 체력 2 회복','【Your turn start】Gain 2 Dew and restore 2 of your HP.'],
 DARK_ELF:['【조건】이슬 4 이상, 아군 필드에 다크 엘프 외 엘프 계열 없음. 【소환시】이슬 4 소비. 상대 실드가 있으면 상대에게 10 데미지. 【상시】아군 용병이 있으면 회피, 마족이 있으면 아우라','【Requires】4+ Dew and no allied Elves other than Dark Elves. 【Summon】Spend 4 Dew. If the opponent has Shield, deal 10 damage to them. 【Constant】Gain Evade with an allied Mercenary, and Aura with allied Demonkin.'],
 ELF:['【조건】이슬 4 이상. 【소환시】이슬 2 획득, 공격력 9 이상 상대 몬스터 1체 선택 파괴. 【상시】아군 필드의 서로 다른 세계수 계열 1종당 +1/+1. 양 플레이어 회복량 2배','【Requires】4+ Dew. 【Summon】Gain 2 Dew; destroy 1 enemy monster with 9+ ATK. 【Constant】+1/+1 per distinct allied World Tree card. Double both players’ healing.'],
 HIGH_ELF:['【조건】이슬 10 이상. 【소환시】상대 패 전부 확인, 최대 3장 게임에서 제외. 상대 실드 전부 파괴, 자신 이슬 2배. 【상시】아군 필드의 서로 다른 세계수 계열 1종당 +2/+2. 상대 회복량 절반(버림)','【Requires】10+ Dew. 【Summon】Inspect the enemy hand and exile up to 3 cards. Destroy all enemy Shield; double your Dew. 【Constant】+2/+2 per distinct allied World Tree card. Halve enemy healing, rounded down.'],
 ELDER_ELF_KING:['【조건】이슬 12 이상. 【소환시】상대 필드 전부 파괴, 자신 이슬 3배. 【상시】아군 필드의 서로 다른 세계수 계열 1종당 +4/+4. 상대는 턴당 카드 3장까지 사용. 【파괴시】이슬 15 소비, 상대에게 30 데미지(부족시 불발)','【Requires】12+ Dew. 【Summon】Destroy the enemy field; triple your Dew. 【Constant】+4/+4 per distinct allied World Tree card. The opponent may play at most 3 cards per turn. 【Destroyed】Spend 15 Dew to deal 30 damage to the opponent; fails if insufficient.'],
};
export function localizeDewShieldCards(db: Record<string, CardDef>): void {
 for (const [id,[text,textEn]] of Object.entries(LOCALIZED)) Object.assign(db[id],{text,textEn,textJa:db[id].textJa!.replaceAll('。',' · ')});
}
