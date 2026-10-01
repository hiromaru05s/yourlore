import '../../../styles/tokens.css';
import '../../../styles/base.css';
import '../../../styles/card.css';
import '../../../styles/game-overlays.css';
import '../../../styles/game.css';
import '../../../styles/screens.css';
import '../../../styles/reading-board.css';
import '../../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../../ui/boardView';
import {createGame,reduce} from '../../../shared/engine';
import {DB,STARTERS} from '../../../shared/cards';
import type {CardInst,FieldMon,GameState,GameEvent} from '../../../shared/types';
import {startBoardLayout} from '../../../ui/layout';
import {destroyAnim,setFxSkip} from '../../../ui/anim';
import {setLang} from '../../../i18n';
import {waitForDuel} from '../../../ui/duelReadiness';
import {attachSurface,drawFrame,materials,lengths,keys,type Surface,type Variant} from './material';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const noop=()=>{};
let finishLead:(()=>void)|undefined;
let selectedVariant:Variant=1,busy=false,frame=0,time=0,run=0,source:Surface|undefined,target:Surface|undefined,after:GameState|undefined;
let assets:Awaited<typeof materials>,baseline:GameState,events:GameEvent[]=[],initEvents:GameEvent[]=[],owner:0|1=0;
const root=document.querySelector<HTMLElement>('#app')!;
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:uid=>{if(uid==='r2-target')void play();},onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const stopLayout=startBoardLayout();
const canvas=document.createElement('canvas');canvas.id='elf-r2-flight';canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:130';document.body.append(canvas);const ctx=canvas.getContext('2d')!;
const ci=(id:string,uid:string):CardInst=>({...((DB as any)[id]||(STARTERS as any)[id]),uid});
const fm=(id:string,uid:string):FieldMon=>({...ci(id,uid),exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0} as FieldMon);
function setupState(){
 const g=createGame({mode:'bot',seed:724,starting:owner,p0:{id:'r2self',name:'YOU'},p1:{id:'r2opp',name:'OPPONENT'}}).state;
 g.cur=owner;g.turn=3;g.pending=null;g.opening=undefined;
 for(const p of g.players){p.field=[];p.enchants=[];p.quests=[];p.traps=[];p.mana=15;p.maxMana=15;p.dew=4;p.hp=60;p.shield=0;p.hand=[ci('CHEST',`hand-${p.id}`)];p.discard=[];p.deck=[ci('M2',`deck-${p.id}`)];}
 const p=g.players[owner],o=g.players[1-owner];p.hand=[ci('ELF','r2-elf')];p.field=[fm('M2','r2-friendly')];
 // ASSASSIN3 has native 17 attack in the current DB and no aura: a legal ELF effect target.
 o.field=[fm('M2','r2-other-a'),fm('ASSASSIN3','r2-target'),fm('M5','r2-other-b')];
 const summoned=reduce(g,{type:'play',idx:0});initEvents=summoned.events;
 if(summoned.state.pending?.reason!=='ELF_DESTROY')throw Error('ELF did not create target choice: '+JSON.stringify(summoned.events));
 baseline=summoned.state;
 const resolved=reduce(baseline,{type:'chooseTarget',uid:'r2-target'});events=resolved.events;after=resolved.state;
 if(!events.some(e=>e.type==='destroy'&&e.uid==='r2-target'))throw Error('Reducer did not destroy chosen target');
}
function cleanup(){source?.canvas.remove();target?.canvas.remove();source=target=undefined;ctx.clearRect(0,0,canvas.width,canvas.height);}
function sizing(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);}
function refresh(){cleanup();view.render(structuredClone(baseline));view.setHandOpen(false);document.querySelector('.help-callout')?.remove();sizing();}
function attach(){cleanup();const s=document.querySelector<HTMLElement>('.card[data-uid="r2-elf"]'),t=document.querySelector<HTMLElement>('.card[data-uid="r2-target"]');if(!s||!t)throw Error('Required card absent');source=attachSurface(s);target=attachSurface(t);}
function paint(ms:number){time=ms;if(source&&target)drawFrame(ctx,source,target,assets,selectedVariant,ms,api.reduced);canvas.dataset.time=String(Math.round(ms));canvas.dataset.variant=String(selectedVariant);}
async function stable(){await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));await Promise.all([...root.querySelectorAll<HTMLImageElement>('img')].map(i=>i.decode().catch(()=>{})));}
async function reset(){if(!baseline)return;const token=++run;cancelAnimationFrame(frame);finishLead?.();finishLead=undefined;setFxSkip(true);busy=false;await Promise.resolve();if(token!==run)return;setFxSkip(false);refresh();await stable();if(token!==run)return;attach();paint(0);api.phase='対象確定前 · 雫は召喚時に4→6';}
async function seek(ms:number){if(busy)return;cleanup();refresh();await stable();attach();paint(Math.min(lengths[selectedVariant],Math.max(0,ms)));api.phase='作画比較（結果の破壊処理は再生時のみ）';}
async function play(){
 if(!api.ready||busy)return;const request=run+1;await reset();if(run!==request)return;const token=run;busy=true;api.phase='対象確定 · ELFの効果';
 // The result is authoritative reducer output. Only its presentation waits for the local lead-in.
 const began=performance.now(),duration=api.reduced?230:lengths[selectedVariant];
 await new Promise<void>(resolve=>{finishLead=resolve;const tick=(now:number)=>{if(run!==token){resolve();return;}const p=Math.min(1,(now-began)/duration);paint(p*lengths[selectedVariant]);if(p===1)resolve();else frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);});
 finishLead=undefined;if(run!==token)return;
 // Keep target.canvas parented to the actual card during shared mdie. Its
 // transform/opacity follow that node; never reveal an unmarked original.
 source?.canvas.remove();source=undefined;ctx.clearRect(0,0,canvas.width,canvas.height);
 api.phase='接触 → 既定の破壊 → シェルフ';
 for(const e of events)if(e.type==='destroy')await destroyAnim(e.uid,e.player===0?'me':'opp');
 if(run!==token)return;cleanup();view.render(structuredClone(after!));view.setHandOpen(false);busy=false;api.phase='結果確定 · ELF存続 / 対象はシェルフ';
}
const api={ready:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,phase:'素材を準備中',get busy(){return busy;},get time(){return time;},get variant(){return selectedVariant;},get evidence(){return {initEvents,events,before:baseline,after};},async choose(v:Variant,side:0|1=0){selectedVariant=v;if(owner!==side){owner=side;setupState();}await reset();},reset,seek,play,keys,lengths,dispose(){run++;cancelAnimationFrame(frame);finishLead?.();finishLead=undefined;setFxSkip(true);cleanup();canvas.remove();stopLayout();view.destroy();}};
(window as any).seriesBR2Board=api;
materials.then(async m=>{assets=m;setupState();await reset();api.phase='盤面の準備完了を待機中';await waitForDuel(view.root);await stable();api.phase='対象確定前 · 雫は召喚時に4→6';api.ready=true;}).catch(e=>{api.phase=String(e);console.error(e);});
window.addEventListener('resize',()=>{void reset();});document.addEventListener('visibilitychange',()=>{if(document.hidden)void reset();});window.addEventListener('pagehide',()=>api.dispose(),{once:true});
