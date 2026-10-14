import type { Copy } from './tutorialSteps';
import type { LessonRun } from './tutorialLesson';
import type { Action } from './types';
const c=(ja:string,en:string,ko:string):Copy=>({ja,en,ko});
export const TUTORIAL_BASICS = [
 {kind:'goal',title:c('何をしたら勝ち？','How do I win?','어떻게 이기나요?'),body:c('LOREは、2人で交互にカードを使うゲーム。「精神力」はプレイヤーの体力のこと。相手の精神力を先に0にすると勝ちだよ。','LORE is a game where two players take turns using cards. Spirit is each player’s health. Bring your opponent’s Spirit to zero first to win.','LORE는 두 사람이 번갈아 카드를 쓰는 게임이에요. 정신력은 플레이어의 체력이에요. 상대 정신력을 먼저 0으로 만들면 이겨요.'),labels:[c('相手の精神力','Opponent’s Spirit','상대 정신력'),c('攻撃する','Attack','공격하기'),c('0で勝ち！','Zero means victory!','0이면 승리!')]},
 {kind:'board',title:c('カードはどこにある？','Where are my cards?','카드는 어디에 있나요?'),body:c('手元のカードが「手札」。モンスターを手札から「場」に出すと、攻撃できるようになるよ。これを「召喚」と呼ぶよ。','The cards you hold are your hand. Play a monster from your hand onto the field so it can attack. This is called summoning.','가지고 있는 카드가 손패예요. 손패의 몬스터를 필드에 내면 공격할 수 있어요. 이것을 소환이라고 해요.'),labels:[c('相手の場：上','Enemy field: above','상대 필드: 위'),c('自分の場','Your field','자신의 필드'),c('手札：画面の下','Hand: bottom of screen','손패: 화면 아래')]},
 {kind:'mana',title:c('カードを使うには？','How do I play a card?','카드를 어떻게 쓰나요?'),body:c('カードを使うには「マナ」というエネルギーが必要だよ。マナ4から、マナ2のカードを使うと、残りは2になるよ。','Cards cost an energy called mana. If you have 4 mana and play a card costing 2, you have 2 left.','카드를 쓰려면 마나라는 에너지가 필요해요. 마나 4에서 마나 2인 카드를 쓰면 2가 남아요.'),labels:[c('持っているマナ','Mana available','현재 마나'),c('カードに使う','Card cost','카드에 사용'),c('残りのマナ','Mana left','남은 마나')]},
 {kind:'turn',title:c('自分の番が終わったら？','What happens after my turn?','내 차례가 끝나면?'),body:c('行動が終わったら「ターン終了」。相手の番のあと、また自分の番になるよ。マナが最大まで回復し、デッキという山からカードを3枚引くよ。','Press End Turn when you are done. After the opponent’s turn, it is your turn again: mana refills and you draw 3 cards from your deck.','행동을 마치면 턴 종료를 눌러요. 상대 차례가 끝나면 다시 내 차례예요. 마나가 최대까지 회복되고 덱이라는 카드 더미에서 3장을 뽑아요.'),labels:[c('自分の番','Your turn','내 차례'),c('相手の番','Their turn','상대 차례'),c('マナ回復 ＋ 3枚引く','Refill mana + draw 3','마나 회복 + 3장 뽑기')]},
 {kind:'buy',title:c('カードを増やすには？','How do I get more cards?','카드를 더 얻으려면?'),body:c('対戦中は「マーケット」でマナを使ってカードを購入できるよ。買ったカードはまず墓地へ。デッキが空になると戻り、手札に引いてから使えるよ。','During a game, spend mana to buy cards from the market. They go to the graveyard first, return when your deck runs out, and can be played after you draw them.','대전 중에는 마켓에서 마나로 카드를 구매해요. 먼저 묘지로 가고, 덱이 비면 돌아와요. 손패로 뽑은 뒤 사용할 수 있어요.'),labels:[c('購入 → 墓地','Buy → graveyard','구매 → 묘지'),c('デッキに戻る','Return to deck','덱으로 돌아옴'),c('手札に引く','Draw into hand','손패로 뽑기')]},
] as const;
export interface LessonCue { step:number; total:number; instruction:Copy; reason:Copy; action:'play'|'attack'|'buyMarket'|'refresh'|'endTurn'|'target'|'wait'|'free'; cardId?:string; }
export function tutorialCue(run:LessonRun,handOpen=true):LessonCue {
 const has=(s:string)=>run.facts.has(s);
 const cue=(step:number,total:number,instruction:Copy,reason:Copy,action:LessonCue['action'],cardId?:string):LessonCue=>({step,total,instruction,reason,action,cardId});
 if(run.state.cur===1)return cue(2,2,c('相手の番を待とう。','Wait for the opponent’s turn.','상대 차례를 기다려요.'),c('練習相手のゼノは、すぐに番を返すよ。','Zeno will pass back to you shortly.','제노가 곧 차례를 돌려줄 거예요.'),'wait');
 if(run.state.pending)return cue(2,2,run.state.pending.reason==='handCap'?c('手札から、墓地へ送るカードを1枚選ぼう。','Choose one card from your hand to send to the graveyard.','손패에서 묘지로 보낼 카드 1장을 고르세요.'):run.id==='combat'?c('上の場にいる相手のモンスターを押そう。','Press the enemy monster in the upper field.','위쪽 필드의 상대 몬스터를 누르세요.'):run.id==='spell'?c('下の場にいる自分のモンスターを押そう。','Press your monster in the lower field.','아래쪽 필드의 자신의 몬스터를 누르세요.'):c('光っている候補から、対象を選ぼう。','Choose a highlighted target.','빛나는 후보에서 대상을 고르세요.'),run.state.pending.reason==='handCap'?c('ターンを終えるときに残せる手札は7枚までだよ。','You can keep up to seven cards when ending your turn.','턴을 끝낼 때 손패는 7장까지 남길 수 있어요.'):c('カードを選ぶと、効果が決まるよ。','Choosing the card completes the action.','카드를 고르면 효과가 결정돼요.'),'target');
 const play=(id:string,name:Copy,reason:Copy,step=1,total=1)=>cue(step,total,handOpen?c(`「${name.ja}」を押したまま、中央の場まで動かして離そう。`,`Hold ${name.en}, move it onto the middle of the board, then release.`,`「${name.ko}」을 누른 채 필드 가운데로 옮겨 놓으세요.`):c('画面下のカードを押して、手札を広げよう。','Press the cards at the bottom to open your hand.','화면 아래 카드를 눌러 손패를 펼치세요.'),reason,'play',id);
 switch(run.id){
 case 'summon':return has('summon')?cue(2,2,c('下の場に出した、ブレード・ヘアを押して攻撃しよう。','Press the Blade Hare you played in your field to attack.','아래 필드에 낸 블레이드 헤어를 눌러 공격하세요.'),c('相手の場は空だね。攻撃力の分だけ、相手の精神力を減らせるよ。','Their field is empty. Your attack reduces their Spirit by your monster’s attack value.','상대 필드가 비었어요. 공격력만큼 상대 정신력을 줄일 수 있어요.'),'attack'):play('M4',c('ブレード・ヘア','Blade Hare','블레이드 헤어'),c('カードを場に出すことを「召喚」と呼ぶよ。マナを2使うよ。','Playing a monster is called summoning. This costs 2 mana.','몬스터를 필드에 내는 것을 소환이라고 해요. 마나 2를 써요.'),1,2);
 case 'combat':return cue(1,2,c('下の場のブレード・ヘアを押そう。','Press Blade Hare in your lower field.','아래 필드의 블레이드 헤어를 누르세요.'),c('今回は相手の場にもモンスターがいるね。次に、攻撃する相手を選ぶよ。','There is an enemy monster this time. Next, choose which enemy to attack.','이번에는 상대 필드에도 몬스터가 있어요. 다음으로 공격할 상대를 골라요.'),'attack');
 case 'mana':return play('STARTER_MANA',c('アチューン','Attune','어튠'),c('今のマナ3を使って、次のターンに回復する最大マナを1増やすよ。','Spend 3 mana now to add 1 to the maximum that refills next turn.','지금 마나 3을 써서 다음 턴에 회복할 최대 마나를 1 늘려요.'));
 case 'spell':return play('S3',c('シャープン','Sharpen','샤픈'),c('使ったあと、強くするモンスターを選ぶよ。','After playing it, choose which monster to strengthen.','사용한 뒤 강화할 몬스터를 골라요.'),1,2);
 case 'cycle':return has('buy:M4')?cue(2,2,c('「ターン終了」を押そう。','Press End Turn.','턴 종료를 누르세요.'),c('購入したカードは墓地にあるよ。今回はデッキが空なので、次の自分の番に手札へ引けるよ。','Your purchase is in the graveyard. With this practice deck empty, you will draw it next turn.','구매한 카드는 묘지에 있어요. 이번 연습은 덱이 비어 있어 다음 내 차례에 뽑을 수 있어요.'),'endTurn'):cue(1,2,c('光っている「ブレード・ヘア」を2回続けて押して、購入しよう。','Press the highlighted Blade Hare twice in a row to buy it.','빛나는 블레이드 헤어를 두 번 연속 눌러 구매하세요.'),c('カードの購入にもマナを使うよ。手札のカードを使うときと、同じマナだよ。','Buying and playing cards spend the same mana.','카드 구매와 카드 사용은 같은 마나를 써요.'),'buyMarket','M4');
 case 'hand':return cue(1,2,c('「ターン終了」を押そう。','Press End Turn.','턴 종료를 누르세요.'),c('今は手札が8枚。次に、残す7枚を決めるために1枚を選ぶよ。','You have eight cards. Next, choose one to send away so you keep seven.','지금 손패는 8장이에요. 다음에 1장을 보내고 7장을 남겨요.'),'endTurn');
 case 'market':return cue(1,1,c('提示マーケットの「更新」を押そう。','Press Refresh in the offer market.','제시 마켓의 갱신을 누르세요.'),c('マナ1で、購入できる3枚が入れ替わるよ。','Spend 1 mana to change the three cards you can buy.','마나 1로 구매할 카드 3장을 바꿔요.'),'refresh');
 case 'rift':return play('STARTER_TRASH',c('カル','Cull','컬'),c('使い終わると「リフト」へ移り、デッキからいなくなるよ。','After use, it moves to the Rift and leaves your deck.','쓰고 나면 리프트로 가서 덱에서 빠져요.'));
 case 'chest':return play('STARTER_CHEST',c('宝箱','Chest','보물상자'),c('サイコロの結果は運まかせ。どの結果でも進めるよ。','The die decides the outcome. Any result lets you continue.','결과는 주사위가 정해요. 어떤 결과라도 다음으로 갈 수 있어요.'));
 case 'enchant':return has('play:E3')?cue(2,2,c('「ターン終了」を押そう。','Press End Turn.','턴 종료를 누르세요.'),c('場に残った魔法が、次の自分の番に働くよ。','The spell stays on the field and works on your next turn.','필드에 남은 마법이 다음 자신의 차례에 발동해요.'),'endTurn'):play('E3',c('知識の泉','Fountain of Knowledge','지식의 샘'),c('すぐには働かず、場で次のターンを待つ魔法だよ。','This spell waits on the field for your next turn.','필드에서 다음 턴을 기다리는 마법이에요.'),1,2);
 case 'tribe':{const wolf=run.state.players[0].field.some(m=>m.id==='TSO2');return play(wolf?'TSO3':'TSO2',wolf?c('孤独な狩人','Lonely Hunter','고독한 사냥꾼'):c('孤独な狼','Lonely Wolf','외로운 늑대'),c('ちがう名前の仲間をそろえるよ。練習用のマナ7を用意したよ。','Gather different members of the same tribe. You have 7 practice mana.','이름이 다른 동족을 모아요. 연습용 마나 7을 준비했어요.'),wolf?2:1,2);}
 case 'duel':return cue(1,1,c('相手の精神力8を、0にしよう。','Bring the opponent’s 8 Spirit to zero.','상대 정신력 8을 0으로 만드세요.'),c('まずモンスターを出そう。相手のモンスターを倒すと、相手自身を攻撃できるよ。','Play a monster first. Defeat their monster to attack the opponent directly.','먼저 몬스터를 내세요. 상대 몬스터를 쓰러뜨리면 상대를 직접 공격할 수 있어요.'),'free');
 }
}
/** Keep early lessons recoverable: only their current action can spend practice resources. */
export function isTutorialActionAllowed(run:LessonRun,action:Action):boolean {
 if(action.type==='surrender'||action.type==='reorder')return true;
 if(run.id==='duel')return true;
 const cue=tutorialCue(run);
 if(cue.action==='target')return (action.type==='pick'||action.type==='chooseTarget')&&action.uid!==null;
 if(action.type!==cue.action)return false;
 if(action.type==='play')return run.state.players[0].hand[action.idx]?.id===cue.cardId;
 if(action.type==='buyMarket')return run.state.market[action.i]?.id===cue.cardId;
 return true;
}
