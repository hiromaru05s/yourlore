import type { CardDef, QuestEvent } from './types';

const quest = (id: string, cost: number, nameJa: string, textJa: string, event: QuestEvent, target: number): CardDef => ({
  id, t: 'quest', cost, play: cost, name: nameJa, nameJa, text: textJa, textJa, quest: { event, target },
});
const quick = (id: string, cost: number, nameJa: string, textJa: string): CardDef => ({
  id, t: 'spell', quick: true, cost, name: nameJa, nameJa, text: `購入時：${textJa}。使用後、ゲームから除外。`, textJa: `【購入時】${textJa}。使用後、ゲームから除外。`,
});

export const QUEST_QUICK_CARDS: CardDef[] = [
  quest('Q_RIFT', 2, 'リフト研究', '【条件】自分のカードを10枚ゲームから除外する。【報酬】新しいカル7枚を生成して自分のリフトへ追加する。', 'exile', 10),
  { ...quest('Q_BRAND', 2, '反撃の狼煙', '【条件】相手から累計40ダメージを受ける。【報酬】相手プレイヤーに烙印カウンターを1個付与する。', 'opponentDamage', 40), val: 1 },
  quest('Q_TORI', 2, '精霊 - トリ', '【条件】自分の場にモンスターがいない状態で、自分のターンを5回終了する。【報酬】自分の最大体力+30。', 'emptyTurn', 5),
  quest('Q_WINTER', 2, '精霊 - ウィンター', '【条件】自分の最大体力を累計30上昇させる。【報酬】自分の最大マナ+2。', 'maxHp', 30),
  quest('Q_TRIBE', 3, '一族の誓い', '【条件】種族モンスターを6回召喚する。【報酬】自分の場の種族モンスターと同じ種族で、場にいない異なるモンスター1体を選び召喚する。', 'tribeSummon', 6),
  quest('Q_CASTLE', 3, '対攻城作戦', '【条件】自分の場に「城」が連続9ターン存在する（双方のターン終了時に数える）。【報酬】「騎士」3体を自分の場に召喚する。', 'castleTurn', 9),
  quest('Q_DECAY', 3, 'どくびし', '【条件】腐敗の効果で相手モンスターを4体破壊する。【報酬】相手プレイヤーに30ダメージ。', 'decayKill', 4),
  quest('Q_ASSASSIN', 3, 'アサシンギルドの伝達', '【条件】「アサシン」系モンスターで相手プレイヤーに6回ダメージを与える。【報酬】相手の場のカード1枚を選び、ゲームから除外する。', 'assassinHit', 6),
  quest('Q_MANA', 3, 'マナ順応', '【条件】魔法カードを25回プレイする。【報酬】自分の最大マナ+4。', 'spellPlay', 25),
  quick('QUICK_MIMIC', 3, 'ミミックパーティー', '「ミミック」1体を自分の場に召喚し、新たな「ミミック」2枚を自分のリフトに追加する'),
  quick('QUICK_SURVIVAL', 2, '生存をかけた戦い', '自分の体力が15以下の場合のみ購入可能。「生きているダンジョン」を自分の場に召喚する'),
  quick('QUICK_POISON', 1, 'ポイズン', '相手モンスター1体を選び、腐敗カウンターを2個付与する'),
  quick('QUICK_WORLD', 3, '世界樹の恵み', '自分の場に「エルフ」「世界樹」系カードがある場合のみ購入可能。「世界樹の心臓」を自分の場に展開する'),
  quick('QUICK_MUSTER', 3, '緊急召集', '自分の場に「城」がある場合のみ購入可能。「兵士」3体を自分の場に召喚する'),
  quick('QUICK_SORT', 3, '選別の掟', '自分のリフトにカルが10枚以上ある場合のみ購入可能。相手の場のカード1枚を選び破壊する'),
  quick('QUICK_REBIRTH', 3, '強制輪廻', '自分の墓地にモンスターがある場合のみ購入可能。そのうち1体を選び、コスト7以下なら虚無を付与して自分の場に召喚する'),
  quick('QUICK_ATTUNE', 4, 'アチューン・瞬', '自分の最大マナ+1、最大体力+2'),
  quick('QUICK_GRIMOIRE', 2, '呪術魔法書', 'このターン、自分が手札からプレイする魔法カードのコスト-1'),
  quick('QUICK_ASSAULT', 2, '総攻撃', '自分の場の異なるモンスター2体を選び、このターンのみ攻撃力+2'),
];

// Keep authored text in all three languages; no machine-generated fallback in the live catalog.
const LOCALIZED: Record<string, [string, string, string, string]> = {
  Q_RIFT: ['리프트 연구', '【조건】자신 카드 10장 게임에서 제외. 【보상】새로운 컬 7장을 생성해 자신 리프트에 추가.', 'Rift Research', 'Quest: Exile 10 of your cards. Reward: Create 7 new Culls in your Rift.'],
  Q_BRAND: ['반격의 봉화', '【조건】상대에게 누적 40 데미지를 받는다. 【보상】상대 플레이어에게 낙인 카운터 1개 부여.', 'Signal of Retaliation', 'Quest: Take 40 damage from your opponent. Reward: Give the opponent 1 Brand counter.'],
  Q_TORI: ['정령 - 토리', '【조건】자신 필드에 몬스터가 없는 상태로 자신의 턴 5회 종료. 【보상】자신 최대 체력 +30.', 'Spirit - Tori', 'Quest: End 5 of your turns with no monsters on your field. Reward: Your max HP +30.'],
  Q_WINTER: ['정령 - 윈터', '【조건】자신 최대 체력을 누적 30 올린다. 【보상】자신 최대 마나 +2.', 'Spirit - Winter', 'Quest: Increase your max HP by a total of 30. Reward: Your max mana +2.'],
  Q_TRIBE: ['일족의 맹세', '【조건】종족 몬스터 6회 소환. 【보상】자신 필드의 종족과 같고 필드에 없는 다른 몬스터 1체 선택 소환.', 'Clan Oath', 'Quest: Summon tribal monsters 6 times. Reward: Choose and summon 1 missing monster of a tribe on your field.'],
  Q_CASTLE: ['대공성 작전', '【조건】자신 필드에 성이 연속 9턴 존재 (양쪽 턴 종료에 계산). 【보상】기사 3체 자신 필드에 소환.', 'Counter-Siege Operation', 'Quest: Keep your Castle for 9 consecutive turns (both sides). Reward: Summon 3 Knights on your field.'],
  Q_DECAY: ['독압정', '【조건】부패 효과로 상대 몬스터 4체 파괴. 【보상】상대 플레이어에게 30 데미지.', 'Toxic Spikes', 'Quest: Destroy 4 enemy monsters through Decay. Reward: Deal 30 damage to the opponent.'],
  Q_ASSASSIN: ['암살자 길드의 전언', '【조건】암살자 계열 몬스터로 상대 플레이어에게 6회 데미지. 【보상】상대 필드 카드 1장 선택, 게임에서 제외.', 'Assassin Guild Dispatch', 'Quest: Assassins damage the enemy player 6 times. Reward: Choose and exile 1 enemy field card.'],
  Q_MANA: ['마나 순응', '【조건】마법 카드 25회 사용. 【보상】자신 최대 마나 +4.', 'Mana Adaptation', 'Quest: Play 25 spell cards. Reward: Your max mana +4.'],
  QUICK_MIMIC: ['미믹 파티', '【구매시】미믹 1체 자신 필드에 소환, 새로운 미믹 2장 자신 리프트에 추가.', 'Mimic Party', 'On purchase: Summon 1 Mimic on your field and add 2 new Mimics to your Rift.'],
  QUICK_SURVIVAL: ['생존을 건 싸움', '【구매시】자신 체력 15 이하일 때만 구매 가능. 살아있는 던전 자신 필드에 소환.', 'Fight for Survival', 'On purchase: Buy only at 15 HP or less. Summon a Living Dungeon on your field.'],
  QUICK_POISON: ['포이즌', '【구매시】상대 몬스터 1체 선택, 부패 카운터 2개 부여.', 'Poison', 'On purchase: Give 2 Decay counters to 1 enemy monster.'],
  QUICK_WORLD: ['세계수의 은혜', '【구매시】자신 필드에 엘프·세계수 계열 카드가 있을 때만 구매 가능. 세계수의 심장을 자신 필드에 전개.', 'World Tree’s Blessing', 'On purchase: Requires your Elf/World Tree-family card. Deploy World Tree’s Heart on your field.'],
  QUICK_MUSTER: ['긴급 소집', '【구매시】자신 필드에 성이 있을 때만 구매 가능. 병사 3체 자신 필드에 소환.', 'Emergency Muster', 'On purchase: Buy only with a Castle on your field. Summon 3 Soldiers on your field.'],
  QUICK_SORT: ['선별의 법칙', '【구매시】자신 리프트에 컬 10장 이상일 때만 구매 가능. 상대 필드 카드 1장 선택 파괴.', 'Law of Selection', 'On purchase: Buy only with at least 10 Culls in your Rift. Destroy 1 chosen enemy field card.'],
  QUICK_REBIRTH: ['강제 윤회', '【구매시】자신 묘지에 몬스터가 있어야 구매 가능. 1체 선택, 코스트 7 이하면 공허를 부여해 자신 필드에 소환.', 'Forced Rebirth', 'On purchase: Needs a graveyard monster. Choose 1; if cost ≤7, summon it to your field with Void.'],
  QUICK_ATTUNE: ['어튠 - 순', '【구매시】자신 최대 마나 +1, 최대 체력 +2.', 'Attune - Flash', 'On purchase: Your max mana +1 and max HP +2.'],
  QUICK_GRIMOIRE: ['주술 마법서', '【구매시】이번 턴 자신이 패에서 사용하는 모든 마법 카드의 코스트 -1.', 'Sorcery Grimoire', 'On purchase: Your spells played from hand cost 1 less this turn.'],
  QUICK_ASSAULT: ['총공격', '【구매시】자신 필드의 서로 다른 몬스터 2체 선택, 이번 턴 공격력 +2.', 'All-Out Assault', 'On purchase: Give 2 different monsters on your field +2 ATK this turn.'],
};
for (const card of QUEST_QUICK_CARDS) {
  const [name, text, nameEn, textEn] = LOCALIZED[card.id];
  Object.assign(card, { name, text, nameEn, textEn: textEn.replace('Quest:', '【Quest】').replace('Reward:', '【Reward】').replace('On purchase:', '【Purchase】') });
  if (card.quick) card.textJa = card.textJa!.replace("。使用後、ゲームから除外。", "。");
  card.textJa = card.textJa!.replaceAll('。', ' · ').replace(/ · $/, '');
}
