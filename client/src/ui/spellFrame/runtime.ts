import {FRAME_DURATION} from './shader';
import type {FrameScene} from './scene';
/** Preserve the approved shader timeline at 2.5x the previous 2x playback speed. */
export const SPELL_FRAME_RATE=5;
/** Start fetching during the card reveal; no canvas or GPU resources yet. */
export function warmSpellFrame(){void import('./scene').catch(()=>{});}
const active=new Map<HTMLElement,()=>void>();
export function cancelSpellFrames(){for(const cancel of [...active.values()])cancel();}
/** Cancellation also settles async loading, before a canvas can become visible. */
export function playSpellFrame(card:HTMLElement,signal?:AbortSignal):Promise<boolean>{
 active.get(card)?.();
 if(!card.isConnected||signal?.aborted||document.hidden)return Promise.resolve(false);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 return new Promise(resolve=>{
  let done=false,scene:FrameScene|undefined,frame=0,start=0;
  const finish=(complete:boolean)=>{if(done)return;done=true;clearTimeout(deadline);cancelAnimationFrame(frame);signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',abort);window.removeEventListener('resize',abort);if(active.get(card)===abort)active.delete(card);scene?.dispose();resolve(complete);};
  const abort=()=>finish(false),hidden=()=>{if(document.hidden)abort();};
  const deadline=setTimeout(abort,6000);
  active.set(card,abort);signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',abort);window.addEventListener('resize',abort);
  const tick=(now:number)=>{if(done)return;if(!card.isConnected||signal?.aborted||document.hidden){abort();return;}try{const elapsed=Math.min(FRAME_DURATION,(now-start)*SPELL_FRAME_RATE);scene!.draw(elapsed,reduced);if(elapsed>=FRAME_DURATION)finish(true);else frame=requestAnimationFrame(tick);}catch{abort();}};
  void import('./scene').then(m=>done?null:m.createFrameScene(card)).then(result=>{if(!result)return;if(done){result.dispose();return;}scene=result;start=performance.now();tick(start);}).catch(abort);
 });
}
