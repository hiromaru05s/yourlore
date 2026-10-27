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
 {kind:'board',title:c('デュエル画面の機能','Board controls','인게임 기능'),intro:c('上は相手、下は自分。まずは画面の向きと勝利条件を確認しよう。','Learn which side is yours and how a duel is won.','위는 상대, 아래는 나야. 화면 구조와 승리 조건부터 확인해.')},
 {kind:'board',title:c('マナを使う','Spend mana','마나 사용하기'),intro:c('アチューンを使って、マナとカードの移動を確かめよう。','Play Attune and watch mana and the card change.','어튠을 사용하고 마나와 카드의 이동을 확인해.')},
 {kind:'board',title:c('手札・召喚・スターター','Hand, summons and starters','손패·소환·스타터'),intro:c('ストーン・パップ、カル、宝箱を自分で使おう。','Play Stone Pup, Cull and Chest yourself.','스톤 펍, 컬, 보물상자를 직접 써 봐.')},
 {kind:'practice',title:c('マーケットと購入','Market and buying','마켓 설명 → 구매'),intro:c('両方のマーケットで購入し、提示を更新しよう。','Buy from both markets and refresh the offers.','양쪽 마켓에서 구매하고 변동 마켓을 갱신해.')},
 {kind:'practice',title:c('購入カードとデッキ循環','Purchase and deck cycle','구매 카드와 덱 회전'),intro:c('購入したカードが墓地、デッキ、手札へ移動する順序を見よう。','Follow a purchase through graveyard, deck and hand.','구매한 카드가 묘지·덱·손패로 이동하는 순서를 봐.')},
 {kind:'practice',title:c('ドローと召喚','Draw and summon','카드를 뽑고 몬스터 소환'),intro:c('ターンを進めてカードを引き、モンスターを場へ出そう。','Draw cards on your next turn and summon a monster.','다음 턴에 카드를 뽑고 몬스터를 필드에 소환해.')},
 {kind:'practice',title:c('モンスター体力・破壊・墓地','Monster HP and destruction','몬스터 체력과 파괴·묘지'),intro:c('モンスターの体力を0にして、破壊後の行き先を確認しよう。','Reduce monster HP to zero and check where it goes.','몬스터 체력을 0으로 만들고 파괴된 뒤의 이동을 확인해.')},
 {kind:'practice',title:c('キャラクター攻撃とモンスター攻撃','Character and monster attacks','상대 캐릭터·몬스터 공격'),intro:c('相手の場が空の時と、モンスターがいる時の攻撃をそれぞれ試そう。','Practice attacking a character and an enemy monster.','상대 필드가 빈 경우와 몬스터가 있는 경우를 각각 공격해.')},
 {kind:'practice',title:c('魔法と特殊カード','Spells and special cards','마법과 특수 카드'),intro:c('通常魔法、クイック魔法、場に残る効果を実際に使おう。','Use a normal spell, a Quick spell and a persistent effect.','일반 마법·퀵 마법·필드에 남는 효과를 직접 사용해.')},
 {kind:'practice',title:c('応用：効果のタイミング','Extra: effect timing','심화: 효과의 발동 시점'),intro:c('召喚時、ターン開始・終了時、条件付き効果を発動する瞬間に確認しよう。','Learn complex effects only when their trigger actually occurs.','소환시·턴 시작·종료·조건부 효과를 실제 발동할 때 설명해.')},
 {kind:'practice',title:c('攻撃しないHP10 AIと実戦','Practice against a passive 10-HP AI','공격하지 않는 HP 10 AI와 실전'),intro:c('相手は攻撃しないよ。学んだ操作を自分の順序で使って勝とう。','The opponent will not attack. Win using the actions you learned, in your own order.','상대는 공격하지 않아. 배운 조작을 원하는 순서로 사용해 승리하세.')},
 {kind:'home',title:c('勝利後のホーム','Home after victory','승리 후 홈 화면'),intro:c('対戦モード、ランク、使用中デッキの場所を実際のホームで見よう。','Review duel modes, rank and your active deck on the real Home screen.','실제 홈에서 대전 모드·랭크·사용 중인 덱을 확인해.')},
 {kind:'deck',title:c('スターターデッキ設定','Set a starter deck','홈에서 스타터 덱 설정'),intro:c('プリセット、固定アチューン、自由8枚、使用デッキの確定方法を見よう。','Learn presets, fixed Attune, eight chosen cards and how to activate a deck.','프리셋·고정 어튠·자유 8장·사용 덱 확정 방법을 확인해.')},
];

// The curriculum is new; only the production reducer and reusable practice machinery
// are shared with historical lessons. Copy is always explicit in all three languages.
const step=(selector:string|undefined,title:Copy,body:Copy,extra:Partial<TutorialTourStep>={}):TutorialTourStep=>({selector,title,body,...extra});
const hand=(id:string)=>`#hand .card[data-card-id="${id}"]`;
const mon=(id:string)=>`#meRow .zone-mon .card[data-card-id="${id}"]`;
const openHand=()=>step('#hand',c('手札を開く','Open your hand','손패 열기'),c('下の手札を押してみて。カードが広がるよ。','Press the hand at the bottom to expand it.','화면 아래 손패를 누르면 펼쳐져.'),{action:'click',opened:'.game.hand-open',skipOnBack:true});
const playCard=(id:string,title:Copy,body:Copy,until:(g:GameState)=>boolean):TutorialTourStep=>step('#hand',title,body,{pointer:hand(id),action:'play',until,skipOnBack:true,placement:'top-left'});
const closePile=(title:Copy,body:Copy)=>step('.overlay .modal',title,body,{close:'.overlay .modal .btn-ghost',undo:'.overlay .modal .btn-ghost',skipOnBack:true});
const stats=():TutorialTourStep[]=>[
 step(`${mon('M2')} .ad-atk`,c('攻撃力','Attack','공격력'),c('左の「1」が攻撃力だよ。1回の攻撃で、これだけダメージを与えるんだ。','The 1 on the left is ATK: damage dealt by one attack.','왼쪽 1이 공격력이야. 한 번의 공격으로 주는 피해야.')),
 step(`${mon('M2')} .ad-def`,c('モンスターの体力','Monster health','몬스터 체력'),c('右の3が体力。0になると壊れるよ。プレイヤーの精神力とは別だよ。','The 3 on the right is HP. At zero the monster is destroyed. This is separate from player Spirit.','오른쪽 3이 체력이야. 0이면 파괴돼. 플레이어 정신력과는 달라.')),
];
export const PART_TOURS:Partial<Record<number,TutorialTourStep[]>>={
 0:[
 step(undefined,c('デュエル画面の機能','Board controls','인게임 기능'),c('やあ、ゼノだよ！ 上が相手、下がきみの場所。相手の精神力を0にしたら勝ちだよ。まずはぼくと画面を見ていこう。','Hey, I’m Zeno! Your opponent is above, and you’re below. Bring their Spirit to zero to win. Let’s find our way around together.','안녕, 난 제노야! 위는 상대, 아래는 네 자리야. 상대 정신력을 0으로 만들면 이겨. 나랑 같이 화면부터 둘러보자.')),
 step('#logTab',c('対戦ログ','Battle log','전투 로그'),c('何が起きたか気になったら、ここを押してみて。ぼくとログを見てみよう。','Press here to inspect past actions.','여기를 눌러 지금까지의 행동을 확인해.'),{action:'click'}),
 step('#logPanel',c('ログを読む・閉じる','Read and close the log','로그 읽기·닫기'),c('買ったカード、使ったカード、攻撃が順番に並んでるね。「次へ」を押したら、ぼくが閉じるよ。','Purchases, plays and attacks appear by turn. Next closes the log.','구매·사용·공격이 턴 순서로 나와. 다음을 누르면 로그가 닫혀.'),{close:'#logClose',undo:'#logClose',skipOnBack:true}),
 step('#muteBtn',c('効果音','Sound effects','효과음'),c('音の大きさを変えたい？ ここを押してみて。','Press to open the volume control.','누르면 음량 조절이 열려.'),{action:'click'}),
 step('#muteBtn + .vol-pop',c('音量調節','Volume','음량 조절'),c('このつまみを動かして、好きな音量にしてみて。いちばん左なら音が消えるよ。','Use the slider to adjust volume. The left end is mute.','슬라이더로 음량을 조절해. 맨 왼쪽은 음소거야.'),{enableOn:{selector:'#muteBtn + .vol-pop input',event:'input'},close:'#muteBtn',undo:'#muteBtn',skipOnBack:true}),
 step('#helpBtn',c('操作方法','Controls','조작 방법'),c('操作を忘れても大丈夫。ここからいつでも見直せるよ。開いてみよう。','Review how to play or inspect cards here.','카드 사용과 확대 방법을 언제든 확인할 수 있어.'),{action:'click'}),
 step('.help-modal',c('操作を確認','Read the controls','조작 확인'),c('カードは手札から場へドラッグすると使えるよ。覚えたら、次へいこう！','Drag cards from hand onto the field to play them. Read the controls, then continue.','손패 카드를 필드로 드래그해 사용해. 확인했으면 다음을 눌러 봐.'),{close:'.help-modal .btn-gold',undo:'.help-modal .btn-gold',skipOnBack:true}),
 step('#portraitOpp',c('相手のプロフィール','Opponent profile','상대 프로필'),c('こっちが相手のプロフィールだよ。残りの精神力も、ここで見られるんだ。','Your opponent is above. Their Spirit is shown here.','위쪽이 상대야. 정신력도 여기에 표시돼.')),
 step('#portraitMe',c('自分のプロフィール','Your profile','내 프로필'),c('こっちはきみのプロフィール。精神力とマナはここを見てね。','You are below. Check your Spirit and mana here.','아래쪽이 나야. 내 정신력과 마나를 확인해.')),
 step('#portraitMe .pt-mana',c('マナ','Mana','마나'),c('このマナでカードを買ったり、召喚したり、魔法を使ったりするんだ。あとで一緒に使ってみよう！','Buying, summoning and spells share this resource. Try it in the next part.','구매·소환·마법에 함께 쓰는 자원이야. 다음 파트에서 사용해 봐.')),
 step('#oppRow .zone-mon',c('相手のモンスター','Enemy monsters','상대 몬스터'),c('相手のモンスターはここに並ぶよ。攻撃するときは、どの相手を狙うか見てみてね。','Enemy monsters occupy this row.','상대 몬스터가 놓이는 곳이야.')),
 step('#meRow .zone-mon',c('自分のモンスター','Your monsters','내 몬스터'),c('きみが召喚したモンスターはここに並ぶよ。もうすぐ自分で出してみよう！','Your summoned monsters occupy this row.','내가 소환한 몬스터가 놓이는 곳이야.')),
 step('#meRow .zone-st',c('効果カードの列','Persistent effects','효과 카드 줄'),c('場に残る魔法なんかは、ここに並ぶよ。モンスターの列とは別なんだ。','Spells and other effects that stay deployed appear here.','필드에 남는 마법 등의 효과가 놓여.')),
 step('#pile-myDeck',c('自分のデッキ','Your deck','내 덱'),c('きみのデッキを押して、中を見てみよう。','Press to inspect your deck information.','눌러서 덱 정보를 확인해.'),{action:'click'}),
 closePile(c('デッキ情報','Deck information','덱 정보'),c('デッキに何が入ってるか見られるよ。どの順番で引くかは選べないから、そこだけ覚えておこう。','Inspect your deck composition here. This does not let you choose draw order.','덱 구성을 확인해. 뽑는 순서를 고르는 기능은 아니에.')),
 step('#pile-oppDeck',c('相手のデッキ','Opponent deck','상대 덱'),c('相手のデッキを押し、公開される情報を確認してみよう。','Press the opponent deck to inspect its public information.','상대 덱을 눌러 공개되는 정보를 확인해.'),{action:'click'}),
 closePile(c('相手の公開情報','Opponent public information','상대 공개 정보'),c('相手のデッキも、公開されてる情報は見られるんだ。でも、相手の手札までは見えないよ。','Review the information shown here. This does not reveal the opponent’s hand.','여기에 표시되는 공개 정보를 확인해. 상대 손패를 보는 기능은 아니에.')),
 step('#pile-myDisc',c('自分の墓地','Your graveyard','내 묘지'),c('使用・破壊・通常購入したカードの行き先だよ。押して確認してみよう。','Used, destroyed and normally purchased cards go here. Press to inspect.','사용·파괴·일반 구매한 카드가 가는 곳이야. 눌러 봐.'),{action:'click'}),
 closePile(c('墓地の循環','Graveyard cycle','묘지의 순환'),c('デッキが空になったら、墓地を混ぜてデッキに戻すんだ。また引けるようになるよ。','When the deck runs out, the graveyard is shuffled back into it.','덱이 비면 묘지를 섞어 덱으로 되돌려.')),
 step('#pile-oppDisc',c('相手の墓地','Opponent graveyard','상대 묘지'),c('相手の墓地も押して中身を確認できるよ。','You can inspect the opponent’s graveyard too.','상대 묘지도 눌러 내용을 확인할 수 있어.'),{action:'click'}),
 closePile(c('相手が使ったカード','Opponent’s used cards','상대가 쓴 카드'),c('使われたカードを確認し、次に戻るカードを予想できるよ。','Check used cards to anticipate what may cycle back.','사용한 카드를 보고 다시 돌아올 카드를 예상해.')),
 step('#rift-me',c('自分のリフト','Your Rift','내 리프트'),c('通常の循環から外れたカードの置き場だよ。押して見てみよう。','Cards outside the normal cycle go here. Press to inspect.','일반 순환에서 벗어난 카드가 가는 곳이야. 눌러 확인해.'),{action:'click'}),
 closePile(c('墓地との違い','Unlike the graveyard','묘지와의 차이'),c('普通のデッキ再構成では戻らないんだ。明記されたカード効果は例外だよ。','A normal reshuffle does not return these cards. Explicit card effects can be exceptions.','일반 덱 재구성으로는 돌아오지 않아. 명시된 카드 효과는 예외야.')),
 step('#rift-opp',c('相手のリフト','Opponent Rift','상대 리프트'),c('相手のリフトも同じように確認できるよ。','Inspect the opponent’s Rift the same way.','상대 리프트도 같은 방법으로 확인해.'),{action:'click'}),
 closePile(c('相手のリフトを確認','Inspect their Rift','상대 리프트 확인'),c('このデュエル中に循環から外れた相手のカードだよ。','These opposing cards are outside this duel’s normal cycle.','이번 듀얼의 일반 순환에서 벗어난 상대 카드야.')),
 step('#fixedMarket',c('固定マーケット','Fixed market','고정 마켓'),c('マナを使ってカードを買えるよ。在庫に限りがあり、購入で減るよ。','Spend mana to buy cards. Stock is limited and decreases when bought.','마나로 카드를 구매해. 재고에 한도가 있고 구매하면 줄어.')),
 step('#supplyMarket',c('提示マーケット','Shared offers','변동 마켓'),c('両プレイヤー共用の3枠。購入した空き枠は次のターン開始に補充され、残りはそのまま残るよ。','Three slots are shared by both players. Empty purchased slots refill at the next turn start; unsold cards stay.','두 플레이어가 공유하는 3칸이야. 구매한 빈칸은 다음 턴 시작에 보충되고 나머지는 유지돼.')),
 step('#refreshBtn',c('提示の更新','Refresh offers','변동 마켓 갱신'),c('マナ1で提示を入れ替えられるよ。購入と更新は後のパートで実際に試してみよう。','Refresh the offers for 1 mana. You will practice buying and refreshing shortly.','마나 1로 제시를 갱신해. 뒤의 파트에서 구매와 갱신을 직접 해 봐.')),
 ],
 1:[
 step('#portraitMe .pt-mana',c('マナを使う','Spend mana','마나 사용하기'),c('今は5マナあるね。まずはアチューン1枚を用意したよ。使ってみよう！','You have 5 mana and only Attune in your hand.','지금 마나는 5야. 손패에는 어튠만 준비했어.')),
 openHand(),
 step('#hand',c('アチューンを使う','Play Attune','어튠 사용'),c('アチューンを場へドラッグしてみよう。マナ3を使うよ。','Drag Attune onto the field. It costs 3 mana.','어튠을 필드로 드래그해. 마나 3을 지불해.'),{region:[hand('STARTER_MANA'),'#portraitMe .pt-mana'],ringEach:true,action:'play',pointer:hand('STARTER_MANA'),until:g=>g.players[0].maxMana===6,skipOnBack:true}),
 step(undefined,c('使った結果','The result','사용 결과'),c('ほら、マナが5から2になったね！ アチューンで最大マナは1増えて、カードは墓地へ。次は別のカードも使ってみよう。','Current mana fell from 5 to 2. Attune raised maximum mana by 1 and moved to the graveyard. Next, try other cards.','현재 마나는 5에서 2로 줄었어. 어튠은 최대 마나를 1 늘리고 묘지로 갔어. 다음에는 다른 카드를 사용해 봐.'),{dim:false}),
 ],
 2:[openHand(),
 playCard('M2',c('モンスターを召喚','Summon a monster','몬스터 소환'),c('指が示すストーン・パップを場へドラッグしてみよう。','Drag the indicated Stone Pup onto the field.','손가락이 가리키는 스톤 펍을 필드로 드래그해.'),g=>g.players[0].field.some(m=>m.id==='M2')),
 ...stats(),
 playCard('STARTER_TRASH',c('カルを使う','Play Cull','컬 사용'),c('手札を開き、カルを場へドラッグ。カル自身がリフトへ移り、デッキを圧縮できるよ。','Open your hand and drag Cull onto the field. Cull itself goes to the Rift, thinning your deck.','손패를 열고 컬을 필드로 드래그해. 컬 자신이 리프트로 가서 덱을 압축해.'),g=>g.players[0].removed?.some(c=>c.id==='STARTER_TRASH')===true),
 playCard('STARTER_CHEST',c('宝箱とダイス','Chest and dice','보물상자와 주사위'),c('宝箱を開けてみよう！ ダイスが1・2なら相手にミミック、3・4なら精神力が5回復、5・6なら最大マナが1増えるよ。何が出るかな？','Play Chest. 1–2: an enemy Mimic; 3–4: heal 5 Spirit; 5–6: +1 max mana. The die determines the result.','보물상자를 써 봐. 1·2: 상대에게 미믹, 3·4: 정신력 5 회복, 5·6: 최대 마나+1. 주사위에 따라 결과가 달라져.'),g=>!g.players[0].hand.some(c=>c.id==='STARTER_CHEST')),
 step(undefined,c('3枚とも使えたね！','Three cards played','세 장을 사용했어'),c('3枚とも使えたね！ 同じスターターでも、できることが違うんだ。気になるカードは拡大して読んでみてね。','You tried a summon, moving a card to the Rift, and a dice effect. Inspect cards to read their differences.','소환, 리프트 이동, 주사위 효과를 체험했어. 카드를 확대해 차이를 읽을 수 있어.'),{dim:false}),
 ],
 3:[
 step('#fixedMarket',c('固定から購入','Buy from the fixed market','고정 마켓 구매'),c('ブレード・ヘアをダブルクリックして購入。マナと在庫が減るよ。','Double-click Blade Hare to buy it. Mana and stock decrease.','블레이드 헤어를 더블클릭해 구매해. 마나와 재고가 줄어.'),{action:'play',pointer:'#fixedMarket .card[data-card-id="M4"]',until:g=>g.marketStock?.[0]===2,skipOnBack:true}),
 step('#supplyMarket',c('提示から購入','Buy a shared offer','변동 마켓 구매'),c('ストーン・パップをダブルクリックで購入。空き枠は次のターン開始に補充されるよ。','Double-click Stone Pup. Its empty slot refills at the next turn start.','스톤 펍을 더블클릭해 구매해. 빈칸은 다음 턴 시작에 보충돼.'),{action:'play',pointer:'#supplyMarket .card[data-card-id="M2"]',until:g=>g.players[0].supply[0]===null,skipOnBack:true}),
 step('#refreshBtn',c('提示を更新','Refresh the offers','변동 마켓 갱신'),c('更新ボタンを押してみよう。マナ1で提示が変わるよ。手札は変わらないよ。','Press Refresh. Spend 1 mana to change the offers; your hand stays the same.','갱신 버튼을 눌러 봐. 마나 1로 제시가 바뀌고 손패는 그대로야.'),{action:'play',until:g=>g.players[0].mana===3,skipOnBack:true}),
 step(undefined,c('購入は墓地へ','Purchases go to the graveyard','구매 카드는 묘지로'),c('購入と使用は別々にマナを使うよ。次は、購入したカードを手札に引くまでを見てみよう。','Buying and playing have separate costs. Next follow a purchased card until it reaches your hand.','구매와 사용은 각각 마나를 지불해. 다음에는 구매 카드를 손패로 뽑는 과정을 봐.'),{dim:false}),
 ],
 5:[step('#endBtn',c('次の手札を引く','Draw your next hand','다음 손패 뽑기'),c('ターンを終了し、次の自分の番に3枚引いてみよう。','End your turn, then draw three on your next turn.','턴을 끝내고 다음 내 턴에 세 장을 뽑아.'),{action:'play',until:g=>g.cur===0&&g.players[0].hand.length===3,skipOnBack:true}),openHand(),playCard('M2',c('引いたカードを召喚','Summon the drawn card','뽑은 카드 소환'),c('デッキから引いたストーン・パップを場へドラッグしてみよう。','Drag the Stone Pup drawn from your deck onto the field.','덱에서 뽑은 스톤 펍을 필드로 드래그해.'),g=>g.players[0].field.some(m=>m.id==='M2')),...stats()],
};

export const HOME_TOUR:TutorialTourStep[]=[
 step('.home-companion',c('ホームへようこそ','Welcome home','홈에 오신 것을 환영해'),c('おかえり！ よくできたね。ここがホームだよ。次の対戦もデッキ作りも、ここから始めよう。','Welcome back! Nice work. This is Home. Let’s see where you can start another duel or build a deck.','실전 후 여기에서 다음 대전이나 덱 편집으로 갈 수 있어.')),
 step('.lounge-mode-tabs',c('対戦モード','Duel modes','대전 모드'),c('シングル、ノーマル、ランク。遊びたいモードはここで選べるよ。今はぼくと場所だけ見ておこう。','Choose Single, Normal or Ranked. This tour will not start a match.','싱글·노멀·랭크를 선택해. 안내 중에는 대전을 시작하지 않아.')),
 step('#ranked',c('対戦開始','Start a duel','대전 시작'),c('モードを選んだら中央のボタンから始められるよ。','After choosing a mode, use the central button to start.','모드를 고른 뒤 중앙 버튼으로 시작해.')),
 step('#myTier',c('ランク','Rank','랭크'),c('現在のランクを確認できるよ。','Check your current rank here.','현재 랭크를 확인해.')),
 step('#deck',c('使用するデッキ','Active deck','사용 덱'),c('次の対戦に持ち込むデッキだよ。次は編集画面を見てみよう。','This is the deck for your next duel. Next, inspect the editor.','다음 대전에 가져갈 덱이야. 다음으로 편집 화면을 확인해.')),
];
export const DECK_TOUR:TutorialTourStep[]=[
 step('#deckTabs',c('デッキの保存枠','Deck presets','덱 프리셋'),c('5つの枠に別々の構成を保存できるよ。','Save separate decks in five slots.','다섯 슬롯에 서로 다른 덱을 저장해.')),
 step('#deckCur',c('持参デッキ','Starting deck','시작 덱'),c('自由8枚と固定アチューン1枚の9枚だよ。','Eight chosen cards plus one fixed Attune: nine cards.','자유 8장과 고정 어튠 1장, 총 9장이야.')),
 step('.deck-attune-lock',c('固定アチューン','Fixed Attune','고정 어튠'),c('この1枚は外せないんだ。残りの8枚を組み替えてみよう。','This card cannot be removed. Edit the other eight.','이 한 장은 뺄 수 없어. 나머지 8장을 편집해.')),
 step('#deckPool',c('スターター候補','Starter candidates','스타터 후보'),c('持ってるスターターを選ぶと、追加したり入れ替えたりできるよ。今はぼくと見て回ろう。あとで自由に組んでみてね。','Choose owned starters to add or swap. This tour leaves your deck unchanged.','보유 스타터를 선택해 추가·교체해. 안내 중에는 덱을 변경하지 않아.')),
 step('#deckTabs .deck-star',c('使用デッキ','Active deck','사용 덱'),c('チェック付きの枠が使用中だよ。別の枠を選ぶと「使用する」操作が出てくるよ。','The checked preset is active. Select another preset to reveal its Use control.','체크된 프리셋이 사용 중이야. 다른 슬롯을 선택하면 사용 버튼이 나타나.')),
 step('#save',c('デッキを確定','Confirm deck','덱 확정'),c('編集後は確定して保存しよう。次はカード一覧の見方だよ。','Confirm after editing to save. Next, learn the card catalog.','편집 후 확정해 저장해. 다음에는 카드 목록을 살펴봐.')),
];
export const CARDS_TOUR:TutorialTourStep[]=[
 step('.cards-screen',c('カード一覧','Card catalog','카드 목록'),c('気になるカードは、ここで探して読んでみてね。マーケットで出会うカードも載ってるよ。ぼくの案内はここまで。また一緒に遊ぼう！','Find cards and inspect their details in the catalog, including cards encountered in duel markets.','카드 목록에서 카드를 찾고 상세를 확인해. 듀얼의 마켓에서 만날 카드도 실려 있어.')),
];
export const tutorialPartKey=(part:number,accountId?:string)=>`lore:tutorial:parts:v3:${encodeURIComponent(accountId??'guest')}:complete:${part}`;
export function partScenes(part:number):PracticeScene[]{
 if(part===0)return[scene(b=>{b.mana(8);b.hand('M2','E3');b.mon('M2',1);b.me.discard=[b.card('M4')];b.opp.discard=[b.card('M1')];b.removed(1);b.opp.removed=[b.card('STARTER_TRASH')];b.me.supply=[b.card('M1'),b.card('M2'),b.card('M4')];},[],c('','',''),c('','',''))];
 if(part===1)return[scene(b=>{b.mana(5);b.hand('STARTER_MANA');},[play('STARTER_MANA')],c('','',''),c('','',''))];
 if(part===2)return[scene(b=>{b.mana(5);b.me.hp=30;b.hand('M2','STARTER_TRASH','STARTER_CHEST');},[play('M2'),play('STARTER_TRASH'),play('STARTER_CHEST')],c('','',''),c('','',''))];
 if(part===3)return[scene(b=>{b.mana(7);b.me.supply=[b.card('M2'),b.card('M1'),b.card('M4')];},[buy('M4'),buy('M2',true),{action:'refresh'}],c('','',''),c('','',''))];
 if(part===4)return[scene(b=>{b.me.deck=[b.card('STARTER_TRASH')];b.me.discard=[b.card('STARTER_CHEST')];},[buy('M4'),end()],c('ブレード・ヘアを購入してターン終了。デッキ1枚、墓地にも1枚ある状態から、購入カードがどう手札へ届くか見てみよう。','Buy Blade Hare, then end your turn. One card starts in the deck and one in the graveyard; follow the purchased card into your hand.','블레이드 헤어를 구매하고 턴을 끝내. 덱과 묘지에 한 장씩 있는 상태에서 구매 카드가 손패로 오는 과정을 봐.'),c('ほら、買ったブレード・ヘアが手札に来たね！ デッキの最後の1枚を引いたあと、墓地の2枚を混ぜて引いたんだ。','After drawing the last deck card, the two graveyard cards were shuffled and drawn. Blade Hare is now in your hand.','덱의 마지막 한 장을 뽑은 뒤 묘지의 두 장을 섞어 뽑았어. 블레이드 헤어가 손패에 있어.'))];
 if(part===5)return[scene(b=>{b.hand();b.me.deck=[b.card('STARTER_TRASH'),b.card('STARTER_CHEST'),b.card('M2')];},[end(),play('M2')],c('','',''),c('','',''))];
 if(part===6)return tutorialScenes('combat').slice(1,2).map(s=>({...s,question:undefined}));
 if(part===7)return[
  ...tutorialScenes('attack').map(s=>({...s,question:undefined})),
  scene(b=>{b.hand('M2');b.mon('M2',1);},[play('M2'),{...attack('M2'),targetId:'M2'}],c('ストーン・パップを手札から召喚し、相手のストーン・パップへドラッグしてみよう。','Summon Stone Pup from your hand, drag it onto the opposing Stone Pup.','손패의 스톤 펍을 소환하고 상대 스톤 펍으로 드래그해 봐.'),c('相手の体力が3から2へ。通常のモンスターは自動では反撃せず、傷は次のターンにも残るよ。','Enemy HP fell from 3 to 2. Normal monsters do not automatically retaliate, and damage persists.','상대 체력이 3에서 2로 줄었어. 일반 몬스터는 자동 반격하지 않고 피해는 다음 턴에도 남아.')),
 ];
 if(part===8)return['spell','quick','enchant'].flatMap(id=>tutorialScenes(id as 'spell'|'quick'|'enchant').slice(0,1).map(s=>({...s,question:undefined})));
 if(part===9)return[...tutorialScenes('timing').slice(0,3),...tutorialScenes('requirements').slice(0,1)].map(s=>({...s,question:undefined}));
 if(part===10)return[scene(b=>{b.mana(7);b.hand('M4','M4','M2');b.opp.hp=10;b.me.deck=[b.card('M4'),b.card('M2'),b.card('GRAPE')];},[free(g=>g.over&&g.winner===0,c('モンスターを召喚して攻撃し、相手の精神力を0にしてみよう。','Summon and attack until enemy Spirit reaches zero.','몬스터를 소환하고 공격해 상대 정신력을 0으로 만들어 봐.'))],c('今度は好きな順番でやってみよう。ぼくは攻撃しないから、落ち着いて試していいよ。','The opponent passes without attacking. Try the actions you learned in your own order.','상대는 공격하지 않고 턴을 넘겨. 배운 행동을 원하는 순서로 해 봐.'),c('やった、きみの勝ち！ ここまでできたらばっちりだね。一緒にホームへ戻って、デッキとカードも見てみよう。','You won! Nicely done. Come with me—let’s check out Home, your decks and the cards.','승리! 다음은 홈·덱·카드 목록을 확인해.'))];
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
