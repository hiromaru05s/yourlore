import {prepareDuelModules} from '../ui/duelModulePreload';
import {prepareMenuCache} from '../ui/menuCache';
import {prepareDuelFonts} from '../ui/duelFonts';
import type {App,Screen} from '../router';
import type {GameOpts} from './game';
import {loadingScreen} from '../ui/loadingScreen';
import {loungeText} from '../ui/loungeText';
import {artUrl} from '../ui/cardArt';
import {warmImages} from '../ui/imageAssets';

let gameModule:Promise<typeof import('./game')>|undefined;
const loadGame=()=>gameModule??=import('./game').catch(error=>{gameModule=undefined;throw error;});
const preparations=new Map<boolean,Promise<void>>();
const listeners=new Set<(done:number,total:number)=>void>();
let progress=[0,0];
/** Shared, retryable admission. Opponent selection and an immediate Start join the same
 * transfers. Public bytes finish before decoders/models request those same files. */
export async function warmGame(cards:readonly string[]=[],onProgress?:(done:number,total:number)=>void):Promise<void>{
 if(onProgress){listeners.add(onProgress);onProgress(progress[0],progress[1]);}
 try {
  const narrow=matchMedia('(max-width:700px)').matches;
  let preparation=preparations.get(narrow);
  if(!preparation){preparation=Promise.allSettled([
   prepareMenuCache((done,total)=>{progress=[done,total];for(const listener of listeners)listener(done,total);},new AbortController().signal,'duel'),
   prepareDuelModules(),loadGame(),
  ]).then(async results=>{const failure=results.find((r):r is PromiseRejectedResult=>r.status==='rejected');if(failure)throw failure.reason;await import('../ui/duelReadiness').then(module=>module.warmDuel());}).catch(error=>{preparations.delete(narrow);throw error;});preparations.set(narrow,preparation);}
  await preparation;
  // Language and selected deck can change after the first prepared match.
  await Promise.all([prepareDuelFonts(),warmImages([...new Set(['STARTER_MANA',...cards])].flatMap(id=>[artUrl.sm(id),artUrl.xs(id),artUrl.full(id)]))]);
 } finally {if(onProgress)listeners.delete(onProgress);}
}

/** HOME speculation is deliberately small: selected deck images only. Full game
 * preparation begins on explicit duel intent (opponent selection / matchmaking).
 * No model, shop preview, all-language font or full card archive blocks HOME. */
export function scheduleGameWarmup(host:HTMLElement,cards:readonly string[]):()=>void{
 let dead=false,timer=0,idle=0,started=false;
 const begin=()=>{if(dead||started||!host.isConnected||document.hidden||document.querySelector('.screen-loader'))return;started=true;void warmImages([...new Set(['STARTER_MANA',...cards])].flatMap(id=>[artUrl.sm(id),artUrl.xs(id),artUrl.full(id)])).catch(()=>{});};
 const schedule=()=>{
  if(dead||started||timer||idle)return;
  timer=window.setTimeout(()=>{timer=0;if('requestIdleCallback' in window)idle=window.requestIdleCallback(()=>{idle=0;begin();},{timeout:1500});else begin();},1000);
 };
 document.addEventListener('lore:screen-ready',schedule);
 document.addEventListener('visibilitychange',schedule);
 schedule();
 return()=>{dead=true;clearTimeout(timer);if(idle)window.cancelIdleCallback(idle);document.removeEventListener('lore:screen-ready',schedule);document.removeEventListener('visibilitychange',schedule);};
}
/** Server rooms and their timers must not be created until public resources are
 * ready. Cancellation owns the screen, and failures keep a retry/cancel surface. */
export function mountGamePreparation(app:App,start:()=>Promise<void>,onDispose?:()=>void):Screen {
 const loading=loadingScreen('duel-loader',loungeText('対戦の準備中','Preparing your duel','대전 준비 중'));
 app.root.append(loading.element);
 let disposed=false,running=false;
 const cancel=document.createElement('button');cancel.className='asset-retry';cancel.textContent=loungeText('戻る','Back','돌아가기');cancel.onclick=()=>app.home();loading.element.append(cancel);
 const progress=(done:number,total:number)=>{if(!disposed)loading.update(total?done/total*90:0,loungeText(`対戦素材の準備 ${done} / ${total}`,`Preparing duel assets ${done} / ${total}`,`대전 준비 ${done} / ${total}`));};
 const load=async()=>{
  if(running||disposed)return;running=true;
  try {await warmGame(app.user?.deck??[],progress);if(!disposed)await start();}
  catch(error){
   if(disposed)return;
   console.warn('Duel preparation failed',error);
   const retry=document.createElement('button');retry.className='asset-retry';retry.textContent=loungeText('準備を再試行','Retry preparation','준비 다시 시도');
   const reload=document.createElement('button');reload.className='asset-retry';reload.textContent=loungeText('ゲームを再読み込み','Reload game','게임 새로고침');reload.onclick=()=>location.reload();
   retry.onclick=()=>{retry.remove();reload.remove();void load();};loading.element.append(retry,reload);
  } finally {running=false;}
 };
 void load();
 return {destroy(){disposed=true;listeners.delete(progress);loading.element.remove();onDispose?.();}};
}
/** Controllers/sockets mount only after admission; navigating away cannot mount
 * an obsolete screen when the shared background transfer eventually finishes. */
export function mountGame(app:App,opts:GameOpts):Screen {
 let disposed=false,screen:Screen|undefined;
 const gate=mountGamePreparation(app,async()=>{
  const module=await loadGame();
  if(disposed)return;
  gate.destroy?.();screen=module.mountGame(app,opts);
 });
 return {beforeLeave:()=>screen?.beforeLeave?.()??Promise.resolve(true),destroy(){disposed=true;gate.destroy?.();screen?.destroy?.();}};
}
