import type {CardDef} from './types';

export const HEXER_SPELLS: CardDef[] = [
  {id:'HEX_BRAND', t:'spell', cost:3, act:'expansion', nameJa:'呪術烙印', name:'주술 낙인', nameEn:'Hex Brand',
    textJa:'【発動時】相手の墓地に「呪い」を2枚追加する。その後、条件を満たす効果を1つまで選ぶ。相手に烙印があれば相手に呪印5個を付与する。相手に呪印があれば相手に烙印1個を付与する。',
    text:'【발동 시】상대 묘지에 저주 2장을 추가한다. 그 후 조건을 충족하는 효과를 최대 1개 선택한다. 상대에게 낙인이 있으면 상대에게 주인 5개를 준다. 상대에게 주인이 있으면 상대에게 낙인 1개를 준다.',
    textEn:'【On Cast】Add 2 Curses to the opponent’s graveyard. Then choose up to 1 eligible effect. If the opponent has Brand, give them 5 Curse Seals. If they have a Curse Seal, give them 1 Brand.'},
  {id:'HEX_PUPPET', t:'spell', cost:5, act:'expansion', nameJa:'操り人形', name:'꼭두각시', nameEn:'Marionette',
    textJa:'【発動時】相手の墓地に「呪い」を4枚追加する。その後、自分の場に「かかし」1体を召喚する。',
    text:'【발동 시】상대 묘지에 저주 4장을 추가한다. 그 후 자신의 필드에 허수아비 1체를 소환한다.',
    textEn:'【On Cast】Add 4 Curses to the opponent’s graveyard. Then summon 1 Scarecrow to your field.'},
];

export function applyHexerRework(db: Record<string,CardDef>): void {
  for (const [id,atk,def,base] of [['NHEX',1,2,1],['HEXER1',2,2,1],['HEXER2',3,4,2],['HEXER3',3,6,3]] as const) {
    Object.assign(db[id],{atk,def,onSummon:'hexSummon',val:base});
    delete db[id].val2;
  }
  delete db.NHEX.turnFx;
  db.HEXER2.condAtk='hexCurses';
  db.HEXER3.aura='hexArmy';
  Object.assign(db.HEXER4,{atk:14,def:10,onSummon:'copySeals',summonReq:'tenSeals',attackFx:'spendSeal'});
  delete db.HEXER4.aura;
  delete db.HEXER4.val;
  for (const c of HEXER_SPELLS) db[c.id]=c;
}
