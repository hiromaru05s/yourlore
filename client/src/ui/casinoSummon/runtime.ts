import {projectedPlacement} from '../boardProjection';
import {CasinoRenderer} from './renderer';
import {DURATION,IMPACT} from './timing';
import {isCasino} from './selection';

type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
let pool:{renderer:CasinoRenderer;users:number}|undefined;
const motion=matchMedia('(prefers-reduced-motion:reduce)');
function acquire(){
 const entry=pool??={renderer:new CasinoRenderer(),users:0};entry.users++;let released=false;
 return{renderer:entry.renderer,release(){if(released)return;released=true;if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};
}
export function cancelCasinoSummon(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelCasinoSummons(root?:HTMLElement){for(const [source,j]of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}

/** One fixed native card, with the approved cloth behind its frame and seals.
 * There is no rasterized face or padded-card remapping at the native handoff. */
export function playCasinoSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelCasinoSummon(source);const anchor=options.anchor??source;
 if(!isCasino(source.dataset.cardId)||!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(motion.matches){options.onImpact?.();return Promise.resolve(true);}
 const visibility=source.style.visibility;source.style.visibility='hidden';
 return new Promise(resolve=>{
  let ended=false,frame=0,impacted=false,host:HTMLElement|undefined,lease:ReturnType<typeof acquire>|undefined;
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{
   if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);
   options.signal?.removeEventListener('abort',abort);host?.remove();lease?.release();
   source.style.visibility=visibility;jobs.delete(source);resolve(complete);
  };
  const abort=()=>finish(),timeout=setTimeout(abort,6000);
  const fallback=(error:unknown)=>{if(ended)return;console.warn('[casino-summon] Native card fallback',error);try{impact();}finally{finish();}};
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  try{
   lease=acquire();host=document.createElement('div');host.className='game casino-summon';host.dataset.cardId='CASINO';host.dataset.variant='2';host.setAttribute('aria-hidden','true');
   host.style.cssText='position:fixed;left:0;top:0;width:180px;height:270px;transform-origin:0 0;pointer-events:none;z-index:136';
   const copy=source.cloneNode(true) as HTMLElement;
   for(const node of [copy,...copy.querySelectorAll<HTMLElement>('[id],[data-uid]')]){node.removeAttribute('id');node.removeAttribute('data-uid');}
   copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');
   copy.style.cssText='position:relative;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;opacity:1;visibility:visible';
   const art=copy.querySelector<HTMLElement>('.card-art');if(!art)throw Error('Casino art aperture unavailable');
   const canvas=document.createElement('canvas');
   canvas.style.cssText='position:absolute;left:-162px;top:-117px;width:504px;height:504px;pointer-events:none';
   art.append(canvas);host.append(copy);
   const paint=(elapsed:number)=>{
    host!.style.transform=projectedPlacement(anchor,180,270).toString();
    lease!.renderer.draw(canvas,elapsed);host!.dataset.time=String(Math.round(elapsed));
   };
   // Compile and draw the closed curtain BEFORE mounting and starting time.
   paint(0);document.body.append(host);const start=performance.now();
   const tick=(now:number)=>{try{
    if(ended)return;if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
    const elapsed=Math.min(DURATION,now-start);paint(elapsed);
    if(elapsed>=IMPACT){impact();if(ended)return;}
    if(elapsed===DURATION){finish(true);return;}frame=requestAnimationFrame(tick);
   }catch(error){fallback(error);}};
   frame=requestAnimationFrame(tick);
  }catch(error){fallback(error);}
 });
}
window.addEventListener('resize',()=>cancelCasinoSummons());
window.addEventListener('pagehide',()=>cancelCasinoSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelCasinoSummons();});
motion.addEventListener('change',()=>cancelCasinoSummons());
