import {projectedPlacement,layoutRect} from '../boardProjection';
import {HatchRenderer} from './renderer';
import {DURATION,designs,smooth} from './catalog';
import {HATCH_VARIANT,hatchOutcome} from './selection';

const motion=matchMedia('(prefers-reduced-motion:reduce)');
const jobs=new Map<HTMLElement,()=>void>();
let pool:{renderer:HatchRenderer;users:number}|undefined;
function acquire(){const entry=pool??={renderer:new HatchRenderer(new Map()),users:0};entry.users++;let released=false;return{renderer:entry.renderer,release(){if(released)return;released=true;if(--entry.users===0){entry.renderer.dispose();if(pool===entry)pool=undefined;}}};}
export function cancelHatches(){for(const cancel of [...jobs.values()])cancel();}

/** Native faces retain the actual slot's layout dimensions throughout the morph.
 * The approved shell is the only raster overlay: no padded face can shrink the frame. */
export function playHatch(source:HTMLElement,result:HTMLElement,signal?:AbortSignal):Promise<boolean>{
 jobs.get(source)?.();
 const outcome=hatchOutcome(source.dataset.cardId,result.dataset.cardId);
 if(outcome<0||!source.isConnected||signal?.aborted||document.hidden)return Promise.resolve(false);
 if(motion.matches)return Promise.resolve(true);
 return new Promise(resolve=>{
  let ended=false,frame=0,host:HTMLElement|undefined,lease:ReturnType<typeof acquire>|undefined;
  const visibility=source.style.visibility;
  const finish=(complete=false)=>{if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);signal?.removeEventListener('abort',abort);host?.remove();lease?.release();source.style.visibility=visibility;jobs.delete(source);resolve(complete);};
  const abort=()=>finish(),timeout=setTimeout(abort,6000);jobs.set(source,abort);signal?.addEventListener('abort',abort,{once:true});
  try{
   const {width:w,height:h}=layoutRect(source);
   if(w<=0||h<=0){finish();return;}
   lease=acquire();host=document.createElement('div');host.className='game hatch-summon';host.dataset.variant='2';host.setAttribute('aria-hidden','true');
   host.style.cssText=`position:fixed;left:0;top:0;width:${w}px;height:${h}px;transform-origin:0 0;pointer-events:none;z-index:136`;
   const copies=[source,result].map(n=>{
    const copy=n.cloneNode(true) as HTMLElement;
    for(const node of [copy,...copy.querySelectorAll<HTMLElement>('[id],[data-uid]')]){node.removeAttribute('id');node.removeAttribute('data-uid');}
    copy.classList.remove('fx-field-ghost','fx-card-flight','cast-reveal');
    copy.style.cssText=`position:absolute;left:0;top:0;margin:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;transform:none;translate:none;opacity:1;visibility:visible`;
    host!.append(copy);return copy;
   });
   const canvas=document.createElement('canvas');canvas.width=canvas.height=640;
   const size=w*4.6/1.36;canvas.style.cssText=`position:absolute;left:${w/2-size/2}px;top:${h/2-size*.515}px;width:${size}px;height:${size}px;pointer-events:none`;
   host.append(canvas);const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
   const paint=(ms:number)=>{
    host!.style.transform=projectedPlacement(source,w,h).toString();
    const reveal=smooth(designs[HATCH_VARIANT].hit+150,2480,ms);
    copies[1].style.clipPath=reveal>=1?'none':`ellipse(${reveal*150}% ${reveal*150}% at 50% 43%)`;
    copies[0].style.visibility=reveal>=1?'hidden':'visible';
    ctx.clearRect(0,0,640,640);ctx.drawImage(lease!.renderer.render(HATCH_VARIANT,outcome,ms,false,true),0,0);
    host!.dataset.time=String(Math.round(ms));
   };
   paint(0);source.style.visibility='hidden';document.body.append(host);const start=performance.now();
   const tick=(now:number)=>{try{if(ended)return;if(!source.isConnected||document.hidden||signal?.aborted){finish();return;}const ms=Math.min(DURATION,now-start);paint(ms);if(ms===DURATION){finish(true);return;}frame=requestAnimationFrame(tick);}catch(error){console.warn('[hatch] Native face fallback',error);finish();}};
   frame=requestAnimationFrame(tick);
  }catch(error){console.warn('[hatch] Native face fallback',error);finish();}
 });
}
window.addEventListener('resize',cancelHatches);window.addEventListener('pagehide',cancelHatches);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelHatches();});motion.addEventListener('change',cancelHatches);
