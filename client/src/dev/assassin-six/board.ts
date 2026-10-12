import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';
import {projectedPlacement,boardMatrix,layoutRect} from '../../ui/boardProjection';import {clearMonsterStates} from '../../ui/monster/runtime';
import {createGame} from '../../shared/engine';import {DB} from '../../shared/cards';import {setLang} from '../../i18n';import {surface} from './surface';import {drawBoard,dispose} from './renderer';import {cards,DURATION,ease} from './catalog';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');document.body.style.cssText='margin:0;overflow:hidden;background:#eeece7';
const css=document.createElement('style');css.textContent='.topbar,.help-callout,.help-fab,.mute-fab{display:none!important} .hand>.card{cursor:pointer}';document.head.append(css);
const root=document.getElementById('app')!,noop=()=>{},ask=()=>parent.postMessage({kind:'assassin-play'},location.origin);
const view=new GameView(root,0,{onPlay:ask,onBlockedPlay:ask,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
let ready=false,disposed=false,ms=0,variant=0,id='ASSASSIN4',side=0,multi=false,reduced=false,dark=false;
const faces=new Map<string,HTMLCanvasElement>();let targets:HTMLElement[]=[];let hand:HTMLElement|null=null,source:DOMRect|null=null;
const rigs=Array.from({length:3},()=>{const el=document.createElement('div');el.style.cssText='position:fixed;left:0;top:0;width:180px;height:270px;transform-origin:0 0;pointer-events:none;z-index:190;visibility:hidden';const canvas=document.createElement('canvas');canvas.width=720;canvas.height=864;canvas.style.cssText='position:absolute;left:-135px;top:-135px;width:450px;height:540px';el.append(canvas);document.body.append(el);return{el,canvas};});
const overlay=document.createElement('canvas');overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:190';document.body.append(overlay);
const mon=(uid:string)=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
function restore(){overlay.getContext('2d')!.clearRect(0,0,overlay.width,overlay.height);targets.forEach(n=>n.style.visibility='');if(hand)hand.style.visibility='';rigs.forEach(r=>r.el.style.visibility='hidden');}
function setup(){restore();const g=createGame({mode:'bot',seed:731,starting:0,p0:{id:'self',name:'YOU'},p1:{id:'opp',name:'OPPONENT'}}).state;g.turn=3;g.phase='main';g.pending=null;g.cur=0;for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.mana=20;p.maxMana=20;p.hp=30;p.enchants=[];p.quests=[];p.traps=[];p.field=Array.from({length:5},(_,j)=>j===0||j===4||(!multi&&j!==2)?({...DB.ASSASSIN1,uid:`neighbor-${i}-${j}`,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0}):mon(`assassin-${i}-${j}`));p.hand=[{...DB[id],uid:`assassin-hand-${i}`}];}view.render(g);view.setHandOpen(true);clearMonsterStates(root);targets=Array.from(root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid^="assassin-"]'));hand=root.querySelector<HTMLElement>('#hand .card');source=null;}
const keys=['m11','m12','m13','m14','m21','m22','m23','m24','m31','m32','m33','m34','m41','m42','m43','m44'] as const;
function mix(a:DOMMatrix,b:DOMMatrix,t:number){const out=new DOMMatrix();for(const k of keys)out[k]=a[k]+(b[k]-a[k])*t;return out;}
function draw(){if(overlay.width!==innerWidth||overlay.height!==innerHeight){overlay.width=innerWidth;overlay.height=innerHeight;}restore();if(!ready||disposed||innerWidth<1||innerHeight<1)return;root.style.filter=dark?'brightness(.64)':'';const selected=targets.filter(n=>n.dataset.uid?.startsWith(`assassin-${side}-`)&&(multi||n.dataset.uid.endsWith('-2')));
 // Unused reserved slots are kept empty; neighboring cards stay visible.
 targets.forEach(n=>{if(!selected.includes(n))n.style.visibility='hidden';});
 if(ms===0&&!reduced){selected.forEach(n=>n.style.visibility='hidden');source=null;return;}
 if(hand)hand.style.visibility='hidden';
 if(ms>=DURATION||reduced)return;
 if(!source){const origin=side?root.querySelector<HTMLElement>('#oppHand .card-back, #oppHand > *'):hand;source=origin?.getBoundingClientRect()??new DOMRect(innerWidth*.65,side?45:innerHeight-140,100,150);}
 for(const [i,n]of selected.entries()){const rig=rigs[i],time=Math.max(1,ms-(multi?i*45:0));n.style.visibility='hidden';const dest=projectedPlacement(n,180,270),r=layoutRect(n),elev=Number(n.closest<HTMLElement>('[data-board-plane]')?.dataset.boardPlane)||0;
 const hover=boardMatrix(r.left,r.top,elev+(1-ease(710,1220,time))*r.width*.6).scale(r.width/180,r.height/270);
 const begin=new DOMMatrix().translate(source.x+i*4,source.y).scale(source.width/180,source.height/270);
 const move=ease(0,700,time),matrix=time>=1220?dest:mix(begin,hover,move);rig.el.style.transform=matrix.toString();rig.el.style.visibility='visible';rig.el.dataset.target=dest.toString();rig.el.dataset.progress=String(move);
 drawBoard(overlay.getContext('2d')!,faces.get(id)!,variant,time,id,matrix,innerWidth,innerHeight);
 }
}
root.addEventListener('click',e=>{if((e.target as Element).closest('#hand .card,#oppHand')){e.preventDefault();e.stopImmediatePropagation();}},true);
root.addEventListener('pointerdown',e=>{if((e.target as Element).closest('#hand .card,#oppHand')){e.preventDefault();e.stopImmediatePropagation();ask();}},true);
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.kind==='assassin-suspend'){restore();return;}if(e.data?.kind!=='assassin-control')return;const d=e.data,next=cards.some(([c])=>c===d.id)?d.id:id;const nextSide=d.side===1?1:0,nextMulti=!!d.multi;if(next!==id||nextSide!==side||nextMulti!==multi){id=next;side=nextSide;multi=nextMulti;setup();}ms=Math.max(0,Math.min(DURATION,Number(d.ms)||0));variant=Math.max(0,Math.min(5,Number(d.variant)||0));reduced=!!d.reduced;dark=!!d.dark;draw();});
setup();const stop=startBoardLayout();window.addEventListener('resize',()=>{source=null;requestAnimationFrame(draw);});document.addEventListener('visibilitychange',()=>{if(document.hidden)restore();else draw();});window.addEventListener('pagehide',()=>{disposed=true;restore();rigs.forEach(r=>r.el.remove());overlay.remove();dispose();stop();view.destroy();});
(window as any).assassinBoard={get state(){return{ready,ms,id,side,multi,variant,hidden:targets.filter(n=>n.style.visibility==='hidden').length,rigs:rigs.filter(r=>r.el.style.visibility==='visible').map(r=>({matrix:r.el.style.transform,target:r.el.dataset.target,progress:r.el.dataset.progress})),handHidden:hand?.style.visibility==='hidden',source:source?.toJSON()};},restore};
void(async()=>{for(const [key]of cards)faces.set(key,await surface(key));await waitForDuel(root);ready=true;draw();parent.postMessage({kind:'assassin-ready'},location.origin);})().catch(e=>parent.postMessage({kind:'assassin-error',error:String(e)},location.origin));
