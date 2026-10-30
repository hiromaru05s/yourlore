import {PASSIVES} from './cards';
import {keywordRules} from './cardKeywordText';
import {RULE_TERM_NOTES,QUEST_RULE} from './cardEffectNotes';
import {quickSpellRule} from './cardPresentation';
import type {EffectLocale} from './cardEffectText';

type Localized = Record<EffectLocale,string>;
export type GlossaryEntry = {id:string; names:Localized; aliases?:Partial<Record<EffectLocale,string[]>>; descriptions:Localized};
const entry=(id:string,ja:string,ko:string,en:string,dja:string,dko:string,den:string):GlossaryEntry=>({id,names:{ja,ko,en},descriptions:{ja:dja,ko:dko,en:den}});
/** One definition for inline explanations and the existing expanded rule notes. */
export const CARD_RULE_GLOSSARY:GlossaryEntry[] = [
  entry('brand','烙印','낙인','Brand',
    'プレイヤーに蓄積するカウンター。自分のターン開始時、烙印カウンター1個につき6面ダイスを1個振り、合計のダメージを受ける。シールドで防げる。ダメージを受けてもカウンターは減らず、取り除く効果を使うまで残る。',
    '플레이어에게 쌓이는 카운터. 자신의 턴 시작 시 낙인 카운터 1개당 6면체 주사위 1개를 굴리고 합계만큼 데미지를 받는다. 실드로 막을 수 있다. 데미지를 받아도 카운터는 줄지 않으며 제거 효과를 사용하기 전까지 남는다.',
    'Counters on a player. At the start of your turn, roll one six-sided die per Brand counter and take damage equal to the total. Shield can absorb this damage. Taking damage does not consume Brand counters; they remain until an effect removes them.'),
  entry('shield','シールド','실드','Shield',
    'プレイヤーが受けるダメージを、体力より先に同じ数だけ肩代わりし、使った分だけ減る。残りは原則として次の相手ターン終了時に全て失う。相手ターン中に得た分も、そのターン終了時に失う。維持すると書かれた効果は例外。体力の支払いや体力を指定値にする効果は防がない。',
    '플레이어가 받는 데미지를 체력보다 먼저 같은 수치만큼 대신 받고, 사용한 만큼 줄어든다. 남은 실드는 원칙적으로 다음 상대 턴 종료 시 모두 사라진다. 상대 턴에 얻은 실드도 그 턴 종료 시 사라진다. 유지한다고 명시된 효과는 예외다. 체력 지불이나 체력을 특정 값으로 바꾸는 효과는 막지 못한다.',
    'Absorbs damage to a player before HP, spending 1 Shield per damage prevented. Remaining Shield normally expires at the end of the next opponent turn. Shield gained during an opponent turn expires at the end of that same turn. Effects that explicitly retain Shield are exceptions. Shield does not prevent HP payments or effects that set HP to a specific value.'),
  entry('dew','雫','이슬','Dew',
    'プレイヤーに蓄積する数値。自分のターン開始時、雫の数だけ自分の体力を回復する。この回復で雫は減らない。カードに雫の必要数がある場合、所持数の条件であり、消費すると明記されていなければ減らない。回復量を変える効果は適用される。',
    '플레이어에게 쌓이는 수치. 자신의 턴 시작 시 이슬 수만큼 자신의 체력을 회복한다. 이 회복으로 이슬이 줄지는 않는다. 카드의 이슬 요구량은 보유 조건이며, 소비한다고 명시하지 않으면 줄어들지 않는다. 회복량을 바꾸는 효과는 적용된다.',
    'A value accumulated by a player. At the start of your turn, restore your HP by your Dew amount. This healing does not consume Dew. A card’s Dew requirement checks how much you have; it is not spent unless the card explicitly says so. Healing modifiers still apply.'),
  entry('bleed','出血','출혈','Bleed',
    'プレイヤーに蓄積する数値。自分のターン開始時、出血の数だけダメージを受ける。シールドで防げる。ダメージを受けても出血は減らない。',
    '플레이어에게 쌓이는 수치. 자신의 턴 시작 시 출혈 수만큼 데미지를 받는다. 실드로 막을 수 있다. 데미지를 받아도 출혈은 줄지 않는다.',
    'A value accumulated by a player. At the start of your turn, take damage equal to your Bleed amount. Shield can absorb it. Taking this damage does not reduce Bleed.'),
  entry('deck','デッキ','덱','Deck',
    'カードを引く山札。手札・墓地・場・リフトを含まない。「デッキ構成」とは数える範囲が異なる。',
    '카드를 뽑는 더미. 패·묘지·필드·리프트는 포함하지 않는다. 덱 구성과는 세는 범위가 다르다.',
    'Your draw pile. Does not include your hand, graveyard, field, or Rift. This is a narrower zone than deck composition.'),
  entry('maxMana','最大マナ','최대 마나','Maximum mana',
    '自分のターン開始時に補充されるマナの基準値。現在使えるマナとは別。最大マナが増えても、現在のマナはその場では増えない。',
    '자신의 턴 시작 시 보충되는 마나의 기준치. 지금 쓸 수 있는 마나와는 별개다. 최대 마나가 증가해도 현재 마나가 즉시 늘지는 않는다.',
    'The amount your mana refills to at the start of your turn. Separate from currently available mana. Increasing maximum mana does not immediately grant current mana.'),
  entry('persistent','永続魔法','영구마법','Persistent spell',
    '発動後、場に残る種類の魔法。「永続」は無期限という意味ではない。効果の発動タイミング・終了条件・期間は各カードの本文に従う。',
    '발동 후 필드에 남는 종류의 마법. 영구라는 이름이 무기한을 뜻하지는 않는다. 효과의 발동 시점·종료 조건·기간은 각 카드의 본문을 따른다.',
    'A spell type that stays on the field after being cast. “Persistent” does not mean unlimited duration. Its text specifies when effects trigger and any duration or ending conditions.'),
  entry('hp','体力','체력','HP',
    'プレイヤーの体力が0以下になると敗北する。プレイヤーの回復に通常の上限はない。モンスターは蓄積ダメージを持ち、体力の増減ではそのダメージを消さない。モンスターの最大体力は最低1、現在体力は最大体力から蓄積ダメージを引いた値。',
    '플레이어의 체력이 0 이하가 되면 패배한다. 플레이어의 회복에는 기본 상한이 없다. 몬스터는 받은 데미지를 유지하며 체력 증감으로 그 데미지가 없어지지 않는다. 몬스터의 최대 체력은 최소 1이고 현재 체력은 최대 체력에서 누적 데미지를 뺀 값이다.',
    'A player loses at 0 HP or less. Player healing has no normal cap. Monsters retain accumulated damage when their HP stat changes. A monster’s maximum HP is at least 1; current HP is maximum HP minus accumulated damage.'),
];
CARD_RULE_GLOSSARY.push(
  entry('printedHp','印刷体力','인쇄 체력','Printed HP',
    'カードに最初から書かれている体力。場での強化・弱体化や受けたダメージを含まない。現在体力や補正後の最大体力とは別の値。',
    '카드에 원래 적힌 체력. 필드에서 받은 강화·약화나 데미지는 포함하지 않는다. 현재 체력이나 보정 후 최대 체력과는 다른 값이다.',
    'The HP originally printed on the card. Ignores buffs, debuffs, and damage taken on the field. Separate from current HP and modified maximum HP.'),
  entry('tribeSynergy','種族シナジー','종족 시너지','Tribe synergy',
    '自分の場に同じ種族のモンスターを異なるカード名で指定の種類数そろえると発動するボーナス。同名を複数並べても1種類。必要な種類数と効果は種族ごとに異なり、各段階は自分につきゲーム中1回だけ発動する。',
    '자신의 필드에 같은 종족의 몬스터를 서로 다른 카드명으로 정해진 종류 수만큼 모으면 발동하는 보너스. 같은 이름은 여러 체여도 1종류로 센다. 필요한 종류 수와 효과는 종족마다 다르며, 각 단계는 자신을 기준으로 게임 중 1회만 발동한다.',
    'A bonus triggered by controlling the required number of distinct monster names of the same tribe. Multiple copies of one name count as one. Each tribe has its own thresholds and rewards; each threshold triggers only once per game for each player.'),
  entry('quest','クエスト','퀘스트','Quest',QUEST_RULE.ja,QUEST_RULE.ko,QUEST_RULE.en),
  entry('quick','クイック魔法','퀵 마법','Quick spell',quickSpellRule('ja'),quickSpellRule('ko'),quickSpellRule('en')),
  entry('singleSpell','単発魔法','일회성 마법','Non-persistent spell',
    '効果を1回処理し、場に残らない魔法。通常は墓地へ行く。虚無やクイックなど、別の行き先が指定されている場合はその指定に従う。',
    '효과를 1회 처리하고 필드에 남지 않는 마법. 보통 묘지로 간다. 공허나 퀵 등 다른 이동 장소가 명시되어 있으면 그 규칙을 따른다.',
    'A spell that resolves once and does not stay on the field. Normally goes to the graveyard. Follow a different destination if specified, such as by Void or Quick.'),
  entry('purchaseCost','購入コスト','구매 코스트','Purchase cost',
    'マーケットから購入するために支払うマナ。手札から召喚・発動するためのコストとは区別する。カードに「購入コスト」とある場合はこちらの値を参照する。',
    '마켓에서 구매할 때 지불하는 마나. 패에서 소환·발동할 때의 코스트와 구별한다. 카드가 구매 코스트를 참조하면 이 값을 사용한다.',
    'Mana paid to buy a card from the market. Distinct from the cost to summon or cast it from your hand. Effects that specify purchase cost refer to this value.'),
  entry('summonCost','召喚コスト','소환 코스트','Summon cost',
    '手札からモンスターを召喚する時に支払うマナ。マーケットの購入コストとは別の支払い。効果で召喚する場合は、その効果の指定に従う。',
    '패에서 몬스터를 소환할 때 지불하는 마나. 마켓의 구매 코스트와는 별도의 지불이다. 효과로 소환할 때는 해당 효과의 지시를 따른다.',
    'Mana paid to summon a monster from your hand, separately from buying it at the market. Summoning through an effect follows that effect’s instructions.'),
  entry('castCost','発動コスト','발동 코스트','Cast cost',
    '手札から魔法を使用する時に支払うマナ。マーケットの購入コストとは別の支払い。無料で発動すると書かれている場合は支払わない。',
    '패에서 마법을 사용할 때 지불하는 마나. 마켓의 구매 코스트와는 별도의 지불이다. 무료로 발동한다고 명시되면 지불하지 않는다.',
    'Mana paid to cast a spell from your hand, separately from buying it at the market. An effect that explicitly casts it for free skips this payment.'),
  entry('token','トークン','토큰','Token',
    '効果によって場に直接生成されたモンスターの区分。手札や墓地へ移る代わりにリフトへ送られる。手札や墓地に新しいカードを加える効果が、全てトークンを作るわけではない。',
    '효과로 필드에 직접 생성된 몬스터의 구분. 패나 묘지로 이동하는 대신 리프트로 보내진다. 패나 묘지에 새 카드를 넣는 효과가 모두 토큰을 만드는 것은 아니다.',
    'A category of monster generated directly on the field by an effect. Goes to the Rift instead of the hand or graveyard. Adding a new card to your hand or graveyard does not automatically make it a Token.'),
  entry('pierce','貫通','관통','Piercing',
    '攻撃ダメージが相手モンスターの現在体力を超えた時、その超過分を持ち主に与える処理。気合でモンスターが残っても貫通は防げない。魔法などの効果ダメージには自動では付かない。',
    '공격 데미지가 상대 몬스터의 현재 체력을 넘으면 초과분을 소유자에게 주는 처리. 기합으로 몬스터가 살아남아도 관통은 막지 못한다. 마법 등의 효과 데미지에 자동으로 적용되지는 않는다.',
    'When attack damage exceeds an enemy monster’s current HP, the excess is dealt to its owner. Guts does not prevent this excess damage even if the monster survives. Effect damage, such as spell damage, does not automatically pierce.'),
);
const legacy = [
  ['composition','デッキ構成','덱 구성','Deck composition'],['graveyard','墓地','묘지','Graveyard'],['rift','リフト','리프트','Rift'],
  ['lasting','対象が場を離れるまで','효과를 받은 몬스터가 필드를 떠날 때까지','until the affected monster leaves the field'],['counters','カウンター','카운터','counter'],
] as const;
for(const [id,ja,ko,en] of legacy) {
  CARD_RULE_GLOSSARY.push({id,names:{ja,ko,en},descriptions:RULE_TERM_NOTES[id]});
}
CARD_RULE_GLOSSARY.find(e=>e.id==='lasting')!.aliases={ja:['各対象が場を離れるまで'],ko:['효과를 받은 각 몬스터가 필드를 떠날 때까지']};
CARD_RULE_GLOSSARY.find(e=>e.id==='quest')!.aliases={en:['quests']};
CARD_RULE_GLOSSARY.find(e=>e.id==='castCost')!.aliases={ko:['시전 코스트']};
CARD_RULE_GLOSSARY.find(e=>e.id==='pierce')!.aliases={en:['pierce','overflow damage']};
CARD_RULE_GLOSSARY.find(e=>e.id==='quick')!.aliases={ko:['퀵마법'],en:['quick spells']};
CARD_RULE_GLOSSARY.find(e=>e.id==='maxMana')!.aliases={en:['max mana']};
CARD_RULE_GLOSSARY.find(e=>e.id==='brand')!.aliases={ja:['烙印カウンター'],ko:['낙인 카운터'],en:['Brand counters','Brand counter']};
CARD_RULE_GLOSSARY.find(e=>e.id==='persistent')!.aliases={ko:['영구 마법','지속 마법'],en:['persistent spells']};
CARD_RULE_GLOSSARY.find(e=>e.id==='counters')!.aliases={en:['counters']};
for(const [key,p] of Object.entries(PASSIVES)) CARD_RULE_GLOSSARY.push({id:'passive:'+key,names:{ja:p.ja.name,ko:p.ko.name,en:p.en.name},descriptions:{ja:p.ja.desc,ko:p.ko.desc,en:p.en.desc}});

CARD_RULE_GLOSSARY.find(e=>e.id==='passive:counter')!.aliases={en:['counterattack','counterattacking','counterattacks']};

export function glossaryParagraphs(id:string,lang:EffectLocale):{label:string;text:string}[] {
  if(id.startsWith('passive:'))return keywordRules(id.slice(8),lang);
  const e=CARD_RULE_GLOSSARY.find(e=>e.id===id);return e?[{label:'',text:e.descriptions[lang]}]:[];
}
export function ruleTermParts(text:string,lang:EffectLocale):{text:string;term?:string}[] {
  const choices=CARD_RULE_GLOSSARY.flatMap(e=>[e.names[lang],...(e.aliases?.[lang]??[])].map(name=>({name,id:e.id}))).sort((a,b)=>b.name.length-a.name.length||Number(b.id.startsWith('passive:'))-Number(a.id.startsWith('passive:')));
  const parts:{text:string;term?:string}[]=[];let plain='';
  for(let i=0;i<text.length;) {
    const c=choices.find(c=>{
      const slice=text.slice(i,i+c.name.length);
      // Passive Counter is a named ability; lowercase counter(s) is a quantity marker.
      const match=lang==='en'&&!c.id.startsWith('passive:')?slice.toLowerCase()===c.name.toLowerCase():slice===c.name;
      if(!match)return false;
      if(lang==='en'&&(/[a-zA-Z]$/.test(text.slice(0,i))||/^[a-zA-Z]/.test(text.slice(i+c.name.length))))return false;
      if(lang==='ko'&&/[가-힣]$/.test(text.slice(0,i)))return false;
      return true;
    });
    if(!c){plain+=text[i++];continue;}
    if(plain){parts.push({text:plain});plain='';}parts.push({text:text.slice(i,i+c.name.length),term:c.id});i+=c.name.length;
  }
  if(plain)parts.push({text:plain});return parts;
}
