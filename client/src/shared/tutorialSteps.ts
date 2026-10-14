/** Versioned reward identities: old claims keep their meaning. Total = 3,000. */
export type TutorialLang = 'ja' | 'en' | 'ko';
export type LessonId = 'mana' | 'summon' | 'combat' | 'spell' | 'cycle' | 'market' | 'rift' | 'chest' | 'enchant' | 'tribe' | 'hand' | 'duel';
export type Copy = Record<TutorialLang, string>;
export interface TutStepMeta { id: LessonId; key: string; reward: number; title: Copy; body: Copy; learned: Copy; }
const copy = (ja: string, en: string, ko: string): Copy => ({ ja, en, ko });
const lesson = (id: LessonId, title: Copy, body: Copy, learned: Copy): TutStepMeta => ({id, key: `tutorial:v2:${id}`, reward: 250, title, body, learned});
const LESSONS: TutStepMeta[] = [
  lesson('mana', copy('マナを増やす', 'Grow your mana', '마나 늘리기'),
    copy('マナはカードを使うためのエネルギー。アチューンを使うと、次のターンから使えるマナが増えるよ。', 'Mana is the energy for cards. Attune raises the amount you can use from your next turn.', '마나는 카드에 쓰는 에너지예요. 어튠을 쓰면 다음 턴부터 쓸 수 있는 마나가 늘어요.'),
    copy('マナ3を使い、最大マナが4から5に。残りのマナと、次のターンに回復する量は別だよ。', 'Spend 3 mana to raise your maximum from 4 to 5. Mana left now and next turn’s refill are different.', '마나 3을 써서 최대 마나를 4에서 5로 늘렸어요. 지금 남은 마나와 다음 턴에 회복할 양은 달라요.')),
  lesson('summon', copy('モンスターで攻撃する', 'Play a monster and attack', '몬스터로 공격하기'),
    copy('目標は相手の精神力を0にすること。まずはモンスターを1体出して、相手を攻撃してみよう。', 'Your goal is to bring the opponent’s Spirit to zero. Start by playing one monster and attacking.', '목표는 상대 정신력을 0으로 만드는 거예요. 먼저 몬스터 한 장을 내고 공격해 봐요.'),
    copy('攻撃で相手の精神力を減らせたね！ 出したターンから攻撃できるよ。もう一度攻撃するには、次の自分のターンを待とう。', 'Your attack lowered their Spirit! Monsters can attack right away, then wait until your next turn.', '공격으로 상대 정신력을 줄였어요! 낸 턴부터 공격할 수 있고, 다시 공격하려면 다음 자신의 턴을 기다려요.')),
  lesson('combat', copy('相手のモンスターを倒す', 'Defeat an enemy monster', '상대 몬스터 쓰러뜨리기'),
    copy('相手の場にモンスターがいるときは、まずそのモンスターを攻撃するよ。', 'When the opponent has a monster on the field, attack that monster first.', '상대 필드에 몬스터가 있으면 먼저 그 몬스터를 공격해요.'),
    copy('相手のモンスターを倒せたね！ 倒すのに必要な分を超えたダメージは、相手の精神力へ。これを「貫通」と呼ぶよ。', 'You defeated the enemy monster! Damage beyond what was needed to defeat it hits the opponent’s Spirit. That is overflow.', '상대 몬스터를 쓰러뜨렸어요! 쓰러뜨리는 데 필요한 양을 넘은 피해가 상대 정신력에 들어가요. 이것이 관통이에요.')),
  lesson('spell', copy('魔法で味方を強くする', 'Strengthen a monster with magic', '마법으로 아군 강화하기'),
    copy('魔法はカードに書かれた効果を起こすよ。シャープンで、自分のモンスターの攻撃力を上げよう。', 'Spells do what their card says. Use Sharpen to raise your monster’s attack.', '마법은 카드에 적힌 효과를 일으켜요. 샤픈으로 아군 몬스터의 공격력을 올려 봐요.'),
    copy('魔法を使ってから、効果をかける相手を選べたね。シャープンの強化は、そのモンスターが場にいる間続くよ。', 'You played a spell, then chose its target. Sharpen’s bonus lasts while that monster stays on the field.', '마법을 쓴 뒤 효과를 받을 대상을 골랐어요. 샤픈의 강화는 그 몬스터가 필드에 있는 동안 유지돼요.')),
  lesson('cycle', copy('カードを購入する', 'Buy a card', '카드 구매하기'),
    copy('マーケットは、マナでカードを購入する場所。購入したカードが手札に届くまでを見てみよう。', 'The market is where you buy cards with mana. Follow a purchase on its way to your hand.', '마켓은 마나로 카드를 구매하는 곳이에요. 구매한 카드가 손패에 올 때까지 따라가 봐요.'),
    copy('購入 → 墓地 → デッキ → 手札。購入したカードはすぐには使えないよ。今回はデッキを空にして、すぐ引ける練習にしたよ。', 'Purchase → graveyard → deck → hand. Purchases cannot be played straight away. This practice uses an empty deck so you can draw yours quickly.', '구매 → 묘지 → 덱 → 손패. 구매한 카드를 바로 쓸 수는 없어요. 이번 연습은 덱을 비워 두어 바로 뽑을 수 있게 했어요.')),
  lesson('hand', copy('ターンを終える', 'End your turn', '턴 끝내기'),
    copy('ターンは「自分が行動する番」。終わったら相手の番になるよ。手札が多いときの終わり方も試そう。', 'A turn is your chance to act. Then it is the opponent’s turn. Try ending with too many cards in hand.', '턴은 자신이 행동하는 차례예요. 끝내면 상대 차례가 돼요. 손패가 많을 때 턴을 끝내 봐요.'),
    copy('残した7枚は次のターンも使えるよ。自分の番になると、マナが回復し、デッキから3枚引くよ。', 'The seven cards you kept stay in your hand. At your next turn, mana refills and you draw three cards.', '남긴 7장은 다음 턴에도 쓸 수 있어요. 자신의 차례가 오면 마나가 회복되고 덱에서 3장을 뽑아요.')),
  lesson('market', copy('買えるカードを入れ替える', 'Change the cards on offer', '구매할 카드 바꾸기'),
    copy('提示マーケットは、自分だけのカード売り場。ほしいカードがなければ、マナ1で入れ替えられるよ。', 'The offer market is your own selection of cards. Spend 1 mana to change it if nothing fits.', '제시 마켓은 자신만의 카드 목록이에요. 원하는 카드가 없으면 마나 1로 바꿀 수 있어요.'),
    copy('固定マーケットは7枠。提示マーケットは3枠で、自分のターンにも入れ替わるよ。', 'The fixed market has seven slots. Your three offer slots also refresh at the start of your turn.', '고정 마켓은 7칸이에요. 제시 마켓 3칸은 자신의 턴 시작에도 바뀌어요.')),
  lesson('rift', copy('いらないカードを減らす', 'Remove an unwanted card', '필요 없는 카드 줄이기'),
    copy('デッキのカードを減らすと、ほしいカードを引きやすくなるよ。カルを使って試そう。', 'A smaller deck makes the cards you want easier to draw. Try using Cull.', '덱의 카드를 줄이면 원하는 카드를 뽑기 쉬워져요. 컬을 써 봐요.'),
    copy('カルは「リフト」へ移ったね。墓地のカードはまた引けるけれど、リフトのカードはふつう戻らないよ。', 'Cull moved to the Rift. Graveyard cards can be drawn again; Rift cards normally stay out of this game.', '컬이 리프트로 갔어요. 묘지의 카드는 다시 뽑을 수 있지만 리프트의 카드는 보통 돌아오지 않아요.')),
  lesson('chest', copy('宝箱を開ける', 'Open a chest', '보물상자 열기'),
    copy('宝箱はサイコロで効果が決まるカード。どの目が出ても、この練習はクリアだよ。', 'A chest’s effect is decided by a die. Any roll clears this practice.', '보물상자는 주사위로 효과가 정해져요. 어떤 숫자가 나와도 이번 연습은 완료예요.'),
    copy('サイコロの目は選べないよ。カードを右クリックすると、どんな結果があるか確認できるよ。', 'You cannot choose the roll. Right-click the card to see its possible outcomes.', '주사위 숫자는 고를 수 없어요. 카드를 우클릭하면 가능한 결과를 볼 수 있어요.')),
  lesson('enchant', copy('次のターンに働く魔法', 'Magic for your next turn', '다음 턴에 발동하는 마법'),
    copy('「知識の泉」は、場に残って次の自分のターンに働く魔法。使ってからターンを終えよう。', 'Fountain of Knowledge stays on the field and works on your next turn. Play it, then end the turn.', '지식의 샘은 필드에 남아 다음 자신의 턴에 발동해요. 사용한 뒤 턴을 끝내 봐요.'),
    copy('次の自分のターンに効果が出たね。すぐ働く魔法も、場に残る魔法も、使うタイミングを考えよう。', 'It worked on your next turn. Some spells act right away; others stay on the field. Think about when you need them.', '다음 자신의 턴에 효과가 나왔어요. 바로 발동하는 마법과 필드에 남는 마법은 쓸 때를 생각해 봐요.')),
  lesson('tribe', copy('同じ種族の仲間をそろえる', 'Gather monsters of one tribe', '같은 종족 모으기'),
    copy('「種族」はモンスターの仲間分け。同じ種族の、ちがう名前のカードを2体出してみよう。', 'A tribe is a group of related monsters. Play two different cards from the same tribe.', '종족은 몬스터의 무리예요. 같은 종족이지만 이름이 다른 카드 두 장을 내 봐요.'),
    copy('仲間をそろえて特別な効果が出たね。同じ名前のカードを2枚出すだけでは、2種類には数えないよ。', 'Your tribe triggered a special effect. Two copies of the same card do not count as two different cards.', '동족을 모아 특별한 효과가 나왔어요. 같은 이름의 카드 두 장은 서로 다른 두 종류로 세지 않아요.')),
  lesson('duel', copy('自分で勝ってみよう', 'Win a practice game', '직접 이겨 보기'),
    copy('相手の精神力は8。手札のモンスターと魔法を使って、0にしよう。ここからは、行動する順番も自分で決めてね。', 'The opponent has 8 Spirit. Use your monsters and spell to bring it to zero. Choose your own order of actions now.', '상대 정신력은 8이에요. 손패의 몬스터와 마법으로 0을 만들어 봐요. 이제 행동 순서도 직접 정해 보세요.'),
    copy('勝てたね！ カードを使う、攻撃する、購入する、ターンを終える。次はBOT戦で試してみよう。', 'You won! Play cards, attack, buy cards, and end your turn. You are ready to try a bot game.', '이겼어요! 카드 사용, 공격, 카드 구매, 턴 종료를 배웠어요. 다음에는 BOT전에서 해 봐요.')),
];
export const TUTORIAL_ORDER: LessonId[] = ['summon','combat','mana','spell','cycle','hand','market','rift','chest','enchant','tribe','duel'];
export const TUT_STEPS = TUTORIAL_ORDER.map(id => LESSONS.find(s => s.id === id)!);
export const TUTORIAL_TOTAL = TUT_STEPS.reduce((n, s) => n + s.reward, 0);
