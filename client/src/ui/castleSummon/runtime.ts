import {SPECIAL_FX} from '../animationTempo';
import {projectedPlacement} from '../boardProjection';
import {DURATION,STONE_CLEAR_MS,ease,isCastle} from './catalog';
import type {CastleRenderer} from './renderer';

type Options={anchor?:HTMLElement;from?:DOMRect;signal?:AbortSignal;onImpact?:()=>void};
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
const motion=matchMedia('(prefers-reduced-motion:reduce)');
let pool:{renderer:CastleRenderer;users:number}|undefined;
function acquire(Type:typeof CastleRenderer){
 const entry=pool??={renderer:new Type(),users:0};entry.users++;let released=false;
 return {renderer:entry.renderer,release(){if(released)return;released=true;if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};
}
export function cancelCastleSummon(source:HTMLElement){jobs.get(source)?.cancel();}
export function cancelCastleSummons(root?:HTMLElement){for(const [source,j]of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}

/** Same native card from flight through reveal and idle; WebGL owns only stone and shadows. */
export function playCastleSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelCastleSummon(source);const anchor=options.anchor??source;
 if(!isCastle(source.dataset.cardId)||!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 if(motion.matches){options.onImpact?.();return Promise.resolve(true);}
 const saved={transform:source.style.transform,origin:source.style.transformOrigin,transition:source.style.transition,visibility:source.style.visibility};
 source.style.visibility='hidden';
 // Persist the native raster layer across the transparent canvas disappearing.
 source.style.willChange='transform';
 const board=source.closest<HTMLElement>('.game')?.parentElement;if(board){board.style.isolation='isolate';board.style.willChange='opacity';}
 return new Promise(resolve=>{
  let ended=false,frame=0,impacted=false,moved=false,host:HTMLCanvasElement|undefined,lease:ReturnType<typeof acquire>|undefined;
  const restorePose=()=>{if(!moved)return;source.style.transform=saved.transform;source.style.transformOrigin=saved.origin;source.style.transition=saved.transition;moved=false;};
  const impact=()=>{if(!impacted){impacted=true;options.onImpact?.();}};
  const finish=(complete=false)=>{if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);options.signal?.removeEventListener('abort',abort);restorePose();source.style.visibility=saved.visibility;host?.remove();lease?.release();jobs.delete(source);resolve(complete);};
  const abort=()=>finish(),timeout=setTimeout(abort,10000);
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  const fallback=(error:unknown)=>{if(ended)return;console.warn('[castle-summon] Native card fallback',error);try{impact();}finally{finish();}};
  void(async()=>{
   const {CastleRenderer}=await import('./renderer');if(ended)return;
   if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
   lease=acquire(CastleRenderer);
   host=document.createElement('canvas');host.className='castle-summon';host.dataset.cardId='CASTLE';host.dataset.variant='1';host.setAttribute('aria-hidden','true');
   host.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:136;will-change:transform;transform:translateZ(0)';
   const d=Math.min(devicePixelRatio,1.5);host.width=Math.round(innerWidth*d);host.height=Math.round(innerHeight*d);
   const context=host.getContext('2d')!,flight=options.from?440:0,total=flight+DURATION;
   const paint=(elapsed:number)=>{
    restorePose();context.clearRect(0,0,host!.width,host!.height);
    const t=Math.max(0,elapsed-flight);host!.dataset.time=String(Math.round(t));
    if(t>=STONE_CLEAR_MS)return;
    const w=source.offsetWidth,h=source.offsetHeight;if(!w||!h)throw Error('Castle has no native card bounds');
    const base=projectedPlacement(source,w,h),end=projectedPlacement(anchor,w,h);
    // Convert native top-left pixels into the exact centered, y-up preview space.
    let pose=end.translate(w/2,h/2).scale(w,-h/1.5625,w);
    if(options.from&&elapsed<flight){
     const r=options.from,start=new DOMMatrix().translate(r.left+r.width/2,r.top+r.height/2).scale(r.width,-r.height/1.5625,r.width);
     const a=Array.from(start.toFloat64Array()),b=Array.from(pose.toFloat64Array()),q=ease(0,flight,elapsed);
     pose=new DOMMatrix(a.map((n,i)=>n+(b[i]-n)*q));
    }
    if(t<800){
     const desired=pose.translate(-.5,1.5625/2,.20*(1-ease(0,800,t))).scale(1/w,-1.5625/h,1/w);
     source.style.transition='none';source.style.transformOrigin='0 0';source.style.transform=base.inverse().multiply(desired).toString();moved=true;
    }
    lease!.renderer.drawBoard(host!,0,t,pose,false,true);
   };
   paint(0);document.body.append(host);source.style.visibility='visible';const start=SPECIAL_FX.now();
   const tick=(now:number)=>{try{
    if(ended)return;if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
    const elapsed=Math.min(total,now-start);paint(elapsed);
    if(elapsed>=flight+800){impact();if(ended)return;}
    if(elapsed===total){finish(true);return;}frame=SPECIAL_FX.requestFrame(tick);
   }catch(error){fallback(error);}};
   frame=SPECIAL_FX.requestFrame(tick);
  })().catch(fallback);
 });
}
window.addEventListener('resize',()=>cancelCastleSummons());
window.addEventListener('pagehide',()=>cancelCastleSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelCastleSummons();});
motion.addEventListener('change',()=>cancelCastleSummons());
