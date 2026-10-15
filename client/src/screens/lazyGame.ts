import {prepareDuelModules} from '../ui/duelModulePreload';
import type {App,Screen} from '../router';
import type {GameOpts} from './game';
import {loadingScreen} from '../ui/loadingScreen';
import {loungeText} from '../ui/loungeText';
import {artUrl} from '../ui/cardArt';
import {warmImages} from '../ui/imageAssets';

let gameModule:Promise<typeof import('./game')>|undefined;
const loadGame=()=>gameModule??=import('./game').catch(error=>{gameModule=undefined;throw error;});
/** Importing prepares code only; controllers, sockets and GPU contexts mount on entry. */
export async function warmGame(cards:readonly string[]=[]):Promise<void>{
 await Promise.all([
  prepareDuelModules(),
  loadGame(),
  import('../ui/duelReadiness').then(module=>module.warmDuel()),
  warmImages([...new Set(['STARTER_MANA',...cards])].flatMap(id=>[artUrl.sm(id),artUrl.xs(id),artUrl.full(id)])),
 ]);
}

/** Start after the visible menu and its entrance; cancel if the player navigates. */
export function scheduleGameWarmup(host:HTMLElement,cards:readonly string[]):()=>void{
 let dead=false,timer=0,idle=0,started=false;
 const begin=()=>{if(dead||started||!host.isConnected||document.hidden||document.querySelector('.screen-loader'))return;started=true;void warmGame(cards);};
 const schedule=()=>{
  if(dead||started||timer||idle)return;
  timer=window.setTimeout(()=>{timer=0;if('requestIdleCallback' in window)idle=window.requestIdleCallback(()=>{idle=0;begin();},{timeout:1500});else begin();},400);
 };
 document.addEventListener('lore:screen-ready',schedule);
 document.addEventListener('visibilitychange',schedule);
 schedule();
 return()=>{dead=true;clearTimeout(timer);if(idle)window.cancelIdleCallback(idle);document.removeEventListener('lore:screen-ready',schedule);document.removeEventListener('visibilitychange',schedule);};
}
/** Keep controllers and BOT weights out of the initial HOME download. Destroying
 * this pending screen prevents a late import from mounting over a newer route. */
export function mountGame(app:App,opts:GameOpts):Screen {
 const loading=loadingScreen('duel-loader',loungeText('対戦の準備中','Preparing your duel','대전 준비 중'));
 app.root.append(loading.element);
 let disposed=false,screen:Screen|undefined;
 const load=async()=>{
  let module:typeof import('./game');
  try {module=await loadGame();}catch{
   if(disposed)return;
   const retry=document.createElement('button');retry.className='asset-retry';
   retry.textContent=loungeText('再読み込み','Reload','새로고침');
   retry.onclick=()=>location.reload();loading.element.append(retry);return;
  }
  if(disposed)return;
  loading.element.remove();screen=module.mountGame(app,opts);
 };
 void load();
 return {beforeLeave:()=>screen?.beforeLeave?.()??Promise.resolve(true),destroy(){disposed=true;loading.element.remove();screen?.destroy?.();}};
}
