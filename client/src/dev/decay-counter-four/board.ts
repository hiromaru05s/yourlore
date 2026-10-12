import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';import '../../styles/passives.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';import {clearMonsterStates} from '../../ui/monster/runtime';import {createGame} from '../../shared/engine';import {DB} from '../../shared/cards';import {setLang} from '../../i18n';
import {Material} from './material';import {Layer,paint} from './layer';import {defaults,DURATION} from './catalog';import type {Settings} from './catalog';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
const css=document.createElement('style');css.textContent='.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}.decay-counter-surface{z-index:3!important}.zone-mon .card-name,.zone-mon .card-status{z-index:9!important}.zone-mon .card{cursor:pointer!important}';document.head.append(css);
const root=document.getElementById('app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
let material:Material|null=null;try{material=new Material();}catch{/* Reduced display preserves the native card and count. */}
let ready=false,disposed=false,active=false;let layers:Layer[]=[];const settings:Settings={...defaults};
const mon=(id:string,uid:string)=>({...DB[id],uid,exhausted:false,summonedTurn:0,decayCnt:settings.before,dmg:0,tempAtk:0,atkMod:0,defMod:0});
function setup(){
 layers.forEach(l=>l.dispose());layers=[];
 const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'study-self',name:'YOU'},p1:{id:'study-opponent',name:'OPPONENT'}}).state;
 g.turn=3;g.phase='main';g.pending=null;
 for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.mana=6;p.maxMana=10;p.hp=30;p.enchants=[];p.quests=[];p.traps=[];p.field=['M4',settings.card,'TDE2'].map((id,j)=>mon(id,`decay-counter-${i}-${j}`));p.hand=[{...DB.POISON_MASTER,uid:`counter-source-${i}`}];}
 view.render(g);view.setHandOpen(false);clearMonsterStates(root);
 for(const card of root.querySelectorAll<HTMLElement>('.zone-mon .card'))layers.push(new Layer(card));
}
function draw(){
 if(!ready||disposed)return;root.style.filter=settings.dark?'brightness(.65)':'';
 const states=layers.map(l=>{const uid=l.card.dataset.uid||'',chosen=uid.startsWith(`decay-counter-${settings.side}-`)&&(settings.multi||uid.endsWith('-1'));return{...settings,ms:active&&!document.hidden&&chosen?settings.ms:0};});paint(layers,states,material);
}
function clear(){layers.forEach(l=>l.clear());}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==parent||e.data?.kind!=='decay-counter-control')return;
 const d=e.data,oldCard=settings.card,oldBefore=settings.before;
 settings.variant=Math.min(3,Math.max(0,Number(d.variant)||0));settings.ms=Math.min(DURATION,Math.max(0,Number(d.ms)||0));settings.before=d.before===1?1:0;settings.amount=d.amount===2?2:1;settings.side=d.side===0?0:1;settings.multi=!!d.multi;settings.reduced=!!d.reduced;settings.dark=!!d.dark;settings.card=['ELF','M4','TDE2'].includes(d.card)?d.card:settings.card;active=!!d.active;
 if(oldCard!==settings.card||oldBefore!==settings.before)setup();draw();
});
root.addEventListener('click',e=>{if((e.target as Element).closest('.zone-mon .card')){e.stopImmediatePropagation();parent.postMessage({kind:'decay-counter-play'},location.origin);}},{capture:true});
window.addEventListener('resize',()=>requestAnimationFrame(draw));document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
setup();const stop=startBoardLayout();
window.addEventListener('pagehide',()=>{disposed=true;layers.forEach(l=>l.dispose());material?.dispose();stop();view.destroy();},{once:true});
(window as any).decayCounterBoard={get state(){return{ready,active,...settings,layers:layers.length,visible:layers.filter(l=>l.canvas.dataset.active==='true').length,hiddenCards:layers.filter(l=>l.card.style.visibility==='hidden').length,counts:layers.map(l=>({uid:l.card.dataset.uid,count:l.card.dataset.decayCount})),fallback:!material};},clear};
void waitForDuel(root).then(()=>{ready=true;draw();parent.postMessage({kind:'decay-counter-ready'},location.origin);}).catch(e=>parent.postMessage({kind:'decay-counter-error',error:String(e)},location.origin));
