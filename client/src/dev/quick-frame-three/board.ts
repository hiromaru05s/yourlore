import '../../styles/base.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';
import {createGame} from '../../shared/engine';
import {DB,STARTERS} from '../../shared/cards';
import {waitForDuel} from '../../ui/duelReadiness';
import {clearMonsterStates} from '../../ui/monster/runtime';
export async function mountBoard(){
 const root=document.getElementById('app')!,noop=()=>{};
 setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
 const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
 const state=createGame({mode:'bot',seed:71,starting:0,p0:{id:'quick-self',name:'YOU'},p1:{id:'quick-opp',name:'OPPONENT'}}).state;
 state.turn=3;state.phase='main';state.pending=null;
 for(const [i,p] of state.players.entries()){
  p.openingDrawReady=false;p.mana=8;p.maxMana=12;p.hp=30;p.enchants=[];p.quests=[];p.traps=[];
  p.field=['ELF','M4'].map((id,j)=>({...DB[id],uid:`quick-field-${i}-${j}`,exhausted:false,summonedTurn:0,decayCnt:0,dmg:0,tempAtk:0,atkMod:0,defMod:0}));
  p.hand=['STARTER_CHEST','STARTER_TRASH','STARTER_MANA','ELF'].map((id,j)=>({...DB[id]??STARTERS[id],uid:`quick-hand-${i}-${j}`}));
 }
 view.render(state);view.setHandOpen(true);clearMonsterStates(root);const stop=startBoardLayout();
 await waitForDuel(root);
 return ()=>{stop();clearMonsterStates(root);view.destroy();};
}
