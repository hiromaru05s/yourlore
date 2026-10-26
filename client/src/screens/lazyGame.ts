import {withDeadline} from '../net/deadline';
import {prepareMenuCache} from '../ui/menuCache';
import {prepareDuelFonts} from '../ui/duelFonts';
import type {App,Screen} from '../router';
import type {GameOpts} from './game';
import {loadingScreen} from '../ui/loadingScreen';
import {loungeText} from '../ui/loungeText';
import {artUrl} from '../ui/cardArt';
import {warmImages} from '../ui/imageAssets';

let gameModule:Promise<typeof import('./game')>|undefined;
const loadGame=()=>gameModule??=withDeadline(import('./game'),60000).catch(error=>{gameModule=undefined;throw error;});
const preparations=new Map<boolean,Promise<void>>();
type PreparationPhase='cache'|'assets'|'modules'|'models'|'deck';
type Progress=(done:number,total:number,phase:PreparationPhase)=>void;
const listeners=new Set<Progress>();
let progress:[number,number,PreparationPhase]=[0,0,'cache'];
function reportProgress(done:number,total:number,phase:PreparationPhase):void{
 progress=[done,total,phase];for(const listener of listeners)listener(...progress);
}
/** Shared, retryable admission. Opponent selection and an immediate Start join
 * the same preparation of required code, board assets and the selected deck. */
export async function warmGame(cards:readonly string[]=[],onProgress?:Progress):Promise<void>{
 if(onProgress){listeners.add(onProgress);onProgress(...progress);}
 try {
  const narrow=matchMedia('(max-width:700px)').matches;
  let preparation=preparations.get(narrow);
  if(!preparation){
   reportProgress(0,0,'cache');
   const abort=new AbortController();
   preparation=Promise.all([
   prepareMenuCache((done,total)=>{if(!abort.signal.aborted)reportProgress(done,total,done===total?'modules':'assets');},abort.signal,'duel'),
   // Full VFX module archives load on demand; only the game entry is required here.
   loadGame(),
  ]).then(async()=>{reportProgress(0,0,'models');await withDeadline(import('../ui/duelReadiness').then(module=>module.warmDuel()),125000);}).catch(error=>{abort.abort();preparations.delete(narrow);throw error;});preparations.set(narrow,preparation);}
  await preparation;
  reportProgress(0,0,'deck');
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
 const progress:Progress=(done,total,phase)=>{
  if(disposed)return;
  const labels={
   cache:loungeText('対戦素材のキャッシュを確認中','Checking duel asset cache','대전 소재 캐시 확인 중'),
   assets:loungeText(`対戦素材の準備 ${done} / ${total}`,`Preparing duel assets ${done} / ${total}`,`대전 준비 ${done} / ${total}`),
   modules:loungeText('対戦プログラムの準備中','Preparing duel code','대전 프로그램 준비 중'),
   models:loungeText('盤面と演出の素材を準備中','Preparing board and effects assets','보드와 연출 소재 준비 중'),
   deck:loungeText('デッキと文字の準備中','Preparing deck and fonts','덱과 글꼴 준비 중'),
  };
  loading.update(phase==='cache'?0:phase==='assets'?(total?done/total*80:0):phase==='modules'?80:phase==='models'?85:95,labels[phase]);
 };
 const load=async()=>{
  if(running||disposed)return;running=true;
  try {await warmGame(app.user?.deck??[],progress);if(!disposed){loading.update(98,loungeText('対戦を開始しています','Starting your duel','대전 시작 중'));await start();}}
  catch(error){
   if(disposed)return;
   console.warn('Duel preparation failed',error);
   const message=document.createElement('p');message.className='asset-error';message.setAttribute('role','alert');
   message.textContent=(error as Error)?.name==='TimeoutError'
    ?loungeText('準備が時間内に完了しませんでした。再試行してください。','Preparation timed out. Please retry.','준비 시간이 초과되었습니다. 다시 시도해 주세요.')
    :loungeText('対戦の準備に失敗しました。再試行してください。','Could not prepare your duel. Please retry.','대전 준비에 실패했습니다. 다시 시도해 주세요.');
   loading.element.append(message);
   const retry=document.createElement('button');retry.className='asset-retry';retry.textContent=loungeText('準備を再試行','Retry preparation','준비 다시 시도');
   const reload=document.createElement('button');reload.className='asset-retry';reload.textContent=loungeText('ゲームを再読み込み','Reload game','게임 새로고침');reload.onclick=()=>location.reload();
   retry.onclick=()=>{retry.remove();reload.remove();message.remove();void load();};loading.element.append(retry,reload);
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
