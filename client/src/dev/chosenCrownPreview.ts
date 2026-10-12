/** Selected-only preview: actual engine cast, production controller and sound bus. */
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {BaseController} from '../game/controller';import {createGame,reduce} from '../shared/engine';import type {Action,Side} from '../shared/types';import {DB,STARTERS} from '../shared/cards';import {setMyAvatar,setOppAvatar} from '../ui/boardView';import {startBoardLayout} from '../ui/layout';import {waitForDuel} from '../ui/duelReadiness';import {setLang} from '../i18n';import {setFxSkip} from '../ui/anim';import {initSound,warmSounds} from '../ui/sound';import {warmChosenVictory} from '../ui/chosenVictory/runtime';
if(import.meta.env.DEV){
 setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');initSound();warmChosenVictory();await warmSounds(['play','chosenCrown']);
 const style=document.createElement('style');style.textContent='.chosen-controls{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:250;display:flex;align-items:center;gap:18px;padding:8px 18px;background:#101522ed;border:1px solid #bda47666;border-radius:8px;color:#eadabb;font:13px serif;white-space:nowrap;max-width:calc(100vw - 24px)}.chosen-controls span{white-space:normal}.chosen-controls button{padding:9px 18px;background:#b89a64;color:#131724;border:0;border-radius:4px;cursor:pointer;flex-shrink:0}.help-callout{display:none!important}';document.head.append(style);
 let finished=0;
 class Preview extends BaseController{
 constructor(you:Side=0,culls=25){super(document.querySelector('#app')!,you,{onHome:()=>{},onRematch:()=>{}});this.introShown=true;
 const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'preview-me',name:'YOU'},p1:{id:'preview-opp',name:'OPPONENT'}}).state;g.turn=3;g.pending=null;g.phase='main';g.opening=undefined;
 for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.hp=32;p.mana=8;p.maxMana=12;p.enchants=[];p.quests=[];p.discard=[{...DB.ELF,uid:`discard-${i}`}];p.removed=Array.from({length:culls},(_,j)=>({...STARTERS.STARTER_TRASH,uid:`cull-${i}-${j}`}));p.hand=[DB.CHOSEN_AREA,STARTERS.STARTER_CHEST,STARTERS.STARTER_MANA,DB.ND2].map((c,j)=>({...c,uid:`hand-${i}-${j}`}));p.field=['M4','ELF','GM6_0'].map((id,j)=>({...DB[id],uid:`field-${i}-${j}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}));}this.state=g;this.view.render(g);this.view.setHandOpen(false);}
 protected submit(a:Action){this.applyResult(reduce(this.state,a));}
 protected showWin(){finished++;document.body.dataset.finished=String(finished);button.disabled=false;button.textContent='音ありで再生';}
 cast(){this.submit({type:'play',idx:0,sourceUid:'hand-0-0'});}
 getState(){return this.state;}
 }
 const button=document.querySelector<HTMLButtonElement>('#replay')!;let controller=new Preview(),busy=false;const stop=startBoardLayout();
 const reset=async(you:Side=0,culls=25)=>{controller.destroy();setFxSkip(false);controller=new Preview(you,culls);await waitForDuel(document.querySelector('#app')!);};
 button.onclick=async()=>{if(busy)return;busy=true;button.disabled=true;button.textContent='再生中';try{await reset();controller.cast();}finally{busy=false;}};
 await waitForDuel(document.querySelector('#app')!);button.disabled=false;button.textContent='音ありで再生';
 (window as any).chosenCrownPreview={ready:true,reset,cast:()=>controller.cast(),getState:()=>controller.getState(),skip:()=>setFxSkip(true),destroy:()=>controller.destroy()};
 window.addEventListener('pagehide',()=>{controller.destroy();stop();},{once:true});
}
