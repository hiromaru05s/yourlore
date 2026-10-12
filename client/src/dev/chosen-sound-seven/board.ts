import '../../styles/tokens.css';
import '../../styles/base.css';
import '../../styles/card.css';
import '../../styles/game-overlays.css';
import '../../styles/game.css';
import '../../styles/screens.css';
import '../../styles/reading-board.css';
import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {createGame} from '../../shared/engine';
import {DB,STARTERS} from '../../shared/cards';
import {startBoardLayout} from '../../ui/layout';
import {setLang} from '../../i18n';
import {waitForDuel} from '../../ui/duelReadiness';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'preview-me',name:'YOU'},p1:{id:'preview-opp',name:'OPPONENT'}}).state;
g.turn=3;g.pending=null;
for(const [side,p] of g.players.entries()){
 p.openingDrawReady=false;p.mana=8;p.maxMana=12;p.hp=32;p.enchants=[];p.quests=[];p.hand=[];
 p.discard=[{...DB.ELF,uid:`discard-${side}`}];
 p.field=['M4','ELF','GM6_0'].map((id,i)=>({...DB[id],uid:`rift-${side}-${i}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}));
 p.removed=Array.from({length:25},(_,i)=>({...STARTERS.STARTER_TRASH,uid:`cull-${side}-${i}`}));
 p.hand=[DB.CHOSEN_AREA,STARTERS.STARTER_CHEST,STARTERS.STARTER_MANA,DB.ND2].map((c,i)=>({...c,uid:`hand-${side}-${i}`}));
}
const noop=()=>{};
const view=new GameView(document.querySelector('#app')!,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
view.render(g);document.querySelector('.help-callout')?.remove();view.setHandOpen(false);const stop=startBoardLayout();


const api={ready:false,anchor(side:string){const r=document.querySelector(`[data-uid="hand-${side==='me'?0:1}-0"]`)?.getBoundingClientRect();return r?{x:r.x+r.width/2,y:r.y+r.height/2}:null;},rift(side:string){const r=document.querySelector(`#rift-${side}`)?.getBoundingClientRect();return r?{x:r.x+r.width/2,y:r.y+r.height/2}:null;}};
(window as any).chosenSoundBoard=api;
window.addEventListener('pagehide',()=>{stop();view.destroy();},{once:true});
await waitForDuel(document.querySelector<HTMLElement>('#app')!);api.ready=true;
