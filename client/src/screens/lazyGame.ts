import type {App,Screen} from '../router';
import type {GameOpts} from './game';
import {loadingScreen} from '../ui/loadingScreen';
import {loungeText} from '../ui/loungeText';
/** Keep controllers and BOT weights out of the initial HOME download. Destroying
 * this pending screen prevents a late import from mounting over a newer route. */
export function mountGame(app:App,opts:GameOpts):Screen {
 const loading=loadingScreen('duel-loader',loungeText('対戦の準備中','Preparing your duel','대전 준비 중'));
 app.root.append(loading.element);
 let disposed=false,screen:Screen|undefined;
 const load=async()=>{
  let module:typeof import('./game');
  try {module=await import('./game');}catch{
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
