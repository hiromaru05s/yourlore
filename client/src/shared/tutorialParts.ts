import {copy as c,type Copy} from './tutorialSteps';
import {tutorialScenes} from './tutorial/scenes';
import {practiceBoard,scene,play,attack,end,buy,free,type PracticeScene} from './tutorial/model';
import {reduce} from './engine';
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
 action?:'next'|'click'|'play';
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

export const TUTORIAL_PARTS:TutorialPartMeta[]=[
 {kind:'board',title:c('デュエル画面の機能','Board controls','인게임 기능'),intro:c('上は相手、下は自分。まずは画面の向きと勝利条件を確認しよう。','Learn which side is yours and how a duel is won.','위는 상대, 아래는 나예요. 화면 구조와 승리 조건부터 확인해요.')},
 {kind:'board',title:c('マナを使う','Spend mana','마나 사용하기'),intro:c('アチューンを使って、マナとカードの移動を確かめよう。','Play Attune and watch mana and the card change.','어튠을 사용하고 마나와 카드의 이동을 확인해요.')},
 {kind:'board',title:c('手札・召喚・スターター','Hand, summons and starters','손패·소환·스타터'),intro:c('ストーン・パップ、カル、宝箱を自分で使おう。','Play Stone Pup, Cull and Chest yourself.','스톤 펍, 컬, 보물상자를 직접 써 봐요.')},
 {kind:'practice',title:c('マーケットと購入','Market and buying','마켓 설명 → 구매'),intro:c('両方のマーケットで購入し、提示を更新しよう。','Buy from both markets and refresh the offers.','양쪽 마켓에서 구매하고 변동 마켓을 갱신해요.')},
 {kind:'practice',title:c('購入カードとデッキ循環','Purchase and deck cycle','구매 카드와 덱 회전'),intro:c('購入したカードが墓地、デッキ、手札へ移動する順序を見よう。','Follow a purchase through graveyard, deck and hand.','구매한 카드가 묘지·덱·손패로 이동하는 순서를 봐요.')},
 {kind:'practice',title:c('ドローと召喚','Draw and summon','카드를 뽑고 몬스터 소환'),intro:c('ターンを進めてカードを引き、モンスターを場へ出そう。','Draw cards on your next turn and summon a monster.','다음 턴에 카드를 뽑고 몬스터를 필드에 소환해요.')},
 {kind:'practice',title:c('モンスター体力・破壊・墓地','Monster HP and destruction','몬스터 체력과 파괴·묘지'),intro:c('モンスターの体力を0にして、破壊後の行き先を確認しよう。','Reduce monster HP to zero and check where it goes.','몬스터 체력을 0으로 만들고 파괴된 뒤의 이동을 확인해요.')},
 {kind:'practice',title:c('キャラクター攻撃とモンスター攻撃','Character and monster attacks','상대 캐릭터·몬스터 공격'),intro:c('相手の場が空の時と、モンスターがいる時の攻撃をそれぞれ試そう。','Practice attacking a character and an enemy monster.','상대 필드가 빈 경우와 몬스터가 있는 경우를 각각 공격해요.')},
 {kind:'practice',title:c('魔法と特殊カード','Spells and special cards','마법과 특수 카드'),intro:c('通常魔法、クイック魔法、場に残る効果を実際に使おう。','Use a normal spell, a Quick spell and a persistent effect.','일반 마법·퀵 마법·필드에 남는 효과를 직접 사용해요.')},
 {kind:'practice',title:c('応用：効果のタイミング','Extra: effect timing','심화: 효과의 발동 시점'),intro:c('召喚時、ターン開始・終了時、条件付き効果を発動する瞬間に確認しよう。','Learn complex effects only when their trigger actually occurs.','소환시·턴 시작·종료·조건부 효과를 실제 발동할 때 설명해요.')},
 {kind:'practice',title:c('攻撃しないHP10 AIと実戦','Practice against a passive 10-HP AI','공격하지 않는 HP 10 AI와 실전'),intro:c('相手は攻撃しないよ。学んだ操作を自分の順序で使って勝とう。','The opponent will not attack. Win using the actions you learned, in your own order.','상대는 공격하지 않아요. 배운 조작을 원하는 순서로 사용해 승리하세요.')},
 {kind:'home',title:c('勝利後のホーム','Home after victory','승리 후 홈 화면'),intro:c('対戦モード、ランク、使用中デッキの場所を実際のホームで見よう。','Review duel modes, rank and your active deck on the real Home screen.','실제 홈에서 대전 모드·랭크·사용 중인 덱을 확인해요.')},
 {kind:'deck',title:c('スターターデッキ設定','Set a starter deck','홈에서 스타터 덱 설정'),intro:c('プリセット、固定アチューン、自由8枚、使用デッキの確定方法を見よう。','Learn presets, fixed Attune, eight chosen cards and how to activate a deck.','프리셋·고정 어튠·자유 8장·사용 덱 확정 방법을 확인해요.')},
];

// The curriculum is new; only the production reducer and reusable practice machinery
// are shared with historical lessons. Copy is always explicit in all three languages.
const step=(selector:string|undefined,title:Copy,body:Copy,extra:Partial<TutorialTourStep>={}):TutorialTourStep=>({selector,title,body,...extra});
const hand=(id:string)=>`#hand .card[data-card-id="${id}"]`;
const mon=(id:string)=>`#meRow .zone-mon .card[data-card-id="${id}"]`;
const openHand=()=>step('#hand',c('手札を開く','Open your hand','손패 열기'),c('画面下の手札を押すと広がります。','Press the hand at the bottom to expand it.','화면 아래 손패를 누르면 펼쳐져요.'),{action:'click',opened:'.game.hand-open',skipOnBack:true});
const playCard=(id:string,title:Copy,body:Copy,until:(g:GameState)=>boolean):TutorialTourStep=>step('#hand',title,body,{pointer:hand(id),action:'play',until,skipOnBack:true,placement:'top-left'});
const closePile=(title:Copy,body:Copy)=>step('.overlay .modal',title,body,{close:'.overlay .modal .btn-ghost',undo:'.overlay .modal .btn-ghost',skipOnBack:true});
const stats=():TutorialTourStep[]=>[
 step(`${mon('M2')} .ad-atk`,c('攻撃力','Attack','공격력'),c('左の1が攻撃力。一度の攻撃で与えるダメージです。','The 1 on the left is ATK: damage dealt by one attack.','왼쪽 1이 공격력이에요. 한 번의 공격으로 주는 피해예요.')),
 step(`${mon('M2')} .ad-def`,c('モンスターの体力','Monster health','몬스터 체력'),c('右の3が体力。0になると破壊されます。プレイヤーの精神力とは別です。','The 3 on the right is HP. At zero the monster is destroyed. This is separate from player Spirit.','오른쪽 3이 체력이에요. 0이면 파괴돼요. 플레이어 정신력과는 달라요.')),
];
export const PART_TOURS:Partial<Record<number,TutorialTourStep[]>>={
 0:[
 step(undefined,c('デュエル画面の機能','Board controls','인게임 기능'),c('上が相手、下が自分です。相手の精神力を0にすると勝利。まず操作場所を確認し、次のパートから実際に使います。','Your opponent is above and you are below. Reduce their Spirit to zero to win. First find the controls; then practice using them.','위는 상대, 아래는 나예요. 상대 정신력을 0으로 만들면 승리해요. 먼저 기능의 위치를 보고 다음 파트부터 직접 사용해요.')),
 step('#logTab',c('対戦ログ','Battle log','전투 로그'),c('ここを押して、これまでの行動を確認します。','Press here to inspect past actions.','여기를 눌러 지금까지의 행동을 확인해요.'),{action:'click'}),
 step('#logPanel',c('ログを読む・閉じる','Read and close the log','로그 읽기·닫기'),c('購入・使用・攻撃がターン順に並びます。「次へ」でログを閉じます。','Purchases, plays and attacks appear by turn. Next closes the log.','구매·사용·공격이 턴 순서로 나와요. 다음을 누르면 로그가 닫혀요.'),{close:'#logClose',undo:'#logClose',skipOnBack:true}),
 step('#muteBtn',c('効果音','Sound effects','효과음'),c('押すと音量調節が開きます。','Press to open the volume control.','누르면 음량 조절이 열려요.'),{action:'click'}),
 step('#muteBtn + .vol-pop',c('音量調節','Volume','음량 조절'),c('スライダーで音量を調節できます。左端は消音です。','Use the slider to adjust volume. The left end is mute.','슬라이더로 음량을 조절해요. 맨 왼쪽은 음소거예요.'),{enableOn:{selector:'#muteBtn + .vol-pop input',event:'input'},close:'#muteBtn',undo:'#muteBtn',skipOnBack:true}),
 step('#helpBtn',c('操作方法','Controls','조작 방법'),c('カードの使用や拡大の方法をいつでも確認できます。','Review how to play or inspect cards here.','카드 사용과 확대 방법을 언제든 확인할 수 있어요.'),{action:'click'}),
 step('.help-modal',c('操作を確認','Read the controls','조작 확인'),c('カードは手札から場へドラッグして使います。確認したら「次へ」。','Drag cards from hand onto the field to play them. Read the controls, then continue.','손패 카드를 필드로 드래그해 사용해요. 확인했으면 다음을 누르세요.'),{close:'.help-modal .btn-gold',undo:'.help-modal .btn-gold',skipOnBack:true}),
 step('#portraitOpp',c('相手のプロフィール','Opponent profile','상대 프로필'),c('上が相手。精神力もここに表示されます。','Your opponent is above. Their Spirit is shown here.','위쪽이 상대예요. 정신력도 여기에 표시돼요.')),
 step('#portraitMe',c('自分のプロフィール','Your profile','내 프로필'),c('下が自分。自分の精神力とマナを確認できます。','You are below. Check your Spirit and mana here.','아래쪽이 나예요. 내 정신력과 마나를 확인해요.')),
 step('#portraitMe .pt-mana',c('マナ','Mana','마나'),c('購入・召喚・魔法に共通で使う資源です。次のパートで使ってみましょう。','Buying, summoning and spells share this resource. Try it in the next part.','구매·소환·마법에 함께 쓰는 자원이에요. 다음 파트에서 사용해 봐요.')),
 step('#oppRow .zone-mon',c('相手のモンスター','Enemy monsters','상대 몬스터'),c('相手のモンスターが並ぶ場所です。','Enemy monsters occupy this row.','상대 몬스터가 놓이는 곳이에요.')),
 step('#meRow .zone-mon',c('自分のモンスター','Your monsters','내 몬스터'),c('召喚した自分のモンスターが並びます。','Your summoned monsters occupy this row.','내가 소환한 몬스터가 놓이는 곳이에요.')),
 step('#meRow .zone-st',c('効果カードの列','Persistent effects','효과 카드 줄'),c('場に残る魔法などの効果が並びます。','Spells and other effects that stay deployed appear here.','필드에 남는 마법 등의 효과가 놓여요.')),
 step('#pile-myDeck',c('自分のデッキ','Your deck','내 덱'),c('押してデッキ情報を見ましょう。','Press to inspect your deck information.','눌러서 덱 정보를 확인해요.'),{action:'click'}),
 closePile(c('デッキ情報','Deck information','덱 정보'),c('デッキの構成を確認できます。引く順序を選ぶ操作ではありません。','Inspect your deck composition here. This does not let you choose draw order.','덱 구성을 확인해요. 뽑는 순서를 고르는 기능은 아니에요.')),
 step('#pile-oppDeck',c('相手のデッキ','Opponent deck','상대 덱'),c('相手のデッキを押し、公開される情報を確認しましょう。','Press the opponent deck to inspect its public information.','상대 덱을 눌러 공개되는 정보를 확인해요.'),{action:'click'}),
 closePile(c('相手の公開情報','Opponent public information','상대 공개 정보'),c('この画面で表示される公開情報を確認できます。相手の手札を選んで見る操作ではありません。','Review the information shown here. This does not reveal the opponent’s hand.','여기에 표시되는 공개 정보를 확인해요. 상대 손패를 보는 기능은 아니에요.')),
 step('#pile-myDisc',c('自分の墓地','Your graveyard','내 묘지'),c('使用・破壊・通常購入したカードの行き先です。押して確認しましょう。','Used, destroyed and normally purchased cards go here. Press to inspect.','사용·파괴·일반 구매한 카드가 가는 곳이에요. 눌러 보세요.'),{action:'click'}),
 closePile(c('墓地の循環','Graveyard cycle','묘지의 순환'),c('デッキが尽きると墓地を混ぜてデッキに戻します。','When the deck runs out, the graveyard is shuffled back into it.','덱이 비면 묘지를 섞어 덱으로 되돌려요.')),
 step('#pile-oppDisc',c('相手の墓地','Opponent graveyard','상대 묘지'),c('相手の墓地も押して中身を確認できます。','You can inspect the opponent’s graveyard too.','상대 묘지도 눌러 내용을 확인할 수 있어요.'),{action:'click'}),
 closePile(c('相手が使ったカード','Opponent’s used cards','상대가 쓴 카드'),c('使われたカードを確認し、次に戻るカードを考えられます。','Check used cards to anticipate what may cycle back.','사용한 카드를 보고 다시 돌아올 카드를 예상해요.')),
 step('#rift-me',c('自分のリフト','Your Rift','내 리프트'),c('通常の循環から外れたカードの置き場です。押して確認します。','Cards outside the normal cycle go here. Press to inspect.','일반 순환에서 벗어난 카드가 가는 곳이에요. 눌러 확인해요.'),{action:'click'}),
 closePile(c('墓地との違い','Unlike the graveyard','묘지와의 차이'),c('普通のデッキ再構成では戻りません。明記されたカード効果は例外です。','A normal reshuffle does not return these cards. Explicit card effects can be exceptions.','일반 덱 재구성으로는 돌아오지 않아요. 명시된 카드 효과는 예외예요.')),
 step('#rift-opp',c('相手のリフト','Opponent Rift','상대 리프트'),c('相手のリフトも同じように確認できます。','Inspect the opponent’s Rift the same way.','상대 리프트도 같은 방법으로 확인해요.'),{action:'click'}),
 closePile(c('相手のリフトを確認','Inspect their Rift','상대 리프트 확인'),c('このデュエル中に循環から外れた相手のカードです。','These opposing cards are outside this duel’s normal cycle.','이번 듀얼의 일반 순환에서 벗어난 상대 카드예요.')),
 step('#fixedMarket',c('固定マーケット','Fixed market','고정 마켓'),c('カードをマナで購入します。在庫に限りがあり、購入で減ります。','Spend mana to buy cards. Stock is limited and decreases when bought.','마나로 카드를 구매해요. 재고에 한도가 있고 구매하면 줄어요.')),
 step('#supplyMarket',c('提示マーケット','Shared offers','변동 마켓'),c('両プレイヤー共用の3枠。購入した空き枠は次のターン開始に補充され、残りは維持されます。','Three slots are shared by both players. Empty purchased slots refill at the next turn start; unsold cards stay.','두 플레이어가 공유하는 3칸이에요. 구매한 빈칸은 다음 턴 시작에 보충되고 나머지는 유지돼요.')),
 step('#refreshBtn',c('提示の更新','Refresh offers','변동 마켓 갱신'),c('マナ1で提示を更新します。購入と更新は後のパートで実際に試します。','Refresh the offers for 1 mana. You will practice buying and refreshing shortly.','마나 1로 제시를 갱신해요. 뒤의 파트에서 구매와 갱신을 직접 해 봐요.')),
 ],
 1:[
 step('#portraitMe .pt-mana',c('マナを使う','Spend mana','마나 사용하기'),c('今は5マナ。手札にはアチューンだけを用意しました。','You have 5 mana and only Attune in your hand.','지금 마나는 5예요. 손패에는 어튠만 준비했어요.')),
 openHand(),
 step('#hand',c('アチューンを使う','Play Attune','어튠 사용'),c('アチューンを場へドラッグしましょう。マナ3を支払います。','Drag Attune onto the field. It costs 3 mana.','어튠을 필드로 드래그해요. 마나 3을 지불해요.'),{region:[hand('STARTER_MANA'),'#portraitMe .pt-mana'],ringEach:true,action:'play',pointer:hand('STARTER_MANA'),until:g=>g.players[0].maxMana===6,skipOnBack:true}),
 step(undefined,c('使った結果','The result','사용 결과'),c('現在マナは5から2へ。アチューンは最大マナを1増やし、墓地へ移ります。次は別のカードを使ってみましょう。','Current mana fell from 5 to 2. Attune raised maximum mana by 1 and moved to the graveyard. Next, try other cards.','현재 마나는 5에서 2로 줄었어요. 어튠은 최대 마나를 1 늘리고 묘지로 갔어요. 다음에는 다른 카드를 사용해 봐요.'),{dim:false}),
 ],
 2:[openHand(),
 playCard('M2',c('モンスターを召喚','Summon a monster','몬스터 소환'),c('指が示すストーン・パップを場へドラッグしましょう。','Drag the indicated Stone Pup onto the field.','손가락이 가리키는 스톤 펍을 필드로 드래그해요.'),g=>g.players[0].field.some(m=>m.id==='M2')),
 ...stats(),
 playCard('STARTER_TRASH',c('カルを使う','Play Cull','컬 사용'),c('手札を開き、カルを場へドラッグ。カル自身がリフトへ移り、デッキを圧縮できます。','Open your hand and drag Cull onto the field. Cull itself goes to the Rift, thinning your deck.','손패를 열고 컬을 필드로 드래그해요. 컬 자신이 리프트로 가서 덱을 압축해요.'),g=>g.players[0].removed?.some(c=>c.id==='STARTER_TRASH')===true),
 playCard('STARTER_CHEST',c('宝箱とダイス','Chest and dice','보물상자와 주사위'),c('宝箱を使いましょう。1・2：相手にミミック、3・4：精神力5回復、5・6：最大マナ+1。出目で結果が変わります。','Play Chest. 1–2: an enemy Mimic; 3–4: heal 5 Spirit; 5–6: +1 max mana. The die determines the result.','보물상자를 써 봐요. 1·2: 상대에게 미믹, 3·4: 정신력 5 회복, 5·6: 최대 마나+1. 주사위에 따라 결과가 달라져요.'),g=>!g.players[0].hand.some(c=>c.id==='STARTER_CHEST')),
 step(undefined,c('3枚を使えました','Three cards played','세 장을 사용했어요'),c('召喚、リフトへの移動、ダイス効果を体験しました。カードごとの違いは拡大して読めます。','You tried a summon, moving a card to the Rift, and a dice effect. Inspect cards to read their differences.','소환, 리프트 이동, 주사위 효과를 체험했어요. 카드를 확대해 차이를 읽을 수 있어요.'),{dim:false}),
 ],
 3:[
 step('#fixedMarket',c('固定から購入','Buy from the fixed market','고정 마켓 구매'),c('ブレード・ヘアをダブルクリックして購入。マナと在庫が減ります。','Double-click Blade Hare to buy it. Mana and stock decrease.','블레이드 헤어를 더블클릭해 구매해요. 마나와 재고가 줄어요.'),{action:'play',pointer:'#fixedMarket .card[data-card-id="M4"]',until:g=>g.marketStock?.[0]===2,skipOnBack:true}),
 step('#supplyMarket',c('提示から購入','Buy a shared offer','변동 마켓 구매'),c('ストーン・パップをダブルクリックで購入。空き枠は次のターン開始に補充されます。','Double-click Stone Pup. Its empty slot refills at the next turn start.','스톤 펍을 더블클릭해 구매해요. 빈칸은 다음 턴 시작에 보충돼요.'),{action:'play',pointer:'#supplyMarket .card[data-card-id="M2"]',until:g=>g.players[0].supply[0]===null,skipOnBack:true}),
 step('#refreshBtn',c('提示を更新','Refresh the offers','변동 마켓 갱신'),c('更新ボタンを押しましょう。マナ1で提示が変わります。手札は変わりません。','Press Refresh. Spend 1 mana to change the offers; your hand stays the same.','갱신 버튼을 누르세요. 마나 1로 제시가 바뀌고 손패는 그대로예요.'),{action:'play',until:g=>g.players[0].mana===3,skipOnBack:true}),
 step(undefined,c('購入は墓地へ','Purchases go to the graveyard','구매 카드는 묘지로'),c('購入と使用は別々にマナを支払います。次は、購入したカードを手札に引くまでを見ましょう。','Buying and playing have separate costs. Next follow a purchased card until it reaches your hand.','구매와 사용은 각각 마나를 지불해요. 다음에는 구매 카드를 손패로 뽑는 과정을 봐요.'),{dim:false}),
 ],
 5:[step('#endBtn',c('次の手札を引く','Draw your next hand','다음 손패 뽑기'),c('ターンを終了し、次の自分の番に3枚引きましょう。','End your turn, then draw three on your next turn.','턴을 끝내고 다음 내 턴에 세 장을 뽑아요.'),{action:'play',until:g=>g.cur===0&&g.players[0].hand.length===3,skipOnBack:true}),openHand(),playCard('M2',c('引いたカードを召喚','Summon the drawn card','뽑은 카드 소환'),c('デッキから引いたストーン・パップを場へドラッグしましょう。','Drag the Stone Pup drawn from your deck onto the field.','덱에서 뽑은 스톤 펍을 필드로 드래그해요.'),g=>g.players[0].field.some(m=>m.id==='M2')),...stats()],
};

export const HOME_TOUR:TutorialTourStep[]=[
 step('.home-companion',c('ホームへようこそ','Welcome home','홈에 오신 것을 환영해요'),c('実戦の後は、ここから次の対戦やデッキ編集へ進めます。','After practice, return here for another duel or to edit your deck.','실전 후 여기에서 다음 대전이나 덱 편집으로 갈 수 있어요.')),
 step('.lounge-mode-tabs',c('対戦モード','Duel modes','대전 모드'),c('シングル・ノーマル・ランクを切り替えます。案内中は対戦を開始しません。','Choose Single, Normal or Ranked. This tour will not start a match.','싱글·노멀·랭크를 선택해요. 안내 중에는 대전을 시작하지 않아요.')),
 step('#ranked',c('対戦開始','Start a duel','대전 시작'),c('モードを選んだら中央のボタンから開始します。','After choosing a mode, use the central button to start.','모드를 고른 뒤 중앙 버튼으로 시작해요.')),
 step('#myTier',c('ランク','Rank','랭크'),c('現在のランクを確認できます。','Check your current rank here.','현재 랭크를 확인해요.')),
 step('#deck',c('使用するデッキ','Active deck','사용 덱'),c('次の対戦に持ち込むデッキです。次は編集画面を確認します。','This is the deck for your next duel. Next, inspect the editor.','다음 대전에 가져갈 덱이에요. 다음으로 편집 화면을 확인해요.')),
];
export const DECK_TOUR:TutorialTourStep[]=[
 step('#deckTabs',c('デッキの保存枠','Deck presets','덱 프리셋'),c('5つの枠に別々の構成を保存できます。','Save separate decks in five slots.','다섯 슬롯에 서로 다른 덱을 저장해요.')),
 step('#deckCur',c('持参デッキ','Starting deck','시작 덱'),c('自由8枚と固定アチューン1枚の9枚です。','Eight chosen cards plus one fixed Attune: nine cards.','자유 8장과 고정 어튠 1장, 총 9장이에요.')),
 step('.deck-attune-lock',c('固定アチューン','Fixed Attune','고정 어튠'),c('この1枚は外せません。残りの8枚を編集します。','This card cannot be removed. Edit the other eight.','이 한 장은 뺄 수 없어요. 나머지 8장을 편집해요.')),
 step('#deckPool',c('スターター候補','Starter candidates','스타터 후보'),c('所持するスターターを選んで追加・交換できます。案内中は構成を変更しません。','Choose owned starters to add or swap. This tour leaves your deck unchanged.','보유 스타터를 선택해 추가·교체해요. 안내 중에는 덱을 변경하지 않아요.')),
 step('#deckTabs .deck-star',c('使用デッキ','Active deck','사용 덱'),c('チェック付きの枠が使用中です。別の枠を選ぶと「使用する」操作が表示されます。','The checked preset is active. Select another preset to reveal its Use control.','체크된 프리셋이 사용 중이에요. 다른 슬롯을 선택하면 사용 버튼이 나타나요.')),
 step('#save',c('デッキを確定','Confirm deck','덱 확정'),c('編集後は確定して保存します。次はカード一覧の見方です。','Confirm after editing to save. Next, learn the card catalog.','편집 후 확정해 저장해요. 다음에는 카드 목록을 살펴봐요.')),
];
export const CARDS_TOUR:TutorialTourStep[]=[
 step('.cards-screen',c('カード一覧','Card catalog','카드 목록'),c('カード一覧でカードを探し、詳細を確認できます。カードの所持とは別に、対戦中のマーケットで出会うカードも載っています。','Find cards and inspect their details in the catalog, including cards encountered in duel markets.','카드 목록에서 카드를 찾고 상세를 확인해요. 듀얼의 마켓에서 만날 카드도 실려 있어요.')),
];
export const tutorialPartKey=(part:number,accountId?:string)=>`lore:tutorial:parts:v3:${encodeURIComponent(accountId??'guest')}:complete:${part}`;
export function partScenes(part:number):PracticeScene[]{
 if(part===0)return[scene(b=>{b.mana(8);b.hand('M2','E3');b.mon('M2',1);b.me.discard=[b.card('M4')];b.opp.discard=[b.card('M1')];b.removed(1);b.opp.removed=[b.card('STARTER_TRASH')];b.me.supply=[b.card('M1'),b.card('M2'),b.card('M4')];},[],c('','',''),c('','',''))];
 if(part===1)return[scene(b=>{b.mana(5);b.hand('STARTER_MANA');},[play('STARTER_MANA')],c('','',''),c('','',''))];
 if(part===2)return[scene(b=>{b.mana(5);b.me.hp=30;b.hand('M2','STARTER_TRASH','STARTER_CHEST');},[play('M2'),play('STARTER_TRASH'),play('STARTER_CHEST')],c('','',''),c('','',''))];
 if(part===3)return[scene(b=>{b.mana(7);b.me.supply=[b.card('M2'),b.card('M1'),b.card('M4')];},[buy('M4'),buy('M2',true),{action:'refresh'}],c('','',''),c('','',''))];
 if(part===4)return[scene(b=>{b.me.deck=[b.card('STARTER_TRASH')];b.me.discard=[b.card('STARTER_CHEST')];},[buy('M4'),end()],c('ブレード・ヘアを購入してターン終了。デッキ1枚、墓地にも1枚ある状態から、購入カードがどう手札へ届くか見ましょう。','Buy Blade Hare, then end your turn. One card starts in the deck and one in the graveyard; follow the purchased card into your hand.','블레이드 헤어를 구매하고 턴을 끝내요. 덱과 묘지에 한 장씩 있는 상태에서 구매 카드가 손패로 오는 과정을 봐요.'),c('デッキの最後の1枚を引いたあと、墓地の2枚を混ぜて引きました。ブレード・ヘアが手札にあります。','After drawing the last deck card, the two graveyard cards were shuffled and drawn. Blade Hare is now in your hand.','덱의 마지막 한 장을 뽑은 뒤 묘지의 두 장을 섞어 뽑았어요. 블레이드 헤어가 손패에 있어요.'))];
 if(part===5)return[scene(b=>{b.hand();b.me.deck=[b.card('STARTER_TRASH'),b.card('STARTER_CHEST'),b.card('M2')];},[end(),play('M2')],c('','',''),c('','',''))];
 if(part===6)return tutorialScenes('combat').slice(1,2).map(s=>({...s,question:undefined}));
 if(part===7)return[
  ...tutorialScenes('attack').map(s=>({...s,question:undefined})),
  scene(b=>{b.hand('M2');b.mon('M2',1);},[play('M2'),{...attack('M2'),targetId:'M2'}],c('ストーン・パップを手札から召喚し、相手のストーン・パップへドラッグしましょう。','Summon Stone Pup from your hand, drag it onto the opposing Stone Pup.','손패의 스톤 펍을 소환하고 상대 스톤 펍으로 드래그하세요.'),c('相手の体力が3から2へ。通常のモンスターは自動では反撃せず、傷は次のターンにも残ります。','Enemy HP fell from 3 to 2. Normal monsters do not automatically retaliate, and damage persists.','상대 체력이 3에서 2로 줄었어요. 일반 몬스터는 자동 반격하지 않고 피해는 다음 턴에도 남아요.')),
 ];
 if(part===8)return['spell','quick','enchant'].flatMap(id=>tutorialScenes(id as 'spell'|'quick'|'enchant').slice(0,1).map(s=>({...s,question:undefined})));
 if(part===9)return[...tutorialScenes('timing').slice(0,3),...tutorialScenes('requirements').slice(0,1)].map(s=>({...s,question:undefined}));
 if(part===10)return[scene(b=>{b.mana(7);b.hand('M4','M4','M2');b.opp.hp=10;b.me.deck=[b.card('M4'),b.card('M2'),b.card('GRAPE')];},[free(g=>g.over&&g.winner===0,c('モンスターを召喚して攻撃し、相手の精神力を0にしましょう。','Summon and attack until enemy Spirit reaches zero.','몬스터를 소환하고 공격해 상대 정신력을 0으로 만드세요.'))],c('相手は攻撃せずターンを渡します。学んだ操作を自分の順序で試しましょう。','The opponent passes without attacking. Try the actions you learned in your own order.','상대는 공격하지 않고 턴을 넘겨요. 배운 행동을 원하는 순서로 해 봐요.'),c('勝利！ 次はホーム・デッキ・カード一覧を確認します。','Victory! Next, explore Home, decks and the card catalog.','승리! 다음은 홈·덱·카드 목록을 확인해요.'))];
 return[];
}
export function createPartStart(part:number):{run:LessonRun;history:GameEvent[]}{
 const scenes=partScenes(part);if(!scenes.length)throw Error(`Tutorial part ${part+1} has no board scene`);
 let state=practiceBoard(scenes[0]);
 const history:GameEvent[]=[];
 if(part===0){
  history.push({type:'turnHeader',turn:state.turn,name:state.players[0].name,isBot:false,player:0});
  for(const action of [{type:'buyMarket' as const,i:0},{type:'play' as const,idx:0},{type:'play' as const,idx:0}]){
   const result=reduce(state,action);state=result.state;history.push(...result.events.filter(e=>e.type==='log'||e.type==='turnHeader'));
  }
 }
 return{run:{id:'summon',state,scenes,actions:[],facts:new Set(),done:false,scene:0,step:0,phase:'play',wrongAnswer:false,events:[],stepTurn:state.turn},history};
}
export function createPartRun(part:number):LessonRun{return createPartStart(part).run;}
