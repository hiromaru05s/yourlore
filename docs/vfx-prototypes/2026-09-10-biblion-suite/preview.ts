import '../../../client/src/styles/tokens.css';
import '../../../client/src/styles/base.css';
import '../../../client/src/styles/card.css';
import '../../../client/src/styles/game-overlays.css';
import '../../../client/src/styles/game.css';
import '../../../client/src/styles/dice.css';
import '../../../client/src/styles/screens.css';
import '../../../client/src/styles/mobile.css';
import './preview.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../../client/src/ui/boardView';
import {createGame} from '../../../client/src/shared/engine';
import {DB,STARTERS} from '../../../client/src/shared/cards';
import {startBoardLayout} from '../../../client/src/ui/layout';
import {setLang,cardName} from '../../../client/src/i18n';
import {paintDuelClock} from '../../../client/src/ui/duelClock';
import * as A from '../../../client/src/ui/anim';
import {playBiblionFx,clearBiblionFx} from '../../../client/src/ui/biblionFx';
localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'preview-me',name:'YOU'},p1:{id:'preview-opp',name:'OPPONENT'}}).state;
g.turn=3;g.pending=null;
for(const [side,p] of g.players.entries()){
p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=40;p.maxHp=40;p.field=[];p.enchants=[];p.quests=[];p.hand=[];
p.discard=[DB.ELF,DB.GM6_0,DB.ND2].filter(Boolean).map((c,i)=>({...c,uid:`discard-${side}-${i}`}));
const ids=side?['M3','M4','M5']:['M4','GM6_0','ELF'];
p.field=ids.map((id,i)=>({...DB[id],uid:`field-${side}-${i}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}));
const ench=Object.values(DB).filter(c=>c.ench).slice(0,3);p.enchants=ench.map((c,i)=>({card:{...c,uid:`ench-${side}-${i}`},turns:c.val||1}));
}
g.players[0].hand=[STARTERS.STARTER_CHEST,STARTERS.STARTER_MANA,DB.ND2].map((c,i)=>({...c,uid:`hand-${i}`}));
const noop=()=>{};
const view=new GameView(document.querySelector('#app')!,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
// Leave open public slots for real quest and summon flights.
for(const p of g.players){p.field=p.field.slice(0,2);p.quests=[];}
view.render(g);view.setHandOpen(false);startBoardLayout();paintDuelClock(document.querySelector('#clock-me')!,75,90,true);

let choice='mana',running=false,generation=0,timer=0;
const loop=document.querySelector<HTMLInputElement>('#loop')!;
const status=document.querySelector('#status')!;
const side=()=>document.querySelector<HTMLSelectElement>('#side')!.value as 'me'|'opp';
const owner=()=>side()==='me'?0:1;
const original=structuredClone(g);
function reset(){Object.assign(g,structuredClone(original));view.render(g);}
function stop(){generation++;clearTimeout(timer);A.setFxSkip(true);clearBiblionFx();document.querySelectorAll('.fx-field-ghost').forEach(el=>el.remove());running=false;status.textContent='停止';}
async function play(){
 if(running)stop();reset();A.setFxSkip(false);const token=++generation;running=true;status.textContent='再生中';
 document.querySelector('#vfx-panel')!.classList.toggle('card-focus',['attack','health','summon','quest','enchant'].includes(choice));
 document.querySelector('#vfx-panel')!.classList.toggle('resource-me',['mana','heal'].includes(choice)&&side()==='me');
 const p=g.players[owner()],s=side();
 try{
  if(choice==='attack'||choice==='health'){
   if(choice==='attack')p.field[1].atkMod=(p.field[1].atkMod||0)+1;else p.field[1].defMod=(p.field[1].defMod||0)+1;
   view.render(g);await A.fxWait(1700);
  }else if(choice==='mana'){p.maxMana+=1;view.render(g);await A.manaSurge(s,1);}
  else if(choice==='heal'){p.hp=28;view.render(g);A.hpFeedback(s,'heal',8);A.hpBarSet(s,36,p.maxHp);await A.fxWait(1700);}
  else if(choice==='spell'){await A.revealSpell({...DB.ND2,uid:'fx-spell'},s,'discard');await A.fxWait(750);}
  else if(choice==='summon'){const face=await A.ghostSummon({...DB.ELF,uid:'fx-mon'},s,2);await A.fxWait(1200);face?.remove();}
  else if(choice==='quest'){const c=Object.values(DB).find(c=>c.t==='quest')!;const face=await A.revealSpell({...c,uid:'fx-quest'},s,'field',p.enchants.length);await A.fxWait(1500);face?.remove();}
  else if(choice==='quick'){const c=Object.values(DB).find(c=>c.quick)!;const source=document.querySelector<HTMLElement>('#fixedMarket .card')!;await A.buyReveal({...c,uid:'fx-quick'},s,source.getBoundingClientRect(),source,2);await A.fxWait(500);}
  else {A.enchantActivation(p.enchants[0].card.uid);await A.fxWait(1450);}
 }finally{if(token===generation){running=false;status.textContent='完了';if(loop.checked)timer=window.setTimeout(play,650);}}
}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-effect]'))button.onclick=()=>{stop();choice=button.dataset.effect!;document.querySelectorAll('[data-effect]').forEach(el=>el.classList.toggle('selected',el===button));document.querySelector('#effect-name')!.textContent=button.textContent;void play();};
document.querySelector('#play')!.addEventListener('click',()=>void play());document.querySelector('#stop')!.addEventListener('click',stop);
document.querySelector('#side')!.addEventListener('change',()=>void play());
// Batch mode exercises concurrent local effects and DOM replacement.
document.querySelector('#batch')!.addEventListener('click',()=>{stop();reset();A.setFxSkip(false);for(const p of g.players)for(const m of p.field){m.atkMod=(m.atkMod||0)+1;m.defMod=(m.defMod||0)+1;}view.render(g);void A.manaSurge(side(),1);playBiblionFx('heal',document.getElementById(side()==='me'?'portraitMe':'portraitOpp')!);status.textContent='同時再生';});
window.addEventListener('pagehide',()=>{stop();view.destroy();},{once:true});
