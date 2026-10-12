/** Local event fixture: the actual controller, portrait renderer and board furniture. */
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {BaseController} from '../game/controller';
import {createGame,reduce} from '../shared/engine';
import {DB,STARTERS} from '../shared/cards';
import type {Action,GameEvent,Side} from '../shared/types';
import {setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';
import {waitForDuel} from '../ui/duelReadiness';
import {setLang} from '../i18n';
import {closeOverlay} from '../ui/modal';
import {setFxSkip} from '../ui/anim';
import {playSeekerSide,resetSeeker,seekerPlaybackCount,type SeekerAction} from '../ui/seekerAnimation';
type FixtureAction = SeekerAction|'brand'|'mana'|'heal'|'heavy'|'defeat'|'victory';
const labels:Record<FixtureAction,string>={idle:'通常',hurt:'被弾',heavy:'被弾 10',mana:'マナ増加',heal:'回復',brand:'烙印',defeat:'敗北',victory:'勝利'};
if(import.meta.env.DEV){
 setLang('ja');setMyAvatar('SEEKER_HOODED');setOppAvatar('SEEKER_HOODED');
 localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
 class SeekerBoard extends BaseController {
  constructor(){super(document.querySelector('#app')!,0,{onHome:()=>location.href='/hooded-seekers.html',onRematch:()=>reset()});this.introShown=true;
   const g=createGame({mode:'online',seed:71,starting:0,p0:{id:'hood-me',name:'シーカー'},p1:{id:'hood-opp',name:'対戦相手'}}).state;g.turn=3;g.pending=null;
   for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.hp=32;p.shield=0;p.dew=0;p.mana=3;p.maxMana=6;
    p.hand=[STARTERS.STARTER_CHEST,STARTERS.STARTER_MANA,DB.ND2].map((c,j)=>({...c,uid:`hand-${i}-${j}`}));
    p.field=['M4','ELF'].map((id,j)=>({...DB[id],uid:`field-${i}-${j}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}));
   }this.state=g;this.view.render(g);
  }
  protected submit(a:Action){this.applyResult(reduce(this.state,a));}
  async trigger(action:FixtureAction,side:Side){
   if(this.state.over)return;
   const g=structuredClone(this.state),p=g.players[side],events:GameEvent[]=[];
   if(action==='mana'){p.maxMana++;p.mana++;}
   if(action==='heal'){p.hp+=5;events.push({type:'heal',player:side,amount:5});}
   if(action==='hurt'||action==='heavy'){const amount=action==='heavy'?10:9;p.hp-=amount;events.push({type:'damage',player:side,amount});}
   if(action==='brand')p.brand=(p.brand??0)+1;
   if(action==='defeat'||action==='victory'){g.over=true;g.phase='over';g.winner=(action==='victory'?side:1-side) as Side;events.push({type:'win',winner:g.winner});}
   if(action==='idle'){document.querySelectorAll<HTMLCanvasElement>('.seeker-motion').forEach(resetSeeker);return;}
   this.applyResult({state:g,events},true);await (this as unknown as {queue:Promise<void>}).queue;
  }
  rerender(){this.view.render(this.state);}
  getState(){return this.state;}
 }
 let controller:SeekerBoard;
 function reset(){controller?.destroy();closeOverlay();setFxSkip(false);controller=new SeekerBoard();}
 reset();const stop=startBoardLayout();
 const panel=document.createElement('div');panel.className='hood-board-controls';panel.innerHTML=`<label>対象 <select id="hoodSide"><option value="0">自分</option><option value="1">相手</option></select></label>${(['idle','mana','heal','hurt','heavy','brand','defeat','victory'] as const).map(action=>`<button data-hood-action="${action}">${labels[action]}</button>`).join('')}<button data-reset>リセット</button>`;document.body.append(panel);
 const css=document.createElement('style');css.textContent='.hood-board-controls{position:fixed;z-index:10000;right:10px;top:10px;max-width:min(580px,96vw);display:flex;gap:5px;flex-wrap:wrap;padding:8px;background:#fffef4ed;border:1px solid #d5d8d8;border-radius:6px;color:#233747;font:10px sans-serif}.hood-board-controls button,.hood-board-controls select{font:inherit;padding:6px;border:1px solid #c8d0d5;color:#243748;background:white;border-radius:3px;cursor:pointer}.hood-board-controls label{display:flex;align-items:center;gap:5px}.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}';document.head.append(css);
 panel.querySelectorAll<HTMLButtonElement>('[data-hood-action]').forEach(b=>b.onclick=()=>void controller.trigger(b.dataset.hoodAction as FixtureAction,Number(panel.querySelector<HTMLSelectElement>('select')!.value) as Side));
 panel.querySelector<HTMLButtonElement>('[data-reset]')!.onclick=reset;
 await waitForDuel(document.querySelector('#app')!);
 (window as any).hoodedBoard={ready:true,trigger:(action:FixtureAction,side:Side=0)=>controller.trigger(action,side),reset,rerender:()=>controller.rerender(),state:()=>controller.getState(),play:playSeekerSide,skip:setFxSkip,count:seekerPlaybackCount,destroy:()=>{controller.destroy();stop();}};
 window.addEventListener('pagehide',()=>{controller.destroy();stop();},{once:true});
}
