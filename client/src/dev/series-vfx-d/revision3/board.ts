import {Handling} from './handling';
import {VoidMarks} from './void/marks';
import {paintVoid} from './void/material';
import {ChestLocks} from './mimic/locks';
import {paintDungeon,paintHunter} from './mimic/dungeon';
import {CorrosionTargets,corrosionReady} from './corrosion/targets';
import {needsEndpoint,finishEndpoints} from './endpoints';
import {paintCorrosion} from './corrosion/material';
import {paintDiceMaterial} from './dice/material';
import '../../../styles/tokens.css';import '../../../styles/base.css';import '../../../styles/card.css';import '../../../styles/game-overlays.css';import '../../../styles/game.css';import '../../../styles/screens.css';import '../../../styles/reading-board.css';import '../../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../../ui/boardView';
import {cardEl} from '../../../ui/cardView';import {startBoardLayout} from '../../../ui/layout';import {waitForDuel} from '../../../ui/duelReadiness';import {fieldPlacement,setFxSkip} from '../../../ui/anim';import {setLang,cardName} from '../../../i18n';
import type {GameState,GameEvent,Side} from '../../../shared/types';
import {makeFixture} from './fixture';import type {Config,Fixture} from './fixture';import {available,definitions,recipes,fixed,directions} from './catalog';import {paint,W,H,ease} from './material';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');document.body.style.cssText='margin:0;overflow:hidden';
const noop=()=>{};const view=new GameView(document.querySelector('#app')!,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
(view as unknown as {statRise:{dispose():void}}).statRise.dispose();
let cfg:Config={item:'S07',card:'MIMIC',variant:1,side:0,outcome:'hit',reduced:false,background:'light'},fixture:Fixture,g:GameState;
let voidMarks:VoidMarks|null=null,handling:Handling|null=null;
let chestLocks:ChestLocks|null=null;
let targetMaterials:CorrosionTargets|null=null,native=false,nativeDone=false,nativeStarted=0;let finalTime=3400,duration=4200;
let nativeTask:Promise<void>|null=null;
let ready=false,playing=false,time=0,speed=1,loop=false,epoch=0,raf=0,previous=0,finalized=false,stopLayout=()=>{};
let floating:HTMLElement|null=null,material:HTMLCanvasElement|null=null,image:HTMLImageElement|null=null,origin:DOMRect|null=null,originPlacement:DOMMatrix|null=null;
const arrivalActors=new Map<string,HTMLElement>();
const transient=new Map<HTMLElement,string>();
const badge=document.createElement('div');badge.style.cssText='position:fixed;left:50%;top:8%;transform:translateX(-50%);max-width:88%;padding:6px 12px;border:1px solid #a48851;background:#17252dee;color:#f1dfb6;border-radius:5px;font:13px system-ui;pointer-events:none;z-index:200;display:none';document.body.append(badge);
const post=(data:Record<string,unknown>)=>parent.postMessage({kind:'d3-status',...data},location.origin);
const node=(uid:string)=>document.querySelector<HTMLElement>(`.card[data-uid="${CSS.escape(uid)}"]:not([data-r3-float])`)||document.querySelector<HTMLElement>(`.buff-icon[data-uid="${CSS.escape(uid)}"],.quest-card[data-uid="${CSS.escape(uid)}"]`);
function hide(n:HTMLElement|null,yes:boolean){if(!n)return;if(yes){if(!transient.has(n))transient.set(n,n.style.visibility);n.style.visibility='hidden';}else if(transient.has(n)){n.style.visibility=transient.get(n)!;transient.delete(n);}}
function restore(){for(const [n,v]of transient)n.style.visibility=v;transient.clear();}
function render(){restore();view.render(g);view.setHandOpen(false);document.querySelector('.help-callout')?.remove();}
function cleanup(){voidMarks?.dispose();voidMarks=null;handling?.dispose();handling=null;chestLocks?.dispose();chestLocks=null;targetMaterials?.dispose();targetMaterials=null;restore();floating?.remove();floating=null;material=null;image=null;for(const n of arrivalActors.values())n.remove();arrivalActors.clear();badge.style.display='none';}
function interpolated(a:DOMMatrix,b:DOMMatrix,t:number){return new DOMMatrix(Array.from(a.toFloat64Array(),(v,i)=>v+(b.toFloat64Array()[i]-v)*t));}
function startState(){g=structuredClone(fixture.before);for(const side of [0,1]as Side[]){const before=new Set(g.players[side].field.map(c=>c.uid));for(const m of fixture.after.players[side].field)if(!before.has(m.uid))g.players[side].field.push(structuredClone(m));for(const e of fixture.after.players[side].enchants)if(!g.players[side].enchants.some(x=>x.card.uid===e.card.uid))g.players[side].enchants.push(structuredClone(e));for(const q of fixture.after.players[side].quests||[])if(!g.players[side].quests?.some(x=>x.card.uid===q.card.uid))(g.players[side].quests??=[]).push(structuredClone(q));}render();}
async function setup(next:Partial<Config>){
 if(native){post({ready:true,phase:'既定の退場が終了してから切り替えできます。'});return;}const token=++epoch;nativeDone=false;finalTime=3400;duration=4200;ready=false;playing=false;cleanup();cfg={...cfg,...next};if(!available(cfg.item,cfg.card))throw new Error('未制作項目');fixture=makeFixture(cfg);voidMarks=new VoidMarks(fixture,cfg.item==='A014');handling=new Handling();targetMaterials=new CorrosionTargets(fixture);if(cfg.item==='A058')chestLocks=new ChestLocks();time=0;finalized=false;g=structuredClone(fixture.before);render();stopLayout();stopLayout=startBoardLayout();await waitForDuel(document.querySelector('#app')!);const originElement=(fixture.sourceZone==='deck'?document.querySelector(`#pile-${cfg.side===0?'my':'opp'}Deck`):fixture.sourceZone==='market'?document.querySelector<HTMLElement>('#supplyMarket [data-sup-idx="0"]'):node('r3-source'));origin=originElement?.getBoundingClientRect()||null;originPlacement=originElement?fieldPlacement(originElement as HTMLElement,180,280):null;startState();
 const f=cardEl(fixture.source,{size:'hand',fullArt:true});f.dataset.r3Float='1';f.style.cssText='position:fixed;left:0;top:0;margin:0;pointer-events:none;z-index:180;transform-origin:0 0;visibility:hidden;--cw:180px;--ch:280px;width:180px;height:280px';document.body.append(f);
 const img=new Image();img.src=`/art/cards/${encodeURIComponent(cfg.card)}.webp`;
 await Promise.all([img.decode(),...Array.from(f.querySelectorAll('img')).map(i=>i.decode()),waitForDuel(document.querySelector('#app')!),document.fonts.ready,corrosionReady]);
 if(token!==epoch){f.remove();return;}floating=f;image=img;
 material=Object.assign(document.createElement('canvas'),{width:W,height:H});material.className='d3-object-material';const artImage=f.querySelector<HTMLImageElement>('.card-art img')!;const artStyle=getComputedStyle(artImage);material.style.cssText=`position:absolute;left:${artImage.offsetLeft}px;top:${artImage.offsetTop}px;width:${artImage.offsetWidth}px;height:${artImage.offsetHeight}px;object-fit:${artStyle.objectFit};object-position:${artStyle.objectPosition};pointer-events:none;z-index:3`;f.querySelector('.card-art')?.append(material);
 for(const e of fixture.events){if(e.type!=='summon'||(e.id===cfg.card&&e.player===cfg.side))continue;const card=fixture.after.players[e.player].field.find(c=>c.uid===e.uid);if(!card)continue;const child=cardEl(card,{field:true,fullArt:true});child.dataset.r3Float='1';child.style.cssText='position:fixed;left:0;top:0;margin:0;pointer-events:none;z-index:181;transform-origin:0 0;visibility:hidden;--cw:100px;--ch:150px;width:100px;height:150px';document.body.append(child);arrivalActors.set(e.uid,child);}
 await Promise.all([...arrivalActors.values()].flatMap(n=>[...n.querySelectorAll('img')].map(i=>i.decode())));if(token!==epoch)return;await handling.prepare(fixture,cfg,node);
 document.querySelector<HTMLElement>('#app')!.style.filter=cfg.background==='dark'?'brightness(.62)':'';
 ready=true;draw();post({ready:true,duration,phase:`準備完了 / ${cardName(fixture.source)} / 実エンジンseed ${fixture.seed}`});
}
function draw(){
 if(!ready||!floating||!material||!image)return;
 if(time>=finalTime&&!native&&!finalized){g=structuredClone(fixture.after);render();finalized=true;}
 if(time<finalTime&&finalized){finalized=false;startState();}
 chestLocks?.draw(time,cfg.variant);handling?.draw(time,cfg.variant,cfg.reduced);voidMarks?.draw(Math.min(time,3390),cfg.variant,uid=>cfg.card==='QUICK_REBIRTH'&&finalized?node(uid):uid===fixture.source.uid&&floating?floating:arrivalActors.get(uid)||node(uid),cfg.background==='dark',cfg.reduced);
 targetMaterials?.draw(Math.min(time,3390),cfg.variant,node);
 const arrivals=fixture.events.filter(e=>e.type==='summon');
 for(const e of arrivals)if(e.type==='summon')hide(node(e.uid),time<3400);
 for(const [side,p]of fixture.after.players.entries())for(const card of [...p.enchants.map(e=>e.card),...(p.quests||[]).map(q=>q.card)])if(![...fixture.before.players[side].enchants.map(e=>e.card),...(fixture.before.players[side].quests||[]).map(q=>q.card)].some(c=>c.uid===card.uid))hide(node(card.uid),time<finalTime);
 const primary=arrivals.find(e=>e.type==='summon'&&e.id===cfg.card&&e.player===cfg.side);
 const persistentSource=fixture.after.players.flatMap(p=>[...p.field,...p.enchants.map(e=>e.card),...(p.quests||[]).map(q=>q.card)]).find(c=>c.uid===fixture.source.uid);
 const destination=persistentSource?node(persistentSource.uid):primary&&primary.type==='summon'?node(primary.uid):document.querySelector<HTMLElement>(`#pile-${cfg.side===0?'my':'opp'}Disc .pile-print .card`)||document.querySelector<HTMLElement>(`#pile-${cfg.side===0?'my':'opp'}Disc`);
 const w=floating.offsetWidth,h=floating.offsetHeight;
 const from=origin||new DOMRect(innerWidth*.48,innerHeight*.8,w*.5,h*.5);
 const start=originPlacement||new DOMMatrix().translate(from.x,from.y).scale(from.width/w,from.height/h);
 const showTargets=['A039','A040','A041','A042','A051','A058'].includes(cfg.item)||['VOID_RITE','QUICK_REBIRTH','DECAY_CRAFT'].includes(cfg.card);
 const focusScale=Math.min(showTargets?.88:1.45,innerWidth*(showTargets?.24:.48)/w,innerHeight*.70/h);
 const middle=cfg.item==='A051'&&cfg.card==='VOID_RITE'?start:new DOMMatrix().translate(showTargets?innerWidth*.07:(innerWidth-w*focusScale)/2,(innerHeight-h*focusScale)/2).scale(focusScale);
 const sourceWillExile=fixture.after.players.some(p=>p.removed?.some(c=>c.uid===fixture.source.uid||(fixture.sourceZone==='market'&&c.id===fixture.source.id)));
 const end=cfg.item==='A014'&&node(fixture.source.uid)?fieldPlacement(node(fixture.source.uid)!,w,h):sourceWillExile?middle:destination?fieldPlacement(destination,w,h):new DOMMatrix().translate(innerWidth*.18,innerHeight*.72).scale(.35);
 let matrix:DOMMatrix;if(cfg.reduced)matrix=middle;else if(time<640)matrix=interpolated(start,middle,ease(0,640,time));else matrix=interpolated(middle,end,ease(2660,3400,time));
 floating.style.transform=matrix.toString();floating.style.visibility=time>0&&time<3400?'visible':'hidden';hide(fixture.sourceZone&&fixture.sourceZone!=='hand'?node(fixture.source.uid):document.querySelector<HTMLElement>('#hand .card[data-uid="r3-source"]'),time>0&&time<3400);
 paint(material,image,cfg.card,cfg.variant,time,cfg.reduced);
 if(cfg.card==='MIMIC_HUNTER')paintHunter(material,image,cfg.variant,time,cfg.reduced);else if(recipes[cfg.card]?.theme==='dungeon')paintDungeon(material,image,cfg.card,cfg.variant,time,cfg.reduced);
 if(recipes[cfg.card]?.theme==='void'&&!fixed(cfg.item))paintVoid(material,image,cfg.card,cfg.variant,time,cfg.reduced);
 if(recipes[cfg.card]?.theme==='corrosion')paintCorrosion(material,image,cfg.card,cfg.variant,time,cfg.reduced);
 const diceEvents=fixture.events.filter((e):e is Extract<GameEvent,{type:'dice'}>=>e.type==='dice'&&e.player===cfg.side);
 const activeDice=cfg.item==='A155'?diceEvents.filter(e=>e.variant==='casino'):diceEvents;
 const rolls=fixture.initialRolls?(time<1680?fixture.initialRolls:activeDice.at(-1)?.rolls||[]):activeDice.flatMap(e=>e.rolls);
 if(recipes[cfg.card]?.theme==='dice')paintDiceMaterial(material,image,cfg.card,cfg.variant,fixture.initialRolls&&time>=1680?time-1160:time,rolls,cfg.reduced);
 let index=0;for(const [uid,actor]of arrivalActors){const n=node(uid);const startAt=2220+index*100,endAt=3220+index*35;actor.style.visibility=time>=startAt&&time<3400?'visible':'hidden';if(n){const at=fieldPlacement(n,actor.offsetWidth,actor.offsetHeight);const origin=new DOMMatrix().translate(innerWidth*.5-24+index*8,innerHeight*.52).scale(.28);let m=interpolated(origin,at,ease(startAt,endAt,time));if(!cfg.reduced){const u=ease(startAt,endAt,time);m=new DOMMatrix().translate(0,-Math.sin(u*Math.PI)*(cfg.variant===1?28:50)).multiply(m);}actor.style.transform=m.toString();}index++;}
 const dice=activeDice.at(-1);const logs=fixture.events.filter(e=>e.type==='log');
 badge.style.display=cfg.item==='A051'&&cfg.card==='VOID_RITE'?'none':time>=1600&&time<3400?'block':'none';badge.textContent=dice&&dice.type==='dice'?`${fixture.prediction!=null?'予測 '+fixture.prediction+' / ':''}${fixture.initialRolls&&time>=1680?'振り直し / ':''}🎲 ${rolls.join(' + ')} = ${rolls.reduce((a,b)=>a+b,0)}`:directions(cfg.item,cfg.card)[cfg.variant-1]||'';
 const phase=time<640?'カードを実盤面から提示':time<1600?'予兆・物体の動作':time<2660?'能力の発動・同じ物体から結果へ':time<3400?'同じカードを実際の到着位置へ':'実エンジンの結果を反映';
 post({time,phase:cfg.item==='A058'&&time>=1800?'マスターミミックが存在：両者の宝箱使用を封鎖。実reduceは使用を受理しません。':time>=3400&&logs.length?logs.map(e=>e.type==='log'?e.htmlJa.replace(/<[^>]+>/g,''):'').slice(-2).join(' / '):phase});
}
async function nativeFinish(){const token=epoch;native=true;post({busy:true});nativeStarted=performance.now();time=3390;draw();if(cfg.item==='A014'&&floating){const original=node(fixture.source.uid);if(original){hide(original,false);for(const canvas of floating.querySelectorAll('canvas')){const img=new Image();img.src=canvas.toDataURL();img.className='d3-frozen-material';img.style.cssText=canvas.className==='d3-void-mark'?'position:absolute;inset:0;width:100%;height:100%;z-index:4':'position:absolute;left:7.5%;top:18%;width:85%;height:77%;object-fit:cover;object-position:center 22%;z-index:3';original.querySelector('.card-art')?.append(img);}floating.style.visibility='hidden';}}try{if(cfg.reduced)setFxSkip(true);await finishEndpoints(fixture,floating,node,phase=>post({phase}),cfg.item);if(token!==epoch)return;nativeDone=true;time=3390+performance.now()-nativeStarted;finalTime=time;duration=time+800;post({duration});}catch(error){playing=false;post({error:String(error)});}finally{if(cfg.reduced)setFxSkip(false);native=false;post({busy:false});if(token===epoch)draw();}}
function tick(now:number){if(native){post({time:3390+now-nativeStarted});}else if(playing&&ready&&!document.hidden){time+=Math.max(0,now-previous)*speed;if(!nativeDone&&time>=3390&&needsEndpoint(fixture)){nativeTask=nativeFinish();}else if(time>=duration){time=duration;playing=false;draw();if(loop){void setup(cfg).then(()=>play());}}else draw();}previous=now;raf=requestAnimationFrame(tick);}
async function resetBoard(){playing=false;if(native){++epoch;setFxSkip(true);try{await nativeTask;}finally{setFxSkip(false);}}await setup(cfg);}
function play(){if(!ready)return;if(time>=duration){void setup(cfg).then(()=>play());return;};previous=performance.now();playing=true;}
function seek(n:number){if(!ready||native)return;playing=false;time=Math.max(0,Math.min(duration,n));draw();}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.kind!=='d3')return;const d=e.data;if(d.command==='setup')void setup(d).catch(err=>post({error:String(err),phase:String(err)}));if(d.command==='play')play();if(d.command==='pause'){if(native)void resetBoard().catch(err=>post({error:String(err)}));else playing=false;}if(d.command==='reset')void resetBoard().catch(err=>post({error:String(err)}));if(d.command==='seek')seek(d.time);if(d.command==='options'){speed=d.speed;loop=d.loop;}});
window.addEventListener('pagehide',()=>{++epoch;playing=false;ready=false;cancelAnimationFrame(raf);cleanup();stopLayout();view.destroy();});
(window as unknown as {dR3:unknown}).dR3={setup,play,seek,pause:()=>{playing=false;},get state(){return{ready,playing,time,cfg,finalized,native,duration};},get fixture(){return fixture;},get model(){return g;},get definitions(){return definitions;}};
raf=requestAnimationFrame(tick);post({boot:true});
