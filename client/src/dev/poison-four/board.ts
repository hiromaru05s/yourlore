import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';import {boardMatrix,layoutRect,screenToBoard} from '../../ui/boardProjection';import {clearMonsterStates} from '../../ui/monster/runtime';import {createGame} from '../../shared/engine';import {DB} from '../../shared/cards';import {setLang} from '../../i18n';
import {readySprites} from './assets';
import {DURATION,IDS,ease,type CardId} from './catalog';import {renderBoard,disposeRenderer,rendererState} from './renderer';import {cardHeight} from './physics';import {surface} from './surface';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';const style=document.createElement('style');style.textContent='.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}';document.head.append(style);
const root=document.getElementById('app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:()=>parent.postMessage({kind:'poison-play'},location.origin),onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
let id:CardId='POISON_MASTER',side=0,variant=0,ms=0,reduced=false,ready=false,disposed=false,suspended=false,concurrent=false,stopLayout=()=>{},arranging=false;
const faces=new Map<CardId,HTMLCanvasElement>();
type Slot={rig:HTMLDivElement;canvas:HTMLCanvasElement;original:HTMLElement|null;hand:HTMLElement|null;card:CardId;index:number};
const slots:Slot[]=IDS.map((card,index)=>{const rig=document.createElement('div');rig.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:180;';const canvas=document.createElement('canvas');canvas.style.cssText='width:100%;height:100%;';rig.append(canvas);document.body.append(rig);return{rig,canvas,original:null,hand:null,card,index};});
const makeMon=(card:string,uid:string)=>({...DB[card],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
function restore(){slots.forEach(s=>{if(s.original)s.original.style.visibility='';if(s.hand)s.hand.style.visibility='';s.rig.style.visibility='hidden';});}
function beforeSummon(){slots.forEach((s,j)=>{if(s.original&&(concurrent||j===1))s.original.style.visibility='hidden';});}
function afterSummon(){restore();slots.forEach((s,j)=>{if(s.hand&&(concurrent||j===1))s.hand.style.visibility='hidden';});}
function setup(){arranging=true;restore();const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'poison-preview-self',name:'YOU'},p1:{id:'poison-preview-opp',name:'OPPONENT'}}).state;g.turn=3;g.pending=null;g.phase='main';
 for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=30;p.enchants=[];p.quests=[];p.traps=[];p.field=[makeMon(concurrent&&side===i?IDS[0]:'M4',`poison-target-${i}-0`),makeMon(i===side?(concurrent?IDS[1]:id):'ELF',`poison-target-${i}-1`),makeMon(concurrent&&side===i?IDS[2]:'GM6_0',`poison-target-${i}-2`)];p.hand=[{...DB[id],uid:`poison-hand-${i}`}];}
 view.render(g);view.setHandOpen(true);clearMonsterStates(root);slots.forEach((s,j)=>{s.card=concurrent?IDS[j]:id;s.original=root.querySelector<HTMLElement>(`.card[data-uid="poison-target-${side}-${j}"]`);s.hand=j===1?root.querySelector<HTMLElement>(`[data-uid="poison-hand-${side}"]`):null;});
 root.querySelectorAll<HTMLElement>('[data-uid^="poison-hand-"]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();parent.postMessage({kind:'poison-play'},location.origin);},true));arranging=false;beforeSummon();}
const projections:{card:string;normal:number[];height:number;target:number[];corners:number[][]}[]=[];
function draw(){if(!ready||disposed||suspended||arranging)return;restore();projections.length=0;if(ms===0){beforeSummon();return;}if(ms>=DURATION){afterSummon();return;}if(innerWidth<=0||innerHeight<=0)return;slots.forEach((s,j)=>{if(!s.original||(!concurrent&&j!==1))return;const t=Math.max(0,ms-(concurrent?j*55:0));if(t>=DURATION)return;
 s.original.style.visibility='hidden';if(s.hand)s.hand.style.visibility='hidden';s.rig.style.visibility='visible';
 const r=layoutRect(s.original),plane=Number(s.original.closest<HTMLElement>('[data-board-plane]')?.dataset.boardPlane)||0;
 const sx=r.width/144,sz=r.height/224,tx=r.left+r.width/2,tz=r.top+r.height/2;
 const hand=s.hand?.getBoundingClientRect(),origin=hand?screenToBoard(hand.left+hand.width/2,hand.top+hand.height/2,plane+cardHeight(t,reduced)*sx):{x:tx,y:tz+(side?-70:70)};
 const travel=reduced?1:ease(0,640,t),x=origin.x+(tx-origin.x)*travel,z=origin.y+(tz-origin.y)*travel;
 const m=boardMatrix(x,z,plane).scale(sx,sz,sx);s.canvas.width=innerWidth;s.canvas.height=innerHeight;
 const c=s.canvas.getContext('2d')!;c.clearRect(0,0,innerWidth,innerHeight);renderBoard(c,faces.get(s.card)!,s.card,variant,t,m,innerWidth,innerHeight,reduced);
 const corners=[[-72,-112],[72,-112],[72,112],[-72,112]].map(([cx,cz])=>{const q=m.transformPoint(new DOMPoint(cx,cz,cardHeight(t,reduced)));return[q.x/q.w,q.y/q.w];});
 projections.push({card:s.card,normal:[0,1,0],height:cardHeight(t,reduced),target:[tx,tz],corners});
 });}
function dispose(){if(disposed)return;restore();disposed=true;slots.forEach(s=>s.rig.remove());stopLayout();view.destroy();faces.clear();disposeRenderer();}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;const d=e.data;if(d?.kind==='poison-suspend'){suspended=true;restore();root.style.filter='';return;}if(d?.kind==='poison-dispose'){dispose();return;}if(d?.kind==='poison-concurrent'){concurrent=true;setup();return;}if(d?.kind!=='poison-control')return;suspended=false;const next=IDS.includes(d.id)?d.id:id,nextSide=d.side===1?1:0;if(next!==id||nextSide!==side){id=next;side=nextSide;concurrent=false;setup();}variant=Math.max(0,Math.min(3,Number(d.variant)||0));ms=Math.max(0,Math.min(DURATION+200,Number(d.ms)||0));reduced=!!d.reduced;root.style.filter=d.dark?'brightness(.72)':'';draw();});
window.addEventListener('resize',()=>requestAnimationFrame(draw));root.addEventListener('lore:board-projected',draw);document.addEventListener('visibilitychange',()=>{if(document.hidden)restore();});window.addEventListener('pagehide',dispose,{once:true});
(window as any).poisonBoard={get state(){return{ready,id,side,variant,ms,reduced,concurrent,disposed,suspended,projections,renderer:rendererState(),hidden:slots.filter(s=>s.original?.style.visibility==='hidden').length,overlays:slots.filter(s=>s.rig.style.visibility!=='hidden').length};},dispose};
void(async()=>{setup();stopLayout=startBoardLayout();await waitForDuel(root);await readySprites;for(const card of IDS)faces.set(card,await surface(card,true));if(disposed)return;ready=true;draw();parent.postMessage({kind:'poison-board',ready},location.origin);})().catch(e=>parent.postMessage({kind:'poison-board',error:String(e)},location.origin));
