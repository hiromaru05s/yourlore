import '../../../styles/tokens.css';import '../../../styles/base.css';import '../../../styles/card.css';import '../../../styles/game-overlays.css';import '../../../styles/game.css';import '../../../styles/screens.css';import '../../../styles/reading-board.css';import '../../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../../ui/boardView';
import {cardEl} from '../../../ui/cardView';
import type {GameState,GameEvent} from '../../../shared/types';
import {arrivalFixture,card} from './fixtures';
import {startBoardLayout} from '../../../ui/layout';
import {setLang} from '../../../i18n';
import {waitForDuel} from '../../../ui/duelReadiness';
import {attach,dispose,freezeSurface,type Surface} from './surface';
import {drawSummon,duration} from './first-materials';
import {eggCues,eggStages,eggFixture,type EggFixture} from './egg-fixtures';
import {drawEgg} from './egg-materials';
import {setFxSkip,manaSurge} from '../../../ui/anim';
import {stateFixture,stateStages,type StateFixture} from './state-fixtures';
import {attachState,drawState,disposeState,type StateSurface} from './state-materials';
import {transferFixture,transferCues,type TransferFixture} from './transfer-fixtures';
import {drawTransferSource,playTransfers} from './transfer-player';
import {nativeBridge} from './native-bridge';
import {synergyFixture,synergyCues,type SynergyFixture} from './synergy-fixtures';
import {effectCues,effectFixture,type EffectFixture} from './effect-fixtures';
import {drawEffectSource,playEffect} from './effect-player';
import {playSynergy} from './synergy-player';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const root=document.querySelector<HTMLElement>('#app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const bridge=nativeBridge(root);
const stopLayout=startBoardLayout();let scene='S02',cardId='ELF',variant=1,owner:0|1=0,surface:Surface|undefined,cast:HTMLElement|undefined,raf=0,run=0,busy=false,progress=0;
let before:GameState,after:GameState,events:GameEvent[]=[],cancel:(()=>void)|undefined,egg:EggFixture|undefined,stateData:StateFixture|undefined,stateSurface:StateSurface|undefined;
let transfer:TransferFixture|undefined,transferAbort=new AbortController();
let effect:EffectFixture|undefined,effectStep=-1;
let synergy:SynergyFixture|undefined,playStarted=0,playElapsed=0;
function fixture(){
 const f=arrivalFixture(cardId,owner);before=f.before;after=f.after;events=f.events;
}
function cleanup(){if(surface){dispose(surface);surface=undefined;}if(stateSurface){disposeState(stateSurface);stateSurface=undefined;}cast?.remove();cast=undefined;}
async function stable(){await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));await Promise.all([...root.querySelectorAll<HTMLImageElement>('img')].map(i=>i.decode().catch(()=>{})));}
async function present(){cleanup();bridge.render(view,structuredClone(egg||stateData||transfer||synergy||effect?before:after));view.setHandOpen(false);document.querySelector('.help-callout')?.remove();await stable();bridge.claim();
 if(stateData){stateSurface=await attachState(stateData);paint(0);return;}
 const focusUid=effect?effect.sourceUid:synergy?before.players[owner].hand.find(c=>c.id===cardId)?.uid:'r3-focus';
 let node=document.querySelector<HTMLElement>(`.card[data-uid="${focusUid}"]`);
 if(!node){const row=document.querySelector(owner===0?'#meRow':'#oppRow');node=row?.querySelector<HTMLElement>(`.card[data-card-id="${cardId}"]`)||null;}
 if(!node){
  // Nonpersistent spells have no field node: show their real played card as a
  // local cast display, labelled as such in evidence. Never add it to game state.
  cast=cardEl(card(cardId,'r3-cast-display'),{size:'mkt'});cast.style.cssText=`position:fixed;left:12%;top:${owner===0?'60%':'20%'};width:84px;height:126px;--cw:84px;--ch:126px;z-index:110`;document.body.append(cast);node=cast;
  await Promise.all([...node.querySelectorAll<HTMLImageElement>('img')].map(i=>i.decode().catch(()=>{})));
 }
 surface=attach(node);paint(0);
}
function paint(p:number){progress=Math.max(0,Math.min(1,p));if(stateSurface)drawState(stateSurface,variant,progress,api.reduced);if(surface){if(effect)drawEffectSource(surface,surface.card.dataset.cardId||cardId,variant,progress,api.reduced);else if(transfer||synergy)drawTransferSource(surface,variant,api.reduced?0:progress);else if(egg)drawEgg(surface,scene,egg.eggId,variant,progress,api.reduced);else drawSummon(surface,scene,cardId,variant,progress,api.reduced);}}
async function reset(){const token=++run;transferAbort.abort();transferAbort=new AbortController();setFxSkip(true);await Promise.resolve();cancelAnimationFrame(raf);cancel?.();cancel=undefined;busy=false;playStarted=0;playElapsed=0;if(!after)return;await present();if(token===run)api.phase=stateData?'雫・シールドの変化前':transfer?'効果の発生前 · 実カードの移動を確認':egg?'卵の効果開始前 · 現行reduceの結果へ進みます':'召喚・展開の描画比較 · 現行reduceの結果を表示';}
async function prepareNow(id:string,card:string,v:number,side:0|1,stage?:string){scene=id;cardId=card;variant=v;owner=side;egg=undefined;stateData=undefined;transfer=undefined;synergy=undefined;effect=undefined;effectStep=-1;if(effectCues.has(id)){effect=effectFixture(id,card,side);before=effect.before;after=effect.after;events=effect.events;}else if(synergyCues.has(id)){synergy=synergyFixture(id,card,side);before=synergy.before;after=synergy.after;events=synergy.events;}else if(transferCues.has(id)){transfer=transferFixture(id,card,side);before=transfer.before;after=transfer.after;events=transfer.events;}else if(stateStages[id]){stateData=stateFixture(id,side,stage||stateStages[id][0][0]);before=stateData.before;after=stateData.after;events=stateData.events;}else if(eggCues.has(id)){egg=eggFixture(id,card,side,stage||eggStages[id][0][0]);before=egg.before;after=egg.after;events=egg.events;}else fixture();await reset();await waitForDuel(view.root);await stable();}
let preparation:Promise<void>=Promise.resolve();
function prepare(...args:Parameters<typeof prepareNow>){const next=preparation.catch(()=>{}).then(()=>prepareNow(...args));preparation=next;return next;}
async function resolveEgg(token:number){
 const state=structuredClone(before);setFxSkip(api.reduced);
 for(const event of events){
  if(token!==run)return;
  if(event.type==='destroy'){
   api.phase=event.uid==='r3-focus'?'殻の処理 · 移動は既定演出':'降臨効果の対象を破壊';
   const removed=after.players[event.player].removed?.some(c=>c.uid===event.uid)||false;
   if(surface?.card.dataset.uid===event.uid){await freezeSurface(surface);if(token!==run)return;}
   await bridge.destroy(event.uid,event.player,removed,transferAbort.signal,api.reduced);if(token!==run)return;
   if(event.uid==='r3-focus')cleanup();state.players[event.player].field=state.players[event.player].field.filter(m=>m.uid!==event.uid);
  }else if(event.type==='summon'){
   const mon=after.players[event.player].field.find(m=>m.uid===event.uid);if(!mon)continue;
   if(!state.players[event.player].field.some(m=>m.uid===mon.uid))state.players[event.player].field.push(structuredClone(mon));
   bridge.render(view,state);await stable();if(token!==run)return;
   const node=root.querySelector<HTMLElement>(`.card[data-uid="${event.uid}"]`);if(!node)continue;
   bridge.claim();const arriving=attach(node),family=['DIVINE','EGG_MASTER'].includes(event.id||'')?'S10':event.id?.startsWith('D_')?'S09':'S16';
   const start=performance.now(),length=api.reduced?200:900;api.phase='孵化したモンスターが同じ場に現れる';
   try{await new Promise<void>((resolve,reject)=>{cancel=resolve;const tick=(now:number)=>{try{if(token!==run){resolve();return;}const t=Math.min(1,(now-start)/length);drawSummon(arriving,family,event.id||mon.id,variant,t,api.reduced);if(t>=1)resolve();else raf=requestAnimationFrame(tick);}catch(e){reject(e);}};raf=requestAnimationFrame(tick);});}
   finally{dispose(arriving);}if(token!==run)return;
   if(event.id==='DIVINE'){
    const delta=after.players[owner].maxMana-state.players[owner].maxMana;
    state.players[owner].maxMana=after.players[owner].maxMana;state.players[owner].mana=after.players[owner].mana;
    bridge.render(view,state);await stable();api.phase='神獣の降臨 · 現行値の最大マナ増加';if(delta>0)await manaSurge(owner===0?'me':'opp',delta);
   }
  }
 }
 if(token===run){cleanup();bridge.render(view,structuredClone(after));await stable();}
}
async function play(){if(busy||(!surface&&!stateSurface))return;await reset();const token=run;busy=true;playStarted=performance.now();api.phase=stateData?'雫・シールドの状態変化':egg?'卵の表面と殻の変化':'カード面の実体化';const start=playStarted,ms=api.reduced?250:transfer||synergy||effect?650:egg||stateData?1200:duration;
 await new Promise<void>(resolve=>{cancel=resolve;const tick=(now:number)=>{if(token!==run){resolve();return;}paint((now-start)/ms);if(progress>=1)resolve();else raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);});
 if(token!==run)return;cancel=undefined;try{if(effect){cleanup();await playEffect(effect,{view,root,owner,variant,reduced:api.reduced,valid:()=>token===run,stable,bridge,phase:value=>{api.phase=value;},signal:transferAbort.signal},index=>{effectStep=index;});}if(synergy)await playSynergy(synergy,view,root,variant,api.reduced,transferAbort.signal,()=>token===run,stable,bridge,value=>{api.phase=value;});if(transfer)await playTransfers(transfer,{view,root,owner,variant,reduced:api.reduced,valid:()=>token===run,stable,bridge,phase:value=>{api.phase=value;},signal:transferAbort.signal});if(egg)await resolveEgg(token);if(stateData){cleanup();bridge.render(view,structuredClone(after));await stable();}}catch(e){if(token!==run)return;cleanup();bridge.restore();busy=false;api.phase=`描画エラー: ${String(e)}`;throw e;}if(token!==run)return;cleanup();bridge.restore();playElapsed=performance.now()-playStarted;busy=false;api.phase=effect?'個別効果完了 · 現行reduceの結果に一致':synergy?'シナジー処理完了 · 現行reduceの結果に一致':transfer?'効果の実カード移動完了 · 現行reduceの結果に一致':stateData?'雫・シールドの状態変化完了 · 現行reduceの結果に一致':egg?'卵の段階処理完了 · 現行reduceの結果に一致':'召喚・展開完了 · 召喚時の個別効果は別cueで追跡';
}
const api={ready:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,phase:'実盤面を準備中',get busy(){return busy;},get progress(){return progress;},get elapsedMs(){return busy?performance.now()-playStarted:playElapsed;},get evidence(){return {scene,cardId,variant,owner,before,after,events,egg,stateData,transfer,synergy,effect,effectStep,native:{active:bridge.active,traces:bridge.traces},focusMode:cast?'played-spell-display':'actual-field-card',scope:effect?'Reducer step timeline, source material and actual UI/card transitions':synergy?'Distinct tribe threshold with actual result':transfer?'Effect summon/copy/return with actual cards':stateData?'Dew/shield lifecycle from current reducer':egg?'Egg stage events, existing destroy/rift handoff':'Series arrival only; associated cue effects tracked separately'};},prepare,reset,play,async seek(p:number){if(busy)return;if(!surface)await present();paint(p);api.phase=egg||transfer||synergy||effect?'予兆表面の比較（後続イベントは再生で確認）':'作画比較（時計固定）';},dispose(){run++;transferAbort.abort();setFxSkip(true);cancelAnimationFrame(raf);cancel?.();cleanup();stopLayout();view.destroy();}};
(window as any).seriesBR3Board=api;
void prepare('S02','ELF',1,0).then(()=>{api.ready=true;}).catch(e=>{api.phase=String(e);console.error(e);});
window.addEventListener('resize',()=>void reset());window.addEventListener('pagehide',()=>api.dispose(),{once:true});
