import {copy as c,type Copy} from './tutorialSteps';
import {tutorialScenes} from './tutorial/scenes';
import {practiceBoard,scene,play,attack,end,buy,free,type PracticeScene} from './tutorial/model';
import type {LessonRun} from './tutorialLesson';
import {reduce} from './engine';
import {DB,STARTERS} from './cards';
import type {Action,GameEvent,GameState} from './types';

export interface TutorialPartMeta {title:Copy;intro:Copy;kind:'board'|'practice'|'home'|'deck';}
export type TourPlacement='bottom-left'|'bottom-right'|'top-left'|'top-right';
export interface TutorialTourStep {
 /** Element that receives the tight highlight ring (and the click target for action:'click'). */
 selector?:string;
 /** Several elements whose combined bounds form one highlight (e.g. a whole side of the board). */
 region?:string[];
 /** A larger area kept sharp and undimmed around the target, typically an open popup. */
 focus?:string;
 action?:'next'|'click'|'play';
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

export const TUTORIAL_PARTS:TutorialPartMeta[]=[
 {kind:'board',title:c('デュエル画面と勝利条件','Board and victory','인게임 화면과 승리 조건'),intro:c('上は相手、下は自分。まずは画面の向きと勝利条件を確認しよう。','Learn which side is yours and how a duel is won.','위는 상대, 아래는 나예요. 화면 구조와 승리 조건부터 확인해요.')},
 {kind:'board',title:c('精神力・ターン・マナ','Spirit, turns and mana','캐릭터 체력·턴·마나'),intro:c('キャラクターの精神力と、現在マナ・最大マナを順に見よう。','Read Spirit, turn state, current mana and maximum mana.','캐릭터 정신력과 턴, 현재 마나·최대 마나를 하나씩 봐요.')},
 {kind:'board',title:c('スターターカードとコスト','Starter cards and costs','스타터 카드와 비용'),intro:c('スターターカードの数字と、使用時に支払うマナを見よう。','Read starter-card numbers and the mana paid to play them.','스타터 카드의 숫자와 사용할 때 내는 마나를 확인해요.')},
 {kind:'practice',title:c('マーケットと購入','Market and buying','마켓 설명 → 구매'),intro:c('固定マーケットと提示マーケットを見て、カードを1枚購入しよう。','Inspect both markets and buy one card.','고정 마켓과 변동 마켓을 보고 카드를 한 장 구매해요.')},
 {kind:'practice',title:c('購入カードとデッキ循環','Purchase and deck cycle','구매 카드와 덱 회전'),intro:c('購入したカードが墓地、デッキ、手札へ移動する順序を見よう。','Follow a purchase through graveyard, deck and hand.','구매한 카드가 묘지·덱·손패로 이동하는 순서를 봐요.')},
 {kind:'practice',title:c('ドローと召喚','Draw and summon','카드를 뽑고 몬스터 소환'),intro:c('ターンを進めてカードを引き、モンスターを場へ出そう。','Draw cards on your next turn and summon a monster.','다음 턴에 카드를 뽑고 몬스터를 필드에 소환해요.')},
 {kind:'practice',title:c('モンスター体力・破壊・墓地','Monster HP and destruction','몬스터 체력과 파괴·묘지'),intro:c('モンスターの体力を0にして、破壊後の行き先を確認しよう。','Reduce monster HP to zero and check where it goes.','몬스터 체력을 0으로 만들고 파괴된 뒤의 이동을 확인해요.')},
 {kind:'practice',title:c('キャラクター攻撃とモンスター攻撃','Character and monster attacks','상대 캐릭터·몬스터 공격'),intro:c('相手の場が空の時と、モンスターがいる時の攻撃をそれぞれ試そう。','Practice attacking a character and an enemy monster.','상대 필드가 빈 경우와 몬스터가 있는 경우를 각각 공격해요.')},
 {kind:'practice',title:c('魔法と特殊カード','Spells and special cards','함정·마법 등 특수 카드'),intro:c('通常魔法、クイック魔法、場に残る効果を実際に使おう。','Use a normal spell, a Quick spell and a persistent effect.','일반 마법·퀵 마법·필드에 남는 효과를 직접 사용해요.')},
 {kind:'practice',title:c('難しい効果のタイミング','Difficult effects in context','어려운 효과는 발동 시점에'),intro:c('召喚時、ターン開始・終了時、条件付き効果を発動する瞬間に確認しよう。','Learn complex effects only when their trigger actually occurs.','소환시·턴 시작·종료·조건부 효과를 실제 발동할 때 설명해요.')},
 {kind:'practice',title:c('攻撃しないHP10 AIと実戦','Practice against a passive 10-HP AI','공격하지 않는 HP 10 AI와 실전'),intro:c('相手は攻撃しないよ。学んだ操作を自分の順序で使って勝とう。','The opponent will not attack. Win using the actions you learned, in your own order.','상대는 공격하지 않아요. 배운 조작을 원하는 순서로 사용해 승리하세요.')},
 {kind:'home',title:c('勝利後のホーム','Home after victory','승리 후 홈 화면'),intro:c('対戦モード、ランク、使用中デッキの場所を実際のホームで見よう。','Review duel modes, rank and your active deck on the real Home screen.','실제 홈에서 대전 모드·랭크·사용 중인 덱을 확인해요.')},
 {kind:'deck',title:c('スターターデッキ設定','Set a starter deck','홈에서 스타터 덱 설정'),intro:c('プリセット、固定アチューン、自由8枚、使用デッキの確定方法を見よう。','Learn presets, fixed Attune, eight chosen cards and how to activate a deck.','프리셋·고정 어튀·자유 8장·사용 덱 확정 방법을 확인해요.')},
];

const ko=(value:string)=>c(value,value,value);
export const PART_TOURS:Partial<Record<number,TutorialTourStep[]>>={
 0:[
  {title:ko('실제 대전 화면'),body:ko('지금은 제노와 대전 중인 9턴째예요. 상대 정신력은 10, 내 필드에는 드래곤 라이더가 있어요. 화면을 하나씩 살펴본 뒤 직접 승리까지 가 볼게요.'),prompt:ko('다음을 눌러 시작하세요.')},
  {selector:'#logTab',action:'click',title:ko('전투 로그'),body:ko('지금까지 두 사람이 둔 수가 모두 기록돼요.'),prompt:ko('로그 버튼을 눌러 직접 열어 보세요.')},
  {selector:'#log',focus:'#logPanel',title:ko('로그 읽기'),body:ko('구매·카드 사용·공격·피해가 턴 순서대로 쌓여요. 내 턴과 상대 턴은 배경색으로 구분돼요. 상대 정신력이 24에서 10이 된 이유도 여기서 확인할 수 있어요.'),prompt:ko('기록을 읽어 본 뒤 다음을 누르세요.'),undo:'#logClose',skipOnBack:true},
  {selector:'#logClose',focus:'#logPanel',action:'click',title:ko('로그 닫기'),body:ko('필요할 때 다시 열어 지나간 행동을 확인할 수 있어요.'),prompt:ko('✕ 버튼을 눌러 로그를 닫으세요.'),undo:'#logClose',skipOnBack:true},
  {selector:'#muteBtn',action:'click',title:ko('효과음'),body:ko('전투 효과음의 크기를 조절하는 버튼이에요.'),prompt:ko('버튼을 눌러 음량 바를 여세요.')},
  {selector:'#muteBtn + .vol-pop',focus:'#muteBtn + .vol-pop',title:ko('음량 조절'),body:ko('바를 움직여 효과음 크기를 바꿔요. 맨 왼쪽은 음소거예요. 버튼을 두 번 누르면 바로 음소거·해제도 돼요.'),prompt:ko('바를 직접 움직인 뒤 다음을 누르세요.'),enableOn:{selector:'#muteBtn + .vol-pop input',event:'input'},undo:'#muteBtn',skipOnBack:true},
  {selector:'#helpBtn',action:'click',title:ko('조작 방법'),body:ko('드래그·우클릭·더미 확인 같은 조작을 언제든 다시 볼 수 있어요.'),prompt:ko('버튼을 눌러 조작 방법을 여세요.')},
  {selector:'.help-modal .btn-gold',focus:'.help-modal',action:'click',title:ko('조작 방법 닫기'),body:ko('카드 확대, 사용, 공격, 마켓 조작이 정리되어 있어요.'),prompt:ko('내용을 확인한 뒤 닫기 버튼을 누르세요.'),undo:'.help-modal .btn-gold',skipOnBack:true},
  {region:['#portraitOpp','#oppRow .zone-mon','#pile-oppDisc','#rift-opp'],title:ko('상대 위치'),body:ko('화면 위쪽이 상대 진영이에요. 상대 프로필부터 상대 필드, 묘지·덱·리프트까지 모두 상대의 것이에요.'),prompt:ko('상대 진영의 범위를 확인하세요.')},
  {region:['#portraitMe','#meRow .zone-mon','#pile-myDisc','#rift-me'],title:ko('내 위치'),body:ko('화면 아래쪽이 내 진영이에요. 상대와 같은 구성이 위아래로 마주 보고 있어요.'),prompt:ko('내 진영의 범위를 확인하세요.')},
  {selector:'#portraitMe .pt-mana',title:ko('마나'),body:ko('마나는 카드 구매·몬스터 소환·마법 사용에 함께 쓰는 자원이에요. 내 턴이 시작되면 최대치까지 회복돼요.'),prompt:ko('내 마나를 확인하세요.')},
  {region:['#hand','#portraitMe .pt-mana'],action:'play',ringEach:true,until:g=>g.players[0].maxMana>=6,title:ko('마나 사용해 보기'),body:ko('어튠은 마나 3을 내고 최대 마나를 1 늘리는 카드예요. 사용하면 마나가 실제로 줄어드는 걸 볼 수 있어요.'),prompt:ko('손패를 눌러 펼친 뒤 어튠을 필드로 드래그하세요.')},
  {selector:'#portraitMe .mana-readout',title:ko('마나 숫자'),body:ko('큰 숫자는 지금 쓸 수 있는 마나, 작은 숫자는 최대 마나예요. 어튠에 3을 써서 5가 2로 줄었고, 최대 마나는 5에서 6이 됐어요.'),prompt:ko('현재 마나와 최대 마나를 비교하세요.')},
  {selector:'#oppRow .zone-mon',title:ko('상대 필드'),body:ko('상대가 소환한 몬스터가 놓이는 곳이에요. 지금은 스파크 임프(공격력 3 / 체력 1)가 있어요.'),prompt:ko('상대 필드를 확인하세요.')},
  {selector:'#meRow .zone-mon',title:ko('내 필드 · 몬스터'),body:ko('내 몬스터가 놓이는 칸이에요. 드래곤 라이더(공격력 14 / 체력 7)가 공격을 기다리고 있어요.'),prompt:ko('몬스터 칸을 확인하세요.')},
  {selector:'#meRow .zone-st .buff-icon[data-card-id="E3"]',focus:'#meRow .zone-st',title:ko('내 필드 · 효과 카드'),body:ko('몬스터 칸 아래 줄은 필드에 남아 계속 효과를 내는 카드 자리예요. 이 아이콘이 지식의 샘으로, 내 턴 시작마다 카드를 1장 더 뽑게 해요.'),prompt:ko('몬스터 칸과 효과 카드 줄을 구분해 보세요. 아이콘을 우클릭하면 효과를 볼 수 있어요.')},
  {selector:'#pile-myDeck',action:'click',title:ko('내 덱'),body:ko('아직 뽑지 않은 카드 더미예요.'),prompt:ko('덱을 눌러 구성을 확인하세요.')},
  {selector:'.overlay .modal .btn-ghost',focus:'.overlay .modal',action:'click',title:ko('덱 확인 닫기'),body:ko('덱 전체 구성과 아직 뽑지 않은 카드를 볼 수 있어요.'),prompt:ko('확인한 뒤 아래 버튼을 눌러 창을 닫으세요.'),undo:'.overlay .modal .btn-ghost',skipOnBack:true},
  {selector:'#pile-myDisc',action:'click',title:ko('묘지'),body:ko('사용했거나 파괴된 카드가 놓이는 곳이에요. 방금 쓴 어튠도 여기로 갔어요.'),prompt:ko('묘지를 눌러 확인하세요.')},
  {selector:'.overlay .picker-modal .btn-ghost',focus:'.overlay .picker-modal',action:'click',title:ko('묘지 확인 닫기'),body:ko('덱이 비면 묘지의 카드를 섞어 다시 덱으로 만들어요.'),prompt:ko('확인한 뒤 아래 버튼을 눌러 창을 닫으세요.'),undo:'.overlay .picker-modal .btn-ghost',skipOnBack:true},
  {selector:'#rift-me',action:'click',title:ko('리프트'),body:ko('컬처럼 게임에서 제외되는 카드가 놓이는 별도 영역이에요.'),prompt:ko('리프트를 눌러 확인하세요.')},
  {selector:'.overlay .picker-modal .btn-ghost',focus:'.overlay .picker-modal',action:'click',title:ko('리프트 확인 닫기'),body:ko('리프트의 카드는 다시 덱으로 돌아오지 않아요. 묘지와는 다른 영역이에요.'),prompt:ko('확인한 뒤 아래 버튼을 눌러 창을 닫으세요.'),undo:'.overlay .picker-modal .btn-ghost',skipOnBack:true},
  {selector:'#portraitOpp .pt-vitals',title:ko('정신력과 승리 조건'),body:ko('캐릭터의 체력을 정신력이라고 해요. 상대 정신력을 0으로 만들면 승리해요. 상대는 지금 10 남았어요.'),prompt:ko('상대 정신력을 확인하세요.')},
  {region:['#meRow .zone-mon .card[data-card-id="DRAGON_RIDER"]','#oppRow .zone-mon','#portraitOpp .pt-vitals'],action:'play',ringEach:true,until:g=>g.over&&g.winner===0,title:ko('관통 공격으로 승리'),body:ko('몬스터를 공격하고 남은 공격력은 상대 정신력에 관통 피해로 들어가요. 드래곤 라이더 14 − 스파크 임프 체력 1 = 13 관통이면 정신력 10을 넘어요.'),prompt:ko('드래곤 라이더를 스파크 임프에게 드래그해 공격하세요.')},
  {title:ko('승리!'),body:ko('몬스터를 쓰러뜨리고 남은 피해가 상대 정신력을 0으로 만들었어요. 이것이 LORE의 기본 승리 방법이에요.'),prompt:ko('다음 파트에서 턴과 마나를 더 자세히 배워요.')},
 ],
 1:[
  {selector:'#portraitMe .pt-vitals',title:ko('캐릭터 정신력'),body:ko('이 숫자가 플레이어의 체력이에요. 0이 되면 패배해요.'),prompt:ko('현재 정신력을 확인하세요.'),placement:'top-right'},
  {selector:'#turnInfo',title:ko('턴 표시'),body:ko('현재 턴 번호와 누구의 차례인지 표시해요.'),prompt:ko('내 턴 표시를 확인하세요.'),placement:'bottom-left'},
  {selector:'#portraitMe .mana-readout',title:ko('현재 마나'),body:ko('큰 숫자는 지금 사용할 수 있는 마나예요. 구매·소환·마법이 같은 마나를 써요.'),prompt:ko('현재 마나를 확인하세요.'),placement:'top-right'},
  {selector:'#portraitMe .pt-mana-max',title:ko('최대 마나'),body:ko('작은 숫자는 최대 마나예요. 내 턴 시작에 현재 마나가 이 수치까지 회복돼요.'),prompt:ko('현재·최대 마나를 비교하세요.'),placement:'top-right'},
  {selector:'#endBtn',title:ko('턴 종료'),body:ko('행동을 마치면 턴 종료를 눌러 상대에게 차례를 넘겨요.'),prompt:ko('버튼 위치만 확인하세요.'),placement:'bottom-left'},
 ],
 2:[
  {selector:'#hand',action:'click',title:ko('손패 열기'),body:ko('손패를 누르면 카드가 펼쳐져요. 카드는 필드로 드래그해 사용해요.'),prompt:ko('손패를 눌러 펼쳐 보세요.'),placement:'top-left'},
  {selector:'#hand .card[data-card-id="M2"]',title:ko('몬스터 카드'),body:ko('왼쪽 위 숫자는 마나 비용, 아래의 두 숫자는 공격력과 체력이에요.'),prompt:ko('스톤 펍의 비용·공격력·체력을 확인하세요.'),placement:'top-left'},
  {selector:'#hand .card[data-card-id="STARTER_MANA"]',title:ko('어튀'),body:ko('고정 스타터 카드예요. 현재 마나를 사용해 최대 마나를 늘려요.'),prompt:ko('카드의 비용을 확인하세요.'),placement:'top-left'},
  {selector:'#hand .card[data-card-id="STARTER_TRASH"]',title:ko('컬과 특수 효과'),body:ko('컬은 사용 후 묘지가 아닌 리프트로 가요. 이런 예외는 카드 문장을 읽어 확인해요.'),prompt:ko('어려운 효과는 실제 사용할 때 다시 설명할게요.'),placement:'top-left'},
 ],
 3:[
  {selector:'#fixedMarket',title:ko('고정 마켓'),body:ko('내 전용 마켓이에요. 구매하면 해당 카드의 재고가 한 장 줄어요.'),prompt:ko('카드와 재고 표시를 확인하세요.'),placement:'bottom-left'},
  {selector:'#supplyMarket',title:ko('변동 마켓'),body:ko('공유 제시 카드가 놓이는 곳이에요. 고정 마켓과 다른 카드 구성을 비교해 보세요.'),prompt:ko('변동 마켓 영역을 확인하세요.'),placement:'bottom-right'},
  {selector:'#refreshBtn',title:ko('변동 마켓 리롤'),body:ko('마나를 내고 변동 마켓의 제시 카드를 새로 바꾸는 버튼이에요.'),prompt:ko('이번에는 위치만 확인하고, 다음에 카드를 구매해요.'),placement:'bottom-right'},
 ],
};

export const HOME_TOUR:TutorialTourStep[]=[
 {selector:'.home-companion',title:ko('제노'),body:ko('홈에서 제노와 함께 다음 행동을 선택해요.'),prompt:ko('홈의 중심 캐릭터예요.'),placement:'bottom-right'},
 {selector:'.lounge-mode-tabs',title:ko('대전 모드'),body:ko('랭크·일반·BOT 대전을 여기서 선택해요.'),prompt:ko('원하는 대전 종류를 먼저 고르세요.'),placement:'bottom-left'},
 {selector:'#ranked',title:ko('대전 시작'),body:ko('선택한 모드로 진입하는 주요 버튼이에요.'),prompt:ko('이 버튼에서 대전을 시작해요.'),placement:'bottom-left'},
 {selector:'#myTier',title:ko('내 랭크'),body:ko('현재 티어·점수·승급까지의 진행을 확인해요.'),prompt:ko('누르면 리더보드로 이동해요.'),placement:'bottom-left'},
 {selector:'#deck',title:ko('사용 중인 덱'),body:ko('다음 대전에 가져갈 스타터 덱이에요. 다음 파트에서 직접 설정해요.'),prompt:ko('다음은 덱 설정 화면입니다.'),placement:'bottom-left'},
];

export const DECK_TOUR:TutorialTourStep[]=[
 {selector:'#deckTabs',title:ko('덱 프리셋'),body:ko('총 5개의 덱을 별도로 저장할 수 있어요.'),prompt:ko('편집할 프리셋을 선택하세요.'),placement:'bottom-right'},
 {selector:'#deckCur',title:ko('현재 덱'),body:ko('대전에 가져갈 카드를 보여줘요. 어튀 1장은 고정이고 자유 카드 8장을 구성해요.'),prompt:ko('현재 구성과 9장 카운트를 확인하세요.'),placement:'top-right'},
 {selector:'.deck-attune-lock',title:ko('고정 어튀'),body:ko('어튀는 모든 스타터 덱에 한 장씩 고정돼요.'),prompt:ko('나머지 8장만 교체할 수 있어요.'),placement:'top-right'},
 {selector:'#deckPool',title:ko('스타터 카드 목록'),body:ko('보유한 스타터 카드를 보며 추가·교체해요.'),prompt:ko('카드의 + 버튼으로 덱에 넣을 수 있어요.'),placement:'top-left'},
 {selector:'#useBtn',title:ko('사용 덱 선택'),body:ko('편집 중인 프리셋을 다음 대전의 사용 덱으로 지정해요.'),prompt:ko('현재 사용 중인 덱은 체크로 표시돼요.'),placement:'top-left'},
 {selector:'#save',title:ko('덱 확정'),body:ko('구성을 바꿨다면 덱 확정을 눌러 저장해요.'),prompt:ko('저장까지 해야 변경 내용이 적용됩니다.'),placement:'top-left'},
];

export const tutorialPartKey=(part:number)=>`lore:tutorial:parts:v2:complete:${part}`;

export function partScenes(part:number):PracticeScene[]{
 if(part===0)return[firstDuelScene()];
 if(part===1)return[scene(()=>{},[],ko(''),ko(''))];
 if(part===2)return[scene(b=>b.hand('M2','STARTER_MANA','STARTER_TRASH','STARTER_CHEST'),[],ko(''),ko(''))];
 if(part===3)return[scene(b=>{b.me.supply=[b.card('M1'),b.card('M2'),b.card('M4')];},[buy('M4')],ko('고정 마켓의 블레이드 헤어를 살펴보고 더블클릭해 구매하세요. 구매와 카드 사용은 같은 현재 마나를 사용해요.'),ko('마나를 내고 카드를 구매했어요. 고정 마켓은 재고가 줄고, 변동 마켓은 공유된 제시 칸을 사용해요.'))];
 if(part===4)return[scene(b=>{b.me.deck=[];},[buy('M4'),end()],ko('덱을 비워 둘 테니 블레이드 헤어를 구매한 뒤 턴을 끝내세요. 카드 이동을 순서대로 볼 수 있어요.'),ko('일반 구매 → 묘지 → 덱 재구성 → 손패 순으로 이동했어요. 구매했다고 즉시 필드에 소환되지는 않아요.'))];
 if(part===5)return[scene(b=>{b.hand();b.me.deck=[b.card('STARTER_TRASH'),b.card('STARTER_CHEST'),b.card('M2')];},[end(),play('M2')],ko('턴을 종료해 다음 내 턴에 카드 3장을 뽑으세요. 그런 다음 스톤 펍을 필드로 드래그해 소환하세요.'),ko('턴 시작에 마나가 회복되고 카드를 뽑았어요. 소환 비용을 낸 몬스터는 내 아래쪽 필드에 놓여요.'))];
 if(part===6)return[scene(b=>{b.mon('M4');b.mon('M1',1);},[attack('M4')],ko('공격력 4인 블레이드 헤어를 상대 몬스터에게 드래그하세요. 상대의 남은 체력은 1이에요.'),ko('몬스터 체력이 0이 되어 파괴되고 묘지로 갔어요. 남은 3피해는 상대 정신력에 관통했어요.'))];
 if(part===7)return[
  ...tutorialScenes('attack').map(s=>({...s,question:undefined})),
  ...tutorialScenes('combat').slice(0,1).map(s=>({...s,question:undefined})),
 ];
 if(part===8)return[
  ...tutorialScenes('spell').slice(0,1).map(s=>({...s,question:undefined})),
  ...tutorialScenes('quick').slice(0,1).map(s=>({...s,question:undefined})),
  ...tutorialScenes('enchant').slice(0,1).map(s=>({...s,question:undefined})),
 ];
 if(part===9)return[
  ...tutorialScenes('timing').slice(0,3).map(s=>({...s,question:undefined})),
  ...tutorialScenes('requirements').slice(0,1).map(s=>({...s,question:undefined})),
 ];
 if(part===10)return[scene(b=>{b.mana(7);b.hand('M4','M4','M2');b.opp.hp=10;b.me.deck=[b.card('M4'),b.card('M2'),b.card('GRAPE')];},[free(g=>g.over&&g.winner===0,ko('상대는 공격하지 않고 턴만 넘겨요. 카드를 소환하고 공격해 정신력 10을 0으로 만드세요.'))],ko('이제 순서를 스스로 결정하세요. 카드를 살펴보고, 마나를 사용해 몬스터를 낸 뒤 상대를 공격하세요.'),ko('승리했어요. 화면 확인 → 카드 사용 → 몬스터 공격의 기본 흐름을 스스로 완성했어요.'))];
 return[];
}

/** Part 1 starts from a believable turn 9: the opening is replayed through the real engine so the battle log holds genuine history. */
const FIRST_DUEL_STEPS=[{action:'play' as const,id:'STARTER_MANA',goal:(g:GameState)=>g.players[0].maxMana>=6},{action:'attack' as const,id:'DRAGON_RIDER',targetId:'M1',goal:(g:GameState)=>g.over&&g.winner===0}];
function firstDuelScene():PracticeScene{
 return scene(b=>{
  b.g.turn=6;b.g.cur=1;
  b.me.hp=31;b.mana(5);b.mon('DRAGON_RIDER',0,{summonedTurn:3});b.hand('E3');
  b.me.deck=['STARTER_TRASH','STARTER_CHEST','STARTER_MANA','M2','STARTER_TRASH','STARTER_CHEST','M4','STARTER_TRASH','M3','STARTER_CHEST','S1','STARTER_TRASH','M2','STARTER_MANA'].map(b.card);
  b.me.discard=['M4','STARTER_CHEST','S1'].map(b.card);b.removed(1);
  b.opp.hp=24;b.opp.maxMana=b.opp.mana=5;b.opp.hand=[b.card('M1')];
  b.opp.deck=['M2','STARTER_TRASH','STARTER_CHEST','STARTER_MANA','M3','STARTER_TRASH','STARTER_CHEST','M1'].map(b.card);
  b.opp.discard=['STARTER_TRASH','M2'].map(b.card);
 },FIRST_DUEL_STEPS,ko(''),ko(''));
}
function firstDuelStart(scenes:PracticeScene[]):{state:GameState;history:GameEvent[]}{
 let g=practiceBoard(scenes[0]);
 const history:GameEvent[]=[{type:'turnHeader',turn:g.turn,name:g.players[1].name,isBot:true,player:1}];
 const act=(action:Action)=>{const r=reduce(g,action);g=r.state;history.push(...r.events);};
 act({type:'buyMarket',i:0});act({type:'endTurn'});
 act({type:'play',idx:0});act({type:'attack',uid:g.players[0].field[0].uid});act({type:'endTurn'});
 act({type:'play',idx:0});act({type:'endTurn'});
 const card=(id:string)=>({...structuredClone(DB[id]??STARTERS[id]),uid:`practice-${++g.uidSeq}`});
 // The draw itself is hidden information; give the learner a readable hand for the lesson.
 g.players[0].hand=['STARTER_MANA','STARTER_TRASH','STARTER_CHEST'].map(card);
 g.players[0].mana=g.players[0].maxMana=5;g.pending=null;
 return{state:g,history:history.filter(e=>e.type==='turnHeader'||e.type==='log')};
}

/** Local-only curriculum. It never submits legacy reward transcripts. */
export function createPartStart(part:number):{run:LessonRun;history:GameEvent[]}{
 const scenes=partScenes(part);if(!scenes.length)throw Error(`Tutorial part ${part+1} has no board scene`);
 const {state,history}=part===0?firstDuelStart(scenes):{state:practiceBoard(scenes[0]),history:[] as GameEvent[]};
 return{run:{id:'summon',state,scenes,actions:[],facts:new Set(),done:false,scene:0,step:0,phase:'play',wrongAnswer:false,events:[],stepTurn:state.turn},history};
}
export function createPartRun(part:number):LessonRun{return createPartStart(part).run;}
