import {DURATION,designs,ease} from './model';
import type {createRenderer} from './scene';
export const SOUL_HARVEST_VARIANT=0;
export const SOUL_HARVEST_HIT=designs[SOUL_HARVEST_VARIANT].hit;
const active=new Map<HTMLElement,()=>void>();
export function warmSoulHarvest(){void import('./scene').catch(()=>{});}
export function cancelSoulHarvest(){for(const cancel of [...active.values()])cancel();}
export type SoulHarvestOptions={source:HTMLElement|null;target:HTMLElement;damage:number;onImpact:()=>void;signal?:AbortSignal};
/** One selected renderer owns the scythe, trail, soul, number and portrait recoil. */
export function playSoulHarvest({source,target,damage,onImpact,signal}:SoulHarvestOptions):Promise<boolean>{
 active.get(target)?.();
 if(signal?.aborted||document.hidden||!target.isConnected||!Number.isFinite(damage)||damage<=0)return Promise.resolve(false);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const original={translate:target.style.translate,rotate:target.style.rotate,filter:target.style.filter};
 return new Promise(resolve=>{
  let done=false,hit=false,raf=0,start=0,scene:ReturnType<typeof createRenderer>|undefined,canvas:HTMLCanvasElement|undefined;
  const finish=(complete:boolean)=>{if(done)return;done=true;clearTimeout(deadline);cancelAnimationFrame(raf);signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('resize',abort);window.removeEventListener('pagehide',abort);if(active.get(target)===abort){active.delete(target);Object.assign(target.style,original);}canvas?.remove();scene?.dispose();resolve(complete);};
  const abort=()=>finish(false),hidden=()=>{if(document.hidden)abort();};
  const deadline=setTimeout(abort,6200);active.set(target,abort);signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);window.addEventListener('resize',abort);window.addEventListener('pagehide',abort);
  const tick=(now:number)=>{
   if(done)return;if(signal?.aborted||document.hidden||!target.isConnected||(source&&!source.isConnected)||scene?.lost){abort();return;}
   try{
    const ms=Math.min(DURATION,now-start),dt=ms-SOUL_HARVEST_HIT;
    // Sample the unshaken rect so the weapon never follows its own hit reaction.
    Object.assign(target.style,original);const r=target.getBoundingClientRect(),s=source?.getBoundingClientRect();
    if(!r.width||!r.height){abort();return;}
    if(!hit&&dt>=0){hit=true;onImpact();if(done)return;}
    const impact=dt>=0&&dt<550?1-ease(30,550,dt):0,age=Math.max(0,dt-36);
    const kick=reduced?0:((1-ease(70,300,age))*ease(0,65,age)*8+Math.sin(age*.082)*Math.exp(-age/155)*5)*impact;
    // Tangent of the approved 01 swing at contact (-7.44885 degrees).
    target.style.translate=`${kick*.99156}px ${kick*-.12964}px`;target.style.rotate=`${kick*.16}deg`;
    if(impact)target.style.filter=`${original.filter} brightness(${1+impact*.35}) saturate(${1-impact*.4})`;
    scene!.draw(canvas!,{variant:SOUL_HARVEST_VARIANT,ms,side:0,count:0,damage,dark:false,reduced,concurrent:false,board:{source:s?{x:s.left+s.width/2,y:s.top+s.height/2}:{x:r.left+r.width/2,y:r.top+r.height/2},target:{x:r.left+r.width/2,y:r.top+r.height/2},scale:Math.max(.42,Math.min(.82,innerWidth/1350))}});
    if(ms>=DURATION)finish(true);else raf=requestAnimationFrame(tick);
   }catch{abort();}
  };
  void import('./scene').then(m=>{
   if(done)return;scene=m.createRenderer();if(done){scene.dispose();return;}
   canvas=document.createElement('canvas');canvas.className='soul-harvest-fx';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:145';canvas.width=innerWidth;canvas.height=innerHeight;document.body.append(canvas);
   start=performance.now();tick(start);
  }).catch(abort);
 });
}
