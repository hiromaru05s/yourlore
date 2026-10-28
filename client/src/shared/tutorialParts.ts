import {copy as c,type Copy} from './tutorialSteps';
import {practiceBoard,scene,play,attack,end,buy,type PracticeScene} from './tutorial/model';
import type {LessonRun} from './tutorialLesson';
import type {GameEvent,GameState} from './types';

export interface TutorialPartMeta {title:Copy;intro:Copy;kind:'board'|'practice'|'home'|'deck';}
export type TourPlacement='bottom-left'|'bottom-right'|'top-left'|'top-right';
export interface TutorialTourStep {
 /** Element that receives the tight highlight ring (and the click target for action:'click'). */
 selector?:string;
 /** Several elements whose combined bounds form one highlight (e.g. a whole side of the board). */
 region?:string[];
 /** A larger area kept sharp and undimmed around the target, typically an open popup. */
 focus?:string;
 action?:'next'|'click'|'inspect'|'play';
 /** Visible drop destination; the guide tracks both ends every frame. */
 dragTo?:string;
 /** A click step completes when this UI state appears. */
 opened?:string;
 /** Close an opened control when moving forward. */
 close?:string;
 /** Card/control pointed to without expanding the highlighted region. */
 pointer?:string;
 /** Show the unshaded board after a resolved move. */
 dim?:boolean;
 /** For action:'play' — the step finishes when the learner's real move makes this true. */
 until?:(g:GameState)=>boolean;
 /** Keep "Next" disabled until this element fires the event (e.g. the volume slider). */
 enableOn?:{selector:string;event:string};
 /** Draw a separate ring around each region element instead of one around them all. */
 ringEach?:boolean;
 /** Clicked when the learner steps back out of this step, restoring the previous screen. */
 undo?:string;
 /** A step that only makes sense right after its opening step; "Back" skips over it. */
 skipOnBack?:boolean;
 title:Copy;body:Copy;prompt?:Copy;placement?:TourPlacement;
}


const step=(selector:string|undefined,title:Copy,body:Copy,extra:Partial<TutorialTourStep>={}):TutorialTourStep=>({selector,title,body,...extra});
const hand=(id:string)=>`#hand .card[data-card-id="${id}"]`;
const mon=(id:string)=>`#meRow .zone-mon .card[data-card-id="${id}"]`;
const fixed='#fixedMarket .card[data-card-id="M4"]';
const offer='#supplyMarket .card[data-card-id="M2"]';
const openHand=()=>step('#hand',c('手札','Hand','손패'),c('下の手札を押して、カードを広げよう。','Press your hand below to spread the cards.','아래 손패를 눌러 카드를 펼쳐 봐.'),{action:'click',opened:'.game.hand-open',skipOnBack:true});
const playCard=(id:string,body:Copy,until:(g:GameState)=>boolean):TutorialTourStep=>step(hand(id),c('カードを使う','Play a card','카드 사용'),body,{pointer:hand(id),dragTo:'#meRow .zone-mon',action:'play',until,skipOnBack:true});
export const TUTORIAL_PARTS:TutorialPartMeta[]=[{kind:'board',title:c('デュエルの基本','Duel basics','듀얼의 기본'),intro:c('召喚・攻撃・購入・ターンの流れを、自分で操作して覚えよう。','Learn summoning, attacking, buying and turns by playing.','직접 소환하고 공격하고 구매하며 턴의 흐름을 익혀 봐.')}];
export const PART_TOURS:Partial<Record<number,TutorialTourStep[]>>={0:[
 step('#portraitOpp .pt-hp',c('勝利条件','Goal','승리 조건'),c('やあ、ゼノだよ。上にいる相手の体力を0にしたら勝ちだよ。','Hi, I’m Zeno. Reduce the opponent’s health above to zero to win.','안녕, 난 제노야. 위쪽 상대의 체력을 0으로 만들면 이겨.')),
 step('#portraitMe .pt-hp',c('自分の体力','Your health','내 체력'),c('下がきみ。先攻は体力40、後攻は45で始まるよ。','You are below. The first player starts at 40 health, the second at 45.','아래가 너야. 선공은 체력 40, 후공은 45로 시작해.')),
 step('#endBtn',c('ターンの流れ','Turns','턴의 흐름'),c('お互い交互にターンを進めるよ。この「END TURN」を押すと、自分のターンを終了できるよ。ボタンの周りの光で、残り時間も確認できるよ。','Players take turns. Press this END TURN button to finish your turn. The light around the button shows how much time you have left.','서로 번갈아 턴을 진행해. 이 END TURN 버튼을 누르면 내 턴을 끝낼 수 있어. 버튼 둘레의 빛으로 남은 시간도 확인할 수 있어.')),
 step('.market-counter',c('マーケット','Markets','마켓'),c('中央はカードを買うマーケット。買い足すことで、対戦中のデッキを強くできるよ。','Buy cards from the markets in the middle to strengthen your deck during the duel.','가운데 마켓에서 카드를 사서 대전 중 덱을 강화할 수 있어.')),
 step('#portraitMe .pt-mana',c('マナ','Mana','마나'),c('カードの購入にも使用にも、マナを使うよ。今は4マナあるね。','Buying and playing cards both spend mana. You have 4 mana now.','카드를 사거나 쓸 때 마나를 지불해. 지금은 마나가 4야.')),
 openHand(),
 step(hand('M2'),c('カードを拡大','Inspect a card','카드 확대'),c('ストーン・パップを右クリックしてみて。カードの説明を大きく読めるよ。','Right-click Stone Pup to read its card details.','스톤 펍을 우클릭해 봐. 카드 설명을 크게 볼 수 있어.'),{action:'inspect',opened:'#zoomOverlay',pointer:hand('M2'),skipOnBack:true}),
 step('#zoomOverlay .card-cost',c('マナコスト','Mana cost','마나 비용'),c('左上の1はマナコスト。このカードを使うと、マナを1使うよ。','The 1 at the top left is its mana cost. Playing this card spends 1 mana.','왼쪽 위 1은 마나 비용이야. 이 카드를 쓰면 마나 1을 지불해.'),{focus:'#zoomOverlay .zoom-card-stage'}),
 step('#zoomOverlay .ad-atk',c('攻撃力','Attack','공격력'),c('左下の1が攻撃力。1回の攻撃で与えるダメージだよ。','The 1 at the bottom left is ATK: damage dealt by one attack.','왼쪽 아래 1은 공격력이야. 한 번의 공격으로 주는 피해량이야.'),{focus:'#zoomOverlay .zoom-card-stage'}),
 step('#zoomOverlay .ad-def',c('体力','Health','체력'),c('右下の3は、このモンスターの体力。0になると破壊されるよ。','The 3 at the bottom right is this monster’s health. At zero it is destroyed.','오른쪽 아래 3은 이 몬스터의 체력이야. 0이 되면 파괴돼.'),{focus:'#zoomOverlay .zoom-card-stage',close:'#zoomOverlay .inspect-close'}),
 playCard('M2',c('パップを矢印の先へドラッグして離そう。モンスターを場に出すことを「召喚」というよ。','Drag Pup to the arrow and release. Playing a monster onto the field is called summoning.','펍을 화살표 끝으로 드래그해 놓아 봐. 몬스터를 필드에 내는 것을 소환이라고 해.'),g=>g.players[0].field.some(m=>m.id==='M2')),
 step(mon('M2'),c('攻撃','Attack','공격'),c('モンスターは通常、出したターンから1ターンに1回攻撃できるよ。','Normally, a monster can attack once per turn, starting on the turn it is summoned.','보통 몬스터는 소환한 턴부터 턴마다 한 번 공격할 수 있어.')),
 step(mon('M2'),c('直接攻撃','Direct attack','직접 공격'),c('相手にモンスターがいないね。場のパップをクリックして、相手を直接攻撃しよう。','There are no enemy monsters. Click your Pup to attack the opponent directly.','상대 몬스터가 없네. 내 펍을 클릭해서 상대를 직접 공격해 봐.'),{action:'play',pointer:mon('M2'),until:g=>g.players[1].hp===44,skipOnBack:true}),
 step('#portraitOpp .pt-hp',c('ダメージ','Damage','피해'),c('攻撃力1のぶん、相手の体力が45から44に減ったね。','Your 1 ATK reduced their health from 45 to 44.','공격력 1만큼 상대 체력이 45에서 44로 줄었어.')),
 playCard('STARTER_MANA',c('アチューンを矢印の先へドラッグしよう。マナ3で、最大マナを1増やせるよ。','Drag Attune to the arrow. Spend 3 mana to raise your maximum mana by 1.','어튠을 화살표 끝으로 드래그해. 마나 3으로 최대 마나를 1 늘려.'),g=>g.players[0].maxMana===5),
 step('#portraitMe .pt-mana',c('最大マナ','Maximum mana','최대 마나'),c('今使えるマナは残り0。次の自分のターンには、最大値の5まで回復するよ。','You have 0 mana left now. Your next turn refills it to your new maximum of 5.','지금 남은 마나는 0이야. 다음 내 턴에는 새 최대치인 5까지 회복해.')),
 step('#pile-myDeck',c('ターン開始のドロー','Draw at turn start','턴 시작 드로우'),c('自分のターンが始まると、デッキからカードを3枚引くよ。','At the start of your turn, draw 3 cards from your deck.','내 턴이 시작되면 덱에서 카드 3장을 뽑아.')),
 step('#hand',c('手札の持ち越し','Keeping your hand','손패 유지'),c('使わなかった手札は、ターン終了時に7枚まで残せるよ。','You can keep up to 7 unused hand cards when your turn ends.','턴을 끝낼 때 쓰지 않은 손패를 7장까지 남길 수 있어.')),
 step('#endBtn',c('ターン終了','End turn','턴 종료'),c('ターン終了を押そう。ぼくの番が終わると、またきみの番だよ。','Press End Turn. After my turn, it will be yours again.','턴 종료를 눌러 봐. 내 차례가 끝나면 다시 네 차례야.'),{action:'play',until:g=>g.cur===0&&g.turn>=3,skipOnBack:true}),
 step('#hand',c('3枚ドロー','Draw 3','3장 드로우'),c('3枚引いたね。さっき残した手札も、そのまま使えるよ。','You drew 3 cards. The card you kept is still in your hand.','3장을 뽑았어. 남겨 둔 손패도 그대로 사용할 수 있어.')),
 step('#portraitMe .pt-mana',c('マナ回復','Mana refill','마나 회복'),c('マナも最大値の5まで回復したね。次はカードを買ってみよう。','Mana refilled to your maximum of 5. Let’s buy a card.','마나도 최대치 5까지 회복했어. 이번에는 카드를 사 보자.')),
 step('#fixedMarket',c('固定マーケット','Fixed market','고정 마켓'),c('ここが固定マーケット。在庫がなくなるまで、同じカードが並ぶよ。','This is the fixed market. Each card stays here until its stock runs out.','여기가 고정 마켓이야. 재고가 떨어질 때까지 같은 카드가 놓여 있어.')),
 step('#supplyMarket',c('変動マーケット','Changing market','변동 마켓'),c('こちらの3枠が変動マーケット。買って空いた枠は、次のターン開始に新しいカードで埋まるよ。','These three slots are the changing market. Slots emptied by purchases get new cards at the next turn start.','이쪽 3칸이 변동 마켓이야. 구매로 빈칸이 생기면 다음 턴 시작에 새 카드로 채워져.')),
 step(undefined,c('共有のマーケット','Shared markets','공유 마켓'),c('どちらのマーケットも二人で共有。相手が買うと、きみが買える分も減るよ。','Both markets are shared. When your opponent buys a card, there is less left for you to buy.','두 마켓 모두 함께 써. 상대가 카드를 사면 네가 살 수 있는 수량도 줄어.'),{region:['#fixedMarket','#supplyMarket'],ringEach:true}),
 step(`${fixed} .mkt-stock`,c('固定マーケットの在庫','Fixed market stock','고정 마켓 재고'),c('カードの下の「×3」が残り在庫。どちらが買っても、この数が減るよ。','The ×3 below the card is its remaining stock. Either player’s purchase reduces it.','카드 아래 ×3이 남은 재고야. 누가 사든 이 수가 줄어.'),{focus:fixed}),
 step(fixed,c('カードを購入','Buy a card','카드 구매'),c('ヘアをダブルクリックして買おう。左上の2マナを支払うよ。','Double-click Hare to buy it. Pay the 2 mana shown at the top left.','헤어를 더블클릭해 구매해. 왼쪽 위에 적힌 마나 2를 지불해.'),{action:'play',pointer:fixed,until:g=>g.marketStock?.[0]===2,skipOnBack:true}),
 step(`${fixed} .mkt-stock`,c('在庫が減る','Stock decreases','재고 감소'),c('在庫が2になったね。固定マーケットは、売り切れた枠に別のカードが入るよ。','Stock is now 2. A fixed-market slot gets a new card when it sells out.','재고가 2가 됐어. 고정 마켓은 매진된 칸에 새 카드가 들어와.'),{focus:fixed}),
 step('#pile-myDisc',c('購入先は墓地','Purchases go to the graveyard','구매 카드는 묘지로'),c('買ったカードはまず墓地へ。今すぐ手札には入らないよ。','Purchased cards go to your graveyard first, not straight into your hand.','구매한 카드는 먼저 묘지로 가. 바로 손패에 들어오지는 않아.')),
 step(offer,c('変動マーケットで購入','Buy from the changing market','변동 마켓에서 구매'),c('今度は変動マーケットのパップをダブルクリックして、マナ1で買ってみよう。','Now double-click Pup in the changing market to buy it for 1 mana.','이번에는 변동 마켓의 펍을 더블클릭해 마나 1로 사 봐.'),{action:'play',pointer:offer,until:g=>g.players[0].supply.filter(Boolean).length===2,skipOnBack:true}),
 step('#supplyMarket .slot',c('変動マーケットの補充','Refilling offers','변동 마켓 보충'),c('買った枠が空いたね。次のターン開始に、その枠だけ新しいカードが入るよ。','That slot is empty now. Only empty slots refill at the next turn start.','구매한 칸이 비었어. 다음 턴 시작에 빈칸만 새 카드로 채워져.'),{focus:'#supplyMarket',skipOnBack:true}),
 step('#pile-myDeck',c('デッキが空になったら','When the deck is empty','덱이 비면'),c('引くカードがデッキにない時は、墓地を混ぜてデッキに戻すよ。','When you need to draw from an empty deck, shuffle your graveyard into it.','빈 덱에서 카드를 뽑아야 할 때는 묘지를 섞어 덱으로 되돌려.'),{region:['#pile-myDeck','#pile-myDisc'],ringEach:true}),
 step('#endBtn',c('買ったカードを引く','Draw your purchases','구매 카드 뽑기'),c('もう一度ターンを終了しよう。買ったカードが手札に来るところを見てね。','End your turn again and watch your purchases reach your hand.','한 번 더 턴을 끝내고 구매 카드가 손패로 오는 걸 봐.'),{action:'play',until:g=>g.cur===0&&g.turn>=5,skipOnBack:true}),
 openHand(),
 step(hand('M4'),c('購入から手札へ','From purchase to hand','구매에서 손패로'),c('買ったヘアが手札に来たね。使う時には、購入とは別にマナを支払うよ。','The Hare you bought is in your hand. Playing it costs mana separately from buying it.','산 헤어가 손패에 왔어. 사용할 때는 구매와 별도로 마나를 지불해.'),{pointer:hand('M4')}),
 playCard('S3',c('魔法も場へドラッグして使うよ。「刃の囁き」を使って、味方のパップを選ぼう。','Drag a spell onto the field to cast it. Play Whisper to the Blade and choose your Pup.','마법도 필드로 드래그해서 써. 칼날의 속삭임을 사용하고 내 펍을 골라.'),g=>(g.players[0].field.find(m=>m.id==='M2')?.atkMod??0)===3),
 step(`${mon('M2')} .ad-atk`,c('魔法の効果','Spell effect','마법 효과'),c('魔法で攻撃力が1から4になったね。カードごとの効果は、右クリックで読めるよ。','The spell raised ATK from 1 to 4. Right-click any card to read its effect.','마법으로 공격력이 1에서 4가 됐어. 카드 효과는 우클릭해서 읽을 수 있어.')),
 step('#pile-myDisc',c('使った魔法','Used spells','사용한 마법'),c('使い終わった通常魔法も墓地へ行くよ。','A normal spell goes to the graveyard after it resolves.','사용한 일반 마법도 묘지로 가.')),
 step('#oppRow .zone-mon .card[data-card-id="M2"] .ad-def',c('相手のモンスター','Enemy monster','상대 몬스터'),c('相手にもパップがいるね。モンスターがいる時は、先にそのモンスターを攻撃するよ。','The opponent has a Pup now. While enemy monsters are present, attack a monster first.','상대에게도 펍이 있네. 상대 몬스터가 있으면 먼저 그 몬스터를 공격해.'),{focus:'#oppRow .zone-mon .card[data-card-id="M2"]',skipOnBack:true}),
 step(mon('M2'),c('モンスターへ攻撃','Attack a monster','몬스터 공격'),c('自分のパップを、矢印の先の相手のパップへドラッグしよう。','Drag your Pup onto the enemy Pup at the arrow.','내 펍을 화살표 끝의 상대 펍으로 드래그해.'),{action:'play',pointer:mon('M2'),dragTo:'#oppRow .zone-mon .card[data-card-id="M2"]',until:g=>!g.players[1].field.length,skipOnBack:true}),
 step('#pile-oppDisc',c('破壊','Destruction','파괴'),c('相手のモンスターは体力が0になって、墓地へ移ったよ。','The enemy monster reached zero health and moved to the graveyard.','상대 몬스터가 체력 0이 되어 묘지로 갔어.')),
 step('#portraitOpp .pt-hp',c('貫通ダメージ','Overflow damage','관통 피해'),c('攻撃力4から、倒すのに使った3を引くと1。この余りが相手の体力にも入るよ。','4 ATK minus the 3 needed to destroy it leaves 1. That excess damages the opponent.','공격력 4에서 쓰러뜨리는 데 쓴 3을 빼면 1이 남아. 남은 피해는 상대 체력에 들어가.')),
 step('#refreshBtn',c('変動マーケットの更新','Refresh offers','변동 마켓 갱신'),c('このボタンを押すと、マナ1で変動マーケットの3枠を入れ替えられるよ。押してみよう。','Press this button to replace the changing market’s three offers for 1 mana.','이 버튼으로 마나 1을 써서 변동 마켓 3칸을 바꿀 수 있어. 눌러 봐.'),{action:'play',until:g=>g.players[0].mana===2,skipOnBack:true}),
 playCard('STARTER_TRASH',c('最後にカルを使おう。このカードは、自分自身をリフトへ送るよ。','Finally, play Cull. This card sends itself to the Rift.','마지막으로 컬을 써 보자. 이 카드는 자신을 리프트로 보내.'),g=>!!g.players[0].removed?.some(c=>c.id==='STARTER_TRASH')),
 step('#rift-me',c('リフト','Rift','리프트'),c('ここがリフト。墓地と違い、ここのカードはデッキが空になっても戻らないよ。','This is the Rift. Unlike the graveyard, its cards do not return when the deck runs out.','여기가 리프트야. 묘지와 달리 여기 카드는 덱이 비어도 돌아오지 않아.')),
 step(undefined,c('基本はここまで','Basics complete','기본 완료'),c('基本はこれでおしまい。カードを買って強くしながら攻撃を重ね、相手の体力0を目指そう。','That covers the basics. Buy cards to strengthen your deck and keep attacking to bring the opponent to zero health.','기본은 여기까지야. 카드를 사서 덱을 강화하고 계속 공격해 상대 체력 0을 목표로 해 봐.'),{dim:false}),
]};
// Reopen the hand after any board click or inspection. A step already open advances immediately.
PART_TOURS[0]=PART_TOURS[0]!.flatMap((s,i,tour)=>s.action==='play'&&s.pointer?.startsWith('#hand')&&tour[i-1]?.opened!=='.game.hand-open'?[openHand(),s]:[s]);

export function partScenes(part:number):PracticeScene[]{
 if(part!==0)return[];
 return[scene(b=>{
  b.hand('M2','STARTER_MANA','S3');b.opp.hp=45;b.opp.hand=[b.card('M2')];
  b.me.deck=[b.card('STARTER_TRASH'),b.card('STARTER_CHEST'),b.card('GRAPE')];
  b.me.supply=[b.card('M2'),b.card('M1'),b.card('M4')];
 },[play('M2'),attack('M2'),play('STARTER_MANA'),end(),buy('M4'),buy('M2',true),end(),{...play('S3'),targetId:'M2'}, {...attack('M2'),targetId:'M2'},{action:'refresh'},play('STARTER_TRASH')],c('','',''),c('','',''),undefined,'summon')];
}
export const tutorialPartKey=(part:number,accountId?:string)=>`lore:tutorial:parts:v5:${encodeURIComponent(accountId??'guest')}:complete:${part}`;
export function createPartStart(part:number):{run:LessonRun;history:GameEvent[]}{
 const scenes=partScenes(part);if(!scenes.length)throw Error(`Tutorial part ${part+1} has no board scene`);
 const state=practiceBoard(scenes[0]);
 return{run:{id:'summon',state,scenes,actions:[],facts:new Set(),done:false,scene:0,step:0,phase:'play',wrongAnswer:false,events:[],stepTurn:state.turn},history:[]};
}
export function createPartRun(part:number):LessonRun{return createPartStart(part).run;}
