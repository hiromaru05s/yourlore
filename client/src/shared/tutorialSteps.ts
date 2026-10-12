/** Versioned reward identities: old claims keep their meaning. Total = 3,000. */
export type TutorialLang = 'ja' | 'en' | 'ko';
export type LessonId = 'mana' | 'summon' | 'combat' | 'spell' | 'cycle' | 'market' | 'rift' | 'chest' | 'enchant' | 'tribe' | 'hand' | 'duel';
type Copy = Record<TutorialLang, string>;
export interface TutStepMeta { id: LessonId; key: string; reward: number; title: Copy; body: Copy; learned: Copy; }
const copy = (ja: string, en: string, ko: string): Copy => ({ ja, en, ko });
const lesson = (id: LessonId, title: Copy, body: Copy, learned: Copy): TutStepMeta => ({id, key: `tutorial:v2:${id}`, reward: 250, title, body, learned});
export const TUT_STEPS: TutStepMeta[] = [
  lesson('mana', copy('マナを汲む', 'Draw upon mana', '마나 끌어오기'),
    copy('画面下の手札を押して広げ、アチューンを盤面へドラッグしよう。マナを支払うと、最大マナが1増える。使ったマナは次の自分のターンに回復するよ。', 'Press your hand at the bottom to expand it, then drag Attune onto the board. Pay mana to raise your maximum by 1. Spent mana refills at the start of your next turn.', '화면 아래 손패를 눌러 펼친 뒤 어튠을 필드로 드래그하세요. 마나를 지불하면 최대 마나가 1 늘어나요. 사용한 마나는 다음 자신의 턴에 회복돼요.'),
    copy('現在のマナと最大マナは別の数値。借用とカード使用で同じマナを使う。', 'Available mana and maximum mana are different. Buying and playing share the same resource.', '현재 마나와 최대 마나는 달라요. 구매와 카드 사용에 같은 마나를 써요.')),
  lesson('summon', copy('最初の具現化', 'Your first summon', '첫 소환'),
    copy('手札のブレード・ヘアを使って召喚し、場のそのカードを選んで攻撃しよう。相手の場が空なら、精神力へ直接届くよ。右クリック・長押しでカードの詳細も読める。', 'Summon Blade Hare from your hand, then select it on the field to attack. An empty enemy field lets you hit their Spirit directly. Right-click or long-press cards for details.', '손패의 블레이드 헤어를 소환한 뒤 필드에서 선택해 공격하세요. 상대 필드가 비어 있으면 정신력을 직접 공격해요. 우클릭·길게 누르기로 카드 상세를 볼 수 있어요.'),
    copy('通常は召喚したターンから攻撃できる。攻撃後は疲労し、次の自分のターンに戻る。', 'Monsters can normally attack on the turn they are summoned. After attacking, they ready on your next turn.', '보통 소환한 턴부터 공격할 수 있어요. 공격 후에는 다음 자신의 턴에 다시 준비돼요.')),
  lesson('combat', copy('攻撃と貫通', 'Combat and overflow', '공격과 관통'),
    copy('自分のブレード・ヘアを選び、相手のスパーク・インプを攻撃しよう。攻撃対象を選んで、残り体力と相手の精神力の変化を見てね。', 'Select your Blade Hare, then target the enemy Spark Imp. Watch its remaining health and the opponent’s Spirit.', '자신의 블레이드 헤어를 선택한 뒤 상대 스파크 임프를 공격하세요. 남은 체력과 상대 정신력의 변화를 확인해 보세요.'),
    copy('ダメージは蓄積する。破壊時の超過ダメージは相手へ貫通し、通常の反撃ダメージはない。', 'Damage persists. Excess damage from a killing blow hits the opponent. Ordinary attacks cause no retaliation.', '피해는 누적돼요. 처치 시 초과 피해는 상대에게 관통하며, 일반 공격에는 반격 피해가 없어요.')),
  lesson('spell', copy('魔法と対象', 'Spells and targets', '마법과 대상'),
    copy('手札のシャープンを使い、自分のモンスターを対象に選ぼう。対象を選ぶ魔法は、選択が終わるまで効果が確定しないよ。', 'Play Sharpen and choose your monster as its target. A targeted spell resolves after you finish choosing.', '샤픈을 사용하고 자신의 몬스터를 대상으로 선택하세요. 대상 선택을 마쳐야 마법 효과가 확정돼요.'),
    copy('シャープンの強化はそのモンスターが場にいる間続く。「このターン」の効果とは違う。購入と発動のコストも確認しよう。', 'Sharpen lasts while that monster remains on the field, unlike “this turn” bonuses. Purchase and play costs can differ.', '샤픈의 강화는 그 몬스터가 필드에 있는 동안 유지돼요. 이번 턴 효과와 달라요. 구매·사용 비용도 확인하세요.')),
  lesson('cycle', copy('借用とデッキの循環', 'Borrow and draw', '구매와 덱 순환'),
    copy('固定マーケットのブレード・ヘアを借りよう。購入先は手札ではなく墓地。その後ターンを終了し、デッキが空になると墓地から戻ることを確かめよう。', 'Buy Blade Hare from the fixed market. It goes to the graveyard, not your hand. End your turn and watch it return when your empty deck refills.', '고정 마켓에서 블레이드 헤어를 구매하세요. 손패가 아닌 묘지로 가요. 턴을 종료하고 빈 덱이 묘지에서 보충되는 것을 확인하세요.'),
    copy('デッキが尽きると墓地を混ぜて再利用。カードを借りながら、そのデュエルのデッキを育てる。', 'When the deck runs out, the graveyard is shuffled back. Purchases grow your deck during that duel.', '덱이 소진되면 묘지를 섞어 다시 사용해요. 구매로 해당 듀얼의 덱을 키워요.')),
  lesson('market', copy('提示を更新する', 'Refresh the offer', '제시 갱신'),
    copy('提示マーケットの更新ボタンを押そう。1マナで提示が入れ替わる。固定7枠と、自分用の提示3枠を見比べてね。', 'Press the offer refresh button. It costs 1 mana. Compare the seven fixed slots with your three offer slots.', '제시 갱신 버튼을 누르세요. 마나 1을 사용해 제시를 바꿔요. 고정 7칸과 자신 전용 제시 3칸을 비교해 보세요.'),
    copy('提示は自分のターンにも更新される。クイック魔法は購入時に発動してリフトへ行き、デッキには入らない。', 'Offers also refresh on your turn. Quick spells resolve on purchase and leave through the Rift instead of entering your deck.', '제시는 자신의 턴에도 갱신돼요. 퀵 마법은 구매 즉시 발동하고 리프트로 가며 덱에는 들어가지 않아요.')),
  lesson('rift', copy('カルとリフト', 'Cull and the Rift', '컬과 리프트'),
    copy('手札のカルを使ってみよう。墓地ではなくリフトへ移る。デッキを軽くすると、借りたカードを引きやすくなるよ。', 'Play Cull. It leaves through the Rift instead of the graveyard. A smaller deck brings your purchased cards back more often.', '손패의 컬을 사용하세요. 묘지가 아닌 리프트로 이동해요. 덱이 작아지면 구매한 카드를 더 자주 뽑을 수 있어요.'),
    copy('墓地は循環し、リフトのカードは通常そのデュエルでは戻らない。例外はカードの効果に書かれている。', 'The graveyard cycles; Rift cards normally stay out for the duel. Card effects describe exceptions.', '묘지는 순환하지만 리프트의 카드는 보통 해당 듀얼에서 돌아오지 않아요. 예외는 카드 효과에 적혀 있어요.')),
  lesson('chest', copy('宝箱とダイス', 'Chests and dice', '보물상자와 주사위'),
    copy('宝箱を使って、ダイスの結果を確かめよう。先にカードを拡大すると結果の表を読める。出目は選べないので、どの結果でもクリアだよ。', 'Open the chest and inspect the dice result. Enlarge the card first to read its outcome table. Any roll completes this lesson.', '보물상자를 열고 주사위 결과를 확인하세요. 먼저 카드를 확대하면 결과표를 읽을 수 있어요. 어떤 결과라도 완료돼요.'),
    copy('確率効果は結果を保証しない。必要なマナと失敗時の影響を確認してから使おう。', 'Random effects are not guaranteed. Check the cost and the consequences of a bad roll.', '확률 효과의 결과는 보장되지 않아요. 비용과 실패 결과를 확인하고 사용하세요.')),
  lesson('enchant', copy('場に残る魔法', 'Magic that remains', '필드에 남는 마법'),
    copy('知識の泉を使い、ターンを終了しよう。次の自分のターンに効果が働く。場に残るカードの持続表示にも注目してね。', 'Play Fountain of Knowledge, then end your turn. Watch it trigger at the start of your next turn and inspect its duration on the field.', '지식의 샘을 사용하고 턴을 종료하세요. 다음 자신의 턴 시작에 효과가 발동해요. 필드의 지속 표시도 확인하세요.'),
    copy('即時魔法・持続魔法・永続魔法を区別しよう。「召喚時」「毎ターン」「条件」の見出しが読む手掛かり。', 'Distinguish instant, timed and permanent spells. Trigger headings tell you when an effect works.', '즉시·지속·영구 마법을 구분하세요. 소환 시·매 턴·조건 표기가 발동 시점을 알려 줘요.')),
  lesson('tribe', copy('異なる記録を揃える', 'Gather a tribe', '서로 다른 동족 모으기'),
    copy('孤独な狼と孤独な狩人を両方召喚しよう。同じ種族の異なるカードを揃えるとシナジーが発動するよ。練習用にマナを用意した。', 'Summon both Lonely Wolf and Lonely Hunter. Different cards of the same tribe trigger a synergy. Extra practice mana is ready.', '외로운 늑대와 고독한 사냥꾼을 모두 소환하세요. 같은 종족의 서로 다른 카드가 모이면 시너지가 발동해요. 연습용 마나를 준비했어요.'),
    copy('同じカードの複数枚は種類数に数えない。種族の詳細で必要枚数と効果を確認できる。', 'Copies do not count as different cards. Inspect the tribe for its thresholds and effects.', '같은 카드 여러 장은 종류 수에 포함되지 않아요. 종족 상세에서 필요 수와 효과를 확인하세요.')),
  lesson('hand', copy('手札を持ち越す', 'Carry your hand forward', '손패 이월'),
    copy('今回は手札が8枚。ターン終了を押し、墓地へ送る1枚を選ぼう。残りの7枚を持ち越して、次の自分のターンに3枚引くよ。', 'You have eight cards. End the turn and choose one to discard. Keep seven, then draw three at the start of your next turn.', '이번에는 손패가 8장이에요. 턴 종료 후 묘지로 보낼 1장을 선택하세요. 7장을 이월하고 다음 자신의 턴에 3장을 뽑아요.'),
    copy('手札はターンごとに捨てない。上限を超えた分だけ自分で選び、必要なカードを残そう。', 'Your hand is not discarded each turn. Choose only the excess cards and keep what you need.', '매 턴 손패를 전부 버리지 않아요. 초과분만 골라 버리고 필요한 카드를 남기세요.')),
  lesson('duel', copy('仕上げのデュエル', 'The final practice duel', '마지막 연습 듀얼'),
    copy('マナを配分してモンスターを召喚し、魔法と攻撃で相手の精神力を0にしよう。相手のモンスターが残っている間は、通常の攻撃では直接狙えないよ。', 'Spend your mana, summon monsters, and use spells and attacks to bring the opponent’s Spirit to zero. Ordinary attacks must deal with enemy monsters first.', '마나를 배분해 몬스터를 소환하고 마법과 공격으로 상대 정신력을 0으로 만드세요. 상대 몬스터가 있으면 일반 공격으로 직접 공격할 수 없어요.'),
    copy('全課程の初回報酬は合計3,000シャード。次はデッキを整え、BOT戦から自分の戦い方を試そう。', 'All first-clear rewards total 3,000 Shards. Prepare your deck and try your own approach against a bot.', '모든 과정의 첫 완료 보상은 합계 3,000샤드예요. 덱을 준비하고 BOT전에서 자신만의 전략을 시험하세요.')),
];
export const TUTORIAL_TOTAL = TUT_STEPS.reduce((n, s) => n + s.reward, 0);
