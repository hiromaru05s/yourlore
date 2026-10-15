/** Curriculum and reward identities are shared by the client and authoritative replay. */
export type TutorialLang = 'ja' | 'en' | 'ko';
export type Copy = Record<TutorialLang,string>;
export const copy=(ja:string,en:string,ko:string):Copy=>({ja,en,ko});
export const TUTORIAL_CHAPTERS=[
 copy('初めてのデュエル','Your first duel','첫 듀얼'),
 copy('マナとカードの循環','Mana and card circulation','마나와 카드 순환'),
 copy('魔法とクエスト','Spells and quests','마법과 퀘스트'),
 copy('雫・シールド・状態','Dew, Shield and conditions','이슬·실드·상태'),
 copy('効果の読み方','Reading card effects','효과 읽기'),
 copy('パッシブの実戦','Passives in practice','패시브 실전'),
 copy('種族と勝利条件','Tribes and victory','종족과 승리 조건'),
 copy('総合演習','Putting it together','종합 실습'),
] as const;
const rows=[
 ['summon',0,'M4',copy('カードを読み、召喚する','Read and summon','읽고 소환하기'),copy('カードの数字を見て、最初の1体を出そう。','Read a card’s numbers and play your first monster.','카드 숫자를 읽고 첫 몬스터를 내 봐요.')],
 ['attack',0,'M4',copy('相手を直接攻撃する','Attack directly','직접 공격하기'),copy('相手の場が空なら、精神力を攻撃できるよ。','An empty enemy field lets you attack their Spirit.','상대 필드가 비면 정신력을 공격할 수 있어요.')],
 ['combat',0,'M1',copy('戦闘と貫通','Combat and overflow','전투와 관통'),copy('傷は残るよ。倒すのに必要な量を超えたダメージも見てみよう。','Damage stays. See where damage beyond a monster’s remaining HP goes.','피해는 남아요. 남은 체력을 넘는 피해가 어디로 가는지 봐요.')],
 ['hand',0,'S4',copy('ターンと手札','Turns and your hand','턴과 손패'),copy('手札を7枚まで残して、次の自分の番を迎えよう。','Keep up to seven cards and begin your next turn.','손패 7장을 남기고 다음 차례를 맞아요.')],
 ['mana',1,'STARTER_MANA',copy('マナを育てる','Grow your mana','마나 키우기'),copy('今使えるマナと、毎ターン回復する最大マナを分けて考えよう。','Separate mana available now from your maximum refill.','지금 쓸 마나와 매 턴 회복할 최대 마나를 구분해요.')],
 ['market',1,'M4',copy('マーケットを使う','Use the markets','마켓 이용하기'),copy('固定と提示、在庫と更新。ほしいカードを探そう。','Explore fixed offers, personal offers, stock and refresh.','고정·제시 마켓, 재고와 갱신을 알아봐요.')],
 ['cycle',1,'M4',copy('買ったカードはどこへ？','Where does a purchase go?','구매한 카드는 어디로?'),copy('購入から墓地、デッキ、手札までを追ってみよう。','Follow a purchase through graveyard, deck and hand.','구매한 카드가 묘지·덱·손패로 이동하는 과정을 봐요.')],
 ['rift',1,'STARTER_TRASH',copy('リフトとは？','What is the Rift?','리프트란?'),copy('墓地は再び引く場所。リフトは普通の循環から外れる場所だよ。','The graveyard cycles back. The Rift is outside that normal cycle.','묘지는 다시 순환해요. 리프트는 보통 순환에서 벗어난 곳이에요.')],
 ['deck',1,'STARTER_CHEST',copy('デッキを整える','Shape your deck','덱 다듬기'),copy('自由枠8枚と固定アチューン1枚。試合中の購入と圧縮も試そう。','Eight chosen starters and one fixed Attune. Try buying and thinning during a duel.','자유 스타터 8장과 고정 어튠 1장. 대전 중 구매와 압축도 해 봐요.')],
 ['spell',2,'S3',copy('通常魔法と対象','Normal spells and targets','일반 마법과 대상'),copy('購入と発動は別。効果をかける対象を選ぼう。','Buying and casting are separate. Choose the effect’s target.','구매와 발동은 별개예요. 효과의 대상을 골라요.')],
 ['quick',2,'QUICK_ATTUNE',copy('クイック魔法','Quick spells','퀵 마법'),copy('手札に引くのを待たず、購入した時に働く魔法だよ。','These spells work when purchased, without waiting to draw them.','손패로 뽑지 않고 구매하는 순간 발동하는 마법이에요.')],
 ['enchant',2,'E3',copy('場に残る魔法','Persistent spells','필드에 남는 마법'),copy('場にある間の効果と、発動する時点・終了する時点を確かめよう。','Check ongoing effects, triggers and expiration.','지속 효과와 발동·종료 시점을 확인해요.')],
 ['quest',2,'Q_RIFT',copy('クエストを達成する','Complete a quest','퀘스트 달성하기'),copy('設置してから条件を進めよう。累計と連続維持は違うよ。','Progress starts after deployment. Totals and consecutive upkeep differ.','설치 후 조건을 진행해요. 누적과 연속 유지는 달라요.')],
 ['health',3,'S1',copy('精神力と回復','Spirit and healing','정신력과 회복'),copy('精神力、モンスターの体力、強化を区別しよう。','Distinguish Spirit, monster HP and stat bonuses.','정신력, 몬스터 체력, 능력치 강화를 구분해요.')],
 ['dew',3,'ELF',copy('雫を蓄え、使う','Store and spend Dew','이슬 모으고 쓰기'),copy('雫は毎自分ターンの回復量。条件や支払いにも使うよ。','Dew heals at your turn start and can also be a requirement or payment.','이슬은 내 턴 시작의 회복량이며 조건·비용에도 쓰여요.')],
 ['shield',3,'SELECTED_SHIELD',copy('シールドで受ける','Absorb with Shield','실드로 막기'),copy('精神力より先に減る防護。相手ターン終了時の失効まで見よう。','A buffer before Spirit. Watch it expire at the end of the opponent’s turn.','정신력보다 먼저 줄어드는 보호막. 상대 턴 종료 때 소멸해요.')],
 ['status',3,'CURSE',copy('烙印・出血・呪い','Brand, Bleed and Curse','낙인·출혈·저주'),copy('カウンターとカードは別物。受ける効果と対処を確かめよう。','Counters and cards are different. See their effects and how to respond.','카운터와 카드는 달라요. 효과와 대처를 알아봐요.')],
 ['timing',4,'GM5_0',copy('いつ効果が働く？','When does an effect trigger?','언제 발동할까요?'),copy('召喚時、攻撃時、ターン開始・終了、場にいる間を読み分けよう。','Read summon, attack, turn-start/end and continuous effects.','소환·공격·턴 시작/종료·지속 효과를 구분해요.')],
 ['requirements',4,'ELF',copy('条件が足りない理由','Why requirements matter','조건이 부족한 이유'),copy('購入条件・召喚条件・発動条件は、それぞれ別に確認するよ。','Check purchase, summon and cast requirements separately.','구매·소환·발동 조건은 각각 확인해요.')],
 ['reactions',4,'VAMP4',copy('何に反応する？','What causes a reaction?','무엇에 반응할까요?'),copy('攻撃、命中、撃破、破壊。他のカードの行動でも効果が起こるよ。','Attacks, hits, kills and destruction differ. Other cards can trigger effects too.','공격·명중·처치·파괴는 달라요. 다른 카드 행동에도 반응해요.')],
 ['limits',4,'S4',copy('対象・期間・回数','Targets, duration and limits','대상·기간·횟수'),copy('同名全体か個体ごとか。1ターンとゲーム中1回も区別しよう。','Per name or per copy? Per turn or once per game?','같은 이름 전체인지 개체별인지, 턴당인지 게임당인지 확인해요.')],
 ['egg',4,'DRAGON_EGG',copy('卵を守り、孵化させる','Protect and hatch an Egg','알 지키고 부화시키기'),copy('卵は攻撃できないよ。耐久と孵化までのカウントを見よう。','Eggs cannot attack. Watch durability and the hatch countdown.','알은 공격할 수 없어요. 내구와 부화 카운트를 봐요.')],
 ['evolution',4,'D_RED',copy('素材から次の姿へ','From materials to a new form','소재로 다음 모습 만들기'),copy('素材の行き先と場の空き。特殊な召喚を試そう。','Follow materials and field space through a special summon.','소재의 이동과 빈 칸을 확인하며 특수 소환을 해 봐요.')],
 ['counter',5,'M2',copy('反撃と気合','Counter and Guts','반격과 기합'),copy('倒されても反撃。気合で残っても貫通は防がないよ。','Counter can trigger after defeat. Guts does not stop overflow.','쓰러져도 반격해요. 기합은 관통을 막지 못해요.')],
 ['dual',5,'M4',copy('二刀流と暗襲','Dual Wield and Infiltrate','이도류와 암습'),copy('攻撃回数と攻撃できる相手が変わるよ。','These change attack counts and legal targets.','공격 횟수와 공격 가능한 대상이 달라져요.')],
 ['aura',5,'M4',copy('オーラを突破する','Get past Aura','아우라 돌파하기'),copy('選べない相手にも、攻撃や全体効果は届くよ。','An untargetable enemy can still receive attacks and untargeted area effects.','선택할 수 없어도 공격과 비선택 전체 효과는 통해요.')],
 ['evasion',5,'M4',copy('挑発と回避','Taunt and Evasion','도발과 회피'),copy('ダイスで結果が変わる防御。成功と失敗の両方を試そう。','These defenses use dice. Try both success and failure.','주사위에 따라 달라지는 방어예요. 성공과 실패를 모두 봐요.')],
 ['decay',5,'M4',copy('腐敗を重ねる','Build Decay','부패 쌓기'),copy('カウンター3個で破壊。持ち主へのダメージまで見よう。','Three counters destroy the monster and damage its owner.','카운터 3개로 파괴하고 소유자에게도 피해를 줘요.')],
 ['majesty',5,'M4',copy('威厳と召喚したターン','Majesty and new summons','위엄과 소환한 턴'),copy('新しく出した1体と、前からいる1体を比べよう。','Compare a new summon with a monster already on the field.','새로 낸 몬스터와 이전부터 있던 몬스터를 비교해요.')],
 ['void',5,'STARTER_MANA',copy('虚無と神器','Void and Relic','공허와 신기'),copy('墓地とリフトへの行き先、除外できないカードを学ぼう。','Learn changed destinations and protection against exile.','묘지·리프트 이동과 제외 방지를 배워요.')],
 ['tribe',6,'TSO2',copy('5種族のシナジー','The five tribes','다섯 종족 시너지'),copy('同名を重ねるだけではだめ。異なる仲間を同時にそろえよう。','Duplicates do not count. Gather distinct members at the same time.','같은 카드는 중복 계산하지 않아요. 다른 동족을 동시에 모아요.')],
 ['origin',6,'TGE2',copy('始原6種類で勝利','Win with six Origins','시초 6종으로 승리'),copy('累計ではなく、場に異なる6種類。最後の1体をそろえよう。','Six distinct cards on the field, not six summons over time.','누적 소환이 아니라 필드에 서로 다른 6종이 필요해요.')],
 ['chosen',6,'CHOSEN_AREA',copy('選ばれし領域','Chosen Domain','선택받은 영역'),copy('自分のリフトにカル25枚。そのあと魔法を発動して勝つよ。','Put 25 Culls in your Rift, then cast the spell to win.','내 리프트에 컬 25장. 그다음 마법을 발동해 승리해요.')],
 ['judgement',6,'TRIBE_PACT',copy('決着の例外','Other ways a duel ends','다른 결착 조건'),copy('60ターンの判定と、多種族契約の期限を確認しよう。','Check the 60-turn judgment and Multi-Tribe Pact’s deadline.','60턴 판정과 다종족 계약의 기한을 확인해요.')],
 ['defend',7,'ELF',copy('守って次につなぐ','Defend and plan ahead','지키고 다음 턴 준비하기'),copy('相手も行動するよ。守りと次の自分の番を考えよう。','Your opponent acts too. Plan your defense and next turn.','상대도 행동해요. 방어와 다음 내 차례를 생각해요.')],
 ['duel',7,'M4',copy('自分で勝ち筋を選ぶ','Find your own way to win','스스로 승리하기'),copy('ここからは自分で順番を決めよう。困ったらノートとヒントを使ってね。','Choose your own sequence. Your notebook and hints are always available.','이제 순서를 스스로 정해요. 노트와 힌트를 활용하세요.')],
] as const;
export type LessonId=typeof rows[number][0];
export interface TutStepMeta {id:LessonId;chapter:number;art:string;key:string;reward:number;title:Copy;body:Copy;learned:Copy;}
export const TUT_STEPS:TutStepMeta[]=rows.map(([id,chapter,art,title,body],i)=>({id,chapter,art,key:`tutorial:v3:${id}`,reward:i<8?100:150,title,body,learned:body}));
export const TUTORIAL_ORDER=TUT_STEPS.map(s=>s.id);
export const TUTORIAL_TOTAL=TUT_STEPS.reduce((n,s)=>n+s.reward,0);
export const LEGACY_TUTORIAL_IDS=['mana','summon','combat','spell','cycle','market','rift','chest','enchant','tribe','hand','duel'] as const;
/** Allocate the remaining budget across all new learning units, without marking new material learned. */
export function tutorialAward(id:LessonId,legacyPaid=0):number {
 const i=TUT_STEPS.findIndex(s=>s.id===id);if(i<0)return 0;
 const remaining=TUTORIAL_TOTAL-Math.min(3000,Math.max(0,legacyPaid));
 const before=TUT_STEPS.slice(0,i).reduce((n,s)=>n+s.reward,0);
 return Math.floor((before+TUT_STEPS[i].reward)*remaining/TUTORIAL_TOTAL)-Math.floor(before*remaining/TUTORIAL_TOTAL);
}
