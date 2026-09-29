/** Development only: exercises the same final-result controller as BOT and online. */
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {BaseController} from '../game/controller';import {createGame,reduce} from '../shared/engine';import type {Action,Side} from '../shared/types';import {DB,STARTERS} from '../shared/cards';import {setMyAvatar,setOppAvatar} from '../ui/boardView';import {startBoardLayout} from '../ui/layout';import {waitForDuel} from '../ui/duelReadiness';import {setLang} from '../i18n';import {closeOverlay} from '../ui/modal';import {mountDuelOutcome} from '../ui/duelOutcome';import {setFxSkip} from '../ui/anim';
if(import.meta.env.DEV){
 setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
 class OutcomeLab extends BaseController {
  constructor(you:Side=0){super(document.querySelector('#app')!,you,{onHome:()=>this.destroy(),onRematch:()=>location.reload()});this.introShown=true;
   const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'me',name:'YOU'},p1:{id:'opp',name:'OPPONENT'}}).state;g.turn=3;g.pending=null;
   for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.hp=32;p.shield=6;p.dew=4;p.mana=8;p.maxMana=12;p.hand=[STARTERS.STARTER_CHEST,STARTERS.STARTER_MANA,DB.ND2].map((c,j)=>({...c,uid:`hand-${i}-${j}`}));p.field=['M4','ELF','GM6_0'].map((id,j)=>({...DB[id],uid:`field-${i}-${j}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}));}this.state=g;this.view.render(g);
  }
  protected submit(a:Action){this.applyResult(reduce(this.state,a));}
  finish(loser:Side,hpDeath=false){if(hpDeath){const g=structuredClone(this.state);g.players[loser].hp=0;g.over=true;g.phase='over';g.winner=(1-loser) as Side;this.applyResult({state:g,events:[{type:'win',winner:g.winner}]});}else this.submit({type:'surrender',player:loser});}
  earlyResult(){this.showWin();}
  getState(){return this.state;}
 }
 let controller=new OutcomeLab();const stop=startBoardLayout();await waitForDuel(document.querySelector('#app')!);await new Promise<void>(resolve=>{const check=()=>[...document.querySelectorAll<HTMLCanvasElement>('.seeker-motion')].every(c=>c.dataset.frame)?resolve():requestAnimationFrame(check);check();});
 (window as any).outcomeLab={ready:true,finish:(side:Side,hp=false)=>controller.finish(side,hp),earlyResult:()=>controller.earlyResult(),getState:()=>controller.getState(),destroy:()=>controller.destroy(),skip:()=>setFxSkip(true),mount:(side:'me'|'opp')=>mountDuelOutcome(document.querySelector(side==='me'?'#portraitMe .pt-ring':'#portraitOpp .pt-ring'),side==='opp',null),reset:(you:Side=0)=>{controller.destroy();closeOverlay();setFxSkip(false);controller=new OutcomeLab(you);}};
 window.addEventListener('pagehide',()=>{controller.destroy();stop();},{once:true});
}
