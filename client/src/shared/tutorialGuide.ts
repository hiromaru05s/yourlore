import {copy as c, type Copy} from './tutorialSteps';
import {currentScene,tutorialActionAllowed,type LessonRun} from './tutorialLesson';
import {DB,STARTERS} from './cards';
import {actingSide} from './engine';
import type {PracticeAction} from './tutorial/model';
export const TUTORIAL_BASICS = [
 {kind:'goal',title:c('何をしたら勝ち？','How do I win?','어떻게 이기나요?'),body:c('LOREは、2人で交互にカードを使うゲーム。「精神力」はプレイヤーの体力のこと。相手の精神力を先に0にすると勝ちだよ。','LORE is a game where two players take turns using cards. Spirit is each player’s health. Bring your opponent’s Spirit to zero first to win.','LORE는 두 사람이 번갈아 카드를 쓰는 게임이에요. 정신력은 플레이어의 체력이에요. 상대 정신력을 먼저 0으로 만들면 이겨요.'),labels:[c('相手の精神力','Opponent’s Spirit','상대 정신력'),c('攻撃する','Attack','공격하기'),c('0で勝ち！','Zero means victory!','0이면 승리!')]},
 {kind:'board',title:c('カードはどこにある？','Where are my cards?','카드는 어디에 있나요?'),body:c('手元のカードが「手札」。モンスターを手札から「場」に出すと、攻撃できるようになるよ。これを「召喚」と呼ぶよ。','The cards you hold are your hand. Play a monster from your hand onto the field so it can attack. This is called summoning.','가지고 있는 카드가 손패예요. 손패의 몬스터를 필드에 내면 공격할 수 있어요. 이것을 소환이라고 해요.'),labels:[c('相手の場：上','Enemy field: above','상대 필드: 위'),c('自分の場','Your field','자신의 필드'),c('手札：画面の下','Hand: bottom of screen','손패: 화면 아래')]},
 {kind:'mana',title:c('カードを使うには？','How do I play a card?','카드를 어떻게 쓰나요?'),body:c('カードを使うには「マナ」というエネルギーが必要だよ。マナ4から、マナ2のカードを使うと、残りは2になるよ。','Cards cost an energy called mana. If you have 4 mana and play a card costing 2, you have 2 left.','카드를 쓰려면 마나라는 에너지가 필요해요. 마나 4에서 마나 2인 카드를 쓰면 2가 남아요.'),labels:[c('持っているマナ','Mana available','현재 마나'),c('カードに使う','Card cost','카드에 사용'),c('残りのマナ','Mana left','남은 마나')]},
 {kind:'turn',title:c('自分の番が終わったら？','What happens after my turn?','내 차례가 끝나면?'),body:c('行動が終わったら「ターン終了」。相手の番のあと、また自分の番になるよ。マナが最大まで回復し、デッキという山からカードを3枚引くよ。','Press End Turn when you are done. After the opponent’s turn, it is your turn again: mana refills and you draw 3 cards from your deck.','행동을 마치면 턴 종료를 눌러요. 상대 차례가 끝나면 다시 내 차례예요. 마나가 최대까지 회복되고 덱이라는 카드 더미에서 3장을 뽑아요.'),labels:[c('自分の番','Your turn','내 차례'),c('相手の番','Their turn','상대 차례'),c('マナ回復 ＋ 3枚引く','Refill mana + draw 3','마나 회복 + 3장 뽑기')]},
 {kind:'buy',title:c('カードを増やすには？','How do I get more cards?','카드를 더 얻으려면?'),body:c('対戦中は「マーケット」でマナを使ってカードを購入できるよ。通常購入したカードはまず墓地へ。デッキが空になると戻り、手札に引いてから使えるよ。','During a game, spend mana to buy cards from the market. Normal purchases go to the graveyard first, return when your deck runs out, and can be played after you draw them.','대전 중에는 마켓에서 마나로 카드를 구매해요. 일반 구매는 먼저 묘지로 가고, 덱이 비면 돌아와요. 손패로 뽑은 뒤 사용할 수 있어요.'),labels:[c('購入 → 墓地','Buy → graveyard','구매 → 묘지'),c('デッキに戻る','Return to deck','덱으로 돌아옴'),c('手札に引く','Draw into hand','손패로 뽑기')]},
] as const;

export interface LessonCue {step:number;total:number;instruction:Copy;reason:Copy;action:PracticeAction|'target'|'wait'|'review'|'question';cardId?:string;}
export function tutorialCue(run:LessonRun,handOpen=true):LessonCue {
 const scene=currentScene(run),step=scene.steps[run.step];
 const cue=(instruction:Copy,action:LessonCue['action'],reason=step?.hint??(run.step===0?scene.intro:step?.action==='endTurn'?c('次の自分のターンを迎えて、数字やカードの動きを確かめよう。相手の番はぼくが進めるよ。','Reach your next turn and observe the numbers and cards. I will take the opponent’s turn.','다음 내 턴을 맞으며 숫자와 카드 이동을 봐요. 상대 차례는 제가 진행해요.'):c('ここまでの変化が次の操作につながるよ。今の盤面と、使うカードの条件を確認して進もう。','The previous action prepared this one. Check the current board and the card’s requirements, then continue.','앞선 변화가 다음 행동으로 이어져요. 지금 필드와 카드 조건을 확인하고 진행해요.')),cardId?:string):LessonCue=>({step:Math.min(run.step+1,scene.steps.length),total:scene.steps.length,instruction,reason,action,cardId});
 if(run.done||run.phase==='review')return cue(scene.result,'review',c('確かめたら、次へ進もう。','When you are ready, continue.','확인했으면 다음으로 가요.'));
 if(run.phase==='question')return cue(scene.question!.prompt,'question',run.wrongAnswer?scene.question!.explanation:c('今の盤面で起きたことを、一緒に確かめよう。間違えてもやり直せるよ。','Let’s check what happened. You can try again if you miss it.','방금 일어난 일을 확인해요. 틀려도 다시 고를 수 있어요.'));
 if(actingSide(run.state)===1)return cue(c('相手の動きを見よう。','Watch the opponent’s action.','상대 행동을 봐요.'),'wait',c('攻撃や効果が終わるまで待ってね。時間制限はないよ。','Wait for the attack or effect to finish. There is no timer.','공격·효과가 끝날 때까지 기다려요. 시간제한은 없어요.'));
 if(run.state.pending)return cue(c('光っている対象や、表示された選択肢から選ぼう。','Choose a highlighted target or an offered option.','빛나는 대상이나 표시된 선택지를 골라요.'),'target');
 const card=step.id?(DB[step.id]??STARTERS[step.id]):undefined;
 const names=card?c(card.nameJa??card.name,card.nameEn??card.name,card.name):c('味方','your monster','아군');
 switch(step.action){
 case 'play':return cue(handOpen?c(`「${names.ja}」を場へドラッグしよう。`,`Drag ${names.en} onto the field.`,`「${names.ko}」을 필드로 드래그해요.`):c('下の手札をクリックして、手札を広げよう。','Click your hand at the bottom to open it.','아래 손패를 클릭해 펼쳐요.'),'play',undefined,step.id);
 case 'attack':return cue(c(`自分の「${names.ja}」をクリックして攻撃しよう。`,`Click your ${names.en} to attack.`,`내 「${names.ko}」을 클릭해 공격해요.`),'attack',undefined,step.id);
 case 'buyMarket':case 'buySupply':return cue(c(`マーケットの「${names.ja}」をダブルクリックして購入しよう。`,`Double-click ${names.en} in the market to buy it.`,`마켓의 「${names.ko}」을 더블클릭해 구매해요.`),step.action,undefined,step.id);
 case 'refresh':return cue(c('提示マーケットの「更新」をクリックしよう。','Click Refresh in the personal offers.','제시 마켓의 갱신을 클릭해요.'),'refresh');
 case 'endTurn':return cue(c('「ターン終了」をクリックしよう。','Click End Turn.','턴 종료를 클릭해요.'),'endTurn');
 default:return cue(c('ここは自分で行動を選んでみよう。','Choose your own actions here.','여기서는 행동을 직접 골라 봐요.'),'free');
 }
}
export const isTutorialActionAllowed=tutorialActionAllowed;
