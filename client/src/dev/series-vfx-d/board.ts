import '../../styles/tokens.css';
import '../../styles/base.css';
import '../../styles/card.css';
import '../../styles/game-overlays.css';
import '../../styles/game.css';
import '../../styles/screens.css';
import '../../styles/reading-board.css';
import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {createGame} from '../../shared/engine';
import type {GameState,FieldMon,CardInst} from '../../shared/types';
import {FRAME_BACK} from '../../shared/cards';
import {startBoardLayout} from '../../ui/layout';
import {captureCardSurface} from '../../ui/cardSurface';
import {cardEl} from '../../ui/cardView';
import {waitForDuel} from '../../ui/duelReadiness';
import {setLang} from '../../i18n';
import {defs,scene} from './timeline';
import type {Config,Scene} from './timeline';
import {drawOp,dispose,clamp} from './renderer';
import type {Point} from './renderer';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
document.body.style.cssText='margin:0;overflow:hidden;background:#f8f6f0';
const noop=()=>{};const view=new GameView(document.querySelector('#app')!,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
// This isolated instance must not animate state-fixture resets on an independent clock.
(view as unknown as {statRise:{dispose:()=>void}}).statRise.dispose();
const canvas=document.createElement('canvas');canvas.id='d-vfx';canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:600';document.body.append(canvas);const c=canvas.getContext('2d')!;
const cache=new Map<string,HTMLCanvasElement>();
let cfg:Config={cue:'S07',card:'MIMIC',variant:1,side:0,outcome:'hit',reduced:false,simultaneous:false,background:'light',speed:1,loop:true},plan:Scene=scene(cfg),g:GameState,time=0,playing=false,ready=false,raf=0,version=0,previous=0,stopLayout:()=>void=()=>{},finalized=false,baseline:GameState;
const ids:Record<string,string>={};
function mon(id:string,uid:string):FieldMon{return {...defs[id],uid,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0} as FieldMon;}
function card(id:string,uid:string):CardInst{return {...defs[id],uid};}
function node(key:string){return ids[key]?document.querySelector<HTMLElement>(`.card[data-uid="${ids[key]}"]`):document.querySelector<HTMLElement>(key);}
function point(key:string):Point{
 const side=cfg.side===0?'me':'opp',other=cfg.side===0?'opp':'me',pile=cfg.side===0?'my':'opp';
 const selectors:Record<string,string>={rift:`#rift-${side}`,enemyRift:`#rift-${other}`,shelf:`#pile-${pile}Disc`,enemyShelf:`#pile-${cfg.side===0?'opp':'my'}Disc`,deck:`#pile-${pile}Deck`,hp:`#portrait${cfg.side===0?'Me':'Opp'} .pt-vitals`,enemyHp:`#portrait${cfg.side===0?'Opp':'Me'} .pt-vitals`,mana:`#portrait${cfg.side===0?'Me':'Opp'} .pt-mana`,market:'.market-counter',spell:`#${side}Row .zone-st`};
 const n=node(key)||(selectors[key]?document.querySelector<HTMLElement>(selectors[key]):null),r=n?.getBoundingClientRect();const w=Math.min(115,innerWidth*.12);
 if(r&&r.width&&r.height)return {x:r.x+r.width/2,y:r.y+r.height/2,w:ids[key]?r.width*1.24:w,h:ids[key]?r.height+r.width*.24:w*1.4};
 return {x:innerWidth*.5,y:innerHeight*.5,w,h:w*1.4};
}
function restore(){document.querySelectorAll<HTMLElement>('[data-d-hidden]').forEach(n=>{n.style.visibility='';delete n.dataset.dHidden;});}
function hide(key:string){const n=node(key);if(n){n.style.visibility='hidden';n.dataset.dHidden='1';}}
async function texture(id:string){if(cache.has(id))return;const def=defs[id];if(!def)throw new Error('Unknown card '+id);const n=cardEl({...def,uid:'d-texture-'+id});n.style.cssText='position:fixed;left:-3000px;top:0;width:160px;height:240px;--cw:160px;--ch:240px;transform:none;pointer-events:none';document.body.append(n);await Promise.all(Array.from(n.querySelectorAll('img')).map(i=>i.decode().catch(()=>{})));const s=await captureCardSurface(n,FRAME_BACK,true,false);const face=document.createElement('canvas');face.width=512;face.height=768;const src=s.face||s.back;face.height=Math.round(512*src.height/src.width);face.getContext('2d')!.drawImage(src,0,0,512,face.height);cache.set(id,face);if(cache.size>48){const key=cache.keys().next().value;if(key)cache.delete(key);}n.remove();}
function renderBoard(){view.render(g);document.querySelector('.help-callout')?.remove();view.setHandOpen(false);}
async function setup(next:Partial<Config>){
 const epoch=++version;ready=false;playing=false;restore();cfg={...cfg,...next};post({config:cfg});plan=scene(cfg);time=0;finalized=false;
 g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'series-d-me',name:'YOU'},p1:{id:'series-d-opp',name:'OPPONENT'}}).state;g.turn=3;g.pending=null;
 for(const [side,p]of g.players.entries()){p.openingDrawReady=false;p.mana=8;p.maxMana=12;p.hp=40;p.enchants=[];p.quests=[];p.hand=[];p.discard=[card('ELF',`discard-${side}`),card('STARTER_TRASH',`discard2-${side}`)];p.removed=Array.from({length:6},(_,i)=>card(plan.family==='S07'?'MIMIC':'STARTER_TRASH',`removed-${side}-${i}`));p.field=['MIMIC2','ELF','M4'].map((id,i)=>mon(id,`d-${side}-${i}`));p.hand=[0,1,2].map(i=>card('STARTER_TRASH',`dh-${side}-${i}`));}
 const own=g.players[cfg.side],foe=g.players[1-cfg.side];
 ids.ally0=`d-${cfg.side}-0`;ids.enemy0=`d-${1-cfg.side}-0`;ids.ally1=`d-${cfg.side}-1`;ids.ally2=`d-${cfg.side}-2`;ids.enemy1=`d-${1-cfg.side}-1`;ids.enemy2=`d-${1-cfg.side}-2`;ids.ally3=`d-${cfg.side}-3`;ids.enemy3=`d-${1-cfg.side}-3`;if(plan.spawn.ally3)own.field.push(mon(plan.spawn.ally3,ids.ally3));if(plan.spawn.enemy3)foe.field.push(mon(plan.spawn.enemy3,ids.enemy3));
 for(let i=0;i<3;i++)ids['hand'+i]=`dh-${cfg.side}-${i}`;
 own.hand.push(card('STARTER_CHEST','d-chest'));ids.chest='d-chest';foe.hand.push(card('STARTER_CHEST','d-enemy-chest'));ids.enemyChest='d-enemy-chest';
 const sourceId=cfg.cue==='A011'&&cfg.card==='MIMIC'?'STARTER_CHEST':cfg.card;if(defs[sourceId]?.t==='mon'){own.field[0]=mon(sourceId,`d-${cfg.side}-0`);ids.source=own.field[0].uid;}
 else if(defs[sourceId]?.ench){const src=card(sourceId,'d-source');own.enchants.push({card:src,turns:99,bornTurn:0});ids.source=src.uid;}
 else{own.hand[1]=card(sourceId,'d-source');ids.source='d-source';ids.hand1='d-source';}
 const spell=card('MIMIC_HIDEOUT','d-spell');own.enchants.push({card:spell,turns:99,bornTurn:0});ids.spell=spell.uid;
 for(const [key,id]of Object.entries(plan.spawn)){const uid=ids[key];for(const p of g.players){const idx=p.field.findIndex(m=>m.uid===uid);if(idx>=0)p.field[idx]=mon(id,uid);}if(key==='spell')own.enchants[own.enchants.length-1].card=card(id,uid);}
 if(['A121','MIMIC_HUNTER'].includes(cfg.cue)||cfg.card==='MIMIC_HUNTER'){own.field[1]=mon('MIMIC',ids.ally1);foe.field[1]=mon('MIMIC',ids.enemy1);}
 if(cfg.card==='QUICK_SURVIVAL')own.hp=15;if(cfg.cue==='A145')own.discard=['ELF','STARTER_TRASH','MIMIC','STARTER_CHEST'].map((id,i)=>card(id,`rebuild-${i}`));if(['MIMIC_LORD','ORIGIN_MIMIC','GEM_RAIN'].includes(cfg.card)){own.field[1]=mon('MIMIC',ids.ally1);foe.field[1]=mon('MIMIC',ids.enemy1);own.discard[0]=card('MIMIC','discard-reference');}if(['ACID_RAIN','STRONG_ACID'].includes(cfg.card))own.field[1]=mon('RUST_SHROOM',ids.ally1);baseline=structuredClone(g);renderBoard();stopLayout();stopLayout=startBoardLayout();document.documentElement.style.filter=cfg.background==='dark'?'brightness(.63) contrast(1.1)':'';
 await waitForDuel(document.querySelector('#app')!);await document.fonts.ready;await Promise.all([...new Set([cfg.card,...plan.ops.map(o=>o.card),...g.players.flatMap(p=>p.field.map(m=>m.id)),'MIMIC','ELF','M4','STARTER_TRASH'])].map(texture));await new Promise<void>(r=>requestAnimationFrame(()=>r()));if(epoch!==version)return;ready=true;playing=true;previous=performance.now();draw();post({ready:false,time,phase:'準備完了'});
}
function post(value:Record<string,unknown>){parent.postMessage({kind:'series-d-status',...value},location.origin);}
function finalState(){g=structuredClone(baseline);for(const o of plan.ops){if(o.kind==='counter'&&o.family==='S23'){for(const p of g.players){const m=p.field.find(x=>x.uid===ids[o.to]);if(m)m.decayCnt=o.count;}}if(o.kind==='ability'&&o.label==='虚無'){for(const p of g.players){const m=p.field.find(x=>x.uid===ids[o.to]);if(m)m.exileOnDestroy=true;}}if(o.kind==='ability'&&o.label==='腐敗'){for(const p of g.players){const m=p.field.find(x=>x.uid===ids[o.to]);if(m)m.passivesG=[...(m.passivesG||[]),'decay'];}}if(o.kind==='collapse'){for(const p of g.players){const at=p.field.findIndex(m=>m.uid===ids[o.from]);if(at>=0){p.discard.push(p.field[at]);p.field.splice(at,1);p.hp-=3;}}}}
 for(const [i,o]of plan.ops.entries()){
  const owner=g.players[cfg.side],enemy=g.players[1-cfg.side];
  const remove=(key:string)=>{const uid=ids[key];if(!uid)return;for(const p of g.players){for(const list of [p.field,p.hand]){const at=list.findIndex(x=>x.uid===uid);if(at>=0){return list.splice(at,1)[0];}}const e=p.enchants.findIndex(x=>x.card.uid===uid);if(e>=0)return p.enchants.splice(e,1)[0].card;}};
  if(o.kind==='depart'){const removed=o.from==='shelf'?owner.discard.pop():o.from==='deck'?owner.deck.pop():remove(o.from);if(removed){const dest=o.to.startsWith('enemy')?enemy:owner;if(o.to==='shelf'||o.to==='enemyShelf')dest.discard.push(removed);else(dest.removed??=[]).push(removed);}}
  if(o.kind==='arrive'&&(['rift','shelf'].includes(o.to)||o.to.startsWith('hand'))){const created=card(o.card,`generated-${i}`);if(o.to==='rift')(owner.removed??=[]).push(created);else if(o.to==='shelf')owner.discard.push(created);else owner.hand.push(created);}
  if(o.kind==='transfer'){
   const moved=o.from.startsWith('hand')||o.from==='chest'?remove(o.from):undefined;
   if(o.from==='shelf'&&o.to==='deck'){const x=owner.discard.pop();if(x)owner.deck.push(x);}
   else if(o.from==='rift'&&o.to==='shelf'){const x=owner.removed?.pop();if(x)owner.discard.push(x);}
   else if(o.from==='enemyRift'){const x=enemy.removed?.pop();if(x){if(o.to==='enemyShelf')enemy.discard.push(x);else(owner.removed??=[]).push(x);}}
   else if(o.to==='shelf'&&moved)owner.discard.push(moved);
   else if(o.from==='deck'&&o.to.startsWith('hand'))owner.hand.push(card(o.card,`drawn-${i}`));
  }
 }
 const own=g.players[cfg.side],foe=g.players[1-cfg.side];if(cfg.cue==='A011'&&cfg.card==='GUILD_CHEST')own.hp-=10;if(['S25','A152'].includes(cfg.cue)){
  if(cfg.card==='STARTER_CHEST'){if(cfg.outcome==='hit')own.maxMana++;if(cfg.outcome==='two')own.hp+=5;}
  if(cfg.card==='LUCKY_CHEST'){if(cfg.outcome==='hit')own.hp+=12;if(cfg.outcome==='two')own.hp+=8;}
  if(cfg.card==='GUILD_CHEST'){if(cfg.outcome==='hit')own.maxMana++;if(cfg.outcome==='two')own.hp+=10;if(cfg.outcome==='miss')own.hp-=10;}
 }
 if(cfg.card==='GAMBLER'&&cfg.outcome==='hit')own.maxMana++;
 if(cfg.card==='GAMBLE'&&cfg.outcome==='hit')own.maxMana+=3;
 if(cfg.card==='LEGEND_GAMBLER'&&cfg.outcome==='two'){if(cfg.rewardChoice==='heal')own.hp+=35;else if(cfg.rewardChoice!=='destroy')own.maxMana+=4;}
 if(cfg.card==='ND3'&&cfg.outcome!=='two')own.maxMana+=4;
 if(cfg.card==='CASINO'){if(cfg.outcome==='miss')own.hp-=30;else if(cfg.outcome==='hit')foe.maxMana=3;else foe.hp-=30;}
 if(cfg.card==='LUCKY_ECHO'&&cfg.outcome==='hit')foe.hp-=6;
 if(cfg.cue==='A144'&&cfg.card==='AMA')own.maxMana++;if(cfg.card==='VOID_FRUIT')own.hp+=6;if(cfg.cue==='S23'&&cfg.card==='ACID_RAIN')foe.brand=(foe.brand||0)+1;if(cfg.cue==='S23'&&cfg.card==='STRONG_ACID'){foe.hp-=7;foe.brand=(foe.brand||0)+1;}if(cfg.card==='Q_DECAY')foe.hp-=30;if(cfg.card==='EXILE_NUKE1')foe.hp-=6;if(cfg.card==='EXILE_NUKE2')foe.hp-=12;
 if(cfg.card==='MIMIC_KING'||cfg.cue==='A118'){const m=own.field.find(m=>m.uid===ids.source);if(m){m.atkMod=6;m.defMod=6;}}if(cfg.card==='DUNGEON_FLOOR')own.maxMana--;if(cfg.cue==='A042'){if(cfg.card==='RUST_SHROOM')own.maxMana++;if(cfg.card==='RUST_SLUG'){own.maxMana++;own.hp+=5;}if(cfg.card==='ACID_RAIN')foe.brand=(foe.brand||0)+1;if(cfg.card==='STRONG_ACID'){foe.hp-=7;foe.brand=(foe.brand||0)+1;}}renderBoard();}
function draw(){
 const dpr=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(innerWidth*dpr)||canvas.height!==Math.round(innerHeight*dpr)){canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;}c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);restore();if(!ready)return;
 if(time>=6200&&!finalized){finalized=true;finalState();}if(time<6200&&finalized){finalized=false;g=structuredClone(baseline);renderBoard();}
 for(const key of Object.keys(plan.spawn)){const op=plan.ops.find(o=>o.kind==='arrive'&&o.to===key);if(op&&time<op.start+op.duration)hide(key);}
 if(!plan.spawn.spell&&cfg.card!=='MIMIC_HIDEOUT')hide('spell');
 for(const op of plan.ops){const t=time-op.start;if(t<0)continue;const a=point(op.from),b=point(op.to);if(!finalized&&['depart','collapse'].includes(op.kind)&&t>=op.duration)hide(op.from);if(t>=op.duration){if(op.kind==='counter'&&op.family==='S23'&&time<6200&&!plan.ops.some(later=>later!==op&&later.to===op.to&&later.start>op.start&&time>=later.start)&&!plan.ops.some(later=>later.kind==='collapse'&&later.from===op.to&&time>=later.start)){if(!cfg.reduced)hide(op.to);const held=cache.get(node(op.to)?.dataset.cardId||op.card);if(held)drawOp(c,op,held,a,b,op.duration*.68,cfg);}continue;}
 const exact=['counter','ability'].includes(op.kind)?node(op.to)?.dataset.cardId:['collapse','open','dice','protect','lock'].includes(op.kind)?node(op.kind==='lock'?op.to:op.from)?.dataset.cardId:undefined;const face=cache.get(exact||op.card)||cache.get(op.card);if(!face)continue;if(!cfg.reduced){if(['ability','counter'].includes(op.kind))hide(op.to);else if(['depart','collapse','open','arrive','dice','protect'].includes(op.kind))hide(op.from);if(op.kind==='lock')hide(op.to);}
 let from=a,to=b;if(op.from==='source'&&a.w<45&&['open','dice','arrive','protect'].includes(op.kind)){const u=clamp(t/op.duration),rise=Math.sin(Math.PI*u)**.65,target=Math.min(120,innerWidth*.19);from={x:a.x,y:a.y-target*.48*rise,w:a.w+(target-a.w)*rise,h:a.h+(target*1.4-a.h)*rise};}if(op.kind==='lock'){from=b;to=b;}drawOp(c,op,face,from,to,t,cfg);
 }
 const stage=[...plan.stages].reverse().find(([at])=>time>=at)?.[1]||'';post({time,phase:stage});
}
function tick(now:number){const dt=Math.min(70,now-previous);previous=now;if(playing&&ready&&!document.hidden){time+=dt*cfg.speed;if(time>6600){if(cfg.loop){time%=6600;}else{time=6600;playing=false;}}draw();}raf=requestAnimationFrame(tick);}
async function record(){const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const ctx=out.getContext('2d')!,stream=out.captureStream(30),parts:Blob[]=[];const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});recorder.ondataavailable=e=>parts.push(e.data);const ended=new Promise<void>(r=>recorder.onstop=()=>r());let rr=0;const paint=()=>{ctx.fillStyle=cfg.background==='dark'?'#151923':'#faf8f1';ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(canvas,0,0);rr=requestAnimationFrame(paint);};post({recording:'録画中（演出レイヤー）'});time=0;cfg.loop=false;playing=true;paint();recorder.start();await new Promise(r=>setTimeout(r,7100/cfg.speed));recorder.stop();await ended;cancelAnimationFrame(rr);stream.getTracks().forEach(t=>t.stop());const url=URL.createObjectURL(new Blob(parts,{type:'video/webm'}));const a=document.createElement('a');a.href=url;a.download=`${cfg.cue}-${cfg.card}-v${cfg.variant}-effect-layer.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);post({recording:'同一時計の動画保存'});}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.kind!=='series-d')return;const x=e.data;if(x.command==='setup')void setup(x).catch(err=>post({phase:String(err)}));if(x.command==='play'){if(time>=6600)time=0;playing=true;}if(x.command==='pause')playing=false;if(x.command==='seek'){time=clamp(x.time/6600)*6600;playing=false;draw();}if(x.command==='reset'){time=0;playing=false;draw();}if(x.command==='options')cfg={...cfg,speed:x.speed,loop:x.loop};if(x.command==='record')void record();});
window.addEventListener('pagehide',()=>{ready=false;playing=false;cancelAnimationFrame(raf);restore();stopLayout();view.destroy();dispose();cache.clear();},{once:true});
(window as unknown as {dLab:unknown}).dLab={setup,seek:(n:number)=>{playing=false;time=n;draw();},play:()=>{playing=true;},pause:()=>{playing=false;},get state(){return{ready,time,playing,cfg,ops:plan.ops,phase:[...plan.stages].reverse().find(([at])=>time>=at)?.[1],cache:cache.size,finalized};},get model(){return g.players.map(p=>({hp:p.hp,maxMana:p.maxMana,brand:p.brand||0,hand:p.hand.map(c=>c.id),field:p.field.map(m=>({id:m.id,uid:m.uid,decayCnt:m.decayCnt||0,passives:m.passivesG||[]})),removed:p.removed?.map(c=>c.id)||[],discard:p.discard.map(c=>c.id),deckCount:p.deck.length,enchants:p.enchants.map(e=>e.card.id)}));},get definitions(){return defs;}};
raf=requestAnimationFrame(tick);post({ready:true});
