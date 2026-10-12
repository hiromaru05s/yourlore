import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';
import {clearMonsterStates} from '../../ui/monster/runtime';import {createGame} from '../../shared/engine';import {DB} from '../../shared/cards';import {setLang} from '../../i18n';
import {surface,rockArt} from './surface';import {DungeonRenderer} from './renderer';import {DURATION,ease} from './catalog';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
const css=document.createElement('style');css.textContent='.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}';document.head.append(css);
const root=document.getElementById('app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:()=>playHand(),onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
let renderer:DungeonRenderer,ready=false,disposed=false,variant=0,side=0,multi=false,reduced=false,ms=DURATION,dark=false,raf=0,start=0;
let originals:HTMLElement[]=[];let hands:HTMLElement[]=[];let sourceRect:DOMRect|null=null;let sourceVisibility=new Map<HTMLElement,string>();
const rigs=Array.from({length:3},()=>{const c=document.createElement('canvas');c.width=c.height=520;c.dataset.dungeonOverlay='true';c.style.cssText='position:fixed;pointer-events:none;z-index:190;visibility:hidden;background:none';document.body.append(c);return c;});
const mon=(id:string,uid:string)=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
function restore(){sourceVisibility.forEach((v,n)=>n.style.visibility=v);sourceVisibility.clear();rigs.forEach(c=>{c.style.visibility='hidden';c.getContext('2d')!.clearRect(0,0,c.width,c.height);});}
function hide(n:HTMLElement){if(!sourceVisibility.has(n))sourceVisibility.set(n,n.style.visibility);n.style.visibility='hidden';}
function setup(){restore();const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'study-self',name:'YOU'},p1:{id:'study-opp',name:'OPPONENT'}}).state;g.turn=3;g.phase='main';g.pending=null;
 for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=30;p.enchants=[];p.quests=[];p.traps=[];p.field=['DUNGEON','DUNGEON','DUNGEON'].map((id,j)=>mon(id,`dungeon-${i}-${j}`));p.hand=[{...DB.DUNGEON,uid:`dungeon-hand-${i}`}];}
 view.render(g);view.setHandOpen(true);clearMonsterStates(root);originals=[...root.querySelectorAll<HTMLElement>('.zone-mon .card')];hands=[...root.querySelectorAll<HTMLElement>('.card[data-uid^="dungeon-hand-"]')];
 root.querySelectorAll<HTMLElement>('[data-uid="dungeon-hand-0"]').forEach(n=>{n.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();playHand();},true);n.title='クリックでダンジョンを召喚';});
}
function draw(flying=false,flight=1){restore();root.style.filter=dark?'brightness(.65)':'';if(!ready||disposed||document.hidden||ms>=DURATION&&!flying||reduced)return;
 const nodes=originals.filter(n=>n.dataset.uid?.startsWith(`dungeon-${side}-`)&&(multi||n.dataset.uid.endsWith('-1')));
 for(const [i,n]of nodes.entries()){const r=n.getBoundingClientRect(),c=rigs[i];hide(n);let cx=r.left+r.width/2,cy=r.top+r.height/2,cw=r.width,ch=r.height;
  if(flying&&sourceRect){const q=ease(0,1,flight);cx=sourceRect.x+sourceRect.width/2+(cx-sourceRect.x-sourceRect.width/2)*q;cy=sourceRect.y+sourceRect.height/2+(cy-sourceRect.y-sourceRect.height/2)*q;cw=sourceRect.width+(cw-sourceRect.width)*q;ch=sourceRect.height+(ch-sourceRect.height)*q;hands.forEach(hide);}
  c.style.width=cw*(4.3/1.7)+'px';c.style.height=ch*(4.3/(2.55*.95))+'px';c.style.left=cx-cw*(4.3/1.7)/2+'px';c.style.top=cy-ch*(4.3/(2.55*.95))/2+'px';c.style.visibility='visible';renderer.draw(c,variant,flying?0:ms,reduced,true);
 }
}
function stop(){cancelAnimationFrame(raf);raf=0;ms=DURATION;sourceRect=null;restore();}
function playHand(){if(!ready)return;stop();if(reduced)return;const n=root.querySelector<HTMLElement>('[data-uid="dungeon-hand-0"]');sourceRect=n?.getBoundingClientRect()??null;ms=0;start=performance.now();draw(true,0);raf=requestAnimationFrame(tick);}
function tick(now:number){const elapsed=now-start;if(elapsed<420){ms=0;draw(true,elapsed/420);}else{ms=elapsed-420;draw();}parent.postMessage({kind:'dungeon-progress',ms:Math.min(DURATION,ms)},location.origin);if(ms<DURATION)raf=requestAnimationFrame(tick);else stop();}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;const d=e.data;if(d?.kind==='dungeon-suspend'){stop();return;}if(!['dungeon-control','dungeon-hand'].includes(d?.kind))return;stop();variant=Math.max(0,Math.min(3,Number(d.variant)||0));side=d.side===1?1:0;multi=!!d.multi;reduced=!!d.reduced;dark=!!d.dark;if(d.kind==='dungeon-hand'){playHand();return;}ms=Math.max(0,Math.min(DURATION,Number(d.ms)||0));draw();});
window.addEventListener('resize',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
setup();const stopLayout=startBoardLayout();
window.addEventListener('pagehide',()=>{stop();disposed=true;rigs.forEach(c=>c.remove());renderer?.dispose();stopLayout();view.destroy();},{once:true});
(window as any).dungeonBoard={get state(){return{ready,variant,side,multi,reduced,ms,active:raf!==0,hidden:sourceVisibility.size,overlays:rigs.filter(c=>c.style.visibility==='visible').length,disposed};},stop,playHand,seek(t:number,v=variant){stop();ms=t;variant=v;draw();}};
void(async()=>{await waitForDuel(root);renderer=new DungeonRenderer(await surface(),await rockArt());renderer.warmup();ready=true;parent.postMessage({kind:'dungeon-ready'},location.origin);})().catch(e=>parent.postMessage({kind:'dungeon-error',error:String(e)},location.origin));
