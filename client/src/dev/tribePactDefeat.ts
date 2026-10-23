/** Real reducer + production controller. Development only, no synthetic win event. */
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {BaseController} from '../game/controller';
import {createGame,reduce} from '../shared/engine';
import type {Action,Side,GameState} from '../shared/types';
import {DB,STARTERS} from '../shared/cards';
import {setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';
import {waitForDuel} from '../ui/duelReadiness';
import {setLang} from '../i18n';
import {setFxSkip} from '../ui/anim';
import {initSound} from '../ui/sound';
import {closeOverlay} from '../ui/modal';
if(import.meta.env.DEV){
 setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');initSound();
 const style=document.createElement('style');style.textContent='.pact-controls{position:fixed;left:50%;bottom:8px;transform:translateX(-50%);z-index:250;display:flex;align-items:center;gap:10px;padding:8px 12px;background:#17131fee;border:1px solid #bda47666;border-radius:5px;color:#eadabb;font:12px serif;width:max-content;max-width:94vw;box-sizing:border-box}.pact-controls button{padding:8px 10px;background:#c2a674;color:#211622;border:0;border-radius:3px;cursor:pointer;flex-shrink:0}.pact-controls button:disabled{opacity:.5}.help-callout{display:none!important}@media(max-width:600px){.pact-controls span{display:none}}';document.head.append(style);
 class Preview extends BaseController{
  constructor(you:Side=0,owner:Side=0,snapshot?:GameState){super(document.querySelector('#app')!,you,{onHome:()=>{},onRematch:()=>{void reset(you,owner);}});this.introShown=true;
   const g=snapshot??createGame({mode:'bot',seed:71,starting:(1-owner) as Side,p0:{id:'preview-me',name:'YOU'},p1:{id:'preview-opp',name:'OPPONENT'}}).state;
   if(!snapshot){g.turn=44;g.pending=null;g.phase='main';g.opening=undefined;
    for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.hp=32;p.mana=8;p.maxMana=12;p.enchants=[];p.quests=[];p.traps=[];p.tribesFired=[];p.discard=[{...DB.ELF,uid:`discard-${i}`}];p.hand=[STARTERS.STARTER_CHEST,STARTERS.STARTER_MANA,DB.ND2].map((c,j)=>({...c,uid:`hand-${i}-${j}`}));p.field=['M4','ELF','GM6_0'].map((id,j)=>({...DB[id],uid:`field-${i}-${j}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}));}
    g.players[owner].enchants=[{card:{...DB.TRIBE_PACT,uid:'pact-source'},turns:99,bornTurn:2}];
   }
   this.state=g;this.view.render(g);this.view.setHandOpen(false);
  }
  protected submit(a:Action){this.applyResult(reduce(this.state,a));}
  protected reportBotResult(){}
  cast(){this.submit({type:'endTurn'});}
  getState(){return this.state;}
  earlyResult(){this.showWin();}
  snapshot(){this.applyResult({state:this.state,events:[]},false);}
 }
 let controller=new Preview();const stop=startBoardLayout();const buttons=[...document.querySelectorAll<HTMLButtonElement>('.pact-controls button')];
 const reset=async(you:Side=0,owner:Side=0,snapshot?:GameState)=>{controller.destroy();closeOverlay();setFxSkip(false);controller=new Preview(you,owner,snapshot);await waitForDuel(document.querySelector('#app')!);};
 for(const [i,b] of buttons.entries())b.onclick=async()=>{buttons.forEach(x=>x.disabled=true);try{await reset(i as Side);controller.cast();}finally{buttons.forEach(x=>x.disabled=false);}};
 await waitForDuel(document.querySelector('#app')!);buttons.forEach(b=>b.disabled=false);buttons[0].textContent='再生';
 (window as any).pactPreview={ready:true,reset,cast:()=>controller.cast(),getState:()=>controller.getState(),skip:()=>setFxSkip(true),destroy:()=>controller.destroy(),earlyResult:()=>controller.earlyResult(),reconnect:async()=>{const state=controller.getState();await reset(0,0,state);controller.snapshot();}};
 window.addEventListener('pagehide',()=>{controller.destroy();stop();},{once:true});
}
