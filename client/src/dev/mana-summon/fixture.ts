import '../../styles/fonts.css';
import '../../styles/reading-board.css';
import '../../styles/tokens.css';
import '../../styles/base.css';
import '../../styles/card.css';
import '../../styles/game-overlays.css';
import '../../styles/game.css';
import '../../styles/dice.css';
import '../../styles/screens.css';
import '../../styles/mobile.css';
import '../../styles/duel-opening.css';
import '../../styles/lounge.css';
import '../../styles/loungeGame.css';
import '../../styles/loungeStage.css';
import '../../styles/presentation.css';
import '../../styles/defaultUI.css';
import './scene.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {createGame} from '../../shared/engine';
import {DB} from '../../shared/cards';
import {setLang} from '../../i18n';
import {startBoardLayout} from '../../ui/layout';
export function mountFixture(){
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const root=document.getElementById('app')!;const noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const stopLayout=startBoardLayout();
const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'vfx-me',name:'シーカー'},p1:{id:'vfx-opp',name:'シーカー'}}).state;
g.turn=3;g.phase='main';g.pending=null;g.sleeves=['default','default'];g.furnitures=['default','default'];
for(const [i,p] of g.players.entries()){
 Object.assign(p,{openingDrawReady:false,mana:8,maxMana:10,hp:30,maxHp:30,enchants:[],quests:[],traps:[],discard:[],removed:[]});
 p.field=['M4','M2','M5'].map((id,n)=>({...DB[id],uid:`field-${i}-${n}`,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0}));
 p.hand=['M4','S4','M3'].map((id,n)=>({...DB[id],uid:`hand-${i}-${n}`}));
 p.deck=Array.from({length:12},(_,n)=>({...DB.M3,uid:`deck-${i}-${n}`}));
}
view.render(g);view.setHandOpen(true);
return {root,view,g,stopLayout};
}

/** Real before/after hand snapshots shared by both sides of the comparison. */
export function resetFixtureHands(g:ReturnType<typeof mountFixture>['g'],spell='S4'){
 for(const [i,p] of g.players.entries())p.hand=['M4',spell,'M3'].map((id,n)=>({...DB[id],uid:`hand-${i}-${n}`}));
}
export async function prepareDrawFixture(f:ReturnType<typeof mountFixture>,count:number,side:number,spell='S4'){
 const {captureHandLayout}=await import('../../ui/handGeometry');
 resetFixtureHands(f.g,spell);f.view.render(f.g);f.view.setHandOpen(true);
 await settleFixtureHand();
 const hand=document.getElementById(side?'oppHand':'hand')!;
 const previous=captureHandLayout(hand);
 const incoming=['M2','M5','S3','M4'].slice(0,count).map((id,i)=>({...DB[id],uid:`draw-${side}-${i}`}));
 f.g.players[side].hand.push(...incoming);f.view.render(f.g);
 await settleFixtureHand();
 return {previous,uids:incoming.map(c=>c.uid)};
}
async function settleFixtureHand(){
 await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
 for(const a of document.getAnimations())if(a instanceof CSSTransition)a.finish();
}
