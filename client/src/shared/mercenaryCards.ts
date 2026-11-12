import type {CardDef} from './types';

function mercenary(id: string, nameJa: string, name: string, nameEn: string, cost: number, atk: number, def: number, reward: number): CardDef {
  const leader = id === 'MERC_LEADER', master = id === 'MERC_MASTER';
  return {
    id, nameJa, name, nameEn, cost, atk, def, val: reward, val2: cost, t: 'mon', onSummon: 'expansion',
    textJa: `【購入時】マーケットからこのカードを購入した時、自分の場に「傭兵」系モンスターがいれば、購入したこのカードをそのまま召喚する。いなければ、追加で1マナを支払って召喚してもよい。\n\n【召喚時】依頼を1つ選ぶ。\n賞金首：相手の場のモンスター1体を指名する。この傭兵が戦闘でその相手を倒すと、自分は${reward}マナを得る。相手が場を離れると指名は終了する。\n荒事：相手の場のモンスター1体に${cost}ダメージを与える。` +
      (leader ? '\n護衛：このモンスターは挑発を得る。' : master ? '\n護衛：「傭兵リーダー」1体を召喚する。この依頼はこのカードの召喚1回につき1度まで選べる。' : ''),
    text: `【구매 시】마켓에서 이 카드를 구매할 때 자신의 필드에 용병 계열 몬스터가 있으면 구매한 이 카드를 즉시 소환한다. 없으면 마나 1을 추가로 지불하고 소환할 수 있다.\n\n【소환 시】의뢰 1개를 선택한다.\n현상 수배: 상대 필드의 몬스터 1체를 지목한다. 이 용병이 전투로 그 몬스터를 처치하면 자신은 마나를 ${reward} 얻는다. 대상이 필드를 떠나면 지목이 끝난다.\n무력 행사: 상대 필드의 몬스터 1체에게 피해를 ${cost} 준다.` +
      (leader ? '\n호위: 이 몬스터가 도발을 얻는다.' : master ? '\n호위: 용병 리더 1체를 소환한다. 이 의뢰는 이 카드의 소환당 1번만 선택할 수 있다.' : ''),
    textEn: `【On Purchase】When you buy this card from the market, summon the purchased card immediately if you control a Mercenary-family monster. Otherwise, you may pay 1 extra mana to summon it.\n\n【On Summon】Choose 1 contract.\nBounty: Mark 1 opposing monster. Gain ${reward} mana when this Mercenary defeats it in battle. The mark expires when the target leaves the field.\nRough Work: Deal ${cost} damage to 1 opposing monster.` +
      (leader ? '\nEscort: This monster gains Taunt.' : master ? '\nEscort: Summon 1 Mercenary Leader. You can choose Escort once per summon of this card.' : ''),
  };
}

export const MERCENARY_CARDS = [
  mercenary('MERCENARY', '傭兵', '용병', 'Mercenary', 1, 2, 1, 1),
  mercenary('MERC_LEADER', '傭兵リーダー', '용병 리더', 'Mercenary Leader', 3, 4, 3, 2),
  mercenary('MERC_MASTER', '傭兵ギルドマスター', '용병 길드 마스터', 'Mercenary Guildmaster', 5, 6, 5, 3),
];
export const MERC_IDS = new Set(MERCENARY_CARDS.map(card => card.id));
