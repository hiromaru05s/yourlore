/** Development-only harness: actual reducer -> controller event -> GameView. */
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/game-overlays.css';
import '../styles/game.css';
import '../styles/screens.css';
import '../styles/reading-board.css';
import '../styles/presentation.css';
import {BaseController} from '../game/controller';
import {createGame,reduce} from '../shared/engine';
import {DB} from '../shared/cards';
import type {Action,Side} from '../shared/types';
import {setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';
import {setLang} from '../i18n';
import {setFxSkip,revealSpell} from '../ui/anim';

if(import.meta.env.DEV){
 const freeze=Number(new URLSearchParams(location.search).get('frame'));if(freeze){const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>raf(t=>{const canvas=document.querySelector<HTMLCanvasElement>('.quest-fold-canvas');if(canvas&&Number(canvas.dataset.time)>=freeze)return;callback(t);});}

 setLang(new URLSearchParams(location.search).get('lang')==='en'?'en':'ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
 class QuestController extends BaseController {
  seq=0;
  constructor(){super(document.querySelector('#app')!,0,{onHome:()=>{},onRematch:()=>{}});this.reset();}
  reset(side:Side=0,id='Q_RIFT',occupied=0){
   setFxSkip(true);this.state=createGame({mode:'online',seed:71,starting:side,p0:{id:'q0',name:'YOU'},p1:{id:'q1',name:'OPPONENT'}}).state;
   this.state.pending=null;this.state.opening=undefined;this.state.turn=3;this.state.cur=side;
   for(const [i,p] of this.state.players.entries()){
    p.openingDrawReady=false;p.mana=20;p.maxMana=20;p.quests=[];p.traps=[];p.enchants=[];p.hand=[];p.field=[];p.discard=[];
    p.enchants=Array.from({length:occupied},(_,n)=>({card:{...DB.NHEAL,uid:`existing-${i}-${n}`},turns:3}));
   }
   this.state.players[side].hand=[{...DB[id],uid:`played-quest-${++this.seq}`}];this.view.render(this.state);this.view.setHandOpen(true);setFxSkip(false);
  }
  protected submit(action:Action){this.applyResult(reduce(this.state,action));}
  play(){this.submit({type:'play',idx:0});}
  get current(){return this.state;}
 }
 const controller=new QuestController(),stop=startBoardLayout();
 const controls=document.createElement('div');controls.style.cssText='position:fixed;top:12px;left:60px;z-index:300;display:flex;gap:8px;flex-wrap:wrap;max-width:85vw';
 const select=document.createElement('select');select.setAttribute('aria-label','クエスト');for(const c of Object.values(DB).filter(c=>c.t==='quest')){const o=document.createElement('option');o.value=c.id;o.textContent=c.nameJa||c.id;select.append(o);}
 select.value='Q_RIFT';
 const side=document.createElement('select');side.setAttribute('aria-label','陣営');side.innerHTML='<option value="0">自分</option><option value="1">相手</option>';
 const button=document.createElement('button');button.textContent='① 紫墨の血判をプレイ';button.onclick=()=>{controller.reset(Number(side.value) as Side,select.value);requestAnimationFrame(()=>controller.play());};
 const skip=document.createElement('button');skip.textContent='演出を中断';skip.onclick=()=>setFxSkip(true);
 controls.append(select,side,button,skip);document.body.append(controls);
 (window as any).questPlay={controller,reset:(side:Side,id:string,n=0)=>controller.reset(side,id,n),play:()=>controller.play(),skip:()=>setFxSkip(true),direct:async(side:'me'|'opp',id='Q_RIFT')=>{const face=await revealSpell({...DB[id],uid:'direct-'+side},side,'field',0);face?.remove();}};
 if(new URLSearchParams(location.search).has('qa'))void import('./questPactQa').then(m=>m.runQuestPactQa(controller));
 window.addEventListener('pagehide',()=>{stop();controller.destroy();},{once:true});
}
