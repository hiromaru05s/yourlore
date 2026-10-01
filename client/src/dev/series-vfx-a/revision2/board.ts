import '../../../styles/tokens.css';import '../../../styles/base.css';import '../../../styles/card.css';import '../../../styles/game-overlays.css';import '../../../styles/game.css';import '../../../styles/screens.css';import '../../../styles/reading-board.css';import '../../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../../ui/boardView';import {createGame} from '../../../shared/engine';import {DB,STARTERS} from '../../../shared/cards';import {startBoardLayout} from '../../../ui/layout';import {setLang} from '../../../i18n';import {waitForDuel} from '../../../ui/duelReadiness';import {ghostSummon,setPlayOrigin,setFxSkip} from '../../../ui/anim';
import {AssassinMaterial,ArtLayer,DURATION,type Direction} from './material';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const style=document.createElement('style');style.textContent='.topbar,.help-fab,.mute-fab,.help-callout{display:none!important}body{overflow:hidden}.r2-art-layer{animation:none!important;transition:none!important}';document.head.append(style);
const noop=()=>{};const view=new GameView(document.querySelector('#app')!,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const stop=startBoardLayout();const game=createGame({mode:'bot',seed:71,starting:0,p0:{id:'r2-me',name:'YOU'},p1:{id:'r2-opp',name:'OPPONENT'}}).state;
const card=(id:string,uid:string)=>({...DB[id]||STARTERS[id],uid});const mon=(id:string,uid:string)=>({...card(id,uid),atk:DB[id].atk||0,def:DB[id].def||1,dmg:0,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0});
game.turn=3;game.pending=null;game.opening=undefined;for(const [i,p]of game.players.entries()){p.openingDrawReady=false;p.hp=32;p.mana=8;p.maxMana=12;p.enchants=[];p.quests=[];p.traps=[];p.field=[mon('ASSASSIN1',`r2-ally-${i}`),mon('ASSASSIN2',`r2-ally2-${i}`)];p.discard=[card('M4',`r2-disc-${i}`)];p.hand=[card('ASSASSIN4',`r2-hand-${i}`),card('S10',`r2-draw-${i}`)];}
let direction:Direction='blade',side:0|1=0,ready=false,running=false,time=0,raf=0,generation=0,disposed=false,material:AssassinMaterial;let layers=new Map<HTMLElement,ArtLayer>();let start=0,impact:number|null=null,events:{name:string;ms:number}[]=[];let observer:MutationObserver;let phase='idle',impactLocal=0;let error='';let nativeTask:Promise<HTMLElement|null>|null=null;
function report(){return{ready,running,time,direction,side,error,events,phase,source:!!document.querySelector('[data-uid="r2-summon"]'),layerCount:layers.size};}
function clear(){for(const l of layers.values())l.dispose();layers.clear();}
function scan(){for(const n of document.querySelectorAll<HTMLElement>('[data-uid="r2-summon"]')){if(n.querySelector('.card-art img')&&!layers.has(n))layers.set(n,new ArtLayer(n));}for(const[n,l]of layers)if(!n.isConnected){l.dispose();layers.delete(n);}}
function draw(ms:number){time=Math.max(0,Math.min(DURATION,ms));scan();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const active=direction!=='normal'&&!reduced&&ms>=0&&ms<DURATION;const surface=material.draw(time,direction);for(const l of layers.values())l.paint(surface,active,time,direction);}
function fixture(settled:boolean){clear();for(const[i,p]of game.players.entries()){p.field=p.field.filter(c=>c.uid!=='r2-summon');p.hand=[card('ASSASSIN4',`r2-hand-${i}`),card('S10',`r2-draw-${i}`)];}if(settled){game.players[side].field.push(mon('ASSASSIN4','r2-summon'));game.players[side].hand=game.players[side].hand.filter(c=>c.id!=='ASSASSIN4');}view.render(game);view.setHandOpen(false);}
async function reset(settled=false){++generation;running=false;cancelAnimationFrame(raf);if(nativeTask){setFxSkip(true);await nativeTask.catch(()=>null);nativeTask=null;}setFxSkip(false);fixture(settled);await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));time=0;events=[];impact=null;impactLocal=0;phase='idle';if(settled)draw(-1);}
async function choose(d:Direction,s:0|1=0){direction=d;side=s;await reset(true);}
async function play(){if(!ready||running)return;await reset(false);const token=generation;running=true;events=[];const source=document.querySelector<HTMLElement>(`[data-uid="r2-hand-${side}"]`);if(side===0&&source){const r=source.getBoundingClientRect();setPlayOrigin({left:r.left,top:r.top,width:r.width,height:r.height,dx:0,dy:0});}if(source)source.style.visibility='hidden';start=performance.now();impact=null;
 // Pilot-owned phases; native focus/flight/landing transforms are untouched.
 // Finish the front veil/blade action during the native enlarged reveal.
 // There is no fixed pose held until landing and no material wait after native completion.
 const phaseTo=(next:string,elapsed:number)=>{if(phase!==next){phase=next;events.push({name:'material '+next,ms:elapsed});}};
 const tick=(now:number)=>{if(!running||generation!==token)return;const elapsed=now-start;let local:number;
  if(impact!==null){phaseTo('着地・収束',elapsed);const q=Math.min(1,Math.max(0,(elapsed-impact)/160));const eased=q*q*(3-2*q);local=impactLocal+(DURATION-impactLocal)*eased;}
  else if(elapsed<420){phaseTo('拡大・主動作',elapsed);local=DURATION*.86*Math.max(0,elapsed/420);}
  else{phaseTo('移動・余韻',elapsed);local=DURATION*(.86+.12*(1-Math.exp(-(elapsed-420)/280)));}
  draw(local);raf=requestAnimationFrame(tick);
 };raf=requestAnimationFrame(tick);
 try{nativeTask=ghostSummon(mon('ASSASSIN4','r2-summon'),side===0?'me':'opp',2);const node=await nativeTask;nativeTask=null;if(token!==generation)return;if(!node)throw Error('ghostSummon returned no landing face');events.push({name:'native ghostSummon returned',ms:performance.now()-start});if(direction==='normal')time=DURATION;
 // Native completion always terminates this local layer, even if no impact
 // event was dispatched (reduced motion, fast-forward, or an interrupted event).
 if(impact===null)events.push({name:'missing impact: cleanup at native completion',ms:performance.now()-start});
 running=false;cancelAnimationFrame(raf);phase='完了';fixture(true);draw(DURATION);events.push({name:'fixture final render',ms:performance.now()-start});
 }catch(e){error=String(e);running=false;cancelAnimationFrame(raf);clear();}}
function onImpact(){if(!running)return;impact=performance.now()-start;impactLocal=time;events.push({name:'native lore:summon-impact',ms:impact});}
function seek(ms:number){if(running)return;phase=ms<240?'作画・予兆':ms<610?'作画・ピーク':'作画・収束';draw(ms);}
window.addEventListener('lore:summon-impact',onImpact);document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)void reset(true);});
async function init(){try{fixture(true);const image=new Image();image.src='/art/cards/ASSASSIN4.webp';const veil=new Image();veil.src=new URL('./assets/shadow-veil-v1.png',import.meta.url).href;await Promise.all([image.decode(),veil.decode(),waitForDuel(view.root)]);material=new AssassinMaterial(image,veil);observer=new MutationObserver(scan);observer.observe(view.root,{childList:true,subtree:true});ready=true;draw(-1);}catch(e){error=String(e);}}
function dispose(){if(disposed)return;disposed=true;running=false;++generation;setFxSkip(true);cancelAnimationFrame(raf);observer?.disconnect();window.removeEventListener('lore:summon-impact',onImpact);clear();material?.dispose();stop();view.destroy();}
(window as any).assassinR2={info:report,get ready(){return ready},choose,play,seek,reset:()=>reset(true),dispose};window.addEventListener('pagehide',dispose,{once:true});void init();
